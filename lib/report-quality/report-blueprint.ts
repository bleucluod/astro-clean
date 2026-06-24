import { REPORT_SECTION_BLUEPRINTS } from "@/lib/report-quality/report-section-schema";
import { getReportToneProfile } from "@/lib/report-quality/tone-profile";

export function getReportQualityBlueprint() {
  return {
    tone: getReportToneProfile(),
    sections: REPORT_SECTION_BLUEPRINTS,
    reportPrinciple:
      "Halleus reports are symbolic, reflective, Persian-first, and never deterministic advice.",
  };
}
