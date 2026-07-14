import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportCardPath = path.join(root, "components", "ReportCard.tsx");
const componentPath = path.join(root, "components", "ReportAspectRelationshipSections.tsx");
const packagePath = path.join(root, "package.json");
const docs = [
  "docs/HALLEUS_PROJECT_CONTEXT.md",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_ENGINE_REALITY_AUDIT.md",
  "docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md",
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(fs.existsSync(componentPath), "ReportAspectRelationshipSections component is missing.");

const reportCard = fs.readFileSync(reportCardPath, "utf8");
const component = fs.readFileSync(componentPath, "utf8");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

assert(
  reportCard.includes('import { ReportAspectRelationshipSections } from "./ReportAspectRelationshipSections";'),
  "ReportCard must import ReportAspectRelationshipSections.",
);
assert(
  reportCard.includes("<ReportPlanetPlacementSections report={report} />"),
  "ReportCard must keep standalone planet placement sections.",
);
assert(
  reportCard.includes("<ReportAspectRelationshipSections report={report} />"),
  "ReportCard must render ReportAspectRelationshipSections.",
);

const placementIndex = reportCard.indexOf("<ReportPlanetPlacementSections report={report} />");
const aspectIndex = reportCard.indexOf("<ReportAspectRelationshipSections report={report} />");
const legacyAspectIndex = reportCard.indexOf("{shownAspects.length > 0 ?");
assert(placementIndex >= 0 && aspectIndex > placementIndex, "Aspect relationship sections must come after standalone placement sections.");
assert(legacyAspectIndex < 0 || aspectIndex < legacyAspectIndex, "Aspect relationship sections must appear before the legacy aspect summary list.");

assert(component.includes('data-report-aspect-relationship-sections="true"'), "Component must expose a guardable data marker.");
assert(component.includes("رابطه‌های مهم"), "Component must have the reading-contract Persian heading.");
assert(!component.includes("خلاصه ساده"), "Component must remove the duplicate focus summary line.");
assert(component.includes("وقتی خوب کار می‌کند"), "Component must include the approved healthy-expression label.");
assert(component.includes("جایی که گیر می‌کند"), "Component must include the approved friction label.");
assert(component.includes("اورب و میزان اعتماد این خوانش"), "Component must keep orb/trust inside progressive details.");
assert(component.includes("زاویه‌ی ۶۰ درجه"), "Component must label sextile as 60 degrees.");
assert(component.includes("زاویه‌ی ۹۰ درجه"), "Component must label square as 90 degrees.");
assert(component.includes("زاویه‌ی ۱۲۰ درجه"), "Component must label trine as 120 degrees.");
assert(component.includes("روبه‌رویی ۱۸۰ درجه"), "Component must label opposition as 180 degrees.");
assert(!component.includes("تشخیص پزشکی"), "Aspect sections must not introduce medical claims.");

assert(
  pkg.scripts?.["check:report-aspect-relationship-sections"] === "node scripts/check-report-aspect-relationship-sections.mjs",
  "package.json must expose check:report-aspect-relationship-sections.",
);
assert(pkg.scripts?.["check:reports"]?.includes("pnpm run check:report-aspect-relationship-sections"), "check:reports must include the aspect relationship guard.");
assert(pkg.scripts?.["check:project"]?.includes("pnpm run check:report-aspect-relationship-sections"), "check:project must include the aspect relationship guard.");
assert(!JSON.stringify(pkg.scripts).includes("pnpm runcheck:report-aspect-relationship-sections"), "Aspect guard script command must keep the required pnpm run spacing.");

for (const doc of docs) {
  const text = read(doc);
  assert(text.includes("v0.1.260"), `${doc} must mention v0.1.260.`);
  assert(text.includes("Standalone aspect relationship sections"), `${doc} must mention standalone aspect relationship sections.`);
}

console.log("Report aspect relationship sections guard passed.");
