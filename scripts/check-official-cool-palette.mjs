
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(text, token, label) {
  if (!text.includes(token)) {
    throw new Error(`${label} is missing: ${token}`);
  }
}

function assertNotIncludes(text, token, label) {
  if (text.includes(token)) {
    throw new Error(`${label} should not include warm/mystical token: ${token}`);
  }
}

const css = read("app/globals.css");
const wheel = read("components/RealChartWheel.tsx");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");
const packageJson = JSON.parse(read("package.json"));

const officialTokens = [
  "#F8FAFC",
  "#D9EAFD",
  "#BCCCDC",
  "#9AA6B2",
  "#243447",
  "#3A4A5C",
  "#64748B",
];

for (const token of officialTokens) {
  assertIncludes(css, token, "official palette CSS");
  assertIncludes(projectContext, token, "project context palette record");
  assertIncludes(ideaGarden, token, "idea garden palette record");
}

assertIncludes(css, "Official Cool Palette v0.1.200", "official palette marker");
assertIncludes(css, "background: #F8FAFC !important", "body background override");
assertIncludes(css, "background: #D9EAFD !important", "footer/panel override");
assertIncludes(css, "border-color: #BCCCDC !important", "border override");
assertIncludes(css, "background: #9AA6B2 !important", "action override");
assertIncludes(css, "color: #243447 !important", "readable text override");
assertIncludes(css, "color: #3A4A5C !important", "secondary text override");
assertIncludes(css, "color: #64748B !important", "muted text override");

assertIncludes(projectContext, "Halleus Official Cool Palette v0.1.200", "project context palette decision");
assertIncludes(ideaGarden, "Official Cool Palette Direction v0.1.200", "idea garden palette decision");

const officialBlock = css.slice(css.indexOf("Official Cool Palette v0.1.200"));
[
  "#fffaf3",
  "#fbf4ea",
  "#f8efe4",
  "#f7f0e6",
  "#7a4f17",
  "#5b2bbf",
  "#4c1d95",
  "rgba(185, 137, 69",
].forEach((token) => assertNotIncludes(officialBlock.toLowerCase(), token.toLowerCase(), "official palette block"));

[
  "#FFF9F2",
  "#FFFDF8",
  "#F8EFE5",
  "#E7D8C7",
  "#D8C2AA",
  "#E8D8C6",
  "#EFE2D2",
  "#B99776",
  "#B68A5F",
  "#E4D2BE",
  "#C8A884",
  "#D9B58C",
  "#9A6B45",
  "#8A5A3A",
  "#7A3F2A",
].forEach((token) => assertNotIncludes(wheel, token, "chart wheel"));

["#F8FAFC", "#D9EAFD", "#BCCCDC", "#9AA6B2", "#243447"].forEach((token) => {
  assertIncludes(wheel, token, "chart wheel official palette");
});

assertIncludes(
  packageJson.scripts?.["check:official-cool-palette"] ?? "",
  "scripts/check-official-cool-palette.mjs",
  "package script",
);


const legacyWarmOrPurpleTokens = [
  "#4c1d95",
  "#7c3aed",
  "#5b2bbf",
  "#fff7ed",
  "#fffaf3",
  "rgba(185, 137, 69",
  "purple",
  "violet",
  "fuchsia",
  "amber",
  "yellow",
  "orange",
  "gold",
  "cream"
];

for (const filePath of ["app/globals.css", "components/RealChartWheel.tsx"]) {
  const source = read(filePath).toLowerCase();
  for (const token of legacyWarmOrPurpleTokens) {
    if (source.includes(token.toLowerCase())) {
      throw new Error(`Legacy warm/purple palette token remains in ${filePath}: ${token}`);
    }
  }
}

const targetedPaletteRepairTokens = [
  "#2F4052",
  "#52657A",
  "#EEF6FF",
  "#E5F0FB",
  "#AEBBCC",
  "#7F8C9B",
  "#6F7D8C",
];

for (const token of targetedPaletteRepairTokens) {
  assertIncludes(css, token, "Targeted Palette Repair v0.1.200a token");
}

assertIncludes(css, "Halleus Targeted Palette Repair v0.1.200a", "targeted palette repair marker");
assertIncludes(css, ".date-mode-button.is-active", "visible date toggle active state");
assertIncludes(css, ".time-unknown-button.is-active", "visible time unknown active state");
assertIncludes(css, ".report-product-hero", "light report hero repair");
assertIncludes(css, ".chart-form-card", "chart form contrast repair");

const noBcccdcTextColor = /(^|[{\s;])color\s*:\s*#BCCCDC\b/i;
if (noBcccdcTextColor.test(css)) {
  throw new Error("Targeted Palette Repair v0.1.200a should not use #BCCCDC as a text color.");
}

[
  "background: #BCCCDC",
  "text-[#BCCCDC]",
  "#efe7ff",
  "#f4eefb",
  "rgba(91, 43, 191",
  "rgba(124, 58, 237",
  "rgba(167, 139, 250"
].forEach((token) => assertNotIncludes(css.toLowerCase(), token.toLowerCase(), "targeted palette repair"));

assertIncludes(css, "Halleus v0.1.200a final tint cleanup", "final tint cleanup marker");

[
  "#fff9f2",
  "#fbf8ff",
  "#faf7ff",
  "#f3edff",
  "#7b6d92",
  "#5f5277",
  "#9a6b45",
  "rgba(250, 247, 255",
  "rgba(249, 245, 255",
  "rgba(248, 245, 255",
  "rgba(244, 238, 251",
  "rgba(91, 70, 137",
  "rgb(91, 70, 137",
  "rgba(21, 23, 43",
  "rgba(41, 31, 68",
  "rgba(73, 50, 98"
].forEach((token) => assertNotIncludes(css.toLowerCase(), token.toLowerCase(), "final tint cleanup"));

const noLegacyBcccdcBackgroundClassInSource = /bg-\[#BCCCDC\]/i;
const sourceFilesForBcccdcBackgroundGuard = [
  "app/page.tsx",
  "app/chart/page.tsx",
  "app/reports/page.tsx",
  "components/AppShell.tsx",
  "components/ChartForm.tsx",
  "components/ChartReportBridgePanel.tsx",
  "components/ReportDetail.tsx",
  "components/RealChartWheel.tsx",
];

for (const filePath of sourceFilesForBcccdcBackgroundGuard) {
  const source = read(filePath);
  if (noLegacyBcccdcBackgroundClassInSource.test(source)) {
    throw new Error(`Source file should not use bg-[#BCCCDC] as a surface: ${filePath}`);
  }
}

assertIncludes(css, "Halleus v0.1.200a homepage card and wheel visibility polish", "homepage card and wheel visibility polish marker");
assertIncludes(css, ".home-kpi-row small", "homepage kpi subtitle visibility");
assertIncludes(css, ".back-to-top-button", "back to top cool color repair");
assertIncludes(css, 'text[class*="fill-[#F8FAFC]"]', "chart wheel planet label visibility");

[
  "#166534",
  "#1f7a4c",
  "#dcfce7",
  "#f0fff7",
  "rgba(22, 101, 52",
  "rgba(22, 163, 74",
  "rgba(240, 253, 244"
].forEach((token) => assertNotIncludes(css.toLowerCase(), token.toLowerCase(), "homepage/card/wheel visual polish"));
console.log("Official cool palette check passed.");
