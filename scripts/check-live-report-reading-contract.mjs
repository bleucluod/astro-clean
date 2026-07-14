import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalResolveFilename = Module._resolveFilename;
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function resolveWithTypeScriptExtensions(candidate) {
  const candidates = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, "index.ts"),
  ];
  return candidates.find((option) => fs.existsSync(option)) ?? candidate;
}

Module._resolveFilename = function resolveHalleusAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      resolveWithTypeScriptExtensions(path.join(root, request.slice(2))),
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
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2021,
      strict: true,
    },
  });
  module._compile(transpiled.outputText, filename);
};

const detail = read("components/ReportDetail.tsx");
const experience = read("components/ReportV3Experience.tsx");
const helper = read("lib/report-output/live-report-reading-contract.ts");
const reportV3 = read("lib/report-output/report-v3.ts");
const placements = read("components/ReportPlanetPlacementSections.tsx");
const aspects = read("components/ReportAspectRelationshipSections.tsx");
const specialPoints = read("components/ReportSpecialPointsNarrativeSection.tsx");
const writer = read("lib/astrology/real-engine-report-writer.ts");
const pkg = JSON.parse(read("package.json"));

const primaryOrder = [
  'id="final-reading"',
  'id="core-pillars"',
  'id="chart-ruler"',
  'id="important-houses"',
  'id="aspect-relationships"',
  'id="special-points"',
  'id="energy-balance"',
  'id="weekly-practices"',
  'id="planet-placements"',
  'id="chart-data"',
  'id="personal-transit"',
  'id="technical-details"',
];
let previousIndex = -1;
for (const marker of primaryOrder) {
  const index = detail.indexOf(marker);
  assert(index > previousIndex, `Live primary order is missing or wrong at ${marker}.`);
  previousIndex = index;
}

for (const chip of [
  '["final-reading", "خلاصه"]',
  '["core-pillars", "خورشید، ماه و رایزینگ"]',
  '["chart-ruler", "سیاره‌ی راهبر"]',
  '["important-houses", "خانه‌های مهم"]',
  '["aspect-relationships", "رابطه‌های مهم"]',
  '["special-points", "دست‌های ماه"]',
  '["energy-balance", "ترکیب انرژی‌ها"]',
  '["weekly-practices", "سه کار این هفته"]',
  '["planet-placements", "سیاره‌ها در زندگی روزمره"]',
  '["chart-data", "داده‌های چارت"]',
  '["personal-transit", "آسمان ثبت‌شده"]',
  '["technical-details", "جزئیات محاسبه"]',
]) {
  assert(detail.includes(chip), `Missing reading-contract navigation chip: ${chip}`);
}

assert(experience.includes('<span className="badge">خلاصه</span>'), "Summary badge must be خلاصه.");
assert(experience.includes("summarySentences.map"), "Live summary must render bounded summary sentences.");
assert(!experience.includes("reportV3Sections.map"), "Live primary UI must not dump every stored section.");
assert(experience.match(/reportV3Disclaimer/g)?.length === 1, "Visible report disclaimer must render exactly once in the summary surface.");
assert(helper.includes("output.length === 5"), "Summary must be deterministically bounded to five sentences.");
assert(helper.includes("Math.max(10"), "Reading-time display must not fall below ten minutes.");
assert(helper.includes("Math.min(\n      13"), "Reading-time display must not exceed thirteen minutes.");
assert(helper.includes("getReflectionQuestions(sections).slice(0, 2)"), "Reflection questions must be capped at two.");
assert(helper.includes("primaryParagraphHashes"), "Primary interpretive paragraphs must share a normalized dedupe registry.");
assert(helper.includes("normalizeText"), "Primary paragraph dedupe must normalize text before comparison.");
assert(helper.includes("enhanceReportOutputV3"), "Old saved reports must pass through the existing V3 compatibility mapper.");
assert(helper.includes('getSection(sections, SECTION_IDS.summary)'), "Stored sections must be resolved by stable IDs.");
assert(helper.includes('mode === "caregiver"') && helper.includes('mode === "youth"'), "Summary guide must preserve stored audience mode.");
assert(helper.includes("ادامهٔ?"), "Primary summary cleanup must remove continuation role labels.");
assert(!reportV3.includes('title: `روایت کلی چارت ${name}`'), "V3 mapper must not expose the forbidden primary heading.");
assert(reportV3.includes('title: `خلاصه چارت ${name}`'), "V3 mapper must expose the concise summary title.");

assert(detail.includes("pillars.slice(0, 3)"), "Primary Sun/Moon/Rising cards must be exactly three.");
assert(detail.includes(".slice(0, 4)"), "Important-house cards must be capped at four.");
assert(aspects.includes(").slice(0, 5);"), "Relationship cards must be capped at five.");
for (const label of [
  "در عمل:",
  "وقتی خوب کار می‌کند:",
  "جایی که گیر می‌کند:",
  "این هفته امتحان کن:",
]) {
  assert(aspects.includes(label), `Relationship card is missing label: ${label}`);
}
assert(aspects.includes("<details>"), "Orb and confidence must be placed in progressive details.");
assert(!aspects.includes("خلاصه ساده:"), "Relationship cards must not keep the duplicate focus row.");
assert(placements.includes("isIndependentFocus"), "Placement focus must be conditional.");
assert(placements.includes("کجا بیشتر دیده می‌شود؟"), "Independent placement focus must use the approved label.");
assert(specialPoints.includes("دست‌های ماه — الگوی آشنا، انتخاب تازه"), "Node-axis section must use the reading-contract title.");
assert(specialPoints.includes("<summary>جزئیات فنی لیلیت</summary>"), "Lilith technical/model material must stay accessible outside the primary node narrative.");
assert(!specialPoints.includes("<strong>اعتماد و مرز خوانش:</strong>"), "Node model notes must not repeat inside both primary cards.");

for (const forbidden of [
  "خوانش نهایی گزارش",
  "روایت کلی چارت",
  "نخ اصلی این چارت",
  "سه ستون اصلی",
  "ذهن، رابطه، عمل و روابط مهم",
]) {
  assert(!experience.includes(forbidden) && !detail.includes(forbidden), `Forbidden primary heading remains: ${forbidden}`);
}
assert(!experience.includes("چطور بخوانی:"), "Reader-cue label must not render in primary summary.");
assert(!experience.includes("خلاصه فصل:"), "Chapter-summary label must not render in primary summary.");
assert(writer.includes('title: "سیاره‌ی راهبر"'), "Generation-time title must use سیاره‌ی راهبر.");
assert(detail.includes("حاکم سنتی چارت"), "Traditional ruler terminology must remain secondary and technical.");

for (const technicalMarker of [
  "placements.map((placement)",
  "houses.map((house: RealEngineReportHouse)",
  "aspects.map((aspect: RealEngineReportAspect)",
  "getLunarNodeTechnicalTitle",
  "ReportDetailFactsPanel",
]) {
  assert(detail.includes(technicalMarker), `Technical inventory accessibility marker missing: ${technicalMarker}`);
}
assert(detail.includes("engineData?.personalTransitReportData"), "Transit section must continue to read only stored transit data.");
assert(placements.includes("getReportBehavioralAudienceMode(report)"), "QA-12H audience mode must remain connected to placement copy.");
assert(pkg.scripts?.["check:live-report-reading-contract"] === "node scripts/check-live-report-reading-contract.mjs", "package.json must expose the focused reading-contract guard.");

const { buildLiveReportReadingContract } = require("../lib/report-output/live-report-reading-contract.ts");
const syntheticReport = {
  id: "saved-report-fixture",
  createdAt: "2026-07-14T00:00:00.000Z",
  input: { name: "نمونه", birthDate: "2014-01-01", birthTime: "12:00", birthCity: "تهران" },
  chart: {
    sunSign: { key: "aries", faName: "حمل" },
    moonSign: { key: "taurus", faName: "ثور" },
    risingSign: { key: "gemini", faName: "جوزا" },
  },
  realEngine: {
    behavioralAudienceMode: "youth",
    placements: [],
  },
  summary: "نمونه",
  interpretations: [],
  safetyNote: "نمونه",
  interpretationSections: [
    {
      id: "real-engine-first-synthesis",
      kind: "overview",
      title: "legacy title",
      body: "چطور بخوانی: این راهنما نباید در متن اصلی بماند.\n\nادامهٔ کشمکش اصلی: جمله اول این خلاصه درباره الگوی اصلی چارت است. جمله دوم به شکل بروز آن در زندگی روزمره اشاره می‌کند. جمله سوم یک جهت روشن برای مشاهده می‌دهد. جمله چهارم رابطه میان انتخاب و احساس را توضیح می‌دهد. جمله پنجم گزارش را به یک اقدام کوچک وصل می‌کند.\n\nبرای تأمل: کدام بخش بیشتر به تجربه تو نزدیک است؟",
    },
    {
      id: "real-engine-chart-ruler",
      kind: "identity",
      title: "legacy ruler title",
      body: "سیاره راهبر در شروع‌ها و تصمیم‌های روزمره یک ریتم تکرارشونده می‌سازد.\n\nبرای تأمل: این ریتم کجا بیشتر دیده می‌شود؟",
    },
    {
      id: "real-engine-active-houses",
      kind: "growth",
      title: "legacy houses title",
      body: "خلاصه فصل: این برچسب نباید نمایش داده شود.\n\nخانه‌های مهم چند میدان واقعی زندگی را برجسته می‌کنند.",
    },
    {
      id: "real-engine-node-axis",
      kind: "growth",
      title: "legacy nodes title",
      body: "الگوی آشنا و انتخاب تازه دو سوی یک تمرین تدریجی هستند.",
    },
    {
      id: "real-engine-balance",
      kind: "overview",
      title: "legacy balance title",
      body: "ترکیب انرژی‌ها ریتم کلی حرکت و مکث را نشان می‌دهد.",
    },
    {
      id: "real-engine-personal-summary",
      kind: "growth",
      title: "legacy practices title",
      body: "سه تمرین کوچک این چارت: ۱) یک موقعیت را ثبت کن؛ ۲) پیش از واکنش مکث کن؛ ۳) نتیجه را آخر هفته مرور کن.",
    },
  ],
};
const contract = buildLiveReportReadingContract(syntheticReport);
assert(contract.summarySentences.length >= 4 && contract.summarySentences.length <= 6, "Runtime summary must contain four to six sentences.");
assert(contract.reflectionQuestions.length <= 2, "Runtime reflection questions must be capped at two.");
assert(contract.weeklyPractices.length === 3, "Runtime weekly-practice list must contain exactly three actions.");
assert(contract.readingMinutes >= 10 && contract.readingMinutes <= 13, "Runtime reading time must stay in the 10–13 minute range.");
assert(contract.guide.includes("تعریف ثابت"), "Youth fixture must preserve youth-facing guidance.");
assert(!contract.summarySentences.join(" ").includes("چطور بخوانی"), "Runtime summary must strip reader-cue labels.");
assert(!contract.summarySentences.join(" ").includes("ادامهٔ کشمکش اصلی"), "Runtime summary must strip continuation role labels.");

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Live report reading contract check passed.");
console.log("- primary live route follows the twelve-section reading order");
console.log("- summary, questions, houses, relationships, and weekly actions are bounded");
console.log("- normalized primary paragraphs are deduplicated and old saved sections remain compatible");
console.log("- full placements, aspects, nodes, chart data, and calculation details remain accessible");
