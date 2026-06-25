import { readFileSync } from "node:fs";

const requiredFiles = [
  "src/lib/report-output/real-chart-copy-library.ts",
  "src/lib/report-output/real-chart-report-copy.ts",
  "scripts/check-real-chart-copy-library.mjs",
];

const libraryExports = [
  "REAL_CHART_COPY_LIBRARY_VERSION",
  "POINT_COPY_LIBRARY",
  "SIGN_COPY_LIBRARY",
  "HOUSE_COPY_LIBRARY",
  "ASPECT_COPY_LIBRARY",
  "getPointCopyEntry",
  "getSignCopyEntry",
  "getHouseCopyEntry",
  "getAspectCopyEntry",
  "getCopyLibraryStats",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const librarySource = readFileSync(requiredFiles[0], "utf8");
const copySource = readFileSync(requiredFiles[1], "utf8");
const checkProject = packageJson.scripts?.["check:project"] ?? "";
const checkReports = packageJson.scripts?.["check:reports"] ?? "";
const failures = [];

for (const filePath of requiredFiles) {
  try {
    readFileSync(filePath, "utf8");
  } catch {
    failures.push(`Missing required file: ${filePath}`);
  }
}

for (const exportName of libraryExports) {
  if (
    !librarySource.includes(`export function ${exportName}`) &&
    !librarySource.includes(`export const ${exportName}`)
  ) {
    failures.push(`Missing copy library export: ${exportName}`);
  }
}

for (const marker of [
  "خورشید",
  "ماه",
  "عطارد",
  "زهره",
  "حمل",
  "ثور",
  "حوت",
  "خانه‌ی ۱۲",
  "هم‌نشینی",
  "چالش سازنده",
  "جایگزین تصمیم پزشکی، حقوقی یا مالی",
]) {
  if (!librarySource.includes(marker) && !copySource.includes(marker)) {
    failures.push(`Missing Persian/safety marker: ${marker}`);
  }
}

if (!copySource.includes("./real-chart-copy-library")) {
  failures.push("real-chart-report-copy must consume real-chart-copy-library.");
}

if (!copySource.includes("buildCopyLibraryTransparencyBlock")) {
  failures.push("Missing copy library transparency block.");
}

if (
  packageJson.scripts?.["check:real-chart-copy-library"] !==
  "node scripts/check-real-chart-copy-library.mjs"
) {
  failures.push("Missing package script: check:real-chart-copy-library");
}

if (!checkReports.includes("pnpm run check:real-chart-copy-library")) {
  failures.push("check:reports does not run check:real-chart-copy-library");
}

if (!checkProject.includes("pnpm run check:real-chart-copy-library")) {
  failures.push("check:project does not run check:real-chart-copy-library");
}

if (failures.length > 0) {
  console.error("Real chart copy library check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Real chart copy library check passed for 3 files.");
