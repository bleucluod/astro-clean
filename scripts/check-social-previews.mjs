import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const failures = [];
const read = (path) => readFileSync(path, "utf8");
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const seo = read("lib/config/seo.ts");
const layout = read("app/layout.tsx");

assert(!existsSync("app/api/social-preview/route.tsx"), "Runtime image route must be deleted");
assert(!seo.includes("/api/social-preview"), "Metadata must not target the runtime image endpoint");
assert(!seo.includes("socialPreviewImage("), "Old runtime image URL builder remains");
assert(seo.includes("photo ?? existingPreviewImage(canonical)"), "Missing direct asset selection");
assert(seo.includes("new URL(photo ?? existingPreviewImage(canonical), siteConfig.url).toString()"),
  "Images must use absolute site URLs");
assert(seo.includes("images: [{ url: imageUrl, alt: title }]"), "Missing OG image");
assert(seo.includes("images: [imageUrl]"), "Missing Twitter image");
assert(seo.includes("images: [articleCover]"), "Existing Wiki article covers must survive");
assert(seo.includes('"/shop": "/shop-preview/hero-desktop-v012.webp"'), "Shop must use its real hero");
assert(layout.includes("...buildSocialPreviewMetadata({"), "Global fallback missing");

const staticAssets = [...seo.matchAll(/^\s*"\/[^"]+": "(\/[^"]+\.(?:webp|png|jpe?g))",?$/gm)]
  .map((match) => match[1]);
assert(staticAssets.length >= 13, "Insufficient concrete page-to-image mappings");
for (const path of staticAssets) {
  assert(existsSync(join(process.cwd(), "public", path.slice(1))), "Missing static image: " + path);
}

const publicPageFiles = [
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
for (const path of publicPageFiles) {
  assert(read(path).includes("buildPublicPageMetadata("), path + ": missing page metadata");
}

const productPageFiles = [
  "app/shop/page.tsx",
  "app/shop/moon-phase-print/page.tsx",
  "app/shop/birth-sky-map/page.tsx",
  "app/shop/milky-way-print/page.tsx",
  "app/shop/shipping-returns/page.tsx",
  "app/shop/nemad-man/[month]/page.tsx",
  "app/sky/[date]/page.tsx",
];
for (const path of productPageFiles) {
  assert(read(path).includes("buildSocialPreviewMetadata({"), path + ": missing social tags");
}

const shop = read("app/shop/page.tsx");
assert(shop.includes('photo: "/shop-preview/hero-desktop-v012.webp"'),
  "Shop must share the exact existing hero image");

for (const path of productPageFiles) {
  const source = read(path);
  for (const match of source.matchAll(/photo:\s*["'](\/[^"']+\.(?:webp|png|jpe?g))["']/g)) {
    const image = match[1];
    assert(existsSync(join(process.cwd(), "public", image.slice(1))),
      path + ": image missing: " + image);
  }
}
const sign = read("app/shop/nemad-man/[month]/page.tsx");
assert(sign.includes("data?.product.gallery.find") &&
  sign.includes("src.startsWith('/shop-preview/')"),
  "Zodiac share photos must follow their existing product gallery");
const canonicalSign = read("app/shop/[slug]/page.tsx");
assert(canonicalSign.includes("monthMetadata("), "Zodiac canonical route must use product metadata");
assert(canonicalSign.includes("robots: { index: true, follow: true }"), "Zodiac indexability changed");

for (const [name, path] of [
  ["shop", "/shop-preview/hero-desktop-v012.webp"],
  ["moon", "/shop-preview/p01/mockup-frameless-gibbous-daylight.webp"],
  ["birth sky", "/shop-preview/p02/05-raha-parsa-30x45-wall.webp"],
  ["night", "/shop-preview/our-night.webp"],
]) {
  assert(existsSync(join(process.cwd(), "public", path.slice(1))), "Missing approved " + name + " photo");
}

if (failures.length) {
  console.error("STATIC_SOCIAL_PREVIEW_FAILURES=" + failures.length);
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("SOCIAL_PREVIEWS_STATIC=PASS");
console.log("Direct public images, all known page metadata, Wiki covers, product galleries and no dynamic image endpoint.");
