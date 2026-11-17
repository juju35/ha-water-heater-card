// The illustrated header in Chromium (needs `npm run build`; skipped without Chromium): the status pill shows its
// whole label from 245 to 500 px (right after the title, else on its own line under the subtitle), never more than
// about half of the title row, next to a readable title; the mini card's expand / collapse button is a 24 px round
// button 5 px from the banner's top right corner, clear of the tank's pipes.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

let harness;
let mock;
try {
  harness = await import("../scripts/screenshots/harness.mjs");
  mock = await import("../scripts/screenshots/mock.mjs");
} catch {}
const built = existsSync(new URL("../dist/ha-water-heater-card.js", import.meta.url));
const browser = built ? await harness?.launch().catch(() => null) : null;

test("status pill shows its whole label next to a readable title; the zoom button sits at the banner corner", { skip: !browser && "no Chromium or no build" }, async () => {
  const failures = [];
  try {
    for (const scene of ["heating", "away", "error"]) {
      for (const width of [245, 300, 400, 500]) {
        for (const [tag, zoom] of [["water-heater-card", false], ["water-heater-mini-card", false], ["water-heater-mini-card", true]]) {
          const { hass, config } = mock.setup({ scene, theme: "light", config: { animations: false } }, "en");
          const page = await harness.openPage(browser, { theme: "light", width });
          await harness.mountCard(page, { tag, hass, config, open: zoom ? ".zoom" : null });
          await page.waitForTimeout(400);
          const out = await page.evaluate(() => {
            const r = document.querySelector("#root").firstElementChild.shadowRoot;
            const res = [];
            const pill = r.querySelector(".banner .bpill");
            if (!pill) return ["no pill"];
            const txt = pill.querySelector(".bpt");
            if (txt.scrollWidth > txt.clientWidth + 0.5 || !txt.clientWidth) res.push("label cut");
            const nb = r.querySelector(".banner .title").getBoundingClientRect();
            if (nb.width < 24) res.push(`title ${Math.round(nb.width)}px`);
            const pb = pill.getBoundingClientRect();
            const onRow = Math.abs(pb.top + pb.height / 2 - (nb.top + nb.height / 2)) < 3;
            const row = r.querySelector(".trow").getBoundingClientRect();
            if (onRow && pb.width > row.width * 0.51 + 0.5) res.push(`pill ${Math.round(pb.width)} of ${Math.round(row.width)}px`);
            const bb = r.querySelector(".banner").getBoundingClientRect();
            if (pb.right > bb.right - 4 || pb.bottom > bb.bottom - 10) res.push("pill out of the banner");
            const z = r.querySelector(".banner .zoom")?.getBoundingClientRect();
            if (z && (Math.round(z.width) !== 24 || Math.round(z.height) !== 24 || Math.round(z.top - bb.top) !== 5 || Math.round(bb.right - z.right) !== 5))
              res.push(`zoom ${Math.round(z.width)}x${Math.round(z.height)} at ${Math.round(z.top - bb.top)}/${Math.round(bb.right - z.right)}`);
            // The cold water pipe (blue) stays clear of the button.
            const pipe = [...r.querySelectorAll('.room path[stroke="#3b7fd4"]')].map((p) => p.getBoundingClientRect())[0];
            if (z && pipe && pipe.right > z.left && pipe.top < z.bottom) res.push("the zoom button covers the pipe");
            return res;
          });
          if (tag.includes("mini") && !(await page.evaluate(() => !!document.querySelector("#root").firstElementChild.shadowRoot.querySelector(".banner .zoom"))))
            out.push("no zoom button");
          for (const f of out) failures.push(`${tag}${zoom ? " zoomed" : ""} ${scene} ${width}px: ${f}`);
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  assert.deepEqual(failures, []);
});
