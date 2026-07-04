import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const originalResolveFilename = Module._resolveFilename;

function resolveWithTypeScriptExtensions(candidate) {
  const candidates = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, "index.ts"),
    path.join(candidate, "index.tsx"),
    path.join(candidate, "index.js"),
  ];

  for (const option of candidates) {
    try {
      readFileSync(option);
      return option;
    } catch {}
  }

  return candidate;
}

Module._resolveFilename = function resolveHalleusAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      resolveWithTypeScriptExtensions(path.join(repoRoot, request.slice(2))),
      parent,
      isMain,
      options,
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const ts = require("typescript");

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      target: ts.ScriptTarget.ES2020,
      resolveJsonModule: true,
      skipLibCheck: true,
      strict: true,
    },
  });

  module._compile(transpiled.outputText, filename);
};

const engineSource = readFileSync("src/lib/chart/real-chart-engine.ts", "utf8");
const serviceSource = readFileSync("lib/report-generation/report-generation-service.ts", "utf8");
const reportCardSource = readFileSync("components/ReportCard.tsx", "utf8");
const writerSource = readFileSync("lib/astrology/real-engine-report-writer.ts", "utf8");
const sampleQaSource = readFileSync("scripts/check-report-sample-qa.mjs", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const {
  buildRealChartWorkbenchResult,
  zonedDateTimeToUtc,
} = require("../src/lib/chart/real-chart-engine.ts");

const failures = [];

for (const marker of [
  'REAL_CHART_WORKBENCH_VERSION = "0.1.166"',
  "Natal accuracy depends on exact civil birth time",
  "midnight-boundary behavior",
]) {
  if (!engineSource.includes(marker)) {
    failures.push(`real-chart-engine.ts missing natal accuracy marker: ${marker}`);
  }
}

for (const marker of [
  'REPORT_GENERATION_SERVICE_VERSION = "0.1.166"',
  "Natal accuracy depends on exact civil birth time",
  "uncertain birth time should be labeled",
  "Mean Lunar Node is calculated",
  "True/Osculating Node remains deferred",
  "Mean/True Lilith decision",
]) {
  if (!serviceSource.includes(marker)) {
    failures.push(`report-generation-service.ts missing natal accuracy marker: ${marker}`);
  }
}

for (const marker of [
  "report-accuracy-section",
  "دقت تولد و مرزهای محاسبه",
  "buildAccuracySummary",
  "nodesLabel",
  "lilithLabel",
]) {
  if (!reportCardSource.includes(marker)) {
    failures.push(`ReportCard.tsx missing natal accuracy marker: ${marker}`);
  }
}

for (const marker of [
  "buildNatalAccuracyText",
  "real-engine-natal-accuracy",
  "دقت تولد و مرزهای محاسبه",
  "ساعت تولد، timezone و مختصات شهر",
]) {
  if (!writerSource.includes(marker)) {
    failures.push(`real-engine-report-writer.ts missing natal accuracy marker: ${marker}`);
  }
}

for (const marker of [
  "real-engine-natal-accuracy",
  "دقت تولد",
  "ساعت تولد",
]) {
  if (!sampleQaSource.includes(marker)) {
    failures.push(`check-report-sample-qa.mjs missing natal accuracy marker: ${marker}`);
  }
}

if (packageJson.scripts?.["check:natal-accuracy-hardening"] !== "node scripts/check-natal-accuracy-hardening.mjs") {
  failures.push("Missing package script: check:natal-accuracy-hardening");
}

for (const scriptName of ["check:project", "check:engine"]) {
  const value = packageJson.scripts?.[scriptName] ?? "";
  if (!value.includes("pnpm run check:natal-accuracy-hardening")) {
    failures.push(`${scriptName} does not run check:natal-accuracy-hardening`);
  }
}

function assertZonedRoundTrip({ birthDate, birthTime, timezone }) {
  const utcDate = zonedDateTimeToUtc(birthDate, birthTime, timezone);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(utcDate)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  const rendered = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
  const expected = `${birthDate} ${birthTime}`;

  if (rendered !== expected) {
    failures.push(`Timezone round-trip failed for ${timezone}: expected ${expected}, got ${rendered}`);
  }
}

for (const fixture of [
  { birthDate: "1992-08-12", birthTime: "00:05", timezone: "Asia/Tehran" },
  { birthDate: "1998-02-03", birthTime: "23:55", timezone: "Asia/Tehran" },
  { birthDate: "1994-02-20", birthTime: "22:10", timezone: "Asia/Baku" },
]) {
  assertZonedRoundTrip(fixture);
}

for (const fixture of [
  {
    name: "Tehran midnight fixture",
    birthDate: "1992-08-12",
    birthTime: "00:05",
    timezone: "Asia/Tehran",
    placeName: "Tehran",
    latitude: 35.6892,
    longitude: 51.389,
  },
  {
    name: "Baku late-night fixture",
    birthDate: "1994-02-20",
    birthTime: "23:55",
    timezone: "Asia/Baku",
    placeName: "Baku",
    latitude: 40.4093,
    longitude: 49.8671,
  },
]) {
  const result = buildRealChartWorkbenchResult(fixture);
  if (!Number.isFinite(result.ascendantLongitude) || !Number.isFinite(result.midheavenLongitude)) {
    failures.push(`${fixture.name}: missing finite ASC/MC`);
  }
  if (!Array.isArray(result.houses) || result.houses.length !== 12) {
    failures.push(`${fixture.name}: expected 12 houses, got ${result.houses?.length ?? "none"}`);
  }
  if (!result.angles?.asc || !result.angles?.dsc || !result.angles?.mc || !result.angles?.ic) {
    failures.push(`${fixture.name}: incomplete angles`);
  }
  if (!Array.isArray(result.retrogradePlanetIds)) {
    failures.push(`${fixture.name}: missing retrogradePlanetIds array`);
  }
  const notes = result.calculationNotes.join(" ");
  if (!notes.includes("Mean lunar nodes are calculated")) {
    failures.push(`${fixture.name}: missing Mean lunar nodes calculation note`);
  }
  if (!result.lunarNodes || result.lunarNodes.status !== "calculated") {
    failures.push(`${fixture.name}: missing calculated Mean Lunar Nodes`);
  }
}

if (failures.length > 0) {
  console.error("Natal accuracy hardening check failed:");
  for (const failure of failures) {
    console.error("- " + failure);
  }
  process.exit(1);
}

console.log("Natal accuracy hardening check passed.");
