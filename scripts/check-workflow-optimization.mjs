import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const scripts = packageJson.scripts ?? {};
const checkProject = scripts["check:project"] ?? "";
const failures = [];

const requiredScripts = {
  "check:core": [
    "pnpm run clean:temp",
    "pnpm run check:encoding",
    "pnpm run check:language-system",
    "pnpm run check:product-surface",
  ],
  "check:engine": [
    "pnpm run check:chart-engine",
    "pnpm run check:chart-engine-integration",
    "pnpm run check:real-chart-engine-decision",
    "pnpm run check:astronomy-engine-prototype",
    "pnpm run check:timezone-readiness",
    "pnpm run check:zodiac-qa-fixtures",
    "pnpm run check:house-aspect-layer",
  ],
  "check:reports": [
    "pnpm run check:report-quality",
    "pnpm run check:interpretation",
    "pnpm run check:report-output-v2",
    "pnpm run check:report-output-v2-ux",
    "pnpm run check:report-output-v2-actions",
    "pnpm run check:report-output-v2-readability",
    "pnpm run check:report-experience-v3",
  ],
  "check:readiness": [
    "pnpm run check:storage",
    "pnpm run check:account",
    "pnpm run check:account-ui",
    "pnpm run check:database",
    "pnpm run check:auth-readiness",
    "pnpm run check:billing",
  ],
  "check:fast": [
    "pnpm run check:core",
    "pnpm run check:engine",
    "pnpm run check:reports",
    "pnpm lint",
  ],
};

for (const [scriptName, tokens] of Object.entries(requiredScripts)) {
  const scriptValue = scripts[scriptName];

  if (typeof scriptValue !== "string" || scriptValue.trim().length === 0) {
    failures.push(`Missing package script: ${scriptName}`);
    continue;
  }

  for (const token of tokens) {
    if (!scriptValue.includes(token)) {
      failures.push(`Script ${scriptName} is missing token: ${token}`);
    }
  }
}

const projectTokens = [
  "pnpm run clean:temp",
  "pnpm run check:encoding",
  "pnpm run check:language-system",
  "pnpm run check:storage",
  "pnpm run check:account",
  "pnpm run check:account-ui",
  "pnpm run check:database",
  "pnpm run check:auth-readiness",
  "pnpm run check:billing",
  "pnpm run check:product-surface",
  "pnpm run check:chart-engine",
  "pnpm run check:chart-engine-integration",
  "pnpm run check:real-chart-engine-decision",
  "pnpm run check:astronomy-engine-prototype",
  "pnpm run check:timezone-readiness",
  "pnpm run check:zodiac-qa-fixtures",
  "pnpm run check:house-aspect-layer",
  "pnpm run check:report-quality",
  "pnpm run check:interpretation",
  "pnpm run check:report-output-v2",
  "pnpm run check:report-output-v2-ux",
  "pnpm run check:report-output-v2-actions",
  "pnpm run check:report-output-v2-readability",
  "pnpm run check:report-experience-v3",
  "pnpm lint",
  "pnpm build",
];

for (const token of projectTokens) {
  if (!checkProject.includes(token)) {
    failures.push(`check:project is missing token: ${token}`);
  }
}

if (scripts["check:fast"]?.includes("pnpm build")) {
  failures.push("check:fast should not run pnpm build; reserve build for check:project.");
}

if (scripts["check:fast"]?.includes("check:database")) {
  failures.push("check:fast should not run readiness checks directly; use check:project before commit/tag.");
}

if (
  scripts["check:workflow"] !==
  "node scripts/check-workflow-optimization.mjs"
) {
  failures.push("Missing package script: check:workflow");
}

if (!checkProject.includes("pnpm run check:workflow")) {
  failures.push("check:project does not run check:workflow");
}

if (failures.length > 0) {
  console.error("Check workflow optimization failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Check workflow optimization passed.");
