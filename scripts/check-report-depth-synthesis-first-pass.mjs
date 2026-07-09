import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function includesAll(label, text, markers) {
  for (const marker of markers) {
    assert(text.includes(marker), label + " missing marker: " + marker);
  }
}

function excludesAll(label, text, markers) {
  for (const marker of markers) {
    assert(!text.includes(marker), label + " must not include marker: " + marker);
  }
}

const reportCard = read("components/ReportCard.tsx");
const synthesisSection = read("components/ReportSynthesisSection.tsx");
const personalTransitSection = read("components/PersonalTransitReportSection.tsx");
const packageJson = JSON.parse(read("package.json"));

const docs = [
  ["docs/HALLEUS_PROJECT_CONTEXT.md", read("docs/HALLEUS_PROJECT_CONTEXT.md")],
  ["docs/HALLEUS_IDEA_GARDEN.md", read("docs/HALLEUS_IDEA_GARDEN.md")],
  ["docs/HALLEUS_ENGINE_REALITY_AUDIT.md", read("docs/HALLEUS_ENGINE_REALITY_AUDIT.md")],
  ["docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md", read("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md")],
];

includesAll("ReportCard synthesis wiring", reportCard, [
  "ReportSynthesisSection",
  "coreCards={coreCards}",
  "aspectCount={realEngineAspects.length}",
  "shownAspectCount={shownAspects.length}",
  "personalTransitStatus={personalTransitReportData?.status ?? null}",
]);

includesAll("Report synthesis section", synthesisSection, [
  "v0.1.256-report-depth-synthesis-first-pass",
  "روایت ترکیبی گزارش",
  "سه ستون اصلی",
  "روابط مهم",
  "آسمان امروز نسبت به چارت تولد تو",
  "نه جایگزین",
  "محل زندگی فعلی",
]);

excludesAll("Report synthesis section", synthesisSection, [
  "fetch(",
  "axios",
  "swisseph",
  "sweph",
  "process.env",
  "localStorage",
  "paid-private",
  "payment",
]);

includesAll("Personal transit visible section remains present", personalTransitSection, [
  "v0.1.255-personal-transit-visible-report-section",
  "بدون پیش‌فرض پنهان تهران",
]);

assert(
  packageJson.scripts?.["check:report-depth-synthesis-first-pass"] ===
    "node scripts/check-report-depth-synthesis-first-pass.mjs",
  "package.json must expose report depth synthesis guard.",
);

assert(
  packageJson.scripts?.["check:reports"]?.includes("pnpm run check:report-depth-synthesis-first-pass"),
  "check:reports must include report depth synthesis guard.",
);

for (const [file, text] of docs) {
  includesAll(file, text, [
    "v0.1.256 Report depth/synthesis first pass",
    "Report depth/synthesis phase",
    "روایت ترکیبی گزارش",
    "three core cards",
    "personal transit visible section",
  ]);
}

if (failures.length > 0) {
  console.error("Report depth/synthesis first-pass guard failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Report depth/synthesis first-pass guard passed.");
