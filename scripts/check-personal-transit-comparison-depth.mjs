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
    assert(text.includes(marker), `${label} missing marker: ${marker}`);
  }
}

function excludesAll(label, text, markers) {
  for (const marker of markers) {
    assert(!text.includes(marker), `${label} must not include marker: ${marker}`);
  }
}

const section = read("components/PersonalTransitReportSection.tsx");
const bridge = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const packageJson = JSON.parse(read("package.json"));
const docs = [
  ["docs/HALLEUS_PROJECT_CONTEXT.md", read("docs/HALLEUS_PROJECT_CONTEXT.md")],
  ["docs/HALLEUS_IDEA_GARDEN.md", read("docs/HALLEUS_IDEA_GARDEN.md")],
  ["docs/HALLEUS_ENGINE_REALITY_AUDIT.md", read("docs/HALLEUS_ENGINE_REALITY_AUDIT.md")],
  ["docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md", read("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md")],
];

includesAll("PersonalTransitReportSection comparison depth", section, [
  "v0.1.255-personal-transit-visible-report-section",
  "v0.1.261-personal-transit-comparison-depth",
  "مقایسه‌ی چارت تولد و چارت امروز",
  "فشار/فرصت/توجه",
  "بدون پیش‌فرض پنهان تهران",
  "currentResidenceIsRequired",
  "missing-current-residence",
  "buildTransitInsight",
  "formatAspectTitle",
  "orbLimit",
  "data.aspectHighlights.slice(0, 6)",
  "دست‌های ماه، لیلیت، خانه‌ها و زاویه‌ها",
]);

excludesAll("PersonalTransitReportSection comparison depth", section, [
  "fetch(",
  "axios",
  "swisseph",
  "sweph",
  "process.env",
  "window.location",
  "localStorage",
  "paid-private",
  "payment",
]);

includesAll("personal transit data bridge remains source", bridge, [
  "engineData.personalTransitReportData",
  "currentResidenceRequired: true",
  "noSilentTehranDefaultForPersonalTransit: true",
  "aspectHighlights",
  "missing-current-residence",
]);

assert(
  packageJson.scripts?.["check:personal-transit-comparison-depth"] ===
    "node scripts/check-personal-transit-comparison-depth.mjs",
  "package.json must expose check:personal-transit-comparison-depth.",
);

assert(
  packageJson.scripts?.["check:reports"]?.includes(
    "pnpm run check:personal-transit-comparison-depth",
  ),
  "check:reports must include personal transit comparison depth guard.",
);

assert(
  packageJson.scripts?.["check:project"]?.includes(
    "pnpm run check:personal-transit-comparison-depth",
  ),
  "check:project must include personal transit comparison depth guard.",
);

for (const [file, text] of docs) {
  includesAll(file, text, [
    "v0.1.261 Personal Transit Comparison Depth",
    "personal transit comparison depth",
    "current residence",
    "no silent Tehran default",
    "natal chart vs today",
  ]);
}

if (failures.length > 0) {
  console.error("Personal transit comparison depth guard failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Personal transit comparison depth guard passed.");
