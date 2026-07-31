import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);
const ts = require("typescript");
const originalResolveFilename = Module._resolveFilename;
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

function resolveWithTypeScriptExtensions(candidate) {
  const candidates = [
    candidate,
    `${candidate}.ts`,
    `${candidate}.tsx`,
    `${candidate}.js`,
    path.join(candidate, "index.ts"),
  ];
  return candidates.find((option) => fs.existsSync(option)) ?? candidate;
}

Module._resolveFilename = function resolveHalleusAlias(
  request,
  parent,
  isMain,
  options,
) {
  if (typeof request === "string" && request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      resolveWithTypeScriptExtensions(path.join(root, request.slice(2))),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const transpiled = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        target: ts.ScriptTarget.ES2021,
        strict: true,
      },
    });
    module._compile(transpiled.outputText, filename);
  };
}

const {
  LILITH_REFERENCE_FIXTURES,
  LILITH_REFERENCE_FIXTURE_RUNTIME_POLICY,
  LILITH_REFERENCE_FIXTURE_SOURCE,
  LILITH_REFERENCE_MAX_ANGULAR_DELTA_DEGREES,
} = require("../src/lib/chart/lilith-reference-fixtures.ts");
const {
  validateLilithOsculatingProbeHarness,
} = require("../src/lib/chart/lilith-validation-harness.ts");
const {
  assertLilithInternalAdapterResultIsSafe,
  calculateLocalOsculatingBlackMoonLilith,
} = require("../src/lib/chart/lilith-internal-adapter.ts");
const {
  buildLilithReportInterpretation,
  selectLilithAspects,
} = require("../lib/astrology/lilith-report-interpretation.ts");

const summary = validateLilithOsculatingProbeHarness();
assert(summary.status === "independent-reference-fixtures-passed", "independent fixture status did not pass");
assert(summary.approvedForProductionOutput === true, "validated natal output is not approved");
assert(summary.referenceSource === LILITH_REFERENCE_FIXTURE_SOURCE, "reference source drifted");
assert(
  summary.referenceRuntimePolicy === "reference-values-only-no-swiss-runtime-dependency",
  "Swiss reference escaped the fixture-only boundary",
);
assert(summary.fixtureCount === LILITH_REFERENCE_FIXTURES.length, "reference fixture count drifted");
assert(summary.fixtureCount >= 16, "reference fixture coverage is too small");
assert(
  summary.maxReferenceAngularDeltaDegrees <= LILITH_REFERENCE_MAX_ANGULAR_DELTA_DEGREES,
  `reference delta exceeded tolerance: ${summary.maxReferenceAngularDeltaDegrees}`,
);

const adapter = calculateLocalOsculatingBlackMoonLilith(
  new Date("2024-04-08T18:18:00.000Z"),
);
assertLilithInternalAdapterResultIsSafe(adapter);
assert(adapter.approvedForReportOutput === true, "adapter did not approve natal report output");
assert(adapter.validationStatus === "independent-reference-fixtures-passed", "adapter lost validation status");
assert(adapter.validationReference === LILITH_REFERENCE_FIXTURE_SOURCE, "adapter lost reference source");

const placements = [
  {
    id: "sun",
    label: "Sun",
    longitude: 191,
    signId: "libra",
    degreeInSign: 10,
    house: 6,
    method: "fixture",
  },
  {
    id: "moon",
    label: "Moon",
    longitude: 282,
    signId: "capricorn",
    degreeInSign: 10,
    house: 9,
    method: "fixture",
  },
  {
    id: "venus",
    label: "Venus",
    longitude: 100,
    signId: "cancer",
    degreeInSign: 10,
    house: 3,
    method: "fixture",
  },
];
const approvedLilith = {
  status: "calculated",
  id: "black-moon-lilith",
  label: "Local True/Osculating Black Moon Lilith",
  longitude: 100,
  signId: "cancer",
  degreeInSign: 10,
  house: 7,
  method: "local-osculating-black-moon-lilith-from-validated-probe",
  modelId: "true-osculating-black-moon-lilith",
  lilithType: "local-true-osculating-black-moon-lilith",
  source: "astronomy-engine-geomoonstate-local-state-vector",
  reliability: "calculated",
  approvedForReportOutput: true,
  validationStatus: "independent-reference-fixtures-passed",
  validationReference: LILITH_REFERENCE_FIXTURE_SOURCE,
  validationToleranceDegrees: LILITH_REFERENCE_MAX_ANGULAR_DELTA_DEGREES,
  limitation: null,
};
const interpretation = buildLilithReportInterpretation({
  lilith: approvedLilith,
  placements,
});
assert(Boolean(interpretation), "approved Lilith did not produce interpretation");
assert(interpretation?.signText.includes("سرطان"), "sign-specific Lilith text is missing");
assert(interpretation?.houseText?.includes("خانه هفتم"), "house-specific Lilith text is missing");
assert((interpretation?.aspects.length ?? 0) <= 2, "Lilith aspect output is not bounded");
assert((interpretation?.aspects.length ?? 0) >= 1, "fixture did not produce a Lilith aspect");
assert(
  selectLilithAspects(100, placements).map((item) => item.planetId).includes("venus"),
  "tight personal-planet Lilith aspect was not selected",
);

const blocked = buildLilithReportInterpretation({
  lilith: { ...approvedLilith, approvedForReportOutput: false },
  placements,
});
assert(blocked === null, "legacy or unapproved Lilith data entered narrative output");

const allNarrative = [
  interpretation?.signText,
  interpretation?.houseText,
  interpretation?.helpfulText,
  interpretation?.growthText,
  interpretation?.practiceText,
  ...(interpretation?.aspects.map((item) => item.text) ?? []),
].filter(Boolean).join("\n");
for (const forbidden of ["نفرین", "سرنوشت قطعی", "حتماً خیانت", "ذات تاریک", "خطرناک هستی"]) {
  assert(!allNarrative.includes(forbidden), `unsafe deterministic Lilith language found: ${forbidden}`);
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert(
  packageJson.scripts?.["check:validated-lilith-report-interpretation"] ===
    "node scripts/check-validated-lilith-report-interpretation.mjs",
  "package script for validated Lilith guard is missing",
);
for (const dependency of ["swisseph", "pyswisseph", "swiss-ephemeris", "sweph"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(packageJson.dependencies ?? {}, dependency) &&
      !Object.prototype.hasOwnProperty.call(packageJson.devDependencies ?? {}, dependency),
    `forbidden Swiss runtime dependency found: ${dependency}`,
  );
}
const impactRegistry = JSON.parse(
  fs.readFileSync("config/halleus-check-impact.json", "utf8"),
);
const lilithImpactArea = impactRegistry.areas?.find(
  (area) => area.id === "validated-lilith-report-interpretation",
);
assert(Boolean(lilithImpactArea), "validated Lilith impact area is missing");
assert(
  lilithImpactArea?.guards?.includes("check:validated-lilith-report-interpretation"),
  "validated Lilith impact area does not run its focused guard",
);
for (const requiredPath of [
  "lib/astrology/lilith-report-interpretation.ts",
  "src/lib/chart/lilith-reference-fixtures.ts",
  "src/lib/chart/real-chart-engine.ts",
  "components/ReportSpecialPointsNarrativeSection.tsx",
]) {
  assert(
    lilithImpactArea?.patterns?.includes(requiredPath),
    `validated Lilith impact area is missing path: ${requiredPath}`,
  );
}
assert(
  lilithImpactArea?.lint === true && lilithImpactArea?.build === true,
  "validated Lilith runtime changes must require lint and production build",
);

const component = fs.readFileSync(
  "components/ReportSpecialPointsNarrativeSection.tsx",
  "utf8",
);
for (const marker of [
  "buildLilithReportInterpretation",
  "لیلیت: مرز، حساسیت و صداقت با خواسته‌ها",
  "پیوندهای پررنگ لیلیت با چارت",
  "گزارش‌های ذخیره‌شدهٔ قدیمی",
  "این مجوز فقط برای گزارش تولد است",
]) {
  assert(component.includes(marker), `live Lilith component marker missing: ${marker}`);
}

const reportType = fs.readFileSync("types/astro.ts", "utf8");
for (const marker of [
  'validationStatus: "independent-reference-fixtures-passed"',
  'validationReference: "swiss-ephemeris-2.10.03-offline-osculating-apogee"',
  "approvedForReportOutput: boolean",
]) {
  assert(reportType.includes(marker), `stored report Lilith contract marker missing: ${marker}`);
}

const sourceFiles = [
  "src/lib/chart/lilith-reference-fixtures.ts",
  "src/lib/chart/lilith-source-feasibility-probe.ts",
  "src/lib/chart/lilith-self-built-osculating-decision.ts",
  "src/lib/chart/lilith-osculating-probe.ts",
  "src/lib/chart/lilith-validation-harness.ts",
  "src/lib/chart/lilith-internal-adapter.ts",
  "src/lib/chart/real-chart-engine.ts",
  "lib/astrology/lilith-report-interpretation.ts",
  "components/ReportSpecialPointsNarrativeSection.tsx",
];
const sourceText = sourceFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const forbidden of ["fetch(", "https://api", "SE_OSCU_APOG", "SearchLunarApsis(", "NextLunarApsis("]) {
  assert(!sourceText.includes(forbidden), `runtime Lilith source includes forbidden shortcut: ${forbidden}`);
}
assert(
  LILITH_REFERENCE_FIXTURE_RUNTIME_POLICY ===
    "reference-values-only-no-swiss-runtime-dependency",
  "reference fixture runtime policy changed",
);

if (failures.length > 0) {
  console.error("Validated Lilith report interpretation check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Validated Lilith report interpretation check passed.");
console.log(`- ${summary.fixtureCount} independent offline fixtures passed`);
console.log(`- max reference delta ${summary.maxReferenceAngularDeltaDegrees.toFixed(6)} degrees`);
console.log("- local runtime keeps Swiss Ephemeris out of dependencies and APIs");
console.log("- new reports receive sign, house and at most two conservative Lilith aspects");
console.log("- legacy unapproved reports remain technical-only");
