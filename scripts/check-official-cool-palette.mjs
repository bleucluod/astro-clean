
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
console.log("Official cool palette check passed.");
