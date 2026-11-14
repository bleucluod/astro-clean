import fs from "node:fs";
import ts from "typescript";

const errors = [];
function read(path) {
  try { return fs.readFileSync(path, "utf8"); }
  catch { errors.push("missing: " + path); return ""; }
}
const paths = [
  "app/sky/preview/page.tsx",
  "lib/sky-public/sky-observatory-period.ts",
  "components/sky/SkyObservatoryPreview.tsx",
  "components/sky/SkyObservatoryPreview.module.css",
];
const sources = new Map(paths.map(path => [path, read(path)]));
for (const path of paths.filter(path => path.endsWith(".ts") || path.endsWith(".tsx"))) {
  const source = ts.createSourceFile(path, sources.get(path), ts.ScriptTarget.Latest, true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  for (const error of source.parseDiagnostics) {
    const pos = source.getLineAndCharacterOfPosition(error.start ?? 0);
    errors.push(path + ":" + (pos.line + 1) + " TS" + error.code + ": " +
      ts.flattenDiagnosticMessageText(error.messageText, " "));
  }
}
function requireText(path, words) {
  const source = sources.get(path) ?? "";
  for (const word of words) {
    if (!source.includes(word)) errors.push(path + " missing " + word);
  }
}
const page = paths[0], period = paths[1], client = paths[2], css = paths[3];
requireText(page, [
  'process.env.NODE_ENV !== "development"', "notFound()",
  "robots: { index: false, follow: false }", "deliverSkyPublicSnapshot",
  "getSkyObservatoryPeriod", "referenceTime={result.viewedAt}",
]);
requireText(period, [
  "buildSkyDailySnapshot", "unstable_cache", "u-ca-persian",
  "reference.getUTCDay() + 1", "dates.length < 29",
  "dates.length > 31", "snapshots.push",
]);
requireText(client, [
  "SkyObservatoryPreview", "period?.snapshots.find",
  "snapshot.planetaryStates.map", "snapshot.aspects.slice(0, 12)",
  "buildSkyPublicReportInterpretation",
  '<SurfaceShowcaseSlot surface="sky" slot="after-moon"/>',
  '<SurfaceShowcaseSlot surface="sky" slot="after-timeline"/>',
  "R3ApprovedInlineParagraphs", "setPlanet",
]);
requireText(css, [
  "var(--font-vazirmatn)", ".heroScene", ".timeModes",
  ".sheetBackdrop", "@media(max-width:580px)",
]);
const p = sources.get(period) ?? "";
if (/Math\.random|fakePlanet|mockSnapshot|sampleData/.test(p))
  errors.push("Period data must never be fabricated");
const c = sources.get(client) ?? "";
if (/Math\.random|mockSnapshot|samplePlanet/.test(c))
  errors.push("Client must not fabricate astronomical values");
if (c.includes("Date.now()")) errors.push("Client must use stable SSR referenceTime");
if (errors.length) {
  console.error("SKY_OBSERVATORY_PREVIEW_CHECK_FAILED");
  errors.forEach(error => console.error("- " + error));
  process.exitCode = 1;
} else {
  console.log("SKY_OBSERVATORY_PREVIEW_CHECK=PASS");
  console.log("Development-only; daily/weekly/monthly use Halleus engine snapshots; production /sky unchanged.");
}
