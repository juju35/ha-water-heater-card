// ── Water heater ─────────────────────────────────────────────────────────────
// A water heater is a `water_heater` entity (its mode, temperature and target) or the switch of a tank driven by a relay
// (a smart plug, a contactor) with a temperature sensor. The other entities of its device complete it, found by what
// they are (device class, unit, domain) and, when that is not enough, by their name. `entities` overrides any role.
// The state is brought down to: heating, ready, boost, away, off, error; `offline` when the water heater cannot report.
import { rcPerRegistry } from "./core.js";

// A water heater by name, for the switches of a relay.
export const WH_NAME = /cumulus|chauffe.?eau|water.?heater|ballon|boiler|warm.?wasser|ecs|hot.?water|geyser|scaldabagno|calentador|termo/i;
// The modes that are a boost, an absence or a heat pump.
// `high_demand` is a lasting mode of the core integrations (EcoNet, A. O. Smith), not a boost.
export const WH_BOOST = /(boost|turbo|rapid|fast|schnell)/;
export const WH_AWAY = /(away|vacation|holiday|absence|abwesen|urlaub|frost|hors_gel)/;
export const WH_HEAT_PUMP = /heat.?pump|heatpump|hybrid|thermodynam|explorer|aquarea|nuos|lydos.?hybrid|calypso|wwk|wpl|aerotop|pac\b/i;

export const whNorm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "_");
export const whLabel = (hass, id) => `${id} ${hass.states[id]?.attributes.friendly_name || ""}`;
export const whNum = (st) => {
  const v = Number.parseFloat(st?.state);
  return Number.isFinite(v) ? v : null;
};
// A power in W, an energy in kWh, whatever the sensor's unit.
export const whWatts = (st) => {
  const v = whNum(st);
  if (v == null) return null;
  const u = st.attributes.unit_of_measurement;
  return u === "kW" ? v * 1000 : u === "MW" ? v * 1e6 : v;
};
export const whKwh = (st) => {
  const v = whNum(st);
  if (v == null) return null;
  const u = st.attributes.unit_of_measurement;
  return u === "Wh" ? v / 1000 : u === "MWh" ? v * 1000 : v;
};
// The device of an entity, from the registry.
export const whDeviceOf = (hass, id) => hass.entities?.[id]?.device_id;
// Every entity of each device, in registry order.
export const whDeviceEntities = rcPerRegistry((hass) => {
  const out = {};
  for (const [id, r] of Object.entries(hass.entities || {})) if (r.device_id && !r.hidden) (out[r.device_id] ||= []).push(id);
  return out;
});

// The water heaters of the home, most likely first: water_heater entities, then the switches named like a water heater
// (not the boost or away switch of a water_heater's device).
export const whHeaters = (hass) => {
  const ids = Object.keys(hass.states || {});
  const heaters = ids.filter((id) => id.startsWith("water_heater."));
  const taken = new Set(heaters.map((id) => whDeviceOf(hass, id)).filter(Boolean));
  const relay = (id) =>
    /^(switch|input_boolean)\./.test(id) && WH_NAME.test(whLabel(hass, id)) && !taken.has(whDeviceOf(hass, id)) && !/boost|away|absence|holiday|vacation/i.test(whLabel(hass, id));
  return [...heaters, ...ids.filter(relay)];
};

// The entity of each role on the water heater's device: temperature (the water's), inlet (the cold water's), level
// (hot water in %), litres (hot water at 40 °C), showers, power, energy, heating (the element or the heat pump running),
// boost, away (switches), away_end (the end of an absence), error.
export const WH_ROLES = ["temperature", "inlet", "level", "litres", "showers", "power", "energy", "energy_grid", "energy_solar", "heating", "boost", "away", "away_end", "error"];
export const whFind = (hass, entity, overrides = {}) => {
  const device = entity && whDeviceOf(hass, entity);
  const ids = (device ? whDeviceEntities(hass)[device] : null) || [];
  const st = (id) => hass.states[id];
  const dom = (id) => id.split(".")[0];
  const dc = (id) => st(id)?.attributes.device_class;
  const unit = (id) => st(id)?.attributes.unit_of_measurement;
  const named = (id, re) => re.test(whLabel(hass, id));
  const num = (id) => whNum(st(id)) != null;
  const pick = (test, prefer) => {
    const all = ids.filter((id) => id !== entity && st(id) && test(id));
    return (prefer && all.find(prefer)) || all[0];
  };
  // A "bottom" probe is hot water (Overkiz, ViCare): not the cold inlet.
  const COLD = /inlet|cold|froid|kalt|entr[ée]e|zulauf/i;
  const AIR = /outdoor|outside|ambient|air|ext[ée]rieur|room|pi[eè]ce|au[sß]en|cpu|board|compressor|evaporat|device|internal|chip|relay/i;
  const HOT = /hot.?water|eau.?chaude|v40|mixed|warm.?wasser|available|disponible|remaining|restant|reserve|r[ée]serve|acqua.?calda|agua.?caliente/i;
  const r = {};
  // Diagnostic sensors (a smart plug's own temperature) are left out.
  const temps = ids.filter((id) => id !== entity && dom(id) === "sensor" && dc(id) === "temperature" && st(id) && !hass.entities?.[id]?.entity_category);
  r.temperature = temps.find((id) => !COLD.test(whLabel(hass, id)) && !AIR.test(whLabel(hass, id)));
  r.inlet = temps.find((id) => COLD.test(whLabel(hass, id)) && !AIR.test(whLabel(hass, id)));
  r.level = pick((id) => dom(id) === "sensor" && unit(id) === "%" && num(id) && !dc(id) && named(id, new RegExp(`${HOT.source}|level|niveau|fill|charge`, "i")));
  r.litres = pick((id) => dom(id) === "sensor" && ["L", "l"].includes(unit(id)) && num(id), (id) => named(id, HOT));
  r.showers = pick((id) => dom(id) === "sensor" && num(id) && named(id, /shower|douche|dusch|doccia|ducha/i));
  r.power = pick((id) => dom(id) === "sensor" && dc(id) === "power");
  const energy = ids.filter((id) => id !== entity && dom(id) === "sensor" && dc(id) === "energy" && st(id));
  r.energy = energy.find((id) => named(id, /today|daily|day|jour|heute|oggi|hoy/i)) || energy[0];
  // PV-routed tanks: the grid (off-peak forcing) and the solar surplus split of today's energy, by name.
  r.energy_solar = energy.find((id) => named(id, /solar|solaire|\bpv\b|surplus|photovolta|routed|divert/i));
  r.energy_grid = energy.find((id) => id !== r.energy_solar && named(id, /grid|r[ée]seau|network|mains|import|forc|hc\b|heures?.?creuses/i));
  r.heating = pick(
    (id) => dom(id) === "binary_sensor" && (["heat", "running", "power"].includes(dc(id)) || named(id, /heat|chauff|running|element|r[ée]sistance|resistor|compressor|heiz/i)),
  );
  r.boost = pick((id) => dom(id) === "switch" && named(id, /boost/i));
  r.away = pick((id) => dom(id) === "switch" && named(id, WH_AWAY));
  r.away_end = pick((id) => (dom(id) === "datetime" || (dom(id) === "sensor" && dc(id) === "timestamp")) && named(id, /away|absence|holiday|vacation|urlaub|abwesen|end|fin|until|retour|return/i));
  r.error = pick((id) => (dom(id) === "sensor" && !num(id) && named(id, /error|fault|erreur|d[ée]faut|fehler|alarm/i)) || (dom(id) === "binary_sensor" && dc(id) === "problem"));
  for (const role of WH_ROLES) if (overrides[role]) r[role] = overrides[role];
  return r;
};

// The Intl formats, made once per language and options (a render formats many numbers).
export const whIntlCache = new Map();
export const whIntl = (Kind, lang, opts) => {
  const key = `${Kind.name}|${lang}|${JSON.stringify(opts)}`;
  let f = whIntlCache.get(key);
  if (!f) whIntlCache.set(key, (f = new Kind(lang, opts)));
  return f;
};

// A temperature in °C, whatever the unit.
export const whCelsius = (v, unit) => (v == null ? null : /F/.test(unit || "") ? ((v - 32) * 5) / 9 : v);

// The hot water: the share of the tank that is hot (0–1), the volume at 40 °C and the showers, from what the
// integration reports, else estimated from the water's temperature with a mixing model: hot water at T (above 40 °C)
// makes capacity × (T − cold) / (40 − cold) litres at 40 °C; the share is that volume against the tank at its target.
export const whHotWater = ({ level, litres, showers, temp, target, cold = 15, capacity = 200, shower = 50 }) => {
  // A cold water at 35 °C or more is a misread probe: back to 15 °C, so that 40 − cold stays a real span.
  const c = cold != null && cold < 35 ? cold : 15;
  const at40 = (t) => (t > 40 ? (capacity * (t - c)) / (40 - c) : 0);
  const full = at40(target != null && target > 40 ? target : 55);
  const l40 = litres ?? (temp != null ? at40(temp) : null);
  const share = level != null ? level / 100 : l40 != null && full > 0 ? l40 / full : null;
  return {
    share: share == null ? null : Math.max(0, Math.min(1, share)),
    litres: l40 == null ? null : Math.round(l40 / 5) * 5,
    showers: showers ?? (l40 == null ? null : Math.floor(l40 / shower)),
  };
};

// Strings of the water heater cards; the shared ones above (unavailable, editor basics) complete them.
