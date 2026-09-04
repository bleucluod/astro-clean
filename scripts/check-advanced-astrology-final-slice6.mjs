// HALLEUS_R39_SLICE6_DIRECT_OPENING_SOURCE_R5_20260902
// HALLEUS_R39_NARRATIVE_RECOMPOSITION_GUARD_OWNERSHIP_R4_20260902
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const requireFromRepo = createRequire(path.join(root, "package.json"));
const ts = requireFromRepo("typescript");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
function assert(condition, message) { if (!condition) throw new Error(message); }
function assertIncludes(label, text, markers) { for (const marker of markers) assert(text.includes(marker), `${label} missing marker: ${marker}`); }
function assertNotIncludes(label, text, markers) { for (const marker of markers) assert(!text.includes(marker), `${label} contains forbidden marker: ${marker}`); }

const policySource = read("lib/astrology/report-advanced-wheel-policy.ts");
const wheelSource = read("components/ReportBirthChartWheel.tsx");
const labPage = read("app/asteroid-lab/page.tsx");
const adaptiveUi = read("components/report/ReportAdaptiveNarrative.tsx");
const asteroidLab = read("src/lib/chart/asteroid-lab.ts");

assertIncludes("wheel policy", policySource, [
  'REPORT_ADVANCED_WHEEL_POLICY_VERSION',
  '"north-node"', '"south-node"', '"black-moon-lilith"', '"chiron"', '"part-of-fortune"', '"vertex"',
  '"ceres"', '"pallas"', '"juno"', '"vesta"', '"eris"', '"pholus"', '"nessus"',
  'MAX_RELEVANT_FIXED_STARS = 2',
  'MAX_DEFAULT_ADVANCED_LINES = 4',
  'MAX_OPTIONAL_ADVANCED_LINES = 4',
  'asteroidLabAutoIncluded: false',
  'pointVisibilityIndependentFromAspectLines: true',
  'item.evidenceKind === "fixed-star-conjunction"',
  'item.evidenceKind !== "special-point-aspect"',
]);
assertIncludes("report wheel", wheelSource, [
  'buildReportAdvancedWheelPolicy',
  'appendAdvancedWheelOverlay(svg, data, advancedWheel, showAdvancedPoints)',
  'data-report-advanced-wheel-mode',
  'data-report-advanced-wheel-controls',
  'data-halleus-advanced-wheel-overlay',
  'appendLilithOverlay(svg, data)',
]);
assertIncludes("Asteroid Lab selected-only wheel", labPage, [
  'function SelectedAsteroidWheel',
  'data-asteroid-lab-selected-only-wheel="true"',
  'calculated ? <SelectedAsteroidWheel result={calculated} /> : null',
  'فقط سیارکی که خودت جست‌وجو و محاسبه می‌کنی',
]);
assertNotIncludes("Asteroid Lab page", labPage, [
  'CURATED_ASTEROID_LAB_CATALOG.map',
  'mainReportPromotion:"automatic"',
]);
assertIncludes("Asteroid collisions", asteroidLab, ["بلک مون لیلیت", "سهم اروس", 'mainReportPromotion:"not-automatic"']);
assertNotIncludes("adaptive report architecture", adaptiveUi, [
  'data-adaptive-report-section="advanced-astrology"',
  'data-adaptive-report-section="fixed-stars"',
  'data-adaptive-report-section="traditional-lots"',
]);
assertIncludes("adaptive report architecture", adaptiveUi, ["StoryCard", "EvidenceDisclosure"]);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "halleus-slice6-wheel-policy-"));
const policyCjs = path.join(tmp, "policy.cjs");
const plannerCjs = path.join(tmp, "planner.cjs");
const transpiled = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  fileName: "report-advanced-wheel-policy.ts",
  reportDiagnostics: true,
});
assert(!(transpiled.diagnostics ?? []).some((item) => item.category === ts.DiagnosticCategory.Error), "wheel policy transpile diagnostics contain errors");
fs.writeFileSync(plannerCjs, `let current = null; exports.__setPlan = (value) => { current = value; }; exports.buildAdaptiveReportPlan = () => current;`, "utf8");
fs.writeFileSync(policyCjs, transpiled.outputText.replace('require("@/lib/astrology/adaptive-report-planner")', 'require("./planner.cjs")'), "utf8");
const require = createRequire(import.meta.url);
const plannerStub = require(plannerCjs);
const policy = require(policyCjs);

const defaultIds = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","asc","dsc","mc","ic","north-node","south-node","black-moon-lilith","chiron","part-of-fortune","vertex"];
assert(JSON.stringify(policy.REPORT_WHEEL_DEFAULT_VISIBLE_IDS) === JSON.stringify(defaultIds), "default wheel policy does not match Slice 6 contract");
assert(JSON.stringify(policy.REPORT_WHEEL_ADVANCED_TOGGLE_IDS) === JSON.stringify(["ceres","pallas","juno","vesta","eris","pholus","nessus"]), "advanced toggle ids changed");

const calculatedPoint = (id, longitude) => ({ status:"calculated", id, longitude, signId:"aries", degreeInSign:longitude%30, house:2 });
const report = {
  id:"slice6-fixture",
  createdAt:"2026-09-01T00:00:00.000Z",
  input:{ birthDate:"1997-02-13", birthTime:"20:20", birthTimeAccuracy:"known", birthCity:"Mianeh", birthCountry:"Iran" },
  chart:{ risingSign:{key:"aries"} },
  realEngine:{
    placements:[
      {id:"sun",label:"Sun",longitude:324,signId:"aquarius",degreeInSign:24,house:6},
      {id:"venus",label:"Venus",longitude:310,signId:"aquarius",degreeInSign:10,house:5},
      {id:"pluto",label:"Pluto",longitude:245,signId:"sagittarius",degreeInSign:5,house:3},
    ],
    angles:{ asc:{id:"asc",longitude:150}, dsc:{id:"dsc",longitude:330}, mc:{id:"mc",longitude:60}, ic:{id:"ic",longitude:240} },
    lunarNodes:{status:"calculated",northNode:{longitude:180},southNode:{longitude:0}},
    lilith:{status:"calculated",approvedForReportOutput:true,longitude:222},
    specialPoints:[
      calculatedPoint("chiron",325), calculatedPoint("part-of-fortune",151), calculatedPoint("vertex",61),
      calculatedPoint("ceres",40), calculatedPoint("pallas",80), calculatedPoint("juno",130), calculatedPoint("vesta",170),
      calculatedPoint("eris",210), calculatedPoint("pholus",250), calculatedPoint("nessus",290),
    ],
    specialistAstrology:{ fixedStars:{ stars:[
      {id:"regulus",labelFa:"رگولوس",labelEn:"Regulus",longitude:150.4},
      {id:"spica",labelFa:"اسپیکا",labelEn:"Spica",longitude:204.4},
    ] } },
  },
};
const decisions = [
  { id:"d-chiron", evidenceKind:"special-point-aspect", objectIds:["chiron"], sourceIds:["chiron","sun"], score:91, decision:"merge", aspectId:"conjunction", orbDegrees:1 },
  { id:"d-juno", evidenceKind:"special-point-aspect", objectIds:["juno"], sourceIds:["juno","venus"], score:88, decision:"merge", aspectId:"opposition", orbDegrees:1.2 },
  { id:"d-nessus-weak", evidenceKind:"special-point-aspect", objectIds:["nessus"], sourceIds:["nessus","pluto"], score:60, decision:"support", aspectId:"conjunction", orbDegrees:0.4 },
  { id:"star-regulus", evidenceKind:"fixed-star-conjunction", objectIds:["regulus"], sourceIds:["regulus","asc"], score:82, decision:"support", aspectId:"conjunction", orbDegrees:0.4 },
  { id:"star-spica", evidenceKind:"fixed-star-conjunction", objectIds:["spica"], sourceIds:["spica","venus"], score:40, decision:"suppress", aspectId:"conjunction", orbDegrees:0.8 },
  { id:"lot-eros", evidenceKind:"traditional-lot", objectIds:["eros"], sourceIds:["lot:eros"], score:95, decision:"support", aspectId:null, orbDegrees:null },
];
plannerStub.__setPlan({ advancedRelevance:{ birthTimeReliable:true, decisions } });
const ready = policy.buildReportAdvancedWheelPolicy(report);
assert(ready.defaultMarkers.map((item) => item.id).join(",") === "north-node,south-node,chiron,part-of-fortune,vertex", "default overlay markers are incorrect");
assert(ready.advancedMarkers.length === 7 && ready.advancedMarkers.some((item) => item.id === "juno"), "advanced markers do not expose the seven approved toggle points");
assert(ready.relevantFixedStars.length === 1 && ready.relevantFixedStars[0].id === "regulus", "fixed-star relevance filter leaked suppressed/unrelated stars");
assert(ready.defaultAspectLines.length <= 4 && ready.defaultAspectLines.some((line) => line.id === "d-chiron"), "default high-relevance line policy failed");
assert(ready.advancedAspectLines.length <= 4 && ready.advancedAspectLines.some((line) => line.id === "d-juno"), "advanced high-relevance line policy failed");
assert(![...ready.defaultAspectLines,...ready.advancedAspectLines].some((line) => line.id.includes("star-") || line.id.includes("lot-") || line.firstId.startsWith("asteroid:")), "minor/fixed-star/Lot line spam entered report wheel");
assert(ready.asteroidLabAutoIncluded === false && ready.pointVisibilityIndependentFromAspectLines === true, "wheel separation contract changed");

plannerStub.__setPlan({ advancedRelevance:{ birthTimeReliable:false, decisions } });
const uncertain = policy.buildReportAdvancedWheelPolicy({ ...report, input:{...report.input,birthTimeAccuracy:"unknown"} });
assert(!uncertain.defaultMarkers.some((item) => item.id === "part-of-fortune" || item.id === "vertex"), "unreliable birth time kept angle-derived Fortune/Vertex markers");
assert(uncertain.suppressedAngleDerivedIds.includes("part-of-fortune") && uncertain.suppressedAngleDerivedIds.includes("vertex"), "uncertain-time suppression is not explicit");

console.log("Slice 6 advanced astrology final integration guard passed.");
console.log("- default wheel point contract and seven-point advanced toggle are explicit");
console.log("- relevant fixed stars are filtered and capped; Asteroid Lab never auto-enters report wheel");
console.log("- advanced aspect lines are relevance-gated/capped independently from marker visibility");
console.log("- selected asteroid wheel renders only the user-selected calculated asteroid");
console.log("- unreliable birth time suppresses angle-derived Fortune/Vertex overlay evidence");

// Slice 6 realistic fixture closure: sect, cusp, Asteroid Lab search/failure/motion.
const lotsSource = read("src/lib/chart/hermetic-lots.ts");
const housesSource = read("src/lib/chart/houses.ts");
const labSource = read("src/lib/chart/asteroid-lab.ts");
const realEngineSource = read("src/lib/chart/real-chart-engine.ts");

function transpileCjs(source, fileName) {
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName,
    reportDiagnostics: true,
  });
  assert(!(result.diagnostics ?? []).some((item) => item.category === ts.DiagnosticCategory.Error), `${fileName} transpile diagnostics contain errors`);
  return result.outputText;
}

const fixtureTmp = fs.mkdtempSync(path.join(os.tmpdir(), "halleus-slice6-realistic-fixtures-"));
try {
  // Day/night traditional Lots use the same validated Fortune point but reverse sect formulas.
  fs.writeFileSync(path.join(fixtureTmp, "normalized-stub.cjs"), "exports.normalizeChartPlacement = () => ({house:{house:null}});", "utf8");
  const lotsCjs = transpileCjs(lotsSource, "hermetic-lots.ts")
    .replace('require("./normalized-chart")', 'require("./normalized-stub.cjs")');
  const lotsPath = path.join(fixtureTmp, "lots.cjs");
  fs.writeFileSync(lotsPath, lotsCjs, "utf8");
  const lots = require(lotsPath);
  const lotChart = {
    houseContext: { housesReady: false },
    houses: [],
    placements: [
      ["sun", 320], ["moon", 120], ["mercury", 300], ["venus", 280],
      ["mars", 210], ["jupiter", 250], ["saturn", 40],
    ].map(([id, normalizedLongitude]) => ({ id, normalizedLongitude })),
  };
  const fortune = (sect) => ({ status:"calculated", id:"part-of-fortune", longitude:155, calculationContext:{sect} });
  const dayLots = lots.calculateTraditionalLots({ chart:lotChart, ascendantLongitude:100, specialPoints:[fortune("day")] });
  const nightLots = lots.calculateTraditionalLots({ chart:lotChart, ascendantLongitude:100, specialPoints:[fortune("night")] });
  assert(dayLots.length === 7 && nightLots.length === 7, "day/night Lots fixture did not return seven Lots");
  const daySpirit = dayLots.find((item) => item.id === "spirit");
  const nightSpirit = nightLots.find((item) => item.id === "spirit");
  assert(daySpirit?.sect === "day" && nightSpirit?.sect === "night", "Lots lost sect context");
  assert(daySpirit?.formulaId === "spirit:asc+sun-moon" && nightSpirit?.formulaId === "spirit:asc+moon-sun", "Spirit day/night formula reversal failed");
  assert(daySpirit.longitude !== nightSpirit.longitude, "day/night Spirit fixture collapsed to one longitude");

  // Placement immediately around a cusp must switch houses deterministically at the cusp.
  fs.writeFileSync(path.join(fixtureTmp, "zodiac-stub.cjs"), `
exports.ZODIAC_SIGN_SIZE_DEGREES = 30;
exports.normalizeEclipticLongitude = (value) => { const n=value%360; return n<0?n+360:n; };
exports.getTropicalZodiacSignFromLongitude = (value) => { const n=exports.normalizeEclipticLongitude(value); const i=Math.floor(n/30); return {id:String(i),startDegree:i*30}; };
`, "utf8");
  const housesCjs = transpileCjs(housesSource, "houses.ts")
    .replace('require("./zodiac")', 'require("./zodiac-stub.cjs")');
  const housesPath = path.join(fixtureTmp, "houses.cjs");
  fs.writeFileSync(housesPath, housesCjs, "utf8");
  const houses = require(housesPath);
  const cuspSet = houses.buildPlacidusHouses(Array.from({length:12}, (_, index) => index * 30));
  assert(houses.getHouseNumberFromCusps(29.999, cuspSet) === 1, "pre-cusp placement fixture assigned wrong house");
  assert(houses.getHouseNumberFromCusps(30, cuspSet) === 2, "exact cusp placement fixture did not enter next house");
  assert(houses.getHouseNumberFromCusps(30.001, cuspSet) === 2, "post-cusp placement fixture assigned wrong house");

  // Use the real Halleus civil-time conversion for Mianeh, midnight, and a DST transition.
  fs.writeFileSync(path.join(fixtureTmp, "astronomy-engine-stub.cjs"), `
exports.Body = {Sun:"Sun",Moon:"Moon",Mercury:"Mercury",Venus:"Venus",Mars:"Mars",Jupiter:"Jupiter",Saturn:"Saturn",Uranus:"Uranus",Neptune:"Neptune",Pluto:"Pluto"};
`, "utf8");
  fs.writeFileSync(path.join(fixtureTmp, "engine-local-stub.cjs"), "module.exports = {};", "utf8");
  const engineCjs = transpileCjs(realEngineSource, "real-chart-engine.ts")
    .replace(/require\("\.\/[^"]+"\)/g, 'require("./engine-local-stub.cjs")')
    .replace('require("astronomy-engine")', 'require("./astronomy-engine-stub.cjs")');
  const enginePath = path.join(fixtureTmp, "real-chart-engine.cjs");
  fs.writeFileSync(enginePath, engineCjs, "utf8");
  const engine = require(enginePath);
  const roundTrip = (birthDate, birthTime, timezone) => {
    const utc = engine.zonedDateTimeToUtc(birthDate, birthTime, timezone);
    const formatter = new Intl.DateTimeFormat("en-CA", {timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
    const parts = Object.fromEntries(formatter.formatToParts(utc).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    assert(`${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}` === `${birthDate} ${birthTime}`, `timezone round-trip failed for ${timezone} ${birthDate} ${birthTime}`);
    return utc;
  };
  const mianehUtc = roundTrip("1997-02-13", "20:20", "Asia/Tehran");
  assert(mianehUtc.toISOString() === "1997-02-13T16:50:00.000Z", "primary Mianeh fixture UTC conversion changed");
  roundTrip("1992-08-12", "00:05", "Asia/Tehran");
  const berlinBefore = roundTrip("2024-03-31", "01:30", "Europe/Berlin");
  const berlinAfter = roundTrip("2024-03-31", "03:30", "Europe/Berlin");
  assert(berlinBefore.toISOString() === "2024-03-31T00:30:00.000Z", "pre-DST Berlin conversion changed");
  assert(berlinAfter.toISOString() === "2024-03-31T01:30:00.000Z", "post-DST Berlin conversion changed");

  // Asteroid Lab: user search, ambiguous alias, missing ephemeris, provider unavailable, and retrograde state sampling.
  fs.writeFileSync(path.join(fixtureTmp, "normalized-lab-stub.cjs"), "exports.normalizeChartPlacement = () => ({house:{house:null}});", "utf8");
  fs.writeFileSync(path.join(fixtureTmp, "provider-stub.cjs"), `
exports.readJplSmallBodyGeocentricBatchSync = ({requests}) => ({status:"ready",results:requests.map((request) => ({key:request.key,utcIso:request.utcDate.toISOString(),stateKmAndKmPerSecond:[request.key==="before"?11:request.key==="after"?9:10,0,0,0,0,0]}))});
`, "utf8");
  fs.writeFileSync(path.join(fixtureTmp, "state-stub.cjs"), "exports.stateToTrueEclipticOfDateLongitude = (state) => state[0];", "utf8");
  const labCjs = transpileCjs(labSource, "asteroid-lab.ts")
    .replace('require("./normalized-chart")', 'require("./normalized-lab-stub.cjs")')
    .replace('require("./jpl-spk-wasm-provider")', 'require("./provider-stub.cjs")')
    .replace('require("./jpl-main-asteroid-calculation")', 'require("./state-stub.cjs")');
  const labPath = path.join(fixtureTmp, "asteroid-lab.cjs");
  fs.writeFileSync(labPath, labCjs, "utf8");
  const lab = require(labPath);
  assert(lab.searchAsteroidLabCatalog("not-a-real-asteroid").status === "not-found", "custom asteroid not-found fixture failed");
  const lilith = lab.searchAsteroidLabCatalog("Lilith");
  const eros = lab.searchAsteroidLabCatalog("Eros");
  assert(lilith.status === "found" && lilith.entry.number === 1181 && lilith.entry.collisionClarification.includes("بلک مون لیلیت"), "1181 Lilith collision fixture failed");
  assert(eros.status === "found" && eros.entry.number === 433 && eros.entry.collisionClarification.includes("سهم اروس"), "433 Eros collision fixture failed");
  lab.CURATED_ASTEROID_LAB_CATALOG.push({ ...lilith.entry, number:999, spkFileId:20000999, labelFa:"duplicate", labelEn:"duplicate", aliases:["lilith"], collisionClarification:null });
  assert(lab.searchAsteroidLabCatalog("Lilith").status === "not-found", "ambiguous asteroid alias fixture did not fail closed");
  lab.CURATED_ASTEROID_LAB_CATALOG.pop();

  const emptyKernelDir = path.join(fixtureTmp, "missing-kernels");
  fs.mkdirSync(emptyKernelDir);
  const fakeChart = { houseContext:{housesReady:false}, houses:[] };
  const missing = lab.calculateCuratedAsteroidLab({ entry:eros.entry, utcDate:new Date("1997-02-13T17:00:00.000Z"), chart:fakeChart, kernelDirectory:emptyKernelDir });
  assert(missing.status === "blocked" && missing.reason === "missing-ephemeris-files", "missing asteroid ephemeris did not fail closed");

  const kernelDir = path.join(fixtureTmp, "stub-kernels");
  fs.mkdirSync(kernelDir);
  for (const file of ["naif0012.tls","de440s.bsp",`${eros.entry.spkFileId}.bsp`]) fs.writeFileSync(path.join(kernelDir,file), "fixture", "utf8");
  const retrograde = lab.calculateCuratedAsteroidLab({ entry:eros.entry, utcDate:new Date("1997-02-13T17:00:00.000Z"), chart:fakeChart, kernelDirectory:kernelDir });
  assert(retrograde.status === "calculated" && retrograde.motion.status === "retrograde" && retrograde.mainReportPromotion === "not-automatic", "retrograde supported asteroid fixture failed");

  fs.writeFileSync(path.join(fixtureTmp, "provider-unavailable-stub.cjs"), `
exports.readJplSmallBodyGeocentricBatchSync = () => ({status:"blocked",reason:"provider-unavailable",detail:"fixture unavailable provider"});
`, "utf8");
  const unavailableLabCjs = transpileCjs(labSource, "asteroid-lab-provider-unavailable.ts")
    .replace('require("./normalized-chart")', 'require("./normalized-lab-stub.cjs")')
    .replace('require("./jpl-spk-wasm-provider")', 'require("./provider-unavailable-stub.cjs")')
    .replace('require("./jpl-main-asteroid-calculation")', 'require("./state-stub.cjs")');
  const unavailableLabPath = path.join(fixtureTmp, "asteroid-lab-provider-unavailable.cjs");
  fs.writeFileSync(unavailableLabPath, unavailableLabCjs, "utf8");
  const unavailableLab = require(unavailableLabPath);
  const unavailable = unavailableLab.calculateCuratedAsteroidLab({ entry:unavailableLab.CURATED_ASTEROID_LAB_CATALOG.find((item) => item.number === 433), utcDate:new Date("1997-02-13T17:00:00.000Z"), chart:fakeChart, kernelDirectory:kernelDir });
  assert(unavailable.status === "blocked" && unavailable.reason === "provider-unavailable", "unavailable external asteroid provider did not fail closed");
} finally {
  fs.rmSync(fixtureTmp, { recursive:true, force:true });
}

console.log("- day/night traditional Lot formulas reverse by sect while Fortune is reused");
console.log("- pre/exact/post house-cusp assignment is deterministic");
console.log("- primary Mianeh, midnight, and Europe/Berlin DST civil-time conversions round-trip through the real engine helper");
console.log("- Asteroid Lab covers not-found, ambiguous alias, collision, missing-ephemeris, provider-unavailable, and retrograde fixtures");

// HALLEUS_ADVANCED_ASTROLOGY_FINAL_RECONCILIATION_R39_GUARD
const reconciliationAdaptive = read("components/report/ReportAdaptiveNarrative.tsx");
const reconciliationReader = read("components/report/ReportProductReader.tsx");
const reconciliationTechnical = read("components/report/ReportTechnicalAppendix.tsx");
const reconciliationSynthesis = read("lib/astrology/unified-story-synthesis.ts");
const reconciliationRelevance = read("lib/astrology/advanced-relevance-engine.ts");
const reconciliationCss = read("components/report/human-first-report.module.css");
assert(
  (() => {
    const currentOpeningSource = read(
      "components/report/ReportAdaptiveNarrative.tsx",
    );
    return (
      currentOpeningSource.includes("buildRecomposedOpeningStory") &&
      currentOpeningSource.includes(
        'data-adaptive-opening-story="recomposed-two-paragraphs"',
      ) &&
      currentOpeningSource.includes(
        'data-report-opening-story="dynamic-two-paragraph"',
      ) &&
      !currentOpeningSource.includes("function buildOpeningStory(") &&
      !currentOpeningSource.includes("type AdaptiveOpeningStory =")
    );
  })(),
  "R39 recomposed opening single-owner contract drifted",
);
assertNotIncludes("R39 adaptive prose", reconciliationAdaptive, [
  "مهم‌ترین داستان‌های این چارت",
  "این چارت بیشتر با یک تمرکز چندسیاره‌ای فهمیده می‌شود",
  "چند شاهد واقعی چارت",
  "به زور به یک فصل بلند تبدیل نمی‌کنیم",
]);
assertNotIncludes("R39 unified synthesis emitters", reconciliationSynthesis, [
  "item.score.toFixed(1)",
  "advanced-standalone passed Slice 4 relevance threshold",
  "سطح قطعیت روایت: قوی بر پایه چند شاهد مستقل/نزدیک",
  "یک موضوع فرعی نیست.",
]);
assertNotIncludes("R39 relevance", reconciliationRelevance, ["advanced evidence item(s)"]);
assertIncludes("R39 wheel policy", policySource, ["chironAvailable: boolean", 'chironAvailable: points.has("chiron")']);
assertIncludes("R39 wheel", wheelSource, [
  'data-report-chiron-unavailable="true"',
  'data-report-advanced-wheel-degree',
]);
assertIncludes("R39 technical", reconciliationTechnical, [
  'useState<AstrologyTab>("placements")',
  'label: "دادهٔ خام محاسبه"',
]);
assertNotIncludes("R39 reader", reconciliationReader, [
  "اول خود چارت را می‌بینی",
  "°/day · window ",
]);
assertIncludes("R39 reader Persian transit", reconciliationReader, [
  "طول دایره‌البروجی",
  "بازهٔ نمونه",
  "formatTransitMotionLabel",
]);
assertIncludes("R39 CSS", reconciliationCss, ["HALLEUS_ADVANCED_ASTROLOGY_FINAL_RECONCILIATION_R39_20260901", ".adaptiveOpeningStory"]);
console.log("Final reconciliation R39 guard passed.");
