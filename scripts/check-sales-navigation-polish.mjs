import { existsSync, readFileSync } from "node:fs";

function readFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${path}`);
  }

  return readFileSync(path, "utf8");
}

function assertIncludes(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`${label} is missing marker: ${marker}`);
  }
}

function assertIncludesAll(source, markers, label) {
  for (const marker of markers) {
    assertIncludes(source, marker, label);
  }
}

const appShell = readFile("components/AppShell.tsx");
const productSurface = readFile("lib/product/product-surface.ts");
const homePage = readFile("app/page.tsx");
const productPage = readFile("app/product/page.tsx");
const pricingPage = readFile("app/pricing/page.tsx");
const reportsPage = readFile("app/reports/page.tsx");
const privacyPage = readFile("app/privacy/page.tsx");
const globals = readFile("app/globals.css");
const packageJson = readFile("package.json");

assertIncludesAll(
  appShell,
  [
    "getSalesNavigationLinks",
    "shell-sales-nav",
    "footer-sales-links",
    "/pricing",
    "/product",
    "/chart",
  ],
  "components/AppShell.tsx",
);

assertIncludesAll(
  productSurface,
  [
    "SALES_NAVIGATION_LINKS",
    "getSalesNavigationLinks",
    'href: "/chart"',
    'href: "/product"',
    'href: "/pricing"',
    'href: "/reports"',
    'href: "/privacy"',
  ],
  "lib/product/product-surface.ts",
);

assertIncludesAll(homePage, ["paid-mvp-landing", 'href="/chart"', 'href="/pricing"', 'href="/product"'], "app/page.tsx");
assertIncludesAll(productPage, ["Halleus Product Map", "Paid MVP Shell", 'href="/chart"', 'href="/pricing"'], "app/product/page.tsx");
assertIncludesAll(pricingPage, ["Manual order MVP", "payment-disabled", 'href="/chart"', 'href="/product"'], "app/pricing/page.tsx");
assertIncludesAll(reportsPage, ["reports-sales-shell", "reports-sales-cta", 'href="/pricing"', "<ReportsList />"], "app/reports/page.tsx");
assertIncludesAll(privacyPage, ["privacy-sales-shell", "privacy-sales-note", 'href="/pricing"', "Payment: سفارش دستی"], "app/privacy/page.tsx");

assertIncludesAll(
  globals,
  [
    "Sales navigation polish v0.1.67",
    ".shell-sales-nav",
    ".footer-sales-links",
    ".reports-sales-cta",
    ".privacy-sales-note",
  ],
  "app/globals.css",
);

assertIncludes(packageJson, '"check:sales-navigation-polish"', "package.json");
assertIncludes(packageJson, "pnpm run check:sales-navigation-polish", "package.json");

console.log("sales navigation polish check passed.");
