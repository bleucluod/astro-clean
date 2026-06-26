import { readFileSync } from "node:fs";

const failures = [];
const writerSource = readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
const chartFormSource = readFileSync("components/ChartForm.tsx", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const checkProject = packageJson.scripts?.["check:project"] ?? "";

for (const marker of [
  "enrichReportWithRealEngineCopy",
  "SIGN_COPY",
  "PLANET_COPY",
  "buildRealEngineSummary",
  "buildCorePlacementText",
  "buildRisingText",
  "buildOptionalPlacementText",
  "buildIntegrationText",
  "خورشید",
  "ماه",
  "رایزینگ تقریبی",
  "placementهای اصلی",
]) {
  if (!writerSource.includes(marker)) {
    failures.push(`real-engine-report-writer missing marker: ${marker}`);
  }
}

for (const marker of [
  'import { enrichReportWithRealEngineCopy } from "@/lib/astrology/real-engine-report-writer"',
  "return enrichReportWithRealEngineCopy",
  "متن real-engine-native",
  "متن summary و interpretationها",
  "summary و interpretationهای این گزارش از placementهای واقعی‌تر",
  "داده real engine هم داخل گزارش ذخیره شد",
  "snapshot جایگاه‌های واقعی‌تر",
]) {
  if (!chartFormSource.includes(marker)) {
    failures.push(`ChartForm missing real engine writer marker: ${marker}`);
  }
}

if (
  packageJson.scripts?.["check:real-engine-report-writer"] !==
  "node scripts/check-real-engine-report-writer.mjs"
) {
  failures.push("Missing package script: check:real-engine-report-writer");
}

if (!checkProject.includes("pnpm run check:real-engine-report-writer")) {
  failures.push("check:project does not run check:real-engine-report-writer");
}

if (failures.length > 0) {
  console.error("Real engine report writer check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Real engine report writer check passed for 2 files.");
