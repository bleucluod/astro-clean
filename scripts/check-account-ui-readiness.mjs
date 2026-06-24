import fs from "node:fs";

const requiredFiles = [
  "app/dashboard/page.tsx",
  "app/profile/page.tsx",
  "docs/PROFILE_DASHBOARD_ACCOUNT_READINESS.md",
];

const requiredContent = [
  ["app/dashboard/page.tsx", "listReportSummaries"],
  ["app/dashboard/page.tsx", "Halleus Dashboard"],
  ["app/profile/page.tsx", "getAccountRepository"],
  ["app/profile/page.tsx", "getPlanEntitlement"],
  ["docs/PROFILE_DASHBOARD_ACCOUNT_READINESS.md", "account-ready product surfaces"],
];

let failed = false;

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`Missing account UI file: ${file}`);
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

console.log(`Account UI readiness check passed for ${requiredFiles.length} files.`);
