import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireMatch(label, text, pattern, expectation) {
  if (!pattern.test(text)) {
    failures.push(`${label} must ${expectation}`);
  }
}

const analyticsConfigSource = read("lib/config/analytics.ts");
const appShellSource = read("components/AppShell.tsx");
const analyticsConsentSource = read("components/AnalyticsConsent.tsx");
const packageJson = JSON.parse(read("package.json"));

requireMatch(
  "analytics config",
  analyticsConfigSource,
  /measurementId:\s*"G-W3WBZCTL7G"/,
  'use measurementId "G-W3WBZCTL7G"',
);

const publicPathsMatch = analyticsConfigSource.match(
  /publicPaths:\s*\[([\s\S]*?)\]\s*,/,
);

if (!publicPathsMatch) {
  failures.push("analytics config must define publicPaths as an array");
} else {
  const publicPaths = [
    ...publicPathsMatch[1].matchAll(/"([^"]+)"/g),
  ].map((match) => match[1]);

  for (const requiredPath of ["/", "/chart", "/sky", "/wiki"]) {
    if (!publicPaths.includes(requiredPath)) {
      failures.push(`analytics publicPaths must include ${requiredPath}`);
    }
  }
}

requireMatch(
  "AppShell",
  appShellSource,
  /import\s*\{\s*AnalyticsConsent\s*\}\s*from\s*"@\/components\/AnalyticsConsent"/,
  "import AnalyticsConsent",
);
requireMatch(
  "AppShell",
  appShellSource,
  /<AnalyticsConsent\s*\/>/,
  "render <AnalyticsConsent />",
);
requireMatch(
  "AnalyticsConsent",
  analyticsConsentSource,
  /script\.src\s*=\s*`https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[$][{]analyticsConfig\.measurementId[}]`/,
  "load the configured Google tag URL",
);
requireMatch(
  "AnalyticsConsent",
  analyticsConsentSource,
  /analyticsWindow\.gtag\s*=\s*function\s+gtag\s*\(\s*\)\s*:\s*void\s*\{[\s\S]*?analyticsWindow\.dataLayer\?\.push\(arguments\);[\s\S]*?\n\s*\};/,
  "define a zero-parameter gtag wrapper that queues the native Arguments object",
);

if (/analyticsWindow\.dataLayer\?\.push\(args\)/.test(analyticsConsentSource)) {
  failures.push(
    "AnalyticsConsent must not queue Google tag commands as rest-parameter arrays",
  );
}

const initialConfigMatch = analyticsConsentSource.match(
  /analyticsWindow\.gtag\(\s*"config"\s*,\s*analyticsConfig\.measurementId\s*,\s*\{([\s\S]*?)\}\s*\);/,
);

if (!initialConfigMatch) {
  failures.push("AnalyticsConsent must configure GA4 with analyticsConfig.measurementId");
} else if (!/send_page_view:\s*false/.test(initialConfigMatch[1])) {
  failures.push("the initial GA4 config must set send_page_view to false");
}

const manualPageViewMatch = analyticsConsentSource.match(
  /function\s+sendPublicPageView\s*\([^)]*\)\s*:\s*void\s*\{([\s\S]*?)\n\}/,
);

if (!manualPageViewMatch) {
  failures.push("AnalyticsConsent must define sendPublicPageView");
} else if (
  !/analyticsWindow\.gtag\?\.\(\s*"event"\s*,\s*"page_view"\s*,/.test(
    manualPageViewMatch[1],
  )
) {
  failures.push("sendPublicPageView must emit a manual page_view event");
}

requireMatch(
  "AnalyticsConsent",
  analyticsConsentSource,
  /sendPublicPageView\(pathname\)/,
  "call sendPublicPageView for public navigation",
);

if (
  packageJson.scripts?.["check:ga4-public-analytics"] !==
  "node scripts/check-ga4-public-analytics.mjs"
) {
  failures.push("package.json must define check:ga4-public-analytics");
}

if (failures.length > 0) {
  console.error("GA4 public analytics check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("GA4 public analytics check passed.");
