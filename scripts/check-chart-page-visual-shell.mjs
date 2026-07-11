import { existsSync, readFileSync } from "node:fs";

const failures = [];

const layoutPath = "app/chart/layout.tsx";
const stylePath = "app/chart/chart-shell.module.css";
const pagePath = "app/chart/page.tsx";
const chartFormPath = "components/ChartForm.tsx";

for (const path of [layoutPath, stylePath, pagePath, chartFormPath]) {
  if (!existsSync(path)) {
    failures.push(`Missing chart visual-shell file: ${path}`);
  }
}

if (failures.length === 0) {
  const layoutSource = readFileSync(layoutPath, "utf8");
  const styleSource = readFileSync(stylePath, "utf8");
  const pageSource = readFileSync(pagePath, "utf8");
  const chartFormSource = readFileSync(chartFormPath, "utf8");

  for (const marker of [
    'import type { ReactNode } from "react"',
    'import styles from "./chart-shell.module.css"',
    'data-chart-visual-shell="homepage-aligned"',
    'data-product-surface="Halleus Chart"',
    "گزارش تولد شخصی تو",
    "نقشه‌ی آسمانِ لحظه‌ی تولدت را بساز.",
    "اطلاعات تولد",
    "محاسبه‌ی چارت",
    "گزارش فارسی",
    "{children}",
  ]) {
    if (!layoutSource.includes(marker)) {
      failures.push(`Chart layout missing marker: ${marker}`);
    }
  }

  for (const marker of [
    ".page",
    ".intro",
    ".introGlow",
    ".formStage",
    ":global(.chart-reference-page)",
    ":global(.chart-reference-shell)",
    ":global(.chart-reference-visual)",
    ":global(.chart-reference-content)",
    "@media (max-width: 760px)",
  ]) {
    if (!styleSource.includes(marker)) {
      failures.push(`Chart shell CSS missing marker: ${marker}`);
    }
  }

  for (const marker of [
    'import { ChartForm } from "@/components/ChartForm"',
    "return <ChartForm />",
  ]) {
    if (!pageSource.includes(marker)) {
      failures.push(`Chart route changed outside visual-shell scope: ${marker}`);
    }
  }

  for (const marker of [
    'className="chart-reference-page"',
    'className="chart-reference-shell"',
    'className="chart-reference-form"',
  ]) {
    if (!chartFormSource.includes(marker)) {
      failures.push(`ChartForm contract missing marker: ${marker}`);
    }
  }

  for (const forbiddenMarker of [
    "SupabaseAuthPanel",
    "currentResidenceCity",
    "saveMessage",
    "router.push",
    "/api/engine/real-chart",
    "حساب اختیاری",
    "وارد شوید",
    "ثبت‌نام",
  ]) {
    if (layoutSource.includes(forbiddenMarker)) {
      failures.push(
        `Visual-shell layout drifted into form/auth behavior: ${forbiddenMarker}`,
      );
    }
  }

  if (styleSource.includes(".chart-inline-account-panel")) {
    failures.push(
      "Visual-shell CSS must not target the account panel in phase one.",
    );
  }
}

if (failures.length > 0) {
  console.error("Chart page visual shell check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Chart page visual shell check passed.");
console.log("- route-level chart intro is homepage-aligned and chart-specific");
console.log("- existing ChartForm route and behavior remain unchanged");
console.log("- account, city, submit, and toast behavior stay outside phase one");
