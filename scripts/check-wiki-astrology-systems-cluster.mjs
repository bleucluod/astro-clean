import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "lib/wiki/wiki-content.ts",
  "app/wiki/page.tsx",
  "app/wiki/[slug]/page.tsx",
  "app/sitemap.ts",
  "src/lib/chart/real-chart-engine.ts",
  "package.json",
];

const failures = [];

for (const filePath of requiredFiles) {
  if (!existsSync(filePath)) {
    failures.push(`missing required file: ${filePath}`);
  }
}

const requireText = (label, text, marker) => {
  if (!text.includes(marker)) {
    failures.push(`${label} missing marker: ${marker}`);
  }
};

const forbidText = (label, text, marker) => {
  if (text.includes(marker)) {
    failures.push(`${label} contains forbidden marker: ${marker}`);
  }
};

if (failures.length === 0) {
  const content = readFileSync("lib/wiki/wiki-content.ts", "utf8");
  const indexPage = readFileSync("app/wiki/page.tsx", "utf8");
  const articlePage = readFileSync("app/wiki/[slug]/page.tsx", "utf8");
  const sitemap = readFileSync("app/sitemap.ts", "utf8");
  const engine = readFileSync("src/lib/chart/real-chart-engine.ts", "utf8");
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

  const expectedSlugs = [
    "what-is-astrology",
    "what-is-tropical-astrology",
    "what-is-sidereal-astrology",
    "what-is-vedic-astrology",
  ];
  const allSlugs = [...content.matchAll(/slug: "([a-z0-9-]+)"/g)].map(
    (match) => match[1],
  );

  if (allSlugs.length !== 19) {
    failures.push(`expected 19 Wiki articles, found ${allSlugs.length}`);
  }
  if (new Set(allSlugs).size !== allSlugs.length) {
    failures.push("Wiki slugs are not unique");
  }

  requireText("category model", content, '| "systems";');
  requireText("category inventory", content, 'id: "systems"');
  requireText("category inventory", content, 'label: "مکاتب و نظام‌ها"');
  requireText("Wiki index", indexPage, "تروپیکال، سایدرئال و ودیک");

  const articleBlock = (slug) => {
    const start = content.indexOf(`    slug: "${slug}"`);
    if (start === -1) return "";
    const next = content.indexOf("\n  {\n    slug: ", start + 1);
    return content.slice(start, next === -1 ? content.length : next);
  };

  for (const slug of expectedSlugs) {
    const block = articleBlock(slug);
    if (!block) {
      failures.push(`missing systems article: ${slug}`);
      continue;
    }
    requireText(slug, block, 'categoryId: "systems"');
    requireText(slug, block, "seoTitle:");
    requireText(slug, block, "metaDescription:");
    requireText(slug, block, "contextLinks:");
    requireText(slug, block, "sources:");
    requireText(slug, block, "callToAction:");
    requireText(slug, block, "relatedSlugs:");

    const sectionCount = [...block.matchAll(/title: "/g)].length;
    if (sectionCount < 12) {
      failures.push(`${slug} is unexpectedly shallow: ${sectionCount} titled blocks`);
    }
  }

  const mother = articleBlock("what-is-astrology");
  const tropical = articleBlock("what-is-tropical-astrology");
  const sidereal = articleBlock("what-is-sidereal-astrology");
  const vedic = articleBlock("what-is-vedic-astrology");

  for (const slug of expectedSlugs.slice(1)) {
    requireText(slug, articleBlock(slug), 'href: "/wiki/what-is-astrology"');
  }
  for (const slug of expectedSlugs.slice(1)) {
    requireText("mother article", mother, `href: "/wiki/${slug}"`);
  }

  requireText("tropical article", tropical, "هالیوس در محاسبهٔ فعلی چارت تولد از زودیاک تروپیکال استفاده می‌کند");
  requireText("tropical CTA", tropical, 'href: "/chart"');
  requireText("sidereal boundary", sidereal, "هالیوس چارت سایدرئال تولید نمی‌کند");
  requireText("Vedic boundary", vedic, "هالیوس چارت ودیک تولید نمی‌کند");
  forbidText("sidereal article", sidereal, 'href: "/chart"');
  forbidText("Vedic article", vedic, 'href: "/chart"');
  forbidText("Wiki content", content, "utm_source=");
  forbidText("Wiki content", content, "[LINK:");

  requireText("source model", content, "WikiArticleSource");
  requireText("source renderer", articlePage, 'target="_blank"');
  requireText("source renderer", articlePage, 'rel="noreferrer"');
  requireText("sitemap", sitemap, "wikiArticles.map");

  requireText("engine evidence", engine, "tropical obliquity");
  forbidText("engine evidence", engine.toLowerCase(), "ayanamsha");

  if (
    packageJson.scripts?.["check:wiki-astrology-systems-cluster"] !==
    "node scripts/check-wiki-astrology-systems-cluster.mjs"
  ) {
    failures.push("package.json is missing the focused systems-cluster guard");
  }
  if (
    !packageJson.scripts?.["check:project"]?.includes(
      "pnpm run check:wiki-astrology-systems-cluster",
    )
  ) {
    failures.push("check:project does not include the systems-cluster guard");
  }
}

if (failures.length > 0) {
  console.error("Wiki astrology systems cluster check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Wiki astrology systems cluster check passed.");
console.log("- four connected Persian systems articles are present with SEO metadata and sources");
console.log("- Halleus is identified as tropical without claiming current sidereal or Vedic output");
console.log("- all 19 Wiki articles remain generated through the shared sitemap path");
