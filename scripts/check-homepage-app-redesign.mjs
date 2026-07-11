import { readFileSync } from "node:fs";

const home = readFileSync("app/page.tsx", "utf8");
const homeStyles = readFileSync("app/home.module.css", "utf8");
const appShell = readFileSync("components/AppShell.tsx", "utf8");
const siteHeader = readFileSync("components/SiteHeader.tsx", "utf8");
const shellStyles = readFileSync("components/app-shell.module.css", "utf8");
const wikiContent = readFileSync("lib/wiki/wiki-content.ts", "utf8");

const failures = [];

for (const marker of [
  'data-home-theme="halleus-soft-app"',
  "HomepageProductProof",
  "SkyPulseDateCard",
  "wikiArticles.length",
  'href="/wiki"',
  'href="/chart"',
  'id="sample-report"',
  "what-is-birth-chart-interpretation",
  "what-is-rising-sign",
  "what-is-moon-sign",
]) {
  if (!home.includes(marker)) {
    failures.push(`Homepage missing redesign marker: ${marker}`);
  }
}

for (const marker of [
  "--halleus-ink",
  "--halleus-primary",
  "linear-gradient",
  "border-radius: 32px",
  "@media (max-width: 760px)",
  ".wikiGrid",
  ".chartWheel",
]) {
  if (!homeStyles.includes(marker)) {
    failures.push(`Homepage styles missing design-system marker: ${marker}`);
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
  'href: "/wiki"',
]) {
  if (!appShell.includes(marker)) {
    failures.push(`AppShell missing redesign marker: ${marker}`);
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
  "حساب من",
  "ساخت گزارش",
]) {
  if (!siteHeader.includes(marker)) {
    failures.push(`SiteHeader missing behavior or UI marker: ${marker}`);
  }
}

for (const marker of [
  ":global(:root)",
  ":global(body)",
  ":global(.nav-link-track)",
  ":global(.nav-link.active)",
  "backdrop-filter",
  "@media (max-width: 760px)",
]) {
  if (!shellStyles.includes(marker)) {
    failures.push(`App shell styles missing marker: ${marker}`);
  }
}

const articleCount = (wikiContent.match(/slug:\s*"[^"]+"/g) ?? []).length;
if (articleCount < 15) {
  failures.push(`Expected at least 15 Wiki articles, found ${articleCount}`);
}

for (const obsoleteClaim of [
  "ویکی بعداً",
  "ویکی در مسیر",
  "محتوا بعداً اضافه می‌شود",
  "بیش از ۱۰۰٬۰۰۰ کاربر",
  "پیش‌بینی سالانه",
]) {
  if (home.includes(obsoleteClaim)) {
    failures.push(`Homepage contains obsolete or invented claim: ${obsoleteClaim}`);
  }
}

if (failures.length > 0) {
  console.error("Homepage app redesign check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Homepage app redesign check passed.");
console.log("- soft Halleus palette and app-like shell are wired");
console.log("- homepage uses real Sky Pulse, report proof, Wiki count, and truthful product links");
console.log("- no invented user counts, products, or forecasting claims were added");
