// ── Mini card ────────────────────────────────────────────────────────────────
// The water heater on two lines: a ring with the share of hot water as the badge, the title, then the key readings as
// pills; the zoom button opens the full card in place.
import { WH_ICONS } from "./core.js";
import { WH_ROOM_CX } from "./banner.js";
import { WaterHeaterCard } from "./card.js";
import { WH_HELPERS, whSchema } from "./editor.js";
import { rcMorph } from "../shared/in-place-redraw.js";

export class WaterHeaterMiniCard extends rcMini(
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
      rcMorph(this.shadowRoot, `<style>${RC_BASE_STYLES}${this.constructor.styles}</style>
        <ha-card class="lvl-${m.state} bn">${this._banner(m, rest ? `<div class="rs">${rest}</div>` : "", night, scene, ring(""), WH_ROOM_CX, state)}</ha-card>`);
      this._rewire();
      const root = this.shadowRoot;
      if (c.navigation_path) rcBindNav(root.querySelector(".head"), c.navigation_path, this._on);
      for (const el of root.querySelectorAll(".r")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id), this._on);
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

export const WaterHeaterMiniCardEditor = rcEditor({
  card: WaterHeaterMiniCard,
  helpers: WH_HELPERS,
  schema: whSchema(["show_title", "show_subtitle", "illustration", "show_scene", "animations", "show_controls", "zoom"]),
});

rcRegister(
  WaterHeaterMiniCard,
  WaterHeaterMiniCardEditor,
  "Water Heater Mini Card",
  "The water heater on two lines: a hot-water ring, the state and the key readings, with a zoom to the full card",
);
