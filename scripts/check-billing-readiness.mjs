import fs from "node:fs";

const requiredFiles = [
  "types/billing.ts",
  "lib/billing/billing-plans.ts",
  "lib/billing/feature-gates.ts",
  "lib/billing/payment-driver.ts",
  "lib/billing/preview-payment-driver.ts",
  "lib/billing/billing-readiness.ts",
  "app/pricing/page.tsx",
  "docs/BILLING_AND_PRICING_READINESS.md",
  "docs/FEATURE_GATES.md",
];

const requiredContent = [
  ["types/billing.ts", "export type BillingPlan"],
  ["lib/billing/billing-plans.ts", "BILLING_PLANS"],
  ["lib/billing/feature-gates.ts", "canUseFeature"],
  ["lib/billing/payment-driver.ts", "PaymentDriver"],
  ["lib/billing/billing-readiness.ts", "getBillingReadinessReport"],
  ["app/pricing/page.tsx", "Halleus Pricing"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing billing readiness file: ${file}`);
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

console.log(`Billing readiness check passed for ${requiredFiles.length} files.`);
