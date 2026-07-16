import { readFileSync } from "node:fs";
import ts from "typescript";

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

function loadTransitModule() {
  const source = read("src/lib/report-output/personal-transit-relevance.ts");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });

  const diagnostics = result.diagnostics ?? [];
  assert(
    diagnostics.length === 0,
    `personal transit relevance helper has ${diagnostics.length} transpile diagnostic(s)`,
  );

  const loadedModule = { exports: {} };
  const evaluate = new Function("exports", "module", result.outputText);
  evaluate(loadedModule.exports, loadedModule);
  return loadedModule.exports;
}

const transit = loadTransitModule();
const aspects = [
  { id: "outer-1", aspect: "conjunction", transitBody: "pluto", natalBody: "neptune", orb: 0.01, orbLimit: 4 },
  { id: "outer-2", aspect: "trine", transitBody: "uranus", natalBody: "pluto", orb: 0.02, orbLimit: 4 },
  { id: "sun-contact", aspect: "square", transitBody: "saturn", natalBody: "sun", orb: 1.2, orbLimit: 5 },
  { id: "moon-contact", aspect: "sextile", transitBody: "mars", natalBody: "moon", orb: 2, orbLimit: 5 },
  { id: "ruler-contact", aspect: "trine", transitBody: "jupiter", natalBody: "mercury", orb: 0.5, orbLimit: 5 },
  { id: "ruler-repeat-1", aspect: "conjunction", transitBody: "mercury", natalBody: "mercury", orb: 0.2, orbLimit: 5 },
  { id: "ruler-repeat-2", aspect: "square", transitBody: "venus", natalBody: "mercury", orb: 0.1, orbLimit: 5 },
  { id: "venus-contact", aspect: "opposition", transitBody: "saturn", natalBody: "venus", orb: 0.3, orbLimit: 5 },
];

const selected = transit.selectPersonalTransitHighlights(aspects, {
  chartRulerId: "mercury",
  angularNatalBodyIds: ["moon", "mercury"],
  activeNatalBodyIds: ["sun", "venus"],
  maxVisible: 5,
});

assert(selected.length === 5, "selector must choose five visible contacts when enough candidates exist");
assert(selected.some((aspect) => aspect.natalBody === "sun"), "natal Sun contact must outrank narrow outer-only contacts");
assert(selected.some((aspect) => aspect.natalBody === "moon"), "natal Moon contact must remain visible");
assert(selected.some((aspect) => aspect.natalBody === "mercury"), "chart-ruler contact must remain visible");
assert(
  selected.filter((aspect) => ["uranus", "neptune", "pluto"].includes(aspect.transitBody) && ["uranus", "neptune", "pluto"].includes(aspect.natalBody)).length <= 1,
  "outer-to-outer contacts must not occupy multiple visible slots",
);
const natalCounts = new Map();
for (const aspect of selected) natalCounts.set(aspect.natalBody, (natalCounts.get(aspect.natalBody) ?? 0) + 1);
assert(Math.max(...natalCounts.values()) <= 2, "repeated natal-body penalty must preserve diversity");
assert(aspects[0].id === "outer-1" && aspects[1].id === "outer-2", "selector must not mutate raw aspect order");

const adultOne = transit.buildPersonalTransitBehavioralInterpretation(aspects[2], "adult");
const adultTwo = transit.buildPersonalTransitBehavioralInterpretation(aspects[7], "adult");
const caregiver = transit.buildPersonalTransitBehavioralInterpretation(aspects[3], "caregiver");
const adultFingerprint = [adultOne.attention, adultOne.scenario, adultOne.helpful, adultOne.friction, adultOne.action].join("\n");
const secondFingerprint = [adultTwo.attention, adultTwo.scenario, adultTwo.helpful, adultTwo.friction, adultTwo.action].join("\n");

assert(adultFingerprint !== secondFingerprint, "different transit contacts must not share generic copy");
assert(adultOne.attention.includes("زحل") && adultOne.attention.includes("هویت"), "copy must use both transiting and natal roles");
assert(adultOne.scenario.includes("ممکن"), "scenario must remain probabilistic and retrospective");
assert(!adultFingerprint.includes("حتماً") && !adultFingerprint.includes("خواهد"), "copy must not claim certainty or predict future events");
assert(caregiver.scenario.includes("کودک") || caregiver.action.includes("کودک"), "caregiver mode must speak to the caregiver about the child");
assert(!caregiver.scenario.includes("شغل") && !caregiver.scenario.includes("عاشقانه"), "caregiver mode must avoid adult assumptions");
assert(adultOne.technicalDetail.includes("اورب") && adultOne.technicalDetail.includes("قطعیت"), "each interpretation must keep technical orb detail without event certainty");

const bridge = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const section = read("components/PersonalTransitReportSection.tsx");
const service = read("lib/report-generation/report-generation-service.ts");
const probe = read("src/lib/chart/natal-to-transit-calculation-probe.ts");
const packageJson = JSON.parse(read("package.json"));

for (const marker of [
  "probeResult.aspects.slice(0, 8).map(toAspectSummary)",
  "selectPersonalTransitHighlights",
  "visibleAspectHighlights",
  "technicalDisclaimer",
  "audienceMode",
]) {
  assert(bridge.includes(marker), `bridge missing marker: ${marker}`);
}
assert(bridge.includes("probeResult.aspects,\n    context"), "selector must see the full calculated aspect inventory before backing slice");
assert(service.includes("report.realEngine ?? realEngineSnapshot"), "generation must use stored natal context, not a second chart calculation");
assert(service.includes("getBehavioralChartRulerId"), "generation must pass chart-ruler relevance");
assert(service.includes("angularNatalBodyIds") && service.includes("activeNatalBodyIds"), "generation must pass angular and active natal context");
assert(!service.includes("Tehran") && !service.includes("تهران"), "Batch 4 must not add a hidden Tehran fallback");
assert(section.includes("Array.isArray(data.visibleAspectHighlights)"), "old bridge compatibility must be explicit");
assert(section.includes("selectPersonalTransitHighlights(data.aspectHighlights"), "old bridges must reuse stored aspects without recompute");
assert(section.includes("سناریوی احتمالی همان بازه"), "visible cards must expose the probabilistic scenario role");
assert(section.includes("وقتی خوب استفاده می‌شود"), "visible cards must expose the helpful role");
assert(section.includes("کار کوچک"), "visible cards must expose a small action");
assert((section.match(/data-personal-transit-technical-disclaimer=/g) ?? []).length === 1, "visible section must render exactly one technical disclaimer");
assert(!section.includes("fetch(") && !section.includes("navigator.geolocation") && !section.includes("localStorage"), "reopen rendering must not recompute or infer location");
assert(probe.includes("return aspects.sort((left, right) => left.orb - right.orb);"), "raw calculation output must remain orb-sorted and unchanged");
assert(packageJson.scripts?.["check:personal-transit-relevance-interpretation"] === "node scripts/check-personal-transit-relevance-interpretation.mjs", "package.json must expose the focused Batch 4 guard");

if (failures.length > 0) {
  console.error("Personal transit relevance/interpretation guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Personal transit relevance/interpretation guard passed.");
console.log("- luminary, ruler, personal, angular, active, orb, and diversity factors are deterministic");
console.log("- outer-only contacts cannot consume the visible set");
console.log("- behavioral cards use both transit and natal roles with audience-aware probabilistic copy");
console.log("- raw calculations, stored timestamp/location, old bridges, and no-recompute behavior remain intact");
