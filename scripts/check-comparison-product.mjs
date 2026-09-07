import { readFileSync } from "node:fs";

const failures = [];
const paths = {
  layout: "app/compare/layout.tsx",
  indexPage: "app/compare/page.tsx",
  landing: "components/comparison/ComparisonLanding.tsx",
  builderLink: "components/comparison/ComparisonBuilderLink.tsx",
  detailLayout: "app/compare/[comparisonId]/layout.tsx",
  detailPage: "app/compare/[comparisonId]/page.tsx",
  composer: "components/comparison/ComparisonComposer.tsx",
  chartForm: "components/ChartForm.tsx",
  report: "components/comparison/ComparisonReport.tsx",
  wheel: "components/comparison/ComparisonBiWheel.tsx",
  styles: "components/comparison/comparison.module.css",
  landingStyles: "components/comparison/comparison-landing.module.css",
  service: "lib/comparison/comparison-product-service.ts",
  storage: "lib/comparison/comparison-storage.ts",
  types: "types/comparison-product.ts",
  navigation: "lib/config/navigation.ts",
  seo: "lib/config/seo.ts",
  analytics: "lib/config/analytics.ts",
  shell: "components/AppShell.tsx",
};

function read(path) {
  return readFileSync(path, "utf8");
}

function requireMarkers(label, source, markers) {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(`${label} is missing marker: ${marker}`);
    }
  }
}

function forbidMarkers(label, source, markers) {
  for (const marker of markers) {
    if (source.includes(marker)) {
      failures.push(`${label} contains forbidden marker: ${marker}`);
    }
  }
}

const sources = Object.fromEntries(
  Object.entries(paths).map(([key, path]) => [key, read(path)]),
);

requireMarkers("public comparison metadata", sources.indexPage, [
  "چارت ازدواج آنلاین رایگان | مقایسه دو چارت تولد",
  'canonical: "/compare"',
  "index: true",
  "follow: true",
  'url: "/halleus-compare-og.png"',
]);
forbidMarkers("public comparison rendering", sources.indexPage, [
  'export const dynamic = "force-dynamic"',
  "FinalEditorialPage",
  "getReportAccessPolicy",
]);
requireMarkers("dedicated comparison landing", sources.landing, [
  'data-halleus-compare-landing="roadmap-slice1"',
  "چارت ازدواج و سیناستری دو نفر",
  'id="compare-builder"',
  "WebApplication",
  "BreadcrumbList",
  "FAQPage",
  "ComparisonComposer embedded",
  'data-compare-cta="after-preview"',
]);
requireMarkers("comparison approved SEO copy R7", sources.landing, [
  "چارت ازدواج چیست؟",
  "در تحلیل چارت ازدواج چه چیزهایی می‌بینید؟",
  "مقایسه دو چارت تولد چطور انجام می‌شود؟",
  "آیا چارت ازدواج درصد سازگاری می‌دهد؟",
  "بخش فنی چارت سیناستری",
  "سیناستری بدون ساعت تولد",
  "فرق چارت ازدواج با طالع‌بینی ازدواج با اسم چیست؟",
  "سینستری و سیناستری با هم فرق دارند؟",
  "ساخت چارت ازدواج رایگان",
  "تحلیل رابطه با چارت تولد",
  "جنبه‌های سیناستری",
  "چرخ دوگانه چارت تولد",
  "چارت زوجین",
]);
forbidMarkers("comparison retired pre-R7 copy", sources.landing, [
  "چارت سیناستری؛ تحلیل رابطه و ازدواج دو نفر",
  "چند سؤال قبل از ساخت سیناستری",
  "هر تحلیل چند اعتبار مصرف می‌کند؟",
  "آیا اطلاعات نفر دوم عمومی می‌شود؟",
]);

forbidMarkers("dedicated comparison landing semantics", sources.landing, ["<main"]);
requireMarkers("application shell landmark", sources.shell, [
  '<main className={styles.main} id="main-content">',
]);
requireMarkers("comparison builder anchor behavior", sources.builderLink, [
  'href="#compare-builder"',
  'document.getElementById("compare-builder")',
  'target.focus({ preventScroll: true })',
  "scrollIntoView",
  'behavior: "auto"',
]);
requireMarkers("comparison landing dark theme", sources.landingStyles, [
  "--compare-surface: #0b0d11",
  "--compare-raised: #11141a",
  "var(--halleus-public-h1-size",
  "@media (max-width: 760px)",
  "prefers-reduced-motion",
]);
requireMarkers("private comparison metadata", sources.detailLayout, [
  "index: false",
  "follow: false",
  "noarchive: true",
  "nosnippet: true",
  "noimageindex: true",
  'referrer: "no-referrer"',
]);
requireMarkers("comparison route", sources.indexPage, ["ComparisonLanding"]);
requireMarkers("comparison detail route", sources.detailPage, [
  "ComparisonReport",
  "comparisonId",
]);
requireMarkers("comparison engine bridge", sources.service, [
  "createSynastryNatalSnapshot",
  "buildRealSynastry",
  "rawBirthInputStored: false",
  "selectPrimaryPatterns",
]);
requireMarkers("private comparison storage", sources.storage, [
  "halleus-private-comparisons-v1",
  "MAX_PRIVATE_COMPARISONS = 6",
  'visibility === "private"',
  'indexingPolicy === "noindex"',
  "Never delete natal reports automatically",
]);

requireMarkers("comparison app-like premium builder R12", sources.composer, [
  'data-app-like-builder="r11"',
  'data-builder-simplified="r12"',
]);
forbidMarkers("comparison retired dashboard progress R12", sources.composer, [
  'className={styles.mobileProgress}',
  'className={styles.flowRail}',
  'aria-label="مراحل ساخت تحلیل رابطه"',
  "const activeStep =",
  "const stateForStep =",
]);



requireMarkers("comparison R16 compact chips dark CTA and chart link", sources.composer, [
  'href="/chart"',
  "برای ساخت چارت تازه به صفحهٔ",
  ">چارت تولد</Link>",
]);
forbidMarkers("comparison retired inline-chart helper copy R16", sources.composer, [
  "می‌توانی از چارت‌های آماده انتخاب کنی یا بدون ترک این صفحه چارت تازه بسازی.",
]);
requireMarkers("comparison R16 compact chips and dark CTA styles", sources.styles, [
  "Halleus compare R16 compact relationship chips and dark CTA",
  "flex: 0 0 auto",
  "min-height: 40px",
  "background: rgba(255, 255, 255, 0.065)",
  "background: rgba(255, 255, 255, 0.028)",
  "scroll-snap-type: none",
]);
forbidMarkers("comparison R16 CTA must not be blue", sources.styles, [
  "Halleus compare R15 compact relationship chips and CTA states",
]);


requireMarkers("comparison R17 complete dark report surfaces", sources.styles, [
  "Halleus compare R17 complete dark report surface sweep",
  '.product[data-comparison-reading="human-first"] .pairCard span',
  '.product[data-comparison-reading="human-first"] .perspectiveGrid article',
  '.product[data-comparison-reading="human-first"] .relationshipMoments',
  '.product[data-comparison-reading="human-first"] .cycleLine',
  '.product[data-comparison-reading="human-first"] .relationshipEvidence',
  '.product[data-comparison-reading="human-first"] .overlayNarrativeCard',
  '.product[data-comparison-reading="human-first"] .overlayNarrativeParts section:nth-child(4)',
  '.product[data-comparison-reading="human-first"] .reportActions .secondaryButton',
  "background: #0b0d11 !important",
  "background: #0f1217 !important",
]);

requireMarkers("comparison app-like premium builder styles R12", sources.styles, [
  "Halleus compare app-like premium builder R11",
  "Halleus compare R12 simplified stored-chart-only builder",
  '.product[data-embedded="true"][data-builder-simplified="r12"]',
  ".relationshipGrid",
  ".chartSelectionSummary",
  ".libraryLink",
]);

requireMarkers("comparison composer", sources.composer, [
  "relationshipContext",
  "savePrivateComparison",
  "generationInFlightRef",
  "pendingGenerationRef",
  "generationDisabled",
  'data-embedded={embedded ? "true" : undefined}'.replace("{embedded ? ", "{embedded ? "),
  'data-app-like-builder="r11"',
  'data-builder-simplified="r12"',
  'href="/chart"',
  "ساعت تولد این چارت دقیق است",
]);
forbidMarkers("comparison stored-chart-only journey R12", sources.composer, [
  'target="_blank"',
  "ChartForm",
  "chartCreationSlot",
  "inlineChartDialog",
  "onComparisonChartSaved",
  'data-flow-step="consent"',
  "consentConfirmed",
  "compare_consent_completed",
  "چارت خودت را انتخاب یا بساز.",
  "فعلاً ساخت تحلیل رابطه رایگان است و هیچ اعتبار رابطه‌ای مصرف نمی‌شود.",
]);
requireMarkers("comparison birth-time accuracy", sources.service, [
  'report.input.birthTimeAccuracy === "known"',
  'report.input.birthTimeAccuracy === "unknown"',
]);
forbidMarkers("comparison birth-time sentinel", sources.service, [
  'birthTime.trim() === "12:00"',
]);
requireMarkers("comparison narrative ownership", sources.service, [
  "narrativeOwner",
  "buildNarrativeChapters",
  "findOwnedContact",
  "ownerContactId",
  "overviewParagraphsFa",
  "conversationQuestionsFa",
]);
requireMarkers("comparison concise five-chapter result", sources.report, [
  "reading.overviewParagraphsFa.map",
  "reading.chapters.map",
  "NarrativeChapter",
  "ChapterStory",
  "reading.conversationQuestionsFa.map",
  "INITIAL_TECHNICAL_CONTACT_LIMIT = 8",
  "technicalCategory",
  "technicalPolarity",
  "technicalSort",
  "showAllContacts",
  "data-person-direction",
  "directionalAspectTitle",
]);
requireMarkers("comparison wheel collision and disclosure", sources.wheel, [
  "resolveLabelCollision",
  "collisionShifted",
  "wheelLeaderLine",
  "IMPORTANT_ASPECT_LIMIT",
  "showAllAspects",
  "tabIndex={0}",
]);

requireMarkers("comparison report", sources.report, [
  "سه الگوی اصلی",
  "امنیت عاطفی",
  "نزدیکی و استقلال",
  "مرز و ترمیم",
  "تلاش دوباره و بازسازی",
  "حذف این مقایسه",
  "ComparisonBiWheel",
]);
requireMarkers("comparison bi-wheel", sources.wheel, [
  "synastry",
  "innerPoints",
  "outerPoints",
  "aspectLines",
  "حلقهٔ داخلی",
  "حلقهٔ بیرونی",
]);
requireMarkers("comparison contract", sources.types, [
  'visibility: "private"',
  'indexingPolicy: "noindex"',
  "secondPersonConsentConfirmedAt?: string",
  "rawBirthInputStored: false",
  "ComparisonReading",
]);
requireMarkers("comparison navigation", sources.navigation, [
  'href: "/compare"',
  'label: "تحلیل رابطه"',
]);
requireMarkers("comparison public discovery", sources.seo, ['path: "/compare"']);
requireMarkers("comparison footer", sources.shell, ['href: "/compare"']);
requireMarkers("comparison analytics boundary", sources.analytics, ['"/compare"']);
forbidMarkers("comparison analytics boundary", sources.analytics, ['"/compare/"']);
requireMarkers("comparison responsive styles", sources.styles, [
  "@media (max-width: 760px)",
  ".wheelSvg",
  ".relationshipGrid",
  '.product[data-embedded="true"]',
  "Halleus compare roadmap Slice 2: integrated two-person builder",
  ".inlineChartDialog",
  '.flowRail li[data-step-state="active"]',
]);

requireMarkers("comparison Slice 4 accessibility and performance", sources.report, [
  'dynamic(',
  'role="tabpanel"',
  'aria-controls="comparison-panel-reading"',
  'aria-controls="comparison-panel-technical"',
  "handleTabKeyDown",
]);
forbidMarkers("comparison result nested landmark", sources.report, ["<main"]);
requireMarkers("comparison DB-safe learning links", sources.landing, [
  'href="/wiki"',
  'href="/chart"',
]);
forbidMarkers("comparison unverified hardcoded Wiki links", sources.landing, [
  "/wiki/birth-chart-basics",
  "/wiki/major-aspects",
  "/wiki/why-birth-time-matters",
]);
requireMarkers("comparison Slice 4 hit targets", sources.styles, [
  "Halleus compare roadmap Slice 4",
  "min-height: 44px",
  "min-height: 48px",
  ".lazyWheelPlaceholder",
]);
requireMarkers("comparison current free launch policy", sources.composer, [
  "TEMPORARY_COMPARE_FREE_ACCESS_2026_09",
  "temporaryFreeRelationshipAccess = true",
  'if (!freeAllAccess && productAccess.status === "loading")',
  "freeAllAccess ||",
]);
requireMarkers("comparison mobile-first dark correction", sources.styles, [
  "Halleus compare user-review dark result and mobile correction",
  '.product[data-comparison-reading="human-first"]',
  "100dvh",
]);
requireMarkers("comparison landing white-text correction", sources.landingStyles, [
  "Halleus compare user-review mobile-first visual correction",
  "color: #ffffff !important",
]);
requireMarkers("comparison approved hero image integration", sources.landing, [
  'import Image from "next/image"',
  'src="/halleus-synastry-chart-comparison.webp"',
  'alt="نمونهٔ چارت سیناستری دو نفر با ارتباط‌های میان سیاره‌ها در هالیوس"',
  "fill",
  "preload",
  "primaryImageOfPage",
  "heroImageUrl",
]);
requireMarkers("comparison crisp full-bleed hero styles", sources.landingStyles, [
  "Halleus compare crisp full-bleed image hero",
  ".heroMedia",
  ".heroImage",
  ".heroCopy",
  "position: absolute",
  "object-position: 66% 38%",
  "brightness(0.98)",
  "@keyframes compareHeroArtworkDrift",
  "@media (prefers-reduced-motion: reduce)",
]);
requireMarkers("comparison crisp hero image delivery", sources.landing, [
  'sizes="100vw"',
  "unoptimized",
  'src="/halleus-synastry-chart-comparison.webp"',
]);
forbidMarkers("comparison retired low-resolution hero delivery", sources.landing, [
  '(max-width: 980px) 390px, 430px',
]);
forbidMarkers("comparison retired heavy hero treatment", sources.landingStyles, [
  "Halleus compare full-bleed image hero with text overlay",
  "brightness(0.88)",
  "scale(1.03)",
]);
forbidMarkers("comparison retired synthetic hero motion", sources.landing, [
  "synastryMotion",
  "synastryStage",
  "synastryWheelA",
  "synastryAspectLayer",
  "heroMotion",
  "chartMergeStage",
  "aspectLinks",
  "orbitPreview",
]);

const comparisonHeroImagePath = "public/halleus-synastry-chart-comparison.webp";
try {
  const comparisonHeroImage = readFileSync(comparisonHeroImagePath);
  if (comparisonHeroImage.length < 100000) {
    failures.push("comparison hero image is unexpectedly small");
  }
  if (
    comparisonHeroImage.subarray(0, 4).toString("ascii") !== "RIFF" ||
    comparisonHeroImage.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    failures.push("comparison hero image is not a valid WEBP container");
  }
} catch {
  failures.push(`comparison hero image is missing: ${comparisonHeroImagePath}`);
}

forbidMarkers("comparison landing privacy overemphasis", sources.landing, [
  "خصوصی روی همین دستگاه",
  "حریم خصوصی تحلیل رابطه",
  "orbitPreview",
]);


forbidMarkers("comparison explicit-consent contract removed R12", sources.service, [
  "consent-required",
  "input.secondPersonConsentConfirmed",
  "secondPersonConsentConfirmedAt: generatedAt",
]);
forbidMarkers("comparison explicit-consent input removed R12", sources.types, [
  "secondPersonConsentConfirmed: boolean",
  '"consent-required"',
]);

const runtimeSources = [
  sources.composer,
  sources.report,
  sources.wheel,
  sources.service,
  sources.storage,
  sources.types,
].join("\n");

forbidMarkers("comparison runtime", runtimeSources, [
  "gtag(",
  "dataLayer",
  "GoogleAnalytics",
  "/api/reports/shared",
  "publicSlug",
  "sitemapEligible",
  "indexable",
  "compatibilityPercent",
  "compatibilityScore",
]);
if (/\bfetch\s*\(/.test(runtimeSources)) {
  failures.push("comparison runtime must not send comparison or second-person data over fetch");
}

if (failures.length > 0) {
  console.error("Comparison product check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Comparison product check passed.");
console.log("- /compare uses a dedicated static dark landing with final metadata, schema, social image, and builder anchor");
console.log("- /compare selects stored natal charts only; chart creation lives on /chart");
console.log("- relationship context remains; the explicit consent gate and inline creation flow are removed");
console.log("- comparison records are local-only, private, noindex, and raw-birth-input-free");
console.log("- three patterns, support/friction, communication, emotional security, boundaries, repair, and bi-wheel remain visible");
console.log("- history, delete, refresh, and retry flows remain present");
console.log("- only the public landing is discoverable and analytics-eligible; private result paths remain excluded");
console.log("- no public result sharing, network persistence, or compatibility percentage is introduced");
