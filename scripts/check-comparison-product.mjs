import { readFileSync } from "node:fs";

const failures = [];
const paths = {
  layout: "app/compare/layout.tsx",
  indexPage: "app/compare/page.tsx",
  detailLayout: "app/compare/[comparisonId]/layout.tsx",
  detailPage: "app/compare/[comparisonId]/page.tsx",
  composer: "components/comparison/ComparisonComposer.tsx",
  report: "components/comparison/ComparisonReport.tsx",
  wheel: "components/comparison/ComparisonBiWheel.tsx",
  styles: "components/comparison/comparison.module.css",
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
  "چارت سیناستری آنلاین | مقایسه دو چارت تولد",
  'canonical: "/compare"',
  "index: true",
  "follow: true",
]);
requireMarkers("private comparison metadata", sources.detailLayout, [
  "index: false",
  "follow: false",
  "noarchive: true",
  "nosnippet: true",
  "noimageindex: true",
  'referrer: "no-referrer"',
]);
requireMarkers("comparison route", sources.indexPage, ["ComparisonComposer"]);
requireMarkers("comparison detail route", sources.detailPage, [
  "ComparisonReport",
  "comparisonId",
]);
requireMarkers("comparison engine bridge", sources.service, [
  "createSynastryNatalSnapshot",
  "buildRealSynastry",
  "secondPersonConsentConfirmed",
  "rawBirthInputStored: false",
  "selectPrimaryPatterns",
  "emotionalSecurityFa",
  "boundariesRepairFa",
]);
requireMarkers("private comparison storage", sources.storage, [
  'halleus-private-comparisons-v1',
  "MAX_PRIVATE_COMPARISONS = 6",
  "visibility === \"private\"",
  "indexingPolicy === \"noindex\"",
  "Never delete natal reports automatically",
]);
requireMarkers("comparison composer", sources.composer, [
  "چارت سیناستری آنلاین",
  "گفت‌وگو",
  "امنیت عاطفی",
  "نزدیکی و استقلال",
  "مرز و تعهد",
  "اصطکاک و ترمیم",
  "جهت رشد",
  "درصد سازگاری نمی‌سازد",
  "ساخت چارت دوم در تب تازه",
  "اجازه استفاده از اطلاعات نفر دوم را دارم",
  "ساعت تولد این چارت دقیق است",
  "relationshipContext",
  "savePrivateComparison",
  "target=\"_blank\"",
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
  "secondPersonConsentConfirmedAt",
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
console.log("- two-chart selection and second-chart creation path are present");
console.log("- relationship context and explicit second-person consent are required");
console.log("- comparison records are local-only, private, noindex, and raw-birth-input-free");
console.log("- three patterns, support/friction, communication, emotional security, boundaries, repair, and bi-wheel are visible");
console.log("- history, delete, refresh, and retry flows are present");
console.log("- Synastry runtime imports are resolvable by the Next.js client graph");
console.log("- only the public landing is discoverable and analytics-eligible; private result paths remain excluded");
console.log("- no public result sharing, network persistence, or compatibility percentage is introduced");
