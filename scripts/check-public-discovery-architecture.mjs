import { readFileSync } from "node:fs";
import ts from "typescript";

import { createCheckPlan, loadImpactRegistry } from "./halleus-check-plan.mjs";

const failures = [];

function read(relativePath) {
  return readFileSync(relativePath, "utf8");
}

function requireText(label, source, marker) {
  if (!source.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
}

function forbidText(label, source, marker) {
  if (source.includes(marker)) {
    failures.push(`${label} contains forbidden marker: ${marker}`);
  }
}

function parseSource(relativePath, scriptKind = ts.ScriptKind.TSX) {
  return ts.createSourceFile(
    relativePath,
    read(relativePath),
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
}

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return undefined;
}

function objectStringProperty(object, name) {
  const property = object.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) && propertyName(candidate.name) === name,
  );

  return property && ts.isStringLiteral(property.initializer)
    ? property.initializer.text
    : undefined;
}

function arrayVariable(relativePath, variableName) {
  const sourceFile = parseSource(relativePath);
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === variableName &&
        declaration.initializer
      ) {
        const initializer = ts.isAsExpression(declaration.initializer)
          ? declaration.initializer.expression
          : declaration.initializer;
        if (!ts.isArrayLiteralExpression(initializer)) {
          throw new Error(`${relativePath}:${variableName} must be an array literal.`);
        }
        return initializer;
      }
    }
  }
  throw new Error(`${relativePath} is missing ${variableName}.`);
}

function extractLinkMap(relativePath, variableName) {
  const array = arrayVariable(relativePath, variableName);
  return array.elements.map((element) => {
    if (!ts.isObjectLiteralExpression(element)) {
      throw new Error(`${relativePath}:${variableName} must contain object literals.`);
    }
    return {
      href: objectStringProperty(element, "href"),
      label: objectStringProperty(element, "label"),
    };
  });
}

async function loadDiscoveryModule() {
  const source = read("lib/wiki/wiki-public-discovery.ts");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "wiki-public-discovery.ts",
  }).outputText;
  const dataUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`;
  return import(dataUrl);
}

async function checkDiscoveryBehavior() {
  const {
    buildPublicWikiCategoryViews,
    findPublicWikiCategoryView,
    sortPublicWikiArticlesNewestFirst,
  } = await loadDiscoveryModule();

  const categories = [
    { id: "foundations", label: "Foundations", description: "Base" },
    { id: "houses", label: "Houses", description: "Fields" },
    { id: "empty", label: "Empty", description: "None" },
    { id: "bad/id", label: "Invalid", description: "Unsafe" },
  ];
  const articles = [
    {
      slug: "older",
      categoryId: "foundations",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      slug: "newer-b",
      categoryId: "foundations",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
    {
      slug: "newer-a",
      categoryId: "foundations",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
    {
      slug: "house-one",
      categoryId: "houses",
      updatedAt: "2026-02-01T00:00:00.000Z",
    },
    {
      slug: "unsafe",
      categoryId: "bad/id",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  ];

  const sorted = sortPublicWikiArticlesNewestFirst(articles);
  const expectedOrder = ["unsafe", "newer-a", "newer-b", "house-one", "older"];
  if (sorted.map((article) => article.slug).join("|") !== expectedOrder.join("|")) {
    failures.push("Wiki article discovery is not newest-first with deterministic slug ties.");
  }

  const views = buildPublicWikiCategoryViews(articles, categories);
  if (views.map((view) => view.category.id).join("|") !== "foundations|houses") {
    failures.push("Wiki category discovery must exclude empty and unsafe category routes.");
  }
  if (views[0]?.articles.map((article) => article.slug).join("|") !== "newer-a|newer-b|older") {
    failures.push("Wiki category articles are not newest-first.");
  }
  if (views[0]?.updatedAt !== "2026-03-01T00:00:00.000Z") {
    failures.push("Wiki category freshness does not come from its newest article.");
  }

  const missing = findPublicWikiCategoryView("empty", articles, categories);
  if (missing !== null) {
    failures.push("Empty Wiki categories must not resolve to public category pages.");
  }
}

function checkNavigation() {
  const primaryLinks = extractLinkMap("lib/config/navigation.ts", "navItems");
  const footerLinks = extractLinkMap("components/AppShell.tsx", "footerLinks");
  const primaryHrefs = primaryLinks.map((link) => link.href);
  const expectedFooterLinks = [
    { href: "/chart", label: "ساخت چارت تولد" },
    { href: "/sky", label: "آسمان امروز" },
    { href: "/wiki", label: "ویکی آسترولوژی" },
    { href: "/privacy", label: "حریم خصوصی" },
  ];

  for (const href of ["/chart", "/sky", "/wiki", "/product", "/privacy"]) {
    if (!primaryHrefs.includes(href)) {
      failures.push(`Primary navigation is missing ${href}.`);
    }
  }
  for (const href of ["/reports", "/dashboard"]) {
    if (primaryHrefs.includes(href)) {
      failures.push(`Primary navigation exposes private route ${href}.`);
    }
  }

  if (JSON.stringify(footerLinks) !== JSON.stringify(expectedFooterLinks)) {
    failures.push("Footer quick access must contain exactly the four approved public links in product order.");
  }
}

function checkIntegrationSources() {
  const homepage = read("app/page.tsx");
  const appShell = read("components/AppShell.tsx");
  const appShellStyles = read("components/app-shell.module.css");
  const chartLayout = read("app/chart/layout.tsx");
  const chartStyles = read("app/chart/chart-shell.module.css");
  const wikiRevalidation = read("lib/wiki/wiki-revalidation.ts");
  const wikiIndex = read("app/wiki/page.tsx");
  const wikiCategory = read("app/wiki/category/[categoryId]/page.tsx");
  const wikiArticle = read("app/wiki/[slug]/page.tsx");
  const repository = read("lib/wiki/wiki-repository.ts");
  const sitemap = read("app/sitemap.ts");
  const seo = read("lib/config/seo.ts");
  const skyPage = read("app/sky/page.tsx");
  const skyArchive = read("app/sky/[date]/page.tsx");
  const reportIndex = read("app/reports/page.tsx");
  const reportDetail = read("app/reports/[reportId]/page.tsx");
  const sharedReport = read("app/reports/shared/[shareToken]/page.tsx");
  const dashboardLayout = read("app/dashboard/layout.tsx");
  const packageJson = JSON.parse(read("package.json"));

  forbidText("Homepage", homepage, '"use client"');
  forbidText("Homepage", homepage, "'use client'");
  requireText("Homepage", homepage, "<h1");
  requireText("Homepage", homepage, "getPublicWikiCatalog");
  requireText("Homepage", homepage, "sortPublicWikiArticlesNewestFirst");
  requireText("Homepage", homepage, 'href: "/sky"');
  requireText("Homepage", homepage, 'href="/sky"');
  requireText("Homepage", homepage, "featuredWikiArticles = wikiArticles.slice(0, 5)");
  requireText("Homepage", homepage, "<h3>");
  requireText("Homepage", homepage, "href={`/wiki/${article.slug}`}");
  forbidText("Homepage", homepage, 'from "@/lib/wiki/wiki-content"');
  forbidText("Homepage", homepage, 'href: "#sky-pulse"');

  requireText("App shell", appShell, "export async function AppShell");
  requireText("App shell", appShell, "getPublicWikiCatalog");
  requireText("App shell", appShell, "sortPublicWikiArticlesNewestFirst");
  requireText("App shell", appShell, ".slice(0, 4)");
  requireText("App shell", appShell, "تازه‌ترین‌های ویکی");
  requireText("App shell", appShell, "href={`/wiki/${article.slug}`}");
  requireText(
    "App shell brand copy",
    appShell,
    "تجربه‌ای فارسی برای دیدن آسمان امروز، ساخت چارت تولد و یادگیری معنای نمادین چارت.",
  );
  requireText(
    "App shell responsibility copy",
    appShell,
    "برای خودشناسی نمادین، نه تصمیم‌گیری قطعی",
  );
  requireText(
    "App shell Instagram destination",
    appShell,
    'href="https://www.instagram.com/halleus_ir/"',
  );
  requireText("App shell Instagram accessibility", appShell, 'aria-label="اینستاگرام هالیوس"');
  requireText("App shell Instagram behavior", appShell, 'target="_blank"');
  requireText("App shell Instagram behavior", appShell, 'rel="noreferrer noopener"');
  requireText("App shell styles", appShellStyles, ".footerWikiLinks");
  requireText("App shell styles", appShellStyles, ".footerWikiLink");
  requireText("App shell styles", appShellStyles, ".footerResponsibility");
  requireText("App shell styles", appShellStyles, ".footerSocialLink");

  requireText("Chart discovery", chartLayout, 'data-chart-public-discovery="sky-wiki"');
  requireText("Chart discovery", chartLayout, 'href="/sky"');
  requireText("Chart discovery", chartLayout, 'href="/wiki"');
  requireText("Chart discovery styles", chartStyles, ".discoveryBridge");
  requireText("Chart discovery styles", chartStyles, ".discoveryActions");

  requireText(
    "Wiki publication revalidation",
    wikiRevalidation,
    'revalidatePath("/", "layout")',
  );

  forbidText("Wiki index", wikiIndex, '"use client"');
  forbidText("Wiki index", wikiIndex, "'use client'");
  requireText("Wiki index", wikiIndex, "<h1");
  requireText("Wiki index", wikiIndex, "sortPublicWikiArticlesNewestFirst");
  requireText("Wiki index", wikiIndex, "buildPublicWikiCategoryViews");
  requireText("Wiki index", wikiIndex, "articleTitleLink");
  requireText("Wiki index", wikiIndex, "href={`/wiki/category/${category.id}`}");
  forbidText("Wiki index", wikiIndex, "خواندن مقاله");

  forbidText("Wiki category route", wikiCategory, '"use client"');
  forbidText("Wiki category route", wikiCategory, "'use client'");
  requireText("Wiki category route", wikiCategory, "<h1");
  for (const marker of [
    "generateStaticParams",
    "generateMetadata",
    "findPublicWikiCategoryView",
    "notFound()",
    'canonical: `/wiki/category/${categoryView.category.id}`',
    "index: true",
    "follow: true",
    "articleTitleLink",
  ]) {
    requireText("Wiki category route", wikiCategory, marker);
  }

  requireText("Wiki article route", wikiArticle, "href={`/wiki/category/${category.id}`}");
  requireText(
    "Wiki article breadcrumb metadata",
    wikiArticle,
    "`${WIKI_BASE_URL}/wiki/category/${category.id}`",
  );

  requireText("Wiki repository", repository, "PublicWikiArticle = DatedWikiArticle");
  requireText("Wiki repository", repository, "listPublicWikiSitemapCategories");
  requireText("Wiki repository", repository, "buildPublicWikiCategoryViews");

  requireText("SEO routes", seo, 'path: "/sky"');
  forbidText("SEO routes", seo, 'path: "/reports"');

  requireText("Sitemap", sitemap, "listPublicWikiSitemapCategories");
  requireText("Sitemap", sitemap, "lastModified: category.updatedAt");
  requireText("Sitemap", sitemap, "lastModified: article.updatedAt");
  requireText("Sitemap", sitemap, "/wiki/category/${category.id}");
  forbidText("Sitemap", sitemap, "const lastModified = new Date()");
  forbidText("Sitemap", sitemap, "/reports");

  requireText("Public Sky page", skyPage, 'canonical: "/sky"');
  requireText("Sky archive", skyArchive, "index: false");
  for (const [label, source] of [
    ["Report library", reportIndex],
    ["Report detail", reportDetail],
    ["Shared report", sharedReport],
    ["Dashboard layout", dashboardLayout],
  ]) {
    requireText(label, source, "index: false");
    requireText(label, source, "follow: false");
  }

  if (
    packageJson.scripts?.["check:public-discovery-architecture"] !==
    "node scripts/check-public-discovery-architecture.mjs"
  ) {
    failures.push("package.json is missing the public discovery architecture guard.");
  }
}

function checkImpactPlan() {
  const registry = loadImpactRegistry();
  const runtimePlan = createCheckPlan(
    [
      "app/page.tsx",
      "app/chart/layout.tsx",
      "app/chart/chart-shell.module.css",
      "app/sitemap.ts",
      "components/AppShell.tsx",
      "components/app-shell.module.css",
      "lib/wiki/wiki-revalidation.ts",
      "app/wiki/category/[categoryId]/page.tsx",
      "lib/wiki/wiki-public-discovery.ts",
    ],
    registry,
  );

  if (
    runtimePlan.files.some(
      (file) =>
        !file.exclusive ||
        !file.areas.includes("public-discovery-architecture"),
    ) ||
    !runtimePlan.guards.includes("check:public-discovery-architecture") ||
    !runtimePlan.guards.includes("check:site-chrome-minimal-ui") ||
    !runtimePlan.guards.includes("check:wiki-storage-public-read") ||
    !runtimePlan.lint ||
    !runtimePlan.build
  ) {
    failures.push("Public discovery runtime files are not protected by the focused full plan.");
  }

  const guardPlan = createCheckPlan(
    ["scripts/check-public-discovery-architecture.mjs"],
    registry,
  );
  if (
    !guardPlan.files[0]?.exclusive ||
    !guardPlan.files[0]?.areas.includes("public-discovery-guard-tooling") ||
    !guardPlan.guards.includes("check:public-discovery-architecture") ||
    guardPlan.lint ||
    guardPlan.build
  ) {
    failures.push("The public discovery guard must self-verify without recursive lint/build.");
  }
}

await checkDiscoveryBehavior();
checkNavigation();
checkIntegrationSources();
checkImpactPlan();

if (failures.length > 0) {
  console.error("Public discovery architecture check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public discovery architecture check passed.");
console.log("- public navigation exposes Sky and Wiki without private report/dashboard routes");
console.log("- homepage, footer, and Wiki discovery read the live database-first catalog");
console.log("- the minimal footer exposes four essential routes, Instagram, and four newest Wiki articles");
console.log("- the chart page links directly to Sky and Wiki discovery surfaces");
console.log("- non-empty Wiki categories resolve newest-first public pages");
console.log("- sitemap freshness comes from stored Wiki update timestamps");
console.log("- report and dated Sky noindex boundaries remain intact");
