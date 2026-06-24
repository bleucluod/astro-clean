import fs from "node:fs";

const requiredFiles = [
  "lib/chart-engine/zodiac.ts",
  "types/astronomy-engine-prototype.ts",
  "lib/chart-engine/astronomy-engine-loader.ts",
  "lib/chart-engine/astronomy-engine-prototype.ts",
  "lib/chart-engine/chart-engine-factory.ts",
  "app/engine/real/page.tsx",
  "lib/product/product-surface.ts",
  "docs/ASTRONOMY_ENGINE_PROTOTYPE.md",
];

const requiredContent = [
  ["lib/chart-engine/zodiac.ts", "longitudeToZodiac"],
  ["types/astronomy-engine-prototype.ts", "AstronomyEnginePrototypeStatus"],
  ["lib/chart-engine/astronomy-engine-loader.ts", "loadAstronomyEnginePackage"],
  ["lib/chart-engine/astronomy-engine-prototype.ts", "createAstronomyEnginePrototypeDriver"],
  ["lib/chart-engine/chart-engine-factory.ts", "createAstronomyEnginePrototypeDriver"],
  ["app/engine/real/page.tsx", "نمونه اولیه موتور واقعی چارت"],
  ["lib/product/product-surface.ts", "/engine/real"],
  ["docs/ASTRONOMY_ENGINE_PROTOTYPE.md", "pnpm add astronomy-engine@2.1.19"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing astronomy engine prototype file: ${file}`);
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

console.log(`Astronomy engine prototype check passed for ${requiredFiles.length} files.`);
