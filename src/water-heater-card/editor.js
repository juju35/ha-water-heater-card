// ── Editor ───────────────────────────────────────────────────────────────────
import { WaterHeaterCard } from "./card.js";

export const whSchema = (booleans) => (lang) => [
  { name: "entity", selector: { entity: { domain: ["water_heater", "switch", "input_boolean", "sensor"] } } },
  { name: "title", selector: { text: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  { name: "temperature", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
  { name: "capacity", selector: { number: { min: 10, max: 1000, step: 10, mode: "box", unit_of_measurement: "L" } } },
  { name: "shower_volume", selector: { number: { min: 10, max: 200, step: 5, mode: "box", unit_of_measurement: "L" } } },
  { name: "tariff", selector: { entity: {} } },
  ...rcBooleans(...booleans),
  {
    name: "cost",
    type: "expandable",
    flatten: true,
    schema: [
      { name: "energy_meter", selector: { entity: { domain: "sensor", device_class: "energy" } } },
      { name: "water_meter", selector: { entity: { domain: "sensor", device_class: "water" } } },
      { name: "energy_price", selector: { number: { min: 0, step: 0.0001, mode: "box" } } },
      { name: "energy_price_entity", selector: { entity: {} } },
      { name: "water_price", selector: { number: { min: 0, step: 0.01, mode: "box" } } },
      { name: "water_price_entity", selector: { entity: {} } },
      {
        name: "cost_period",
        selector: { select: { mode: "dropdown", options: WH_PERIODS.map((value) => ({ value, label: rcT(WH_I18N, lang, `p_${value}`) })) } },
      },
      ...rcBooleans("show_cost", "show_timeline"),
    ],
  },
  {
    name: "illustration_theme",
    selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: rcT(WH_I18N, lang, `ed_theme_${value}`) })) } },
  },
  ...rcAdvanced(WH_I18N, lang, "entities", "language"),
];

export const WH_HELPERS = ["entity", "title", "temperature", "capacity", "shower_volume", "tariff", "energy_meter", "water_meter", "energy_price", "water_price", "show_timeline", "zoom", "entities", "language"];

export const WaterHeaterCardEditor = rcEditor({
  card: WaterHeaterCard,
  helpers: WH_HELPERS,
  schema: whSchema(["show_title", "show_subtitle", "illustration", "show_scene", "animations", "show_controls"]),
});

rcRegister(
  WaterHeaterCard,
  WaterHeaterCardEditor,
  "Water Heater Card",
  "A water heater, illustrated: the tank and its hot water, showers left, temperature, mode, boost, away and target",
);
