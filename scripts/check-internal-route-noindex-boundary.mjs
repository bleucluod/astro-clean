import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requirePattern(label, text, pattern, description) {
  if (!pattern.test(text)) {
    failures.push(`${label} missing ${description}`);
  }
}

function forbidText(label, text, marker) {
  if (text.includes(marker)) {
    failures.push(`${label} contains forbidden marker: ${marker}`);
  }
}

const internalRouteFamilies = [
  { route: "/admin", layout: "app/admin/layout.tsx" },
  { route: "/dashboard", layout: "app/dashboard/layout.tsx" },
  { route: "/profile", layout: "app/profile/layout.tsx" },
];

// retired-route-absence-guard-20260911
const retiredRoutePages = [
  "app/roadmap/page.tsx",
  "app/language/page.tsx",
  "app/quality/page.tsx",
  "app/quality/mvp-checkpoint/page.tsx",
  "app/interpretation/page.tsx",
  "app/engine/page.tsx",
  "app/engine/decision/page.tsx",
  "app/engine/real/page.tsx",
  "app/engine/real-chart/page.tsx",
  "app/engine/report-flow/page.tsx",
  "app/engine/report-preview/page.tsx",
  "app/asteroid-lab/page.tsx",
];

for (const retiredPage of retiredRoutePages) {
  if (fs.existsSync(path.join(root, retiredPage))) {
    failures.push(`Retired route page still exists: ${retiredPage}`);
  }
}

const noindexPattern =
  /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*\}/s;

for (const family of internalRouteFamilies) {
  const layout = read(family.layout);
  requirePattern(
    `${family.route} layout`,
    layout,
    noindexPattern,
    "noindex/nofollow metadata",
  );
  forbidText(`${family.route} layout`, layout, "canonical:");
}

const rootLayout = read("app/layout.tsx");
requirePattern(
  "root layout",
  rootLayout,
  /robots:\s*\{\s*index:\s*true,\s*follow:\s*true,\s*\}/s,
  "public index/follow default",
);

const reportsLayout = read("app/reports/layout.tsx");
requirePattern(
  "reports layout",
  reportsLayout,
  noindexPattern,
  "existing noindex/nofollow metadata",
);

const seoConfig = read("lib/config/seo.ts");
const publicPaths = [...seoConfig.matchAll(/path:\s*"([^"]*)"/g)].map(
  (match) => match[1],
);

for (const family of internalRouteFamilies) {
  if (publicPaths.includes(family.route)) {
    failures.push(`${family.route} must not appear in seoRoutes`);
  }
}

const sitemapSource = read("app/sitemap.ts");
for (const family of internalRouteFamilies) {
  forbidText("sitemap", sitemapSource, `siteConfig.url}${family.route}`);
}

const packageJson = JSON.parse(read("package.json"));
if (
  packageJson.scripts?.["check:internal-route-noindex-boundary"] !==
  "node scripts/check-internal-route-noindex-boundary.mjs"
) {
  failures.push("package.json is missing the internal-route noindex guard");
}
if (
  !packageJson.scripts?.["check:project"]?.includes(
    "pnpm run check:internal-route-noindex-boundary",
  )
) {
  failures.push("check:project does not include the internal-route guard");
}

const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");
if (
  !ideaGarden.includes("Authority checkpoint:") ||
  !ideaGarden.includes("Historical seed notes are preserved in Git history")
) {
  failures.push("Idea Garden is missing its compact authority boundary");
}

const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");
if (
  !projectContext.includes("Authority checkpoint:") ||
  !projectContext.includes("Historical details belong in Git history and release tags")
) {
  failures.push("Project Context is missing its compact authority boundary");
}

if (failures.length > 0) {
  console.error("Internal-route noindex boundary check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Internal-route noindex boundary check passed.");
console.log("- retained admin/account routes are noindex/nofollow");
console.log("- retired legacy page routes are absent");
console.log("- retained internal routes remain outside seoRoutes and sitemap generation");
console.log("- public root indexing and report-family noindex remain unchanged");
