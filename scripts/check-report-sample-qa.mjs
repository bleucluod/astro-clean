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

const { enrichReportWithRealEngineCopy } = require("../lib/astrology/real-engine-report-writer.ts");

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

function placement(id, signId, degreeInSign, label = id) {
  return {
    id,
    label,
    longitude: signStarts[signId] + degreeInSign,
    signId,
    degreeInSign,
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
  return {
    version: "real-engine-preview-v1",
    generatedAt: "2026-07-02T12:00:00.000Z",
    cityLabel,
    utcIso: "1992-08-12T07:30:00.000Z",
    ascendantLongitude,
    placements,
    note:
      "نمونه QA برای خواندن خروجی واقعی گزارش؛ house و ascendant همچنان باید با احتیاط و به شکل تقریبی خوانده شوند.",
  };
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
        placement("sun", "aries", 12.4, "خورشید"),
        placement("moon", "leo", 12.1, "ماه"),
        placement("mercury", "gemini", 12.0, "عطارد"),
        placement("venus", "libra", 12.2, "زهره"),
        placement("mars", "cancer", 12.0, "مریخ"),
        placement("jupiter", "capricorn", 12.6, "مشتری"),
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
        placement("sun", "pisces", 8.3, "خورشید"),
        placement("moon", "cancer", 8.0, "ماه"),
        placement("mercury", "pisces", 10.2, "عطارد"),
        placement("venus", "capricorn", 8.1, "زهره"),
        placement("mars", "gemini", 7.8, "مریخ"),
      ],
    }),
    expectedAnyAspectWords: ["هم‌نشینی", "جریان هماهنگ", "چالش سازنده"],
  },
];

const requiredSectionIds = [
  "real-engine-overview",
  "real-engine-identity",
  "real-engine-emotional-pattern",
  "real-engine-relationships",
  "real-engine-career",
  "real-engine-growth",
  "real-engine-reflection-prompts",
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

  if (totalWords < 700) {
    failures.push(`${sample.id}: total generated section text is too short (${totalWords} words)`);
  }

  if (!combined.includes("رایزینگ تقریبی")) {
    failures.push(`${sample.id}: report does not disclose approximate rising language`);
  }

  if (!combined.includes("هالیوس")) {
    failures.push(`${sample.id}: report does not include Persian brand spelling`);
  }

  for (const pattern of forbiddenTextPatterns) {
    if (pattern.test(combined)) {
      failures.push(`${sample.id}: forbidden copy pattern present: ${pattern}`);
    }
  }

  if (!sample.expectedAnyAspectWords.some((word) => combined.includes(word))) {
    failures.push(
      `${sample.id}: expected at least one major aspect language marker, checked: ${sample.expectedAnyAspectWords.join(", ")}`,
    );
  }

  if (aspectCount < 3) {
    failures.push(`${sample.id}: expected at least 3 calculated aspects, got ${aspectCount}`);
  }


  metrics.push({
    id: sample.id,
    sections: sections.length,
    words: totalWords,
    aspects: aspectCount,
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
    `- ${metric.id}: ${metric.sections} sections, ${metric.words} words, ${metric.aspects} aspects`,
  );
}
