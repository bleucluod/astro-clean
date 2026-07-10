import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "app/wiki/page.tsx",
  "app/wiki/[slug]/page.tsx",
  "app/wiki/wiki.module.css",
  "lib/wiki/wiki-content.ts",
  "lib/config/navigation.ts",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_PROJECT_CONTEXT.md",
];

const failures = [];

for (const filePath of requiredFiles) {
  if (!existsSync(filePath)) {
    failures.push(`Missing required Wiki foundation file: ${filePath}`);
  }
}

if (failures.length === 0) {
  const indexPage = readFileSync("app/wiki/page.tsx", "utf8");
  const articlePage = readFileSync("app/wiki/[slug]/page.tsx", "utf8");
  const styles = readFileSync("app/wiki/wiki.module.css", "utf8");
  const content = readFileSync("lib/wiki/wiki-content.ts", "utf8");
  const navigation = readFileSync("lib/config/navigation.ts", "utf8");
  const seoConfig = readFileSync("lib/config/seo.ts", "utf8");
  const ideaGarden = readFileSync("docs/HALLEUS_IDEA_GARDEN.md", "utf8");
  const projectContext = readFileSync("docs/HALLEUS_PROJECT_CONTEXT.md", "utf8");

  const assertIncludes = (label, text, markers) => {
    for (const marker of markers) {
      if (!text.includes(marker)) {
        failures.push(`${label} missing marker: ${marker}`);
      }
    }
  };

  const assertExcludes = (label, text, markers) => {
    for (const marker of markers) {
      if (text.includes(marker)) {
        failures.push(`${label} still contains forbidden marker: ${marker}`);
      }
    }
  };

  assertIncludes("Wiki index", indexPage, [
    "Halleus Wiki",
    "wikiArticles",
    "wikiCategories",
    "از اینجا شروع کن",
    "نقشهٔ ویکی",
    "ساخت گزارش شخصی",
    "index: false",
    "follow: true",
  ]);

  assertExcludes("Wiki index", indexPage, [
    "Local preview",
    "Repository-backed storage",
    "Preview account",
    "Feature gate",
    "واژه‌نامه کوتاه",
  ]);

  assertIncludes("Wiki article template", articlePage, [
    "generateStaticParams",
    "generateMetadata",
    "dynamicParams = false",
    "notFound()",
    "getRelatedWikiArticles",
    'href="/chart"',
    "index: false",
    "follow: true",
  ]);

  const expectedSlugs = [
    "birth-chart-basics",
    "sun-moon-rising",
    "astrology-houses",
    "major-aspects",
  ];

  for (const slug of expectedSlugs) {
    if (!content.includes(`slug: "${slug}"`)) {
      failures.push(`Wiki content missing foundational slug: ${slug}`);
    }
  }

  const declaredSlugs = [...content.matchAll(/slug: "([a-z0-9-]+)"/g)].map(
    (match) => match[1],
  );
  const uniqueSlugs = new Set(declaredSlugs);

  if (declaredSlugs.length !== 4) {
    failures.push(`Expected exactly 4 foundational Wiki articles, found ${declaredSlugs.length}`);
  }

  if (uniqueSlugs.size !== declaredSlugs.length) {
    failures.push("Wiki article slugs are not unique");
  }

  assertIncludes("Wiki content model", content, [
    "WikiCategoryId",
    "WikiArticleSection",
    "wikiCategories",
    "wikiArticles",
    "getWikiArticle",
    "getRelatedWikiArticles",
    "Placidus",
    "Whole Sign",
    "orb",
    "پیش‌بینی قطعی",
  ]);

  assertIncludes("Wiki styles", styles, [
    ".hero",
    ".articleGrid",
    ".categoryGrid",
    ".articleLayout",
    ".stickyAside",
    "@media (max-width: 720px)",
  ]);

  assertIncludes("Public navigation", navigation, [
    'href: "/wiki"',
    'label: "ویکی"',
  ]);

  if (seoConfig.includes('path: "/wiki"')) {
    failures.push("Wiki was added to seoRoutes before keyword research/indexing approval");
  }

  assertIncludes("Idea Garden", ideaGarden, [
    "v0.1.289 wiki content foundation",
    "four foundational Persian articles",
    "noindex/follow",
    "live Persian keyword research",
  ]);

  assertIncludes("Project Context", projectContext, [
    "v0.1.289 wiki content foundation",
    "app/wiki/[slug]/page.tsx",
    "check-wiki-content-foundation.mjs",
    "No sitemap or public-report indexing change",
  ]);
}

if (failures.length > 0) {
  console.error("Wiki content foundation check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Wiki content foundation check passed.");
console.log("- four foundational Persian articles are present");
console.log("- index, article template, internal links, and report CTA are wired");
console.log("- Wiki remains noindex/follow and outside sitemap until keyword research");
