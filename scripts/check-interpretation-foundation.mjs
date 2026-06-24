import fs from "node:fs";

const requiredFiles = [
  "types/interpretation.ts",
  "lib/interpretation/interpretation-modules.ts",
  "lib/interpretation/interpretation-driver.ts",
  "lib/interpretation/mock-interpretation-driver.ts",
  "lib/interpretation/interpretation-factory.ts",
  "lib/interpretation/sample-interpretation.ts",
  "app/interpretation/page.tsx",
  "docs/INTERPRETATION_MODULES_FOUNDATION.md",
  "docs/REPORT_COMPOSITION_PIPELINE.md",
];

const requiredContent = [
  ["types/interpretation.ts", "export type InterpretationResult"],
  ["lib/interpretation/interpretation-modules.ts", "INTERPRETATION_MODULE_BLUEPRINTS"],
  ["lib/interpretation/mock-interpretation-driver.ts", "createMockInterpretationDriver"],
  ["lib/interpretation/interpretation-factory.ts", "getInterpretationDriver"],
  ["lib/interpretation/sample-interpretation.ts", "getSampleInterpretationPreview"],
  ["app/interpretation/page.tsx", "زیرساخت تفسیر گزارش"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing interpretation file: ${file}`);
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

console.log(`Interpretation foundation check passed for ${requiredFiles.length} files.`);
