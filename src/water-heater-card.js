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
const WH_DROP = "M12 3c-3.5 4.5-6 7.6-6 10.5a6 6 0 0 0 12 0C18 10.6 15.5 7.5 12 3z";

// The illustration: the wall and the floor, the tank on its feet with its two pipes, the heat pump on top (when it has
// one), the water inside, hot above cold, the boundary at the share of hot water; bubbles rise and the element glows while
// it heats. Beside it, a glass panel with the showers left, the litres at 40 °C and a note.
// `bare`: the tank alone (no wall, floor, panel nor level), as a nested <svg> placed in the banner's 200 × 80 room,
// standing on its floor with its centre at `bare.cx`.
const whScene = ({ state, dark, uid, share, temp, big, label, drops, litres, note, heatPump, solar, night, animate, bare }) => {
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
const whMix = (a, b, p) => {
  const n = (h, i) => Number.parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `#${[0, 1, 2].map((i) => Math.round(n(a, i) * p + n(b, i) * (1 - p)).toString(16).padStart(2, "0")).join("")}`;
};
// SVG text cut to `max` characters with an ellipsis: SVG text never wraps, a long error would run out of its box.
const whClip = (t, max) => (t && t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

// ── Banner ───────────────────────────────────────────────────────────────────
// The illustrated header's room: a utility corner, 200 × 80, drawn to the banner's right edge. A tiled wall, the hot
// and cold water pipes coming down from the ceiling (the hot one pulses while the tank heats), a shelf of bottles, the
// washing machine and the floor drain; the tank (whScene's, bare) stands on the floor at `cx`. By night, darker.
// The status pill's place, decided by measurement after each render and each new width (the same rule on every
// card): on the title row, right after the title, only when the whole title and the pill's whole label fit there;
// otherwise on its own line under the subtitle (clamped to one line), the title whole on its row (cut only when it
// does not fit alone). When the label is still cut there, or the text block leaves the banner or runs over its ground
// strip, the pill keeps its dot alone, on the title row (its label stays in title and aria-label). A card of 200 px
// or less shows the dot alone anyway (CSS), beside the title.
const whPlacePill = (head, row, ground) => {
  if (!head) return;
  head.removeAttribute("data-wrap");
  head.removeAttribute("data-dot");
  const pill = row.querySelector(":scope > .bpill, :scope > .pill");
  const text = pill?.querySelector(".bpt, .pt");
  if (!text?.getBoundingClientRect || text.getBoundingClientRect().width <= 1) return;
  const name = row.querySelector(".title");
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  const title = name ? (name.scrollWidth > name.clientWidth ? name.scrollWidth : name.getBoundingClientRect().width) + gap : 0;
  if (title + pill.getBoundingClientRect().width <= row.getBoundingClientRect().width + 0.5) return;
  head.setAttribute("data-wrap", "");
  const box = row.parentElement.getBoundingClientRect();
  const frame = head.getBoundingClientRect();
  const out = ground && (box.bottom > ground.getBoundingClientRect().top + 0.5 || box.top < frame.top - 0.5);
  if (text.scrollWidth > text.clientWidth + 0.5 || out) {
    head.removeAttribute("data-wrap");
    head.setAttribute("data-dot", "");
  }
};

const WH_ROOM_CX = 140;
const whRoom = (night, flowing, shelf = true, dx = 0) => {
  const [wall, band, joint] = night ? ["#25282c", "#2c3034", "#33373c"] : ["#ece8e1", "#f4f1ec", "#ddd6cb"];
  const rows = [0, 1, 2, 3, 4].map((i) => `<line x1="0" y1="${40 + i * 9}" x2="200" y2="${40 + i * 9}"/>`).join("");
  const cols = Array.from({ length: 12 }, (_, i) => `<line x1="${(i % 2 ? 9 : 0) + i * 18}" y1="40" x2="${(i % 2 ? 9 : 0) + i * 18}" y2="80"/>`).join("");
  const bottles = [
    [4, "#e8c07a"],
    [14, "#d4537e"],
    [24, "#7cb87a"],
    [34, "#f5b400"],
  ]
    .map(([x, c]) => `<rect x="${x}" y="-10" width="8" height="10" rx="2" fill="${c}" opacity=".85"/><rect x="${x + 1}" y="-12" width="6" height="2" fill="#9aa3ae"/>`)
    .join("");
  const hot = "M150 0 V20 Q150 24 154 24 H160";
  return `<rect width="200" height="80" fill="${wall}"/><rect width="200" height="40" fill="${band}"/>
    <g stroke="${joint}" stroke-width=".8">${rows}${cols}</g>
    <g${dx ? ` transform="translate(${-dx} 0)"` : ""}><path d="${hot}" stroke="#d1603a" stroke-width="3" fill="none"/><path d="M190 0 V20 Q190 24 186 24 H180" stroke="#3b7fd4" stroke-width="3" fill="none"/>
    ${flowing ? `<path class="pl" d="${hot}" stroke="#ffb08a" stroke-width="1.2" fill="none"/>` : ""}
    <rect x="146" y="6" width="8" height="5" rx="1" fill="#e5484d"/><rect x="186" y="6" width="8" height="5" rx="1" fill="#2f80ed"/></g>
    ${shelf ? `<g transform="translate(70 30)"><rect width="50" height="2.4" fill="${night ? "#4a4f56" : "#b9a68a"}"/>${bottles}</g>` : ""}
    <g class="wm" transform="translate(40 76)"><rect x="-14" y="-24" width="28" height="24" rx="2" fill="${night ? "#3d4248" : "#fff"}" stroke="${night ? "#555b63" : "#c9ced6"}"/><circle cy="-11" r="7" fill="${night ? "#2c3034" : "#e8eef3"}" stroke="#9aa3ae"/><rect x="-11" y="-22" width="8" height="2" rx="1" fill="#9aa3ae"/></g>
    <circle cx="110" cy="77" r="2.2" fill="${night ? "#1c1f22" : "#b4aea4"}"/>`;
};

const whIcon = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const WH_SVG = {
  power: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  energy: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
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
  static defaults = { illustration: true, illustration_theme: "auto", show_scene: true, animations: true, show_controls: true };

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
    // The water heaters of the home are scanned again only when the registry changes (or none was found yet).
    const memo = (this._memo ||= {});
    let found = rcMemo(memo, "heaters", [h.entities], () => whHeaters(h));
    if (!found.length) found = memo.heaters.value = whHeaters(h);
    return found[0];
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
    // The roles read the states too (a sensor unavailable after a restart is skipped): found again when they change.
    const e = rcMemo((this._memo ||= {}), "find", [id, c.entities, h.entities, h.devices, h.states], () => whFind(h, id, c.entities || {}));
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
      sub: [h.areas?.[dev?.area_id]?.name, dev?.model].filter(Boolean).join(" · "),
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
      return new Intl.DateTimeFormat(this._lang(), { weekday: "short", day: "numeric", month: "short" }).format(d);
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
    const parts = [m.none, m.raw, m.name, m.sub, status, scene, tiles, m.error, m.mode, m.modes, m.target, m.min, m.max, m.boostOn, m.relayOn, m.awayOn, m.awayAttr, m.awayId, m.boostId, dark, banner, night];
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

  _afterGrid() {
    const m = this._items;
    if (!m || m.none || this._config.show_controls === false || m.state === "offline") return "";
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
  `;
}

// ── Editor ───────────────────────────────────────────────────────────────────
const whSchema = (booleans) => (lang) => [
  { name: "entity", selector: { entity: { domain: ["water_heater", "switch", "input_boolean", "sensor"] } } },
  { name: "title", selector: { text: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  { name: "temperature", selector: { entity: { domain: "sensor", device_class: "temperature" } } },
  { name: "capacity", selector: { number: { min: 10, max: 1000, step: 10, mode: "box", unit_of_measurement: "L" } } },
  { name: "shower_volume", selector: { number: { min: 10, max: 200, step: 5, mode: "box", unit_of_measurement: "L" } } },
  { name: "tariff", selector: { entity: {} } },
  ...rcBooleans(...booleans),
  {
    name: "illustration_theme",
    selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: rcT(WH_I18N, lang, `ed_theme_${value}`) })) } },
  },
  ...rcAdvanced(WH_I18N, lang, "entities", "language"),
];

const WH_HELPERS = ["entity", "title", "temperature", "capacity", "shower_volume", "tariff", "zoom", "entities", "language"];

const WaterHeaterCardEditor = rcEditor({
  card: WaterHeaterCard,
  helpers: WH_HELPERS,
  schema: whSchema(["show_title", "illustration", "show_scene", "animations", "show_controls"]),
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

  // The banner's tank: the full card's scene, without the panel's texts.
  _miniScene(m) {
    return { state: m.state, share: m.share != null ? Math.round(m.share * 100) / 100 : null, temp: m.temp != null ? this._deg(m.temp, false) : "", heatPump: m.heatPump, solar: m.solar, night: m.night };
  }

  _drawMini(m) {
    const banner = this._config.illustration !== false;
    const night = banner && this._night();
    const scene = banner ? this._miniScene(m) : null;
    if (!this._changed(["mini", m.state, m.temp, m.showers, m.share, m.error, m.awayEnd?.getTime(), m.name, banner, night, scene])) return;
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
    // The banner: the state is the status pill after the title, the other readings stay as chips under it.
    const state = { error: this._t("st_error"), away: this._t("st_away"), offline: this._t("st_offline") }[m.state] || this._t(`st_${m.state}`);
    const rest = (m.state === "error" ? [m.error] : chips.slice(1))
      .filter(Boolean)
      .map((t) => chip(t, true))
      .join("");
    // The ring around the badge: the share of hot water.
    const pct = m.share != null ? m.share * 100 : 0;
    const L = 2 * Math.PI * 17;
    const ring = (fill) =>
      `<svg class="ringb" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="none" stroke="color-mix(in srgb, var(--c) 18%, transparent)" stroke-width="4"/><circle cx="20" cy="20" r="17" fill="none" stroke="var(--c)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${((L * pct) / 100).toFixed(1)} 999" transform="rotate(-90 20 20)"/>${fill}</svg>`;
    if (banner) {
      const c = this._config;
      this.shadowRoot.innerHTML = `<style>${RC_BASE_STYLES}${this.constructor.styles}</style>
        <ha-card class="lvl-${m.state} bn">${this._banner(m, rest ? `<div class="rs">${rest}</div>` : "", night, scene, ring(""), WH_ROOM_CX, state)}</ha-card>`;
      const root = this.shadowRoot;
      if (c.navigation_path) rcBindNav(root.querySelector(".head"), c.navigation_path);
      for (const el of root.querySelectorAll(".r")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
      this._fitPill();
      return;
    }
    this._paintMini({ level: m.state, icon: WH_ICONS[m.state], status: "", chips: html });
    const title = this.shadowRoot.querySelector(".mini .title");
    if (title) title.textContent = m.name;
    // The badge is a ring: the share of hot water.
    const badge = this.shadowRoot.querySelector(".mini > .badge");
    if (badge) badge.innerHTML = ring('<path d="M20 11c-3 3.9-5 6.5-5 9a5 5 0 0 0 10 0c0-2.5-2-5.1-5-9z" fill="var(--c)"/>');
  }
}

const WaterHeaterMiniCardEditor = rcEditor({
  card: WaterHeaterMiniCard,
  helpers: WH_HELPERS,
  schema: whSchema(["show_title", "illustration", "show_scene", "animations", "show_controls", "zoom"]),
});

rcRegister(
  WaterHeaterMiniCard,
  WaterHeaterMiniCardEditor,
  "Water Heater Mini Card",
  "The water heater on two lines: a hot-water ring, the state and the key readings, with a zoom to the full card",
);
