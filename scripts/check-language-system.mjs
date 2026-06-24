import fs from "node:fs";

const requiredFiles = [
  "types/language.ts",
  "lib/language/finglish-map.ts",
  "lib/language/finglish-to-persian.ts",
  "lib/language/persian-product-copy.ts",
  "lib/language/language-readiness.ts",
  "app/language/page.tsx",
  "docs/PERSIAN_LANGUAGE_SYSTEM.md",
  "docs/FINGLISH_COPY_WORKFLOW.md",
];

const requiredContent = [
  ["types/language.ts", "LanguageReadinessReport"],
  ["lib/language/finglish-map.ts", "FINGLISH_PHRASES"],
  ["lib/language/finglish-to-persian.ts", "convertControlledFinglishToPersian"],
  ["lib/language/persian-product-copy.ts", "PERSIAN_PRODUCT_COPY"],
  ["lib/language/language-readiness.ts", "getLanguageReadinessReport"],
  ["app/language/page.tsx", "زبان محصول Halleus"],
  ["docs/PERSIAN_LANGUAGE_SYSTEM.md", "centralized language layer"],
  ["docs/FINGLISH_COPY_WORKFLOW.md", "Finglish is a drafting format"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing language system file: ${file}`);
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

console.log(`Language system check passed for ${requiredFiles.length} files.`);
