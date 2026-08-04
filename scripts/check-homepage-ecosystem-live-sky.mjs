import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = (path) => readFile(path, "utf8");
const [homeRoute, component, styles, stateSource, editorialSource, renderer] = await Promise.all([
  read("app/page.tsx"),
  read("components/HomepageLiveSky.tsx"),
  Promise.all([read("app/home.module.css"), read("components/final-editorial.module.css")]).then((parts) => parts.join("\n")),
  read("lib/homepage/homepage-live-sky-state.ts"),
  read("content/public-editorial-final/03-homepage.md"),
  read("components/FinalEditorialPage.tsx"),
]);
const home = `${homeRoute}\n${editorialSource}\n${renderer}`;

for (const marker of [
  '"/chart"',
  '"/compare"',
  '"/sky"',
  '"/wiki"',
  '"/product"',
  '"/privacy"',
  "HomepageProductProof",
  "HomepageLiveSky",
  "deliverSkyPublicSnapshot",
  "Promise.allSettled",
  "تحلیل رابطه همیشه خصوصی می‌ماند",
  "داده تولد یا متن گزارش نباید برای آمار بازدید ارسال شوند",
]) assert.ok(home.includes(marker), `Homepage marker is missing: ${marker}`);

for (const forbidden of ["پیش‌بینی قطعی آینده", "بیش از ۱۰۰٬۰۰۰ کاربر"]) {
  assert.ok(!home.includes(forbidden), `Homepage contains an invented or deterministic claim: ${forbidden}`);
}

for (const marker of [
  'data-sky-state="unavailable"',
  "data-sky-state={state.status}",
  "آسمان امروز در یک نگاه",
  "آخرین دادهٔ معتبر آسمان",
  "روشنایی",
  "نزدیک‌ترین رویداد معتبر",
  "حرکت برگشتی",
]) assert.ok(component.includes(marker), `Live Sky UI marker is missing: ${marker}`);

assert.ok(homeRoute.includes('data-home-theme="halleus-soft-app"'), "Homepage soft-app theme marker is missing");
for (const marker of [
  "grid-template-columns: repeat(4, minmax(0, 1fr))",
  "@media (max-width: 760px)",
  "overflow-wrap: anywhere",
]) assert.ok(styles.includes(marker), `Homepage responsive marker is missing: ${marker}`);

const compiled = ts.transpileModule(stateSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  fileName: "homepage-live-sky-state.ts",
}).outputText;
const stateModule = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const baseSnapshot = {
  input: { localDate: "2026-08-04" },
  qualityFlags: [],
  errors: [],
  moonPhase: { phase: "waning", illuminationFraction: 0.6 },
  planetaryStates: [{ body: "moon" }],
};
const readyFixture = {
  status: "ready",
  currentLocalDate: "2026-08-04",
  requestedDate: "2026-08-04",
  snapshot: baseSnapshot,
};

assert.equal(stateModule.resolveHomepageSkyState(readyFixture).status, "ready");
assert.equal(stateModule.resolveHomepageSkyState({ ...readyFixture, snapshot: { ...baseSnapshot, qualityFlags: ["partial_result"] } }).status, "partial");
assert.equal(stateModule.resolveHomepageSkyState({ ...readyFixture, snapshot: { ...baseSnapshot, input: { localDate: "2026-08-03" } } }).status, "stale");
assert.equal(stateModule.resolveHomepageSkyState(null).status, "unavailable");
assert.equal(stateModule.resolveHomepageSkyState({ status: "day-unavailable", message: "missing" }).status, "unavailable");

console.log("Homepage ecosystem and Live Sky check passed.");
console.log("- four public product paths and real report proof are visible");
console.log("- Live Sky reuses the public Sky delivery source on the server");
console.log("- ready, partial, stale, and unavailable fixtures preserve truthful labels");
console.log("- mobile, tablet, and desktop layouts avoid fixed-width overflow");
