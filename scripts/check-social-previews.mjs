import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join } from "node:path";

const failures = [];
const read = (path) => readFileSync(path, "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const shared = read("lib/config/seo.ts");
const route = read("app/api/social-preview/route.tsx");
const layout = read("app/layout.tsx");

assert(shared.includes("export function buildSocialPreviewMetadata("), "Shared social-card metadata builder missing");
assert(shared.includes("export function socialPreviewImage("), "Unique image URL builder missing");
assert(shared.includes('url.searchParams.set("page", canonical);'), "Per-page cache identity missing");
assert(shared.includes('url.searchParams.set("title", title);'), "Page title not included in image identity");
assert(shared.includes("...social,"), "Public metadata is not using the new card");
assert(layout.includes("...buildSocialPreviewMetadata({"), "Root layout fallback social card missing");
assert(!layout.includes('social-share-light-1200x630.png'), "Old logo-card fallback remains in layout");

const expectedPublicPages = [
  "app/page.tsx",
  "app/chart/page.tsx",
  "app/compare/page.tsx",
  "app/sky/page.tsx",
  "app/product/page.tsx",
  "app/pricing/page.tsx",
  "app/order/page.tsx",
  "app/privacy/page.tsx",
  "app/wiki/page.tsx",
  "app/wiki/[slug]/page.tsx",
  "app/wiki/category/[categoryId]/page.tsx",
];
for (const path of expectedPublicPages) {
  assert(read(path).includes("buildPublicPageMetadata("), path + ": missing per-page metadata");
}

const expectedManualPages = [
  "app/shop/page.tsx",
  "app/shop/moon-phase-print/page.tsx",
  "app/shop/birth-sky-map/page.tsx",
  "app/shop/milky-way-print/page.tsx",
  "app/shop/shipping-returns/page.tsx",
  "app/shop/nemad-man/[month]/page.tsx",
  "app/sky/[date]/page.tsx",
];
for (const path of expectedManualPages) {
  assert(read(path).includes("buildSocialPreviewMetadata({"), path + ": missing share card metadata");
}

const canonicalMonth = read("app/shop/[slug]/page.tsx");
assert(canonicalMonth.includes("monthMetadata("), "Canonical sign URLs no longer use month social metadata");
assert(canonicalMonth.includes("robots: { index: true, follow: true }"), "Canonical sign URLs lost indexability");
const monthSource = read("app/shop/nemad-man/[month]/page.tsx");
assert(monthSource.includes("data?.product.gallery.find"), "Month share image no longer follows real product gallery");
assert(monthSource.includes("src.startsWith('/shop-preview/')"), "Month share image no longer uses approved photo");

for (const image of [
  "public/shop-preview/hero-desktop-v012.webp",
  "public/shop-preview/p01/mockup-frameless-gibbous-daylight.webp",
  "public/shop-preview/p02/05-raha-parsa-30x45-wall.webp",
  "public/shop-preview/our-night.webp",
  "assets/shop-print/fonts/Estedad-Medium.ttf",
]) {
  assert(existsSync(join(process.cwd(), image)), "Share card asset missing: " + image);
}

for (const token of [
  'import { ImageResponse } from "next/og"',
  'export const runtime = "nodejs"',
  'safePhotoPath(',
  'value.includes("..")',
  'value.includes("%")',
  'const fontFile = await readFile(FONT_PATH)',
  'await sharp(bytes).resize(468, 478',
  'new ImageResponse(',
  '...PREVIEW_SIZE',
  'fontData',
  '"Cache-Control"',
]) {
  assert(route.includes(token), "Share image generator missing: " + token);
}
assert(!route.includes("fetch("), "Share image generator must not fetch untrusted remote photos");
assert(route.includes("length <= 3_000_000"), "Share image generator lacks photo-size ceiling");
assert(!route.includes("reportId") && !route.includes("shareToken"), "Share images must exclude private report identifiers");

if (failures.length) {
  console.error("Social preview contract failures:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("SOCIAL_PREVIEWS_STATIC=PASS");
console.log("Public routes, wiki articles/categories, 12 month signs, shop photos and private-data boundary verified.");
