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
    throw new Error(`${label} should not include: ${token}`);
  }
}

const appShell = read("components/AppShell.tsx");
const dashboard = read("app/dashboard/page.tsx");
const wheel = read("components/RealChartWheel.tsx");
const css = read("app/globals.css");
const packageJson = JSON.parse(read("package.json"));

assertNotIncludes(appShell, "site-nav-actions", "duplicate header CTA");
assertNotIncludes(appShell, "site-nav-actions", "duplicate header CTA");
assertIncludes(appShell, "footer-inner-clean", "clean footer class");

assertIncludes(dashboard, "core-surface-dashboard", "dashboard cleanup hook");
assertIncludes(dashboard, "core-surface-dashboard-marker", "dashboard cleanup marker");

assertNotIncludes(wheel, "ZODIAC_LABELS[sign.id].enName", "chart wheel English sign labels");
assertIncludes(wheel, "max-w-[500px]", "chart wheel smaller max width");
assertIncludes(wheel, "retrograde-glyph", "retrograde visible glyph hook");

[
  "Core Surface Cleanup v0.1.198b",
  ".site-brand-mark",
  "background: transparent !important",
  ".site-nav-actions",
  ".footer-links",
  ".core-surface-dashboard",
  ".retrograde-glyph",
].forEach((token) => assertIncludes(css, token, "core surface CSS"));

assertIncludes(
  packageJson.scripts?.["check:core-surface-cleanup"] ?? "",
  "scripts/check-core-surface-cleanup.mjs",
  "package script",
);

console.log("Core surface cleanup check passed.");
