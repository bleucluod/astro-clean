import { readFileSync } from "node:fs";

const appShell = readFileSync("components/AppShell.tsx", "utf8");
const siteHeader = readFileSync("components/SiteHeader.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const failures = [];

const obsoleteAppShellMarkers = [
  "مسیر سریع فروش",
  "گزارش نمونه، توضیح محصول",
  "حریم داده",
  "getSalesNavigationLinks",
  "shell-sales-nav",
  "footer-sales-links",
  "footer-grid",
  "HHalleus",
  "import { NavLinks }",
  "site-mobile-menu",
];

for (const marker of obsoleteAppShellMarkers) {
  if (appShell.includes(marker)) {
    failures.push(`AppShell still contains obsolete marker: ${marker}`);
  }
}

for (const marker of [".shell-sales-nav", ".footer-sales-links", ".footer-grid", ".site-mobile-menu"]) {
  if (globals.includes(marker)) {
    failures.push(`globals.css still contains obsolete chrome selector: ${marker}`);
  }
}

for (const marker of [
  "SiteHeader",
  "site-footer",
  "footer-inner",
  "footer-brand-block",
  "footer-note",
  "footer-links",
  "footer-link",
  "Halleus.ir",
]) {
  if (!appShell.includes(marker)) {
    failures.push(`AppShell missing site chrome marker: ${marker}`);
  }
}

for (const marker of [
  '"use client"',
  "lastScrollYRef",
  "HEADER_HIDE_OFFSET",
  "site-header-hidden",
  "site-header-visible",
  "site-header-scrolled",
  "site-nav-scroll-row",
  "site-header-cta",
  "NavLinks",
  "ساخت گزارش",
]) {
  if (!siteHeader.includes(marker)) {
    failures.push(`SiteHeader missing header behavior marker: ${marker}`);
  }
}

const requiredFooterRoutes = [
  ["/chart", "ساخت گزارش"],
  ["/product", "محصول"],
  ["/pricing", "پلن‌ها"],
  ["/order", "سفارش دستی"],
  ["/reports", "گزارش‌ها"],
  ["/privacy", "حریم خصوصی"],
];

for (const [href, label] of requiredFooterRoutes) {
  if (!appShell.includes(`href: "${href}"`) || !appShell.includes(`label: "${label}"`)) {
    failures.push(`Footer access links missing ${label} -> ${href}`);
  }
}

for (const marker of [
  ".site-header-hidden",
  ".site-header-visible",
  ".site-header-scrolled",
  ".site-nav-scroll-row",
  ".site-brand-copy",
  ".site-nav-cta",
  ".footer-inner",
  ".footer-brand-block",
  ".footer-note",
  ".footer-links",
  ".footer-link",
  "overflow-x: auto",
  "grid-template-columns: auto minmax(0, 1fr)",
]) {
  if (!globals.includes(marker)) {
    failures.push(`globals.css missing site chrome selector: ${marker}`);
  }
}

if (packageJson.scripts?.["check:site-chrome-minimal-ui"] !== "node scripts/check-site-chrome-minimal-ui.mjs") {
  failures.push("package.json missing check:site-chrome-minimal-ui script");
}

for (const scriptName of ["check:project", "check:core"]) {
  const command = packageJson.scripts?.[scriptName] ?? "";
  if (command.includes("check:sales-navigation-polish")) {
    failures.push(`${scriptName} still runs obsolete check:sales-navigation-polish`);
  }
  if (!command.includes("check:site-chrome-minimal-ui")) {
    failures.push(`${scriptName} does not include check:site-chrome-minimal-ui`);
  }
}

if (failures.length > 0) {
  console.error("Site chrome minimal UI check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Site chrome minimal UI check passed.");
