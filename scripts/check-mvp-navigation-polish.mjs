import { readFileSync } from "node:fs";

const requiredFiles = [
  "components/EngineMvpNavigationPanel.tsx",
  "app/engine/page.tsx",
  "scripts/check-mvp-navigation-polish.mjs",
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const componentSource = readFileSync(requiredFiles[0], "utf8");
const enginePageSource = readFileSync(requiredFiles[1], "utf8");
const checkProject = packageJson.scripts?.["check:project"] ?? "";
const failures = [];

for (const filePath of requiredFiles) {
  try {
    readFileSync(filePath, "utf8");
  } catch {
    failures.push(`Missing required file: ${filePath}`);
  }
}

for (const marker of [
  "MVP_NAVIGATION_POLISH_VERSION",
  "EngineMvpNavigationPanel",
  "/engine/report-flow",
  "/engine/report-preview",
  "/engine/real",
  "/reports",
  "مسیرهای جدید تست محصول",
  "Manual QA سریع",
]) {
  if (!componentSource.includes(marker)) {
    failures.push(`Navigation component missing marker: ${marker}`);
  }
}

if (!enginePageSource.includes("EngineMvpNavigationPanel")) {
  failures.push("app/engine/page.tsx is not wired to EngineMvpNavigationPanel.");
}

if (
  packageJson.scripts?.["check:mvp-navigation-polish"] !==
  "node scripts/check-mvp-navigation-polish.mjs"
) {
  failures.push("Missing package script: check:mvp-navigation-polish");
}

if (!checkProject.includes("pnpm run check:mvp-navigation-polish")) {
  failures.push("check:project does not run check:mvp-navigation-polish");
}

if (failures.length > 0) {
  console.error("MVP navigation polish check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("MVP navigation polish check passed for 3 files.");
