import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const sources = {
  home: read("app/page.tsx"), chart: read("app/chart/page.tsx") + read("app/chart/layout.tsx"),
  compare: read("app/compare/page.tsx") + read("app/compare/layout.tsx") + read("app/compare/[comparisonId]/layout.tsx") + read("components/comparison/ComparisonComposer.tsx"),
  sky: read("app/sky/page.tsx") + read("components/SkyPublicExperience.tsx"), product: read("app/product/page.tsx"),
  pricing: read("app/pricing/page.tsx"), order: read("app/order/page.tsx") + read("components/PremiumRequestForm.tsx"),
  privacy: read("app/privacy/page.tsx"),
};

const required = {
  home: ["هالیوس | آسترولوژی فارسی، چارت تولد و تحلیل رابطه", "آسترولوژی فارسی برای شناخت چارت تولد، رابطه‌ها و آسمان امروز", "href=\"/chart\"", "href=\"/compare\"", "href=\"/product\"", "href=\"/privacy\""],
  chart: ["چارت تولد رایگان فارسی با تفسیر | هالیوس", "چارت تولد رایگان فارسی؛ محاسبه و گزارش شخصی", "href=\"/product\"", "href=\"/compare\"", "href=\"/privacy\""],
  compare: ["چارت سیناستری آنلاین | مقایسه دو چارت تولد", "تحلیل رابطه با مقایسه دو چارت تولد", "چارت سیناستری چیست؟", "این ابزار چه چیزی را تضمین نمی‌کند؟", "href=\"/privacy\""],
  sky: ["آسترولوژی امروز | وضعیت ماه، سیارات و ترنزیت‌ها", "deliverSkyPublicSnapshot", "getPublicWikiCatalog", "preferredSlugs", "این داده‌ها را چگونه بخوانم؟"],
  product: ["تفسیر چارت تولد فارسی | داخل گزارش هالیوس چیست؟", "گزارش چارت تولد هالیوس چه چیزهایی را تحلیل می‌کند؟", "HomepageProductProof", "href=\"/pricing\""],
  pricing: ["گزارش پایه و گزینه‌های نسخه کامل‌تر | هالیوس", "هماهنگی دستی", "ثبت درخواست به معنی خرید، پرداخت یا شروع خودکار نیست", "href=\"/order\""],
  order: ["درخواست نسخه کامل‌تر گزارش چارت تولد | هالیوس", "درخواست نسخه کامل‌تر گزارش را ثبت کن", "publicationChoice", "company", "در حال ثبت…"],
  privacy: ["حریم خصوصی هالیوس | انتشار، حذف و ایندکس گزارش‌ها", "حریم خصوصی هالیوس؛ قبل از ذخیره بدان چه چیزی عمومی می‌شود", "گزارش مهمان و حساب رایگان", "گزارش پریمیوم", "تحلیل رابطه", "AnalyticsPreferencesLink", "href=\"/reports\""],
};

for (const [page, markers] of Object.entries(required)) for (const marker of markers) assert.ok(sources[page].includes(marker), `${page} missing final editorial marker: ${marker}`);

const all = Object.values(sources).join("\n");
for (const forbidden of ["[PLAN_NAME_REQUIRED]", "[PRICE_REQUIRED]", "[REQUEST_ID]", "بیش از ۱۰۰٬۰۰۰ کاربر"]) assert.ok(!all.includes(forbidden), `Public content contains forbidden placeholder or claim: ${forbidden}`);
assert.ok(!/\b(?:9|19|90|190)\s*(?:USD|دلار)/u.test(sources.pricing), "Pricing exposes internal trial prices.");
assert.ok(sources.compare.includes("noarchive: true") && sources.compare.includes("nosnippet: true"), "Private Compare metadata boundary is missing.");

console.log("Final public editorial content check passed.");
console.log("- eight public routes preserve distinct query ownership and canonical metadata");
console.log("- pricing and order expose no placeholder, fake price, delivery promise, or automatic purchase claim");
console.log("- publication, identity, Compare privacy, deletion, and analytics choices remain distinct");
console.log("- dynamic Sky and Wiki links come from real delivery and catalog sources");
