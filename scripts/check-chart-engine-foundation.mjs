import fs from "node:fs";

const requiredFiles = [
  "types/chart-engine.ts",
  "lib/chart-engine/chart-engine-driver.ts",
  "lib/chart-engine/mock-preview-engine.ts",
  "lib/chart-engine/chart-engine-factory.ts",
  "lib/chart-engine/chart-engine-readiness.ts",
  "lib/chart-engine/chart-engine-fixtures.ts",
  "app/engine/page.tsx",
  "docs/CHART_ENGINE_FOUNDATION.md",
  "docs/CHART_ENGINE_STRATEGY.md",
];

const requiredContent = [
  ["types/chart-engine.ts", "export type ChartEngineInput"],
  ["types/chart-engine.ts", "export type ChartEngineResult"],
  ["lib/chart-engine/chart-engine-driver.ts", "ChartEngineDriver"],
  ["lib/chart-engine/mock-preview-engine.ts", "createMockPreviewChartEngine"],
  ["lib/chart-engine/chart-engine-readiness.ts", "getChartEngineReadinessReport"],
  ["app/engine/page.tsx", "Halleus Engine"],
  ["docs/CHART_ENGINE_FOUNDATION.md", "real chart engine path"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing chart engine file: ${file}`);
    failed = true;
  }
}

for (const [file, marker] of requiredContent) {
  if (!fs.existsSync(file)) {
    continue;
  }

  const text = fs.readFileSync(file, "utf8");

  if (!text.includes(marker)) {
    console.error(`Missing marker in ${file}: ${marker}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Chart engine foundation check passed for ${requiredFiles.length} files.`);
