import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const home = read("app/page.tsx");
const homeStyles = read("app/home.module.css");
const productProof = read("components/HomepageProductProof.tsx");
const skyPulse = read("components/SkyPulseDateCard.tsx");
const previewCopy = read("lib/report-preview/homepage-report-preview.ts");
const appShell = read("components/AppShell.tsx");
const wikiContent = read("lib/wiki/wiki-content.ts");
const packageJson = read("package.json");
const failures = [];

function requireMarker(source, marker, label) {
  if (!source.includes(marker)) {
    failures.push(`${label} missing: ${marker}`);
  }
}

for (const marker of [
  "گزارش تولد فارسی",
  "چارت تولد",
  "آسمان امروز",
  "ویکی آسترولوژی فارسی",
  "تو حاصل لحظه‌ای هستی که",
  "آسمان و زمین با هم داستانی نو نوشتند.",
  'icon: "◫"',
  'href="/chart"',
  'href="/wiki"',
  "HomepageProductProof",
  "SkyPulseDateCard",
  'id="sky-pulse"',
]) {
  requireMarker(home, marker, "homepage");
}

const requiredWikiSlugs = [
  "birth-chart-basics",
  "why-birth-time-matters",
  "why-birth-city-matters",
  "what-is-rising-sign",
  "how-to-read-birth-chart",
];

for (const slug of requiredWikiSlugs) {
  requireMarker(home, `"${slug}"`, "homepage Wiki links");
  requireMarker(wikiContent, `slug: "${slug}"`, "Wiki content source");
}

for (const marker of [
  "ماه، فاز ماه و جنبه‌های امروز",
  "حال‌وهوای عمومی آسمان تهران",
  "ساخت چارت تولد شخصی",
  "<strong>حال‌وهوای امروز</strong>",
]) {
  requireMarker(skyPulse, marker, "Sky Pulse fallback or CTA");
}

requireMarker(
  appShell,
  'toLocaleString("fa-IR", { useGrouping: false })',
  "footer year formatter",
);

for (const marker of [
  ".highlightCard a::after",
  ".highlightCard a:focus-visible",
  ":global(.sky-pulse-compact-panel)",
  ":global(.report-preview-layer-list)",
  ":global(.report-preview-layer:last-child)",
  ".productProofHeading",
  ":global(.sky-pulse-interpretation-card strong)",
  "margin: -20px auto 0",
  "grid-template-columns: repeat(5, minmax(0, 1fr))",
  "white-space: nowrap",
]) {
  requireMarker(homeStyles, marker, "compact homepage layout");
}

if (appShell.includes('getFullYear().toLocaleString("fa-IR")')) {
  failures.push("Footer year must not use a grouped Persian number formatter");
}

const homepageBodySources = [home, productProof, skyPulse, previewCopy].join("\n");
const predictionTerms = [
  /پیش[‌-]?گویی/u,
  /پیش\s*بینی/u,
];

for (const pattern of predictionTerms) {
  if (pattern.test(homepageBodySources)) {
    failures.push(`Homepage body contains prediction disclaimer wording: ${pattern}`);
  }
}

for (const removedCopy of [
  "سه نخ اصلی چارت",
  "سه نخ اصلی",
  "placementها",
  "گزارش‌های من",
  "خوانش امروز در حال آماده شدن است",
  "چند لحظه صبر کن.",
  "styles.homeDisclaimer",
  "readingMinutes.toLocaleString",
  "homepage-product-proof-title",
  "report-preview-heading",
  "HOME_REPORT_PREVIEW_TRUST",
  "ببین داده‌های چارت چگونه به یک خوانش فارسی، منظم و قابل‌مرور تبدیل می‌شوند.",
  "report-preview-card-head",
  "report-preview-actions",
  "فصل اول گزارش",
  "<small>حال‌وهوای امروز</small>",
]) {
  if (homepageBodySources.includes(removedCopy)) {
    failures.push(`Homepage body still contains removed copy: ${removedCopy}`);
  }
}

requireMarker(
  packageJson,
  '"check:homepage-seo-content-cleanup": "node scripts/check-homepage-seo-content-cleanup.mjs"',
  "package scripts",
);

if (failures.length > 0) {
  console.error("Homepage SEO/content cleanup check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Homepage SEO/content cleanup check passed.");
console.log("- brand slogan, chart CTA, Sky Pulse, report proof, and Persian Wiki paths remain present");
console.log("- homepage body avoids repeated prediction disclaimers and machine-like sample copy");
console.log("- the footer year renders in Persian without a thousands separator");
