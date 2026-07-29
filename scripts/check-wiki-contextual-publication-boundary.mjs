import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const packageRequire = createRequire(pathToFileURL(path.join(root, "package.json")));
const ts = packageRequire("typescript");

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function transpile(relativePath) {
  return ts.transpileModule(read(relativePath), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: relativePath,
  }).outputText;
}

const markdownUrl = `data:text/javascript;base64,${Buffer.from(
  transpile("lib/wiki/wiki-markdown.ts"),
).toString("base64")}`;
const packageSource = transpile("lib/wiki/wiki-package.ts").replace(
  /from ["']@\/lib\/wiki\/wiki-markdown["'];/,
  `from ${JSON.stringify(markdownUrl)};`,
);
const packageParser = await import(
  `data:text/javascript;base64,${Buffer.from(packageSource).toString("base64")}`
);
const markdown = await import(markdownUrl);

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function storedZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameBytes = Buffer.from(name);
    const bytes = Buffer.from(content);
    const crc = crc32(bytes);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(bytes.length, 18);
    local.writeUInt32LE(bytes.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    locals.push(local, nameBytes, bytes);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(bytes.length, 20);
    central.writeUInt32LE(bytes.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + bytes.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

function article(id, relatedArticleIds = []) {
  return {
    article_id: id,
    version: 2,
    file: `articles/${id}.md`,
    title: id,
    slug: id,
    seo_title: id,
    meta_description: `توضیح متای معتبر برای ${id}`,
    category: "foundations",
    tags: [],
    summary: `خلاصهٔ معتبر برای ${id}`,
    reading_minutes: 1,
    publication_priority: 1,
    content_cluster: "boundary",
    article_role: "support",
    related_article_ids: relatedArticleIds,
    indexable: true,
  };
}

const manifest = JSON.stringify({
  schema_version: 1,
  package_id: "contextual-publication-boundary",
  articles: [article("article-a"), article("article-b", ["pillar"])],
});
const archive = storedZip([
  ["manifest.json", manifest],
  ["articles/article-a.md", "مقدمه\n\n## بخش\n\nارجاع به [[article:article-b]]."],
  ["articles/article-b.md", "مقدمه\n\n## بخش\n\nارجاع به [[article:article-a]]."],
]);
const parsed = packageParser.parseWikiPackageArchive(
  "halleus-wiki-package-boundary.zip",
  archive,
);

if (parsed.quarantinedArticles.length !== 0 || parsed.articles.length !== 2) {
  throw new Error("The reciprocal contextual-link fixture did not parse.");
}
const byId = new Map(parsed.articles.map((item) => [item.snapshot.stableId, item.snapshot]));
if (byId.get("article-a")?.relatedArticleIds.length !== 0) {
  throw new Error("A contextual link was promoted to a publication dependency.");
}
if (byId.get("article-b")?.relatedArticleIds.join(",") !== "pillar") {
  throw new Error("An explicit related_article_ids dependency was not preserved.");
}
if (
  markdown.findWikiPublicationDependencyIds(
    ["article-a", "pillar", "pillar"],
    "article-a",
  ).join(",") !== "pillar"
) {
  throw new Error("Publication dependency normalization is incorrect.");
}

for (const relativePath of [
  "lib/wiki/wiki-cms-service.ts",
  "lib/wiki/wiki-publisher.ts",
]) {
  const source = read(relativePath);
  if (!source.includes("findWikiPublicationDependencyIds(")) {
    throw new Error(`${relativePath} does not use the publication dependency boundary.`);
  }
}

console.log("Wiki contextual publication boundary check passed.");
console.log("- reciprocal inline links remain contextual references");
console.log("- only explicit related_article_ids control publication ordering");
