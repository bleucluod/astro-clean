import fs from "node:fs";

const requiredFiles = [
  "lib/product/product-surface.ts",
  "app/product/page.tsx",
  "app/privacy/page.tsx",
  "app/roadmap/page.tsx",
  "app/wiki/page.tsx",
  "docs/PRODUCT_SURFACE_CLEANUP.md",
];

const requiredContent = [
  ["lib/product/product-surface.ts", "PRODUCT_SURFACE_LINKS"],
  ["app/product/page.tsx", "Halleus Product Map"],
  ["app/privacy/page.tsx", "Local Preview Privacy"],
  ["app/roadmap/page.tsx", "Halleus Roadmap"],
  ["app/wiki/page.tsx", "Halleus Wiki"],
  ["docs/PRODUCT_SURFACE_CLEANUP.md", "public product surface"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing product surface file: ${file}`);
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

console.log(`Product surface check passed for ${requiredFiles.length} files.`);
