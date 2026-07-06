import { readFileSync } from "node:fs";

const requiredFiles = [
  "lib/astrology/real-engine-report-writer.ts",
  "components/ReportCard.tsx",
  "scripts/check-report-narrative-qa-guards.mjs",
];

const writerSource = readFileSync(requiredFiles[0], "utf8");
const reportCardSource = readFileSync(requiredFiles[1], "utf8");
const checkSource = readFileSync(requiredFiles[2], "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";
const checkReports = packageJson.scripts?.["check:reports"] ?? "";
const failures = [];

for (const filePath of requiredFiles) {
  try {
    readFileSync(filePath, "utf8");
  } catch {
    failures.push(`Missing required file: ${filePath}`);
  }
}

const guardedSources = [
  { path: "lib/astrology/real-engine-report-writer.ts", source: writerSource },
  { path: "components/ReportCard.tsx", source: reportCardSource },
];

const allowedSanitizerLine = (line) => line.includes(".replace(/");

const blockedOutputFragments = [
  "پشتوانه این بخش: پشتوانه این بخش",
  "میانه آسمان / میانه آسمان",
  "ریشه آسمان / ریشه آسمان",
  "دست‌های ماه با مدل دست‌های ماه",
  "محور دست‌های ماه با مدل دست‌های ماه",
  "مدل مدل نوسانی/واقعی",
  "رابطه سیاره‌ایهای",
  "رابطه سیاره‌ایها",
  "و ۴ خانه فعال دیگر",
  "و ۵ خانه فعال دیگر",
  "و ۴ جایگاه دیگر",
  "و ۵ جایگاه دیگر",
  "زاویه واقعی 90.00°",
  "زاویه واقعی 60.00°",
  "زاویه واقعی 120.00°",
  "این placement دقیقاً از ترکیب",
  "این جایگاه دقیقاً از ترکیب",
  "این بخش گزارش را از فهرست جایگاه‌ها به نخ مرکزی چارت تبدیل می‌کند",
  "بنابراین گزارش از میدان‌های واقعی زندگی شروع می‌شود",
  "این رابطه به دلیل پیوندش با ستون‌های چارت جلوتر از رابطه‌های سیاره‌ای صرفاً نزدیک خوانده می‌شود",
];

for (const { path, source } of guardedSources) {
  const lines = source.split(/\r?\n/u);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const isSanitizer = path.endsWith("real-engine-report-writer.ts") && allowedSanitizerLine(line);

    for (const fragment of blockedOutputFragments) {
      if (line.includes(fragment) && !isSanitizer) {
        failures.push(`${path}:${lineNumber} exposes blocked narrative fragment: ${fragment}`);
      }
    }

    if (/hard aspect/iu.test(line) && !isSanitizer) {
      failures.push(`${path}:${lineNumber} exposes internal English phrase: hard aspect`);
    }

    if (/این\s+placement/iu.test(line) && !isSanitizer) {
      failures.push(`${path}:${lineNumber} exposes internal English phrase: placement`);
    }
  });
}

for (const marker of [
  "function sanitizeUserFacingReportText",
  ".replace(/chartSpine/giu",
  ".replace(/hard aspect/giu",
  ".replace(/placement/giu",
  ".replace(/دست‌های ماه با مدل دست‌های ماه با مدل میانگین",
  ".replace(/مدل مدل نوسانی\\/واقعی",
  ".replace(/رابطه سیاره‌ایهای",
  "buildChartPracticeList",
  "buildHumanAspectNarrative",
  "buildNodeAxisSummaryPhrase",
  "buildChartSpineHumanSummary",
  "prioritizeRealEngineAspects",
]) {
  if (!writerSource.includes(marker)) {
    failures.push(`Report writer missing narrative QA marker: ${marker}`);
  }
}

for (const marker of [
  "slice(0, 4)",
  "slice(0, 5)",
  "buildChartPracticeList(chartSpine, realEngine)",
  'isAspectBetween(aspect, "mars", "saturn")',
  'aspect.aspectId === "opposition"',
  'isAspectBetween(aspect, "moon", "uranus")',
  'isAspectBetween(aspect, "moon", "saturn")',
  "دست‌های ماه در این گزارش با مدل میانگین خوانده می‌شوند",
]) {
  if (!writerSource.includes(marker)) {
    failures.push(`Report writer missing fewer-but-better narrative marker: ${marker}`);
  }
}

for (const marker of [
  "زاویه الگو:",
  "زاویه واقعی:",
  "اورب:",
  "رابطه‌های تنشی",
]) {
  if (!reportCardSource.includes(marker)) {
    failures.push(`ReportCard missing aspect display marker: ${marker}`);
  }
}

if (
  packageJson.scripts?.["check:report-narrative-qa-guards"] !==
  "node scripts/check-report-narrative-qa-guards.mjs"
) {
  failures.push("Missing package script: check:report-narrative-qa-guards");
}

if (!checkReports.includes("pnpm run check:report-narrative-qa-guards")) {
  failures.push("check:reports does not run check:report-narrative-qa-guards");
}

if (!checkProject.includes("pnpm run check:report-narrative-qa-guards")) {
  failures.push("check:project does not run check:report-narrative-qa-guards");
}

if (!checkSource.includes("blockedOutputFragments")) {
  failures.push("Narrative QA guard script is missing blockedOutputFragments.");
}

if (failures.length > 0) {
  console.error("Report narrative QA guard check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Report narrative QA guard check passed for 3 files.");
