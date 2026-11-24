/**
 * water-heater-card / water-heater-mini-card: a water heater, illustrated. The tank with its hot water above the cold,
 * the showers left and the litres at 40 °C; the readings in three tiles; the modes, boost, away and the target.
 * https://github.com/juju35/ha-water-heater-card
 */

// Colour of each state: on the badge, the pill, the halo and the drops.
export const WH_ACCENTS = { heating: "#e8590c", ready: "#2e9d5a", boost: "#d6336c", away: "#7b8794", off: "#9aa3ae", error: "#e5484d", offline: "#9aa3ae" };
export const WH_ICONS = {
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
export const WH_LOOP = 3.6;
export const WH_DROP = "M12 3c-3.5 4.5-6 7.6-6 10.5a6 6 0 0 0 12 0C18 10.6 15.5 7.5 12 3z";

// The illustration: the wall and the floor, the tank on its feet with its two pipes, the heat pump on top (when it has
// one), the water inside, hot above cold, the boundary at the share of hot water; bubbles rise and the element glows while
// it heats. Beside it, a glass panel with the showers left, the litres at 40 °C and a note.
// `bare`: the tank alone (no wall, floor, panel nor level), as a nested <svg> placed in the banner's 200 × 80 room,
// standing on its floor with its centre at `bare.cx`.
export const whScene = ({ state, dark, uid, share, temp, big, label, drops, litres, note, heatPump, solar, night, animate, bare }) => {
  const acc = WH_ACCENTS[state];
  const heats = state === "heating" || state === "boost";
  const moving = animate && heats;
  const W = dark ? ["#262a30", "#1d2025", "#17191d"] : ["#f7f9fc", "#e8ecf2", "#dfe4eb"];
  const body = dark ? ["#4a515b", "#30353c", "#666e79"] : ["#fbfcfe", "#dfe4ea", "#b9c1cb"];
  const txt = dark ? "#f0f0f0" : "#1f2329";
  const mut = dark ? "#a0a6ae" : "#5c6470";
  const pale = state === "away" || state === "off" || state === "offline" || state === "error";
  // No reading at all: an empty grey tank, not a made-up half.
  const unknown = share == null;
  const greyTank = dark ? ["#3d444e", "#353b44"] : ["#e3e7ec", "#d5dae1"];
  const hot = unknown ? greyTank : pale ? ["#d98a6a", "#e9b79b"] : ["#f2622e", "#ffa25e"];
  const cold = unknown ? greyTank : pale ? ["#9fc3e3", "#7ea5cc"] : ["#7cbcf0", "#3b7fd4"];
  const s = unknown ? 1 : share;
  const ink = dark ? whMix(acc, "#f0f0f0", 0.6) : whMix(acc, "#1f2329", 0.55);
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
  // A PV-routed tank: its solar panel on a stand to the left, the cable to the element. While it heats by day, the sun
  // turns and the current runs along the cable; by night the moon, and no current: the off-peak forcing is the grid's.
  const pv = solar
    ? (() => {
        const flow = heats && !night;
        const sunC = "#f59f00";
        const frame = body[2];
        const cy = y + h - 24;
        const rays = [0, 1, 2, 3, 4, 5, 6, 7]
          .map((k) => `<path d="M38 ${30 - 12}v-4" transform="rotate(${k * 45} 38 30)"/>`)
          .join("");
        // The rays repeat every 45°: a turn of 45° per loop is seamless.
        const spin = moving && flow ? `<animateTransform attributeName="transform" type="rotate" from="0 38 30" to="45 38 30" dur="${WH_LOOP}s" repeatCount="indefinite"/>` : "";
        const sky = night
          ? `<circle cx="38" cy="30" r="9" fill="${dark ? "#8c96a3" : "#b9c1cb"}"/><circle cx="43" cy="26" r="8" fill="${W[0]}"/>`
          : `<circle cx="38" cy="30" r="7.5" fill="${sunC}"${flow ? "" : ' opacity=".55"'}/><g stroke="${sunC}" stroke-width="2" stroke-linecap="round"${flow ? "" : ' opacity=".55"'}>${rays}${spin}</g>`;
        // The cells: a dark blue sheet with a fine grid (4 × 6), the way a PV panel reads, not a window.
        const grid = [1, 2, 3].map((k) => `M${15 + k * 11.5} 59v68`).concat([1, 2, 3, 4, 5].map((k) => `M15 ${59 + k * 11.33}h46`)).join("");
        const cells = `<rect x="15" y="59" width="46" height="68" rx="1" fill="url(#pv${uid})"/><path d="${grid}" stroke="#fff" stroke-opacity="${dark ? 0.14 : 0.22}" stroke-width=".7"/>`;
        const shine = `<path d="M15 59h26l-26 30z" fill="#fff" opacity="${dark ? 0.05 : 0.1}"/>`;
        const run = moving && flow ? `<animate attributeName="stroke-dashoffset" from="8" to="0" dur="${WH_LOOP / 3}s" repeatCount="indefinite"/>` : "";
        const cable = flow
          ? `<path d="M64 100 H71 V${cy} H${x + 3}" fill="none" stroke="${sunC}" stroke-width="2.5" stroke-dasharray="4 4" stroke-linecap="round">${run}</path>`
          : `<path d="M64 100 H71 V${cy} H${x + 3}" fill="none" stroke="${mut}" stroke-width="2" stroke-linecap="round" opacity=".45"/>`;
        return `<g class="pv">${sky}
      <path d="M26 130 L22 170 M50 130 L54 170" stroke="${frame}" stroke-width="3" stroke-linecap="round"/>
      <g filter="url(#ds${uid})"><rect x="12" y="56" width="52" height="74" rx="3" fill="${body[1]}" stroke="${frame}"/>${cells}${shine}</g>
      ${cable}<circle cx="${x + 3}" cy="${cy}" r="2.6" fill="${flow ? sunC : mut}"/></g>`;
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
    `<path transform="translate(${228 + i * 17} ${88}) scale(.62)" d="${WH_DROP}" fill="${i < drops ? acc : dark ? "#3a414b" : "#dfe4ea"}"/>`;
  const panel = big
    ? `<g class="glass"><g filter="url(#ds${uid})"><rect x="214" y="34" width="196" height="124" rx="16" fill="${dark ? "rgba(20,22,26,.72)" : "rgba(255,255,255,.82)"}" stroke="${dark ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)"}"/></g>
    <text x="230" y="78" font-family="Roboto,sans-serif" font-size="34" font-weight="500" fill="${txt}">${rcEsc(big)}<tspan dx="6" font-size="13" font-weight="400" fill="${mut}">${rcEsc(label)}</tspan></text>
    ${[0, 1, 2, 3, 4].map(drop).join("")}
    ${litres ? `<text x="230" y="130" font-family="Roboto,sans-serif" font-size="12" fill="${mut}">${rcEsc(litres)}</text>` : ""}
    ${note ? `<text x="230" y="${litres ? 148 : 130}" font-family="Roboto,sans-serif" font-size="12" font-weight="500" fill="${ink}">${rcEsc(whClip(note, 28))}</text>` : ""}</g>`
    : note
      ? `<text class="glass" x="214" y="104" font-family="Roboto,sans-serif" font-size="13" font-weight="500" fill="${ink}">${rcEsc(whClip(note, 28))}</text>`
      : "";
  const level = share != null ? `<path d="M${x + w + 4} ${lvl} h10" stroke="${mut}" stroke-width="1.2"/><text x="${x + w + 18}" y="${lvl + 4}" font-family="Roboto,sans-serif" font-size="11" font-weight="500" fill="${mut}">${Math.round(share * 100)} %</text>` : "";
  const tempY = s > 0.25 ? iy + Math.min((ih * s) / 2 + (bare ? 7 : 5), ih * s - 3) : iy + 18;
  const aria = `role="img" aria-label="${rcEsc([temp, big && `${big} ${label}`, note].filter(Boolean).join(" · "))}"`;
  // The banner's tank: cropped to the tank (and its heat pump or solar panel), 78 high, its feet on the room's floor.
  const open = (() => {
    if (!bare) return `<svg class="scene" viewBox="0 0 430 200" ${aria}>`;
    const [vx, vy, vr, vb] = [solar ? 8 : 64, solar ? 14 : heatPump ? y - 40 : y - 4, 170, 174];
    const k = 78 / (vb - vy);
    const px = (bare.cx - (cx - vx) * k).toFixed(1);
    return `<svg class="tank" x="${px}" y="2" width="${((vr - vx) * k).toFixed(1)}" height="78" viewBox="${vx} ${vy} ${vr - vx} ${vb - vy}" overflow="visible" ${aria}>`;
  })();
  return `
  ${open}
    <defs>
      <linearGradient id="w${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${W[0]}"/><stop offset="1" stop-color="${W[1]}"/></linearGradient>
      <linearGradient id="f${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${W[1]}"/><stop offset="1" stop-color="${W[2]}"/></linearGradient>
      <linearGradient id="b${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${body[1]}"/><stop offset=".35" stop-color="${body[0]}"/><stop offset="1" stop-color="${body[1]}"/></linearGradient>
      <linearGradient id="q${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hot[0]}"/><stop offset="${Math.max(s - 0.07, 0).toFixed(2)}" stop-color="${hot[1]}"/><stop offset="${Math.min(s + 0.07, 1).toFixed(2)}" stop-color="${cold[0]}"/><stop offset="1" stop-color="${cold[1]}"/></linearGradient>
      <linearGradient id="hl${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${dark ? 0.3 : 0.55}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="sh${uid}"><stop offset="0" stop-color="#000" stop-opacity="${dark ? 0.55 : 0.28}"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      <linearGradient id="pv${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark ? "#2f4f80" : "#3a5f99"}"/><stop offset="1" stop-color="${dark ? "#14243f" : "#1c3560"}"/></linearGradient>
      <radialGradient id="halo${uid}"><stop offset="0" stop-color="${acc}" stop-opacity=".26"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient>
      <clipPath id="c${uid}"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${iw / 2}" ry="14"/></clipPath>
      <filter id="bl${uid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>
      <filter id="ds${uid}" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="${dark ? 0.4 : 0.12}"/></filter>
    </defs>
    ${
      bare
        ? ""
        : `<rect width="430" height="200" fill="url(#w${uid})"/>
    <rect y="170" width="430" height="30" fill="url(#f${uid})"/>
    <rect y="170" width="430" height="1" fill="#fff" opacity="${dark ? 0.06 : 0.7}"/>`
    }
    ${heats ? `<circle cx="${cx}" cy="${y + h / 2}" r="78" fill="url(#halo${uid})"/>` : ""}
    <ellipse cx="${cx}" cy="172" rx="50" ry="5" fill="url(#sh${uid})"/>
    ${pv}
    <path d="M${x + 26} ${y + h - 6} V172" stroke="#3b7fd4" stroke-width="5" stroke-linecap="round" opacity=".9"/>
    <path d="M${x + w - 26} ${y + h - 6} V172" stroke="#e8590c" stroke-width="5" stroke-linecap="round" opacity=".9"/>
    <g filter="url(#ds${uid})">${fan}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" ry="18" fill="url(#b${uid})" stroke="${body[2]}"/>
      <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${iw / 2}" ry="14" fill="url(#q${uid})"/>
      <g clip-path="url(#c${uid})">${bubbles}${glow}${share != null ? `<path d="M${ix} ${lvl} H${ix + iw}" stroke="#fff" stroke-opacity=".55" stroke-width="1" stroke-dasharray="3 3"/>` : ""}</g>
      <rect x="${ix + 8}" y="${iy + 8}" width="9" height="${ih - 16}" rx="4.5" fill="url(#hl${uid})" opacity=".8"/>
      <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${iw / 2}" ry="14" fill="none" stroke="#000" stroke-opacity=".08"/>
    </g>
    ${bare ? "" : level}
    ${temp ? `<text x="${cx}" y="${tempY}" text-anchor="middle" font-family="Roboto,sans-serif" font-size="${bare ? 22 : 17}" font-weight="700" fill="#fff" stroke="rgba(0,0,0,.45)" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${rcEsc(temp)}</text>` : ""}
    ${bare ? "" : panel}
  </svg>`;
};

// `a` mixed with `b` (hex colours, p of a): coloured SVG text darkened toward the text colour to read at 4.5:1.
export const whMix = (a, b, p) => {
  const n = (h, i) => Number.parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2].map((i) => Math.round(n(a, i) * p + n(b, i) * (1 - p)).toString(16).padStart(2, "0")).join("")}`;
};
// SVG text cut to `max` characters with an ellipsis: SVG text never wraps, a long error would run out of its box.
export const whClip = (t, max) => (t && t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);
