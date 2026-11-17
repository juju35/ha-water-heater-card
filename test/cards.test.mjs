import assert from "node:assert/strict";
import { test } from "node:test";
import { makeHass, st } from "./hass.mjs";
import { fakeNode, load } from "./load.mjs";

const wh = load();
const { cards } = wh;
const json = (v) => JSON.parse(JSON.stringify(v));

// A card whose shadow root answers every selector with nodes recording their click listeners.
const make = (tag, config, hass = makeHass()) => {
  const card = new cards[tag]();
  card.attachShadow();
  const nodes = {};
  card.shadowRoot.querySelector = (s) => (nodes[s] ||= fakeNode());
  card._nodes = nodes;
  card.setConfig({ type: `custom:${tag}`, ...config });
  card.hass = hass;
  return card;
};
const click = (card, sel) => card._nodes[sel].listeners.click({ stopPropagation() {} });
const HEATER = { entity: "water_heater.explorer" };

test("both cards are registered, with their editors and a picker entry", () => {
  for (const tag of ["water-heater-card", "water-heater-mini-card"]) {
    assert.ok(wh.customElements.get(tag), tag);
    assert.ok(wh.customElements.get(`${tag}-editor`), `${tag}-editor`);
  }
  assert.deepEqual(json(wh.window.customCards.map((c) => c.type)), ["water-heater-card", "water-heater-mini-card"]);
});

test("discovery: water_heater entities first, then the switches named like one; the roles on the device", () => {
  const h = makeHass();
  assert.deepEqual(json(wh.whHeaters(h)), ["water_heater.explorer", "switch.cumulus"]);
  const r = wh.whFind(h, "water_heater.explorer");
  assert.equal(r.power, "sensor.explorer_power");
  assert.equal(r.energy, "sensor.explorer_energy_today");
  assert.equal(r.litres, "sensor.explorer_v40_water_volume");
  assert.equal(r.boost, "switch.explorer_boost");
  assert.equal(r.error, "sensor.explorer_error");
  assert.equal(r.temperature, undefined, "an outdoor probe is not the water's");
  assert.equal(wh.whFind(h, "water_heater.explorer", { power: "sensor.cumulus_power" }).power, "sensor.cumulus_power");
  assert.deepEqual(json(cards["water-heater-card"].getStubConfig(h)), HEATER);
});

test("hot water: reported, else estimated from the temperature", () => {
  const est = wh.whHotWater({ temp: 55, target: 55, cold: 15, capacity: 200, shower: 50 });
  assert.equal(est.share, 1);
  assert.equal(est.litres, 320);
  assert.equal(est.showers, 6);
  const part = wh.whHotWater({ temp: 50, target: 55, cold: 15, capacity: 200 });
  assert.equal(part.share, 0.875);
  assert.equal(part.litres, 280);
  // Lukewarm water makes no water at 40 °C.
  const tepid = wh.whHotWater({ temp: 30, target: 60 });
  assert.deepEqual([tepid.share, tepid.litres, tepid.showers], [0, 0, 0]);
  // A cold water reading 35 °C or more (a misread probe) never divides by zero.
  const odd = wh.whHotWater({ temp: 55, target: 55, cold: 40 });
  assert.ok(Number.isFinite(odd.litres));
  assert.equal(odd.litres, 320);
  assert.equal(wh.whHotWater({ litres: 186, target: 55 }).showers, 3);
  assert.equal(wh.whHotWater({ level: 72, showers: 4 }).share, 0.72);
  assert.equal(wh.whHotWater({}).share, null);
});

test("full card: header, illustration, tiles and controls while heating", () => {
  const card = make("water-heater-card", HEATER);
  const m = card._items;
  assert.equal(m.state, "heating");
  assert.equal(m.showers, 3);
  assert.equal(m.litres, 185);
  assert.equal(m.heatPump, true, "Explorer: a heat pump");
  const html = card.shadowRoot.innerHTML;
  // The illustrated header: the state as the subtitle, the area and model as the title's tooltip, the bare tank in the
  // utility room (no second tank below), the panel's readings under it.
  assert.match(html, /class="banner"/);
  // The state is the status pill right after the title, the temperature under it.
  assert.match(html, /<div class="trow"><div class="title">[^<]*<\/div><span class="bpill" title="[^"]*"><span class="bdot"><\/span><span class="bpt">Heating<\/span>/);
  assert.match(html, /<div class="subt">54 °C<\/div>/);
  assert.match(html, /title="Utility room · Explorer v4"/);
  assert.match(html, /ha-icon icon="mdi:water-boiler"/);
  assert.match(html, /<svg class="tank"/);
  assert.doesNotMatch(html, /class="scene"/);
  assert.match(html, /class="pl"/, "the hot pipe pulses while it heats");
  assert.match(html, /animateTransform/, "the fan turns");
  assert.match(html, /<b>≈ 3<\/b><span>showers/);
  assert.match(html, /185 L at 40 °C/);
  assert.match(html, /Heating to 55 °C/);
  assert.match(html, /Power[\s\S]*0.6<small>kW[\s\S]*Today[\s\S]*2.1<small>kWh[\s\S]*Mode[\s\S]*Auto/);
  assert.match(html, /data-mode="eco"[\s\S]*data-mode="auto"[\s\S]*data-mode="boost"/);
  assert.doesNotMatch(html, /data-mode="off"/);
  assert.doesNotMatch(html, /act-boost/, "boost is a mode: no extra button");
  assert.match(html, /act-away" data-k="away" aria-pressed="false">[\s\S]*?<span>Away<\/span>/);
  assert.match(html, /55 °C<\/b>/);
  assert.match(html, /class="seg" role="group" aria-label="Target 55 °C"/);
});

test("illustration: the drops follow the showers when the share of hot water is unknown; a geyser is no heat pump", () => {
  const h = makeHass();
  h.entities["sensor.explorer_showers"] = { device_id: "explorer", platform: "ariston" };
  h.states["sensor.explorer_showers"] = st("sensor.explorer_showers", "4", { friendly_name: "Water heater Showers" });
  delete h.states["sensor.explorer_v40_water_volume"];
  delete h.states["water_heater.explorer"].attributes.current_temperature;
  const card = make("water-heater-card", HEATER, h);
  assert.equal(card._items.share, null);
  assert.equal(card._items.showers, 4);
  assert.equal((card.shadowRoot.innerHTML.match(/scale\(.62\)" d="[^"]+" fill="#e8590c"/g) || []).length, 4);
  const g = makeHass();
  g.devices.geyser = { name: "Geyser", model: "Geyserwise Max" };
  g.entities["water_heater.geyser"] = { device_id: "geyser", platform: "geyserwise" };
  g.states["water_heater.geyser"] = st("water_heater.geyser", "eco", { operation_mode: "eco", operation_list: ["eco", "boost"], current_temperature: 60, temperature: 60 });
  assert.equal(make("water-heater-card", { entity: "water_heater.geyser" }, g)._items.heatPump, false);
});

test("actions: target, away, mode", () => {
  const h = makeHass();
  const card = make("water-heater-card", HEATER, h);
  click(card, ".act-raise");
  click(card, ".act-away");
  assert.deepEqual(json(h.calls), [
    ["water_heater", "set_temperature", { entity_id: "water_heater.explorer", temperature: 56 }],
    ["water_heater", "set_away_mode", { entity_id: "water_heater.explorer", away_mode: true }],
  ]);
  const max = make("water-heater-card", HEATER, makeHass({ target: 62 }));
  assert.match(max.shadowRoot.innerHTML, /act-raise"[^>]*disabled/);
});

test("states: ready, boost, away, off, error, offline", () => {
  assert.equal(make("water-heater-card", HEATER, makeHass({ temp: 55, power: "0" }))._items.state, "ready");
  assert.equal(make("water-heater-card", HEATER, makeHass({ mode: "boost" }))._items.state, "boost");
  assert.equal(make("water-heater-card", HEATER, makeHass({ boost: "on" }))._items.state, "boost", "the boost switch");
  const away = make("water-heater-card", HEATER, makeHass({ away: "on", power: "0" }));
  assert.equal(away._items.state, "away");
  assert.match(away.shadowRoot.innerHTML, /Back home/);
  assert.equal(make("water-heater-card", HEATER, makeHass({ mode: "off" }))._items.state, "off");
  const err = make("water-heater-card", HEATER, makeHass({ error: "E21 probe fault" }));
  assert.equal(err._items.state, "error");
  assert.match(err.shadowRoot.innerHTML, /E21 probe fault/);
  const h = makeHass();
  h.states["water_heater.explorer"] = st("water_heater.explorer", "unavailable");
  assert.equal(make("water-heater-card", HEATER, h)._items.state, "offline");
  const noPower = makeHass({ temp: 40, target: 55 });
  delete noPower.states["sensor.explorer_power"];
  assert.equal(make("water-heater-card", HEATER, noPower)._items.state, "heating", "well below the target");
});

test("discovery: a bottom probe is no cold inlet, a plug's own temperature is no water temperature", () => {
  const h = makeHass();
  h.entities["sensor.explorer_bottom_tank_water_temperature"] = { device_id: "explorer", platform: "overkiz" };
  h.states["sensor.explorer_bottom_tank_water_temperature"] = st("sensor.explorer_bottom_tank_water_temperature", "40", { device_class: "temperature", unit_of_measurement: "°C", friendly_name: "Water heater Bottom tank water temperature" });
  assert.notEqual(wh.whFind(h, "water_heater.explorer").inlet, "sensor.explorer_bottom_tank_water_temperature");
  h.entities["sensor.cumulus_device_temperature"] = { device_id: "plug", platform: "shelly", entity_category: "diagnostic" };
  h.states["sensor.cumulus_device_temperature"] = st("sensor.cumulus_device_temperature", "47", { device_class: "temperature", unit_of_measurement: "°C", friendly_name: "Cumulus Device temperature" });
  assert.equal(wh.whFind(h, "switch.cumulus").temperature, undefined);
});

test("high_demand is a lasting mode, not a boost", () => {
  const h = makeHass({ mode: "high_demand", temp: 55, power: "0" });
  assert.equal(make("water-heater-card", HEATER, h)._items.state, "ready");
});

test("the away button follows the away mode while the water heater is off", () => {
  const h = makeHass({ mode: "off" });
  const card = make("water-heater-card", HEATER, h);
  assert.match(card.shadowRoot.innerHTML, /<span>Away<\/span>/);
  const on = { ...h, states: { ...h.states, "water_heater.explorer": { ...h.states["water_heater.explorer"], attributes: { ...h.states["water_heater.explorer"].attributes, away_mode: "on" } } } };
  card.hass = on;
  assert.equal(card._items.state, "off");
  assert.match(card.shadowRoot.innerHTML, /Back home/);
});

test("temperatures sent as text: the target steps as numbers; quick presses add up", () => {
  const h = makeHass();
  const a = h.states["water_heater.explorer"].attributes;
  Object.assign(a, { temperature: "55", current_temperature: "54", min_temp: "50", max_temp: "62", target_temp_step: "1" });
  const card = make("water-heater-card", HEATER, h);
  click(card, ".act-raise");
  click(card, ".act-raise");
  click(card, ".act-lower");
  assert.deepEqual(json(h.calls.map((c) => c[2].temperature)), [56, 57, 56]);
  assert.equal(card._nodes[".seg b"].textContent, "56 °C");
});

test("roles found once their states arrive (after a restart)", () => {
  const h = makeHass();
  const early = { ...h, states: { ...h.states } };
  delete early.states["sensor.explorer_v40_water_volume"];
  delete early.states["sensor.explorer_power"];
  const card = make("water-heater-card", HEATER, early);
  assert.equal(card._items.watts, null);
  card.hass = h;
  assert.equal(card._items.litres, 185);
  assert.equal(card._items.watts, 620);
});

test("redraws only when something shown changes", () => {
  const h = makeHass();
  const card = make("water-heater-card", HEATER, h);
  let writes = 0;
  let html = card.shadowRoot.innerHTML;
  Object.defineProperty(card.shadowRoot, "innerHTML", { get: () => html, set: (v) => { writes++; html = v; } });
  for (let i = 1; i <= 50; i++) {
    card.hass = { ...h, states: { ...h.states, "sensor.explorer_energy_today": st("sensor.explorer_energy_today", String(2.1 + i * 0.0001), { device_class: "energy", unit_of_measurement: "kWh", friendly_name: "Water heater Energy today" }) } };
  }
  assert.equal(writes, 0);
});

test("no water heater: a message; no reading: a grey tank; a long error is cut in the scene", () => {
  const none = makeHass();
  none.states = {};
  none.entities = {};
  const card = make("water-heater-card", {}, none);
  assert.match(card.shadowRoot.innerHTML, /No water heater found/);
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="scene"/);
  const bare = makeHass();
  delete bare.states["sensor.explorer_v40_water_volume"];
  delete bare.states["water_heater.explorer"].attributes.current_temperature;
  const grey = make("water-heater-card", HEATER, bare);
  assert.equal(grey._items.share, null);
  assert.match(grey.shadowRoot.innerHTML, /stop-color="#e3e7ec"/);
  const error = makeHass({ error: "E21 · Upper temperature probe fault, call the installer" });
  const long = make("water-heater-card", { ...HEATER, illustration: false }, error);
  assert.match(long.shadowRoot.innerHTML, /<text[^>]*>E21 · Upper temperature pro…<\/text>/);
  assert.match(long.shadowRoot.innerHTML, /class="sl">[^<]*call the installer/);
  // Under the banner, the note is HTML: whole, wrapped by CSS.
  assert.match(make("water-heater-card", HEATER, error).shadowRoot.innerHTML, /class="nt">E21 · Upper temperature probe fault, call the installer</);
});

test("away: the pill says Away, the date is in the panel and the tile", () => {
  const h = makeHass({ away: "on", power: "0" });
  h.entities["sensor.explorer_away_end"] = { device_id: "explorer", platform: "overkiz" };
  h.states["sensor.explorer_away_end"] = st("sensor.explorer_away_end", "2026-11-21T18:00:00+00:00", { device_class: "timestamp", friendly_name: "Water heater Away mode end" });
  const card = make("water-heater-card", HEATER, h);
  assert.equal(card._status(card._items), "Away");
});

test("a cumulus on a relay: the probe, the plug's power, heat now / stop", () => {
  const h = makeHass();
  const card = make("water-heater-card", { entity: "switch.cumulus", temperature: "sensor.cumulus_temperature", tariff: "sensor.tariff", capacity: 150 }, h);
  const m = card._items;
  assert.equal(m.state, "heating");
  assert.equal(m.temp, 48);
  assert.equal(m.heatPump, false);
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /2.4<small>kW/);
  assert.match(html, /Tariff[\s\S]*Off-peak/);
  assert.doesNotMatch(html, /animateTransform/, "no heat pump");
  assert.match(html, /Stop/);
  click(card, ".act-relay");
  assert.deepEqual(json(h.calls), [["switch", "turn_off", { entity_id: "switch.cumulus" }]]);
  const off = make("water-heater-card", { entity: "switch.cumulus" }, makeHass({ relay: "off" }));
  assert.equal(off._items.state, "ready");
  assert.match(off.shadowRoot.innerHTML, /Heat now/);
});

test("a PV-routed tank: a power sensor as entity, read-only, today's energy split grid / solar", () => {
  const h = makeHass();
  const pw = (v) => st("sensor.puissance_ecs", v, { device_class: "power", unit_of_measurement: "W", friendly_name: "Puissance ECS" });
  const kwh = (id, v, unit = "kWh") => st(id, v, { device_class: "energy", unit_of_measurement: unit, friendly_name: id });
  h.states = {
    ...h.states,
    "sensor.puissance_ecs": pw("1840"),
    "sensor.consommation_ecs_reseau_journaliere": kwh("sensor.consommation_ecs_reseau_journaliere", "1.56"),
    "sensor.consommation_ecs_solaire_journaliere": kwh("sensor.consommation_ecs_solaire_journaliere", "840", "Wh"),
  };
  const config = {
    entity: "sensor.puissance_ecs",
    entities: { energy_grid: "sensor.consommation_ecs_reseau_journaliere", energy_solar: "sensor.consommation_ecs_solaire_journaliere" },
  };
  const card = make("water-heater-card", config, h);
  const m = card._items;
  assert.equal(m.state, "heating", "heating from its own power");
  assert.equal(m.watts, 1840);
  assert.equal(m.relayId, null, "a sensor is no relay");
  assert.equal(m.energy, 2.4);
  assert.equal(Math.round(m.solarShare * 100), 35);
  const html = card.shadowRoot.innerHTML;
  assert.doesNotMatch(html, /act-relay|Heat now/);
  assert.match(html, /1.8<small>kW/);
  assert.match(html, /Today[\s\S]*2.4<small>kWh<\/small><\/span><span class="xs"><svg[^>]*>[\s\S]*?<\/svg><span>35% solar/);
  // Its solar panel in the illustration: by day, the sun turns and the current runs along the cable while it heats.
  assert.equal(m.solar, true);
  assert.match(html, /<g class="pv">[\s\S]*stroke-dasharray="4 4"[\s\S]*stroke-dashoffset/);
  assert.match(html, /<g class="pv">[\s\S]*type="rotate" from="0 38 30"/);
  // By night the moon, and no current: the off-peak forcing comes from the grid.
  const night = make("water-heater-card", config, { ...h, states: { ...h.states, "sun.sun": st("sun.sun", "below_horizon") } });
  assert.equal(night._items.night, true);
  assert.doesNotMatch(night.shadowRoot.innerHTML.replace(/<style>[\s\S]*?<\/style>/, ""), /stroke-dashoffset|from="0 38 30"/);
  assert.match(night.shadowRoot.innerHTML, /<g class="pv"><circle cx="38" cy="30" r="9"/);
  // No panel for a water heater that is not PV-routed.
  assert.doesNotMatch(make("water-heater-card", HEATER).shadowRoot.innerHTML, /class="pv"/);
  // Below the 50 W rule, the tank is ready; only one half of the split still gives a share.
  h.states = { ...h.states, "sensor.puissance_ecs": pw("12") };
  delete h.states["sensor.consommation_ecs_solaire_journaliere"];
  const idle = make("water-heater-card", config, h);
  assert.equal(idle._items.state, "ready");
  assert.equal(idle._items.solarShare, 0);
});

test("discovery: the grid / solar split by name on the device", () => {
  const h = makeHass();
  const kwh = (id, name) => st(id, "1", { device_class: "energy", unit_of_measurement: "kWh", friendly_name: name });
  h.states = { ...h.states, "sensor.ecs_grid": kwh("sensor.ecs_grid", "Water heater grid energy"), "sensor.ecs_pv": kwh("sensor.ecs_pv", "Water heater solar energy") };
  h.entities = { ...h.entities, "sensor.ecs_grid": { device_id: "explorer" }, "sensor.ecs_pv": { device_id: "explorer" } };
  const r = wh.whFind(h, "water_heater.explorer");
  assert.equal(r.energy_solar, "sensor.ecs_pv");
  assert.equal(r.energy_grid, "sensor.ecs_grid");
});

test("options: no illustration, no animation, no controls", () => {
  const card = make("water-heater-card", { ...HEATER, show_scene: false, show_controls: false });
  assert.doesNotMatch(card.shadowRoot.innerHTML, /class="scene"|class="ctl"/);
  assert.doesNotMatch(make("water-heater-card", { ...HEATER, animations: false }).shadowRoot.innerHTML, /<animate/);
});

test("mini card: the readings as pills, a ring badge", () => {
  const mini = make("water-heater-mini-card", HEATER);
  const html = mini.shadowRoot.innerHTML;
  assert.match(html, /Heating/);
  assert.match(html, /54 °C/);
  assert.match(html, /≈ 3 showers/);
  assert.equal(mini._config.zoom, true);
  // The same 90 px banner: the ring around the state's icon, the readings as chips, the tank at the right.
  assert.match(html, /<ha-card class="lvl-heating bn">[\s\S]*class="banner"/);
  assert.match(html, /class="ringb"[\s\S]*ha-icon icon="mdi:water-boiler"/);
  assert.match(html, /<span class="bpt">Heating<\/span>[\s\S]*<div class="rs">[\s\S]*class="r pill dim"/, "the state in the pill, the readings as chips");
  assert.match(html, /<svg class="tank"/);
  // illustration: false keeps the two-line mini card.
  assert.match(make("water-heater-mini-card", { ...HEATER, illustration: false }).shadowRoot.innerHTML, /class="mini"/);
});

test("banner: night by illustration_theme, the sun, then the dark theme; unique ids; classic header on demand", () => {
  const h = makeHass();
  const html = (config, hass = h) => make("water-heater-card", { ...HEATER, ...config }, hass).shadowRoot.innerHTML;
  assert.match(html({}), /class="banner"/, "no sun, light theme: day");
  assert.match(html({ illustration_theme: "night" }), /class="banner night"/);
  assert.match(html({}, { ...h, themes: { darkMode: true } }), /class="banner night"/, "no sun: the dark theme");
  const sunUp = { ...h, themes: { darkMode: true }, states: { ...h.states, "sun.sun": st("sun.sun", "above_horizon") } };
  assert.match(html({}, sunUp), /class="banner"/, "the sun wins over the dark theme");
  assert.match(html({ illustration_theme: "day" }, { ...h, states: { ...h.states, "sun.sun": st("sun.sun", "below_horizon") } }), /class="banner"/);
  // Two cards, two sets of SVG ids.
  const ids = (s) => s.match(/id="q([a-z0-9]+)"/)[1];
  assert.notEqual(ids(html({})), ids(html({})));
  // illustration: false: the classic header and the big illustration.
  const classic = html({ illustration: false });
  assert.doesNotMatch(classic, /class="banner/);
  assert.match(classic, /class="scene"/);
  assert.match(classic, /≈ 3<tspan[^>]*>showers/);
  // Away: the grey icon; no pulsing pipe while not heating.
  const away = html({}, makeHass({ away: "on", power: "0" }));
  assert.match(away, /ha-icon icon="mdi:bag-suitcase-outline"/);
  assert.doesNotMatch(away, /class="pl"/);
  assert.doesNotMatch(html({ animations: false }), /class="pl"/);
});

test("editors: defaults stay out of the YAML, every field has a label", () => {
  const flat = (schema) => schema.flatMap((f) => (f.schema ? flat(f.schema) : [f]));
  for (const tag of ["water-heater-card", "water-heater-mini-card"]) {
    const ed = new (wh.customElements.get(`${tag}-editor`))();
    ed.appendChild = () => {};
    ed.setConfig({ type: `custom:${tag}`, ...HEATER });
    ed.hass = makeHass();
    for (const f of flat(ed._form.schema)) {
      assert.notEqual(ed._form.computeLabel(f), `ed_${f.name}`, `${tag}: no label for ${f.name}`);
      const helper = ed._form.computeHelper(f);
      if (helper !== undefined) assert.notEqual(helper, `ed_${f.name}_helper`, `${tag}: no helper for ${f.name}`);
    }
    let out;
    ed.dispatchEvent = (e) => (out = e.detail.config);
    ed._form.listeners["value-changed"]({ detail: { value: { type: `custom:${tag}`, ...HEATER, show_scene: true, animations: true } } });
    assert.deepEqual(json(out), { type: `custom:${tag}`, ...HEATER });
  }
});

test("translations: every language has every key of English, with the same placeholders", () => {
  const LANGS = ["en", "fr", "de", "es", "sr", "sr-Latn", "it", "nl", "pt", "pl", "ro", "da", "sv", "bg", "ru", "uk", "hu", "sk", "cs", "sl", "lv", "el"];
  const vars = (s) => s.match(/\{\w+\}/g)?.sort() ?? [];
  for (const [name, table] of [["shared", wh.RC_I18N], ["wh", wh.WH_I18N]]) {
    assert.deepEqual(json(Object.keys(table)), LANGS, name);
    const ref = json(Object.keys(table.en)).sort();
    for (const lang of LANGS) {
      const keys = json(Object.keys(table[lang])).filter((k) => !["open_f", "closed_f"].includes(k) && !k.endsWith("_few"));
      assert.deepEqual(keys.sort(), ref, `${name}.${lang}`);
      for (const k of ref) assert.deepEqual(json(vars(table[lang][k])), json(vars(table.en[k])), `${name}.${lang}.${k}`);
    }
  }
  const fr = make("water-heater-card", { ...HEATER, language: "fr" });
  assert.equal(fr._status(fr._items), "En chauffe · 54 °C");
  assert.equal(fr._showers(fr._items).label, "douches");
});
