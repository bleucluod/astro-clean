import { existsSync, readFileSync, statSync } from "node:fs";

function read(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing required file: ${path}`);
  }
  return readFileSync(path, "utf8");
}

function mustContain(label, source, token) {
  if (!source.includes(token)) {
    throw new Error(`${label} missing required token: ${token}`);
  }
}

function mustNotContain(label, source, token) {
  if (source.includes(token)) {
    throw new Error(`${label} contains forbidden token: ${token}`);
  }
}

const orderPage = read("app/order/page.tsx");
const surfaces = read("components/commerce/CommerceSurfaces.tsx");
const orderSurfaceStart = surfaces.indexOf("export function OrderCommerceSurface");
if (orderSurfaceStart < 0) {
  throw new Error("OrderCommerceSurface is missing.");
}
const orderSurface = surfaces.slice(orderSurfaceStart);
const orderCss = read("components/commerce/order-surface.module.css");
const requestForm = read("components/PremiumRequestForm.tsx");
const requestCss = read("components/premium-request-form.module.css");
const apiRoute = read("app/api/premium-requests/route.ts");
const reportContract = read("types/report-generation.ts");

for (const token of [
  'normalizeHalleusPackageCode',
  'item.active && item.code === normalized',
  'formatPackagePriceToman',
  'selectedPackage={{',
  'initialProductCode={selectedPackage.code}',
]) {
  mustContain("order page", orderPage, token);
}

mustNotContain("order page", orderPage, "ProductOfferGrid");

for (const token of [
  'data-halleus-order="checkout-request-v2"',
  'src="/halleus-order-hero.webp"',
  'id="order-package-title"',
  'href="/pricing"',
  'href="https://t.me/lbleu"',
  'href="#order-request-form"',
  'data-effective-access-mode="FREE_ALL"',
  'خرید یا استفاده از اعتبار، گزارشت را خودکار عمومی نمی‌کند',
]) {
  mustContain("order surface", orderSurface, token);
}

const packagePosition = orderSurface.indexOf('id="order-package-title"');
const telegramPosition = orderSurface.indexOf('href="https://t.me/lbleu"');
if (packagePosition < 0 || telegramPosition < 0 || packagePosition > telegramPosition) {
  throw new Error("Order surface must show the selected package before the Telegram purchase CTA.");
}

for (const token of [
  "در FREE_ALL",
  "کاتالوگ فعلی",
  "این صفحه checkout",
  "ledger",
  "اعتبارسنجی تقاضای واقعی",
]) {
  mustNotContain("order surface", orderSurface, token);
}

for (const token of [
  'data-order-request-form="request-v2"',
  'fetch("/api/premium-requests"',
  'getSupabaseBrowserAuthClient',
  'publicationChoice',
  '"not_requested"',
  '"private"',
  '"public_with_consent"',
  'درخواستت ثبت شد',
  'هماهنگی پرداخت در تلگرام',
  'خرید روی حریم خصوصی گزارشت اثری ندارد',
  'قیمت بسته:',
]) {
  mustContain("premium request form", requestForm, token);
}

for (const token of [
  'قیمت تست',
  'ledger',
  'پرداخت موفق',
  'اعتبارسنجی تقاضای واقعی',
  'Premium Birth',
  'Relationship',
]) {
  mustNotContain("premium request form", requestForm, token);
}

for (const token of [
  '--order-bg: #050609',
  '--order-surface: #0a0c10',
  '--order-accent: #7dd3fc',
  '--order-accent-soft: #dceeff',
  '.heroVisual',
  '.packageCard',
  '.completionGrid',
  '.privacyStrip',
]) {
  mustContain("order styles", orderCss, token);
}

for (const token of [
  '--form-bg: #0a0c10',
  '--form-accent: #7dd3fc',
  'background: #0b0e13 !important',
  '.privacyChoice',
  '.successPanel',
]) {
  mustContain("request form styles", requestCss, token);
}

for (const forbidden of ["#7658e8", "#5b49c9", "#8b5cf6"]) {
  mustNotContain("order styles", orderCss, forbidden);
  mustNotContain("request form styles", requestCss, forbidden);
}

for (const token of [
  'HALLEUS_FREE_ALL_PURCHASE_REQUEST_GUARD_BATCH1_R1',
  'createPremiumRequest',
  'contactName',
  'contactValue',
  'productCode',
  'linkedReportId',
  'customerNotes',
  'publicationChoice',
]) {
  mustContain("premium request API", apiRoute, token);
}

for (const token of [
  'ReportPublicationState',
  '"private"',
  '"public"',
  'ReportPublicationConsentState',
]) {
  mustContain("report publication contract", reportContract, token);
}

const assetPath = "public/halleus-order-hero.webp";
if (!existsSync(assetPath)) {
  throw new Error(`Missing approved order hero asset: ${assetPath}`);
}
const assetSize = statSync(assetPath).size;
if (assetSize < 20_000 || assetSize > 250_000) {
  throw new Error(`Order hero asset size outside expected optimized range: ${assetSize}`);
}

console.log("Order page product polish check passed.");
console.log("- selected active package is summarized before the manual purchase handoff");
console.log("- order/form copy avoids internal product and implementation jargon");
console.log("- FREE_ALL guard and premium request API contract remain wired");
console.log("- request form keeps publication consent choices and account-aware submission");
console.log("- order-only dark/cyan palette and approved hero asset are present");
