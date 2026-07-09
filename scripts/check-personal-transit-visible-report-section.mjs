import { readFileSync } from "node:fs";
function read(path) { return readFileSync(path, "utf8").replace(/\r\n/g, "\n"); }
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function includesAll(label, text, markers) { for (const marker of markers) assert(text.includes(marker), label + " missing marker: " + marker); }
function excludesAll(label, text, markers) { for (const marker of markers) assert(!text.includes(marker), label + " must not include marker: " + marker); }
const reportCard = read("components/ReportCard.tsx");
const section = read("components/PersonalTransitReportSection.tsx");
const contract = read("src/lib/chart/natal-to-transit-contract.ts");
const bridge = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const packageJson = JSON.parse(read("package.json"));
const docs = [
  ["docs/HALLEUS_PROJECT_CONTEXT.md", read("docs/HALLEUS_PROJECT_CONTEXT.md")],
  ["docs/HALLEUS_IDEA_GARDEN.md", read("docs/HALLEUS_IDEA_GARDEN.md")],
  ["docs/HALLEUS_ENGINE_REALITY_AUDIT.md", read("docs/HALLEUS_ENGINE_REALITY_AUDIT.md")],
  ["docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md", read("docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md")],
];
includesAll("ReportCard personal transit wiring", reportCard, ["PersonalTransitReportSection", "getPersonalTransitReportData(report)", "engineData?.personalTransitReportData", "<PersonalTransitReportSection data={personalTransitReportData} />"]);
includesAll("PersonalTransitReportSection", section, ["v0.1.255-personal-transit-visible-report-section", "آسمان امروز نسبت به چارت تولد تو", "ترنزیت امروز برای چارت تولد", "محل تولد", "محل زندگی فعلی", "بدون پیش‌فرض پنهان تهران", "missing-current-residence", "دست‌های ماه، لیلیت، خانه‌ها و زاویه‌ها"]);
excludesAll("PersonalTransitReportSection", section, ["fetch(", "axios", "swisseph", "sweph", "process.env", "window.location", "localStorage", "paid-private", "payment"]);
includesAll("contract visible report section status", contract, ["personalTransitStage: \"user-visible\"", "userVisibleDone: true", "dataBridgeDone: true", "visibleReportSectionAfterDataBridge: true", "visibleReportSectionApproved: true", "completedMilestone: \"v0.1.255-personal-transit-first-visible-report-section\"", "nextMilestone: \"post-v0.1.255-report-depth-and-synthesis\""]);
includesAll("bridge remains data source", bridge, ["engineData.personalTransitReportData", "userVisible: false", "visibleReportSectionApproval: false", "No silent Tehran default is allowed for personal reports."]);
assert(packageJson.scripts?.["check:personal-transit-visible-report-section"] === "node scripts/check-personal-transit-visible-report-section.mjs", "package.json must expose visible section guard.");
assert(packageJson.scripts?.["check:reports"]?.includes("pnpm run check:personal-transit-visible-report-section"), "check:reports must include visible section guard.");
for (const [file, text] of docs) includesAll(file, text, ["v0.1.255 Personal Transit First Visible Report Section", "engineData.personalTransitReportData", "visible report section", "current residence", "birth place", "no silent Tehran default", "post-v0.1.255-report-depth-and-synthesis"]);
if (failures.length > 0) { console.error("Personal transit visible report section guard failed:"); for (const failure of failures) console.error("- " + failure); process.exit(1); }
console.log("Personal transit visible report section guard passed.");
