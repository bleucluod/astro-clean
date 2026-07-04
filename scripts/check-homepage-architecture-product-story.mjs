import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function assertIncludes(file, text) {
  const body = read(file);
  if (!body.includes(text)) {
    throw new Error(`${file} is missing required text: ${text}`);
  }
}

function assertNotIncludes(file, text) {
  const body = read(file);
  if (body.includes(text)) {
    throw new Error(`${file} still includes forbidden text: ${text}`);
  }
}

const home = "app/page.tsx";
const shell = "components/AppShell.tsx";
const nav = "lib/config/navigation.ts";
const proof = "components/HomepageProductProof.tsx";
const skyPulse = "components/SkyPulseDateCard.tsx";
const skyContent = "lib/sky-pulse/sky-pulse-content.ts";

[
  "هالیوس؛ تولد تو فقط یک تاریخ نیست",
  "گزارش تولدم را بساز",
  "در گزارش چه می‌بینی؟",
  "نبض آسمان امروز",
  "فاز ماه امروز",
  "خصوصی و no-index",
  "بدون ترنزیت جعلی",
  "هالیوس چیست؟",
  "پرسش‌های کوتاه",
].forEach((text) => assertIncludes(home, text));

[
  "/pricing",
  "/order",
  "سفارش نسخه کامل‌تر",
  "دیدن گزینه‌های گزارش کامل‌تر",
  "قابل سفارش",
].forEach((text) => assertNotIncludes(home, text));

[
  "NavLinks",
  "ساخت گزارش",
  "فعلاً free-first",
].forEach((text) => assertIncludes(shell, text));

[
  "/admin",
  "/dashboard",
  "/pricing",
  "/order",
  "/profile",
  "/roadmap",
  "/wiki",
].forEach((text) => assertNotIncludes(nav, text));

[
  "id=\"report-preview\"",
  "نمونه گزارش",
  "free-first",
  "فاز ماه",
].forEach((text) => assertIncludes(proof, text));

[
  "id=\"sky-pulse\"",
  "بدون ادعای ترنزیت واقعی",
  "ریتم ماهانه تقویم",
].forEach((text) => assertIncludes(skyPulse, text));

[
  "فاز ماه امروز",
  "در انتظار محاسبه واقعی ماه",
].forEach((text) => assertIncludes(skyContent, text));

[
  "ترنزیت واقعی محاسبه نمی‌کند",
].forEach((text) => assertIncludes(skyContent, text));

console.log("Homepage architecture product story check passed.");

