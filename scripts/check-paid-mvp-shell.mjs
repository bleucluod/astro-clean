import { existsSync, readFileSync } from "node:fs";

function read(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing required file: ${path}`);
  }

  return readFileSync(path, "utf8");
}

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`${label} is missing marker: ${marker}`);
  }
}

const home = read("app/page.tsx");
const product = read("app/product/page.tsx");
const pricing = read("app/pricing/page.tsx");
const css = read("app/globals.css");
const packageJson = read("package.json");

for (const marker of [
  "paid-mvp-landing",
  "Halleus Paid MVP Shell",
  "paid-manual-order",
  'href="/chart"',
  'href="/pricing"',
]) {
  assertIncludes(home, marker, "app/page.tsx");
}

for (const marker of [
  "Halleus Product Map",
  "paid-mvp-product-shell",
  "manual-order-flow",
  "getProductSurfaceLinks",
  'href="/pricing"',
]) {
  assertIncludes(product, marker, "app/product/page.tsx");
}

for (const marker of [
  "paid-mvp-pricing-shell",
  "manual-order-flow",
  "payment-disabled",
  "getPublicBillingPlans",
  "getBillingReadinessReport",
]) {
  assertIncludes(pricing, marker, "app/pricing/page.tsx");
}

for (const marker of [
  "Paid MVP shell v0.1.66",
  ".paid-hero",
  ".paid-plan-card",
  ".manual-order-flow",
  ".paid-checklist",
]) {
  assertIncludes(css, marker, "app/globals.css");
}

assertIncludes(packageJson, '"check:paid-mvp-shell"', "package.json");

console.log("paid MVP shell check passed.");
