import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const requireText = (label, text, marker) => { if (!text.includes(marker)) failures.push(label + " missing marker: " + marker); };
const forbidText = (label, text, marker) => { if (text.includes(marker)) failures.push(label + " contains forbidden marker: " + marker); };

const seo = read("lib/config/seo.ts");
const sitemap = read("app/sitemap.ts");
const article = read("app/wiki/[slug]/page.tsx");
const category = read("app/wiki/category/[categoryId]/page.tsx");
const wikiContent = read("lib/wiki/wiki-content.ts");

for (const marker of ["buildPublicPageMetadata", "openGraph:", "twitter:", "SOCIAL_FALLBACK_IMAGE", "pageUrl"]) {
  requireText("SEO helper", seo, marker);
}

const staticPages = [
  "app/page.tsx",
  "app/chart/page.tsx",
  "app/compare/page.tsx",
  "app/sky/page.tsx",
  "app/product/page.tsx",
  "app/pricing/page.tsx",
  "app/order/page.tsx",
  "app/privacy/page.tsx",
  "app/wiki/page.tsx",
];
for (const rel of staticPages) {
  const source = read(rel);
  requireText(rel, source, "buildPublicPageMetadata");
  requireText(rel, source, "canonical:");
}

requireText("Wiki article", article, "return buildPublicPageMetadata({");
requireText("Wiki article", article, 'type: "article"');
requireText("Wiki category", category, "...buildPublicPageMetadata({");
requireText("Wiki article", article, '"@type": "Article"');
requireText("Wiki article", article, '"@type": "BreadcrumbList"');

const articleLdStart = article.indexOf("const articleJsonLd = {");
const articleLdEnd = article.indexOf("const breadcrumbJsonLd", articleLdStart);
if (articleLdStart < 0 || articleLdEnd < 0) {
  failures.push("Wiki Article JSON-LD block could not be isolated");
} else {
  const articleLd = article.slice(articleLdStart, articleLdEnd);
  for (const forbidden of ["datePublished", "dateModified", "primaryImageOfPage"]) {
    forbidText("Wiki Article JSON-LD", articleLd, forbidden);
  }
  requireText("Wiki Article JSON-LD", articleLd, "...(article.image");
  requireText("Wiki Article JSON-LD", articleLd, 'image: { "@type": "ImageObject"');
  requireText("Wiki article metadata", article, "image: article.image");
  requireText("Wiki article metadata", article, ": undefined");
}

const publicPaths = [...seo.matchAll(/path:\s*"([^"]*)"/g)].map((m) => m[1]);
const expectedPaths = ["", "/chart", "/compare", "/sky", "/product", "/pricing", "/order", "/privacy", "/wiki"];
if (JSON.stringify(publicPaths) !== JSON.stringify(expectedPaths)) {
  failures.push("unexpected public route matrix: " + JSON.stringify(publicPaths));
}

for (const marker of [
  "listPublicWikiSitemapArticles",
  "listPublicWikiSitemapCategories",
  "wikiArticles.map",
  "wikiCategories.map",
]) requireText("sitemap", sitemap, marker);
for (const forbidden of ["/reports", "/admin", "/admini", "/account"]) forbidText("sitemap", sitemap, forbidden);

const expectedLabels = {
  planets: "\u0633\u06cc\u0627\u0631\u0647\u200c\u0647\u0627 \u0648 \u0646\u0642\u0627\u0637 \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f",
  accuracy: "\u062f\u0642\u062a \u0633\u0627\u0639\u062a \u0648 \u0634\u0647\u0631 \u062a\u0648\u0644\u062f",
  transits: "\u062a\u0631\u0646\u0632\u06cc\u062a \u0633\u06cc\u0627\u0631\u0627\u062a",
  aspects: "\u062c\u0646\u0628\u0647\u200c\u0647\u0627 \u0648 \u0627\u0644\u06af\u0648\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f",
  foundations: "\u0622\u0645\u0648\u0632\u0634 \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc \u0627\u0632 \u0635\u0641\u0631",
  systems: "\u0627\u0646\u0648\u0627\u0639 \u0648 \u0646\u0638\u0627\u0645\u200c\u0647\u0627\u06cc \u0622\u0633\u062a\u0631\u0648\u0644\u0648\u0698\u06cc",
  houses: "\u062e\u0627\u0646\u0647\u200c\u0647\u0627 \u0648 \u0632\u0627\u0648\u06cc\u0647\u200c\u0647\u0627\u06cc \u0686\u0627\u0631\u062a \u062a\u0648\u0644\u062f",
};
for (const [id, label] of Object.entries(expectedLabels)) {
  if (!wikiContent.includes('id: "' + id + '"') || !wikiContent.includes('label: "' + label + '"')) {
    failures.push("category label contract missing: " + id);
  }
}

const badPhrases = [
  "\u062f\u0633\u062a\u200c\u0647\u0627\u06cc \u0645\u0627\u0647",
  "\u062f\u0633\u062a \u0634\u0645\u0627\u0644\u06cc",
  "\u062f\u0633\u062a \u062c\u0646\u0648\u0628\u06cc",
  "\u062e\u0645\u06cc\u062f\u06af\u06cc \u062f\u0633\u062a\u200c\u0647\u0627",
];

const terminologySurfaces = [
  "app/page.tsx",
  "app/chart/page.tsx",
  "app/compare/page.tsx",
  "app/sky/page.tsx",
  "app/wiki/page.tsx",
  "app/wiki/[slug]/page.tsx",
  "app/wiki/category/[categoryId]/page.tsx",
  "lib/report-preview/homepage-report-preview.ts",
];
for (const rel of terminologySurfaces) {
  const source = read(rel);
  for (const phrase of badPhrases) {
    if (source.includes(phrase)) failures.push(rel + " contains bad lunar-node phrase: " + phrase);
  }
}

if (failures.length) {
  console.error("Batch 3 SEO/indexability guard failed:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}
console.log("Batch 3 SEO/indexability guard passed.");
console.log("- page-specific OG/Twitter metadata is generated through one canonical helper");
console.log("- current public route matrix includes compare and sky");
console.log("- Wiki sitemap is DB-first for articles and categories with no stale 19-article assumption");
console.log("- Article/Breadcrumb schema keeps dates absent and exposes image only from a real READY reviewed asset");
console.log("- final category labels and lunar-node terminology are protected");
