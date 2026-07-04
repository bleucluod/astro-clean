import fs from "node:fs";

const requiredFiles = [
  "app/page.tsx",
  "app/globals.css",
  "components/AppShell.tsx",
  "components/NavLinks.tsx",
  "components/SafetyDisclaimer.tsx",
  "components/SkyPulseDateCard.tsx",
  "components/HomepageProductProof.tsx",
  "lib/sky-pulse/tehran-moon-pulse.ts",
];

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing required file: ${file}`);
  }

  return fs.readFileSync(file, "utf8");
}

function assertIncludes(file, text, label = text) {
  const content = read(file);

  if (!content.includes(text)) {
    throw new Error(`${file} must include ${label}`);
  }
}

function assertNotIncludes(file, text) {
  const content = read(file);

  if (content.includes(text)) {
    throw new Error(`${file} must not include stale text: ${text}`);
  }
}

for (const file of requiredFiles) {
  read(file);
}

assertIncludes("components/NavLinks.tsx", 'className="nav-link-track"', "explicit nav link track");
assertIncludes("components/NavLinks.tsx", "aria-current", "accessible active nav state");
assertIncludes("components/AppShell.tsx", "site-nav-cta-main", "structured CTA label");
assertIncludes("components/AppShell.tsx", "شروع رایگان", "free-start CTA subcopy");
assertNotIncludes("components/AppShell.tsx", "private-first");

assertIncludes("app/page.tsx", "hero-eyebrow-row", "polished hero eyebrow row");
assertIncludes("app/page.tsx", "home-kpi-row", "hero KPI row");
assertIncludes("app/page.tsx", "home-section-heading", "section heading rhythm");
assertIncludes("app/page.tsx", '<details className="home-faq-item"', "FAQ details cards");
assertIncludes("app/page.tsx", "ماه امروز با افق تهران", "Tehran Moon Pulse status copy");
assertNotIncludes("app/page.tsx", "تست محصول");
assertNotIncludes("app/page.tsx", "product آماده‌تر");
assertNotIncludes("app/page.tsx", "private-first");

assertIncludes("components/SkyPulseDateCard.tsx", "moon-pulse-dashboard", "dashboard-style Moon Pulse");
assertIncludes("components/SkyPulseDateCard.tsx", "ساعت تهران", "Tehran local time display");
assertIncludes("components/SkyPulseDateCard.tsx", "تنظیم با افق تهران", "soft Tehran location label");
assertIncludes("components/SkyPulseDateCard.tsx", "بدون نتیجه ساختگی", "honest fallback");
assertNotIncludes("components/SkyPulseDateCard.tsx", "در انتظار محاسبه واقعی");
assertNotIncludes("components/SkyPulseDateCard.tsx", "ترنزیت کامل");

assertIncludes("components/HomepageProductProof.tsx", "وقتی هالیوس آماده‌تر شد", "less internal proof copy");
assertNotIncludes("components/HomepageProductProof.tsx", "product آماده‌تر");

assertIncludes("components/SafetyDisclaimer.tsx", "یادآوری آرام", "soft safety language stays present");
assertNotIncludes("components/SafetyDisclaimer.tsx", "برای سرگرمی");

assertIncludes("lib/sky-pulse/tehran-moon-pulse.ts", "انتخاب شهرهای دیگر", "soft future location copy");

assertIncludes("app/globals.css", "Homepage visual QA + app feel polish v0.1.174", "v0.1.174 CSS marker");
assertIncludes("app/globals.css", ".nav-link-track", "nav track CSS");
assertIncludes("app/globals.css", ".site-nav-links .nav-link.active", "active nav CSS");
assertIncludes("app/globals.css", ".moon-pulse-dashboard", "Moon Pulse dashboard CSS");
assertIncludes("app/globals.css", ".home-faq-item summary", "FAQ summary CSS");
assertIncludes("app/globals.css", ".home-kpi-row", "hero KPI CSS");
assertIncludes("app/globals.css", ".home-section-heading", "section heading CSS");

console.log("Homepage visual app polish check passed.");
