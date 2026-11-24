// ── Cost and heating (#107) ──────────────────────────────────────────────────
// The cost section reads the long-term statistics of a dedicated electricity meter (kWh) and a hot-water meter (m³),
// day by day; the heating strip reads today's history of what tells the tank heats, and of the tariff.
import { whNorm } from "./water-heater.js";

export const WH_PERIODS = ["day", "week", "month", "year"];
// How often the statistics and the history are read again (ms).
export const WH_REFRESH = 5 * 60 * 1000;
// A day with less hot water than this (m³, 1 L) is a standby day: its energy only kept the water hot.
export const WH_STANDBY_M3 = 0.001;

// The start of the period holding `now`, and of the one before. `monday`: weeks start on Monday (else Sunday).
export const whPeriodStart = (period, now, monday = true) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "day") return [d, new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)];
  if (period === "week") {
    const back = (d.getDay() + (monday ? 6 : 7)) % 7;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
    return [start, new Date(start.getFullYear(), start.getMonth(), start.getDate() - 7)];
  }
  if (period === "year") return [new Date(d.getFullYear(), 0, 1), new Date(d.getFullYear() - 1, 0, 1)];
  return [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() - 1, 1)];
};

// An off-peak state of a tariff sensor: `on` for a binary sensor, else its name (HC, off-peak, heures creuses…).
export const WH_OFF_PEAK = /(^|[^a-z])(hc|off_?peak|offpeak|creuses?|low|nt|niedertarif|valle|nacht|night|nuit|dal)([^a-z]|$)/;
export const whOffPeak = (id, state) => (id.startsWith("binary_sensor.") ? state === "on" : WH_OFF_PEAK.test(whNorm(state)));

// The spans (ms) during which `test(state)` holds, from a compressed history (`s`, `lu` in seconds), until `end`.
export const whSpans = (rows, test, end) => {
  const out = [];
  let from = null;
  for (const r of rows || []) {
    const t = (r.lu ?? r.lc) * 1000;
    const on = test(r.s);
    if (on && from == null) from = t;
    else if (!on && from != null) {
      out.push([from, t]);
      from = null;
    }
  }
  if (from != null) out.push([from, end]);
  return out;
};

// The parts of span `[a, b]` outside every span of `cover`.
export const whOutside = ([a, b], cover) => {
  let parts = [[a, b]];
  for (const [c, d] of cover)
    parts = parts.flatMap(([x, y]) =>
      d <= x || c >= y
        ? [[x, y]]
        : [
            [x, c],
            [d, y],
          ].filter(([p, q]) => q > p),
    );
  return parts;
};

// One period's figures from daily statistics rows: kWh, m³, their costs at each day's mean price (else `now`), and
// the standby days (energy but no hot water).
export const whTally = (rows, priceE, priceW) => {
  const t = { kwh: 0, m3: 0, eCost: 0, wCost: 0, standbyKwh: 0, standbyCost: 0, standbyDays: 0, days: 0 };
  for (const r of rows) {
    const e = Math.max(0, r.e ?? 0);
    const w = Math.max(0, r.w ?? 0);
    const pe = r.pe ?? priceE;
    const pw = r.pw ?? priceW;
    t.days += r.e != null || r.w != null ? 1 : 0;
    t.kwh += e;
    t.m3 += w;
    t.eCost += pe != null ? e * pe : 0;
    t.wCost += pw != null ? w * pw : 0;
    if (r.w != null && r.e != null && w < WH_STANDBY_M3 && e > 0) {
      t.standbyDays += 1;
      t.standbyKwh += e;
      t.standbyCost += pe != null ? e * pe : 0;
    }
  }
  // The cost of a m³ of hot water: its electricity and its cold water, over the water drawn.
  const metered = rows.some((r) => r.e != null);
  t.perM3 = metered && t.m3 >= WH_STANDBY_M3 && priceE != null && priceW != null ? (t.eCost + t.wCost) / t.m3 : null;
  return t;
};
