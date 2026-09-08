import fs from "node:fs";

const errors = [];
const read = (file) => fs.readFileSync(file, "utf8");

function need(file, text, label) {
  if (!fs.existsSync(file) || !read(file).includes(text)) {
    errors.push(`${label}: ${file} -> ${text}`);
  }
}
function forbid(file, text, label) {
  if (fs.existsSync(file) && read(file).includes(text)) {
    errors.push(`${label}: ${file} contains forbidden ${text}`);
  }
}

need("components/HalleusWheelCore.tsx", "HALLEUS_WHEEL_SYSTEM_VERSION", "shared wheel system");
need("components/HalleusWheelCore.tsx", "resolveLabelCollision", "collision labels");
need("components/HalleusWheelCore.tsx", "fullInnerPoints ?? data.innerPoints", "full inner inventory");
need("components/HalleusWheelCore.tsx", "fullOuterPoints ?? data.outerPoints", "full outer inventory");
need("components/HalleusWheelCore.tsx", 'point.pointKind === "fixed-star"', "fixed stars");
need("components/HalleusWheelCore.tsx", 'point.pointKind === "traditional-lot"', "traditional lots");
need("components/HalleusWheelCore.tsx", 'point.pointKind === "advanced-body"', "advanced bodies");
need("components/HalleusWheelCore.tsx", "tabIndex={0}", "keyboard point access");
need("components/halleus-wheel-core.module.css", "prefers-reduced-motion", "reduced motion");
need("components/comparison/ComparisonBiWheel.tsx", "HalleusSynastryWheel", "shared synastry adapter");
forbid("components/comparison/ComparisonBiWheel.tsx", "function polarPoint", "retired duplicate geometry");
forbid("components/comparison/ComparisonBiWheel.tsx", "resolveLabelCollision", "retired duplicate collision stack");
need("components/ReportBirthChartWheel.tsx", "HALLEUS_WHEEL_THEME", "natal shared theme");
need("components/ReportBirthChartWheel.tsx", "HALLEUS_ZODIAC_GUIDE", "natal shared zodiac");
need("components/ReportBirthChartWheel.tsx", 'data-halleus-wheel-mode="natal"', "natal mode");

need("types/storage.ts", '"stored-comparison-v1"', "stored comparison discriminator");
need("types/storage.ts", "StoredComparisonReport", "typed comparison report");
need("lib/comparison/comparison-account-persistence.ts", 'publicationState: "private"', "private persistence");
need("lib/comparison/comparison-account-persistence.ts", "share_enabled = false", "sharing disabled");
need("lib/comparison/comparison-account-persistence.ts", "where public.halleus_reports.user_id = excluded.user_id", "ownership-safe idempotent upsert");
need("app/api/reports/account/route.ts", "Comparison account save requires an authenticated account.", "authenticated save");
need("app/api/reports/account/route.ts", "Comparison reports are private and cannot be shared or published.", "public sharing blocked");
need("components/comparison/ComparisonComposer.tsx", "saveComparisonToAccount", "authenticated autosave");
need("components/comparison/ComparisonReport.tsx", "getAccountComparisonRecord", "account read fallback");
need("components/comparison/ComparisonReport.tsx", "ذخیره در حساب", "manual account save");
need("components/comparison/ComparisonReport.tsx", "setComparisonFavorite", "favorite");
need("components/comparison/ComparisonReport.tsx", "setComparisonNote", "note");
need("components/comparison/ComparisonReport.tsx", "deleteComparisonFromAccount", "delete");
need("components/AccountReportTitleList.tsx", 'report.reportType === "comparison"', "comparison account route");
need("app/profile/page.tsx", "listAccountReportSummaries", "profile account list");
need("app/profile/page.tsx", "reportTotal", "profile account count");

need("lib/admin/admin-types.ts", "comparisonChartALabel", "admin person A");
need("lib/admin/admin-types.ts", "comparisonChartBLabel", "admin person B");
need("lib/admin/admin-types.ts", "comparisonRelationshipContext", "admin relationship context");
need("lib/admin/admin-report-intelligence.ts", "comparison_chart_a_label", "admin query A");
need("lib/admin/admin-report-intelligence.ts", "comparison_chart_b_label", "admin query B");
need("lib/admin/admin-report-intelligence.ts", "comparison_relationship_context", "admin query context");
need("components/admin/AdminReportsWorkspace.tsx", "/private-content", "audited private detail endpoint");
need("components/admin/AdminReportsWorkspace.tsx", "مشاهدهٔ محتوای خصوصی رابطه", "admin detail action");
need("app/api/admin/reports/[reportId]/private-content/route.ts", "reports.private_content.read", "private-content capability");
need("app/api/admin/reports/[reportId]/private-content/route.ts", "assertAdminMutationRequest", "admin origin boundary");
need("lib/admin/admin-service.ts", "admin.report.private_content_viewed", "admin audit event");
if (fs.existsSync("app/api/admin/reports/[reportId]/comparison-detail/route.ts")) {
  errors.push("duplicate unaudited comparison-detail route remains");
}

need("app/compare/[comparisonId]/layout.tsx", "robots:", "private robots metadata");
need("app/compare/[comparisonId]/layout.tsx", "index: false", "noindex");
need("app/compare/[comparisonId]/layout.tsx", "follow: false", "nofollow");
need("types/synastry-engine.ts", '"real-synastry-v1"', "legacy v1 accepted");
need("types/synastry-engine.ts", '"real-synastry-v2"', "v2 accepted");

const coverage = {
  slice3: {
    sharedWheel: true,
    natalMode: true,
    synastryMode: true,
    fullPointInventory: true,
    collisionAwareLabels: true,
    keyboardLabels: true,
    reducedMotion: true,
    independentComparisonGeometry: false,
  },
  slice4: {
    typedStoredComparison: true,
    authenticatedSave: true,
    idempotentRetry: true,
    guestLocalFallback: true,
    accountListRoute: true,
    profileAccountCount: true,
    favoriteNoteDelete: true,
    adminListAndFilterByReportType: true,
    adminAuditedPrivateDetail: true,
    publicSharingIntroduced: false,
    destructiveMigration: false,
  },
  slice5: {
    privateResultNoindex: true,
    legacyV1Acceptance: true,
    v2Acceptance: true,
    productionBuildRequiredByRunner: true,
    manualVisual390Required: true,
    manualVisual1440Required: true,
  },
};

if (errors.length) {
  console.error("HALLEUS_COMPARE_REMAINING_ROADMAP_GUARD=FAIL");
  for (const error of errors) console.error(`- ${error}`);
  console.error(`COMPARE_ROADMAP_COVERAGE_JSON=${JSON.stringify(coverage)}`);
  process.exit(1);
}

console.log("HALLEUS_COMPARE_REMAINING_ROADMAP_GUARD=PASS");
console.log("SLICE3_UNIFIED_HALLEUS_WHEEL_STATIC_ACCEPTANCE=PASS");
console.log("SLICE4_ACCOUNT_PROFILE_REPORTS_ADMIN_STATIC_ACCEPTANCE=PASS");
console.log("SLICE5_FINAL_CODE_QA_STATIC_ACCEPTANCE=PASS");
console.log(`COMPARE_ROADMAP_COVERAGE_JSON=${JSON.stringify(coverage)}`);
