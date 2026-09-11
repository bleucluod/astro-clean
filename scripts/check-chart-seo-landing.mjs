import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";

const failures = [];

function read(path) {
  return readFileSync(path, "utf8");
}

function requireMarker(label, source, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}

function forbidMarker(label, source, marker) {
  if (source.includes(marker)) failures.push(`${label} contains forbidden marker: ${marker}`);
}

function count(source, marker) {
  return source.split(marker).length - 1;
}

const page = read("app/chart/page.tsx");
const form = read("components/ChartForm.tsx");
const packageJson = JSON.parse(read("package.json"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";
const assetPath = "public/halleus-chart-wheel-sample-polished-centered.webp";

for (const marker of [
  'title: "چارت تولد رایگان فارسی با تفسیر | هالیوس"',
  '"چارت تولد رایگان فارسی خودت را با تاریخ شمسی، ساعت و شهر تولد بساز و رایزینگ، نشان ماه، خانه‌ها، جنبه‌ها و تفسیر شخصی را آنلاین ببین."',
  'canonical: "/chart"',
  "چارت تولد رایگان فارسی",
]) {
  requireMarker("chart SEO metadata/content", page, marker);
}

if (count(page, "<h1") !== 1) {
  failures.push(`chart page must contain exactly one H1; found ${count(page, "<h1")}`);
}
requireMarker("static chart route", page, 'export const dynamic = "force-static";');
requireMarker("static chart route", page, "export const revalidate = false;");
for (const marker of [
  'force-dynamic',
  'getPublicWikiIndex',
  'getPublicWikiCatalog',
  'findWikiArticle',
  'wikiLink(',
  'linksForSection(',
  'getFinalEditorialPage',
]) {
  forbidMarker("static chart shell", page, marker);
}

if (/<main(?:\s|>)/i.test(page)) {
  failures.push("app/chart/page.tsx must not render its own <main> landmark");
}

const heroIndex = page.indexOf('className={styles.hero}');
const workspaceIndex = page.indexOf('className={styles.workspace}');
const reportStripIndex = page.indexOf('className={styles.reportStrip}');
if (!(heroIndex >= 0 && workspaceIndex > heroIndex && reportStripIndex > workspaceIndex)) {
  failures.push("chart direct content order must begin Hero -> Workspace/Form -> report summary strip");
}

for (const marker of [
  'id="chart-report-details"',
  'id="chart-birth-data-form"',
  'aria-labelledby="birth-data-heading"',
]) {
  const source = marker === 'id="chart-birth-data-form"' || marker.startsWith("aria-labelledby") ? form : page;
  requireMarker("chart accessibility/anchors", source, marker);
}

for (const marker of [
  'src="/halleus-chart-wheel-sample-polished-centered.webp"',
  'width={1254}',
  'height={1254}',
  'loading="lazy"',
  'sizes="(max-width: 760px) calc(100vw - 36px), 360px"',
  'alt="نمونه چارت تولد فارسی هالیوس با نمایش سیاره‌ها، خانه‌ها، رایزینگ و جنبه‌های اصلی"',
  'نمونه ناشناس‌شده از چارت تولد فارسی هالیوس؛ جایگاه سیاره‌ها، خانه‌ها، محورهای اصلی و جنبه‌های برجسته روی یک چرخ نمایش داده شده‌اند.',
]) {
  requireMarker("chart sample image", page, marker);
}
forbidMarker("chart page image", page, "Halleus-Chart-Wheel-Sample-Polished-Centered.png");

if (!existsSync(assetPath)) {
  failures.push(`missing chart sample asset: ${assetPath}`);
} else {
  const asset = readFileSync(assetPath);
  if (statSync(assetPath).size > 100 * 1024) {
    failures.push(`chart sample WebP exceeds 100 KiB: ${statSync(assetPath).size} bytes`);
  }
  if (
    asset.length < 12 ||
    asset.subarray(0, 4).toString("ascii") !== "RIFF" ||
    asset.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    failures.push("chart sample asset is not a RIFF/WEBP file");
  }
  const assetHash = createHash("sha256").update(asset).digest("hex");
  if (assetHash !== "09a915623dcfab54409eb0208c86dca0f15b0621c3920532236c5f220a270877") {
    failures.push(`chart sample WebP hash changed: ${assetHash}`);
  }
}

for (const marker of [
  '"@type": "WebPage"',
  '"@type": "ImageObject"',
  '"@type": "WebApplication"',
  'name: "چارت تولد هالیوس"',
  'applicationCategory: "LifestyleApplication"',
  'operatingSystem: "Web"',
  'isAccessibleForFree: true',
]) {
  requireMarker("chart structured data", page, marker);
}
if (count(page, '"@type":') !== 3) {
  failures.push(`chart structured-data graph must contain exactly three @type nodes; found ${count(page, '"@type":')}`);
}
forbidMarker("chart structured data", page, "FAQPage");

const allowedLinks = [
  ["حریم خصوصی و نگهداری اطلاعات تولد", "/privacy"],
  ["راهنمای چارت تولد بدون ساعت تولد", "/wiki/birth-chart-without-birth-time"],
  ["چگونه ساعت تولد خود را پیدا کنیم؟", "/wiki/find-exact-birth-time"],
];

if (count(page, 'data-chart-content-link="allowed"') !== 3) {
  failures.push(`chart page must expose exactly three allowed content-link markers; found ${count(page, 'data-chart-content-link="allowed"')}`);
}
for (const [label, href] of allowedLinks) {
  requireMarker("allowed chart content link", page, label);
  requireMarker("allowed chart content link", page, `href="${href}"`);
  if (count(page, `href="${href}"`) !== 1) {
    failures.push(`allowed chart content destination must appear exactly once: ${href}`);
  }
}

const firstContentLink = page.indexOf('data-chart-content-link="allowed"');
if (firstContentLink >= 0 && firstContentLink < workspaceIndex) {
  failures.push("content links must not appear before the form workspace");
}
for (const href of ["/product", "/reports", "/sky", "/wiki"]) {
  forbidMarker("chart content links", page, `href="${href}"`);
}

for (const internalMarker of [
  "Beta readiness smoke",
  "مسیر تست بتا",
  "BETA_READINESS_SMOKE",
  "Local smoke",
  "Deploy smoke",
  "placeholder copy",
]) {
  forbidMarker("public chart page", page, internalMarker);
}

if (
  packageJson.scripts?.["check:chart-seo-landing"] !==
  "node scripts/check-chart-seo-landing.mjs"
) {
  failures.push("package.json is missing check:chart-seo-landing");
}

const productCheck = "pnpm run check:chart-page-product-polish";
const seoCheck = "pnpm run check:chart-seo-landing";
const productIndex = checkProject.indexOf(productCheck);
const seoIndex = checkProject.indexOf(seoCheck);
if (productIndex < 0 || seoIndex < 0 || seoIndex <= productIndex) {
  failures.push("check:project must run check:chart-seo-landing after check:chart-page-product-polish");
} else {
  const between = checkProject.slice(productIndex + productCheck.length, seoIndex);
  if (between.trim() !== "&&") {
    failures.push("check:chart-seo-landing must run immediately after check:chart-page-product-polish");
  }
}

if (failures.length > 0) {
  console.error("Chart SEO landing guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Chart SEO landing guard passed.");
console.log("- static /chart metadata, one H1, and page-local no-Wiki/no-DB shell markers are intact");
console.log("- Hero is followed immediately by the form workspace; report/content sections follow the form");
console.log("- sample WebP, alt/caption, three-node schema, and exactly three fixed content links are present");
console.log("- ChartForm anchor/aria contract and check:project ordering are intact");
