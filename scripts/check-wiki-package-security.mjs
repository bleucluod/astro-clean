import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const packageRequire = createRequire(pathToFileURL(path.join(root, "package.json")));
const ts = packageRequire("typescript");

function transpile(relativePath) {
  const file = path.join(root, relativePath);
  return ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: file,
  }).outputText;
}

const markdownUrl = `data:text/javascript;base64,${Buffer.from(transpile("lib/wiki/wiki-markdown.ts")).toString("base64")}`;
const packageSource = transpile("lib/wiki/wiki-package.ts").replace(
  /from ["']@\/lib\/wiki\/wiki-markdown["'];/,
  `from ${JSON.stringify(markdownUrl)};`,
);
const parser = await import(`data:text/javascript;base64,${Buffer.from(packageSource).toString("base64")}`);

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
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

const manifest = JSON.stringify({
  schema_version: 1,
  package_id: "security-check",
  articles: [{
    article_id: "security-article", version: 1, file: "articles/security.md",
    title: "امنیت بسته", slug: "security-article", seo_title: "امنیت بسته",
    meta_description: "توضیح تست امنیت بسته ویکی", category: "foundations",
    tags: [], summary: "خلاصه تست", reading_minutes: 1, publication_priority: 1,
    content_cluster: "security", article_role: "pillar", related_article_ids: [], indexable: true,
  }],
});
const valid = storedZip([
  ["manifest.json", manifest],
  ["articles/security.md", "مقدمه\n\n## بخش\n\nمتن سالم"],
]);
const parsed = parser.parseWikiPackageArchive("halleus-wiki-package-security.zip", valid);
if (parsed.articles.length !== 1 || parsed.quarantinedArticles.length !== 0) {
  throw new Error("Valid Wiki package fixture did not parse.");
}

let traversalRejected = false;
try {
  parser.parseWikiPackageArchive("halleus-wiki-package-traversal.zip", storedZip([["../evil.txt", "bad"]]));
} catch {
  traversalRejected = true;
}
if (!traversalRejected) throw new Error("ZIP path traversal fixture was not rejected.");

let htmlQuarantined = false;
const unsafe = storedZip([
  ["manifest.json", manifest],
  ["articles/security.md", "مقدمه\n\n## بخش\n\n<script>alert(1)</script>"],
]);
const unsafeResult = parser.parseWikiPackageArchive("halleus-wiki-package-unsafe.zip", unsafe);
htmlQuarantined = unsafeResult.quarantinedArticles.length === 1;
if (!htmlQuarantined) throw new Error("Unsafe article HTML was not quarantined.");

const unsupported = storedZip([
  ["manifest.json", manifest],
  ["articles/security.md", "مقدمه با **تأکید نامعتبر**\n\n## بخش\n\n> نقل‌قول نامعتبر"],
]);
const unsupportedResult = parser.parseWikiPackageArchive(
  "halleus-wiki-package-unsupported-markdown.zip",
  unsupported,
);
const expectedUnsupportedError =
  "Package v1 supports paragraphs, H2 headings, bullets, images, and stable article links only.";
if (
  unsupportedResult.quarantinedArticles.length !== 1 ||
  unsupportedResult.quarantinedArticles[0]?.errors[0] !== expectedUnsupportedError
) {
  throw new Error("Unsupported Markdown did not produce the stable quarantine diagnostic.");
}

console.log("Wiki package security check passed.");
console.log("- a valid archive parses while path traversal is rejected and unsafe article HTML is quarantined");
console.log("- unsupported Markdown is quarantined with a stable actionable diagnostic");
