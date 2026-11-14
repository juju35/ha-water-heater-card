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
  const half = wh.whHotWater({ temp: 35, target: 55, cold: 15, capacity: 200 });
  assert.equal(half.share, 0.5);
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
  assert.match(html, /Heating · 54 °C/);
  assert.match(html, /Utility room · Explorer v4/);
  assert.match(html, /class="scene"/);
  assert.match(html, /animateTransform/, "the fan turns");
  assert.match(html, /≈ 3<tspan[^>]*>showers/);
  assert.match(html, /185 L at 40 °C/);
  assert.match(html, /Heating to 55 °C/);
  assert.match(html, /Power[\s\S]*0.6<small>kW[\s\S]*Today[\s\S]*2.1<small>kWh[\s\S]*Mode[\s\S]*Auto/);
  assert.match(html, /data-mode="eco"[\s\S]*data-mode="auto"[\s\S]*data-mode="boost"/);
  assert.doesNotMatch(html, /data-mode="off"/);
  assert.doesNotMatch(html, /act-boost/, "boost is a mode: no extra button");
  assert.match(html, /act-away"[^>]*aria-label="Away"/);
  assert.match(html, /55 °C<\/b>/);
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
