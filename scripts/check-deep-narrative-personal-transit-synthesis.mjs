// HALLEUS_DEEP_NARRATIVE_SLICE4_PERSONAL_TRANSIT_500_GUARD_R1_20260902
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import ts from "typescript";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const originalResolveFilename = Module._resolveFilename;
function resolveWithTypeScriptExtensions(candidate) { for (const option of [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, path.join(candidate, "index.ts"), path.join(candidate, "index.tsx"), path.join(candidate, "index.js")]) if (fs.existsSync(option)) return option; return candidate; }
Module._resolveFilename = function resolveHalleusAlias(request, parent, isMain, options) { if (typeof request === "string" && request.startsWith("@/")) request = resolveWithTypeScriptExtensions(path.join(repoRoot, request.slice(2))); return originalResolveFilename.call(this, request, parent, isMain, options); };
for (const extension of [".ts", ".tsx"]) require.extensions[extension] = function compileTypeScript(module, filename) { const source = fs.readFileSync(filename, "utf8"); const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.NodeJs, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, reportDiagnostics: true, fileName: filename }); const errors = (result.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error); if (errors.length) throw new Error(`${filename} transpile errors: ${errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join(" | ")}`); module._compile(result.outputText, filename); };
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function read(relativePath) { return fs.readFileSync(path.join(repoRoot, relativePath), "utf8").replace(/\r\n/g, "\n"); }
const matrix = require(path.join(repoRoot, "src/lib/report-output/personal-transit-narrative-semantic-matrix.ts"));
const transit = require(path.join(repoRoot, "src/lib/report-output/personal-transit-relevance.ts"));
const display = require(path.join(repoRoot, "lib/astrology/report-aspect-display.ts"));

const coverage = matrix.assertPersonalTransitNarrativeMatrixCoverage();
assert(coverage.pairCount === 100, `expected 100 ordered pair cores, found ${coverage.pairCount}`);
assert(coverage.dynamicCount === 5, `expected 5 dynamics, found ${coverage.dynamicCount}`);
assert(coverage.contactCount === 500, `expected 500 contacts, found ${coverage.contactCount}`);
const angleByAspect = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
const fingerprints = new Set();
const staleScaffolds = ["و این موضوع را مستقیم به", "این الگو معمولاً در", "بهترین استفاده این است که", "وقتی فشار بالا می‌رود", "در این زاویه", "دربارهٔ خودِ رابطهٔ این دو نیروست", "و هم‌زمان"];
const deterministicClaims = ["حتماً", "قطعاً", "طلاق می‌شود", "اخراج می‌شوی", "بیمار می‌شوی", "ورشکست می‌شوی"];
for (const transitBody of matrix.PERSONAL_TRANSIT_BODY_ORDER) {
  for (const natalBody of matrix.PERSONAL_TRANSIT_BODY_ORDER) {
    for (const aspect of matrix.PERSONAL_TRANSIT_ASPECT_ORDER) {
      const reference = angleByAspect[aspect];
      const separation = aspect === "opposition" ? 179.6 : reference + 0.4;
      const orb = Math.abs(separation - reference);
      const input = { id: `${transitBody}-${natalBody}-${aspect}`, aspect, transitBody, natalBody, exactAngle: reference, separation, orb, orbLimit: 5 };
      const interpretation = transit.buildPersonalTransitBehavioralInterpretation(input, "adult", { signId: "libra", houseNumber: 1, retrograde: natalBody === "mars" });
      const fingerprint = [interpretation.attention, interpretation.scenario, interpretation.helpful, interpretation.friction, interpretation.action, interpretation.technicalDetail].join("\n");
      assert(!fingerprint.includes("undefined") && !fingerprint.includes("null"), `${input.id}: malformed output`);
      assert(interpretation.attention.includes(display.formatReportNarrativeAngle(separation)), `${input.id}: stored actual separation missing from narrative`);
      assert(interpretation.attention.includes(matrix.PERSONAL_TRANSIT_PAIR_SEMANTIC_CORES[`${transitBody}->${natalBody}`].transitLabel), `${input.id}: transit direction body missing`);
      assert(interpretation.attention.includes(matrix.PERSONAL_TRANSIT_PAIR_SEMANTIC_CORES[`${transitBody}->${natalBody}`].natalLabel), `${input.id}: natal direction body missing`);
      assert(interpretation.technicalDetail.includes("زاویهٔ مرجع") && interpretation.technicalDetail.includes("زاویهٔ واقعی") && interpretation.technicalDetail.includes("فاصله از دقیق"), `${input.id}: technical geometry incomplete`);
      for (const stale of staleScaffolds) assert(!fingerprint.includes(stale), `${input.id}: legacy scaffold leaked: ${stale}`);
      for (const claim of deterministicClaims) assert(!fingerprint.includes(claim), `${input.id}: deterministic/unsafe claim leaked: ${claim}`);
      fingerprints.add(fingerprint);
    }
  }
}
assert(fingerprints.size === 500, `500 transit contacts must not collapse to duplicate full outputs; unique=${fingerprints.size}`);
const forward = transit.buildPersonalTransitBehavioralInterpretation({ id: "u-m", aspect: "trine", transitBody: "uranus", natalBody: "mars", exactAngle: 120, separation: 119.9, orb: 0.1, orbLimit: 5 }, "adult", { signId: "libra", houseNumber: 1, retrograde: true });
const reverse = transit.buildPersonalTransitBehavioralInterpretation({ id: "m-u", aspect: "trine", transitBody: "mars", natalBody: "uranus", exactAngle: 120, separation: 119.9, orb: 0.1, orbLimit: 5 }, "adult", { signId: "aquarius", houseNumber: 5 });
assert(forward.attention !== reverse.attention, "transit direction must materially change the story");
assert(forward.attention.includes("اورانوس") && forward.attention.includes("مریخ") && forward.attention.includes("لیبرا") && forward.attention.includes("خانهٔ ۱"), "Uranus -> natal Mars fixture must expose body, sign, house, and direction");
assert(forward.scenario.includes("پس‌رو") || forward.attention.includes("پس‌رو") || forward.friction.includes("پس‌رو"), "retrograde natal context must be integrated when supplied");
for (const key of ["saturn->venus", "pluto->moon", "jupiter->mercury", "uranus->mars"]) assert(matrix.PERSONAL_TRANSIT_PAIR_SEMANTIC_CORES[key]?.thesis?.length > 40, `targeted transit pair override missing: ${key}`);
const oldSnapshot = transit.buildPersonalTransitBehavioralInterpretation({ id: "old", aspect: "square", transitBody: "saturn", natalBody: "venus", exactAngle: 90, orb: 0.3, orbLimit: 5 }, "adult");
assert(oldSnapshot.technicalDetail.includes("زاویهٔ واقعی در snapshot قدیمی ذخیره نشده"), "old snapshot must disclose missing separation");
assert(!oldSnapshot.technicalDetail.includes(display.formatReportTechnicalAngle(90.3)) && !oldSnapshot.technicalDetail.includes(display.formatReportTechnicalAngle(89.7)), "old snapshot must never reconstruct target +/- orb as actual separation");
assert(!/زاویهٔ واقعی\s+[۰-۹]/u.test(oldSnapshot.technicalDetail), "old snapshot must not show fabricated numeric actual separation");

const bridge = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const section = read("components/PersonalTransitReportSection.tsx");
const probe = read("src/lib/chart/natal-to-transit-calculation-probe.ts");
const relevance = read("src/lib/report-output/personal-transit-relevance.ts");
assert(bridge.includes("exactAngle: roundToTwo(aspect.exactAngle)") && bridge.includes("separation: roundToTwo(aspect.separation)"), "bridge must preserve stored exactAngle and separation");
assert(bridge.includes("natalBody?.signId") && bridge.includes('motion?.status === "retrograde"'), "bridge must pass natal sign and retrograde context without recalculation");
assert(bridge.includes("currentResidenceRequired: true") && bridge.includes("noSilentTehranDefaultForPersonalTransit: true"), "current-residence trust boundary must remain unchanged");
assert(section.includes("formatReportNarrativeAngle") && section.includes("aspect.separation"), "visible title/header must use stored actual separation");
assert(!section.includes("ASPECT_LABELS_FA") && !section.includes("ASPECT_ANGLE_LABELS_FA"), "normal visible transit surface must not depend on lexical aspect labels");
assert(!relevance.includes("و این موضوع را مستقیم به") && !relevance.includes("بهترین استفاده این است که") && !relevance.includes("وقتی فشار بالا می‌رود"), "legacy transit scaffolds must be removed from writer source");
assert(probe.includes("return aspects.sort((left, right) => left.orb - right.orb);"), "calculation/selection source must remain untouched");

if (failures.length > 0) { console.error("Deep narrative personal transit synthesis guard failed:"); for (const failure of failures) console.error(`- ${failure}`); process.exit(1); }
console.log("HALLEUS_DEEP_NARRATIVE_SLICE4_PERSONAL_TRANSIT_SYNTHESIS_GUARD_PASS");
console.log("PAIR_CORES=100");
console.log("ASPECT_DYNAMICS=5");
console.log("TRANSIT_CONTACTS=500");
console.log("OLD_SNAPSHOT_NO_FABRICATED_ANGLE=PASS");
console.log("CURRENT_RESIDENCE_BOUNDARY=PASS");
