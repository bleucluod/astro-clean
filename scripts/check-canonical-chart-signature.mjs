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

const { buildRealEngineChartSignature } = require(
  "../lib/astrology/real-engine-chart-signature.ts",
);

const placements = [
  ["sun", "aries"],
  ["moon", "leo"],
  ["mercury", "sagittarius"],
  ["venus", "aries"],
  ["mars", "leo"],
  ["jupiter", "taurus"],
  ["saturn", "virgo"],
  ["uranus", "gemini"],
  ["neptune", "libra"],
  ["pluto", "aquarius"],
  ["north-node", "cancer"],
].map(([id, signId], index) => ({
  id,
  label: id,
  signId,
  longitude: index * 20,
  degreeInSign: 0,
  method: "fixture",
}));

const signature = buildRealEngineChartSignature(placements);

assert.equal(signature.version, "chart-signature-v1");
assert.equal(signature.method, "equal-weight-major-planets");
assert.deepEqual(signature.elementCounts, { fire: 5, earth: 2, air: 3, water: 0 });
assert.deepEqual(signature.modalityCounts, { cardinal: 3, fixed: 4, mutable: 3 });
assert.deepEqual(signature.expressionCounts, { active: 8, receptive: 2 });
assert.equal(signature.dominantElement, "fire");
assert.equal(signature.dominantExpression, "active");
assert.deepEqual(signature.lowElements, ["water"]);
assert.deepEqual(signature.zeroElements, ["water"]);
assert.equal(signature.evidence.length, 10);
assert.deepEqual(signature.excludedPlacementIds, ["north-node"]);

const service = fs.readFileSync(
  "lib/report-generation/report-generation-service.ts",
  "utf8",
);
const writer = fs.readFileSync(
  "lib/astrology/real-engine-report-writer.ts",
  "utf8",
);
const types = fs.readFileSync("types/astro.ts", "utf8");

assert.match(service, /chartSignature: buildRealEngineChartSignature\(placements\)/);
assert.match(writer, /chartSignature: realEngine\.chartSignature/);
assert.match(writer, /balance\.expressionCounts/);
assert.match(types, /chartSignature\?: RealEngineChartSignature/);

console.log("canonical chart signature check passed");
