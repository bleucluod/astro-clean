import fs from "node:fs";

const requiredFiles = [
  "app/page.tsx",
  "components/AppShell.tsx",
  "components/SafetyDisclaimer.tsx",
  "components/SkyPulseDateCard.tsx",
  "components/HomepageProductProof.tsx",
  "lib/config/navigation.ts",
  "lib/sky-pulse/tehran-moon-pulse.ts",
  "app/api/sky-pulse/today/route.ts",
  "app/globals.css",
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

assertIncludes("app/api/sky-pulse/today/route.ts", 'dynamic = "force-dynamic"', "dynamic API route");
assertIncludes("app/api/sky-pulse/today/route.ts", "buildTehranMoonPulse", "real Tehran Moon Pulse builder");
assertIncludes("lib/sky-pulse/tehran-moon-pulse.ts", "calculateBodyGeocentricLongitude", "engine longitude calculation");
assertIncludes("lib/sky-pulse/tehran-moon-pulse.ts", "getAstronomyBody", "shared real chart body source");
assertIncludes("lib/sky-pulse/tehran-moon-pulse.ts", "Asia/Tehran", "Tehran timezone");
assertIncludes("lib/sky-pulse/tehran-moon-pulse.ts", "hijriDate", "Hijri date in response");
assertIncludes("lib/sky-pulse/tehran-moon-pulse.ts", "phaseName", "Moon phase label");
assertIncludes("lib/sky-pulse/tehran-moon-pulse.ts", "moonSignLabel", "current Moon sign label");

assertIncludes("components/SkyPulseDateCard.tsx", 'fetch("/api/sky-pulse/today"', "dynamic Moon Pulse fetch");
assertIncludes("components/SkyPulseDateCard.tsx", "ماه اکنون", "current Moon UI");
assertIncludes("components/SkyPulseDateCard.tsx", "فاز ماه", "Moon phase UI");
assertIncludes("components/SkyPulseDateCard.tsx", "تهران", "Tehran location note");
assertIncludes("components/SkyPulseDateCard.tsx", "قمری", "Hijri date UI marker");
assertNotIncludes("components/SkyPulseDateCard.tsx", "در انتظار محاسبه واقعی ماه");
assertNotIncludes("components/SkyPulseDateCard.tsx", "ترنزیت جعلی");

assertIncludes("components/SafetyDisclaimer.tsx", "یادآوری آرام", "softer safety language");
assertIncludes("components/SafetyDisclaimer.tsx", "زبان نمادین آسمان", "inspiring symbolic disclaimer");
assertNotIncludes("components/SafetyDisclaimer.tsx", "برای سرگرمی");

assertIncludes("components/AppShell.tsx", "site-nav-links", "structured nav wrapper");
assertIncludes("components/AppShell.tsx", "site-nav-actions", "structured nav CTA");
assertIncludes("lib/config/navigation.ts", "چارت تولد", "product-first nav");
assertNotIncludes("lib/config/navigation.ts", 'label: "خانه"');

assertIncludes("app/page.tsx", "نبض امروز را ببین", "real Moon Pulse CTA");
assertIncludes("app/page.tsx", "ماه امروز با افق تهران", "Tehran Moon Pulse trust strip");
assertIncludes("app/page.tsx", "home-faq-list", "polished FAQ list");
assertNotIncludes("app/page.tsx", "در انتظار محاسبه واقعی");
assertNotIncludes("app/page.tsx", "slot آینده");
assertNotIncludes("app/page.tsx", "بدون ترنزیت جعلی");

assertIncludes("components/HomepageProductProof.tsx", "نمونه کوتاه", "real preview block");
assertNotIncludes("components/HomepageProductProof.tsx", "در این مرحله نمونه کامل جدا نداریم");

assertIncludes("app/globals.css", "Homepage real Tehran Moon Pulse + product polish v0.1.173", "v0.1.173 CSS block");
assertIncludes("app/globals.css", ".home-faq-item", "FAQ card CSS");
assertIncludes("app/globals.css", ".moon-pulse-section", "Moon Pulse CSS");
assertIncludes("app/globals.css", ".site-nav-links", "Header nav CSS");

console.log("Real Tehran Moon Pulse homepage polish check passed.");
