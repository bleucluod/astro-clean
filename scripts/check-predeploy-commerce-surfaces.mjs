import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const pricing = read("app/pricing/page.tsx");
const product = read("app/product/page.tsx");
const order = read("app/order/page.tsx");
const surfaces = read("components/commerce/CommerceSurfaces.tsx");
const css = read("components/commerce/commerce-surfaces.module.css");
const catalog = read("lib/monetization/product-catalog.ts");
const accessPolicy = read("lib/monetization/access-policy.ts");

for (const [label, source] of [["pricing", pricing], ["product", product], ["order", order]]) {
  assert.ok(!source.includes("<FinalEditorialPage"), label + " still renders the generic FinalEditorialPage");
  assert.ok(source.includes("ProductOfferGrid"), label + " is not wired to canonical ProductOfferGrid");
}

assert.ok(pricing.includes("PricingCommerceSurface"), "pricing dedicated commerce composition missing");
assert.ok(pricing.includes("گزارش چارت تولد کامل"), "pricing SEO phrase missing");
assert.ok(product.includes("ProductCommerceSurface"), "product dedicated commerce composition missing");
assert.ok(product.includes("تفسیر چارت تولد فارسی"), "product SEO phrase missing");
assert.ok(product.includes("HomepageProductProof"), "product proof integration missing");
assert.ok(order.includes("OrderCommerceSurface"), "order dedicated commerce composition missing");
assert.ok(order.includes("PremiumRequestForm"), "order must retain premium_requests ledger form");
assert.ok(order.includes("commerceParams?.package") && order.includes("commerceParams?.product"), "order must support canonical package plus legacy product query");
assert.ok(order.includes("selectedPackageCode"), "order selected package state missing");

for (const marker of [
  'data-commerce-surface="pricing"',
  'data-commerce-surface="product"',
  'data-commerce-surface="order"',
  'data-canonical-commerce-source="product-access-cards"',
  'href="https://t.me/lbleu"',
  'href="/chart"',
  'href="/product"',
  'href="/pricing"',
  'href="/compare"',
  'href: "/wiki/birth-chart-basics"',
  'href: "/wiki/sun-moon-rising"',
  'href: "/wiki/astrology-houses"',
  "درگاه پرداخت خودکار نداریم",
  "پرداخت موفق",
  "حریم خصوصی",
]) assert.ok(surfaces.includes(marker), "commerce surface marker missing: " + marker);

for (const forbidden of ["500,000", "700,000", "۵۰۰٬۰۰۰", "۷۰۰٬۰۰۰", "premium_birth", "permanent account entitlement"]) {
  assert.ok(!surfaces.includes(forbidden), "commerce public surface hardcodes stale business data: " + forbidden);
}
assert.ok(catalog.includes("full_report_credit") && catalog.includes("relationship_credit"), "canonical credit catalog contract missing");
assert.ok(accessPolicy.includes("version"), "versioned access policy contract missing");
assert.ok(css.includes("#f8fafc") && css.includes("#d9eafd") && css.includes("#bcccdc"), "Halleus light/sky palette missing");
assert.ok(css.includes("#050609") && css.includes("prefers-reduced-motion"), "homepage-related dark hero or reduced-motion boundary missing");

console.log("Halleus Pre-Deploy Batch 3 commerce surfaces check passed.");
console.log("- pricing/product/order use dedicated Halleus commerce compositions");
console.log("- canonical ProductOfferGrid from ProductAccessCards.tsx remains the public package/access source");
console.log("- order accepts package= plus legacy product= and keeps the request ledger secondary");
console.log("- manual @lbleu purchase is explicit; no fake checkout success is introduced");
console.log("HALLEUS_PREDEPLOY_COMMERCE_SURFACES_BATCH3_R2=PASS");
