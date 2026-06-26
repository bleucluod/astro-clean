import { readFileSync } from "node:fs";

const appShell = readFileSync("components/AppShell.tsx", "utf8");
const globals = readFileSync("app/globals.css", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const failures = [];

const forbiddenShellMarkers = [
  "مسیر سریع فروش",
  "گزارش نمونه",
  "توضیح محصول",
  "پلن‌ها",
  "سفارش دستی",
  "گزارش‌ها",
  "حریم داده",
  "ساخت گزارش",
  "NavLinks",
  "getSalesNavigationLinks",
  "shell-sales-nav",
  "footer-sales-links",
  "footer-grid",
];

for (const marker of forbiddenShellMarkers) {
  if (appShell.includes(marker)) {
    failures.push(`AppShell still contains obsolete marker: ${marker}`);
  }
}

for (const marker of [".shell-sales-nav", ".footer-sales-links", ".footer-grid"]) {
  if (globals.includes(marker)) {
    failures.push(`globals.css still contains obsolete chrome selector: ${marker}`);
  }
}

for (const marker of [
  "site-header",
  "site-nav",
  "site-brand",
  "site-nav-cta",
  "/chart",
  "footer-inner",
  "footer-note",
  "footer-link",
]) {
  if (!appShell.includes(marker)) {
    failures.push(`AppShell missing minimal chrome marker: ${marker}`);
  }
}

for (const marker of [
  ".site-header",
  ".site-nav",
  ".site-brand",
  ".site-brand-mark",
  ".site-nav-cta",
  ".footer-inner",
  ".footer-note",
  ".footer-link",
]) {
  if (!globals.includes(marker)) {
    failures.push(`globals.css missing minimal chrome selector: ${marker}`);
  }
}

if (packageJson.scripts?.["check:site-chrome-minimal-ui"] !== "node scripts/check-site-chrome-minimal-ui.mjs") {
  failures.push("package.json missing check:site-chrome-minimal-ui script");
}

for (const scriptName of ["check:project", "check:core"]) {
  const command = packageJson.scripts?.[scriptName] ?? "";
  if (command.includes("check:sales-navigation-polish")) {
    failures.push(`${scriptName} still runs obsolete check:sales-navigation-polish`);
  }
  if (!command.includes("check:site-chrome-minimal-ui")) {
    failures.push(`${scriptName} does not include check:site-chrome-minimal-ui`);
  }
}

if (failures.length > 0) {
  console.error("Site chrome minimal UI check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Site chrome minimal UI check passed.");
