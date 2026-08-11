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
  const categorySource = read("lib/wiki/wiki-category-content.ts");
  const categoryTranspiled = ts.transpileModule(categorySource, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "wiki-category-content.ts",
  }).outputText;
  const categoryDataUrl = `data:text/javascript;base64,${Buffer.from(categoryTranspiled).toString("base64")}`;
  const source = read("lib/wiki/wiki-public-discovery.ts").replace(
    '"@/lib/wiki/wiki-category-content"',
    JSON.stringify(categoryDataUrl),
  );
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
    buildPublicWikiRelatedArticles,
    findPublicWikiCategoryView,
    normalizePublicWikiUpdatedAt,
    selectPublicWikiArticlesByPreferredSlugs,
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
      slug: "birth-chart-basics",
      categoryId: "foundations",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      slug: "planet-sign-house-difference",
      categoryId: "foundations",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
    {
      slug: "how-to-read-birth-chart",
      categoryId: "foundations",
      updatedAt: "2026-03-01T00:00:00.000Z",
    },
    {
      slug: "astrology-houses",
      categoryId: "houses",
      updatedAt: "2026-02-01T00:00:00.000Z",
    },
    {
      slug: "what-is-rising-sign",
      categoryId: "houses",
      updatedAt: "2026-02-02T00:00:00.000Z",
    },
    {
      slug: "first-house-in-natal-chart",
      categoryId: "houses",
      updatedAt: "2026-02-03T00:00:00.000Z",
    },
    {
      slug: "unsafe",
      categoryId: "bad/id",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  ];

  const sorted = sortPublicWikiArticlesNewestFirst(articles);
  const expectedOrder = [
    "unsafe",
    "how-to-read-birth-chart",
    "planet-sign-house-difference",
    "first-house-in-natal-chart",
    "what-is-rising-sign",
    "astrology-houses",
    "birth-chart-basics",
  ];
  if (sorted.map((article) => article.slug).join("|") !== expectedOrder.join("|")) {
    failures.push("Wiki article discovery is not newest-first with deterministic slug ties.");
  }

  const preferred = selectPublicWikiArticlesByPreferredSlugs(articles, [
    "what-is-rising-sign",
    "scheduled-or-missing",
    "birth-chart-basics",
    "what-is-rising-sign",
  ]);
  if (
    preferred.map((article) => article.slug).join("|") !==
    "what-is-rising-sign|birth-chart-basics"
  ) {
    failures.push(
      "Preferred Wiki discovery must preserve requested order while omitting unavailable and duplicate slugs.",
    );
  }

  const views = buildPublicWikiCategoryViews(articles, categories);
  if (views.map((view) => view.category.id).join("|") !== "foundations|houses") {
    failures.push("Wiki category discovery must exclude empty and unsafe category routes.");
  }
  if (
    views[0]?.articles.map((article) => article.slug).join("|") !==
    "how-to-read-birth-chart|planet-sign-house-difference|birth-chart-basics"
  ) {
    failures.push("Wiki category articles are not newest-first.");
  }
  if (views[0]?.updatedAt !== "2026-03-01T00:00:00.000Z") {
    failures.push("Wiki category freshness does not come from its newest article.");
  }

  const missing = findPublicWikiCategoryView("empty", articles, categories);
  if (missing !== null) {
    failures.push("Empty Wiki categories must not resolve to public category pages.");
  }

  const normalizedPostgresTimestamp = normalizePublicWikiUpdatedAt(
    "2026-07-21 06:33:54.113468+00",
  );
  if (normalizedPostgresTimestamp !== "2026-07-21T06:33:54.113Z") {
    failures.push("PostgreSQL Wiki timestamps must normalize to W3C/ISO sitemap values.");
  }
  if (normalizePublicWikiUpdatedAt("2026-07-21T06:33:54.113Z") !== normalizedPostgresTimestamp) {
    failures.push("Existing ISO Wiki timestamps must remain stable after normalization.");
  }
  try {
    normalizePublicWikiUpdatedAt("not-a-date");
    failures.push("Invalid Wiki timestamps must be rejected before sitemap rendering.");
  } catch {
    // Expected: invalid storage timestamps cannot leak into public sitemap output.
  }

  const relationshipArticles = [
    {
      stableId: "current",
      slug: "current",
      relatedArticleIds: ["outgoing", "outgoing", "current"],
      relatedSlugs: [],
    },
    {
      stableId: "outgoing",
      slug: "outgoing",
      relatedArticleIds: ["current"],
      relatedSlugs: [],
    },
    {
      stableId: "backlink",
      slug: "backlink",
      relatedArticleIds: ["current"],
      relatedSlugs: [],
    },
    {
      stableId: "legacy-backlink",
      slug: "legacy-backlink",
      relatedArticleIds: [],
      relatedSlugs: ["current"],
    },
    {
      stableId: "unrelated",
      slug: "unrelated",
      relatedArticleIds: [],
      relatedSlugs: [],
    },
  ];
  const completedRelated = buildPublicWikiRelatedArticles(
    relationshipArticles[0],
    relationshipArticles,
  );
  const completedRelatedIds = completedRelated.map((item) => item.stableId);
  if (completedRelatedIds.join("|") !== "outgoing|backlink|legacy-backlink") {
    failures.push(
      "Wiki related articles must preserve outgoing order and append deterministic public backlinks without duplicates or self-links.",
    );
  }

  const cappedRelationshipArticles = [
    {
      stableId: "planets-in-birth-chart",
      slug: "planets-in-birth-chart",
      relatedArticleIds: [
        "manual-1",
        "manual-2",
        "manual-3",
        "manual-4",
        "manual-5",
        "manual-6",
        "manual-7",
        "manual-8",
        "manual-1",
        "planets-in-birth-chart",
      ],
      relatedSlugs: [],
    },
    ...Array.from({ length: 8 }, (_, index) => ({
      stableId: `manual-${index + 1}`,
      slug: `manual-${index + 1}`,
      relatedArticleIds: [],
      relatedSlugs: [],
    })),
    {
      stableId: "retrograde-planets-explained",
      slug: "retrograde-planets-explained",
      relatedArticleIds: ["planets-in-birth-chart"],
      relatedSlugs: [],
    },
    {
      stableId: "mercury-retrograde-guide",
      slug: "mercury-retrograde-guide",
      relatedArticleIds: [],
      relatedSlugs: ["planets-in-birth-chart"],
    },
    ...Array.from({ length: 4 }, (_, index) => ({
      stableId: `extra-backlink-${index + 1}`,
      slug: `extra-backlink-${index + 1}`,
      relatedArticleIds: ["planets-in-birth-chart"],
      relatedSlugs: [],
    })),
  ];
  const cappedRelated = buildPublicWikiRelatedArticles(
    cappedRelationshipArticles[0],
    cappedRelationshipArticles,
  );
  const cappedRelatedIds = cappedRelated.map((item) => item.stableId);
  const expectedCappedIds = [
    "manual-1",
    "manual-2",
    "manual-3",
    "manual-4",
    "manual-5",
    "manual-6",
    "retrograde-planets-explained",
    "mercury-retrograde-guide",
  ];
  if (cappedRelatedIds.join("|") !== expectedCappedIds.join("|")) {
    failures.push(
      "Wiki related caps must preserve the first six manual links and reserve the remaining public slots for deterministic backlinks.",
    );
  }
  if (cappedRelated.length > 8) {
    failures.push("No public Wiki article may return more than eight related articles.");
  }
  if (
    !cappedRelatedIds.includes("retrograde-planets-explained") ||
    !cappedRelatedIds.includes("mercury-retrograde-guide")
  ) {
    failures.push(
      "The planets-in-birth-chart cap must retain retrograde-planets-explained and mercury-retrograde-guide as public backlinks.",
    );
  }

  for (const candidate of cappedRelationshipArticles) {
    if (
      buildPublicWikiRelatedArticles(candidate, cappedRelationshipArticles).length > 8
    ) {
      failures.push("Every public Wiki related list must respect the eight-item cap.");
      break;
    }
  }

  const sparseRelationshipArticles = [
    {
      stableId: "sparse-current",
      slug: "sparse-current",
      relatedArticleIds: ["sparse-manual-1", "sparse-manual-2"],
      relatedSlugs: [],
    },
    ...Array.from({ length: 2 }, (_, index) => ({
      stableId: `sparse-manual-${index + 1}`,
      slug: `sparse-manual-${index + 1}`,
      relatedArticleIds: [],
      relatedSlugs: [],
    })),
    ...Array.from({ length: 5 }, (_, index) => ({
      stableId: `sparse-backlink-${index + 1}`,
      slug: `sparse-backlink-${index + 1}`,
      relatedArticleIds: ["sparse-current"],
      relatedSlugs: [],
    })),
  ];
  const sparseRelatedIds = buildPublicWikiRelatedArticles(
    sparseRelationshipArticles[0],
    sparseRelationshipArticles,
  ).map((item) => item.stableId);
  if (
    sparseRelatedIds.join("|") !==
    "sparse-manual-1|sparse-manual-2|sparse-backlink-1|sparse-backlink-2|sparse-backlink-3|sparse-backlink-4"
  ) {
    failures.push(
      "Sparse manual related lists must be filled by up to four ordered public backlinks.",
    );
  }
}

function jsxTagName(node) {
  const opening = ts.isJsxElement(node)
    ? node.openingElement
    : ts.isJsxSelfClosingElement(node)
      ? node
      : null;
  return opening ? opening.tagName.getText() : null;
}

function containsStyleReference(node, styleName) {
  let found = false;
  const visit = (candidate) => {
    if (
      ts.isPropertyAccessExpression(candidate) &&
      ts.isIdentifier(candidate.expression) &&
      candidate.expression.text === "styles" &&
      candidate.name.text === styleName
    ) {
      found = true;
      return;
    }
    ts.forEachChild(candidate, visit);
  };
  visit(node);
  return found;
}

function jsxElementHasStyle(node, styleName) {
  const opening = ts.isJsxElement(node)
    ? node.openingElement
    : ts.isJsxSelfClosingElement(node)
      ? node
      : null;
  if (!opening) return false;
  const className = opening.attributes.properties.find(
    (attribute) =>
      ts.isJsxAttribute(attribute) &&
      attribute.name.getText() === "className",
  );
  return Boolean(
    className &&
      ts.isJsxAttribute(className) &&
      className.initializer &&
      containsStyleReference(className.initializer, styleName),
  );
}

function checkWikiArticleRelatedPresentation() {
  const sourceFile = parseSource("app/wiki/[slug]/page.tsx");
  const relatedMaps = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "relatedArticles" &&
      node.expression.name.text === "map"
    ) {
      relatedMaps.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  if (relatedMaps.length !== 1) {
    failures.push(
      "birth-chart-basics and every shared Wiki article route must render exactly one relatedArticles region.",
    );
    return;
  }

  let ancestor = relatedMaps[0].parent;
  let insideAside = false;
  let insideBottomRelatedSection = false;
  while (ancestor) {
    if (ts.isJsxElement(ancestor) || ts.isJsxSelfClosingElement(ancestor)) {
      if (jsxTagName(ancestor) === "aside") {
        insideAside = true;
      }
      if (
        jsxTagName(ancestor) === "section" &&
        jsxElementHasStyle(ancestor, "relatedSection")
      ) {
        insideBottomRelatedSection = true;
      }
    }
    ancestor = ancestor.parent;
  }

  if (insideAside || !insideBottomRelatedSection) {
    failures.push(
      "Wiki related links must render only in the bottom relatedSection, never again in the sidebar or mobile aside.",
    );
  }
}

function checkNavigation() {
  const primaryLinks = extractLinkMap("lib/config/navigation.ts", "navItems");
  const footerLinks = extractLinkMap("components/AppShell.tsx", "footerLinks");
  const primaryHrefs = primaryLinks.map((link) => link.href);
  const expectedFooterLinks = [
    { href: "/chart", label: "ساخت چارت تولد" },
    { href: "/compare", label: "تحلیل رابطه" },
    { href: "/sky", label: "آسمان امروز" },
    { href: "/wiki", label: "ویکی آسترولوژی" },
    { href: "/privacy", label: "حریم خصوصی" },
  ];

  for (const href of ["/chart", "/compare", "/sky", "/wiki"]) {
    if (!primaryHrefs.includes(href)) {
      failures.push(`Primary navigation is missing ${href}.`);
    }
  }
  for (const href of ["/product", "/privacy", "/reports", "/dashboard"]) {
    if (primaryHrefs.includes(href)) {
      failures.push(`Primary navigation exposes private route ${href}.`);
    }
  }

  if (JSON.stringify(footerLinks) !== JSON.stringify(expectedFooterLinks)) {
    failures.push("Footer quick access must contain exactly the five approved public links in product order.");
  }
}

function checkIntegrationSources() {
  const homepage = `${read("app/page.tsx")}\n${read("components/FinalEditorialPage.tsx")}\n${read("content/public-editorial-final/03-homepage.md")}`;
  const homepageLiveSky = read("components/HomepageLiveSky.tsx");
  const appShell = read("components/AppShell.tsx");
  const appShellStyles = read("components/app-shell.module.css");
  const chartPage = read("app/chart/page.tsx");
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
  requireText("Homepage", homepage, '"/sky"');
  requireText("Homepage Live Sky", homepageLiveSky, 'href="/sky"');
  requireText("Homepage", homepage, "articles.slice(0, 4)");
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

  requireText("Chart discovery", chartPage, 'getFinalEditorialPage("chart")');
  requireText("Chart discovery", chartPage, 'href: "/sky"');
  requireText("Chart discovery", chartPage, 'href: "/wiki"');
  requireText("Chart discovery styles", chartStyles, ".discoveryPrimary");
  requireText("Chart discovery styles", chartStyles, ".contextLinks");

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
    "Wiki article inline links",
    wikiArticle,
    "renderWikiText(paragraph, internalLinkTargets)",
  );
  requireText("Wiki article chart CTA", wikiArticle, 'href: "/chart"');
  requireText("Wiki article chart CTA", wikiArticle, "href={callToAction.href}");
  requireText(
    "Wiki article breadcrumb metadata",
    wikiArticle,
    "`${WIKI_BASE_URL}/wiki/category/${category.id}`",
  );

  requireText("Wiki repository", repository, "PublicWikiArticle = DatedWikiArticle");
  requireText("Wiki repository", repository, "listPublicWikiSitemapCategories");
  requireText("Wiki repository", repository, "buildPublicWikiCategoryViews");
  requireText("Wiki repository", repository, "buildPublicWikiRelatedArticles");
  requireText("Wiki repository", repository, "normalizePublicWikiUpdatedAt");

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
checkWikiArticleRelatedPresentation();
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
console.log("- the minimal footer exposes five essential routes, Instagram, and four newest Wiki articles");
console.log("- the chart page links directly to Sky and Wiki discovery surfaces");
console.log("- non-empty Wiki categories resolve newest-first public pages");
console.log("- sitemap freshness uses normalized W3C/ISO Wiki update timestamps");
console.log("- related article lists preserve up to six manual links and append up to four public backlinks within an eight-item cap");
console.log("- each Wiki article renders that capped related list once in the bottom continuation section, not again in the sidebar");
console.log("- report and dated Sky noindex boundaries remain intact");
