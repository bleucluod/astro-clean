import fs from "node:fs";

const requiredFiles = [
  "types/account.ts",
  "lib/config/halleus.ts",
  "lib/account/entitlements.ts",
  "lib/account/preview-session.ts",
  "lib/account/account-storage-contract.ts",
  "lib/account/preview-account-repository.ts",
  "lib/account/account-repository.ts",
  "docs/ACCOUNT_AND_DB_FOUNDATION.md",
  "docs/ENVIRONMENT_CONFIG.md",
];

const requiredContent = [
  ["types/account.ts", "export type UserProfile"],
  ["types/account.ts", "export type PlanEntitlement"],
  ["lib/config/halleus.ts", "brandName: \"Halleus\""],
  ["lib/account/entitlements.ts", "PLAN_ENTITLEMENTS"],
  ["lib/account/preview-session.ts", "getPreviewSession"],
  ["lib/account/account-repository.ts", "getAccountRepository"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing account foundation file: ${file}`);
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

console.log(`Account foundation check passed for ${requiredFiles.length} files.`);
