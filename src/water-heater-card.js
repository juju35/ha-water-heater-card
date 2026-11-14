/**
 * water-heater-card / water-heater-mini-card: a water heater, illustrated. The tank with its hot water above the cold,
 * the showers left and the litres at 40 °C; the readings in three tiles; the modes, boost, away and the target.
 * https://github.com/juju35/ha-water-heater-card
 */

// Colour of each state: on the badge, the pill, the halo and the drops.
const WH_ACCENTS = { heating: "#e8590c", ready: "#2e9d5a", boost: "#d6336c", away: "#7b8794", off: "#9aa3ae", error: "#e5484d", offline: "#9aa3ae" };
const WH_ICONS = {
  heating: "mdi:water-boiler",
  ready: "mdi:water-boiler",
  boost: "mdi:fire",
  away: "mdi:bag-suitcase-outline",
  off: "mdi:water-boiler-off",
  error: "mdi:water-boiler-alert",
  offline: "mdi:lan-disconnect",
};
// One loop of the illustration's animations (s): the fan turns three times, the element glows twice, each bubble rises
// once or twice. The GIFs record one loop.
const WH_LOOP = 3.6;

// The illustration: the wall and the floor, the tank on its feet with its two pipes, the heat pump on top (when it has
// one), the water inside, hot above cold, the boundary at the share of hot water; bubbles rise and the element glows while
// it heats. Beside it, a glass panel with the showers left, the litres at 40 °C and a note.
const whScene = ({ state, dark, uid, share, temp, big, label, drops, litres, note, heatPump, animate }) => {
  const acc = WH_ACCENTS[state];
  const heats = state === "heating" || state === "boost";
  const moving = animate && heats;
  const W = dark ? ["#262a30", "#1d2025", "#17191d"] : ["#f7f9fc", "#e8ecf2", "#dfe4eb"];
  const body = dark ? ["#4a515b", "#30353c", "#666e79"] : ["#fbfcfe", "#dfe4ea", "#b9c1cb"];
  const txt = dark ? "#f0f0f0" : "#1f2329";
  const mut = dark ? "#a0a6ae" : "#5c6470";
  const pale = state === "away" || state === "off" || state === "offline" || state === "error";
  const hot = pale ? ["#d98a6a", "#e9b79b"] : ["#f2622e", "#ffa25e"];
  const cold = pale ? ["#9fc3e3", "#7ea5cc"] : ["#7cbcf0", "#3b7fd4"];
  const s = share ?? 0.5;
  // The tank: a cylinder with domed ends; the heat pump, when there is one, sits on top of a shorter tank.
  const [x, w] = [78, 78];
  const [y, h] = heatPump ? [54, 110] : [40, 124];
  const [ix, iy, iw, ih] = [x + 7, y + 7, w - 14, h - 14];
  const lvl = iy + ih * s;
  const cx = x + w / 2;
  const fan = heatPump
    ? (() => {
        const fy = y - 16;
        const blades = [0, 1, 2].map((k) => `<path d="M${cx} ${fy} q5 -9 0 -10 q-5 1 0 10z" fill="${dark ? "#8c96a3" : "#c5ccd5"}" transform="rotate(${k * 120} ${cx} ${fy})"/>`).join("");
        const turn = moving ? `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${fy}" to="360 ${cx} ${fy}" dur="${WH_LOOP / 3}s" repeatCount="indefinite"/>` : "";
        const grille = [0, 1, 2]
          .map((k) => `<rect x="${x + 16}" y="${y - 24 + k * 6}" width="10" height="2" rx="1" fill="#fff" opacity=".12"/><rect x="${x + w - 26}" y="${y - 24 + k * 6}" width="10" height="2" rx="1" fill="#fff" opacity=".12"/>`)
          .join("");
        return `<rect x="${x + 4}" y="${y - 38}" width="${w - 8}" height="42" rx="14" fill="url(#b${uid})" stroke="${body[2]}"/>
      <rect x="${x + 12}" y="${y - 28}" width="${w - 24}" height="24" rx="9" fill="${dark ? "#14171b" : "#2c343f"}"/>${grille}
      <g>${blades}${turn}</g><circle cx="${cx}" cy="${fy}" r="2.2" fill="${acc}"/>`;
      })()
    : "";
  // Still (no animation): the bubbles stay where they are at a fixed moment.
  const bubbles = heats
    ? [
        [16, 1, 2.2],
        [34, 0.5, 1.6],
        [50, 1, 2],
        [26, 0.5, 1.3],
        [44, 1, 1.8],
      ]
        .map(([bx, k, r], i) => {
          const dur = WH_LOOP * k;
          const begin = ((i * WH_LOOP) / 5).toFixed(2);
          if (!moving) return `<circle cx="${ix + bx}" cy="${(iy + ih - 4 - (ih - 10) * ((i * 0.37 + 0.15) % 1)).toFixed(1)}" r="${r}" fill="#fff" opacity=".6"/>`;
          return `<circle cx="${ix + bx}" cy="${iy + ih - 4}" r="${r}" fill="#fff" opacity="0"><animate attributeName="cy" from="${iy + ih - 4}" to="${iy + 6}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.75;.55;0" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></circle>`;
        })
        .join("")
    : "";
  const glow = heats
    ? `<rect x="${ix + 10}" y="${iy + ih - 10}" width="${iw - 20}" height="3" rx="1.5" fill="#ffd8a8" filter="url(#bl${uid})">${moving ? `<animate attributeName="opacity" values=".5;1;.5" dur="${WH_LOOP / 2}s" repeatCount="indefinite"/>` : ""}</rect>`
    : "";
  const drop = (i) =>
    `<path transform="translate(${228 + i * 17} ${88}) scale(.62)" d="M12 3c-3.5 4.5-6 7.6-6 10.5a6 6 0 0 0 12 0C18 10.6 15.5 7.5 12 3z" fill="${i < drops ? acc : dark ? "#3a414b" : "#dfe4ea"}"/>`;
  const panel = big
    ? `<g filter="url(#ds${uid})"><rect x="214" y="34" width="196" height="124" rx="16" fill="${dark ? "rgba(20,22,26,.72)" : "rgba(255,255,255,.82)"}" stroke="${dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)"}"/></g>
    <text x="230" y="78" font-family="Roboto,sans-serif" font-size="34" font-weight="500" fill="${txt}">${rcEsc(big)}<tspan dx="6" font-size="13" font-weight="400" fill="${mut}">${rcEsc(label)}</tspan></text>
    ${[0, 1, 2, 3, 4].map(drop).join("")}
    ${litres ? `<text x="230" y="130" font-family="Roboto,sans-serif" font-size="12" fill="${mut}">${rcEsc(litres)}</text>` : ""}
    ${note ? `<text x="230" y="${litres ? 148 : 130}" font-family="Roboto,sans-serif" font-size="12" font-weight="500" fill="${acc}">${rcEsc(note)}</text>` : ""}`
    : note
      ? `<text x="214" y="104" font-family="Roboto,sans-serif" font-size="13" font-weight="500" fill="${acc}">${rcEsc(note)}</text>`
      : "";
  const level = share != null ? `<path d="M${x + w + 4} ${lvl} h10" stroke="${mut}" stroke-width="1.2"/><text x="${x + w + 18}" y="${lvl + 4}" font-family="Roboto,sans-serif" font-size="11" font-weight="500" fill="${mut}">${Math.round(share * 100)} %</text>` : "";
  const tempY = s > 0.25 ? iy + Math.min((ih * s) / 2 + 5, ih * s - 3) : iy + 18;
  return `
  <svg class="scene" viewBox="0 0 430 200" role="img" aria-label="${rcEsc([temp, big && `${big} ${label}`, note].filter(Boolean).join(" · "))}">
    <defs>
      <linearGradient id="w${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${W[0]}"/><stop offset="1" stop-color="${W[1]}"/></linearGradient>
      <linearGradient id="f${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${W[1]}"/><stop offset="1" stop-color="${W[2]}"/></linearGradient>
      <linearGradient id="b${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${body[1]}"/><stop offset=".35" stop-color="${body[0]}"/><stop offset="1" stop-color="${body[1]}"/></linearGradient>
      <linearGradient id="q${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hot[0]}"/><stop offset="${Math.max(s - 0.07, 0).toFixed(2)}" stop-color="${hot[1]}"/><stop offset="${Math.min(s + 0.07, 1).toFixed(2)}" stop-color="${cold[0]}"/><stop offset="1" stop-color="${cold[1]}"/></linearGradient>
      <linearGradient id="hl${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${dark ? 0.3 : 0.55}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="sh${uid}"><stop offset="0" stop-color="#000" stop-opacity="${dark ? 0.55 : 0.28}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <radialGradient id="halo${uid}"><stop offset="0" stop-color="${acc}" stop-opacity=".26"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient>
      <clipPath id="c${uid}"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${iw / 2}" ry="14"/></clipPath>
      <filter id="bl${uid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>
      <filter id="ds${uid}" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="${dark ? 0.4 : 0.12}"/></filter>
    </defs>
    <rect width="430" height="200" fill="url(#w${uid})"/>
    <rect y="170" width="430" height="30" fill="url(#f${uid})"/>
    <rect y="170" width="430" height="1" fill="#fff" opacity="${dark ? 0.06 : 0.7}"/>
    ${heats ? `<circle cx="${cx}" cy="${y + h / 2}" r="78" fill="url(#halo${uid})"/>` : ""}
    <ellipse cx="${cx}" cy="172" rx="50" ry="5" fill="url(#sh${uid})"/>
    <path d="M${x + 26} ${y + h - 6} V172" stroke="#3b7fd4" stroke-width="5" stroke-linecap="round" opacity=".9"/>
    <path d="M${x + w - 26} ${y + h - 6} V172" stroke="#e8590c" stroke-width="5" stroke-linecap="round" opacity=".9"/>
    <g filter="url(#ds${uid})">${fan}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" ry="18" fill="url(#b${uid})" stroke="${body[2]}"/>
      <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${iw / 2}" ry="14" fill="url(#q${uid})"/>
      <g clip-path="url(#c${uid})">${bubbles}${glow}${share != null ? `<path d="M${ix} ${lvl} H${ix + iw}" stroke="#fff" stroke-opacity=".55" stroke-width="1" stroke-dasharray="3 3"/>` : ""}</g>
      <rect x="${ix + 8}" y="${iy + 8}" width="9" height="${ih - 16}" rx="4.5" fill="url(#hl${uid})" opacity=".8"/>
      <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${iw / 2}" ry="14" fill="none" stroke="#000" stroke-opacity=".08"/>
    </g>
    ${level}
    ${temp ? `<text x="${cx}" y="${tempY}" text-anchor="middle" font-family="Roboto,sans-serif" font-size="15" font-weight="700" fill="#fff">${rcEsc(temp)}</text>` : ""}
    ${panel}
  </svg>`;
};

const whIcon = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const WH_SVG = {
  power: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  energy: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  mode: '<path d="M20 11a8 8 0 0 0-14.3-4.9M4 13a8 8 0 0 0 14.3 4.9"/><path d="M20 4v4h-4M4 20v-4h4"/>',
  tariff: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  water: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 11v6"/>',
  back: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12h18"/>',
  eco: '<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19c3-4 6-6 9-7"/>',
  boost: '<path d="M12 3c.8 3 4.5 5 4.5 9.5a4.5 4.5 0 0 1-9 0c0-2.3 1.2-3.6 2.3-4.5 0 1.8.9 3 2.2 3.2-.4-3-1-5.5 0-8.2z"/>',
  heat_pump: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="1.5"/><path d="M12 10.5V5M13.3 12.8l4.7 2.7M10.7 12.8L6 15.5"/>',
  drop: '<path d="M12 3c-3.5 4.5-6 7.6-6 10.5a6 6 0 0 0 12 0C18 10.6 15.5 7.5 12 3z"/>',
  relay: '<path d="M12 3v9M6.3 7a8 8 0 1 0 11.4 0"/>',
};
// The icon of a mode, from its name.
const whModeIcon = (mode) => {
  const n = whNorm(mode);
  if (WH_BOOST.test(n) || /performance|comfort|confort/.test(n)) return "boost";
  if (/eco|green|smart|saving|spar/.test(n)) return "eco";
  if (/heat_?pump|pac|hybrid/.test(n)) return "heat_pump";
  if (/electric|resist|element/.test(n)) return "power";
  if (/auto|program|schedul/.test(n)) return "mode";
  return "drop";
};

// ── Card ─────────────────────────────────────────────────────────────────────
class WaterHeaterCard extends RcCard {
  static tag = "water-heater-card";
  static i18n = WH_I18N;
  static defaults = { show_scene: true, animations: true, show_controls: true };

  // The most likely water heater of the home.
  static getStubConfig(hass) {
    const entity = hass ? whHeaters(hass)[0] : undefined;
    return entity ? { entity } : {};
  }

  getCardSize() {
    return this._config?.show_scene === false ? 3 : 6;
  }

  _cols() {
    return 3;
  }

  // The water heater: `entity`, else the water_heater (or the relay) of `device`, else the first of the home.
  _entityId() {
    const c = this._config;
    if (c.entity) return c.entity;
    const h = this._hass;
    if (c.device) {
      const ids = whDeviceEntities(h)[c.device] || [];
      return ids.find((id) => id.startsWith("water_heater.")) || ids.find((id) => /^(switch|input_boolean)\./.test(id));
    }
    return whHeaters(h)[0];
  }

  _fmt(v, digits) {
    try {
      return new Intl.NumberFormat(this._lang(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
    } catch {
      return v.toFixed(digits);
    }
  }

  // The name of a mode: Home Assistant's translation, else ours, else the mode itself.
  _modeLabel(ent, mode) {
    const own = WH_I18N.en[`m_${whNorm(mode)}`] ? this._t(`m_${whNorm(mode)}`) : null;
    const ha = this._hass.formatEntityAttributeValue?.(ent, "operation_mode", mode);
    return (ha && ha !== mode ? ha : own) || String(mode).charAt(0).toUpperCase() + String(mode).slice(1).replace(/_/g, " ");
  }

  // The water heater's state and readings.
  _collect() {
    const h = this._hass;
    const c = this._config;
    const id = this._entityId();
    const ent = id ? h.states[id] : undefined;
    const e = rcMemo((this._memo ||= {}), "find", [id, c.entities, h.entities, h.devices], () => whFind(h, id, c.entities || {}));
    const st = (role) => (e[role] ? h.states[e[role]] : undefined);
    const on = (role) => st(role)?.state === "on";
    const wh = !!id?.startsWith("water_heater.");
    const a = ent?.attributes || {};
    const dev = id && h.devices?.[whDeviceOf(h, id)];
    // The water's temperature: the configured sensor, else the water heater's, else a probe on its device.
    const probe = c.temperature ? h.states[c.temperature] : st("temperature");
    const unit = c.temperature || !wh ? probe?.attributes.unit_of_measurement || "°C" : h.config?.unit_system?.temperature || "°C";
    const temp = c.temperature || !wh ? whNum(probe) : (a.current_temperature ?? whNum(probe));
    const target = wh ? (a.temperature ?? a.target_temp_high ?? null) : null;
    const mode = wh ? (a.operation_mode ?? ent?.state) : null;
    const nmode = whNorm(mode);
    const watts = whWatts(st("power"));
    const heatSt = st("heating");
    const heating =
      heatSt && !rcUnavailable(heatSt) ? heatSt.state === "on" : watts != null ? watts > 50 : !wh ? ent?.state === "on" : temp != null && target != null && temp < target - 3;
    const errSt = st("error");
    const errOn = errSt && !rcUnavailable(errSt) && (errSt.entity_id.startsWith("binary_sensor.") ? errSt.state === "on" : !/^(no_?error|none|ok|0|false|off|no_?fault|aucun|normal|keine?)$/.test(whNorm(errSt.state)) && !!errSt.state);
    const away = a.away_mode === "on" || on("away") || WH_AWAY.test(nmode);
    const boost = WH_BOOST.test(nmode) || on("boost");
    let state;
    if (!ent || rcUnavailable(ent)) state = "offline";
    else if (errOn) state = "error";
    else if (wh && (whNorm(ent.state) === "off" || nmode === "off")) state = "off";
    else if (away) state = "away";
    else if (boost) state = "boost";
    else if (heating) state = "heating";
    else state = "ready";
    // The hot water, from the integration or estimated (°C inside).
    const cold = whCelsius(whNum(st("inlet")), st("inlet")?.attributes.unit_of_measurement) ?? 15;
    const hot = whHotWater({
      level: whNum(st("level")),
      litres: whNum(st("litres")),
      showers: whNum(st("showers")),
      temp: whCelsius(temp, unit),
      target: whCelsius(target, unit) ?? 60,
      cold,
      capacity: Number(c.capacity) || 200,
      shower: Number(c.shower_volume) || 50,
    });
    const endSt = st("away_end");
    const end = endSt && !rcUnavailable(endSt) ? new Date(endSt.state) : null;
    const tariff = c.tariff ? h.states[c.tariff] : undefined;
    const energySt = st("energy");
    const modes = (wh ? a.operation_list || [] : []).filter((x) => whNorm(x) !== "off" && !WH_AWAY.test(whNorm(x)));
    return {
      id,
      ids: e,
      wh,
      state,
      raw: ent ? h.formatEntityState?.(ent) || ent.state : "",
      name: c.title || a.friendly_name || dev?.name_by_user || dev?.name || this._t("title"),
      sub: [h.areas?.[dev?.area_id]?.name, dev?.model].filter(Boolean).join(" · "),
      unit,
      temp,
      target,
      min: a.min_temp ?? 30,
      max: a.max_temp ?? 70,
      step: a.target_temp_step || 1,
      mode,
      modeLabel: mode && nmode !== "off" ? this._modeLabel(ent, mode) : null,
      modes: modes.slice(0, 4).map((x) => ({ value: x, label: this._modeLabel(ent, x), icon: whModeIcon(x) })),
      watts,
      energy: whKwh(energySt),
      today: !!energySt && /today|daily|day|jour|heute|oggi|hoy/i.test(whLabel(h, energySt.entity_id)),
      inlet: whNum(st("inlet")) != null ? whNum(st("inlet")) : null,
      inletUnit: st("inlet")?.attributes.unit_of_measurement || "°C",
      ...hot,
      awayEnd: end && !Number.isNaN(end.getTime()) ? end : null,
      awayAttr: wh && "away_mode" in a,
      awayOn: away,
      awayId: e.away && h.states[e.away] && !rcUnavailable(h.states[e.away]) ? e.away : null,
      boostId: e.boost && h.states[e.boost] && !rcUnavailable(h.states[e.boost]) ? e.boost : null,
      boostOn: boost,
      relayOn: !wh && ent?.state === "on",
      tariff: tariff && !rcUnavailable(tariff) ? h.formatEntityState?.(tariff) || tariff.state : null,
      error: errOn ? (errSt.entity_id.startsWith("binary_sensor.") ? this._t("st_error") : h.formatEntityState?.(errSt) || errSt.state) : null,
      heatPump: WH_HEAT_PUMP.test([...(a.operation_list || []), dev?.model, dev?.name, id].filter(Boolean).join(" ")),
    };
  }

  _dark() {
    return !!this._hass.themes?.darkMode;
  }

  _deg(v, withUnit = true) {
    return v == null ? "" : `${this._fmt(v, 0)}${withUnit ? ` ${this._unitOf()}` : "°"}`;
  }

  _unitOf() {
    return this._items?.unit || "°C";
  }

  _date(d) {
    try {
      return new Intl.DateTimeFormat(this._lang(), { weekday: "short", day: "numeric", month: "short" }).format(d);
    } catch {
      return d.toDateString();
    }
  }

  _status(m) {
    const label = this._t(`st_${m.state}`);
    if (m.state === "away" && m.awayEnd) return this._t("away_until", { d: this._date(m.awayEnd) });
    return ["heating", "ready", "boost"].includes(m.state) && m.temp != null ? `${label} · ${this._deg(m.temp)}` : label;
  }

  // The note of the illustration: where the water heater is going.
  _note(m) {
    if (m.state === "heating" && m.target != null) return this._t("heating_to", { t: this._deg(m.target) });
    if ((m.state === "ready" || m.state === "boost") && m.target != null) return this._t("target", { t: this._deg(m.target) });
    if (m.state === "away") return m.awayEnd ? this._t("away_until", { d: this._date(m.awayEnd) }) : this._t("away_on");
    if (m.state === "error") return m.error || "";
    return m.state === "off" || m.state === "offline" ? this._t(`st_${m.state}`) : "";
  }

  _showers(m) {
    if (m.showers == null) return null;
    const text = this._tn("shower", m.showers);
    return { big: `≈ ${this._fmt(m.showers, 0)}`, label: text.replace(this._fmt(m.showers, 0), "").replace(String(m.showers), "").trim() };
  }

  // Three tiles, the ones that matter in this state, among what the water heater reports.
  _tileList(m) {
    const all = {
      power: ["power", "t_power", m.watts != null && m.watts > 0 ? [this._fmt(m.watts / 1000, 1), "kW"] : null],
      energy: ["energy", m.today ? "t_today" : "t_energy", m.energy != null ? [this._fmt(m.energy, m.energy >= 100 ? 0 : 1), "kWh"] : null],
      mode: ["mode", "t_mode", m.modeLabel ? [m.modeLabel, ""] : null],
      tariff: ["tariff", "t_tariff", m.tariff ? [m.tariff, ""] : null],
      water: ["water", "t_water", m.temp != null ? [this._fmt(m.temp, 0), m.unit] : null],
      inlet: ["water", "t_inlet", m.inlet != null ? [this._fmt(m.inlet, 0), m.inletUnit] : null],
      back: ["back", "t_back", m.awayEnd ? [this._date(m.awayEnd), ""] : null],
    };
    const order = {
      heating: ["power", "energy", "mode", "tariff", "water"],
      boost: ["power", "energy", "mode", "tariff", "water"],
      ready: ["energy", "mode", "tariff", "inlet", "water"],
      away: ["back", "energy", "mode", "water"],
    }[m.state] || ["mode", "energy", "water", "tariff"];
    return order
      .map((k) => all[k])
      .filter((t) => t[2])
      .slice(0, 3);
  }

  _tile([icon, label, [value, unit]]) {
    return `<div class="xt"><span class="xh">${whIcon(WH_SVG[icon])}<span class="xl">${rcEsc(this._t(label))}</span></span><span class="xv">${rcEsc(value)}${unit ? `<small>${rcEsc(unit)}</small>` : ""}</span></div>`;
  }

  _animate() {
    if (this._config.animations === false) return false;
    try {
      return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  }

  _draw(m) {
    const c = this._config;
    const dark = this._dark();
    const parts = [m.state, m.raw, m.name, m.sub, m.temp, m.target, m.mode, m.watts && Math.round(m.watts / 100), m.energy, m.share, m.showers, m.litres, m.tariff, m.error, m.awayEnd?.getTime(), m.boostOn, m.relayOn, dark];
    if (!this._changed(parts)) return;
    const status = this._status(m);
    const head = `
      <div class="head${c.navigation_path ? " nav" : ""}"${c.navigation_path ? ' role="link" tabindex="0"' : ""}>
        <div class="badge"><ha-icon icon="${WH_ICONS[m.state]}"></ha-icon></div>
        <div class="tt"><div class="title">${rcEsc(m.name)}</div>${m.sub ? `<div class="subt">${rcEsc(m.sub)}</div>` : ""}</div>
        <span class="pill" title="${rcEsc(m.raw || status)}"><span class="pt">${rcEsc(status)}</span></span>
      </div>`;
    const sh = this._showers(m);
    const scene =
      c.show_scene === false
        ? ""
        : `<button class="sc" title="${rcEsc(m.raw || status)}">${whScene({
            state: m.state,
            dark,
            uid: (this._uid ||= Math.random().toString(36).slice(2, 8)),
            share: m.share,
            temp: m.temp != null ? this._deg(m.temp, false) : "",
            big: sh?.big,
            label: sh?.label,
            drops: m.share != null ? Math.round(m.share * 5) : 0,
            litres: m.litres != null ? this._t("litres", { n: this._fmt(m.litres, 0) }) : "",
            note: this._note(m),
            heatPump: m.heatPump,
            animate: this._animate(),
          })}</button>`;
    const error = m.error && c.show_scene === false ? `<div class="err" role="alert">${rcEsc(m.error)}</div>` : "";
    this._paint(m.state, head + scene + error, this._tileList(m).map((t) => this._tile(t)).join(""));
  }

  _afterGrid() {
    const m = this._items;
    if (!m || this._config.show_controls === false || m.state === "offline") return "";
    const modes =
      m.modes.length > 1
        ? `<span class="mseg" role="group" aria-label="${rcEsc(this._t("t_mode"))}">${m.modes
            .map((x) => `<button class="md${x.value === m.mode ? " on" : ""}" data-mode="${rcEsc(x.value)}" aria-pressed="${x.value === m.mode}">${whIcon(WH_SVG[x.icon])}<span>${rcEsc(x.label)}</span></button>`)
            .join("")}</span>`
        : "";
    const boostInModes = m.modes.some((x) => WH_BOOST.test(whNorm(x.value)));
    const boost = m.boostId && !boostInModes ? `<button class="gb act-boost${m.boostOn ? " on" : ""}" aria-pressed="${m.boostOn}">${whIcon(WH_SVG.boost)}<span>${rcEsc(this._t("m_boost"))}</span></button>` : "";
    const away =
      m.awayAttr || m.awayId
        ? m.awayOn
          ? `<button class="gb act-away on" aria-pressed="true">${whIcon(WH_SVG.back)}<span>${rcEsc(this._t("back"))}</span></button>`
          : `<button class="gb ic act-away" aria-pressed="false" aria-label="${rcEsc(this._t("away"))}" title="${rcEsc(this._t("away"))}">${whIcon(WH_SVG.back)}</button>`
        : "";
    const relay = !m.wh && m.id ? `<button class="pb act-relay">${whIcon(WH_SVG.relay)}<span>${rcEsc(this._t(m.relayOn ? "stop" : "heat_now"))}</span></button>` : "";
    const step =
      m.wh && m.target != null
        ? `<span class="seg" role="group" aria-label="${rcEsc(this._t("ed_temperature"))}"><button class="act-lower" aria-label="${rcEsc(this._t("lower"))}"${m.target <= m.min ? " disabled" : ""}>−</button><b>${rcEsc(this._deg(m.target))}</b><button class="act-raise" aria-label="${rcEsc(this._t("raise"))}"${m.target >= m.max ? " disabled" : ""}>+</button></span>`
        : "";
    return modes || boost || away || relay || step ? `<div class="ctl">${relay}${modes}${boost}${away}${step}</div>` : "";
  }

  _bindAfter(root) {
    const m = this._items;
    const h = this._hass;
    if (!m) return;
    const on = (sel, fn) =>
      root.querySelector(sel)?.addEventListener("click", (ev) => {
        ev.stopPropagation();
        fn(ev);
      });
    root.querySelector(".sc")?.addEventListener("click", () => rcMoreInfo(this, m.id));
    for (const b of root.querySelectorAll(".md") || []) {
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const mode = b.dataset?.mode ?? b.getAttribute?.("data-mode");
        if (mode && mode !== m.mode) rcCall(h, "water_heater", "set_operation_mode", { entity_id: m.id, operation_mode: mode });
      });
    }
    on(".act-boost", () => rcCall(h, "switch", m.boostOn ? "turn_off" : "turn_on", { entity_id: m.boostId }));
    on(".act-away", () =>
      m.awayAttr
        ? rcCall(h, "water_heater", "set_away_mode", { entity_id: m.id, away_mode: !m.awayOn })
        : rcCall(h, "switch", m.awayOn ? "turn_off" : "turn_on", { entity_id: m.awayId }),
    );
    on(".act-relay", () => rcCall(h, m.id.split(".")[0], m.relayOn ? "turn_off" : "turn_on", { entity_id: m.id }));
    const setTarget = (delta) => {
      const value = Math.min(m.max, Math.max(m.min, m.target + delta * m.step));
      if (value !== m.target) rcCall(h, "water_heater", "set_temperature", { entity_id: m.id, temperature: value });
    };
    on(".act-lower", () => setTarget(-1));
    on(".act-raise", () => setTarget(1));
  }

  static styles = `
    :host { --wh-heating: #e8590c; --wh-boost: #d6336c; }
    ha-card.lvl-heating { --c: var(--wh-heating); }
    ha-card.lvl-boost   { --c: var(--wh-boost); }
    ha-card.lvl-ready   { --c: var(--rc-ok); }
    ha-card.lvl-away, ha-card.lvl-off, ha-card.lvl-offline { --c: var(--rc-idle); }
    ha-card.lvl-error   { --c: var(--rc-alert); }
    .tt { flex: 1 1 0; min-width: 5ch; display: flex; flex-direction: column; }
    .tt .title { flex: none; }
    .subt { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    :host([hide-title]) .head .tt { visibility: hidden; }
    .sc { all: unset; display: block; box-sizing: border-box; width: 100%; cursor: pointer; margin-top: 10px; border-radius: 14px; overflow: hidden; }
    .sc:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .scene { display: block; width: 100%; height: auto; }
    .err { margin-top: 8px; padding: 8px 10px; border-radius: 10px; font-size: 13px; color: var(--rc-alert);
           background: color-mix(in srgb, var(--rc-alert) 12%, transparent); }
    .grid { margin-top: 10px; gap: 8px; }
    .xt { min-width: 0; border-radius: 12px; padding: 9px 11px; display: flex; flex-direction: column; gap: 5px;
          background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    .xh { display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--c); }
    .xh svg { flex: none; width: 15px; height: 15px; }
    .xl { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .xv { font-size: 18px; font-weight: 500; line-height: 1.15; color: var(--primary-text-color); overflow-wrap: anywhere; }
    .xv small { font-size: 12px; font-weight: 400; color: var(--secondary-text-color); margin-left: 3px; }
    .ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
    .pb, .gb, .seg button, .mseg button { all: unset; box-sizing: border-box; cursor: pointer; }
    .pb { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 16px; border-radius: 999px; font-size: 14px; font-weight: 500;
          color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); }
    .pb:hover { background: color-mix(in srgb, var(--c) 24%, transparent); }
    .mseg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 3px; border-radius: 999px; background: var(--secondary-background-color, rgba(127,127,127,.1)); }
    .mseg button { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 12px; border-radius: 999px; font-size: 13px; font-weight: 500;
                   color: var(--primary-text-color); }
    .mseg button:hover:not(.on) { background: color-mix(in srgb, var(--c) 10%, transparent); }
    .mseg button.on, .gb.on { color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
    .mseg svg { width: 15px; height: 15px; }
    .gb { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 14px; border-radius: 999px; font-size: 13px; font-weight: 500;
          color: var(--primary-text-color); background: var(--secondary-background-color, rgba(127,127,127,.1)); }
    .gb.ic { width: 40px; padding: 0; justify-content: center; }
    .pb svg, .gb svg { width: 17px; height: 17px; }
    .seg { display: inline-flex; align-items: center; min-height: 40px; padding: 0 3px; margin-left: auto; border-radius: 999px; background: var(--secondary-background-color, rgba(127,127,127,.1)); }
    .seg button { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font-size: 18px; color: var(--primary-text-color); }
    .seg button:hover:not([disabled]) { background: color-mix(in srgb, var(--c) 15%, transparent); }
    .seg button[disabled] { opacity: .35; cursor: default; }
    .seg b { min-width: 52px; text-align: center; font-size: 14px; font-weight: 500; }
    .pb:focus-visible, .gb:focus-visible, .seg button:focus-visible, .mseg button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    @container (max-width: 300px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `;
}

// ── Editor ───────────────────────────────────────────────────────────────────
const whSchema = (booleans) => (lang) => [
  { name: "entity", selector: { entity: { domain: ["water_heater", "switch", "input_boolean"] } } },
  { name: "title", selector: { text: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  { name: "temperature", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
  { name: "capacity", selector: { number: { min: 10, max: 1000, step: 10, mode: "box", unit_of_measurement: "L" } } },
  { name: "shower_volume", selector: { number: { min: 10, max: 200, step: 5, mode: "box", unit_of_measurement: "L" } } },
  { name: "tariff", selector: { entity: {} } },
  ...rcBooleans(...booleans),
  ...rcAdvanced(WH_I18N, lang, "entities", "language"),
];

const WH_HELPERS = ["entity", "title", "temperature", "capacity", "shower_volume", "tariff", "zoom", "entities", "language"];

const WaterHeaterCardEditor = rcEditor({
  card: WaterHeaterCard,
  helpers: WH_HELPERS,
  schema: whSchema(["show_title", "show_scene", "animations", "show_controls"]),
});

rcRegister(
  WaterHeaterCard,
  WaterHeaterCardEditor,
  "Water Heater Card",
  "A water heater, illustrated: the tank and its hot water, showers left, temperature, mode, boost, away and target",
);

// ── Mini card ────────────────────────────────────────────────────────────────
// The water heater on two lines: a ring with the share of hot water as the badge, the title, then the key readings as
// pills; the zoom button opens the full card in place.
class WaterHeaterMiniCard extends rcMini(
  WaterHeaterCard,
  "water-heater-mini-card",
  `
    .mini > .badge { background: none; }
    .ringb { width: 40px; height: 40px; }
    .r { --t: var(--c); }
    .r.dim { --t: var(--rc-idle); }
  `,
) {
  getCardSize() {
    return this._zoomed ? super.getCardSize() : 1;
  }

  _drawMini(m) {
    if (!this._changed(["mini", m.state, m.temp, m.showers, m.share, m.error, m.awayEnd?.getTime(), m.name])) return;
    const chip = (text, dim) => `<button class="r pill${dim ? " dim" : ""}" data-id="${rcEsc(m.id || "")}" title="${rcEsc(text)}"><span>${rcEsc(text)}</span></button>`;
    const temp = m.temp != null ? this._deg(m.temp) : null;
    const showers = m.showers != null ? `≈ ${this._tn("shower", m.showers, { n: this._fmt(m.showers, 0) })}` : null;
    const chips = {
      error: [m.error || this._t("st_error")],
      away: [this._status(m), temp],
      offline: [this._t("st_offline")],
    }[m.state] || [this._t(`st_${m.state}`), temp, showers];
    const html = chips
      .filter(Boolean)
      .map((t, i) => chip(t, i > 0))
      .join("");
    this._paintMini({ level: m.state, icon: WH_ICONS[m.state], status: "", chips: html });
    const title = this.shadowRoot.querySelector(".mini .title");
    if (title) title.textContent = m.name;
    // The badge is a ring: the share of hot water.
    const pct = m.share != null ? m.share * 100 : 0;
    const L = 2 * Math.PI * 17;
    const badge = this.shadowRoot.querySelector(".mini > .badge");
    if (badge) {
      badge.innerHTML = `<svg class="ringb" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="color-mix(in srgb, var(--c) 18%, transparent)" stroke-width="4"/><circle cx="20" cy="20" r="17" fill="none" stroke="var(--c)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${((L * pct) / 100).toFixed(1)} 999" transform="rotate(-90 20 20)"/><path d="M20 11c-3 3.9-5 6.5-5 9a5 5 0 0 0 10 0c0-2.5-2-5.1-5-9z" fill="var(--c)"/></svg>`;
    }
  }
}

const WaterHeaterMiniCardEditor = rcEditor({
  card: WaterHeaterMiniCard,
  helpers: WH_HELPERS,
  schema: whSchema(["show_title", "show_scene", "animations", "show_controls", "zoom"]),
});

rcRegister(
  WaterHeaterMiniCard,
  WaterHeaterMiniCardEditor,
  "Water Heater Mini Card",
  "The water heater on two lines: a hot-water ring, the state and the key readings, with a zoom to the full card",
);
