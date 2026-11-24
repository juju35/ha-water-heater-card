// No dead code in the bundle: every top-level declaration of src/ is reached from the code that runs (the card
// registration), and every method is called somewhere. shared.js came from the room cards; what this card does not
// use is left out, so the bundle carries only the water heater's code.
import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "acorn";
import { readSrc } from "./source.mjs";

const FILES = ["shared", "water-heater-card"].map((f) => new URL(`../src/${f}.js`, import.meta.url));
const sources = FILES.map((f) => readSrc(f));
const asts = sources.map((s) => parse(s, { ecmaVersion: "latest", sourceType: "script" }));

// Every identifier under `node`.
const names = (node, out = new Set()) => {
  const stack = [node];
  while (stack.length) {
    const n = stack.pop();
    if (!n || typeof n !== "object") continue;
    if (Array.isArray(n)) stack.push(...n);
    else {
      if (n.type === "Identifier") out.add(n.name);
      for (const v of Object.values(n)) if (v && typeof v === "object") stack.push(v);
    }
  }
  return out;
};

test("every top-level declaration is used", () => {
  const decls = new Map();
  const roots = new Set();
  for (const ast of asts)
    for (const n of ast.body) {
      const ids = n.type === "VariableDeclaration" ? n.declarations.map((d) => d.id.name) : n.id ? [n.id.name] : [];
      if (ids.length) for (const id of ids) decls.set(id, names(n));
      else names(n, roots);
    }
  const live = new Set();
  const queue = [...roots];
  while (queue.length) {
    const id = queue.pop();
    if (live.has(id) || !decls.has(id)) continue;
    live.add(id);
    for (const x of decls.get(id)) if (x !== id) queue.push(x);
  }
  assert.deepEqual([...decls.keys()].filter((id) => !live.has(id)), []);
});

test("every method is called", () => {
  // Called by the browser or Home Assistant, not by the code.
  const hooks = new Set(["constructor", "connectedCallback", "disconnectedCallback", "setConfig", "getCardSize", "getGridOptions", "getConfigElement", "getStubConfig", "hass"]);
  const all = sources.join("\n");
  const unused = [];
  for (const ast of asts) {
    const stack = [ast];
    while (stack.length) {
      const n = stack.pop();
      if (!n || typeof n !== "object") continue;
      if (Array.isArray(n)) {
        stack.push(...n);
        continue;
      }
      if (n.type === "MethodDefinition" && n.key.type === "Identifier" && !n.static && !hooks.has(n.key.name)) {
        const uses = all.match(new RegExp(`[^\\w$]${n.key.name.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&")}(?![\\w$])`, "g")) || [];
        if (uses.length < 2) unused.push(n.key.name);
      }
      for (const v of Object.values(n)) if (v && typeof v === "object") stack.push(v);
    }
  }
  assert.deepEqual(unused, []);
});

test("the shared translations hold only what the card asks for and its own table lacks", async () => {
  const { load } = await import("./load.mjs");
  const { RC_I18N, WH_I18N } = load();
  const [shared, card] = sources;
  const start = shared.indexOf("const RC_I18N = {");
  const code = shared.slice(0, start) + shared.slice(shared.indexOf("\n};\n", start)) + card;
  const quoted = new Set([...code.matchAll(/["'`]([A-Za-z_][\w-]*)["'`]/g)].map((m) => m[1]));
  const plural = [...code.matchAll(/_tn\(\s*["'`](\w+)["'`]/g)].map((m) => m[1]);
  // Literal keys, editor labels / helpers built from a field name (ed_<name>[_helper]), plural forms of a _tn base.
  const requested = (k) =>
    quoted.has(k) || (k.startsWith("ed_") && quoted.has(k.slice(3).replace(/_helper$/, ""))) || plural.some((b) => k.startsWith(`${b}_`));
  const extra = [];
  for (const [lang, table] of Object.entries(RC_I18N))
    for (const k of Object.keys(table)) if (!requested(k) || k in (WH_I18N[lang] ?? {})) extra.push(`${lang}.${k}`);
  assert.deepEqual(extra, []);
});
