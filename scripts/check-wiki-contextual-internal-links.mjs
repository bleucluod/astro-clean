import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const houseHubSlug = "astrology-houses";
const houseArticleSlugs = [
  "first-house-in-natal-chart",
  "second-house-in-natal-chart",
  "third-house-in-natal-chart",
  "fourth-house-in-natal-chart",
  "fifth-house-in-natal-chart",
  "sixth-house-in-natal-chart",
  "seventh-house-in-natal-chart",
  "eighth-house-in-natal-chart",
  "ninth-house-in-natal-chart",
  "tenth-house-in-natal-chart",
  "eleventh-house-in-natal-chart",
  "twelfth-house-in-natal-chart",
];
const tokenPattern = /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)\]\]/g;

async function loadDiscoveryModule() {
  const categorySource = fs.readFileSync(
    path.join(root, "lib/wiki/wiki-category-content.ts"),
    "utf8",
  );
  const categoryTranspiled = ts.transpileModule(categorySource, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: "wiki-category-content.ts",
  }).outputText;
  const categoryDataUrl = `data:text/javascript;base64,${Buffer.from(categoryTranspiled).toString("base64")}`;
  const source = fs.readFileSync(
    path.join(root, "lib/wiki/wiki-public-discovery.ts"),
    "utf8",
  ).replace(
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

function fixtureArticles() {
  return [
    {
      stableId: houseHubSlug,
      slug: houseHubSlug,
      categoryId: "houses",
      status: "published",
      intro: "",
      keyPoints: [],
      sections: [],
      contextLinks: [],
      relatedSlugs: [],
      relatedArticleIds: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    ...houseArticleSlugs.map((slug) => ({
      stableId: slug,
      slug,
      categoryId: "houses",
      status: slug.startsWith("tenth") ? "scheduled" : "published",
      intro: `[[article:${houseHubSlug}]]`,
      keyPoints: [],
      sections: [],
      contextLinks: [],
      relatedSlugs: [houseHubSlug],
      relatedArticleIds: [houseHubSlug],
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
    {
      stableId: "unrelated",
      slug: "unrelated",
      categoryId: "foundations",
      status: "published",
      intro: "",
      keyPoints: [],
      sections: [],
      contextLinks: [],
      relatedSlugs: [],
      relatedArticleIds: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
}

function readExport(exportPath) {
  const parsed = JSON.parse(fs.readFileSync(exportPath, "utf8"));
  if (!Array.isArray(parsed.articles)) {
    throw new Error("Wiki export must contain an articles array.");
  }
  return parsed.articles.filter((article) =>
    ["published", "scheduled"].includes(article.status),
  );
}

function articleTextValues(article) {
  const values = [article.intro, ...(article.keyPoints ?? [])];
  for (const section of article.sections ?? []) {
    values.push(
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []),
    );
  }
  return values.filter((value) => typeof value === "string");
}

function analyzeGraph(articles, clusterLinks) {
  const bySlug = new Map(articles.map((article) => [article.slug, article]));
  const byStableId = new Map(
    articles.map((article) => [article.stableId ?? article.slug, article]),
  );
  const outbound = new Map(
    articles.map((article) => [
      article.slug,
      {
        inline: new Set(),
        continuePath: new Set(),
        related: new Set(),
        cluster: new Set(),
        category: new Set([article.categoryId]),
        footerLatest: new Set(),
      },
    ]),
  );

  const addTarget = (targets, identifier) => {
    const target = byStableId.get(identifier) ?? bySlug.get(identifier);
    if (target) targets.add(target.slug);
  };

  for (const article of articles) {
    const groups = outbound.get(article.slug);
    for (const value of articleTextValues(article)) {
      for (const match of value.matchAll(tokenPattern)) {
        addTarget(groups.inline, match[1]);
      }
    }
    for (const link of article.contextLinks ?? []) {
      const match = link.href?.match(
        /^\/wiki\/([a-z0-9]+(?:[._-][a-z0-9]+)*)\/?$/,
      );
      if (match) addTarget(groups.continuePath, match[1]);
    }
    const relatedIds = article.relatedArticleIds?.length
      ? article.relatedArticleIds
      : article.relatedSlugs ?? [];
    for (const identifier of relatedIds) addTarget(groups.related, identifier);
  }

  for (const clusterArticle of clusterLinks) {
    outbound.get(houseHubSlug)?.cluster.add(clusterArticle.slug);
  }

  const inbound = new Map(
    articles.map((article) => [article.slug, new Set()]),
  );
  for (const [sourceSlug, groups] of outbound) {
    for (const groupName of ["inline", "continuePath", "related", "cluster"]) {
      for (const targetSlug of groups[groupName]) {
        if (targetSlug !== sourceSlug) inbound.get(targetSlug)?.add(sourceSlug);
      }
    }
  }

  return { inbound, outbound };
}

function contextualOutbound(groups) {
  return new Set([
    ...groups.inline,
    ...groups.continuePath,
    ...groups.related,
    ...groups.cluster,
  ]);
}

const { buildPublicWikiClusterArticles } = await loadDiscoveryModule();
const exportArgument = process.argv[2];
const articles = exportArgument
  ? readExport(path.resolve(exportArgument))
  : fixtureArticles();
const hub = articles.find((article) => article.slug === houseHubSlug);

if (!hub) {
  failures.push("houses hub is missing");
}

const clusterLinks = hub
  ? buildPublicWikiClusterArticles(hub, articles)
  : [];
const clusterSlugs = clusterLinks.map((article) => article.slug);
const availableHouseSlugs = houseArticleSlugs.filter((slug) =>
  articles.some((article) => article.slug === slug),
);

if (clusterSlugs.join("|") !== availableHouseSlugs.join("|")) {
  failures.push("houses hub does not expose available house articles in structural order");
}

const unrelated = articles.find((article) => article.slug !== houseHubSlug);
if (
  unrelated &&
  buildPublicWikiClusterArticles(unrelated, articles).length !== 0
) {
  failures.push("structural house links leaked onto a non-hub article");
}

const graph = analyzeGraph(articles, clusterLinks);
for (const slug of availableHouseSlugs) {
  const articleOutbound = contextualOutbound(graph.outbound.get(slug));
  if (!articleOutbound.has(houseHubSlug)) {
    failures.push(`${slug} does not link back to the houses hub`);
  }
  if (!graph.inbound.get(slug)?.has(houseHubSlug)) {
    failures.push(`${slug} has no structural contextual inbound from the houses hub`);
  }
}

const eighthInbound = graph.inbound.get("eighth-house-in-natal-chart");
if (!eighthInbound?.has(houseHubSlug)) {
  failures.push("eighth-house-in-natal-chart lacks a non-footer contextual inbound");
}

const orphanSlugs = articles
  .filter((article) => graph.inbound.get(article.slug)?.size === 0)
  .map((article) => article.slug);
const weakSlugs = articles
  .filter((article) => (graph.inbound.get(article.slug)?.size ?? 0) < 2)
  .map((article) => article.slug);
const categoryOnlySlugs = articles
  .filter((article) => {
    const groups = graph.outbound.get(article.slug);
    return contextualOutbound(groups).size === 0 && groups.category.size > 0;
  })
  .map((article) => article.slug);

if (failures.length > 0) {
  console.error("Wiki contextual internal-link check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Wiki contextual internal-link check passed.");
console.log(`- audited articles: ${articles.length}`);
console.log(`- houses linked from hub: ${clusterSlugs.length}`);
console.log(`- orphan pages reported: ${orphanSlugs.length}`);
console.log(`- weak pages reported: ${weakSlugs.length}`);
console.log(`- category-only pages reported: ${categoryOnlySlugs.length}`);
console.log("- footer/latest links are excluded from contextual inbound counts");
