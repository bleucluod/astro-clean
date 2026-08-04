import { readFileSync } from "node:fs";

const appShell = readFileSync("components/AppShell.tsx", "utf8");
const siteHeader = readFileSync("components/SiteHeader.tsx", "utf8");
const navigation = readFileSync("lib/config/navigation.ts", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const appShellCss = readFileSync("components/app-shell.module.css", "utf8");
const homePage = readFileSync("app/page.tsx", "utf8");
const privacyPage = readFileSync("app/privacy/page.tsx", "utf8");
const compareLayout = readFileSync("app/compare/layout.tsx", "utf8");
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
  "/halleus-logo/logo-horizontal-bilingual-final-20260804.png",
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
  "ساخت چارت",
  'data-site-header="human-first-v2"',
]) {
  if (!siteHeader.includes(marker)) {
    failures.push(`SiteHeader missing header behavior marker: ${marker}`);
  }
}

const requiredFooterRoutes = [
  ["/chart", "ساخت چارت تولد"],
  ["/sky", "آسمان امروز"],
  ["/wiki", "ویکی آسترولوژی"],
  ["/privacy", "حریم خصوصی"],
];

for (const [href, label] of requiredFooterRoutes) {
  if (!appShell.includes(`href: "${href}"`) || !appShell.includes(`label: "${label}"`)) {
    failures.push(`Footer access links missing ${label} -> ${href}`);
  }
}

for (const href of ["/product", "/pricing", "/order", "/reports", "/dashboard"]) {
  if (appShell.includes(`href: "${href}"`)) {
    failures.push(`Footer exposes non-essential route ${href}`);
  }
}

for (const marker of [
  "footerResponsibility",
  "footerSocialLink",
  'href="https://www.instagram.com/halleus_ir/"',
  'aria-label="اینستاگرام هالیوس"',
]) {
  if (!appShell.includes(marker)) {
    failures.push(`Minimal footer missing brand/social marker: ${marker}`);
  }
}

for (const forbiddenMarker of ["AnalyticsPreferencesLink"]) {
  if (appShell.includes(forbiddenMarker)) {
    failures.push(`Minimal footer still exposes removed control/title: ${forbiddenMarker}`);
  }
}

if (!appShell.includes("دسترسی سریع")) {
  failures.push("Minimal footer is missing the approved quick-access title");
}

if (!appShell.includes('aria-label="مسیرهای اصلی"')) {
  failures.push("Minimal footer access links need a compact accessible label");
}

const legacyGlobalFooterLayoutPatterns = [
  [
    /(?:\.footer-inner-clean\s*,\s*)?\.footer-inner\s*\{[^}]*(?:display|grid-template-columns|gap|padding-top|align-items)\s*:/s,
    "globals.css must not control footer inner layout",
  ],
  [
    /\.footer-links(?:\s*,[^{}]+)*\s*\{[^}]*(?:display|flex-wrap|justify-content|gap|max-width)\s*:/s,
    "globals.css must not control footer links layout or visibility",
  ],
  [
    /\.site-footer\s*\{[^}]*(?:width|margin|padding(?:-block)?)\s*:/s,
    "globals.css must not control footer width, margin, or padding",
  ],
  [
    /\.footer-brand-block\s*\{[^}]*max-width\s*:/s,
    "globals.css must not cap the footer brand column",
  ],
];

for (const [pattern, message] of legacyGlobalFooterLayoutPatterns) {
  if (pattern.test(globals)) {
    failures.push(message);
  }
}

const footerInnerMatch = appShellCss.match(/\.footerInner\s*\{([^}]*)\}/);
if (!footerInnerMatch) {
  failures.push("Footer CSS is missing the base footerInner rule");
} else {
  const baseFooterColumns = footerInnerMatch[1].match(/minmax\(/g) ?? [];
  if (baseFooterColumns.length !== 3) {
    failures.push("Footer base layout must define exactly three responsive columns");
  }
}

const tabletStart = appShellCss.indexOf("@media (max-width: 980px)");
const mobileStart = appShellCss.indexOf("@media (max-width: 760px)");
if (tabletStart === -1 || mobileStart === -1 || mobileStart <= tabletStart) {
  failures.push("Footer CSS is missing the expected tablet/mobile media boundaries");
} else {
  const tabletRules = appShellCss.slice(tabletStart, mobileStart);
  if (/\.footerInner\s*\{[^}]*grid-template-columns\s*:\s*1fr/.test(tabletRules)) {
    failures.push("Footer must remain three-column above the mobile breakpoint");
  }
  const mobileRules = appShellCss.slice(mobileStart);
  if (!/\.footerInner\s*\{[^}]*grid-template-columns\s*:\s*1fr/.test(mobileRules)) {
    failures.push("Footer must stack to one column at the mobile breakpoint");
  }
}

for (const marker of ['href: "/product"', 'href: "/privacy"', 'href: "/reports"', 'href: "/dashboard"']) {
  if (navigation.includes(marker)) {
    failures.push(`Primary navigation exposes private route marker: ${marker}`);
  }
}

for (const marker of ['href: "/chart"', 'href: "/compare"', 'href: "/sky"', 'href: "/wiki"']) {
  if (!navigation.includes(marker)) {
    failures.push(`Primary navigation missing public route marker: ${marker}`);
  }
}

if (appShell.includes('href: "/reports"')) {
  failures.push("Footer must not expose the private report library route");
}

for (const marker of [
  ".site-header-hidden",
  ".site-header-visible",
  ".site-header-scrolled",
  ".site-nav-scroll-row",
  ".site-brand-copy",
  ".site-nav-cta",
  ".footer-brand-block",
  ".footer-note",
  ".footer-link",
  "overflow-x: auto",
  "grid-template-columns: auto minmax(0, 1fr)",
]) {
  if (!globals.includes(marker)) {
    failures.push(`globals.css missing site chrome selector: ${marker}`);
  }
}


if (!appShellCss.includes("header-human-first-v2")) {
  failures.push("Header CSS is missing the Human-First v2 contract marker");
}

for (const marker of [
  "گزارش مهمان و رایگان عمومی و ایندکس‌پذیر",
  "نسخهٔ پریمیوم خصوصی از ابتدا",
  "سیاست انتشار روشن",
]) {
  if (!homePage.includes(marker)) {
    failures.push(`Homepage missing publication contract marker: ${marker}`);
  }
}

for (const marker of [
  "گزارش شخصی بدون رضایت روشن تو عمومی و قابل ایندکس نمی‌شود",
  "<span>گزارش خصوصی</span>",
]) {
  if (homePage.includes(marker)) {
    failures.push(`Homepage still contains stale publication copy: ${marker}`);
  }
}

for (const marker of [
  "گزارش مهمان و حساب رایگان",
  "به‌صورت پیش‌فرض خصوصی و خارج از نتایج جست‌وجو است",
  "نمایش نام، نیک‌نیم یا هویت انتخابی جدا از انتشار است",
  "همیشه خصوصی است، لینک عمومی ندارد",
  "انتشار گزارش و نمایش هویت دو انتخاب جدا هستند",
]) {
  if (!privacyPage.includes(marker)) {
    failures.push(`Privacy page missing publication contract marker: ${marker}`);
  }
}

for (const marker of [
  "گزارش‌ها فعلاً خصوصی‌اند",
  "اگر روزی گزارش عمومی",
  "پیدا شدن در گوگل: فعال نیست",
]) {
  if (privacyPage.includes(marker)) {
    failures.push(`Privacy page still contains stale publication copy: ${marker}`);
  }
}

if (!compareLayout.includes("چارت سیناستری آنلاین | مقایسه دو چارت تولد")) {
  failures.push("Compare layout is missing the approved public synastry title");
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
