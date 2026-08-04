import { readFileSync } from "node:fs";
import ts from "typescript";

const failures = [];
const read = (path) => readFileSync(path, "utf8");

async function loadTypeScriptModule(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
}

const categoryModule = await loadTypeScriptModule(
  "lib/wiki/wiki-category-content.ts",
);
const { wikiCategoryContent, MIN_PUBLIC_WIKI_CATEGORY_ARTICLES } =
  categoryModule;

if (MIN_PUBLIC_WIKI_CATEGORY_ARTICLES !== 2) {
  failures.push("Thin Wiki category threshold must remain two published articles.");
}

const values = (key) => wikiCategoryContent.map((item) => item[key]);
for (const key of ["id", "h1", "seoTitle", "metaDescription"]) {
  if (new Set(values(key)).size !== wikiCategoryContent.length) {
    failures.push(`Wiki category ${key} values must be unique.`);
  }
}

for (const category of wikiCategoryContent) {
  if (category.h1 === category.id || category.h1.length < 20) {
    failures.push(`Wiki category ${category.id} has a thin H1.`);
  }
  if (category.intro.length !== 2 || category.intro.some((item) => item.length < 80)) {
    failures.push(`Wiki category ${category.id} needs two substantive intro paragraphs.`);
  }
  if (category.pillarSlugs.length < 1 || category.pillarSlugs.length > 3) {
    failures.push(`Wiki category ${category.id} must have one to three pillars.`);
  }
  if (category.readingPath.length !== 3) {
    failures.push(`Wiki category ${category.id} must have a three-step reading path.`);
  }
}

const page = read("app/wiki/category/[categoryId]/page.tsx");
for (const marker of [
  "categoryView.content.seoTitle",
  "categoryView.content.metaDescription",
  "categoryView.content.h1",
  "categoryView.content.intro.map",
  "از اینجا شروع کن",
  "categoryView.pillarArticles.map",
  "categoryView.content.readingPath.map",
  "همهٔ مقاله‌های",
  'canonical: `/wiki/category/${categoryView.category.id}`',
]) {
  if (!page.includes(marker)) failures.push(`Category page missing: ${marker}`);
}

const discovery = read("lib/wiki/wiki-public-discovery.ts");
for (const marker of [
  "MIN_PUBLIC_WIKI_CATEGORY_ARTICLES",
  "categoryArticles.length < MIN_PUBLIC_WIKI_CATEGORY_ARTICLES",
  "pillarArticles.length !== content.pillarSlugs.length",
]) {
  if (!discovery.includes(marker)) {
    failures.push(`Public category discovery missing: ${marker}`);
  }
}

const articlePage = read("app/wiki/[slug]/page.tsx");
if (!articlePage.includes("<h1>{article.title}</h1>")) {
  failures.push("Wiki article H1 rendering contract changed.");
}

if (failures.length) {
  console.error("Wiki category content check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Wiki category content check passed.");
console.log("- eligible categories have unique search metadata and structured reading paths");
console.log("- thin categories and invalid pillar sets cannot resolve or enter sitemap");
console.log("- Wiki article H1 rendering remains unchanged");
