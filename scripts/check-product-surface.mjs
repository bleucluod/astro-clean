import fs from "node:fs";

const requiredFiles = [
  "lib/product/product-surface.ts",
  "app/product/page.tsx",
  "app/privacy/page.tsx",
  "app/wiki/page.tsx",
  "docs/PRODUCT_SURFACE_CLEANUP.md",
];

const requiredContent = [
  ["lib/product/product-surface.ts", "PRODUCT_SURFACE_LINKS"],
  ["app/product/page.tsx", "تفسیر چارت تولد فارسی"],
  ["app/privacy/page.tsx", "حریم خصوصی هالیوس"],
  ["app/wiki/page.tsx", "Halleus Wiki"],
  ["docs/PRODUCT_SURFACE_CLEANUP.md", "public product surface"],
];

// retired-route-surface-guard-20260911
const retiredProductSurfaceRoutes = [
  "/roadmap",
  "/language",
  "/quality",
  "/quality/mvp-checkpoint",
  "/interpretation",
  "/engine",
  "/engine/decision",
  "/engine/real",
  "/engine/real-chart",
  "/engine/report-flow",
  "/engine/report-preview",
  "/asteroid-lab",
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

if (fs.existsSync("lib/product/product-surface.ts")) {
  const productSurfaceSource = fs.readFileSync("lib/product/product-surface.ts", "utf8");
  for (const route of retiredProductSurfaceRoutes) {
    if (productSurfaceSource.includes(`href: "${route}"`)) {
      console.error(`Product surface still exposes retired route: ${route}`);
      failed = true;
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Product surface check passed for ${requiredFiles.length} files.`);
