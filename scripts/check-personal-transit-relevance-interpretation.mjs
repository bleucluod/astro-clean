// HALLEUS_DEEP_NARRATIVE_SLICE4_PERSONAL_TRANSIT_GUARD_RECONCILIATION_R1_20260902
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import ts from "typescript";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const originalResolveFilename = Module._resolveFilename;
function resolveWithTypeScriptExtensions(candidate) {
  for (const option of [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, path.join(candidate, "index.ts"), path.join(candidate, "index.tsx"), path.join(candidate, "index.js")]) {
    if (fs.existsSync(option)) return option;
  }
  return candidate;
}
Module._resolveFilename = function resolveHalleusAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    request = resolveWithTypeScriptExtensions(path.join(repoRoot, request.slice(2)));
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.NodeJs, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, reportDiagnostics: true, fileName: filename });
    const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
    if (errors.length) throw new Error(`${filename} transpile errors: ${errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join(" | ")}`);
    module._compile(result.outputText, filename);
  };
}
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function read(relativePath) { return fs.readFileSync(path.join(repoRoot, relativePath), "utf8").replace(/\r\n/g, "\n"); }
const transit = require(path.join(repoRoot, "src/lib/report-output/personal-transit-relevance.ts"));

const aspects = [
  { id: "outer-1", aspect: "conjunction", transitBody: "pluto", natalBody: "neptune", exactAngle: 0, separation: 0.01, orb: 0.01, orbLimit: 4 },
  { id: "outer-2", aspect: "trine", transitBody: "uranus", natalBody: "pluto", exactAngle: 120, separation: 119.98, orb: 0.02, orbLimit: 4 },
  { id: "sun-contact", aspect: "square", transitBody: "saturn", natalBody: "sun", exactAngle: 90, separation: 91.2, orb: 1.2, orbLimit: 5 },
  { id: "moon-contact", aspect: "sextile", transitBody: "mars", natalBody: "moon", exactAngle: 60, separation: 62, orb: 2, orbLimit: 5 },
  { id: "ruler-contact", aspect: "trine", transitBody: "jupiter", natalBody: "mercury", exactAngle: 120, separation: 119.5, orb: 0.5, orbLimit: 5 },
  { id: "ruler-repeat-1", aspect: "conjunction", transitBody: "mercury", natalBody: "mercury", exactAngle: 0, separation: 0.2, orb: 0.2, orbLimit: 5 },
  { id: "ruler-repeat-2", aspect: "square", transitBody: "venus", natalBody: "mercury", exactAngle: 90, separation: 89.9, orb: 0.1, orbLimit: 5 },
  { id: "venus-contact", aspect: "opposition", transitBody: "saturn", natalBody: "venus", exactAngle: 180, separation: 179.7, orb: 0.3, orbLimit: 5 },
];
const selected = transit.selectPersonalTransitHighlights(aspects, { chartRulerId: "mercury", angularNatalBodyIds: ["moon", "mercury"], activeNatalBodyIds: ["sun", "venus"], maxVisible: 5 });
assert(selected.length === 5, "selector must choose five visible contacts when enough candidates exist");
assert(selected.some((aspect) => aspect.natalBody === "sun"), "natal Sun contact must remain visible");
assert(selected.some((aspect) => aspect.natalBody === "moon"), "natal Moon contact must remain visible");
assert(selected.some((aspect) => aspect.natalBody === "mercury"), "chart-ruler contact must remain visible");
assert(selected.filter((aspect) => ["uranus", "neptune", "pluto"].includes(aspect.transitBody) && ["uranus", "neptune", "pluto"].includes(aspect.natalBody)).length <= 1, "outer-to-outer contacts must not occupy multiple visible slots");
const natalCounts = new Map(); for (const aspect of selected) natalCounts.set(aspect.natalBody, (natalCounts.get(aspect.natalBody) ?? 0) + 1);
assert(Math.max(...natalCounts.values()) <= 2, "repeated natal-body penalty must preserve diversity");
assert(aspects[0].id === "outer-1" && aspects[1].id === "outer-2", "selector must not mutate raw aspect order");

const adultOne = transit.buildPersonalTransitBehavioralInterpretation(aspects[2], "adult", { signId: "aquarius", houseNumber: 5 });
const adultTwo = transit.buildPersonalTransitBehavioralInterpretation(aspects[7], "adult", { signId: "scorpio", houseNumber: 4 });
const caregiver = transit.buildPersonalTransitBehavioralInterpretation(aspects[3], "caregiver", { houseNumber: 4 });
const adultFingerprint = [adultOne.attention, adultOne.scenario, adultOne.helpful, adultOne.friction, adultOne.action].join("\n");
const secondFingerprint = [adultTwo.attention, adultTwo.scenario, adultTwo.helpful, adultTwo.friction, adultTwo.action].join("\n");
assert(adultFingerprint !== secondFingerprint, "different transit contacts must not share generic copy");
assert(adultOne.attention.includes("زحل") && adultOne.attention.includes("خورشید"), "copy must use both transiting and natal bodies");
assert(adultOne.attention.includes("زاویهٔ واقعی"), "stored actual separation must be visible in normal prose");
assert(adultOne.technicalDetail.includes("زاویهٔ مرجع") && adultOne.technicalDetail.includes("زاویهٔ واقعی") && adultOne.technicalDetail.includes("فاصله از دقیق"), "technical geometry must expose reference, actual separation, and distance from exact");
assert(!adultFingerprint.includes("حتماً") && !adultFingerprint.includes("قطعاً"), "copy must remain bounded rather than deterministic");
for (const stale of ["و این موضوع را مستقیم به", "این الگو معمولاً در", "بهترین استفاده این است که", "وقتی فشار بالا می‌رود", "در این زاویه"]) assert(!adultFingerprint.includes(stale), `legacy transit scaffold must be removed: ${stale}`);
assert(caregiver.scenario.includes("کودک") || caregiver.action.includes("کودک"), "caregiver mode must speak to the caregiver about the child");
assert(!caregiver.scenario.includes("شغل") && !caregiver.scenario.includes("عاشقانه"), "caregiver mode must avoid adult assumptions");
const legacy = transit.buildPersonalTransitBehavioralInterpretation({ id: "legacy", aspect: "square", transitBody: "saturn", natalBody: "venus", exactAngle: 90, orb: 0.3, orbLimit: 5 }, "adult");
assert(legacy.technicalDetail.includes("زاویهٔ واقعی در snapshot قدیمی ذخیره نشده"), "old snapshot without separation must fail honestly");
assert(!/زاویهٔ واقعی\s+[۰-۹]/u.test(legacy.technicalDetail), "old snapshot must not fabricate a numeric actual separation");

const bridge = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const section = read("components/PersonalTransitReportSection.tsx");
const service = read("lib/report-generation/report-generation-service.ts");
const probe = read("src/lib/chart/natal-to-transit-calculation-probe.ts");
for (const marker of ["selectPersonalTransitHighlights", "visibleAspectHighlights", "technicalDisclaimer", "audienceMode", "probeResult.aspects.map(toAspectSummary)", "natalBody?.signId", 'motion?.status === "retrograde"']) assert(bridge.includes(marker), `bridge missing marker: ${marker}`);
assert(bridge.includes("probeResult.aspects,\n    context"), "selector must see the full calculated aspect inventory");
assert(service.includes("report.realEngine ?? realEngineSnapshot"), "generation must use stored natal context, not a second chart calculation");
assert(service.includes("getBehavioralChartRulerId"), "generation must keep chart-ruler relevance");
assert(service.includes("angularNatalBodyIds") && service.includes("activeNatalBodyIds"), "generation must keep angular and active natal context");
assert(!service.includes("Tehran") && !service.includes("تهران"), "no hidden Tehran fallback may be added");
assert(section.includes("Array.isArray(data.visibleAspectHighlights)"), "old bridge compatibility must remain explicit");
assert(section.includes("selectPersonalTransitHighlights(data.aspectHighlights"), "old bridges must reuse stored aspects without recompute");
assert(section.includes("aspect.separation") && section.includes("formatReportNarrativeAngle"), "visible transit titles must consume stored separation");
assert(!section.includes("ASPECT_LABELS_FA") && !section.includes("ASPECT_ANGLE_LABELS_FA"), "normal transit surface must not depend on lexical aspect names");
assert(!section.includes("fetch(") && !section.includes("navigator.geolocation") && !section.includes("localStorage"), "reopen rendering must not recompute or infer location");
assert(probe.includes("return aspects.sort((left, right) => left.orb - right.orb);"), "raw calculation output must remain orb-sorted and unchanged");

if (failures.length > 0) { console.error("Personal transit relevance/interpretation guard failed:"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("Personal transit relevance/interpretation guard passed.");
console.log("- selection/relevance behavior remains deterministic and unchanged");
console.log("- transit prose uses ordered pair synthesis, stored actual separation, natal context, and bounded language");
console.log("- old snapshots remain readable without reconstructing a missing exact angle");
