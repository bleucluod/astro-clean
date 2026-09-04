// HALLEUS_REPORT_MANUAL_MOBILE_REVIEW_REFINEMENT_R3_20260904
import { readFileSync } from "node:fs";
import ts from "typescript";

const failures = [];
const read = (path) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

function loadAdapter(source) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert(errors.length === 0, `adapter has ${errors.length} transpile error(s)`);

  const cjsModule = { exports: {} };
  new Function("exports", "module", result.outputText)(
    cjsModule.exports,
    cjsModule,
  );
  return cjsModule.exports;
}

const adapterSource = read(
  "src/lib/report-output/report-birth-chart-wheel-data.ts",
);
const componentSource = read("components/ReportBirthChartWheel.tsx");
const readerSource = read("components/report/ReportProductReader.tsx");
const globalCss = read("app/globals.css");
const packageJson = JSON.parse(read("package.json"));
const astroChartPackage = JSON.parse(
  read("node_modules/@astrodraw/astrochart/package.json"),
);
const adapter = loadAdapter(adapterSource);
const planetIds = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];
const placements = planetIds.map((id, index) => ({
  id,
  label: id,
  longitude: index * 31 + 0.25,
  signId: "aries",
  degreeInSign: index + 0.25,
  method: "stored-fixture",
}));
const zodiacIds = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
];
const houses = Array.from({ length: 12 }, (_, index) => ({
  number: index + 1,
  cuspLongitude: index * 30 + 0.5,
  signId: zodiacIds[index],
  degreeInSign: index + 0.5,
}));
const storedAspect = {
  id: "stored-sun-moon",
  firstPlanetId: "sun",
  firstPlanetLabel: "خورشید",
  secondPlanetId: "moon",
  secondPlanetLabel: "ماه",
  aspectId: "square",
  aspectLabel: "چالش سازنده",
  glyph: "□",
  angle: 90,
  separation: 94.5,
  orb: 4.5,
  meaning: "stored meaning",
  narrative: "stored narrative",
};
const storedAspectPairs = [
  ["sun", "mercury"],
  ["sun", "venus"],
  ["sun", "mars"],
  ["moon", "mercury"],
  ["moon", "venus"],
  ["moon", "mars"],
  ["mercury", "venus"],
  ["mercury", "mars"],
  ["venus", "mars"],
  ["jupiter", "saturn"],
  ["uranus", "neptune"],
  ["neptune", "pluto"],
  ["saturn", "pluto"],
];
const storedAspectInventory = storedAspectPairs.map(
  ([firstPlanetId, secondPlanetId], index) => ({
    ...storedAspect,
    id: `stored-extra-${index}`,
    firstPlanetId,
    secondPlanetId,
    aspectId: ["trine", "sextile", "square", "opposition", "conjunction"][
      index % 5
    ],
    angle: [120, 60, 90, 180, 0][index % 5],
    orb: (index + 1) / 10,
  }),
);
const report = {
  realEngine: {
    ascendantLongitude: 42.75,
    houseSystem: "placidus",
    houseContext: { availability: "ready", unavailableReason: null },
    houses,
    placements: [
      ...placements,
      { ...placements[0], id: "black-moon-lilith" },
      { ...placements[0], id: "north-node" },
    ],
    aspectHighlights: [
      storedAspect,
      { ...storedAspect, id: "excluded", secondPlanetId: "black-moon-lilith" },
    ],
    aspects: [storedAspect, ...storedAspectInventory],
    retrogrades: {
      status: "calculated",
      planetIds: ["mercury", "black-moon-lilith", "north-node"],
    },
  },
};

const placementsBefore = JSON.stringify(report.realEngine.placements);
const ready = adapter.buildReportBirthChartWheelData(report);
assert(ready.status === "ready", "complete stored data must produce a ready wheel");
assert(
  JSON.stringify(Object.keys(ready.data?.planets ?? {})) ===
    JSON.stringify([
      "Sun",
      "Moon",
      "Mercury",
      "Venus",
      "Mars",
      "Jupiter",
      "Saturn",
      "Uranus",
      "Neptune",
      "Pluto",
    ]),
  "adapter must expose exactly the ten approved AstroChart planet keys",
);
assert(
  Object.values(ready.data?.planets ?? {}).every(
    ([longitude], index) => longitude === placements[index].longitude,
  ) && ready.data?.placements.length === 10,
  "AstroChart planet longitudes must preserve stored report identity",
);
assert(
  JSON.stringify(ready.data?.cusps) ===
    JSON.stringify(houses.map(({ cuspLongitude }) => cuspLongitude)),
  "all twelve cusps must preserve stored report identity",
);
assert(
  ready.data?.aspects.length === 8 &&
    ready.data.aspects[0] === storedAspect &&
    ready.data.aspects.slice(1).every((aspect, index) => aspect.orb === (index + 1) / 10),
  "wheel must keep weighted highlights first, then add the tightest stored aspects adaptively",
);
const expandedStoredSelection = adapter.selectStoredWheelAspects(
  storedAspectInventory.slice(0, 8),
  storedAspectInventory,
);
assert(
  expandedStoredSelection.length === 12 &&
    expandedStoredSelection.every((aspect) => storedAspectInventory.includes(aspect)),
  "dense reports may show up to twelve stored lines without synthesizing aspects",
);
assert(
  JSON.stringify(ready.data?.retrogradePlanetIds) === JSON.stringify(["mercury"]),
  "retrogrades must remain inside the ten-planet allowlist",
);
assert(
  JSON.stringify(ready.data?.planets.Mercury) ===
    JSON.stringify([placements[2].longitude, -1]) &&
    JSON.stringify(ready.data?.planets.Sun) ===
      JSON.stringify([placements[0].longitude]),
  "AstroChart may mark only stored report retrogrades with its display tuple",
);
assert(
  JSON.stringify(report.realEngine.placements) === placementsBefore,
  "adapter must not mutate report data",
);

const partial = adapter.buildReportBirthChartWheelData({
  realEngine: { ...report.realEngine, houses: [] },
});
assert(partial.status === "partial", "missing cusps must use the partial state");
assert(partial.data?.houses.length === 0, "partial state must not synthesize houses");

const unavailable = adapter.buildReportBirthChartWheelData({
  realEngine: {
    ...report.realEngine,
    placements: report.realEngine.placements.filter(({ id }) => id !== "pluto"),
  },
});
assert(
  unavailable.status === "unavailable" &&
    unavailable.reason === "incomplete-planet-data",
  "incomplete planet data must use the unavailable state",
);
assert(
  adapter.buildReportBirthChartWheelData({}).status === "unavailable",
  "missing engine data must use the unavailable state",
);

for (const marker of [
  "REPORT_BIRTH_CHART_WHEEL_PLANET_IDS",
  "REPORT_BIRTH_CHART_WHEEL_ASTROCHART_NAMES",
  "snapshot.placements",
  "house.cuspLongitude",
  "snapshot.aspectHighlights",
  "snapshot.aspects",
  "selectStoredWheelAspects",
  "REPORT_BIRTH_CHART_WHEEL_MAX_ASPECT_LINES",
]) {
  assert(adapterSource.includes(marker), `adapter missing marker: ${marker}`);
}
for (const forbidden of [
  "astronomy-engine",
  "buildRealChart",
  "calculateAspect",
  "calculateRealEngineAspects",
  "personalTransit",
  "SkyPulse",
  "lunarNodes",
]) {
  assert(!adapterSource.includes(forbidden), `adapter crossed boundary: ${forbidden}`);
}
// HALLEUS_R39_WHEEL_GUARD_RECONCILIATION_R11_20260901
assert(
  adapterSource.includes("RealEngineReportLilith") &&
    adapterSource.includes("buildWheelLilithPlacement(snapshot.lilith)") &&
    adapterSource.includes("lilith.approvedForReportOutput !== true") &&
    adapterSource.includes('id: "lilith"'),
  "adapter may include only the approved stored Black Moon Lilith placement",
);
assert(
  componentSource.includes("buildReportBirthChartWheelData(report)") &&
    componentSource.includes('data-report-birth-chart-wheel-source="stored-report-engine-data"'),
  "wrapper must adapt stored data before rendering the wheel",
);
assert(
  componentSource.includes(
    'await import("@astrodraw/astrochart")',
  ) &&
    componentSource.includes("new Chart(") &&
    componentSource.includes("chart.radix({") &&
    componentSource.includes("planets: data.planets") &&
    componentSource.includes("cusps: data.cusps"),
  "report wheel must use the official AstroChart radix renderer on the client",
);
assert(
  componentSource.includes("radix.aspects(storedAspects)") &&
    componentSource.includes('data-astrochart-aspect-mode="stored-report-only"') &&
    !componentSource.includes("new AspectCalculator") &&
    !componentSource.includes("radix.aspects()"),
  "AstroChart may draw only stored Halleus aspects and must not calculate replacements",
);
assert(
  componentSource.includes("styleStoredAspectLines(svg, data, activePattern)") &&
    componentSource.includes("appendPatternPlanetHighlights(svg, data, activePattern)") &&
    componentSource.includes('data-active-chart-pattern') &&
    componentSource.includes('data-halleus-aspect-weight') &&
    componentSource.includes('data-report-birth-chart-aspect-count={data.aspects.length}'),
  "stored aspect lines must expose report-specific count and stored-orb visual weight",
);
assert(
  componentSource.includes(
    'data-report-birth-chart-renderer={ASTROCHART_RENDERER_VERSION}',
  ) && !componentSource.includes("RealChartWheel"),
  "report wheel must identify AstroChart and must not fall back to the legacy renderer",
);
for (const signId of [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
]) {
  assert(
    componentSource.includes(`label: ZODIAC_LABELS.${signId}.faName`),
    `Wheel guide must read the canonical Halleus zodiac label for: ${signId}`,
  );
}
for (const darkToken of [
  'COLOR_BACKGROUND: "#0B0D11"',
  'POINTS_COLOR: "#F4F6F8"',
  'SIGNS_COLOR: "#E5EAF0"',
  'CIRCLE_COLOR: "#4B535E"',
  'LINE_COLOR: "#3A424C"',
]) {
  assert(componentSource.includes(darkToken), `Report wheel lost /sky dark token: ${darkToken}`);
}
assert(
  componentSource.includes('data-report-birth-chart-wheel-guide="persian"') &&
    componentSource.includes(
      'data-report-birth-chart-retrograde-source="stored-report-only"',
    ) &&
    componentSource.includes("حرکت برگشتی") &&
    !componentSource.includes("حرکت برگشتی سیاره هنگام تولد") &&
    componentSource.includes(
      '<p className="section-label">چارت دایره‌ای</p>',
    ) &&
    !componentSource.includes("<h2>چرخ چارت تولد</h2>") &&
    componentSource.includes("برگشتی در این چارت") &&
    componentSource.includes(
      'className="report-astrochart-wheel-retrograde-section"',
    ) &&
    componentSource.includes("H1–H12") &&
    componentSource.includes("WHEEL_AXIS_GUIDE") &&
    componentSource.includes("نشانه‌های تکمیلی") &&
    !componentSource.includes("راهنمای چرخ چارت"),
  "the Persian guide must explain signs, axes, houses, and stored retrogrades",
);
for (const marker of [
  "WHEEL_PLANET_GUIDE",
  "☉",
  "☽",
  "☿",
  "♀",
  "♂",
  "♃",
  "♄",
  "♅",
  "♆",
  "♇",
  "رنگ رابطه‌های زاویه‌ای",
  'formatReportAspectDisplay("trine")',
  'formatReportAspectDisplay("sextile")',
  'formatReportAspectDisplay("square")',
  'formatReportAspectDisplay("opposition")',
  'formatReportAspectDisplay("conjunction")',
  "تعداد و ضخامت خط‌ها",
]) {
  assert(componentSource.includes(marker), `expanded wheel guide missing: ${marker}`);
}
for (const forbiddenAspectName of ["تثلیث", "تسدیس", "مربع", "مقابله", "مقارنه"]) {
  assert(
    !componentSource.includes(forbiddenAspectName),
    `wheel guide leaked forbidden aspect name: ${forbiddenAspectName}`,
  );
}
assert(
  componentSource.includes("appendStoredCuspLabels(svg, data)") &&
    componentSource.includes('"data-cusp-label-source", "stored-report-houses"') &&
    componentSource.includes("house.degreeInSign") &&
    componentSource.includes("house.signId") &&
    componentSource.includes("house.cuspLongitude") &&
    componentSource.includes("const label = `${degreeLabel}°`;") &&
    componentSource.includes("degreeLabel.length * 7 + 14") &&
    componentSource.includes('background.setAttribute("width", labelWidth.toString())') &&
    !componentSource.includes("const label = `${degreeLabel}° ${sign.symbol}`;"),
  "the SVG must use compact number-sized cusp degree pills without colored sign emoji",
);
assert(
  componentSource.includes("گزارش متنی همچنان کامل و قابل خواندن است"),
  "wrapper must provide a human Persian fallback",
);
assert(
  readerSource.includes("ReportBirthChartWheel") &&
    (readerSource.match(/<ReportBirthChartWheel/g) ?? []).length === 1 &&
    readerSource.includes('id="report-summary"') &&
    readerSource.includes('id="report-full"') &&
    readerSource.includes('id="report-chart"') &&
    readerSource.includes("<ReportTechnicalAppendix"),
  "continuous reader must expose exactly one adapted wheel near the top and preserve the technical appendix",
);
assert(
  readerSource.includes('data-report-product-flow="continuous"') &&
    !readerSource.includes('mode === "technical"') &&
    readerSource.indexOf('id="report-full"') <
      readerSource.indexOf('id="report-chart"'),
  "wheel ownership must follow the continuous report flow rather than the retired technical mode",
);
// HALLEUS_REPORT_BIRTH_CHART_WHEEL_CONTINUOUS_FLOW_R2_20260808
// HALLEUS_REPORT_BIRTH_CHART_WHEEL_ADAPTIVE_SINGLE_OWNER_20260808
assert(
  globalCss.includes(".report-astrochart-wheel-canvas svg") &&
    globalCss.includes("width: min(100%, 800px)") &&
    globalCss.includes("max-width: 800px"),
  "the featured AstroChart SVG must use the larger responsive wheel size",
);
assert(
  globalCss.includes(".report-astrochart-wheel-body") &&
    globalCss.includes(".report-astrochart-wheel-legend") &&
    globalCss.includes(".report-astrochart-wheel-planets") &&
    globalCss.includes(".report-astrochart-wheel-aspects") &&
    globalCss.includes(".report-astrochart-cusp-label") &&
    globalCss.includes("grid-template-columns: repeat(4, minmax(0, 1fr))") &&
    globalCss.includes(".report-astrochart-wheel-legend > :nth-child(3)") &&
    globalCss.includes("grid-column: span 2") &&
    globalCss.includes(".report-astrochart-wheel-legend > :nth-child(5)") &&
    globalCss.includes(".report-astrochart-wheel-legend > :nth-child(6)") &&
    globalCss.includes("grid-template-columns: 3.5rem minmax(0, 1fr)") &&
    globalCss.includes("gap: 8px 15px") &&
    globalCss.includes("grid-template-columns: minmax(0, 1fr)") &&
    globalCss.includes("font-weight: 800") &&
    globalCss.includes("background: rgba(238, 243, 248, 0.72)") &&
    globalCss.includes(".report-astrochart-wheel-retrogrades"),
  "the guide must stack same-width supplementary cards beside the retrograde status",
);
assert((() => {
  const activeReader = read("components/report/ReportProductReader.tsx");
  const adaptive = read("components/report/ReportAdaptiveNarrative.tsx");
  const wheelAt = activeReader.indexOf('id="report-summary"');
  const flowAt = activeReader.indexOf('<div className={styles.reportFlow}>');
  const fullAt = activeReader.indexOf('id="report-full"');
  const skyAt = activeReader.indexOf('id="report-sky"');
  const technicalAt = activeReader.indexOf('id="report-chart"');
  const wheelCount = (activeReader.match(/<ReportBirthChartWheel/g) ?? []).length;
  const slotAt = adaptive.indexOf('{afterOpening}');
  const storiesAt = adaptive.indexOf('className={styles.adaptivePrimaryStories}');
  return wheelCount === 1 && wheelAt >= 0 && wheelAt < flowAt && flowAt < fullAt && fullAt < skyAt && skyAt < technicalAt && slotAt >= 0 && slotAt < storiesAt;
})(),"the single stored-data wheel must follow the two-paragraph opening and precede primary stories",
);
assert(
  packageJson.scripts?.["check:report-birth-chart-wheel"] ===
    "node scripts/check-report-birth-chart-wheel.mjs",
  "package.json must expose the focused guard",
);
assert(
  packageJson.dependencies?.["@astrodraw/astrochart"] === "3.0.2" &&
    astroChartPackage.version === "3.0.2" &&
    astroChartPackage.license === "MIT" &&
    Object.keys(astroChartPackage.dependencies ?? {}).length === 0,
  "AstroChart must stay pinned to the verified MIT, dependency-free 3.0.2 release",
);

if (failures.length > 0) {
  console.error("Report birth-chart wheel guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Report birth-chart wheel guard passed.");
console.log("- stored planets and cusps feed the official AstroChart radix renderer");
console.log("- only stored Halleus aspects are passed to AstroChart custom-aspect drawing");
console.log("- weighted highlights lead an adaptive eight-to-twelve-line stored aspect selection");
console.log("- special points and unrelated features stay outside the first pass");
console.log("- incomplete reports keep Persian partial/unavailable fallbacks");
console.log("- the guide explains planet symbols, aspect colors, signs, axes, houses, and retrogrades");
console.log("- the larger wheel uses a full row and the reading guide sits below it in a compact grid");
console.log("- cusp degree pills fit their numbers without colored sign emoji");
console.log("- matching wheel glyphs, bold headings, card items, and aligned notation rows keep the guide readable");
console.log("- compact Persian labels avoid duplicate wheel headings and long retrograde copy");
console.log("- the client-only renderer is pinned to the MIT, dependency-free 3.0.2 release");
assert(
  componentSource.includes("appendIntroMotionOverlay(svg, data)") &&
    componentSource.includes("applyReadingWheelFocus") &&
    componentSource.includes("halleus:report-reading-focus") &&
    componentSource.includes('data-report-wheel-motion="batch8"') &&
    componentSource.includes("data.aspects.slice(0, 6)"),
  "Batch 8 wheel must stage stored-data motion and preserve chapter-to-chart focus",
);
assert(
  componentSource.includes('window.matchMedia?.("(prefers-reduced-motion: reduce)").matches'),
  "Batch 8 wheel intro must short-circuit for reduced motion",
);
assert(
  componentSource.includes("useState<string | null>(() => {") &&
    componentSource.includes("window.sessionStorage.getItem") &&
    !componentSource.includes("setReadingFocus(window.sessionStorage.getItem"),
  "Batch 8 reading focus must initialize lazily and keep effects subscription-only",
);

console.log("- interactive Batch 3 pattern highlighting remains stored-data-only");
console.log("- Batch 8 chart motion is finite, stored-data-only, and reduced-motion aware");
console.log("- HALLEUS_REPORT_BIRTH_CHART_WHEEL_BATCH8_MOTION_20260807");
console.log("- HALLEUS_REPORT_BIRTH_CHART_WHEEL_BATCH3_SYNC_R2_20260807");

const batch2WheelSource = read("components/ReportBirthChartWheel.tsx");
const batch2WheelCss = read("components/report/human-first-report.module.css");
if (!batch2WheelSource.includes('data-report-wheel-visibility-trigger="batch2"')) throw new Error("Batch 2 wheel visibility marker missing");
if (!batch2WheelSource.includes("entry.intersectionRatio >= 0.32")) throw new Error("Batch 2 wheel must wait until it is meaningfully visible");
if (!batch2WheelSource.includes("introObserver?.disconnect()")) throw new Error("Batch 2 wheel observer cleanup missing");
if (!batch2WheelCss.includes("reportWheelOverlayOutBatch2")) throw new Error("Batch 2 stronger wheel motion CSS missing");
if (!batch2WheelCss.includes("@media (prefers-reduced-motion: reduce)")) throw new Error("Batch 2 reduced-motion CSS missing");
console.log("- Batch 2 starts the finite wheel intro only when the wheel is visibly on screen");
console.log("- HALLEUS_REPORT_BIRTH_CHART_WHEEL_BATCH2_VISIBLE_MOTION_20260808");
