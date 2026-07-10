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

assert(
  read(files.specialPoints).includes("مدل‌ها در داده حفظ می‌شود"),
  "Special points copy should keep model transparency without repeating safety disclaimers.",
);
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

for (const file of [
  files.projectContext,
  files.ideaGarden,
  files.realityAudit,
  files.unificationPlan,
]) {
  assert(
    read(file).includes("report trust safety language qa"),
    `${file} missing report trust safety language qa marker.`,
  );
}

console.log("Report trust/safety language QA guard passed.");
