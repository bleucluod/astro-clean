import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/product/mvp-hardening-checkpoint.ts",
  "app/quality/mvp-checkpoint/page.tsx",
  "scripts/check-mvp-hardening-checkpoint.mjs",
];

const requiredExports = [
  "MVP_HARDENING_CHECKPOINT_VERSION",
  "MVP_HARDENING_GROUPS",
  "getMvpHardeningGroups",
  "getMvpHardeningFlatItems",
  "getMvpHardeningStats",
  "getMvpHardeningManualChecklist",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const source = readFileSync(requiredFiles[0], "utf8");
const pageSource = readFileSync(requiredFiles[1], "utf8");
const checkProject = packageJson.scripts?.["check:project"] ?? "";
const failures = [];

for (const filePath of requiredFiles) {
  try {
    readFileSync(filePath, "utf8");
  } catch {
    failures.push(`Missing required file: ${filePath}`);
  }
}

for (const exportName of requiredExports) {
  if (
    !source.includes(`export function ${exportName}`) &&
    !source.includes(`export const ${exportName}`)
  ) {
    failures.push(`Missing MVP hardening export: ${exportName}`);
  }
}

for (const marker of [
  "/engine/report-flow",
  "/engine/report-preview",
  "No medical/legal/financial advice",
  "Smoke test روی دامنه اصلی",
  "prototype symbolic flow",
  "گزارش قدیمی crash نمی‌کند",
]) {
  if (!source.includes(marker)) {
    failures.push(`MVP hardening source missing marker: ${marker}`);
  }
}

for (const marker of [
  "MvpHardeningCheckpointPage",
  "چک‌پوینت آمادگی MVP",
  "Manual check",
  "MVP_HARDENING_CHECKPOINT_VERSION",
]) {
  if (!pageSource.includes(marker)) {
    failures.push(`MVP hardening page missing marker: ${marker}`);
  }
}

if (
  packageJson.scripts?.["check:mvp-hardening-checkpoint"] !==
  "node scripts/check-mvp-hardening-checkpoint.mjs"
) {
  failures.push("Missing package script: check:mvp-hardening-checkpoint");
}

if (!checkProject.includes("pnpm run check:mvp-hardening-checkpoint")) {
  failures.push("check:project does not run check:mvp-hardening-checkpoint");
}

if (failures.length > 0) {
  console.error("MVP hardening checkpoint check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("MVP hardening checkpoint check passed for 3 files.");
