import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function exists(relativePath) {
  return fs.existsSync(absolute(relativePath));
}

function read(relativePath) {
  return fs.readFileSync(absolute(relativePath), "utf8");
}

function requireText(label, text, marker) {
  if (!text.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

function forbidText(label, text, marker, description = marker) {
  if (text.includes(marker)) {
    failures.push(`${label} contains forbidden ${description}`);
  }
}

function requirePattern(label, text, pattern, description) {
  if (!pattern.test(text)) {
    failures.push(`${label} missing ${description}`);
  }
}

function walkLoadingFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkLoadingFiles(entryPath, output);
    } else if (entry.isFile() && entry.name === "loading.tsx") {
      output.push(path.relative(root, entryPath).replaceAll(path.sep, "/"));
    }
  }
  return output;
}

if (exists("app/loading.tsx")) {
  failures.push("root app/loading.tsx must not wrap public content routes");
}

const loadingFiles = walkLoadingFiles(absolute("app"));
for (const loadingFile of loadingFiles) {
  const blocksPublicOrMixedContent =
    loadingFile === "app/loading.tsx" ||
    loadingFile.startsWith("app/wiki/") ||
    loadingFile.startsWith("app/reports/") ||
    loadingFile.startsWith("app/(public)/") ||
    loadingFile.startsWith("app/public/");
  if (blocksPublicOrMixedContent) {
    failures.push(`public or mixed content route has a blocking route loader: ${loadingFile}`);
  }
}

const homepage = read("app/page.tsx");
const wikiIndex = read("app/wiki/page.tsx");
const wikiArticle = read("app/wiki/[slug]/page.tsx");
const chartForm = read("components/ChartForm.tsx");
const packageJson = JSON.parse(read("package.json"));
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");
const projectContext = read("docs/HALLEUS_PROJECT_CONTEXT.md");

for (const [label, source] of [
  ["homepage", homepage],
  ["Wiki index", wikiIndex],
  ["Wiki article", wikiArticle],
]) {
  forbidText(label, source, '"use client"', "client-only page directive");
  forbidText(label, source, "'use client'", "client-only page directive");
  requirePattern(label, source, /<h1\b/, "server-rendered H1");
}

requireText("Wiki index", wikiIndex, 'import Link from "next/link"');
requireText("Wiki index", wikiIndex, "wikiArticles.map");
requirePattern(
  "Wiki index",
  wikiIndex,
  /<Link\b[\s\S]*?href=\{`\/wiki\/\$\{article\.slug\}`\}/,
  "real article hrefs through next/link",
);

requireText("Wiki article", wikiArticle, 'export const dynamicParams = true');
requireText("Wiki article", wikiArticle, "export async function generateStaticParams()");
requireText("Wiki article", wikiArticle, "listPublicWikiRouteSlugs");
requireText("Wiki article", wikiArticle, "<h1>{article.title}</h1>");
requirePattern(
  "Wiki article",
  wikiArticle,
  /<Link\b[\s\S]*?href=(?:\{?["']\/wiki["']\}?|\{`\/wiki\/\$\{relatedArticle\.slug\}`\})/,
  "real internal Wiki links",
);

requireText(
  "ChartForm submit loading state",
  chartForm,
  'const isRealEngineLoading = realEngineRequest.status === "loading";',
);
requireText(
  "ChartForm submit loading copy",
  chartForm,
  'isRealEngineLoading ? "\u062f\u0631 \u062d\u0627\u0644 \u0633\u0627\u062e\u062a \u06af\u0632\u0627\u0631\u0634..." : "\u0633\u0627\u062e\u062a \u06af\u0632\u0627\u0631\u0634"',
);

if (
  packageJson.scripts?.["check:public-content-crawlability"] !==
  "node scripts/check-public-content-crawlability.mjs"
) {
  failures.push("package.json is missing the focused public content crawlability guard");
}

if (
  !packageJson.scripts?.["check:project"]?.includes(
    "pnpm run check:public-content-crawlability",
  )
) {
  failures.push("check:project does not include the public content crawlability guard");
}

requireText(
  "Idea Garden",
  ideaGarden,
  "## v0.1.308 Public content loading boundary decision",
);
requireText(
  "Project Context",
  projectContext,
  "## v0.1.308 public content crawlability loading boundary scope",
);

async function fetchHtml(baseUrl, route) {
  const response = await fetch(new URL(route, baseUrl), {
    headers: {
      "user-agent": "Halleus-Crawlability-Guard/1.0",
    },
    redirect: "error",
  });
  const contentType = response.headers.get("content-type") ?? "";
  const html = await response.text();
  if (!response.ok) {
    failures.push(`${route} returned HTTP ${response.status}`);
  }
  if (!contentType.includes("text/html")) {
    failures.push(`${route} did not return text/html`);
  }
  return html;
}

function requireInitialHtml(route, html) {
  if (!/<h1\b/i.test(html)) {
    failures.push(`${route} initial HTML is missing an H1`);
  }
  if (html.includes("loading-state")) {
    failures.push(`${route} initial HTML contains the removed global loading state`);
  }
}

async function runRuntimeChecks(baseUrl) {
  const wikiContent = read("lib/wiki/wiki-content.ts");
  const slugMatch = wikiContent.match(/slug:\s*"([a-z0-9-]+)"/);
  if (!slugMatch) {
    failures.push("could not resolve a real Wiki slug for runtime HTML checks");
    return;
  }

  const articleRoute = `/wiki/${slugMatch[1]}`;
  const homepageHtml = await fetchHtml(baseUrl, "/");
  const wikiHtml = await fetchHtml(baseUrl, "/wiki");
  const articleHtml = await fetchHtml(baseUrl, articleRoute);

  requireInitialHtml("/", homepageHtml);
  requireInitialHtml("/wiki", wikiHtml);
  requireInitialHtml(articleRoute, articleHtml);

  if (!/<a\b[^>]*href=["']\/wiki\/[a-z0-9-]+["'][^>]*>/i.test(wikiHtml)) {
    failures.push("/wiki initial HTML is missing real article anchor hrefs");
  }
  if (!/<article\b/i.test(articleHtml)) {
    failures.push(`${articleRoute} initial HTML is missing the article element`);
  }
  if (!/<a\b[^>]*href=["']\/wiki["'][^>]*>/i.test(articleHtml)) {
    failures.push(`${articleRoute} initial HTML is missing a real link back to /wiki`);
  }
}

const runtimeBaseUrl = process.env.HALLEUS_CRAWL_BASE_URL?.trim();
if (runtimeBaseUrl) {
  try {
    await runRuntimeChecks(runtimeBaseUrl);
  } catch (error) {
    failures.push(
      `runtime crawlability check failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

if (failures.length > 0) {
  console.error("Public content crawlability check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public content crawlability check passed.");
console.log("- no root, Wiki, report, or explicit public route loading.tsx replaces public content");
console.log("- homepage and Wiki sources retain server-rendered H1/content contracts");
console.log("- Wiki index/article sources retain real next/link href contracts");
console.log("- report generation loading after submit remains intact");
if (runtimeBaseUrl) {
  console.log("- built initial HTML passed homepage, Wiki index, article, and anchor checks");
}
