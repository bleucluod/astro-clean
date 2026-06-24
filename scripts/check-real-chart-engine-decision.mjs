import fs from "node:fs";

const requiredFiles = [
  "types/real-chart-engine.ts",
  "lib/chart-engine/real-chart-engine-decision.ts",
  "app/engine/decision/page.tsx",
  "lib/product/product-surface.ts",
  "docs/REAL_CHART_ENGINE_DECISION.md",
  "docs/ENGINE_PROVIDER_COMPARISON.md",
];

const requiredContent = [
  ["types/real-chart-engine.ts", "RealChartEngineDecision"],
  ["lib/chart-engine/real-chart-engine-decision.ts", "astronomy-engine-mvp"],
  ["app/engine/decision/page.tsx", "تصمیم مسیر موتور واقعی چارت"],
  ["lib/product/product-surface.ts", "/engine/decision"],
  ["docs/REAL_CHART_ENGINE_DECISION.md", "Astronomy Engine + Halleus astrology layer"],
  ["docs/ENGINE_PROVIDER_COMPARISON.md", "Option A"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing real chart engine decision file: ${file}`);
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

console.log(`Real chart engine decision check passed for ${requiredFiles.length} files.`);
