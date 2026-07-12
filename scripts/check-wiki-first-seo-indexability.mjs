import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function requireText(label, text, marker) {
  if (!text.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

function forbidText(label, text, marker) {
  if (text.includes(marker)) {
    failures.push(`${label} contains forbidden marker: ${marker}`);
  }
}

function requirePattern(label, text, pattern, description) {
  if (!pattern.test(text)) {
    failures.push(`${label} missing ${description}`);
  }
}

const rootLayout = read("app/layout.tsx");
const homepage = read("app/page.tsx");
const wikiIndex = read("app/wiki/page.tsx");
const wikiArticle = read("app/wiki/[slug]/page.tsx");
const reportsIndex = read("app/reports/page.tsx");
const reportsLayout = read("app/reports/layout.tsx");
const reportDetail = read("app/reports/[reportId]/page.tsx");
const seoConfig = read("lib/config/seo.ts");
const sitemapSource = read("app/sitemap.ts");
const wikiContent = read("lib/wiki/wiki-content.ts");
const packageJson = JSON.parse(read("package.json"));
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");

forbidText("root layout", rootLayout, 'canonical: "/"');
requirePattern(
  "root layout",
  rootLayout,
  /robots:\s*\{\s*index:\s*true,\s*follow:\s*true,\s*\}/s,
  "public default robots metadata",
);
requireText("homepage", homepage, 'canonical: "/"');

requireText("Wiki index", wikiIndex, 'canonical: "/wiki"');
requirePattern(
  "Wiki index",
  wikiIndex,
  /robots:\s*\{\s*index:\s*true,\s*follow:\s*true,\s*\}/s,
  "index/follow metadata",
);
requirePattern(
  "missing Wiki article",
  wikiArticle,
  /title:\s*"مقاله پیدا نشد \| ویکی هالیوس"[\s\S]*?robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*\}/,
  "noindex/nofollow metadata",
);
requirePattern(
  "valid Wiki article",
  wikiArticle,
  /canonical:\s*`\/wiki\/\$\{article\.slug\}`[\s\S]*?robots:\s*\{\s*index:\s*true,\s*follow:\s*true,\s*\}/,
  "self-canonical index/follow metadata",
);

requireText("reports index", reportsIndex, 'canonical: "/reports"');
requirePattern(
  "reports index",
  reportsIndex,
  /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*\}/s,
  "noindex/nofollow metadata",
);
requirePattern(
  "reports route family",
  reportsLayout,
  /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*\}/s,
  "noindex/nofollow layout metadata",
);
requirePattern(
  "report detail",
  reportDetail,
  /robots:\s*\{\s*index:\s*false,\s*follow:\s*false,\s*\}/s,
  "existing noindex/nofollow metadata",
);

const publicPaths = [...seoConfig.matchAll(/path:\s*"([^"]*)"/g)].map(
  (match) => match[1],
);
const expectedPublicPaths = [
  "",
  "/chart",
  "/product",
  "/pricing",
  "/order",
  "/privacy",
  "/wiki",
];

if (JSON.stringify(publicPaths) !== JSON.stringify(expectedPublicPaths)) {
  failures.push(
    `unexpected public route matrix: ${JSON.stringify(publicPaths)}`,
  );
}

requireText(
  "sitemap",
  sitemapSource,
  'import { wikiArticles } from "@/lib/wiki/wiki-content"',
);
requireText("sitemap", sitemapSource, "wikiArticles.map");
requireText(
  "sitemap",
  sitemapSource,
  "`${siteConfig.url}/wiki/${article.slug}`",
);
forbidText("sitemap", sitemapSource, "/reports");

const declaredWikiSlugs = [
  ...wikiContent.matchAll(/slug: "([a-z0-9-]+)"/g),
].map((match) => match[1]);
if (declaredWikiSlugs.length !== 15) {
  failures.push(
    `expected 15 Wiki article slugs for sitemap generation, found ${declaredWikiSlugs.length}`,
  );
}

if (
  packageJson.scripts?.["check:wiki-first-seo-indexability"] !==
  "node scripts/check-wiki-first-seo-indexability.mjs"
) {
  failures.push("package.json is missing the focused SEO guard script");
}
if (
  !packageJson.scripts?.["check:project"]?.includes(
    "pnpm run check:wiki-first-seo-indexability",
  )
) {
  failures.push("check:project does not include the focused SEO guard");
}

requireText(
  "Idea Garden",
  ideaGarden,
  "## v0.1.304 Wiki-first SEO indexability decision",
);
requireText(
  "Idea Garden",
  ideaGarden,
  "All report routes remain noindex in the current SEO phase",
);
requireText(
  "Project Context",
  projectContext,
  "## v0.1.304f Wiki-first SEO core",
);
requireText(
  "Project Context",
  projectContext,
  "Patch-first workflow",
);

if (failures.length > 0) {
  console.error("Wiki-first SEO indexability check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Wiki-first SEO indexability check passed.");
console.log("- homepage retains an explicit self-canonical without root inheritance");
console.log("- Wiki index and all valid Wiki articles are index/follow");
console.log("- Wiki index and 15 current articles are generated into the sitemap");
console.log("- reports index and report details remain noindex/nofollow");
