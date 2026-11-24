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
export const whPlacePill = (head, row, ground) => {
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

export const WH_ROOM_CX = 140;
export const whRoom = (night, flowing, shelf = true, dx = 0) => {
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

export const whIcon = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const WH_SVG = {
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
  standby: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
};
// The icon of a mode, from its name.
export const whModeIcon = (mode) => {
  const n = whNorm(mode);
  if (WH_BOOST.test(n) || /performance|comfort|confort/.test(n)) return "boost";
  if (/eco|green|smart|saving|spar/.test(n)) return "eco";
  if (/heat_?pump|pac|hybrid/.test(n)) return "heat_pump";
  if (/electric|resist|element/.test(n)) return "power";
  if (/auto|program|schedul/.test(n)) return "mode";
  return "drop";
};
