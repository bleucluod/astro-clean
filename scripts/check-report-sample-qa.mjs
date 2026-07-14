import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalResolveFilename = Module._resolveFilename;

function resolveWithTypeScriptExtensions(candidate) {
  const candidates = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, "index.ts"),
    path.join(candidate, "index.tsx"),
    path.join(candidate, "index.js"),
  ];

  for (const option of candidates) {
    if (fs.existsSync(option)) {
      return option;
    }
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

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2020,
      resolveJsonModule: true,
      skipLibCheck: true,
      strict: true,
    },
  });

  module._compile(transpiled.outputText, filename);
};

const writerSource = fs.readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
const { enrichReportWithRealEngineCopy } = require("../lib/astrology/real-engine-report-writer.ts");

const signOrder = [
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

const signStarts = {
  aries: 0,
  taurus: 30,
  gemini: 60,
  cancer: 90,
  leo: 120,
  virgo: 150,
  libra: 180,
  scorpio: 210,
  sagittarius: 240,
  capricorn: 270,
  aquarius: 300,
  pisces: 330,
};

const signs = {
  aries: {
    key: "aries",
    faName: "حمل",
    enName: "Aries",
    element: "آتش",
    quality: "کاردینال",
  },
  gemini: {
    key: "gemini",
    faName: "جوزا",
    enName: "Gemini",
    element: "هوا",
    quality: "متغیر",
  },
  cancer: {
    key: "cancer",
    faName: "سرطان",
    enName: "Cancer",
    element: "آب",
    quality: "کاردینال",
  },
  leo: {
    key: "leo",
    faName: "اسد",
    enName: "Leo",
    element: "آتش",
    quality: "ثابت",
  },
  libra: {
    key: "libra",
    faName: "میزان",
    enName: "Libra",
    element: "هوا",
    quality: "کاردینال",
  },
  capricorn: {
    key: "capricorn",
    faName: "جدی",
    enName: "Capricorn",
    element: "زمین",
    quality: "کاردینال",
  },
  pisces: {
    key: "pisces",
    faName: "حوت",
    enName: "Pisces",
    element: "آب",
    quality: "متغیر",
  },
};

function placement(id, signId, degreeInSign, label = id, house = null) {
  return {
    id,
    label,
    longitude: signStarts[signId] + degreeInSign,
    signId,
    degreeInSign,
    house,
    method: "v0.1.136-sample-qa-fixture",
  };
}

function makeBaseReport(id, input, chartSigns) {
  return {
    id,
    createdAt: "2026-07-02T12:00:00.000Z",
    input,
    chart: {
      sunSign: chartSigns.sun,
      moonSign: chartSigns.moon,
      risingSign: chartSigns.rising,
    },
    summary: "پیش‌نمایش قدیمی گزارش که باید با متن real-engine جایگزین شود.",
    interpretations: ["متن قدیمی که نباید خروجی اصلی نمونه باشد."],
    safetyNote:
      "این گزارش برای تأمل شخصی است و جایگزین تصمیم پزشکی، حقوقی، مالی یا مالی نیست.",
  };
}

function makeSnapshot({ cityLabel, ascendantLongitude, placements }) {
  const angles = makeAngles(ascendantLongitude);
  const houses = makeWholeSignHouses(ascendantLongitude, placements, angles);

  return {
    version: "real-engine-preview-v1",
    generatedAt: "2026-07-02T12:00:00.000Z",
    cityLabel,
    utcIso: "1992-08-12T07:30:00.000Z",
    ascendantLongitude,
    houseSystem: "whole-sign",
    houses,
    angles,
    calculationQuality: {
      status: "partial",
      houseSystemStatus: "calculated",
      anglesStatus: "calculated",
      retrogradeStatus: "calculated",
      nodesStatus: "not-calculated",
      lilithStatus: "not-calculated",
      limitations: ["sample QA fixture"],
      warnings: [],
    },
    retrogrades: {
      status: "calculated",
      method: "v0.1.159-sample-qa-motion-fixture",
      planetIds: ["mercury"],
      limitation: "Sample QA fixture: Mercury is marked retrograde so the motion section is covered.",
    },
    lunarNodes: {
      status: "not-calculated",
      method: "lunar-nodes",
      limitation: "Sample QA fixture keeps lunar nodes deferred.",
    },
    lilith: {
      status: "not-calculated",
      method: "black-moon-lilith",
      limitation: "Sample QA fixture keeps Black Moon Lilith deferred.",
    },
    placements,
    note:
      "نمونه QA برای خواندن خروجی واقعی گزارش؛ خانه‌ها و محورهای اصلی در fixture ذخیره شده‌اند تا متن گزارش کامل‌تر تست شود.",
  };
}

function makeAngles(ascendantLongitude) {
  const asc = makeAngle("asc", "ASC / رایزینگ", ascendantLongitude, ascendantLongitude, "calculated", "calculated");
  const dsc = makeAngle("dsc", "DSC / نقطه روبه‌رو", ascendantLongitude + 180, ascendantLongitude, "derived-opposition", "derived");
  const mc = makeAngle("mc", "MC / میانه آسمان", ascendantLongitude + 92, ascendantLongitude, "calculated", "calculated");
  const ic = makeAngle("ic", "IC / ریشه آسمان", ascendantLongitude + 272, ascendantLongitude, "derived-opposition", "derived");

  return { asc, dsc, mc, ic };
}

function makeAngle(id, label, longitude, ascendantLongitude, source, reliability) {
  const normalized = normalizeLongitude(longitude);
  const ascSign = signOrder[Math.floor(normalizeLongitude(ascendantLongitude) / 30) % 12];
  const signId = signOrder[Math.floor(normalized / 30) % 12];

  return {
    id,
    label,
    longitude: normalized,
    signId,
    degreeInSign: normalized % 30,
    method: "v0.1.158-sample-qa-fixture",
    source,
    reliability,
    house: getWholeSignHouseNumber(signId, ascSign),
    limitation: null,
  };
}

function makeWholeSignHouses(ascendantLongitude, placements, angles) {
  const ascSign = signOrder[Math.floor(normalizeLongitude(ascendantLongitude) / 30) % 12];
  const ascSignIndex = signOrder.indexOf(ascSign);

  return Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    const signId = signOrder[(ascSignIndex + index) % 12];
    const angleIds = Object.values(angles)
      .filter((angle) => getWholeSignHouseNumber(angle.signId, ascSign) === number)
      .map((angle) => angle.id);

    return {
      number,
      signId,
      cuspLongitude: signStarts[signId],
      degreeInSign: 0,
      system: "whole-sign",
      method: "whole-sign-from-ascendant",
      reliability: "calculated",
      planetIds: placements.filter((item) => item.house === number).map((item) => item.id),
      angleIds,
      limitation: null,
    };
  });
}

function getWholeSignHouseNumber(signId, ascSignId) {
  const signIndex = signOrder.indexOf(signId);
  const ascIndex = signOrder.indexOf(ascSignId);
  return ((signIndex - ascIndex + 12) % 12) + 1;
}

function normalizeLongitude(value) {
  return ((value % 360) + 360) % 360;
}

const samples = [
  {
    id: "aspect-rich-complete-chart",
    report: makeBaseReport(
      "sample-aspect-rich",
      {
        name: "نمونه کامل",
        birthDate: "1992-08-12",
        birthTime: "11:00",
        birthCity: "تهران",
        birthCountry: "ایران",
      },
      {
        sun: signs.aries,
        moon: signs.leo,
        rising: signs.leo,
      },
    ),
    snapshot: makeSnapshot({
      cityLabel: "تهران، ایران",
      ascendantLongitude: 142.4,
      placements: [
        placement("sun", "aries", 12.4, "خورشید", 9),
        placement("moon", "leo", 12.1, "ماه", 1),
        placement("mercury", "gemini", 12.0, "عطارد", 11),
        placement("venus", "libra", 12.2, "زهره", 3),
        placement("mars", "cancer", 12.0, "مریخ", 12),
        placement("jupiter", "capricorn", 12.6, "مشتری", 6),
      ],
    }),
    expectedAnyAspectWords: ["جریان هماهنگ", "فرصت نرم", "قطبیت آگاه‌کننده", "چالش سازنده"],
  },
  {
    id: "minimal-core-chart",
    report: makeBaseReport(
      "sample-core-only",
      {
        name: "نمونه ساده",
        birthDate: "1998-02-03",
        birthTime: "06:40",
        birthCity: "تبریز",
        birthCountry: "ایران",
      },
      {
        sun: signs.pisces,
        moon: signs.cancer,
        rising: signs.capricorn,
      },
    ),
    snapshot: makeSnapshot({
      cityLabel: "تبریز، ایران",
      ascendantLongitude: 281.5,
      placements: [
        placement("sun", "pisces", 8.3, "خورشید", 3),
        placement("moon", "cancer", 8.0, "ماه", 7),
        placement("mercury", "pisces", 10.2, "عطارد", 3),
        placement("venus", "capricorn", 8.1, "زهره", 1),
        placement("mars", "gemini", 7.8, "مریخ", 6),
      ],
    }),
    expectedAnyAspectWords: ["هم‌نشینی", "جریان هماهنگ", "چالش سازنده"],
  },
];

const PRODUCT_POLISH_GUARD = "v0.1.162-product-polish";
const READING_POLISH_GUARD = "v0.1.168-reading-polish";
const SYNTHESIS_READING_GUARD = "v0.1.169-report-synthesis";
void SYNTHESIS_READING_GUARD;
const DEPTH_HUMANIZATION_GUARD = "v0.1.170-report-depth-humanization";
void DEPTH_HUMANIZATION_GUARD;
const FIRST_SYNTHESIS_GUARD = "v0.1.195-report-depth-first-synthesis";
void FIRST_SYNTHESIS_GUARD;

const requiredSectionIds = [
  "real-engine-first-synthesis",
  "real-engine-core-pattern",
  "real-engine-chart-ruler",
  "real-engine-active-houses",
  "real-engine-daily-life",
  "real-engine-node-axis",
  "real-engine-balance",
  "real-engine-personal-summary",
];

const forbiddenTextPatterns = [
  /Halleus/u,
  /گزارش Halleus/u,
  /Halleus نسخه/u,
  /هدیه طبیعیآن/u,
  /روایتشخصی/u,
  /فعلیتو/u,
  /جملهکوتاه/u,
  /چندزاویه/u,
  /not addingnew/u,
  /reportquality/u,
];

function wordCount(text) {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

function assertCrossSectionConsistency(sampleId, sections, failures) {
  const firstSection = sections.find((section) => section.id === "real-engine-first-synthesis");
  const dailySection = sections.find((section) => section.id === "real-engine-daily-life");
  const summarySection = sections.find((section) => section.id === "real-engine-personal-summary");

  if (!firstSection || !dailySection || !summarySection) {
    failures.push(`${sampleId}: cross-section consistency cannot be checked because a required section is missing`);
    return;
  }

  const weeklyPracticeMatch = firstSection.body.match(/تمرین این هفته: ([^\n.]+(?:\.[^\n]*)?)(?:\n|$)/u);
  const weeklyPractice = weeklyPracticeMatch?.[1]?.replace(/[.؟!]+$/u, "").trim();
  if (!weeklyPractice || !summarySection.body.includes(weeklyPractice)) {
    failures.push(`${sampleId}: final summary does not reuse the same weekly practice`);
  }

  for (const marker of ["ادامهٔ کشمکش اصلی", "ادامهٔ منبع همراه", "ادامهٔ ترجمهٔ روزمره"]) {
    if (!dailySection.body.includes(marker)) {
      failures.push(`${sampleId}: daily-life section missing synthesis role continuation ${marker}`);
    }
  }

  if (dailySection.body.includes("زاویه الگو:") || dailySection.body.includes("زاویه واقعی:")) {
    failures.push(`${sampleId}: daily-life narrative still exposes technical angle detail`);
  }

  if (!summarySection.body.includes("جمع‌بندی همان نخ آغاز گزارش را نگه می‌دارد")) {
    failures.push(`${sampleId}: final summary does not explicitly preserve the opening thread`);
  }
}

const failures = [];
const metrics = [];

for (const sample of samples) {
  const enriched = enrichReportWithRealEngineCopy(sample.report, sample.snapshot);
  const sections = enriched.interpretationSections ?? [];
  const combined = [
    enriched.summary,
    ...(enriched.interpretations ?? []),
    ...sections.map((section) => `${section.title}\n${section.body}`),
    enriched.safetyNote,
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .join("\n\n");

  const ids = sections.map((section) => section.id);
  const totalWords = sections.reduce((sum, section) => sum + wordCount(section.body), 0);
  const aspectCount = enriched.realEngine?.aspects?.length ?? 0;
  const aspectHighlightCount = enriched.realEngine?.aspectHighlights?.length ?? 0;
  const housesCount = enriched.realEngine?.houses?.length ?? 0;
  const housesSection = sections.find((section) => section.id === "real-engine-active-houses");

  assertCrossSectionConsistency(sample.id, sections, failures);

  if (!Array.isArray(sections) || sections.length < requiredSectionIds.length) {
    failures.push(`${sample.id}: expected at least ${requiredSectionIds.length} generated sections, got ${sections.length}`);
  }

  for (const id of requiredSectionIds) {
    if (!ids.includes(id)) {
      failures.push(`${sample.id}: missing required section id ${id}`);
    }
  }

  for (const section of sections) {
    const count = wordCount(section.body);
    if (count < 28) {
      failures.push(`${sample.id}: section ${section.id} is too short (${count} words)`);
    }
  }

  if (totalWords < 850) {
    failures.push(`${sample.id}: total generated section text is too short (${totalWords} words)`);
  }

  if (totalWords > 1950) {
    failures.push(`${sample.id}: main narrative is too long after synthesis depth pass (${totalWords} words)`);
  }

  if (!combined.includes("رایزینگ تقریبی")) {
    failures.push(`${sample.id}: report does not disclose approximate rising language`);
  }

  if (!combined.includes("هالیوس")) {
    failures.push(`${sample.id}: report does not include Persian brand spelling`);
  }


  if (!combined.includes("خانه ۱") && !combined.includes("خانه ۹")) {
    failures.push(`${sample.id}: report does not include Persian house-number wording`);
  }

  for (const pattern of forbiddenTextPatterns) {
    if (pattern.test(combined)) {
      failures.push(`${sample.id}: forbidden copy pattern present: ${pattern}`);
    }
  }

  for (const fragment of [".؛", "؛.", "؟."]) {
    if (combined.includes(fragment)) {
      failures.push(`${sample.id}: awkward punctuation sequence present: ${fragment}`);
    }
  }

  for (const marker of [
    "نخ اصلی این چارت",
    "سه ستون اصلی",
    "کشمکش اصلی:",
    "منبع همراه:",
    "ترجمهٔ روزمره:",
    "تمرین این هفته:",
    "رابطه‌های سیاره‌ای",
    "گفت‌وگوی درونی",
    "سه تمرین کوچک این چارت",
    "خانه‌های فعال",
  ]) {
    if (!combined.includes(marker)) {
      failures.push(`${sample.id}: missing current V3 synthesis marker ${marker}`);
    }
  }

  if (combined.includes("دو نیاز هم‌زمان فعال‌اند و هیچ‌کدام نباید کامل حذف شوند")) {
    failures.push(`${sample.id}: old generic central-tension sentence is still present`);
  }

  if (!["کشمکش اصلی", "منبع همراه", "ترجمهٔ روزمره"].every((word) => combined.includes(word))) {
    failures.push(`${sample.id}: main narrative is missing one or more synthesis role labels`);
  }

  if (aspectCount < 3) {
    failures.push(`${sample.id}: expected at least 3 calculated aspects, got ${aspectCount}`);
  }

  if (aspectHighlightCount < 1 || aspectHighlightCount > 6) {
    failures.push(`${sample.id}: expected 1-6 separate narrative aspect highlights, got ${aspectHighlightCount}`);
  }

  if (aspectHighlightCount > aspectCount) {
    failures.push(`${sample.id}: narrative aspect highlights exceed the full aspect inventory`);
  }

  if (housesCount !== 12) {
    failures.push(`${sample.id}: expected 12 real engine houses, got ${housesCount}`);
  }

  if (!housesSection) {
    failures.push(`${sample.id}: missing active houses section`);
  }

  for (const marker of ["حرکت برگشتی", "دست‌های ماه", "لیلیت"]) {
    if (!combined.includes(marker)) {
      failures.push(`${sample.id}: missing preserved report marker ${marker}`);
    }
  }

  if (housesSection) {
    for (const forbidden of [
      "محور رایزینگ و نقطه روبه‌رو",
      "محور میانه آسمان و ریشه آسمان",
      "جدول کامل ۱۲ خانه",
      "دقت این گزارش به ساعت تولد",
    ]) {
      if (housesSection.body.includes(forbidden)) {
        failures.push(`${sample.id}: active-house narrative still exposes technical marker ${forbidden}`);
      }
    }
  }

  for (const marker of [
    "function buildHouseAnglesText",
    "function buildNatalAccuracyText",
    "buildHouseAnglesText(realEngineWithAspects)",
    "buildNatalAccuracyText(realEngineWithAspects)",
  ]) {
    if (!writerSource.includes(marker)) {
      failures.push(`${sample.id}: technical report data path is missing ${marker}`);
    }
  }

  const technicalSnapshotMentions = (combined.match(/snapshot/g) ?? []).length;
  if (technicalSnapshotMentions > 0) {
    failures.push(`${sample.id}: too many user-facing snapshot mentions (${technicalSnapshotMentions})`);
  }


  metrics.push({
    id: sample.id,
    sections: sections.length,
    words: totalWords,
    aspects: aspectCount,
    aspectHighlights: aspectHighlightCount,
  });
}

if (failures.length > 0) {
  console.error("Report sample QA failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Report sample QA passed:");
for (const metric of metrics) {
  console.log(
    `- ${metric.id}: ${metric.sections} sections, ${metric.words} words, ${metric.aspects} aspects, ${metric.aspectHighlights} narrative highlights`,
  );
}
