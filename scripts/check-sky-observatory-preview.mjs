import fs from "node:fs";
import ts from "typescript";

const errors = [];
function read(path) {
  try { return fs.readFileSync(path, "utf8"); }
  catch { errors.push("missing: " + path); return ""; }
}
const paths = [
  "app/sky/preview/page.tsx",
  "lib/sky-public/sky-observatory-period.ts",
  "components/sky/SkyObservatoryPreview.tsx",
  "components/sky/SkyObservatoryPreview.module.css",
];
const sources = new Map(paths.map(path => [path, read(path)]));
for (const path of paths.filter(path => path.endsWith(".ts") || path.endsWith(".tsx"))) {
  const source = ts.createSourceFile(path, sources.get(path), ts.ScriptTarget.Latest, true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  for (const error of source.parseDiagnostics) {
    const pos = source.getLineAndCharacterOfPosition(error.start ?? 0);
    errors.push(path + ":" + (pos.line + 1) + " TS" + error.code + ": " +
      ts.flattenDiagnosticMessageText(error.messageText, " "));
  }
}
function requireText(path, words) {
  const source = sources.get(path) ?? "";
  for (const word of words) {
    if (!source.includes(word)) errors.push(path + " missing " + word);
  }
}
const page = paths[0], period = paths[1], client = paths[2], css = paths[3];
requireText(page, [
  'process.env.NODE_ENV !== "development"', "notFound()",
  "robots: { index: false, follow: false }", "deliverSkyPublicSnapshot",
  "getSkyObservatoryPeriod", "referenceTime={result.viewedAt}",
]);
requireText(period, [
  "buildSkyDailySnapshot", "unstable_cache", "u-ca-persian",
  "reference.getUTCDay() + 1", "dates.length < 29",
  "dates.length > 31", "snapshots.push",
]);
requireText(client, [
  "SkyObservatoryPreview", "period?.snapshots.find",
  "buildSkyPublicReportInterpretation",
  '<SurfaceShowcaseSlot surface="sky" slot="after-moon"/>',
  '<SurfaceShowcaseSlot surface="sky" slot="after-timeline"/>',
  "R3ApprovedInlineParagraphs", "setPlanet",
  "styles.heroScene", "styles.sceneFoot",
  "styles.weekLine", "styles.weekDayActive",
  "styles.moonPhases", "styles.phaseOrb",
  "snapshot.planetaryStates", "snapshot.aspects",
  "styles.stage", "styles.signalRail", "styles.overview", "styles.planetPreview",
  "styles.exploreTiles", "styles.heroEditorial",
  "buildHumanDailyGuide", "buildSignGuide",
  "SkyCityPicker", "EditorialStickyCtaSequence",
]);
requireText(css, [
  "var(--font-vazirmatn)", ".heroScene", ".timeModes",
  ".sheetBackdrop", "@media(max-width:600px)",
  ".sceneFoot", ".weekLine", ".moonPhases",
  ".phaseOrb", ".coreRing", ".tick", "var(--font-vazirmatn)",
  ".stage", ".signalRail", ".overview", ".planetPreview", ".exploreTiles",
]);
const p = sources.get(period) ?? "";
if (/Math\.random|fakePlanet|mockSnapshot|sampleData/.test(p))
  errors.push("Period data must never be fabricated");
const c = sources.get(client) ?? "";
if (/Math\.random|mockSnapshot|samplePlanet/.test(c))
  errors.push("Client must not fabricate astronomical values");
if (c.includes("Date.now()")) errors.push("Client must use stable SSR referenceTime");
const expectedSlots = ["after-moon","after-aspects","after-timeline"];
for (const slot of expectedSlots) {
  if (!c.includes('surface="sky" slot="' + slot + '"'))
    errors.push("Missing published showcase surface slot: " + slot);
}
const r3 = JSON.parse(read("lib/r3-approved-visible-additions.generated.json")).sky;
const expectedR3 = Array.isArray(r3) ? r3.map(section => section.title) : [];
if (expectedR3.length !== 8) errors.push("Unexpected approved R3 sky source");
for (const title of expectedR3) {
  if (!c.includes('page="sky" sectionTitle="' + title + '"'))
    errors.push("Approved R3 sky section missing: " + title);
}
const heroData = JSON.parse(read("lib/public-content/final-editorial-content.generated.json"));
const heroSection = heroData.sky?.sections?.find(section => section.id === "sky-hero");
const heroParagraphs = heroSection?.blocks?.filter(item => item.type === "paragraph").map(item => item.text) ?? [];
if (heroParagraphs.length !== 2 || heroParagraphs.some(paragraph => !c.includes(paragraph)))
  errors.push("Original two editorial hero paragraphs must be retained");
const expected = /styles\.([A-Za-z_]\w*)/g;
for (const match of c.matchAll(expected)) {
  const name = match[1];
  if (!(sources.get(css) ?? "").includes("." + name))
    errors.push("CSS module class missing: " + name);
}
if (c.includes("styles.topBar")) errors.push("Duplicate header is prohibited");
if ((c.match(/<details className=\{styles\.more\}><summary>/g) ?? []).length < 4)
  errors.push("At least four source-authored FAQ entries must be present");
const wheelStart = c.indexOf("function Wheel(");
const wheelEnd = c.indexOf("export function SkyObservatoryPreview(", wheelStart);
const wheel = wheelStart >= 0 && wheelEnd > wheelStart ? c.slice(wheelStart, wheelEnd) : "";
if (!/snapshot\.planetaryStates/.test(wheel) ||
    !/(?:sorted|snapshot\.planetaryStates)\.map\s*\(/.test(wheel))
  errors.push("Wheel must render engine planetary states");
if (!/snapshot\.aspects\.slice\s*\(\s*0\s*,\s*[1-9]\d*\s*\)/.test(wheel))
  errors.push("Wheel must render computed planetary aspects");
if (c.includes("styles.dayRail") || c.includes("styles.dayActive"))
  errors.push("Reject legacy dashboard day tiles; use V9 week timeline");
if (!c.includes("data-phase={phase}"))
  errors.push("Month must expose real engine-computed lunar phases");
if (!c.includes('onClick={() => onChoose(state.body)}') &&
    !c.includes('onClick={()=>onChoose(state.body)}'))
  errors.push("Wheel must support direct planetary interaction");
if (errors.length) {
  console.error("SKY_OBSERVATORY_PREVIEW_CHECK_FAILED");
  errors.forEach(error => console.error("- " + error));
  process.exitCode = 1;
} else {
  console.log("SKY_OBSERVATORY_PREVIEW_CHECK=PASS");
  console.log("Development-only; daily/weekly/monthly use Halleus engine snapshots; production /sky unchanged.");
}
