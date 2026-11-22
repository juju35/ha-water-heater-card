// Renders the water heater cards with a mock water heater and saves the README screenshots.
// Usage: npm install && npm run build && node scripts/screenshots/water-heater.mjs
import { pair, shoot } from "./harness.mjs";
import { COST_WS, setup } from "./mock.mjs";

// Stills: animations: false draws the bubbles at a fixed moment, so a capture only changes when the card does.
const still = (file, s) => pair(file, { ...s, config: { animations: false, ...s.config } });
const scenes = ["heating", "ready", "boost", "away", "error", "relay", "pv"].flatMap((scene) => still(scene, { scene }));
await shoot({ prefix: "wh", tag: "water-heater-card", shots: [...scenes, ...still("pv-night", { scene: "pv", night: true }), ...still("compact", { scene: "heating", config: { show_scene: false } })], setup });
// Cost and heating (#107): the cost of a m³ of hot water, its electricity, water and standby, and today's heating strip.
await shoot({ prefix: "wh", tag: "water-heater-card", shots: still("cost", { scene: "heating", cost: true, config: {} }), setup, ws: COST_WS });
await shoot({
  prefix: "wh-mini",
  tag: "water-heater-mini-card",
  shots: [...still("heating", { scene: "heating" }), ...still("away", { scene: "away" }), ...still("zoom", { scene: "heating", open: ".zoom" })],
  setup,
});
