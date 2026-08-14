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
    ...contract.chartPatterns.patterns.flatMap((pattern) => [
      pattern.title,
      pattern.summary,
      pattern.technicalSummary,
      ...pattern.evidence,
    ]),
    contract.supplementaryPoints.partOfFortune?.summary ?? "",
    contract.primaryStrength.body,
    contract.primaryChallenge.body,
    contract.saveableSentence,
    ...contract.recommendedReadingPath,
    ...contract.personalPlanetChapters.chapters.flatMap((chapter) => [
      chapter.title,
      chapter.summary,
      ...chapter.sections
        .filter((section) => section.id !== "evidence")
        .flatMap((section) => [section.label, section.body]),
    ]),
    ...contract.wholeChartSynthesis.fixedChapters
      .filter((chapter) => chapter.available)
      .flatMap((chapter) => [chapter.title, chapter.summary, ...chapter.paragraphs]),
    ...contract.wholeChartSynthesis.dynamicChapters.flatMap((chapter) => [
      chapter.title,
      chapter.summary,
      ...chapter.paragraphs,
    ]),
    ...contract.wholeChartSynthesis.lifeAreas
      .filter((area) => area.available)
      .flatMap((area) => [area.title, area.summary, ...area.factors]),
    ...contract.themeChapters
      .filter((chapter) =>
        chapter.id === "real-engine-theme-direction-path" ||
        chapter.id === "real-engine-theme-recurring-patterns",
      )
      .flatMap((chapter) => [
        chapter.title,
        chapter.summary,
        ...chapter.paragraphs,
        chapter.reflection ?? "",
      ]),
    ...contract.deepDiveSections
      .filter(
        (section) =>
          ![
            "whole-chart-story",
            "chart-ruler-story",
            "balance-story",
            "active-houses-story",
            "node-axis-story",
          ].includes(section.id),
      )
      .flatMap((section) => [
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
    contract.personalPlanetChapters.version === "personal-planet-chapters-v1",
    `${fixtureId}: personal-planet chapter contract version is missing`,
  );
  const expectedPersonalChapterIds = [
    "sun",
    "moon",
    "rising-ruler",
    "mercury",
    "venus",
    "mars",
  ];
  assert(
    JSON.stringify(contract.personalPlanetChapters.chapters.map((chapter) => chapter.id)) ===
      JSON.stringify(expectedPersonalChapterIds),
    `${fixtureId}: personal-planet chapters are incomplete or out of order`,
  );
  for (const chapter of contract.personalPlanetChapters.chapters) {
    assert(
      chapter.sections.length === 12,
      `${fixtureId}: chapter ${chapter.id} must keep all twelve layers`,
    );
    assert(
      JSON.stringify(chapter.sections.map((section) => section.id)) ===
        JSON.stringify([
          "position",
          "core-meaning",
          "sign-expression",
          "house-expression",
          "planet-condition",
          "major-aspects",
          "whole-chart-connection",
          "daily-life",
          "healthy-capacity",
          "under-pressure",
          "integration",
          "evidence",
        ]),
      `${fixtureId}: chapter ${chapter.id} broke the twelve-layer order`,
    );
  }
  assert(
    contract.wholeChartSynthesis.version === "whole-chart-synthesis-v1",
    `${fixtureId}: whole-chart synthesis contract version is missing`,
  );
  assert(
    contract.wholeChartSynthesis.fixedChapters
      .map((chapter) => chapter.id)
      .join("|") ===
      [
        "jupiter",
        "saturn",
        "sun-moon-rising",
        "chart-ruler-story",
        "element-modality-balance",
        "lunar-node-axis",
        "whole-chart-summary",
      ].join("|"),
    `${fixtureId}: fixed whole-chart chapter order drifted`,
  );
  assert(
    contract.wholeChartSynthesis.lifeAreas.length === 10,
    `${fixtureId}: expected ten life-area synthesis profiles`,
  );
  assert(
    contract.wholeChartSynthesis.dynamicChapters.every(
      (chapter) => chapter.selectedByProminence === true,
    ),
    `${fixtureId}: a dynamic whole-chart chapter bypassed prominence selection`,
  );
  assert(
    !contract.wholeChartSynthesis.dynamicChapters.some(
      (chapter) => chapter.kind === "chiron",
    ),
    `${fixtureId}: Chiron entered whole-chart synthesis without validated ephemeris data`,
  );
  if (!contract.hasReliableBirthTime) {
    assert(
      !contract.wholeChartSynthesis.dynamicChapters.some((chapter) =>
        ["active-house", "part-of-fortune", "dispositor-chain"].includes(
          chapter.kind,
        ),
      ),
      `${fixtureId}: unknown time leaked a house/Ascendant-dependent dynamic synthesis`,
    );
    assert(
      contract.wholeChartSynthesis.fixedChapters.find(
        (chapter) => chapter.id === "chart-ruler-story",
      )?.available === false,
      `${fixtureId}: unknown time leaked the chart-ruler fixed chapter`,
    );
  }

  const risingRulerChapter = contract.personalPlanetChapters.chapters.find(
    (chapter) => chapter.id === "rising-ruler",
  );
  const hasCalculatedRisingRulerData = Boolean(
    contract.hasReliableBirthTime &&
      report.realEngine?.angles?.asc &&
      contract.rulership.chartRuler,
  );
  assert(
    risingRulerChapter?.available === hasCalculatedRisingRulerData,
    `${fixtureId}: rising/chart-ruler chapter availability must follow calculated chart data`,
  );
  if (!contract.hasReliableBirthTime) {
    for (const planetId of ["sun", "moon", "mercury", "venus", "mars"]) {
      const chapter = contract.personalPlanetChapters.chapters.find(
        (item) => item.id === planetId,
      );
      const houseLayer = chapter?.sections.find(
        (section) => section.id === "house-expression",
      );
      assert(
        houseLayer?.body.includes("بدون ساعت تولد معتبر"),
        `${fixtureId}: unknown time leaked a house reading into ${planetId}`,
      );
    }
  }
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
    contract.chartPatterns.version === "chart-patterns-v1",
    `${fixtureId}: chart-pattern contract version is missing`,
  );
  assert(
    contract.rulership.version === "chart-rulership-v1",
    `${fixtureId}: chart-rulership contract version is missing`,
  );
  assert(
    contract.supplementaryPoints.version === "validated-supplementary-points-v1",
    `${fixtureId}: supplementary-points contract version is missing`,
  );
  assert(
    contract.supplementaryPoints.chiron === null,
    `${fixtureId}: Chiron must remain absent until independent ephemeris validation exists`,
  );
  if (!contract.hasReliableBirthTime) {
    assert(
      contract.supplementaryPoints.partOfFortune === null,
      `${fixtureId}: unknown time leaked Part of Fortune`,
    );
  }
  assert(
    contract.rulership.planetConditions.length <= 7,
    `${fixtureId}: classical planetary-condition output exceeded seven planets`,
  );
  if (!contract.hasReliableBirthTime) {
    assert(contract.rulership.chartRuler === null, `${fixtureId}: unknown time leaked chart ruler`);
    assert(contract.rulership.houseRulers.length === 0, `${fixtureId}: unknown time leaked house rulers`);
    assert(contract.rulership.dispositorChain === null, `${fixtureId}: unknown time leaked dispositor chain`);
    assert(
      contract.rulership.planetConditions.every((condition) => condition.house === null),
      `${fixtureId}: unknown time leaked condition houses`,
    );
  }
  if (contract.hasReliableBirthTime && (report.realEngine?.houses?.length ?? 0) === 12) {
    assert(contract.rulership.houseRulers.length === 12, `${fixtureId}: complete houses must expose twelve rulers`);
  }
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

const wholeChartSynthesisSource = read(
  "lib/astrology/whole-chart-synthesis.ts",
);
const wholeChartSynthesisComponent = read(
  "components/report/ReportWholeChartSynthesis.tsx",
);
const batch7ProductReader = read("components/report/ReportProductReader.tsx");
for (const marker of [
  "WHOLE_CHART_SYNTHESIS_VERSION",
  "buildWholeChartSynthesis",
  "growth-personal-path",
  "selectedByProminence",
]) {
  assert(
    wholeChartSynthesisSource.includes(marker),
    `whole-chart synthesis source missing marker: ${marker}`,
  );
}
assert(
  wholeChartSynthesisComponent.includes(
    'data-whole-chart-synthesis={profile.version}',
  ) &&
    wholeChartSynthesisComponent.includes("data-whole-chart-dynamic-chapters") &&
    wholeChartSynthesisComponent.includes("data-whole-chart-life-areas"),
  "whole-chart synthesis component must expose fixed, dynamic, and life-area ownership",
);
for (const interim of [
  "ReportChartPatternSection",
  "ReportRulershipSection",
  "ReportSupplementaryPointsSection",
]) {
  assert(
    !batch7ProductReader.includes(interim),
    `full report retained interim direct section: ${interim}`,
  );
}

const personalChapterSource = read(
  "lib/astrology/personal-planet-chapters.ts",
);
const personalChapterComponent = read(
  "components/report/ReportPersonalPlanetChapters.tsx",
);
const personalPlanetReportExperience = read("components/ReportV3Experience.tsx");
for (const marker of [
  "PERSONAL_PLANET_CHAPTERS_VERSION",
  "buildPersonalPlanetChapters",
  "whole-chart-connection",
  "planet-condition",
  "major-aspects",
]) {
  assert(
    personalChapterSource.includes(marker),
    `personal-planet chapter engine missing marker: ${marker}`,
  );
}
assert(
  personalChapterComponent.includes(
    'data-personal-planet-chapters={profile.version}',
  ) &&
    personalChapterComponent.includes(
      'data-personal-planet-layer="evidence"',
    ),
  "personal-planet chapter component must expose full reading and evidence layers",
);
assert(
  personalPlanetReportExperience.includes("ReportPersonalPlanetChapters") &&
    personalPlanetReportExperience.includes("ReportWholeChartSynthesis") &&
    !personalPlanetReportExperience.includes("reading.innerWorld") &&
    !personalPlanetReportExperience.includes("reading.mindLanguage") &&
    !personalPlanetReportExperience.includes("reading.relationships") &&
    !personalPlanetReportExperience.includes("reading.driveDirection") &&
    personalPlanetReportExperience.includes('"whole-chart-story"') &&
    personalPlanetReportExperience.includes('"chart-ruler-story"') &&
    personalPlanetReportExperience.includes('"balance-story"') &&
    personalPlanetReportExperience.includes('"active-houses-story"') &&
    personalPlanetReportExperience.includes('"node-axis-story"') &&
    personalPlanetReportExperience.includes(
      '"human-first-signature-deeper-layer"',
    ) &&
    personalPlanetReportExperience.includes("].includes(section.id)"),
  "full report must keep six astrology-led chapters and transfer absorbed deeper layers to whole-chart synthesis",
);

const aradReport = prepareFixture(reportProductFixtures.arad);
const aradContract = buildLiveReportReadingContract(aradReport);
assert(aradContract.displayName === "آراد", "Arad fixture must remain the primary named QA fixture");
const aradOwnerKinds = new Set(aradContract.contentOwnership.filter((entry) => entry.role === "owner").map((entry) => entry.owner));
for (const requiredOwner of ["theme-chapter", "relationship-profile", "weekly-action", "reflection-question", "evidence", "technical-explanation", "limitation"]) {
  assert(aradOwnerKinds.has(requiredOwner), `Arad ownership map is missing ${requiredOwner}`);
}
assert(
  aradContract.readingTime.natalWordCount >= 2200,
  `Arad visible natal report must preserve full narrative depth while technical facts stay collapsed (actual=${aradContract.readingTime.natalWordCount})`,
);
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
const aspectComponent = read("components/ReportAspectRelationshipSections.tsx");
const css = read("app/globals.css");

assert(reportDetail.split(/\r?\n/u).length < 620, "ReportDetail must remain a thin loading/action orchestrator");
const reportReaderDelegationStart = reportDetail.indexOf("<ReportProductReader");
const reportReaderDelegationEnd = reportDetail.indexOf("/>", reportReaderDelegationStart);
const reportReaderDelegation =
  reportReaderDelegationStart >= 0 && reportReaderDelegationEnd > reportReaderDelegationStart
    ? reportDetail.slice(reportReaderDelegationStart, reportReaderDelegationEnd + 2)
    : "";
assert(
  reportReaderDelegation.includes("report={report}"),
  "ReportDetail must delegate the reading product to ReportProductReader",
);
assert(
  reportReaderDelegation.includes("storedAccessTier={storedAccessTier}"),
  "ReportDetail must pass the stored access tier into ReportProductReader",
);
assert(!reportDetail.includes("report-detail-birth-card"), "Birth data must not dominate the report hero");
assert(reportDetail.includes('reportSource === "public"'), "Public-read source branch must remain explicit");
assert(reportDetail.includes("getPublicReportRecord(reportId)"), "Public-read source must use its privacy-minimized client path");
assert(
  reportReader.includes('data-report-product-flow="continuous"') &&
    reportReader.includes("data-report-journey-navigator") &&
    reportReader.includes('id="report-summary"') &&
    reportReader.includes('id="report-full"') &&
    reportReader.includes('id="report-sky"') &&
    reportReader.includes('id="report-chart"') &&
    !reportReader.includes("ReportReaderMode") &&
    !reportReader.includes("ModeButton") &&
    !reportReader.includes("ReportReadingNavigation"),
  "Summary, natal, stored transit, and technical details must share one continuous editorial reader",
);
const editorialFlowOrder = ["report-summary", "report-full", "report-sky", "report-chart"].map((id) =>
  reportReader.indexOf('id="' + id + '"'),
);
assert(
  editorialFlowOrder.every((position) => position >= 0) &&
    editorialFlowOrder.every((position, index) => index === 0 || editorialFlowOrder[index - 1] < position),
  "Continuous editorial report sections must remain in summary/full/sky/chart order",
);
assert(reportReader.includes("با بازکردن دوباره تازه نمی‌شود") && reportReader.includes("همیشه تصویر همان زمان"), "Stored transit must be clearly distinguished from today");
assert(
  reportReader.includes("<HumanTransitReading data={transitData} />") &&
    reportReader.includes("function HumanTransitReading") &&
    reportReader.includes("if (!data)"),
  "Reports without stored transit must render an explicit in-flow fallback instead of an empty or disabled mode",
);
assert(
  reportReader.includes("data-report-journey-navigator") &&
    reportReader.includes("journeyNavigatorPanel") &&
    reportReader.includes("HUMAN_FIRST_REPORT_NAVIGATION") &&
    reportReader.includes("scrollToFlowSection") &&
    reportReader.includes("navigateTo"),
  "Report navigation must use the compact journey navigator for macro sections and natal chapters",
);
assert(
  !reportReader.includes("ReportReadingNavigation") &&
    !reportReader.includes("overflow-x"),
  "Continuous report navigation must not restore the retired navigation component or horizontal chip overflow",
);
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

const batch8ReaderSource = read("components/report/ReportProductReader.tsx");
const batch8ExperienceSource = read("components/ReportV3Experience.tsx");
const batch8PersonalSource = read("components/report/ReportPersonalPlanetChapters.tsx");
const batch8SynthesisComponentSource = read("components/report/ReportWholeChartSynthesis.tsx");
const batch8WheelSource = read("components/ReportBirthChartWheel.tsx");
const batch8MotionCss = read("components/report/human-first-report.module.css");

assert(
  batch8ReaderSource.includes('data-report-product-flow="continuous"') &&
    batch8ReaderSource.includes('data-report-reading-motion="batch8"') &&
    batch8ReaderSource.includes("data-report-journey-navigator") &&
    batch8ReaderSource.includes('id="report-summary"') &&
    batch8ReaderSource.includes('id="report-full"') &&
    batch8ReaderSource.includes('id="report-sky"') &&
    batch8ReaderSource.includes('id="report-chart"') &&
    !batch8ReaderSource.includes("ReportStoryMode") &&
    !batch8ReaderSource.includes("ModeButton"),
  "Batch 8 reading-position ownership must survive inside the continuous editorial report without retired mode tabs",
);
assert(
  batch8ExperienceSource.includes("IntersectionObserver") &&
    batch8ExperienceSource.includes("halleus:report-reading-focus") &&
    batch8ExperienceSource.includes("sessionStorage") &&
    !batch8ExperienceSource.includes("setInterval("),
  "Batch 8 chapter focus must be event-driven, finite, and optional",
);
assert(
  batch8PersonalSource.includes("data-reading-motion-focus={chapter.id}") &&
    batch8SynthesisComponentSource.includes("data-whole-chart-chapter-id={chapter.id}") &&
    batch8SynthesisComponentSource.includes("data-reading-motion-focus={") &&
    batch8SynthesisComponentSource.includes("life-area:"),
  "Batch 8 reading chapters must expose deterministic chart-focus ownership",
);
assert(
  batch8WheelSource.includes("appendIntroMotionOverlay") &&
    batch8WheelSource.includes("getWheelPoint(placement.longitude") &&
    batch8WheelSource.includes("data.aspects.slice(0, 6)") &&
    batch8WheelSource.includes("prefers-reduced-motion: reduce") &&
    !batch8WheelSource.includes("setInterval("),
  "Batch 8 wheel motion must use stored positions, cap intro aspects, respect reduced motion, and never loop",
);
assert(
  batch8MotionCss.includes("Birth report Batch 8 reading motion") &&
    batch8MotionCss.includes("@media (max-width: 390px)") &&
    batch8MotionCss.includes("@media (min-width: 391px) and (max-width: 760px)") &&
    batch8MotionCss.includes("@media (min-width: 761px) and (max-width: 1024px)") &&
    batch8MotionCss.includes("@media (min-width: 1025px)") &&
    batch8MotionCss.includes("@media (prefers-reduced-motion: reduce)") &&
    batch8MotionCss.includes("overflow-wrap: anywhere"),
  "Batch 8 visual contract must cover 360/390-class mobile, larger mobile, tablet, desktop, reduced motion, and long text",
);
const batch8HasBareMotionSelector = batch8MotionCss
  .split(String.fromCharCode(10))
  .map((line) => line.trimStart())
  .some(
    (line) =>
      line.startsWith("[data-reading-motion-card]") ||
      line.startsWith("[data-halleus-reading-focus]") ||
      line.startsWith("[data-report-wheel-intro-") ||
      line.startsWith("[data-halleus-intro-motion]"),
  );
assert(
  !batch8HasBareMotionSelector &&
    batch8MotionCss.includes(".reader :global(.report-astrochart-wheel)"),
  "Batch 8 CSS-module selectors must be locally scoped while the literal wheel class remains global",
);
assert(
  !batch8MotionCss.includes("animation-iteration-count: infinite") &&
    !batch8MotionCss.includes("infinite linear") &&
    !batch8MotionCss.includes("infinite ease"),
  "Batch 8 must not introduce permanent reading animation",
);
// HALLEUS_REPORT_READING_MOTION_PRODUCT_GUARD_BATCH8_20260807


// HALLEUS_REPORT_EDITORIAL_FLOW_PRODUCT_ARCHITECTURE_R4_20260808
const editorialBatch1ReaderSource = read("components/report/ReportProductReader.tsx");
const editorialBatch1SummarySource = read("components/report/FiveMinuteReportSummary.tsx");
const editorialBatch1CssSource = read("components/report/human-first-report.module.css");
const editorialBatch1CssMarker = "/* HALLEUS_REPORT_EDITORIAL_FLOW_BATCH1_20260808 */";
const editorialBatch1Css = editorialBatch1CssSource.slice(editorialBatch1CssSource.indexOf(editorialBatch1CssMarker));

assert(
  editorialBatch1ReaderSource.includes('data-report-product-flow="continuous"') &&
    editorialBatch1ReaderSource.includes("data-report-journey-navigator") &&
    editorialBatch1ReaderSource.includes('id="report-summary"') &&
    editorialBatch1ReaderSource.includes('id="report-full"') &&
    editorialBatch1ReaderSource.includes('id="report-sky"') &&
    editorialBatch1ReaderSource.includes('id="report-chart"'),
  "Editorial Batch 1 must render one continuous report flow with compact journey navigation",
);
for (const retiredMarker of ["ReportStoryMode", "ModeButton", "ReportReadingNavigation", "ReportProductMode"]) {
  assert(!editorialBatch1ReaderSource.includes(retiredMarker), "Editorial Batch 1 still contains retired report UI: " + retiredMarker);
}
for (const astrologyHeading of ["خورشید؛ هویت و جهت", "ماه؛ احساس و امنیت", "طالع؛ ورود و تصویر اولیه"]) {
  assert(editorialBatch1SummarySource.includes(astrologyHeading), "Editorial Batch 1 lost astrological heading: " + astrologyHeading);
}
assert(
  editorialBatch1SummarySource.includes('data-editorial-summary="astrology-first-beginner"') &&
    !editorialBatch1SummarySource.includes("contract.primaryStrength") &&
    !editorialBatch1SummarySource.includes("contract.primaryChallenge"),
  "Editorial Batch 1 summary must keep beginner translation and remove generic strength/challenge cards",
);
assert(editorialBatch1CssSource.includes(editorialBatch1CssMarker), "Editorial Batch 1 CSS marker missing");
for (const requiredCssMarker of [".journeyNavigator", ".reportFlow", ".flowSection", ".summaryCoreGrid", ".summaryPatternGrid", ".reader .hero", ".reader .section", "[data-screenshot-ready]"]) {
  assert(editorialBatch1Css.includes(requiredCssMarker), "Editorial Batch 1 CSS missing: " + requiredCssMarker);
}
for (const forbiddenBlue of ["#1e40af", "#d9eafd", "30 64 175", "30, 64, 175"]) {
  assert(!editorialBatch1Css.toLowerCase().includes(forbiddenBlue), "Editorial Batch 1 CSS contains retired blue UI token: " + forbiddenBlue);
}
for (const storyPath of ["components/report/ReportStoryMode.tsx", "components/report/report-story-mode.module.css", "lib/report-output/report-story-mode.ts"]) {
  assert(!fs.existsSync(path.join(repoRoot, storyPath)), "Story Mode file still exists: " + storyPath);
}
// HALLEUS_REPORT_EDITORIAL_FLOW_PRODUCT_GUARD_BATCH1_20260808


const editorialBatch2Reader = read("components/report/ReportProductReader.tsx");
const editorialBatch2Wheel = read("components/ReportBirthChartWheel.tsx");
const editorialBatch2Css = read("components/report/human-first-report.module.css");
for (const marker of [
  'data-editorial-report-batch2="motion-polish"',
  'data-report-ambient-logo="parallax"',
  "HALLEUS_REPORT_AMBIENT_LOGO_PARALLAX_BATCH2_20260808",
  'data-screenshot-ready',
]) {
  assert(editorialBatch2Reader.includes(marker), "Batch 2 reader missing " + marker);
}
for (const marker of [
  'data-report-wheel-visibility-trigger="batch2"',
  "IntersectionObserver",
  "entry.intersectionRatio >= 0.32",
  "introObserver?.disconnect()",
]) {
  assert(editorialBatch2Wheel.includes(marker), "Batch 2 wheel missing " + marker);
}
const editorialBatch2CssMarker = "/* HALLEUS_REPORT_EDITORIAL_MOTION_BATCH2_20260808 */";
assert(editorialBatch2Css.includes(editorialBatch2CssMarker), "Batch 2 CSS marker is missing");
const editorialBatch2Slice = editorialBatch2Css.slice(editorialBatch2Css.indexOf(editorialBatch2CssMarker));
for (const marker of [
  ".ambientLogo",
  'url("/halleus-logo/emblem-transparent.png")',
  ".reportChartRail :global(.report-astrochart-wheel-legend)",
  "reportWheelOverlayOutBatch2",
  "@media (max-width: 1024px)",
  "@media (max-width: 760px)",
  "@media (max-width: 390px)",
  "@media (prefers-reduced-motion: reduce)",
]) {
  assert(editorialBatch2Slice.includes(marker), "Batch 2 CSS missing " + marker);
}
for (const forbiddenBlue of ["#1e40af", "#d9eafd", "30 64 175", "30, 64, 175"]) {
  assert(!editorialBatch2Slice.toLowerCase().includes(forbiddenBlue), "Batch 2 CSS introduces blue UI: " + forbiddenBlue);
}
assert(!editorialBatch2Reader.includes("ReportStoryMode"), "Story Mode must stay removed in Batch 2");
// HALLEUS_REPORT_EDITORIAL_MOTION_BATCH2_GUARD_20260808

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
console.log("- continuous journey navigation, explicit no-transit fallback, legacy fallback, and unknown-time degradation are covered");
for (const metric of metrics) {
  console.log(`  ${metric.fixtureId}: natal=${metric.natalWords} words/${metric.natalMinutes} min, technical=${metric.technicalMinutes} min, transit=${metric.transitMinutes} min`);
}
