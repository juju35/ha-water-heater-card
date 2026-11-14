// A mock Home Assistant with one water heater (Atlantic-like, heat pump: water_heater entity with its modes, target and
// away mode, a power and a daily energy sensor, a hot-water volume at 40 °C, a boost switch, an error sensor) in the
// utility room, and a cumulus driven by a smart plug with a temperature probe.
export const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: "2026-01-01T00:00:00Z" });

export const makeHass = ({ mode = "auto", temp = 54, target = 55, away = "off", power = "620", error = "No error", boost = "off", relay = "on", ...overrides } = {}) => {
  const heater = [
    "water_heater.explorer",
    "sensor.explorer_power",
    "sensor.explorer_energy_today",
    "sensor.explorer_v40_water_volume",
    "switch.explorer_boost",
    "sensor.explorer_error",
    "sensor.explorer_outdoor_temperature",
  ];
  return {
    language: "en",
    locale: { language: "en" },
    config: { unit_system: { temperature: "°C" } },
    themes: { darkMode: false },
    areas: { utility: { area_id: "utility", name: "Utility room" } },
    devices: {
      explorer: { area_id: "utility", name: "Water heater", model: "Explorer v4" },
      plug: { area_id: "utility", name: "Cumulus plug" },
    },
    entities: {
      ...Object.fromEntries(heater.map((id) => [id, { device_id: "explorer", platform: "overkiz" }])),
      "switch.cumulus": { device_id: "plug", platform: "shelly" },
      "sensor.cumulus_power": { device_id: "plug", platform: "shelly" },
    },
    states: {
      "water_heater.explorer": st("water_heater.explorer", mode, {
        friendly_name: "Water heater",
        operation_mode: mode,
        operation_list: ["eco", "auto", "boost", "off"],
        current_temperature: temp,
        temperature: target,
        min_temp: 50,
        max_temp: 62,
        target_temp_step: 1,
        away_mode: away,
      }),
      "sensor.explorer_power": st("sensor.explorer_power", power, { device_class: "power", unit_of_measurement: "W" }),
      "sensor.explorer_energy_today": st("sensor.explorer_energy_today", "2.1", { device_class: "energy", unit_of_measurement: "kWh", friendly_name: "Water heater Energy today" }),
      "sensor.explorer_v40_water_volume": st("sensor.explorer_v40_water_volume", "186", { unit_of_measurement: "L", friendly_name: "Water heater V40 water volume estimation" }),
      "switch.explorer_boost": st("switch.explorer_boost", boost, { friendly_name: "Water heater Boost" }),
      "sensor.explorer_error": st("sensor.explorer_error", error, { friendly_name: "Water heater Error" }),
      "sensor.explorer_outdoor_temperature": st("sensor.explorer_outdoor_temperature", "9", { device_class: "temperature", unit_of_measurement: "°C", friendly_name: "Water heater Outdoor temperature" }),
      "switch.cumulus": st("switch.cumulus", relay, { friendly_name: "Cumulus" }),
      "sensor.cumulus_power": st("sensor.cumulus_power", relay === "on" ? "2400" : "0", { device_class: "power", unit_of_measurement: "W" }),
      "sensor.cumulus_temperature": st("sensor.cumulus_temperature", "48", { device_class: "temperature", unit_of_measurement: "°C" }),
      "sensor.tariff": st("sensor.tariff", "Off-peak", { friendly_name: "Tariff" }),
    },
    calls: [],
    callService(domain, service, data) {
      this.calls.push([domain, service, data]);
    },
    ...overrides,
  };
};
