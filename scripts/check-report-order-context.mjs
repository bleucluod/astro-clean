import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function requireMarker(source, marker, label) {
  if (!source.includes(marker)) {
    throw new Error(`${label} is missing marker: ${marker}`);
  }
}

const reportRoute = read("app/reports/[reportId]/page.tsx");
const reportOrderCta = read("components/ReportOrderCta.tsx");
const orderPage = read("app/order/page.tsx");
const manualOrderForm = read("components/ManualOrderRequestForm.tsx");
const contextFile = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const packageJson = JSON.parse(read("package.json"));

for (const marker of [
  "ReportDetail",
  "ReportOrderCta",
  "reportId",
  "<ReportOrderCta reportId={reportId} />",
]) {
  requireMarker(reportRoute, marker, "app/reports/[reportId]/page.tsx");
}

for (const marker of [
  "ReportOrderCta",
  "encodeURIComponent(reportId)",
  "/order?reportId=",
  "سفارش نسخه کامل‌تر این گزارش",
]) {
  requireMarker(reportOrderCta, marker, "components/ReportOrderCta.tsx");
}

for (const marker of [
  "searchParams",
  "reportId",
  "initialReportId",
  "ManualOrderRequestForm",
]) {
  requireMarker(orderPage, marker, "app/order/page.tsx");
}

for (const marker of [
  "ManualOrderRequestFormProps",
  "initialReportId",
  "getReportRepository",
  "linkedReport",
  "اطلاعات گزارش نمونه",
  "شناسه گزارش",
]) {
  requireMarker(manualOrderForm, marker, "components/ManualOrderRequestForm.tsx");
}

for (const marker of [
  "v0.1.71-report-order-context",
  "ReportOrderCta",
  "ManualOrderRequestForm",
  "/order?reportId=",
]) {
  requireMarker(contextFile, marker, "docs/HALLEUS_PROJECT_CONTEXT.md");
}

if (
  packageJson.scripts?.["check:report-order-context"] !==
  "node scripts/check-report-order-context.mjs"
) {
  throw new Error("package.json is missing check:report-order-context script.");
}

if (manualOrderForm.includes("fetch(") || manualOrderForm.includes("action=")) {
  throw new Error("Manual order form should remain copy-only and must not submit to a backend.");
}

console.log("report order context check passed");
