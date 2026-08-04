import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(label, text, marker) {
  if (!text.includes(marker)) {
    failures.push(`${label} is missing marker: ${marker}`);
  }
}

function forbidText(label, text, marker) {
  if (text.includes(marker)) {
    failures.push(`${label} contains forbidden marker: ${marker}`);
  }
}

const analyticsConfig = read("lib/config/analytics.ts");
const analyticsComponent = read("components/AnalyticsConsent.tsx");
const analyticsStyles = read("components/analytics-consent.module.css");
const appShell = read("components/AppShell.tsx");
const rootLayout = read("app/layout.tsx");
const privacyPage = `${read("app/privacy/page.tsx")}\n${read("content/public-editorial-final/10-privacy.md")}`;
const packageJson = JSON.parse(read("package.json"));
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");

requireText("analytics config", analyticsConfig, 'measurementId: "G-W3WBZCTL7G"');
requireText("analytics config", analyticsConfig, 'consentStorageKey: "halleus-analytics-consent-v1"');
requireText("analytics config", analyticsConfig, 'publicPathPrefixes: ["/wiki/"]');
for (const blockedPath of ["/reports", "/admin", "/dashboard", "/profile", "/engine", "/quality"]) {
  if (analyticsConfig.includes(`"${blockedPath}"`)) {
    failures.push(`analytics config unexpectedly tracks blocked path: ${blockedPath}`);
  }
}

requireText("analytics component", analyticsComponent, '"use client"');
requireText("analytics component", analyticsComponent, "readStoredChoice()");
requireText(
  "analytics component",
  analyticsComponent,
  'setChoice(readStoredChoice() ?? "granted");',
);
requireText(
  "analytics component",
  analyticsComponent,
  "if (!isReady || !isSettingsOpen)",
);
forbidText(
  "analytics component",
  analyticsComponent,
  "setChoice(readStoredChoice());",
);
forbidText(
  "analytics component",
  analyticsComponent,
  "choice !== null && !isSettingsOpen",
);
requireText("analytics component", analyticsComponent, 'choice !== "granted"');
requireText("analytics component", analyticsComponent, "isAnalyticsPublicPath(pathname)");
const gtagFunction = analyticsComponent.match(
  /analyticsWindow\.gtag\s*=\s*function\s+gtag\s*\(\s*\)\s*:\s*void\s*\{([\s\S]*?)\n\s*\};/,
);
if (!gtagFunction) {
  failures.push("analytics component must define a named zero-parameter gtag function");
} else if (
  !/analyticsWindow\.dataLayer\?\.push\(\s*arguments\s*\)/.test(gtagFunction[1])
) {
  failures.push("analytics gtag function must queue the native Arguments object");
}
if (
  /function\s+gtag\s*\(\s*\.\.\./.test(analyticsComponent) ||
  /analyticsWindow\.dataLayer\?\.push\(\s*args\s*\)/.test(analyticsComponent)
) {
  failures.push("analytics gtag function must not convert commands to rest-parameter arrays");
}
requireText("analytics component", analyticsComponent, "document.createElement(\"script\")");
requireText("analytics component", analyticsComponent, "www.googletagmanager.com/gtag/js");
requireText("analytics component", analyticsComponent, "send_page_view: false");
requireText("analytics component", analyticsComponent, '"consent", "default"');
requireText("analytics component", analyticsComponent, 'analytics_storage: "granted"');
requireText("analytics component", analyticsComponent, "allow_google_signals: false");
requireText("analytics component", analyticsComponent, "allow_ad_personalization_signals: false");
requireText("analytics component", analyticsComponent, '"event", "page_view"');
requireText("analytics component", analyticsComponent, "`${window.location.origin}${pathname}`");
requireText("analytics component", analyticsComponent, "deleteAnalyticsCookies()");
requireText("analytics component", analyticsComponent, "ga-disable-");
requireText("analytics component", analyticsComponent, "دادهٔ تولد");
requireText("analytics component", analyticsComponent, "آمار بازدید هالیوس");
forbidText(
  "analytics component",
  analyticsComponent,
  "کمک می‌کنی هالیوس را بهتر بفهمیم؟",
);
forbidText("analytics component", analyticsComponent, "window.location.href");
forbidText("analytics component", analyticsComponent, "useSearchParams");
forbidText("analytics component", analyticsComponent, "reportId");
forbidText("analytics component", analyticsComponent, "birthDate");
forbidText("analytics component", analyticsComponent, "email:");

requireText("analytics styles", analyticsStyles, ".banner");
requireText("analytics styles", analyticsStyles, "position: fixed");
requireText("App Shell", appShell, "<AnalyticsConsent />");
forbidText("root layout", rootLayout, "googletagmanager.com");
forbidText("root layout", rootLayout, "gtag(");

requireText(
  "Privacy page",
  privacyPage,
  'import { AnalyticsPreferencesLink } from "@/components/AnalyticsConsent";',
);
requireText("Privacy page", privacyPage, "<AnalyticsPreferencesLink");

requireText("Privacy page", privacyPage, "آمار بازدید فقط برای اندازه‌گیری صفحه‌های عمومی");
requireText(
  "Privacy page",
  privacyPage,
  "اجازه آن از اجازه انتشار جداست",
);
requireText("Privacy page", privacyPage, "تنظیم آمار بازدید");
forbidText("Privacy page", privacyPage, "آمار بازدید فقط با انتخاب تو");
forbidText(
  "Privacy page",
  privacyPage,
  "بدون اجازهٔ تو Google Analytics را بارگذاری نمی‌کند",
);

if (
  packageJson.scripts?.["check:privacy-conscious-analytics"] !==
  "node scripts/check-privacy-conscious-analytics.mjs"
) {
  failures.push("package.json is missing check:privacy-conscious-analytics");
}
if (
  !packageJson.scripts?.["check:project"]?.includes(
    "pnpm run check:privacy-conscious-analytics",
  )
) {
  failures.push("check:project does not include the analytics privacy guard");
}

requireText(
  "Idea Garden",
  ideaGarden,
  "Analytics consent: never publication consent.",
);
requireText(
  "Project Context",
  projectContext,
  "GA4 is limited to approved public paths",
);
requireText(
  "Project Context",
  projectContext,
  "Analytics preference never grants permission to publish a report.",
);

if (failures.length > 0) {
  console.error("Default public analytics check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Default public analytics check passed.");
console.log("- approved public routes enable analytics when no stored opt-out exists");
console.log("- the first-visit consent banner is removed");
console.log("- Halleus emits only sanitized public-route page_view events");
console.log("- report, account, and internal routes remain outside analytics");
console.log("- ad personalization and Google Signals remain disabled");
console.log("- the visitor can opt out or re-enable analytics from shared settings");
