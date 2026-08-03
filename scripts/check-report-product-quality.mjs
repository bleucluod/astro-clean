import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { reportProductFixtures } from "./fixtures/report-product-fixtures.mjs";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalResolveFilename = Module._resolveFilename;

function resolveWithTypeScriptExtensions(candidate) {
  for (const option of [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, "index.ts"),
    path.join(candidate, "index.tsx"),
    path.join(candidate, "index.js"),
  ]) {
    if (fs.existsSync(option)) return option;
  }
  return candidate;
}

Module._resolveFilename = function resolveHalleusAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      resolveWithTypeScriptExtensions(path.join(repoRoot, request.slice(2))),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
      fileName: filename,
    }).outputText;
    module._compile(output, filename);
  };
}

const {
  buildLiveReportReadingContract,
  buildTechnicalAspectRows,
  buildTransitVisibleWordCount,
  calculateReadingMinutes,
  normalizeReportText,
  selectPrimaryNarrativeAspects,
} = require(path.join(repoRoot, "lib/report-output/live-report-reading-contract.ts"));
const {
  enrichReportWithRealEngineCopy,
} = require(path.join(repoRoot, "lib/astrology/real-engine-report-writer.ts"));

const failures = [];
const metrics = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function countWords(text) {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

function flattenVisibleNatalText(contract) {
  return [
    ...contract.personalOpening,
    contract.chartSignature.title,
    contract.chartSignature.body,
    ...contract.corePlacements.flatMap((item) => [item.label, item.position, item.role]),
    ...contract.primaryPatterns.flatMap((pattern) => [pattern.title, pattern.summary, ...pattern.evidence]),
    contract.primaryStrength.body,
    contract.primaryChallenge.body,
    contract.saveableSentence,
    ...contract.recommendedReadingPath,
    ...contract.themeChapters.flatMap((chapter) => [
      chapter.title,
      chapter.summary,
      ...chapter.paragraphs,
      ...(chapter.relationshipGroups?.flatMap((group) => [group.title, ...group.paragraphs]) ?? []),
      chapter.reflection ?? "",
    ]),
    ...contract.deepDiveSections.flatMap((section) => [
      section.title,
      section.summary,
      ...section.paragraphs,
    ]),
    contract.growthAxis.familiarPattern,
    contract.growthAxis.growthDirection,
    contract.growthAxis.bridge,
    ...contract.weeklyActions,
    ...contract.reflectionQuestions,
    ...contract.limitations,
  ].filter(Boolean);
}

function adjacentDuplicateToken(text) {
  const tokens = text
    .normalize("NFKC")
    .replace(/[.،؛:!?؟«»()\[\]{}\-–—]/gu, " ")
    .split(/\s+/u)
    .map((token) => normalizeReportText(token))
    .filter(Boolean);

  for (let index = 1; index < tokens.length; index += 1) {
    if (tokens[index] === tokens[index - 1]) return tokens[index];
  }
  return null;
}

function semanticSimilarity(first, second) {
  const firstTokens = new Set(first.split(" ").filter((token) => token.length > 2));
  const secondTokens = new Set(second.split(" ").filter((token) => token.length > 2));
  if (firstTokens.size === 0 || secondTokens.size === 0) return 0;
  const intersection = [...firstTokens].filter((token) => secondTokens.has(token)).length;
  const union = new Set([...firstTokens, ...secondTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function assertOwnershipUniqueness(fixtureId, ownership) {
  const owners = ownership.filter((entry) => entry.role === "owner");
  const references = ownership.filter((entry) => entry.role === "reference");
  for (let firstIndex = 0; firstIndex < owners.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < owners.length; secondIndex += 1) {
      const first = owners[firstIndex];
      const second = owners[secondIndex];
      const similarity = semanticSimilarity(first.normalizedText, second.normalizedText);
      if (first.normalizedText === second.normalizedText || similarity >= 0.98) {
        failures.push(
          `${fixtureId}: content ownership duplicates ${first.owner}/${first.id} and ${second.owner}/${second.id} (${similarity.toFixed(2)})`,
        );
      }
    }
  }
  for (const reference of references) {
    assert(Boolean(reference.sourceOwnerId), `${fixtureId}: reference ${reference.id} is missing its source owner`);
    assert(countWords(reference.normalizedText) <= 60, `${fixtureId}: reference ${reference.id} rewrites too much of its owner`);
  }
}

function collectQualifiedSelectors(cssSource) {
  const withoutComments = cssSource.replace(/\/\*[\s\S]*?\*\//gu, "");
  const selectors = [];

  function walk(source) {
    let cursor = 0;
    while (cursor < source.length) {
      const open = source.indexOf("{", cursor);
      if (open < 0) break;
      const prelude = source.slice(cursor, open).trim();
      let depth = 1;
      let close = open + 1;
      while (close < source.length && depth > 0) {
        if (source[close] === "{") depth += 1;
        if (source[close] === "}") depth -= 1;
        close += 1;
      }
      const body = source.slice(open + 1, close - 1);
      if (prelude.startsWith("@media")) {
        walk(body);
      } else if (prelude && !prelude.startsWith("@")) {
        selectors.push(...prelude.split(",").map((selector) => selector.trim()).filter(Boolean));
      }
      cursor = close;
    }
  }

  walk(withoutComments);
  return selectors;
}

function assertVisibleSurfaceUniqueness(fixtureId, contract) {
  const surfaces = [
    ...contract.personalOpening.map((text, index) => ({ id: `opening-${index}`, text })),
    ...contract.primaryPatterns.map((item) => ({ id: item.id, text: item.summary })),
    { id: "strength", text: contract.primaryStrength.body },
    { id: "challenge", text: contract.primaryChallenge.body },
    { id: "saveable", text: contract.saveableSentence },
    ...contract.themeChapters.flatMap((chapter) => [
      { id: `${chapter.id}-summary`, text: chapter.summary },
      ...chapter.paragraphs.map((text, index) => ({ id: `${chapter.id}-paragraph-${index}`, text })),
      ...(chapter.relationshipGroups?.flatMap((group) =>
        group.paragraphs.map((text, index) => ({ id: `${chapter.id}-${group.id}-${index}`, text })),
      ) ?? []),
    ]),
    ...contract.deepDiveSections.flatMap((section) => [
      { id: `${section.id}-summary`, text: section.summary },
      ...section.paragraphs.map((text, index) => ({ id: `${section.id}-paragraph-${index}`, text })),
    ]),
    ...contract.weeklyActions.map((text, index) => ({ id: `weekly-${index}`, text })),
    ...contract.reflectionQuestions.map((text, index) => ({ id: `reflection-${index}`, text })),
    ...contract.limitations.map((text, index) => ({ id: `limitation-${index}`, text })),
  ].map((item) => ({ ...item, normalized: normalizeReportText(item.text) }))
    .filter((item) => item.normalized.split(" ").length >= 8);

  for (let firstIndex = 0; firstIndex < surfaces.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < surfaces.length; secondIndex += 1) {
      const first = surfaces[firstIndex];
      const second = surfaces[secondIndex];
      const similarity = semanticSimilarity(first.normalized, second.normalized);
      assert(
        first.normalized !== second.normalized,
        `${fixtureId}: exact visible sentence repeats across ${first.id} and ${second.id}`,
      );
      assert(
        similarity < 0.99,
        `${fixtureId}: near-identical visible duplicate across ${first.id} and ${second.id} (${similarity.toFixed(2)})`,
      );
    }
  }
}

function prepareFixture(fixture) {
  return fixture.snapshot
    ? enrichReportWithRealEngineCopy(fixture.report, fixture.snapshot)
    : fixture.report;
}

for (const [fixtureId, fixture] of Object.entries(reportProductFixtures)) {
  const report = prepareFixture(fixture);
  const contract = buildLiveReportReadingContract(report);
  const visibleText = flattenVisibleNatalText(contract);
  const visibleWordCount = visibleText.reduce((total, text) => total + countWords(text), 0);

  assert(contract.navigation.length === 5, `${fixtureId}: navigation must contain exactly five main items`);
  assert(new Set(contract.navigation.map((item) => item.id)).size === 5, `${fixtureId}: navigation ids must be unique`);
  assert(contract.themeChapters.length === 7, `${fixtureId}: expected seven complete theme chapters`);
  assert(
    contract.themeChapters.some((chapter) => chapter.id === "real-engine-theme-emotional-security"),
    `${fixtureId}: emotional-security chapter is missing`,
  );
  if (report.realEngine) {
    assert(contract.deepDiveSections.length >= 4, `${fixtureId}: writer-backed deep dives are incomplete`);
    assert(
      contract.deepDiveSections.some((section) => section.id === "active-houses-story"),
      `${fixtureId}: active-house narrative was not restored`,
    );
    assert(
      contract.deepDiveSections.some((section) => section.id === "chart-ruler-story"),
      `${fixtureId}: chart-ruler narrative was not restored`,
    );
  }
  for (const chapter of contract.themeChapters) {
    const hasOwnedBody = chapter.paragraphs.length > 0 || (chapter.relationshipGroups?.some((group) => group.paragraphs.length > 0) ?? false);
    assert(hasOwnedBody, `${fixtureId}: chapter ${chapter.id} lost its owned body during deduplication`);
  }
  assert(contract.primaryPatterns.length === 3, `${fixtureId}: expected exactly three primary patterns`);
  assert(
    contract.primaryPatterns.every((pattern) => !/(?:،|؛|:|و|یا|که|اگر|وقتی)\.?$/u.test(pattern.summary.trim())),
    `${fixtureId}: a primary-pattern reference ends as an incomplete clause`,
  );
  assert(contract.relationshipProfile.length === 4, `${fixtureId}: relationship profile must have four groups`);
  assert(contract.weeklyActions.length === 3, `${fixtureId}: expected exactly three weekly actions`);
  assert(new Set(contract.weeklyActions.map(normalizeReportText)).size === 3, `${fixtureId}: weekly actions repeat`);
  assert(contract.readingTime.natalWordCount > 0, `${fixtureId}: natal visible word count is empty`);
  assert(
    contract.readingTime.natalMinutes === calculateReadingMinutes(contract.readingTime.natalWordCount),
    `${fixtureId}: natal reading time is not calculated from visible content`,
  );
  assert(
    Math.abs(contract.readingTime.natalWordCount - visibleWordCount) <= 80,
    `${fixtureId}: natal reading-time word count diverges from the visible contract (${contract.readingTime.natalWordCount} vs ${visibleWordCount})`,
  );
  assert(contract.readingTime.natalMinutes < 13 || contract.readingTime.natalWordCount >= 2161, `${fixtureId}: reading time looks hard-clamped`);
  assert(contract.limitations.length === new Set(contract.limitations.map(normalizeReportText)).size, `${fixtureId}: limitations/disclaimers repeat`);

  for (const text of visibleText) {
    const duplicate = adjacentDuplicateToken(text);
    assert(!duplicate, `${fixtureId}: adjacent duplicate token “${duplicate}” in visible text`);
    assert(!/داده ذخیره‌شده\s+ذخیره‌شده/u.test(text), `${fixtureId}: duplicated stored-data phrase remains`);
    assert(!/ممکن است\s+ممکن است/u.test(text), `${fixtureId}: duplicated possibility phrase remains`);
    assert(!/این توان بیشتر در/u.test(text), `${fixtureId}: mechanical strength phrasing remains`);
    assert(!/این چالش بیشتر در ممکن است/u.test(text), `${fixtureId}: mechanical challenge phrasing remains`);
  }

  assertOwnershipUniqueness(fixtureId, contract.contentOwnership);
  assertVisibleSurfaceUniqueness(fixtureId, contract);

  metrics.push({
    fixtureId,
    natalWords: contract.readingTime.natalWordCount,
    natalMinutes: contract.readingTime.natalMinutes,
    technicalMinutes: contract.readingTime.technicalMinutes,
    transitMinutes: contract.readingTime.transitMinutes,
  });
}

const aradReport = prepareFixture(reportProductFixtures.arad);
const aradContract = buildLiveReportReadingContract(aradReport);
assert(aradContract.displayName === "آراد", "Arad fixture must remain the primary named QA fixture");
const aradOwnerKinds = new Set(aradContract.contentOwnership.filter((entry) => entry.role === "owner").map((entry) => entry.owner));
for (const requiredOwner of ["theme-chapter", "relationship-profile", "weekly-action", "reflection-question", "evidence", "technical-explanation", "limitation"]) {
  assert(aradOwnerKinds.has(requiredOwner), `Arad ownership map is missing ${requiredOwner}`);
}
assert(aradContract.readingTime.natalWordCount >= 2200 && aradContract.readingTime.natalWordCount <= 3800, "Arad visible natal report must recover full narrative depth while keeping technical facts collapsed");
const aradNarrative = flattenVisibleNatalText(aradContract).join(" ");
for (const marker of ["ممکن است", "وقتی این بخش خوب کار می‌کند", "زیر فشار"]) {
  assert(aradNarrative.includes(marker), `Arad narrative is missing the human scenario marker: ${marker}`);
}
assert(aradContract.reflectionQuestions.length >= 2, "Arad narrative must retain reflection questions");
for (const forbiddenMachineSummary of ["پشتوانهٔ فصل", "متن فصل معنای روزمره", "داده‌های مرتبط این حوزه را کنار هم می‌گذارد"]) {
  assert(!aradNarrative.includes(forbiddenMachineSummary), `Arad narrative still exposes machine summary copy: ${forbiddenMachineSummary}`);
}

const denseReport = prepareFixture(reportProductFixtures.dense);
const denseContract = buildLiveReportReadingContract(denseReport);
const denseAspects = denseReport.realEngine?.aspects ?? [];
const narrativeAspects = selectPrimaryNarrativeAspects(
  denseAspects,
  denseReport.realEngine?.aspectHighlights ?? [],
);
const technicalAspectRows = buildTechnicalAspectRows(denseAspects);
assert(narrativeAspects.length >= 3 && narrativeAspects.length <= 5, "Dense fixture must expose only three to five fully narrated aspects");
assert(technicalAspectRows.length === denseAspects.length, "Technical appendix must preserve the complete aspect list");
assert(technicalAspectRows.every((row) => !("narrative" in row) && !("meaning" in row)), "Technical aspect rows must not carry narrative copy");
assert(denseContract.hasTransit, "Dense fixture must preserve stored transit data");
const denseTransit = denseReport.engineData?.personalTransitReportData ?? null;
assert(
  denseContract.readingTime.transitWordCount === buildTransitVisibleWordCount(denseTransit),
  "Transit reading time must count the visible stored-transit copy rather than the raw bridge object",
);
assert(
  denseContract.readingTime.transitMinutes ===
    calculateReadingMinutes(denseContract.readingTime.transitWordCount),
  "Transit reading minutes must be derived from the visible transit word count",
);

const unknownReport = prepareFixture(reportProductFixtures.unknownTime);
const unknownContract = buildLiveReportReadingContract(unknownReport);
assert(!unknownContract.hasReliableBirthTime, "Unknown-time fixture must disable time-dependent confidence");
assert(unknownReport.realEngine?.houses?.length === 0, "Unknown-time fixture must not invent houses");
assert(!unknownReport.realEngine?.angles, "Unknown-time fixture must not invent angles");
assert(unknownContract.corePlacements.find((item) => item.id === "rising")?.position.includes("نامشخص"), "Unknown-time reader must not display a fallback rising sign");
assert(unknownContract.primaryPatterns.every((pattern) => !pattern.summary.includes("رایزینگ")), "Unknown-time primary patterns must not depend on a rising sign");

const legacyContract = buildLiveReportReadingContract(reportProductFixtures.legacy.report);
assert(legacyContract.themeChapters.length === 7, "Legacy fallback must retain the seven-chapter reader structure");
assert(legacyContract.themeChapters.every((chapter) => chapter.paragraphs.length > 0 || (chapter.relationshipGroups?.length ?? 0) === 4), "Legacy fallback chapters must remain readable and explicit about missing data");
assert(legacyContract.primaryPatterns.every((pattern) => !pattern.summary.includes("داده‌های مرتبط این حوزه")), "Legacy top patterns must use stored chart facts rather than generic chapter filler");
assert(legacyContract.evidenceReferences.some((item) => item.id === "fallback-report"), "Legacy fallback must identify its limited evidence boundary");

const noTransitReport = prepareFixture(reportProductFixtures.noTransit);
const noTransitContract = buildLiveReportReadingContract(noTransitReport);
assert(!noTransitContract.hasTransit, "No-transit fixture must not fabricate a transit mode");
assert(noTransitContract.readingTime.transitMinutes === 0, "No-transit fixture must have zero transit reading time");

const reportDetail = read("components/ReportDetail.tsx");
const reportReader = read("components/report/ReportProductReader.tsx");
const reportExperience = read("components/ReportV3Experience.tsx");
const technicalAppendix = read("components/report/ReportTechnicalAppendix.tsx");
const navigation = read("components/report/ReportReadingNavigation.tsx");
const aspectComponent = read("components/ReportAspectRelationshipSections.tsx");
const css = read("app/globals.css");

assert(reportDetail.split(/\r?\n/u).length < 620, "ReportDetail must remain a thin loading/action orchestrator");
assert(reportDetail.includes("<ReportProductReader report={report} />"), "ReportDetail must delegate the reading product to ReportProductReader");
assert(!reportDetail.includes("report-detail-birth-card"), "Birth data must not dominate the report hero");
assert(reportDetail.includes('reportSource === "public"'), "Public-read source branch must remain explicit");
assert(reportDetail.includes("getPublicReportRecord(reportId)"), "Public-read source must use its privacy-minimized client path");
assert(reportReader.includes("ReportReaderMode"), "Natal, stored transit, and technical details must be separate reader modes");
assert(reportReader.indexOf("<ReportV3Experience") < reportReader.indexOf('id="chart-details"'), "Natal narrative must precede the optional technical appendix");
assert(reportReader.includes("با بازکردن دوباره تازه نمی‌شود") && reportReader.includes("همیشه تصویر همان زمان"), "Stored transit must be clearly distinguished from today");
assert(reportReader.includes("disabled={!transitData}"), "Reports without transit must degrade without an empty active mode");
assert(navigation.includes("bottomSheet") && navigation.includes("floatingSectionsButton"), "Mobile navigation must use the floating bottom-sheet navigator");
assert(!navigation.includes("overflow-x"), "Mobile report navigation must not rely on horizontal chip overflow");
assert(reportExperience.includes("سه الگوی اصلی"), "Primary patterns must be visible near the top of the report");
assert(reportExperience.includes("نقطهٔ قوت اصلی") || reportExperience.includes("primaryStrength"), "Primary strength must be visible");
assert(reportExperience.includes("primaryChallenge"), "Primary challenge must be visible");
assert(reportExperience.includes("report-product-saveable-sentence"), "Saveable sentence must be visible");
assert((reportExperience.match(/reportV3Disclaimer/gu)?.length ?? 0) === 1, "Shared natal disclaimer must render only once");
assert(technicalAppendix.includes('data-report-technical-appendix="placements-houses-aspects-axes-method"'), "Technical appendix must expose the five approved tabs");
assert(!technicalAppendix.includes("aspect.narrative"), "Full technical aspect table must not render repeated narrative paragraphs");
assert(aspectComponent.includes("selectPrimaryNarrativeAspects"), "Narrated aspect selection must use the tested relevance boundary helper");
assert(css.includes("@media (max-width: 1024px)"), "Responsive report CSS must cover 1024px");
assert(css.includes("@media (max-width: 820px)"), "Responsive report CSS must cover tablet/mobile navigation");
assert(css.includes("@media (max-width: 520px)"), "Responsive report CSS must cover 390px and 360px widths");
assert(css.includes(".report-product-page *") && css.includes("min-width: 0"), "Report product surface must guard against horizontal overflow");
const reportCssMarker = "/* Complete birth report reader — scoped to the report product surface. */";
const reportCss = css.slice(css.indexOf(reportCssMarker));
const reportSelectors = collectQualifiedSelectors(reportCss);
assert(reportSelectors.length > 100, "Complete report CSS surface was not found");
assert(
  reportSelectors.every((selector) => selector.includes(".report-product")),
  `Report CSS contains an unscoped selector: ${reportSelectors.find((selector) => !selector.includes(".report-product")) ?? "unknown"}`,
);
assert(!/overflow-x\s*:\s*(?:auto|scroll)/u.test(reportCss), "Report product CSS must not create horizontal scrolling surfaces");
assert(!/min-width\s*:\s*(?!0(?:px|rem|em|%)?\b)[1-9]/u.test(reportCss), "Report product CSS contains a positive min-width that can force mobile overflow");
assert(reportCss.includes("grid-template-columns: repeat(2, minmax(0, 1fr));"), "Technical controls must collapse to two columns on narrow screens");
assert(reportCss.includes(".report-product-navigation-desktop {\n    display: none;"), "Desktop navigation must be removed at the compact breakpoint");
assert(reportCss.includes(".report-product-navigation-mobile {\n    display: grid;"), "Mobile section selector must become visible at the compact breakpoint");

if (failures.length > 0) {
  console.error("Report product quality check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Report product quality check passed.");
console.log("- Arad remains the primary QA fixture alongside a different chart, unknown-time, legacy, no-transit, and dense fixtures");
console.log("- exact duplication is removed without deleting distinct scenario and context paragraphs");
console.log("- seven chapters plus writer-backed whole-chart, chart-ruler, balance, active-house, and node-axis deep dives are complete");
console.log("- natal, technical, and stored-transit reading times are calculated separately from visible content");
console.log("- only three to five aspects receive full narrative while the technical appendix preserves all aspect facts without narrative copy");
console.log("- five-item navigation, mobile selector, legacy fallback, and unknown-time degradation are covered");
for (const metric of metrics) {
  console.log(`  ${metric.fixtureId}: natal=${metric.natalWords} words/${metric.natalMinutes} min, technical=${metric.technicalMinutes} min, transit=${metric.transitMinutes} min`);
}
