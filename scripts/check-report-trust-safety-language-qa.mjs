import fs from "node:fs";

const files = {
  reportCard: "components/ReportCard.tsx",
  synthesis: "components/ReportSynthesisSection.tsx",
  placements: "components/ReportPlanetPlacementSections.tsx",
  aspects: "components/ReportAspectRelationshipSections.tsx",
  specialPoints: "components/ReportSpecialPointsNarrativeSection.tsx",
  personalTransit: "components/PersonalTransitReportSection.tsx",
  packageJson: "package.json",
  projectContext: "docs/HALLEUS_PROJECT_CONTEXT.md",
  ideaGarden: "docs/HALLEUS_IDEA_GARDEN.md",
  realityAudit: "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  unificationPlan: "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
};

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const reportCard = read(files.reportCard);
const visibleCopy = [
  reportCard,
  read(files.synthesis),
  read(files.placements),
  read(files.aspects),
  read(files.specialPoints),
  read(files.personalTransit),
].join("\n");

const pkg = JSON.parse(read(files.packageJson));
const reportsScript = pkg.scripts?.["check:reports"] ?? "";
const projectScript = pkg.scripts?.["check:project"] ?? "";

const version = "v0.1.265-report-trust-safety-language-qa";
const globalNote =
  "این گزارش برای الهام و تأمل است، نه پیش‌گویی یا حکم قطعی؛ اینکه چه برداشتی از آن می‌گیری و چطور از آن استفاده می‌کنی، با خودِ توست.";

assert(reportCard.includes(version), "ReportCard must include the v0.1.265 trust/safety version marker.");
assert(reportCard.includes(globalNote), "ReportCard must include the single light global trust/safety note.");
assert(
  reportCard.includes("data-report-trust-safety-language-qa={REPORT_TRUST_SAFETY_LANGUAGE_VERSION}"),
  "ReportCard must attach the trust/safety marker to the one global note.",
);

for (const oldPhrase of [
  "ادعای پزشکی یا حکم قطعی نمی‌سازند",
  "قرار نیست حکم قطعی بسازند",
  "حکم قطعی، پیش‌گویی یا برچسب ترسناک بسازند",
  "نه حکم قطعی یا پیش‌گویی",
  "قضاوت قطعی درباره خودت یا دیگران",
  "حکم قطعی روان‌شناختی یا پزشکی نمی‌دهد",
  "نه نتیجه قطعی",
  "اجبار آسمانی",
]) {
  assert(!visibleCopy.includes(oldPhrase), `Old repeated trust/safety phrase still appears: ${oldPhrase}`);
}

const trustRepairMarker = "HALLEUS_REPORT_TRUST_SAFETY_FOUR_MODE_SYNC_R5_20260806";
const specialPointsCopy = read(files.specialPoints);
for (const marker of [
  "formatNodeSource(lunarNodes.nodeType)",
  "\u0645\u062f\u0644 \u0631\u0627 \u062c\u062f\u0627\u06af\u0627\u0646\u0647 \u0646\u06af\u0647 \u0645\u06cc\u200c\u062f\u0627\u0631\u062f",
  "\u0645\u062d\u0648\u0631 \u0645\u06cc\u0627\u0646\u06af\u06cc\u0646 \u0648 \u0645\u062d\u0648\u0631 \u0646\u0648\u0633\u0627\u0646\u06cc/\u0648\u0627\u0642\u0639\u06cc \u0628\u0627 \u0647\u0645 \u0642\u0627\u0637\u06cc \u0646\u0634\u0648\u0646\u062f",
  "\u0644\u06cc\u0644\u06cc\u062a \u0645\u06cc\u0627\u0646\u06af\u06cc\u0646",
  "\u062f\u0627\u0631\u06a9\u200c\u0645\u0648\u0646/\u0648\u0627\u0644\u062f\u0645\u0627\u062b",
]) {
  assert(
    specialPointsCopy.includes(marker),
    "Special points must preserve explicit model-source distinctions: " + marker,
  );
}
assert(
  read(files.personalTransit).includes("هر کارت فقط یک نشانه‌ی موقت برای توجه است"),
  "Personal transit copy should use light observational language.",
);

assert(
  pkg.scripts?.["check:report-trust-safety-language-qa"] ===
    "node scripts/check-report-trust-safety-language-qa.mjs",
  "package.json must expose check:report-trust-safety-language-qa.",
);
assert(
  reportsScript.includes("pnpm run check:report-trust-safety-language-qa"),
  "check:reports must include the trust/safety language QA guard.",
);
assert(
  projectScript.includes("pnpm run check:report-trust-safety-language-qa"),
  "check:project must include the trust/safety language QA guard.",
);

const trustRuntimeSources = {
  reportDetail: read("components/ReportDetail.tsx"),
  reportProductReader: read("components/report/ReportProductReader.tsx"),
  visibleLanguage: read("lib/report-output/visible-report-language.ts"),
  fiveMinuteSummary: read("components/report/FiveMinuteReportSummary.tsx"),
};

assert(
  trustRuntimeSources.reportDetail.includes("sanitizeVisibleReportValue"),
  "ReportDetail must sanitize the report before it reaches any visible report mode.",
);
assert(
  trustRuntimeSources.reportProductReader.includes("FiveMinuteReportSummary") &&
    trustRuntimeSources.reportProductReader.includes("ReportV3Experience") &&
    trustRuntimeSources.reportProductReader.includes("ReportTechnicalAppendix"),
  "The four-mode reader must keep summary, full narrative, and technical ownership explicit.",
);
assert(
  trustRuntimeSources.visibleLanguage.includes("sanitizeVisibleReportText") &&
    trustRuntimeSources.visibleLanguage.includes("sanitizeVisibleReportValue") &&
    trustRuntimeSources.visibleLanguage.includes("ENGLISH_INTERNAL_TERMS") &&
    trustRuntimeSources.visibleLanguage.includes("EXACT_VISIBLE_REPLACEMENTS"),
  "Visible internal-language cleanup must remain centralized.",
);
assert(
  trustRuntimeSources.fiveMinuteSummary.includes("contract.hasReliableBirthTime") &&
    trustRuntimeSources.fiveMinuteSummary.includes("contract.primaryPatterns.slice(0, 3)"),
  "The summary must preserve evidence limits and unknown-time degradation.",
);

const trustRuntimeMarker = "HALLEUS_REPORT_TRUST_SAFETY_RUNTIME_CONTRACT_SYNC_R6_20260806";

console.log("Report trust/safety language QA guard passed.");
console.log("- special-point source models remain explicit and distinct");
console.log("- " + trustRepairMarker);
console.log("- runtime trust/safety ownership replaces stale documentation markers");
console.log("- HALLEUS_REPORT_TRUST_CENTRALIZATION_REAL_IDENTIFIERS_R7_20260806");
console.log("- " + trustRuntimeMarker);
