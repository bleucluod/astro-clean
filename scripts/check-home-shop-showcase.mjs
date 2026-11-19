import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};
const read = (path) => readFileSync(path, "utf8");
const home = read("app/page.tsx");
const css = read("app/home.module.css");
const months = read("lib/shop/nemad-man-months.ts");
const shop = read("app/shop/page.tsx");

const section = 'id="home-shop-showcase"';
assert(home.split(section).length === 2, "Homepage must contain one studio showcase");
assert(home.indexOf("<HomeHowItWorks />") < home.indexOf(section) &&
  home.indexOf(section) < home.indexOf("className={styles.wikiSection}"),
  "Studio showcase must be between How It Works and Wiki");
for (const marker of [
  "لحظه‌های آسمان، برای ماندن روی زمین",
  "بعضی تاریخ‌ها و خاطره‌ها ارزش این رو دارن",
  "href=\"/shop/moon-phase-print\"",
  "href=\"/shop/birth-sky-map\"",
  "href=\"/shop\"",
  "ماه آن روز",
  "آسمان تولد",
  "نماد من — {featuredNemadMonth.title}",
  'getCurrentTehranNemadMonth()',
  "NEMAD_SHOP_COVERS[featuredNemadMonth.slug]",
  'href={\`/shop/\${featuredNemadMonth.slug}-sign\`}',
  'src={\`/shop-preview/nemad-man/\${featuredNemadMonth.slug}/\${featuredNemadCover.file}\`}',
]) {
  assert(home.includes(marker.replaceAll("\\\`", "\`").replaceAll("\\\${", "\${")),
    "Homepage showcase missing: " + marker);
}
assert(home.split("className={styles.shopCardImage}").length === 4,
  "Showcase must have exactly three product images");
assert(home.includes('import Image from "next/image";'), "Homepage missing optimized local images");

for (const cssToken of [
  ".shopShowcase {", ".shopGrid {", ".shopCardPicture {",
  ".shopCardInfo {", ".shopShowcaseFoot {", ".page .shopMainButton",
  "scroll-snap-type: x mandatory;", "grid-template-columns: repeat(3, minmax(0, 1fr));",
  "@media (max-width: 760px)",
]) {
  assert(css.includes(cssToken), "Homepage showcase CSS missing: " + cssToken);
}

assert(shop.includes("NEMAD_SHOP_COVERS[month.slug]"),
  "The shop must use the same shared month cover mapping as the homepage");
assert(!shop.includes("const nemadShopCovers ="),
  "Duplicated month cover mapping remains in shop");
assert(months.includes('timeZone: "Asia/Tehran"') &&
  months.includes('en-US-u-ca-persian') &&
  months.includes("formatToParts(date)"),
  "Current month must be derived from the Persian calendar in Tehran");

const monthSlugs = [
  "farvardin", "ordibehesht", "khordad", "tir", "mordad", "shahrivar",
  "mehr", "aban", "azar", "dey", "bahman", "esfand",
];
const coverMap = new Map([...months.matchAll(
  /^\s+([a-z]+): \{ file: '([^']+)', theme: '(?:light|dark)' \},?$/gm,
)].map((match) => [match[1], match[2]]));
assert(coverMap.size === 12 && monthSlugs.every((slug) => coverMap.has(slug)),
  "Exactly 12 approved shop covers must be available");
for (const slug of monthSlugs) {
  const file = coverMap.get(slug);
  if (file) {
    assert(existsSync(join("public", "shop-preview", "nemad-man", slug, file)),
      "Missing approved " + slug + " cover: " + file);
  }
}
for (const asset of [
  "public/shop-preview/p01/mockup-frameless-gibbous-daylight.webp",
  "public/shop-preview/p02/05-raha-parsa-30x45-wall.webp",
]) {
  assert(existsSync(asset), "Missing product preview asset: " + asset);
}

// Verify known month cases. The date-derived server value is recomputed at
// the homepage's existing five-minute revalidation boundary.
const persianMonthAt = (iso) => Number(new Intl.DateTimeFormat(
  "en-US-u-ca-persian", { timeZone: "Asia/Tehran", month: "numeric" },
).formatToParts(new Date(iso)).find((part) => part.type === "month")?.value);
for (const [instant, month] of [
  ["2026-03-21T00:00:00Z", 1],
  ["2026-11-19T12:00:00Z", 8],
  ["2026-12-22T00:00:00Z", 10],
]) {
  assert(persianMonthAt(instant) === month,
    "Unexpected Persian month at " + instant);
}
assert(home.includes("export const revalidate = 300;"),
  "Homepage revalidation must remain unchanged");

if (failures.length) {
  console.error("HOMEPAGE_SHOP_SHOWCASE_FAILURES=" + failures.length);
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("HOMEPAGE_SHOP_SHOWCASE=PASS");
  console.log("Approved three-product layout, 12 shared month covers, Tehran Jalali month and linked local images verified.");
}
