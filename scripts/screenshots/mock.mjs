// The mock home of the screenshots and animations: a heat-pump water heater in the utility room (Atlantic-like, with
// its modes, target, away mode, power, daily energy and hot-water volume at 40 °C), and a cumulus on a smart plug.
const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: new Date().toISOString() });

// `scene`: heating, ready, boost, away (until a date), error, relay (a cumulus on a plug, heating at off-peak), pv (a
// cumulus driven by a PV router: its meter's power as the entity, today's energy split grid / solar).
const SCENES = {
  heating: { mode: "auto", temp: 54, target: 55, power: "620", today: "2.1", litres: "186", away: "off", error: "No error" },
  ready: { mode: "eco", temp: 55, target: 55, power: "0", today: "3.4", litres: "240", away: "off", error: "No error" },
  boost: { mode: "boost", temp: 58, target: 62, power: "2450", today: "4.0", litres: "220", away: "off", error: "No error" },
  away: { mode: "eco", temp: 41, target: 55, power: "0", today: "0.2", litres: "70", away: "on", error: "No error" },
  error: { mode: "auto", temp: 38, target: 55, power: "0", today: "0.3", litres: "60", away: "off", error: "E21 · Upper probe fault" },
};

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
      "sensor.tank_power": st("sensor.tank_power", "1340", { device_class: "power", unit_of_measurement: "W", friendly_name: "Water heater" }),
      "sensor.tank_grid_energy_today": kwh("sensor.tank_grid_energy_today", "1.56", "Water heater grid energy today"),
      "sensor.tank_solar_energy_today": kwh("sensor.tank_solar_energy_today", "0.84", "Water heater solar energy today"),
      "sensor.tank_temperature": st("sensor.tank_temperature", "51", { device_class: "temperature", unit_of_measurement: "°C" }),
      "sensor.tariff": st("sensor.tariff", "Peak", { friendly_name: "Tariff" }),
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
  return {
    hass: { ...base, ...theme, states, entities, devices: { explorer: { area_id: "utility", name: "Water heater", model: "Explorer v4" } } },
    config: { entity: "water_heater.explorer", ...s.config },
    open: s.open,
  };
};
