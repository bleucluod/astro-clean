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
  "components/HomepageLiveSky.tsx",
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
  "wikiShopProductCatalog", "previewOffers={previewOffers}", "SHOWCASE_SURFACE_SLOTS.sky",
]);
requireText(period, [
  "buildSkyDailySnapshot", "unstable_cache", "u-ca-persian",
  "reference.getUTCDay() + 1", "dates.length < 29",
  "dates.length > 31", "snapshots.push",
]);
requireText(client, [
  "SkyObservatoryPreview", "period?.snapshots.find",
  "buildSkyPublicReportInterpretation",
  '<SurfaceShowcaseSlot surface="sky" slot="after-moon" previewFallback={previewOffers["after-moon"]}/>',
  '<SurfaceShowcaseSlot surface="sky" slot="after-timeline" previewFallback={previewOffers["after-timeline"]}/>',
  "R3ApprovedInlineParagraphs", "setPlanet",
  "styles.heroScene", "styles.sceneFoot",
  "styles.weekLine", "styles.weekDayActive",
  "styles.moonPhases", "styles.phaseOrb",
  "styles.monthMoonHero", "styles.monthMoonDetails", "styles.phaseThumb",
  "compact", "idPrefix={\"sky-month-thumb-\"+phase}",
  "snapshot.planetaryStates", "snapshot.aspects",
  "styles.stage", "styles.signalRail", "styles.overview", "styles.planetPreview",
  "styles.exploreTiles", "styles.heroEditorial",
  "buildHumanDailyGuide", "buildSignGuide",
  "SkyCityPicker", "EditorialStickyCtaSequence",
  "data-sky-mode={view}", "modeTitle", "modeSubtitle",
  "SkyMoonVisual", "showPanel={false}", "styles.moonExperience",
  "AutoSweepRail", "renderItems={duplicate => SIGN_IDS.map",
  "groupClassName={styles.exploreTiles}", "data-sweep-held={touchHeld",
  "tabIndex={duplicate ? -1 : undefined}", "CompactReading", "setMoonOpen",
  "styles.moonSheet", "styles.moonSheetImage", "styles.moonVisualHint",
  "styles.aspectFlow", "styles.aspectTension", "styles.aspectUnion",
  "styles.sheetVisual", "styles.sheetMetrics", "styles.sheetTechnical",
  "styles.weekLine", "previewOffers",
]);
requireText(css, [
  "var(--font-vazirmatn)", ".heroScene", ".timeModes",
  ".sheetBackdrop", "@media(max-width:600px)",
  ".sceneFoot", ".weekLine", ".moonPhases",
  ".phaseOrb", ".coreRing", ".tick", "var(--font-vazirmatn)",
  ".monthMoonHero", ".monthMoonDetails", ".phaseHit", "scroll-snap-type:x proximity",
  ".stage", ".signalRail", ".overview", ".planetPreview", ".exploreTiles",
  ".weekLine::before", ".page[data-sky-mode=\"week\"]",
  "flex:1 1 0;display:grid", "flex:1 0 53px",
  ".moonExperience", ".moonDetails", ".sheetOrbit", ".sheetReading",
  ".sweepViewport", ".sweepTrack", ".sweepGroup", ".sweepSignalViewport", ".sweepSignViewport",
  ".sweepExploreViewport", "@keyframes skyReadingSweep", "animation-play-state:paused",
  ".moonSheet", ".moonVisualHint", ".aspectFlow", ".compactReading",
  ".contextNote",
]);
const showcaseSlot = read("components/shop/SurfaceShowcaseSlot.tsx");
for (const marker of ["previewFallback?: SurfaceOffer", "track={!previewFallback}", "publishedOffer ?? previewFallback ?? null"]) {
  if (!showcaseSlot.includes(marker)) errors.push("Showcase preview safety contract missing: " + marker);
}
for (const id of ["after-moon", "after-aspects", "after-timeline"]) {
  if (!(sources.get(client) ?? "").includes('slot="' + id + '" previewFallback={previewOffers["' + id + '"]}'))
    errors.push("Preview fallback missing for slot: " + id);
}
const railSource = sources.get(client) ?? "";
for (const marker of [
  'groupClassName={styles.signalRail} variant="signal"',
  'groupClassName={styles.signRail} variant="sign"',
  'groupClassName={styles.exploreTiles} variant="explore"',
  'data-sweep-original="true"', 'aria-hidden="true" dir="rtl"',
  'tabIndex={duplicate ? -1 : undefined}',
  'data-sweep-held={touchHeld ? "true" : "false"}',
  'idPrefix="sky-preview-modal"', 'idPrefix="sky-preview-inline"',
  'onClick={() => setMoonOpen(true)}', 'CompactReading',
]) if (!railSource.includes(marker)) errors.push("Sky interactive preview must retain: " + marker);
const targetTerms = ["آسترولوژی امروز","وضعیت سیارات امروز","موقعیت سیارات امروز","ماه امروز در چه برجی است","وضعیت ماه امروز","فاز ماه امروز","ترنزیت امروز","ترنزیت سیارات امروز","سیارات برگشتی امروز","جنبه‌های امروز","آسمان امروز","چارت آسمان امروز","حرکت سیارات امروز","ماه امروز در کدام نشان است","درصد روشنایی ماه امروز","زمان تغییر نشان ماه","کدام سیارات رترو هستند","زاویه سیارات امروز","موقعیت نجومی امروز"];
const skyMarkup = sources.get(client) ?? "";
for (const keyword of targetTerms) {
  if (!skyMarkup.includes(keyword)) errors.push("Missing owned /sky query in preview copy: " + keyword);
}
if (!skyMarkup.includes('className={styles.contextNote}'))
  errors.push("Owned keywords must be placed in useful prose, not a hidden keyword list");
const homeMoonStyles = read("app/home.module.css");
for (const marker of [".skyMoonCompact", ".skyMoonCompact .skyMoonDisc"]) {
  if (!homeMoonStyles.includes(marker)) errors.push("Shared moon compact style missing: " + marker);
}
const homeMoon = sources.get("components/HomepageLiveSky.tsx") ?? "";
for (const marker of ["export function SkyMoonVisual", "moon-apollo11.webp", "buildMoonShadowPath", "showPanel = true", "idPrefix = \"home\"", "compact = false"]) {
  if (!homeMoon.includes(marker)) errors.push("Reusable homepage moon contract missing: " + marker);
}
const obs = sources.get(client) ?? "";
if (!(obs.indexOf("<Wheel snapshot={active}") >= 0 && obs.indexOf("styles.heroEditorial") > obs.indexOf("<Wheel snapshot={active}")))
  errors.push("Hero editorial must follow the live wheel");
if (!(obs.indexOf('id="sky-moon"') < obs.indexOf('id="sky-planets"') &&
  obs.indexOf('id="sky-planets"') < obs.indexOf('id="sky-signs"')))
  errors.push("Observed sky sections must precede optional learning sections");
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
if (c.indexOf('className={styles.period}') > c.indexOf('className={styles.signalRail}'))
  errors.push("Period timeline should precede secondary signals");
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
