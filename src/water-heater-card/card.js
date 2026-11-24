// ── Card ─────────────────────────────────────────────────────────────────────
import { WH_ACCENTS, WH_DROP, WH_ICONS, whScene } from "./core.js";
import { WH_ROOM_CX, WH_SVG, whIcon, whModeIcon, whPlacePill, whRoom } from "./banner.js";

export class WaterHeaterCard extends RcCard {
  static tag = "water-heater-card";
  static i18n = WH_I18N;
  static defaults = { illustration: true, illustration_theme: "auto", show_subtitle: true, show_scene: true, animations: true, show_controls: true, show_cost: true, show_timeline: true, cost_period: "month" };

  // The most likely water heater of the home.
  static getStubConfig(hass) {
    const entity = hass ? whHeaters(hass)[0] : undefined;
    return entity ? { entity } : {};
  }

  // A new configuration starts again on its own `cost_period`.
  setConfig(config) {
    this._period = undefined;
    super.setConfig(config);
  }

  getCardSize() {
    return (this._config?.show_scene === false ? 3 : 6) + (this._costOn() ? 3 : 0) + (this._stripOn() ? 1 : 0);
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
    // The water heaters of the home are scanned again only when the registry changes (or none was found yet).
    const memo = (this._memo ||= {});
    let found = rcMemo(memo, "heaters", [h.entities], () => whHeaters(h));
    if (!found.length) found = memo.heaters.value = whHeaters(h);
    return found[0];
  }

  _fmt(v, digits) {
    try {
      return whIntl(Intl.NumberFormat, this._lang(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
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
    // The roles read the states too (a sensor unavailable after a restart is skipped): found again when the states of
    // the water heater's own device change, not at every state change of the instance.
    const devIds = (id && whDeviceEntities(h)[whDeviceOf(h, id)]) || [];
    const e = rcMemo((this._memo ||= {}), "find", [id, c.entities, h.entities, h.devices, ...devIds.map((x) => h.states[x])], () => whFind(h, id, c.entities || {}));
    const st = (role) => (e[role] ? h.states[e[role]] : undefined);
    const on = (role) => st(role)?.state === "on";
    const wh = !!id?.startsWith("water_heater.");
    const a = ent?.attributes || {};
    const dev = id && h.devices?.[whDeviceOf(h, id)];
    // The water's temperature: the configured sensor, else the water heater's, else a probe on its device.
    const probe = c.temperature ? h.states[c.temperature] : st("temperature");
    const unit = c.temperature || !wh ? probe?.attributes.unit_of_measurement || "°C" : h.config?.unit_system?.temperature || "°C";
    // Numbers, even when an integration sends them as text ("55"): "55" + 1 must not become 551.
    const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
    const temp = c.temperature || !wh ? whNum(probe) : (num(a.current_temperature) ?? whNum(probe));
    const target = wh ? (num(a.temperature) ?? num(a.target_temp_high)) : null;
    const mode = wh ? (a.operation_mode ?? ent?.state) : null;
    const nmode = whNorm(mode);
    // A tank with no relay, driven by a PV router: a power sensor as `entity` is the power itself, read-only.
    const entIsSensor = !wh && !!id?.startsWith("sensor.");
    const watts = whWatts(st("power") || (entIsSensor ? ent : undefined));
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
    // PV-routed tanks: today's energy split between the grid (off-peak forcing) and the solar surplus.
    const eGrid = whKwh(st("energy_grid"));
    const eSolar = whKwh(st("energy_solar"));
    const eSplit = eGrid != null || eSolar != null;
    const eTotal = eSplit ? (eGrid || 0) + (eSolar || 0) : null;
    const modes = (wh ? a.operation_list || [] : []).filter((x) => whNorm(x) !== "off" && !WH_AWAY.test(whNorm(x)));
    return {
      id,
      none: !ent && !id,
      ids: e,
      wh,
      state,
      raw: ent ? h.formatEntityState?.(ent) || ent.state : "",
      name: c.title || a.friendly_name || dev?.name_by_user || dev?.name || this._t("title"),
      sub: c.show_subtitle === false ? "" : [h.areas?.[dev?.area_id]?.name, dev?.model].filter(Boolean).join(" · "),
      unit,
      temp,
      target,
      min: num(a.min_temp) ?? 30,
      max: num(a.max_temp) ?? 70,
      step: num(a.target_temp_step) || 1,
      mode,
      modeLabel: mode && nmode !== "off" ? this._modeLabel(ent, mode) : null,
      modes: modes.slice(0, 4).map((x) => ({ value: x, label: this._modeLabel(ent, x), icon: whModeIcon(x) })),
      watts,
      energy: eSplit ? eTotal : whKwh(energySt),
      today: eSplit || (!!energySt && /today|daily|day|jour|heute|oggi|hoy/i.test(whLabel(h, energySt.entity_id))),
      solarShare: eSplit && eTotal > 0 ? (eSolar || 0) / eTotal : null,
      // A PV-routed tank (a power sensor as its entity, or a solar energy): drawn with its panel; by night, the moon.
      solar: entIsSensor || !!e.energy_solar,
      night: h.states["sun.sun"]?.state === "below_horizon",
      inlet: whNum(st("inlet")) != null ? whNum(st("inlet")) : null,
      inletUnit: st("inlet")?.attributes.unit_of_measurement || "°C",
      ...hot,
      awayEnd: end && !Number.isNaN(end.getTime()) ? end : null,
      awayAttr: wh && "away_mode" in a,
      awayOn: away,
      awayId: e.away && h.states[e.away] && !rcUnavailable(h.states[e.away]) ? e.away : null,
      boostId: e.boost && h.states[e.boost] && !rcUnavailable(h.states[e.boost]) ? e.boost : null,
      boostOn: boost,
      relayId: !wh && id && /^(switch|input_boolean)\./.test(id) ? id : null,
      relayOn: !wh && /^(switch|input_boolean)\./.test(id || "") && ent?.state === "on",
      tariff: tariff && !rcUnavailable(tariff) ? h.formatEntityState?.(tariff) || tariff.state : null,
      error: errOn ? (errSt.entity_id.startsWith("binary_sensor.") ? this._t("st_error") : h.formatEntityState?.(errSt) || errSt.state) : null,
      heatPump: WH_HEAT_PUMP.test([...(a.operation_list || []), dev?.model, dev?.name, id].filter(Boolean).join(" ")),
    };
  }

  _dark() {
    return !!this._hass.themes?.darkMode;
  }

  // The banner's night: forced by `illustration_theme`, else Home Assistant's dark theme alone (a light theme keeps the
  // day picture after sunset). The PV panel's sun or moon (`m.night`) keeps following the real sun: it shows whether
  // the panel produces, not the picture's look.
  _night() {
    const theme = this._config.illustration_theme;
    if (theme === "night" || theme === "day") return theme === "night";
    return this._dark();
  }

  // The illustrated header: the badge (the state's icon, in the state's colour), the title and `sub` on the room's wall
  // at the left, the tank in its utility corner at the right, a 10 px concrete floor strip edge to edge. `ring`: the
  // mini card's share of hot water around the badge.
  _banner(m, sub, night, scene, ring = "", cx = WH_ROOM_CX, pill = "") {
    const c = this._config;
    const nav = c.navigation_path;
    const moving = scene && this._animate() && (m.state === "heating" || m.state === "boost");
    // The mini card's expand / collapse button sits at the banner's top right corner: the tank and its pipes step
    // aside, clear of it.
    const dx = this._addZoom && c.zoom ? 24 : 0;
    const tank = scene ? whScene({ ...scene, share: m.share, dark: night, uid: this._id(), animate: this._animate(), bare: { cx: cx - dx } }) : "";
    // The status pill right after the title (on its own line under the subtitle when it does not fit there).
    const chip = pill ? `<span class="bpill" title="${rcEsc(m.raw || pill)}" aria-label="${rcEsc(pill)}"><span class="bdot"></span><span class="bpt">${rcEsc(pill)}</span></span>` : "";
    return `
      <div class="banner${night ? " night" : ""}">
        <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}${m.sub ? ` title="${rcEsc(m.sub)}"` : ""}>
          <div class="badge">${ring}<ha-icon icon="${m.none ? "mdi:water-boiler" : WH_ICONS[m.state]}"></ha-icon></div>
          <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div>${chip}</div>${sub}</div>
        </div>
        <svg class="room" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax slice">${whRoom(night, moving, !m.solar, dx)}${tank}</svg>
        <div class="ground"></div>
      </div>`;
  }

  // The status pill's place, on the banner and on the classic header (see whPlacePill).
  _fitPill() {
    for (const row of this.shadowRoot?.querySelectorAll?.(".trow") || []) {
      const banner = row.closest(".banner");
      whPlacePill(banner || row.closest(".head"), row, banner?.querySelector(".ground"));
    }
  }

  connectedCallback() {
    super.connectedCallback?.();
    // A new width: the status pill is fitted again (in the next frame, and only for a new width).
    if (typeof ResizeObserver !== "function") return;
    this._resize ??= new ResizeObserver((entries) => {
      const w = Math.round(entries.at(-1).contentRect.width);
      if (w === this._fitWidth) return;
      this._fitWidth = w;
      cancelAnimationFrame(this._fitFrame);
      this._fitFrame = requestAnimationFrame(() => this._fitPill());
    });
    this._resize.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    this._resize?.disconnect();
    this._fitWidth = undefined;
    if (this._fitFrame) cancelAnimationFrame(this._fitFrame);
  }

  // Unique per card: the SVG ids of several cards on one page never clash.
  _id() {
    this._uid ||= Math.random().toString(36).slice(2, 8);
    return this._uid;
  }

  // Under the banner: what the classic illustration's glass panel says (showers left, litres at 40 °C, the note).
  _panel(scene, m) {
    const acc = WH_ACCENTS[m.state];
    const drops = [0, 1, 2, 3, 4]
      .map((i) => `<svg viewBox="0 0 15 15" aria-hidden="true"><path transform="scale(.62)" d="${WH_DROP}" fill="${i < scene.drops ? acc : "var(--wh-drop-off)"}"/></svg>`)
      .join("");
    const big = scene.big ? `<span class="sb"><b>${rcEsc(scene.big)}</b>${scene.label ? `<span>${rcEsc(scene.label)}</span>` : ""}</span><span class="dr">${drops}</span>` : "";
    const lines = [scene.litres && `<span class="sn">${rcEsc(scene.litres)}</span>`, scene.note && `<span class="nt">${rcEsc(scene.note)}</span>`].filter(Boolean).join("");
    if (!big && !lines) return "";
    return `<button class="sc shw" title="${rcEsc(m.raw || this._status(m))}">${big}${lines ? `<span class="sl2">${lines}</span>` : ""}</button>`;
  }

  _deg(v, withUnit = true) {
    return v == null ? "" : `${this._fmt(v, 0)}${withUnit ? ` ${this._unitOf()}` : "°"}`;
  }

  _unitOf() {
    return this._items?.unit || "°C";
  }

  _date(d) {
    try {
      return whIntl(Intl.DateTimeFormat, this._lang(), { weekday: "short", day: "numeric", month: "short" }).format(d);
    } catch {
      return d.toDateString();
    }
  }

  _status(m) {
    const label = this._t(`st_${m.state}`);
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
      energy: [
        "energy",
        m.today ? "t_today" : "t_energy",
        m.energy != null ? [this._fmt(m.energy, m.energy >= 100 ? 0 : 1), "kWh", m.solarShare != null ? this._t("solar_share", { n: this._fmt(m.solarShare * 100, 0) }) : null] : null,
      ],
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

  _tile([icon, label, [value, unit, sub]]) {
    return `<div class="xt"><span class="xh">${whIcon(WH_SVG[icon])}<span class="xl">${rcEsc(this._t(label))}</span></span><span class="xv">${rcEsc(value)}${unit ? `<small>${rcEsc(unit)}</small>` : ""}</span>${sub ? `<span class="xs">${whIcon(WH_SVG.sun)}<span>${rcEsc(sub)}</span></span>` : ""}</div>`;
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
    const status = this._status(m);
    const sh = this._showers(m);
    const tiles = this._tileList(m);
    const scene = {
      state: m.state,
      share: m.share != null ? Math.round(m.share * 100) / 100 : null,
      temp: m.temp != null ? this._deg(m.temp, false) : "",
      big: sh?.big,
      label: sh?.label,
      drops: m.share != null ? Math.round(m.share * 5) : Math.min(5, m.showers ?? 0),
      litres: m.litres != null ? this._t("litres", { n: this._fmt(m.litres, 0) }) : "",
      note: this._note(m),
      heatPump: m.heatPump,
      solar: m.solar,
      night: m.night,
    };
    // Redrawn only when something shown changes: a reading moving by 0.001, the same on screen, must not rebuild the
    // card (and restart the bubbles and the fan).
    const banner = c.illustration !== false;
    const night = banner && this._night();
    if (!m.none) this._refresh(m);
    const prices = this._costOn() ? [this._price(c.energy_price, c.energy_price_entity), this._price(c.water_price, c.water_price_entity)] : null;
    const parts = [m.none, m.raw, m.name, m.sub, status, scene, tiles, m.error, m.mode, m.modes, m.target, m.min, m.max, m.boostOn, m.relayOn, m.awayOn, m.awayAttr, m.awayId, m.boostId, dark, banner, night, this._periodNow(), this._loadSeq, prices];
    if (!this._changed(parts)) return;
    const head = banner
      ? this._banner(
          m,
          !m.none && ["heating", "ready", "boost"].includes(m.state) && m.temp != null ? `<div class="subt">${rcEsc(this._deg(m.temp))}</div>` : "",
          night,
          m.none ? null : scene,
          "",
          WH_ROOM_CX,
          m.none ? "" : this._t(`st_${m.state}`),
        )
      : `
      <div class="head${c.navigation_path ? " nav" : ""}"${c.navigation_path ? ' role="link" tabindex="0"' : ""}>
        <div class="badge"><ha-icon icon="${m.none ? "mdi:water-boiler" : WH_ICONS[m.state]}"></ha-icon></div>
        <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div>${m.none ? "" : `<span class="pill" title="${rcEsc(m.raw || status)}" aria-label="${rcEsc(status)}"><span class="pt">${rcEsc(status)}</span></span>`}</div>${m.sub ? `<div class="subt" title="${rcEsc(m.sub)}">${rcEsc(m.sub)}</div>` : ""}</div>
      </div>`;
    // No water heater: say so, rather than draw a tank.
    if (m.none) {
      this._paint("off", `${head}<div class="none">${rcEsc(this._t("no_heater"))}</div>`, "");
      this._fitPill();
      return;
    }
    // The glass panel's text gets too small on a narrow card: the same as a line under the scene (shown by CSS).
    const line = [sh && `${sh.big} ${sh.label}`, scene.litres, scene.note].filter(Boolean).join(" · ");
    // With the banner, the tank is in the header: below it, the panel's readings only.
    const html =
      c.show_scene === false
        ? ""
        : banner
          ? this._panel(scene, m)
          : `<button class="sc" title="${rcEsc(m.raw || status)}">${whScene({ ...scene, share: m.share, dark, uid: this._id(), animate: this._animate() })}</button>${line ? `<div class="sl">${rcEsc(line)}</div>` : ""}`;
    const error = m.error && c.show_scene === false ? `<div class="err" role="alert">${rcEsc(m.error)}</div>` : "";
    this._paint(m.state, head + html + error, tiles.map((t) => this._tile(t)).join(""));
    this._fitPill();
  }

  // The cost section, with a meter; the heating strip, with the cost section or a tariff.
  _costOn() {
    const c = this._config || {};
    return c.show_cost !== false && !!(c.energy_meter || c.water_meter);
  }

  _stripOn() {
    const c = this._config || {};
    return c.show_timeline !== false && !!(c.tariff || c.energy_meter || c.water_meter);
  }

  _periodNow() {
    const p = this._period || this._config.cost_period;
    return WH_PERIODS.includes(p) ? p : "month";
  }

  // A price: the number set, else its entity's state.
  _price(num, id) {
    if (num != null && num !== "" && Number.isFinite(Number(num))) return Number(num);
    const s = id && this._hass.states[id];
    return s && !rcUnavailable(s) ? whNum(s) : null;
  }

  // What tells the tank heats, for the strip: [entity, test of its state]. The heating sensor, else the power (above
  // 50 W), else the relay.
  _heatSource(m) {
    const h = this._hass;
    if (m.ids.heating && h.states[m.ids.heating]) return [m.ids.heating, (s) => s === "on"];
    const pid = m.ids.power || (m.id?.startsWith("sensor.") ? m.id : null);
    if (pid && h.states[pid]) {
      const k = { kW: 1000, MW: 1e6 }[h.states[pid].attributes.unit_of_measurement] || 1;
      return [pid, (s) => Number.parseFloat(s) * k > 50];
    }
    return m.relayId ? [m.relayId, (s) => s === "on"] : null;
  }

  // The statistics and the history, read again when stale (WH_REFRESH), or for a new period, day or configuration.
  // Once read, the card is drawn again (`_loadSeq` changes its signature).
  _refresh(m) {
    const h = this._hass;
    if (typeof h.callWS !== "function" || (!this._costOn() && !this._stripOn())) return;
    const c = this._config;
    const now = new Date();
    const src = this._stripOn() ? this._heatSource(m) : null;
    const key = JSON.stringify([this._periodNow(), now.toDateString(), c.energy_meter, c.water_meter, c.energy_price, c.energy_price_entity, c.water_price, c.water_price_entity, c.tariff, src?.[0]]);
    if (this._loading || (key === this._loadKey && Date.now() - this._loadedAt < WH_REFRESH)) return;
    this._loading = true;
    this._loadKey = key;
    this._load = Promise.all([this._loadCost(now), this._loadStrip(now, src)])
      .then(([cost, strip]) => {
        this._cost = cost;
        this._strip = strip;
      })
      .catch(() => {})
      .finally(() => {
        this._loading = false;
        this._loadedAt = Date.now();
        this._loadSeq = (this._loadSeq || 0) + 1;
        this._render();
      });
  }

  // The meters' daily changes (kWh, m³) and the prices' daily means, over this period and the one before.
  async _loadCost(now) {
    if (!this._costOn()) return null;
    const c = this._config;
    const h = this._hass;
    const period = this._periodNow();
    const [start, prev] = whPeriodStart(period, now, h.locale?.first_weekday !== "sunday");
    const pe = c.energy_price == null ? c.energy_price_entity : null;
    const pw = c.water_price == null ? c.water_price_entity : null;
    const res = await h.callWS({
      type: "recorder/statistics_during_period",
      start_time: prev.toISOString(),
      end_time: now.toISOString(),
      statistic_ids: [c.energy_meter, c.water_meter, pe, pw].filter(Boolean),
      period: "day",
      types: ["change", "mean"],
      units: { energy: "kWh", volume: "m³" },
    });
    const days = new Map();
    const put = (id, field, type) => {
      for (const r of (id && res?.[id]) || []) {
        const t = typeof r.start === "number" ? r.start : Date.parse(r.start);
        const row = days.get(t) || { t };
        if (Number.isFinite(r[type])) row[field] = r[type];
        days.set(t, row);
      }
    };
    put(c.energy_meter, "e", "change");
    put(c.water_meter, "w", "change");
    put(pe, "pe", "mean");
    put(pw, "pw", "mean");
    const rows = [...days.values()];
    return { period, cur: rows.filter((r) => r.t >= start.getTime()), prev: rows.filter((r) => r.t < start.getTime()) };
  }

  // Today's heating spans and off-peak spans (ms), from midnight.
  async _loadStrip(now, src) {
    if (!src) return null;
    const c = this._config;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const res = await this._hass.callWS({
      type: "history/history_during_period",
      start_time: new Date(start).toISOString(),
      end_time: now.toISOString(),
      entity_ids: [src[0], c.tariff].filter(Boolean),
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: false,
    });
    const clip = (spans) => spans.map(([a, b]) => [Math.max(a, start), b]).filter(([a, b]) => b > a);
    const end = now.getTime();
    return {
      start,
      runs: clip(whSpans(res?.[src[0]], src[1], end)),
      off: c.tariff ? clip(whSpans(res?.[c.tariff], (s) => whOffPeak(c.tariff, s), end)) : null,
    };
  }

  _money(v) {
    const h = this._hass;
    const currency = this._config.currency || h.config?.currency || "EUR";
    const digits = Math.abs(v) >= 1000 ? 0 : 2;
    try {
      return whIntl(Intl.NumberFormat, this._lang(), { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
    } catch {
      return `${v.toFixed(digits)} ${currency}`;
    }
  }

  _dur(ms) {
    const n = Math.round(ms / 60000);
    return n < 60 ? this._t("dur_min", { n }) : this._t("dur_h", { h: Math.floor(n / 60), m: String(n % 60).padStart(2, "0") });
  }

  _ctile(cls, icon, label, value, unit, sub) {
    return `<div class="xt ${cls}"><span class="xh">${whIcon(WH_SVG[icon])}<span class="xl">${rcEsc(this._t(label))}</span></span><span class="xv">${rcEsc(value)}${unit ? `<small>${rcEsc(unit)}</small>` : ""}</span>${sub ? `<span class="cx">${rcEsc(sub)}</span>` : ""}</div>`;
  }

  // The cost: the period's tabs, the cost of a m³ of hot water against the period before, then its electricity, its
  // water and the standby days (the energy that only kept the water hot).
  _costHtml() {
    if (!this._costOn()) return "";
    const c = this._config;
    const p = this._periodNow();
    const tabs = WH_PERIODS.map((x) => `<button class="per${x === p ? " on" : ""}" data-p="${x}" data-k="per-${x}" aria-pressed="${x === p}">${rcEsc(this._t(`p_${x}`))}</button>`).join("");
    const head = `<div class="csh"><span class="cst">${rcEsc(this._t("cost"))}</span><span class="mseg pseg" role="group" aria-label="${rcEsc(this._t("cost"))}">${tabs}</span></div>`;
    const d = this._cost;
    if (!d || d.period !== p) return `${head}<div class="none cwait">…</div>`;
    const pe = this._price(c.energy_price, c.energy_price_entity);
    const pw = this._price(c.water_price, c.water_price_entity);
    const cur = whTally(d.cur, pe, pw);
    if (!cur.days) return `${head}<div class="none">${rcEsc(this._t("no_data"))}</div>`;
    const prev = whTally(d.prev, pe, pw);
    let big = "";
    if (cur.perM3 != null) {
      const delta = prev.perM3 ? (cur.perM3 - prev.perM3) / prev.perM3 : null;
      const pct = delta != null && Math.abs(delta) >= 0.005 ? whIntl(Intl.NumberFormat, this._lang(), { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(delta) : null;
      const dl = pct ? `<span class="cpd ${delta < 0 ? "dn" : "up"}">${rcEsc(this._t("vs_prev", { n: pct }))}</span>` : "";
      big = `<div class="cpm"><b>${rcEsc(this._money(cur.perM3))}</b><span>${rcEsc(this._t("per_m3"))}</span>${dl}</div>`;
    }
    const kwh = (v) => this._fmt(v, v >= 100 ? 0 : 1);
    const m3 = (v) => this._fmt(v, v >= 100 ? 0 : v >= 10 ? 1 : 2);
    const tiles = [
      c.energy_meter && (pe != null ? this._ctile("ce", "power", "t_electricity", this._money(cur.eCost), "", `${kwh(cur.kwh)} kWh`) : this._ctile("ce", "power", "t_electricity", kwh(cur.kwh), "kWh")),
      c.water_meter && (pw != null ? this._ctile("cw", "drop", "t_hot_water", this._money(cur.wCost), "", `${m3(cur.m3)} m³`) : this._ctile("cw", "drop", "t_hot_water", m3(cur.m3), "m³")),
      c.energy_meter &&
        c.water_meter &&
        this._ctile("cs", "standby", "t_standby", pe != null ? this._money(cur.standbyCost) : kwh(cur.standbyKwh), pe != null ? "" : "kWh", `${this._tn("day", cur.standbyDays)}${pe != null ? ` · ${kwh(cur.standbyKwh)} kWh` : ""}`),
    ].filter(Boolean);
    return `${head}${big}<div class="cgrid">${tiles.join("")}</div>`;
  }

  // Today's heating on a 24 h strip: the off-peak hours behind, each heating span on them, the part at the peak rate
  // in the alert colour.
  _stripHtml() {
    const s = this._stripOn() && this._strip;
    if (!s) return "";
    const day = new Date(s.start);
    const len = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime() - s.start;
    const at = (t) => Math.min(100, Math.max(0, ((t - s.start) / len) * 100));
    const bar = (cls, [a, b]) => `<i class="${cls}" style="left:${at(a).toFixed(2)}%;width:${(at(b) - at(a)).toFixed(2)}%"></i>`;
    const peaks = s.off ? s.runs.flatMap((r) => whOutside(r, s.off)) : [];
    const total = s.runs.reduce((n, [a, b]) => n + b - a, 0);
    const peak = peaks.reduce((n, [a, b]) => n + b - a, 0);
    const summary = [this._dur(total), peak >= 60000 && this._t("peak_time", { d: this._dur(peak) })].filter(Boolean).join(" · ");
    const hour = (x) => {
      try {
        return whIntl(Intl.DateTimeFormat, this._lang(), { hour: "numeric" }).format(new Date(day.getFullYear(), day.getMonth(), day.getDate(), x));
      } catch {
        return `${x}h`;
      }
    };
    const ticks = [0, 6, 12, 18].map((x) => `<span style="left:${(x / 24) * 100}%">${rcEsc(hour(x))}</span>`).join("");
    const legend = [s.off && ["off", "lg_off_peak"], ["run", "lg_heating"], peak >= 60000 && ["pk", "lg_peak"]]
      .filter(Boolean)
      .map(([k, l]) => `<span class="${k}">${rcEsc(this._t(l))}</span>`)
      .join("");
    const label = `${this._t("heating_today")}: ${summary}`;
    return `<div class="csh"><span class="cst">${rcEsc(this._t("heating_today"))}</span><span class="cxs">${rcEsc(summary)}</span></div>
      <div class="tl" role="img" aria-label="${rcEsc(label)}">${(s.off || []).map((x) => bar("hc", x)).join("")}${s.runs.map((x) => bar("run", x)).join("")}${peaks.map((x) => bar("pk", x)).join("")}</div>
      <div class="tk" aria-hidden="true">${ticks}</div><div class="lg" aria-hidden="true">${legend}</div>`;
  }

  _afterGrid() {
    const m = this._items;
    if (!m || m.none) return "";
    return this._controls(m) + this._costHtml() + this._stripHtml();
  }

  _controls(m) {
    if (this._config.show_controls === false || m.state === "offline") return "";
    const modes =
      m.modes.length > 1
        ? `<span class="mseg" role="group" aria-label="${rcEsc(this._t("t_mode"))}">${m.modes
            .map((x) => `<button class="md${x.value === m.mode ? " on" : ""}" data-mode="${rcEsc(x.value)}" data-k="mode-${rcEsc(x.value)}" aria-pressed="${x.value === m.mode}">${whIcon(WH_SVG[x.icon])}<span>${rcEsc(x.label)}</span></button>`)
            .join("")}</span>`
        : "";
    const boostInModes = m.modes.some((x) => WH_BOOST.test(whNorm(x.value)));
    const boost = m.boostId && !boostInModes ? `<button class="gb act-boost${m.boostOn ? " on" : ""}" data-k="boost" aria-pressed="${m.boostOn}">${whIcon(WH_SVG.boost)}<span>${rcEsc(this._t("m_boost"))}</span></button>` : "";
    const away =
      m.awayAttr || m.awayId
        ? `<button class="gb act-away${m.awayOn ? " on" : ""}" data-k="away" aria-pressed="${m.awayOn}">${whIcon(WH_SVG.back)}<span>${rcEsc(this._t(m.awayOn ? "back" : "away"))}</span></button>`
        : "";
    const relay = m.relayId ? `<button class="pb act-relay" data-k="relay">${whIcon(WH_SVG.relay)}<span>${rcEsc(this._t(m.relayOn ? "stop" : "heat_now"))}</span></button>` : "";
    const step =
      m.wh && m.target != null
        ? `<span class="seg" role="group" aria-label="${rcEsc(this._t("target", { t: this._deg(m.target) }))}"><button class="act-lower" data-k="lower" aria-label="${rcEsc(this._t("lower"))}"${m.target <= m.min ? " disabled" : ""}>−</button><b aria-live="polite">${rcEsc(this._deg(m.target))}</b><button class="act-raise" data-k="raise" aria-label="${rcEsc(this._t("raise"))}"${m.target >= m.max ? " disabled" : ""}>+</button></span>`
        : "";
    // Two rows: the modes, then the other actions with the target at the end, so that the target never ends up alone.
    const row2 = relay || boost || away || step ? `<div class="ctl">${relay}${boost}${away}${step}</div>` : "";
    return modes ? `<div class="ctl">${modes}</div>${row2}` : row2;
  }

  _bindAfter(root) {
    const m = this._items;
    const h = this._hass;
    if (!m || m.none) return;
    const on = (sel, fn) =>
      root.querySelector(sel)?.addEventListener("click", (ev) => {
        ev.stopPropagation();
        fn(ev);
      });
    root.querySelector(".sc")?.addEventListener("click", () => rcMoreInfo(this, m.id));
    // The cost's period: shown at once, its statistics read in the background.
    for (const b of root.querySelectorAll(".per") || []) {
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const p = b.dataset?.p ?? b.getAttribute?.("data-p");
        if (p && p !== this._periodNow()) {
          this._period = p;
          this._render();
        }
      });
    }
    for (const b of root.querySelectorAll(".md") || []) {
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const mode = b.dataset?.mode ?? b.getAttribute?.("data-mode");
        if (mode && mode !== m.mode) rcCall(h, "water_heater", "set_operation_mode", { entity_id: m.id, operation_mode: mode });
      });
    }
    on(".act-boost", () => rcCall(h, m.boostId.split(".")[0], m.boostOn ? "turn_off" : "turn_on", { entity_id: m.boostId }));
    on(".act-away", () =>
      m.awayAttr
        ? rcCall(h, "water_heater", "set_away_mode", { entity_id: m.id, away_mode: !m.awayOn })
        : rcCall(h, m.awayId.split(".")[0], m.awayOn ? "turn_off" : "turn_on", { entity_id: m.awayId }),
    );
    on(".act-relay", () => rcCall(h, m.relayId.split(".")[0], m.relayOn ? "turn_off" : "turn_on", { entity_id: m.relayId }));
    // Quick presses add up: each step starts from the target asked last (until the water heater reports it), shown at once.
    const setTarget = (delta) => {
      const asked = this._targetAsked && this._targetAsked.id === m.id && Date.now() - this._targetAsked.at < 5000 ? this._targetAsked.value : null;
      const from = asked ?? m.target;
      const value = Math.min(m.max, Math.max(m.min, Math.round((from + delta * m.step) * 100) / 100));
      if (value === from) return;
      this._targetAsked = { id: m.id, value, at: Date.now() };
      const shown = root.querySelector(".seg b");
      if (shown) shown.textContent = this._deg(value);
      rcCall(h, "water_heater", "set_temperature", { entity_id: m.id, temperature: value });
    };
    on(".act-lower", () => setTarget(-1));
    on(".act-raise", () => setTarget(1));
  }

  static styles = `
    :host { --wh-heating: #e8590c; --wh-boost: #d6336c; --wh-solar: #f59f00; }
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
    /* The solar share of today's energy: a sun and its share, in the solar colour (darkened to read on the tile). */
    .xs { display: flex; align-items: center; gap: 4px; min-width: 0; font-size: 12px; font-weight: 500;
          color: color-mix(in srgb, var(--wh-solar) 60%, var(--primary-text-color, #212121)); }
    .xs svg { flex: none; width: 14px; height: 14px; color: var(--wh-solar); }
    .xs span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ctl { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 10px; }
    .pb, .gb, .seg button, .mseg button { all: unset; box-sizing: border-box; cursor: pointer; }
    .pb { display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 16px; border-radius: 999px; font-size: 14px; font-weight: 500;
          color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--c) 15%, transparent); }
    .pb:hover { background: color-mix(in srgb, var(--c) 24%, transparent); }
    .mseg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 2px; border-radius: 999px; background: var(--secondary-background-color, rgba(127,127,127,.1)); }
    .mseg button { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 12px; border-radius: 999px; font-size: 13px; font-weight: 500;
                   color: var(--primary-text-color); }
    .mseg button:hover:not(.on) { background: color-mix(in srgb, var(--c) 10%, transparent); }
    .mseg button.on, .gb.on { color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--c) 16%, transparent); }
    /* Away or off, the accent is grey: the active mode is marked by its background and weight, not dimmed. */
    .lvl-away .mseg button.on, .lvl-off .mseg button.on { color: var(--primary-text-color); background: color-mix(in srgb, var(--primary-text-color) 12%, transparent); font-weight: 700; }
    .mseg svg { width: 15px; height: 15px; }
    .gb { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 14px; border-radius: 999px; font-size: 13px; font-weight: 500;
          color: var(--primary-text-color); background: var(--secondary-background-color, rgba(127,127,127,.1)); }
    .pb svg, .gb svg { width: 17px; height: 17px; }
    .seg { display: inline-flex; align-items: center; min-height: 44px; padding: 0 2px; margin-left: auto; border-radius: 999px; background: var(--secondary-background-color, rgba(127,127,127,.1)); }
    .seg button { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-size: 18px; color: var(--primary-text-color); }
    .seg button:hover:not([disabled]) { background: color-mix(in srgb, var(--c) 15%, transparent); }
    .seg button[disabled] { opacity: .35; cursor: default; }
    .seg b { min-width: 52px; text-align: center; font-size: 14px; font-weight: 500; }
    .pb:focus-visible, .gb:focus-visible, .seg button:focus-visible, .mseg button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .none { margin-top: 10px; padding: 12px; border-radius: 12px; font-size: 13px; color: var(--secondary-text-color);
            background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    .sl { display: none; margin-top: 6px; font-size: 13px; font-weight: 500; color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color, #212121)); }
    @container (max-width: 360px) { .glass { display: none; } .sl { display: block; } }
    @container (max-width: 300px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      /* Three tiles on two columns: the third spans the row rather than stand alone. */
      .grid > :nth-child(3):last-child { grid-column: 1 / -1; }
    }
    /* Illustrated header (banner): 90 px, edge to edge, the title on the utility room's wall, the tank at the right,
       a 10 px concrete strip at the bottom. The badge's icon is in the state's colour, grey when idle, by day and night. */
    .banner { position: relative; display: flex; height: 90px; margin: -12px -12px 0; overflow: hidden; background: #f4f1ec;
              --bt: #0d2a45; --bs: #3b5b78; --ic: color-mix(in srgb, var(--c) 85%, #10283f); --sw: min(200px, 56%); }
    .banner.night { background: #2c3034; --bt: #fff; --bs: rgba(255,255,255,.78); --ic: color-mix(in srgb, var(--c) 72%, #fff); }
    .lvl-away .banner, .lvl-off .banner, .lvl-offline .banner { --ic: #6b7680; }
    .lvl-away .banner.night, .lvl-off .banner.night, .lvl-offline .banner.night { --ic: #a7b0b8; }
    .banner .head { position: relative; z-index: 1; flex: 1; min-width: 0; height: 80px; box-sizing: border-box;
                    padding: 0 calc(var(--sw) + 4px) 0 14px; }
    .banner .badge { position: relative; color: var(--ic); background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px rgba(13,42,69,.12); }
    .banner.night .badge { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
    .banner .title { color: var(--bt); }
    .banner .subt { color: var(--bs); font-size: 13px; }
    .banner .room { position: absolute; right: 0; bottom: 10px; width: var(--sw); height: calc(80px * var(--sk, 1)); }
    .banner .pl { stroke-dasharray: 4 26; animation: wh-pl 1.4s linear infinite; }
    @keyframes wh-pl { to { stroke-dashoffset: -30; } }
    .banner .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: #9aa1a9; box-shadow: inset 0 2px 0 #b5bbc2; }
    .banner.night .ground { background: #1f2329; box-shadow: inset 0 2px 0 #3a4048; }
    /* The mini card's expand / collapse button: 24 px, frosted, 5 px from the banner's top right corner. */
    .banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; width: 24px; height: 24px; margin: 0; color: #33506b;
                    background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
    .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
    .banner .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; }
    .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }
    /* The banner's head stays on one line (the classic header's narrow wrap is for its pill). */
    .banner .head { flex-wrap: nowrap; }
    .banner .head::after { content: none; }
    .banner .tt { min-width: 0; flex: 1 1 auto; }
    /* Status pill right after the title, in the state's colour on a frosted tint, only when the whole title and its
       whole label fit there (measured by the card, see whPlacePill); otherwise on its own line under the subtitle
       (one line then), where it may run over the left of the scene; when even that cuts it or leaves the banner, and
       on a card of 200 px or less, its dot alone. The classic header follows the same rule. */
    .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .trow > .title { flex: 0 1 auto; min-width: 0; }
    .trow > .bpill, .trow > .pill { flex: none; max-width: none; }
    :host([hide-title]) .trow .title { visibility: hidden; }
    .head:has(.trow) { flex-wrap: nowrap; }
    .head:has(.trow)::after { content: none; }
    .bpill { display: inline-flex; align-items: center; gap: 4px; min-width: 0; box-sizing: border-box; overflow: hidden;
             white-space: nowrap; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; line-height: 16px;
             background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #0d2a45); }
    .banner.night .bpill { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #ffffff); }
    .bdot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; }
    .bpt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    [data-wrap] .trow { display: contents; }
    [data-wrap] .trow > .bpill, [data-wrap] .trow > .pill { order: 9; align-self: flex-start; max-width: 100%; margin-top: 3px; }
    .banner[data-wrap] .trow > .bpill { max-width: calc(100cqw - 80px); }
    [data-wrap] .subt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [data-dot] .bpill { padding: 0; background: none; }
    [data-dot] .bpt, [data-dot] .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    [data-dot] .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
    [data-dot] .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    @container (max-width: 200px) {
      .bpill { padding: 0; background: none; }
      .bpt, .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
      .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
      .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    }
    /* The mini card: the banner alone, its readings as chips on the wall. */
    ha-card.bn { padding: 0; }
    ha-card.bn > .banner { margin: 0; --sw: min(200px, 46%); }
    /* Narrower cards: the utility corner is drawn smaller (75 %, 62 %, then 50 % of its height, its left part cropped),
       so that the text keeps room for the whole title and the pill's label; the tank stays whole, day and night. */
    @container (max-width: 420px) { .banner, ha-card.bn > .banner { --sw: 150px; --sk: .75; } }
    /* At 75 % the cold water pipe climbs close to the expand button: the corner steps a little further aside. */
    @container (min-width: 341px) and (max-width: 420px) { .banner:has(.zoom) .room { right: 12px; } }
    @container (max-width: 340px) { .banner, ha-card.bn > .banner { --sw: 112px; --sk: .62; } }
    @container (max-width: 260px) { .banner, ha-card.bn > .banner { --sw: 70px; --sk: .5; } }
    /* The chips that do not fit wrap to a second line, hidden: never a chip cut to "R…". */
    .banner .rs { display: flex; flex-wrap: wrap; gap: 4px; height: 20px; margin: 3px 0 0 -2px; min-width: 0; overflow: hidden; }
    .banner .r { flex: none; line-height: 20px; padding: 0 7px; color: var(--bt); background: rgba(255,255,255,.62); }
    .banner .r.pill { color: color-mix(in srgb, var(--c) 60%, #10283f); background: rgba(255,255,255,.78); }
    .banner.night .r { background: rgba(10,20,40,.4); }
    .banner.night .r.pill { color: color-mix(in srgb, var(--c) 45%, #fff); background: rgba(10,20,40,.55); }
    .banner .ringb { position: absolute; inset: 0; }
    @media (prefers-reduced-motion: reduce) { .banner .pl { animation: none; } }
    /* A narrow card crops the room from the left: the washing machine goes rather than be cut in half. */
    @container (max-width: 360px) { .banner .wm { display: none; } }
    /* The readings under the banner: the showers left and their drops, then the litres at 40 °C and the note. */
    :host { --wh-drop-off: rgba(127,127,127,.25); }
    .sc.shw { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 4px 10px; padding: 10px 12px;
              border-radius: 12px; background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    .sb { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
    .sb b { font-size: 24px; font-weight: 500; line-height: 1.1; color: var(--primary-text-color); white-space: nowrap; }
    .sb span { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dr { display: flex; gap: 2px; }
    .dr svg { width: 15px; height: 15px; }
    .sl2 { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 2px 10px; font-size: 13px; min-width: 0; }
    .sn { color: var(--secondary-text-color); }
    .nt { font-weight: 500; color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color, #212121)); overflow-wrap: anywhere; }
    /* Cost and heating (#107): a section title and its period tabs, the cost of a m³ of hot water, three tiles, then
       today's heating on a 24 h strip with the off-peak hours behind. */
    .csh { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px 8px; margin-top: 14px; }
    .cst { font-size: 14px; font-weight: 500; color: var(--primary-text-color); }
    .cxs { font-size: 12px; color: var(--secondary-text-color); }
    .pseg button { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; min-height: 36px; padding: 0 11px;
                   border-radius: 999px; font-size: 13px; font-weight: 500; color: var(--primary-text-color); }
    .pseg button:hover:not(.on) { background: color-mix(in srgb, var(--c) 10%, transparent); }
    .pseg button.on { color: color-mix(in srgb, var(--c) 50%, var(--primary-text-color, #212121)); background: color-mix(in srgb, var(--c) 16%, transparent); }
    .pseg button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .cwait { text-align: center; }
    .cpm { display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px 10px; margin-top: 10px; padding: 10px 12px; border-radius: 12px;
           background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    .cpm b { font-size: 26px; font-weight: 500; line-height: 1.15; color: var(--primary-text-color); white-space: nowrap; }
    .cpm span { font-size: 13px; color: var(--secondary-text-color); }
    .cpm .cpd { margin-left: auto; font-size: 12px; font-weight: 500; }
    .cpm .cpd.dn { color: color-mix(in srgb, var(--rc-ok) 70%, var(--primary-text-color, #212121)); }
    .cpm .cpd.up { color: color-mix(in srgb, var(--wh-heating) 65%, var(--primary-text-color, #212121)); }
    .cgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 8px; }
    .cgrid .ce .xh { color: var(--wh-heating); }
    .cgrid .cw .xh { color: var(--wh-water); }
    .cgrid .cs .xh { color: var(--rc-idle); }
    .cx { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    :host { --wh-water: #3b7fd4; --wh-off-peak: #4c6ef5; }
    .tl { position: relative; height: 30px; margin-top: 8px; border-radius: 8px; overflow: hidden; background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    .tl i { position: absolute; top: 0; bottom: 0; }
    .tl .hc { background: color-mix(in srgb, var(--wh-off-peak) 18%, transparent); }
    .tl .run, .tl .pk { top: 7px; bottom: 7px; min-width: 3px; border-radius: 4px; background: var(--wh-heating); }
    .tl .pk { background: var(--rc-alert); }
    .tk { position: relative; height: 15px; margin-top: 3px; font-size: 11px; color: var(--secondary-text-color); }
    .tk span { position: absolute; top: 0; white-space: nowrap; }
    .tk span + span { transform: translateX(-50%); }
    .lg { display: flex; flex-wrap: wrap; gap: 4px 12px; margin-top: 2px; font-size: 12px; color: var(--secondary-text-color); }
    .lg span::before { content: ""; display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
    .lg .off::before { background: color-mix(in srgb, var(--wh-off-peak) 40%, transparent); }
    .lg .run::before { background: var(--wh-heating); }
    .lg .pk::before { background: var(--rc-alert); }
    @container (max-width: 300px) {
      .cgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .cgrid > :nth-child(3):last-child { grid-column: 1 / -1; }
    }
  `;
}
