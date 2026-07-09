import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const reportDetail = read("components/ReportDetail.tsx");
const reportV3 = read("lib/report-output/report-v3.ts");
const reportV3Experience = read("components/ReportV3Experience.tsx");
const reportCard = read("components/ReportCard.tsx");
const routePage = read("app/reports/[reportId]/page.tsx");

assert(routePage.includes("ReportDetail"), "Live report route must render ReportDetail.");
assert(!reportDetail.includes("ReportCard"), "ReportDetail must not silently depend on non-live ReportCard.");
assert(reportDetail.includes("ReportV3Experience"), "ReportDetail must render ReportV3Experience for the final reading.");
assert(
  reportDetail.includes("data-report-detail-live-path-reality={REPORT_DETAIL_LIVE_PATH_REALITY_VERSION}"),
  "ReportDetail missing live-path reality marker.",
);
assert(
  reportDetail.includes("v0.1.265b-report-detail-live-path-reality"),
  "ReportDetail missing v0.1.265b live-path version.",
);
assert(
  !reportDetail.includes("این کارت فقط جهت‌گیری اولیه می‌دهد"),
  "ReportDetail still contains old hero copy that user sees on /reports/[reportId].",
);
assert(
  reportDetail.includes('lunarNodes.nodeType === "local-true-osculating"'),
  "ReportDetail must accept local True/Osculating lunar nodes in the technical table.",
);
assert(
  reportDetail.includes("getLunarNodeTechnicalTitle"),
  "ReportDetail must label lunar node model dynamically instead of hardcoding Mean.",
);
assert(
  !reportDetail.includes("<h3>دست‌های ماه با مدل میانگین</h3>"),
  "ReportDetail must not hardcode the lunar-node technical section as Mean only.",
);

assert(
  reportDetail.includes('return "داده محاسبه‌شده ناموجود";'),
  "ReportDetail must not default missing lunar-node data to Mean.",
);
assert(
  reportDetail.includes('if (!isCalculatedLunarNodes(lunarNodes)) {\n    return "دست‌های ماه";\n  }'),
  "ReportDetail must use a neutral lunar-node title when calculated node data is missing.",
);

assert(
  reportV3Experience.includes("enhancedReport.reportV3Disclaimer"),
  "ReportV3Experience must render the reportV3 disclaimer on the live page.",
);
assert(
  reportV3.includes("const REPORT_TRUST_SAFETY_NOTE"),
  "report-v3 must define the single soft trust/safety note.",
);
assert(
  reportV3.includes("این گزارش برای الهام و تأمل است، نه پیش‌گویی یا حکم قطعی؛ اینکه چه برداشتی از آن می‌گیری و چطور از آن استفاده می‌کنی، با خودِ توست."),
  "report-v3 missing the approved soft trust/safety note.",
);
assert(
  reportV3.includes("softenRepeatedTrustSafetySentences"),
  "report-v3 must normalize repeated safety language in stored/generated report sections.",
);
assert(
  !reportV3.includes("این گزارش نمادین و تأملی است و جایگزین تصمیم پزشکی، حقوقی، مالی یا تصمیم قطعی زندگی نیست."),
  "report-v3 still contains the old heavy visible disclaimer.",
);
assert(
  reportCard.includes("REPORT_CARD_SAFETY_NOTE"),
  "ReportCard can keep legacy/preview safety note, but it is not the live report-detail source.",
);

console.log("Report detail live path reality guard passed.");
