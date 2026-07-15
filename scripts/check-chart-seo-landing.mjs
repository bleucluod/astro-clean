import { readFileSync } from "node:fs";

const failures = [];

function read(path) {
  return readFileSync(path, "utf8");
}

function requireMarker(label, source, marker) {
  if (!source.includes(marker)) failures.push(`${label} missing marker: ${marker}`);
}

function forbidMarker(label, source, marker) {
  if (source.includes(marker)) failures.push(`${label} exposes internal marker: ${marker}`);
}

const page = read("app/chart/page.tsx");
const layout = read("app/chart/layout.tsx");
const form = read("components/ChartForm.tsx");
const chartCss = read("app/chart/chart-shell.module.css");
const authPanel = read("components/SupabaseAuthPanel.tsx");
const navigation = read("lib/config/navigation.ts");
const wikiContent = read("lib/wiki/wiki-content.ts");
const packageJson = JSON.parse(read("package.json"));

for (const marker of [
  'title: "ساخت چارت تولد رایگان | گزارش تولد فارسی هالیوس"',
  "با تاریخ، ساعت و شهر تولد",
  "محدودیت‌های رایزینگ و خانه‌ها",
  'canonical: "/chart"',
]) {
  requireMarker("chart metadata", page, marker);
}

for (const marker of [
  'import Link from "next/link"',
  'data-chart-seo-landing="transactional-birth-chart"',
  'data-chart-seo-education="wiki-guides"',
  "<h1 className={styles.title}>ساخت چارت تولد و گزارش تولد فارسی</h1>",
]) {
  requireMarker("chart landing", layout, marker);
}

const educationCardCount =
  layout.match(/<article className=\{styles\.educationCard\}>/g)?.length ?? 0;
if (educationCardCount !== 3) {
  failures.push(`chart landing must render three education cards; found ${educationCardCount}`);
}

const linkedSlugs = [
  "birth-chart-basics",
  "why-birth-time-matters",
  "why-birth-city-matters",
  "birth-chart-without-birth-time",
  "what-is-rising-sign",
  "what-is-moon-sign",
  "astrology-houses",
  "major-aspects",
];

const availableSlugs = new Set(
  [...wikiContent.matchAll(/slug:\s*"([a-z0-9-]+)"/g)].map((match) => match[1]),
);

for (const slug of linkedSlugs) {
  requireMarker("chart Wiki links", layout, `href="/wiki/${slug}"`);
  if (!availableSlugs.has(slug)) {
    failures.push(`chart links to missing Wiki slug: ${slug}`);
  }
}

requireMarker("shared navigation", navigation, 'href: "/wiki"');
for (const marker of [
  'id="chart-birth-data-form"',
  'aria-label="انتخاب تاریخ تولد میلادی"',
  'className="birth-time-picker-grid"',
  "TIME_HOUR_OPTIONS",
  "selectBirthCity(city)",
  "selectCurrentResidenceCity(city)",
  "getIranCityDisplayName(city)",
  "showAccountPanel",
  "گزارشم را در حساب هالیوس نگه دار",
  "<SupabaseAuthPanel compact />",
  'form="chart-birth-data-form"',
]) {
  requireMarker("streamlined chart form", form, marker);
}
requireMarker("chart submit color", chartCss, "#7658e8");
requireMarker("button-like Wiki links", chartCss, ".educationLinks a:hover");
requireMarker(
  "direct compact auth",
  authPanel,
  '<div className="chart-account-disclosure">',
);
if (form.includes('className="chart-reference-visual"')) {
  failures.push("ChartForm must not render the redundant lower decorative panel");
}

for (const removedFormMarker of [
  "اطلاعات تولد",
  "ورودی‌های اصلی",
  "یادآوری:",
  "نیک‌نیم",
  'type="date"',
  'type="time"',
  "birth-city-hint",
  "current-residence-city-hint",
  'href="/reports"',
]) {
  forbidMarker("streamlined chart form", form, removedFormMarker);
}

for (const removedChip of [
  "<li>تاریخ شمسی یا میلادی</li>",
  "<li>ساعت و شهر تولد</li>",
  "<li>چارت واقعی</li>",
  "<li>گزارش فارسی</li>",
  "<li>خوانش نمادین، نه حکم قطعی</li>",
]) {
  forbidMarker("chart landing chips", layout, removedChip);
}

for (const internalMarker of [
  "Beta readiness smoke",
  "مسیر تست بتا",
  "BETA_READINESS_SMOKE",
  "Local smoke",
  "Deploy smoke",
]) {
  forbidMarker("public chart page", page, internalMarker);
  forbidMarker("public chart layout", layout, internalMarker);
  forbidMarker("public ChartForm", form, internalMarker);
}

if (
  packageJson.scripts?.["check:chart-seo-landing"] !==
  "node scripts/check-chart-seo-landing.mjs"
) {
  failures.push("package.json is missing check:chart-seo-landing");
}

if (failures.length > 0) {
  console.error("Chart SEO landing guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Chart SEO landing guard passed.");
console.log("- /chart has transactional Persian metadata and one server-rendered H1");
console.log("- three lightweight education cards link only to existing Wiki slugs");
console.log("- public chart UI contains no beta, smoke, or test copy");
console.log("- redundant chips and the lower decorative panel stay out of the form path");
console.log("- select-based date/time, aligned city fields, optional auth, and a vivid submit CTA stay present");
console.log("- form logic, storage, auth, privacy, and engine paths remain outside this guard");
