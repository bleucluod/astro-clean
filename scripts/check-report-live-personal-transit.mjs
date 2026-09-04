// HALLEUS_DEEP_NARRATIVE_SLICE4_LIVE_TRANSIT_OWNERSHIP_GUARD_R8_20260903
import { readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(process.argv[2] || process.cwd());
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const routePage = read("app/reports/[reportId]/page.tsx");
const reportDetail = read("components/ReportDetail.tsx");
const productReader = read("components/report/ReportProductReader.tsx");
const transit = read("src/lib/report-output/personal-transit-relevance.ts");
const bridge = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const probe = read("src/lib/chart/natal-to-transit-calculation-probe.ts");

assert(
  routePage.includes('from "@/components/ReportDetail"') &&
    routePage.includes("<ReportDetail"),
  "Live report route must render ReportDetail.",
);

assert(
  reportDetail.includes('from "@/components/report/ReportProductReader"') &&
    reportDetail.includes("<ReportProductReader"),
  "ReportDetail must delegate the live report reading surface to ReportProductReader.",
);

assert(
  productReader.includes("engineData?.personalTransitReportData") &&
    productReader.includes("function HumanTransitReading") &&
    productReader.includes("<HumanTransitReading data={transitData}") &&
    productReader.includes('data-report-reader-mode="stored-transit"'),
  "ReportProductReader must own the live stored-transit reading.",
);

assert(
  productReader.includes("formatReportNarrativeAspectGeometry") &&
    productReader.includes("separation: aspect.separation") &&
    productReader.includes("buildPersonalTransitBehavioralInterpretation"),
  "Live transit reading must expose stored actual separation and consume the canonical transit interpretation.",
);

assert(
  productReader.includes("const today = isTransitDateToday(data.transitLocalDate") &&
    productReader.includes('const missingResidence = data.status === "missing-current-residence"') &&
    productReader.includes("formatTransitLocalDate(data.transitLocalDate)") &&
    productReader.includes("today ?"),
  "Live transit reading must preserve stored-date and missing-residence behavior.",
);

assert(
  !productReader.includes("navigator.geolocation") &&
    !productReader.includes("currentResidence: {") &&
    !productReader.includes("localStorage.getItem"),
  "Live transit reader must not infer or fabricate current residence.",
);

assert(
  transit.includes("HALLEUS_DEEP_NARRATIVE_SLICE4_PERSONAL_TRANSIT_SYNTHESIS_R1_20260902") &&
    transit.includes("buildPersonalTransitNarrativeSemanticUnit") &&
    transit.includes("buildTransitFactLead(") &&
    transit.includes("buildTransitTechnicalDetail(") &&
    transit.includes("formatReportNarrativeAngle"),
  "Personal transit writer must use ordered-pair synthesis with actual-separation presentation.",
);

assert(
  !transit.includes("makeTransitClauseDirect("),
  "Retired transit composition helper must remain removed.",
);

assert(
  bridge.includes("visibleAspectHighlights") &&
    bridge.includes("natalBody?.signId") &&
    bridge.includes('motion?.status === "retrograde"') &&
    bridge.includes("probeResult.aspects.map(toAspectSummary)") &&
    bridge.includes("currentResidenceRequired: true") &&
    bridge.includes("noSilentTehranDefaultForPersonalTransit: true") &&
    bridge.includes("missing-current-residence"),
  "Stored bridge must preserve natal context, complete snapshot, and current-residence trust boundary.",
);

assert(
  probe.includes("return aspects.sort((left, right) => left.orb - right.orb);"),
  "Raw personal-transit calculation output/order must remain unchanged.",
);

if (failures.length > 0) {
  console.error("Report live personal transit guard failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Report live personal transit guard passed.");
console.log("- ReportProductReader is the live stored-transit owner.");
console.log("- ordered-pair synthesis and stored actual separation are preserved.");
console.log("- stored-date/current-residence trust behavior is checked structurally without localized string matching.");
