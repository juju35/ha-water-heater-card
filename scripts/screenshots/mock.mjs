// The mock home of the screenshots and animations: a heat-pump water heater in the utility room (Atlantic-like, with
// its modes, target, away mode, power, daily energy and hot-water volume at 40 °C), and a cumulus on a smart plug.
const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: new Date().toISOString() });

// `scene`: heating, ready, boost, away (until a date), error, relay (a cumulus on a plug, heating at off-peak), pv (a
// cumulus driven by a PV router: its meter's power as the entity, today's energy split grid / solar; `night`: forced at
// off-peak by the grid, under the moon). The `pv` dark twin keeps `illustration_theme: auto`: as in Home Assistant, the
// dark theme darkens the room, while the panel's sun and the running current (the real sun) still show solar heating.
const SCENES = {
  heating: { mode: "auto", temp: 54, target: 55, power: "620", today: "2.1", litres: "186", away: "off", error: "No error" },
  ready: { mode: "eco", temp: 55, target: 55, power: "0", today: "3.4", litres: "240", away: "off", error: "No error" },
  boost: { mode: "boost", temp: 58, target: 62, power: "2450", today: "4.0", litres: "220", away: "off", error: "No error" },
  away: { mode: "eco", temp: 41, target: 55, power: "0", today: "0.2", litres: "70", away: "on", error: "No error" },
  error: { mode: "auto", temp: 38, target: 55, power: "0", today: "0.3", litres: "60", away: "off", error: "E21 · Upper probe fault" },
};

export const COST_CONFIG = { energy_meter: "sensor.tank_energy", water_meter: "sensor.hot_water", energy_price: 0.1696, water_price: 4.2, tariff: "sensor.tariff" };

// The recorder of the cost scene (window.__ws, the card's hass.callWS): daily statistics for this month and the one
// before (16 days with hot water and 4 standby days, 58 kWh and 3.6 m³ this month), and today's history from midnight:
// heating 02:10 → 04:05 and 13:40 → 14:20 at off-peak, 18:05 → 18:20 at the peak rate; off-peak 01:30 → 07:30 and
// 12:30 → 14:30. The same picture whatever the day.
export const COST_WS = `window.__ws = async (msg) => {
  const now = new Date();
  const H = 3600e3, D = 24 * H;
  const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const before = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (msg.type === "recorder/statistics_during_period") {
    const days = (from, hot, idle, e, w) => [...Array(hot + idle)].map((_, i) => ({ start: from + i * D, e: i < hot ? e : 0.8, w: i < hot ? w : 0 }));
    const rows = [...days(before, 26, 4, 2.6, 0.15), ...days(month, 16, 4, 3.425, 0.225)];
    return { "sensor.tank_energy": rows.map((r) => ({ start: r.start, change: r.e })), "sensor.hot_water": rows.map((r) => ({ start: r.start, change: r.w })) };
  }
  const at = (h, m = 0) => (midnight + h * H + m * 60e3) / 1000;
  return {
    "sensor.explorer_power": [{ s: "0", lu: at(0) }, { s: "620", lu: at(2, 10) }, { s: "0", lu: at(4, 5) }, { s: "620", lu: at(13, 40) }, { s: "0", lu: at(14, 20) }, { s: "620", lu: at(18, 5) }, { s: "0", lu: at(18, 20) }],
    "sensor.tariff": [{ s: "Peak", lu: at(0) }, { s: "Off-peak", lu: at(1, 30) }, { s: "Peak", lu: at(7, 30) }, { s: "Off-peak", lu: at(12, 30) }, { s: "Peak", lu: at(14, 30) }],
  };
};`;

export const setup = (s) => {
  const theme = { themes: { darkMode: s.theme === "dark" } };
  const base = { language: "en", locale: { language: "en" }, config: { unit_system: { temperature: "°C" } }, areas: { utility: { area_id: "utility", name: "Utility room" } } };
  if (s.scene === "relay") {
    const states = {
      "switch.cumulus": st("switch.cumulus", "on", { friendly_name: "Cumulus" }),
      "sensor.cumulus_power": st("sensor.cumulus_power", "2400", { device_class: "power", unit_of_measurement: "W" }),
      "sensor.cumulus_energy": st("sensor.cumulus_energy", "1.8", { device_class: "energy", unit_of_measurement: "kWh", friendly_name: "Cumulus Energy today" }),
      "sensor.cumulus_temperature": st("sensor.cumulus_temperature", "48", { device_class: "temperature", unit_of_measurement: "°C" }),
      "sensor.tariff": st("sensor.tariff", "Off-peak", { friendly_name: "Tariff" }),
    };
    const entities = Object.fromEntries(Object.keys(states).filter((id) => id.includes("cumulus")).map((id) => [id, { entity_id: id, device_id: "plug", platform: "shelly" }]));
    return {
      hass: { ...base, ...theme, states, entities, devices: { plug: { area_id: "utility", name: "Cumulus", model: "Shelly Plus 1PM" } } },
      config: { entity: "switch.cumulus", temperature: "sensor.cumulus_temperature", tariff: "sensor.tariff", capacity: 200, ...s.config },
      open: s.open,
    };
  }
  if (s.scene === "pv") {
    const kwh = (id, v, name) => st(id, v, { device_class: "energy", unit_of_measurement: "kWh", friendly_name: name });
    const states = {
      "sun.sun": st("sun.sun", s.night ? "below_horizon" : "above_horizon", { friendly_name: "Sun" }),
      "sensor.tank_power": st("sensor.tank_power", s.night ? "2400" : "1340", { device_class: "power", unit_of_measurement: "W", friendly_name: "Water heater" }),
      "sensor.tank_grid_energy_today": kwh("sensor.tank_grid_energy_today", "1.56", "Water heater grid energy today"),
      "sensor.tank_solar_energy_today": kwh("sensor.tank_solar_energy_today", "0.84", "Water heater solar energy today"),
      "sensor.tank_temperature": st("sensor.tank_temperature", "51", { device_class: "temperature", unit_of_measurement: "°C" }),
      "sensor.tariff": st("sensor.tariff", s.night ? "Off-peak" : "Peak", { friendly_name: "Tariff" }),
    };
    const entities = Object.fromEntries(Object.keys(states).filter((id) => id.startsWith("sensor.tank")).map((id) => [id, { entity_id: id, device_id: "meter", platform: "modbus" }]));
    return {
      hass: { ...base, ...theme, states, entities, devices: { meter: { area_id: "utility", name: "Water heater", model: "PV router" } } },
      config: { entity: "sensor.tank_power", temperature: "sensor.tank_temperature", tariff: "sensor.tariff", capacity: 200, ...s.config },
      open: s.open,
    };
  }
  const v = SCENES[s.scene];
  const states = {
    "water_heater.explorer": st("water_heater.explorer", v.mode, {
      friendly_name: "Water heater",
      operation_mode: v.mode,
      operation_list: ["eco", "auto", "boost", "off"],
      current_temperature: v.temp,
      temperature: v.target,
      min_temp: 50,
      max_temp: 62,
      target_temp_step: 1,
      away_mode: v.away,
    }),
    "sensor.explorer_power": st("sensor.explorer_power", v.power, { device_class: "power", unit_of_measurement: "W" }),
    "sensor.explorer_energy_today": st("sensor.explorer_energy_today", v.today, { device_class: "energy", unit_of_measurement: "kWh", friendly_name: "Water heater Energy today" }),
    "sensor.explorer_v40": st("sensor.explorer_v40", v.litres, { unit_of_measurement: "L", friendly_name: "Water heater V40 water volume estimation" }),
    "sensor.explorer_error": st("sensor.explorer_error", v.error, { friendly_name: "Water heater Error" }),
    "sensor.explorer_away_end": st("sensor.explorer_away_end", v.away === "on" ? "2026-11-21T18:00:00+00:00" : "unknown", { device_class: "timestamp", friendly_name: "Water heater Away mode end" }),
  };
  const entities = Object.fromEntries(Object.keys(states).map((id) => [id, { entity_id: id, device_id: "explorer", platform: "overkiz" }]));
  // The cost scene: the tank's own meters (outside its device), fixed prices and an off-peak / peak sensor.
  if (s.cost) {
    states["sensor.tariff"] = st("sensor.tariff", "Peak", { friendly_name: "Tariff" });
  }
  return {
    hass: { ...base, ...theme, states, entities, devices: { explorer: { area_id: "utility", name: "Water heater", model: "Explorer v4" } } },
    config: { entity: "water_heater.explorer", ...s.config, ...(s.cost ? COST_CONFIG : {}) },
    open: s.open,
  };
};
