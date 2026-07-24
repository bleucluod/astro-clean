import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(transpiled.outputText, filename);
};

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(process.cwd(), request.slice(2)),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const { buildPersonalOpening } = require(
  "../lib/astrology/real-engine-report-writer.ts",
);

function signature({
  dominantElement,
  dominantModality,
  dominantExpression,
}) {
  return {
    version: "chart-signature-v1",
    method: "equal-weight-major-planets",
    elementCounts: { fire: 5, earth: 2, air: 2, water: 1 },
    modalityCounts: { cardinal: 5, fixed: 3, mutable: 2 },
    expressionCounts: { active: 7, receptive: 3 },
    dominantElement,
    dominantModality,
    dominantExpression,
    lowElements: ["water"],
    lowModalities: ["mutable"],
    lowExpressions: ["receptive"],
    zeroElements: [],
    zeroModalities: [],
    evidence: [],
    excludedPlacementIds: [],
  };
}

const fireOpening = buildPersonalOpening({
  name: "هاله",
  risingSign: "aries",
  chartRulerId: "mars",
  chartRulerPlacement: {
    id: "mars",
    label: "مریخ",
    signId: "leo",
    longitude: 132,
    degreeInSign: 12,
    house: 5,
    method: "fixture",
  },
  activeHouseNumber: 5,
  chartSignature: signature({
    dominantElement: "fire",
    dominantModality: "cardinal",
    dominantExpression: "active",
  }),
});

const waterOpening = buildPersonalOpening({
  name: "هاله",
  risingSign: "cancer",
  chartRulerId: "moon",
  chartRulerPlacement: {
    id: "moon",
    label: "ماه",
    signId: "pisces",
    longitude: 349,
    degreeInSign: 19,
    house: 9,
    method: "fixture",
  },
  activeHouseNumber: 4,
  chartSignature: signature({
    dominantElement: "water",
    dominantModality: "mutable",
    dominantExpression: "receptive",
  }),
});

assert.match(fireOpening, /^هاله، برای ورود به این گزارش/);
assert.match(fireOpening, /حرکت، شوق و آغاز کردن/);
assert.match(fireOpening, /شروع کردن ممکن است طبیعی‌تر/);
assert.match(fireOpening, /خلاقیت، عشق و بیان شخصی/);
assert.notEqual(fireOpening, waterOpening, "Different chart patterns produced the same opening.");
assert.match(waterOpening, /دریافت عاطفی، همدلی و حافظه/);
assert.match(waterOpening, /سازگار شدن و دیدن راه‌های تازه/);
assert.match(waterOpening, /خانه، ریشه و امنیت درونی/);

const renamedOpening = buildPersonalOpening({
  name: "آراد",
  risingSign: "aries",
  chartRulerId: "mars",
  activeHouseNumber: 5,
  chartSignature: signature({
    dominantElement: "fire",
    dominantModality: "cardinal",
    dominantExpression: "active",
  }),
});
assert.notEqual(fireOpening, renamedOpening, "Changing the reader name did not change the opening.");
assert.match(renamedOpening, /^آراد، برای ورود به این گزارش/);

const boundedFallback = buildPersonalOpening({
  name: "",
  risingSign: "virgo",
  chartRulerId: "mercury",
});
assert.match(boundedFallback, /^برای ورود به این گزارش/);
assert.match(boundedFallback, /شیوه ورود/);
assert.doesNotMatch(boundedFallback, /نامشخص|ذخیره نشده|فرض/);

for (const opening of [fireOpening, waterOpening, renamedOpening, boundedFallback]) {
  assert.ok(opening.length >= 180 && opening.length <= 620, "Opening is outside the short-reading boundary.");
  assert.doesNotMatch(
    opening,
    /این خوانش هالیوس|میدان‌های پررنگ‌تر این چارت|سه ستون اصلی چارت/,
    "Personal opening repeats the existing summary frame.",
  );
  assert.doesNotMatch(
    opening,
    /تو همیشه|تو هرگز|سرنوشت تو|محکوم هستی|چارت ثابت می‌کند|این یعنی حتماً/,
    "Personal opening contains deterministic language.",
  );
  assert.doesNotMatch(
    opening,
    /ساعت تولد|تاریخ تولد|شهر تولد|ترانزیت|آینده/,
    "Personal opening introduced data outside its verified inputs.",
  );
}

const writerSource = fs.readFileSync(
  "lib/astrology/real-engine-report-writer.ts",
  "utf8",
);
for (const marker of [
  "const personalOpening = sanitizeUserFacingReportText(buildPersonalOpening({",
  "personalOpening,",
  "opening: input.personalOpening",
  "body: joinSectionBody(input.summary, input.firstSynthesisText)",
  'id: "real-engine-first-synthesis"',
]) {
  assert.ok(writerSource.includes(marker), `Live writer integration is missing: ${marker}`);
}

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
assert.equal(
  packageJson.scripts?.["check:personal-opening"],
  "node scripts/check-personal-opening.mjs",
  "Focused package script is not registered.",
);

const registry = JSON.parse(
  fs.readFileSync("config/halleus-check-impact.json", "utf8"),
);
const area = registry.areas.find((candidate) => candidate.id === "personal-opening");
assert.deepEqual(area?.patterns, [
  "lib/astrology/real-engine-report-writer.ts",
  "scripts/check-personal-opening.mjs",
]);
assert.deepEqual(area?.guards, ["check:personal-opening"]);
assert.equal(area?.lint, true);
assert.equal(area?.build, true);

console.log("Personal opening guard passed.");
