import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

import type {
  ValidatedWikiPackage,
  WikiArticleSnapshot,
  WikiPackageArticleManifest,
  WikiPackageManifest,
} from "@/lib/wiki/wiki-cms-types";
import { parseWikiMarkdown } from "@/lib/wiki/wiki-markdown";

const MAX_ARCHIVE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;
const MAX_ENTRY_BYTES = 5 * 1024 * 1024;
const MAX_ENTRY_COUNT = 100;
const MAX_COMPRESSION_RATIO = 200;
const validPathPattern = /^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/;
const stableIdPattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type ZipDirectoryEntry = {
  name: string;
  method: number;
  flags: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function findEndOfCentralDirectory(buffer: Buffer) {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("ZIP central directory was not found.");
}

function normalizeEntryName(value: string) {
  const name = value.normalize("NFC");
  if (
    !name ||
    name.includes("\\") ||
    name.includes("\0") ||
    name.startsWith("/") ||
    name.startsWith(".") ||
    name.split("/").some((segment) => segment === ".." || segment === "") ||
    !validPathPattern.test(name)
  ) {
    throw new Error(`Unsafe ZIP entry path: ${value}`);
  }
  return name;
}

function readZipDirectory(buffer: Buffer) {
  const endOffset = findEndOfCentralDirectory(buffer);
  const disk = buffer.readUInt16LE(endOffset + 4);
  const directoryDisk = buffer.readUInt16LE(endOffset + 6);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const directorySize = buffer.readUInt32LE(endOffset + 12);
  const directoryOffset = buffer.readUInt32LE(endOffset + 16);
  if (disk !== 0 || directoryDisk !== 0) {
    throw new Error("Multi-disk ZIP archives are not supported.");
  }
  if (entryCount === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) {
    throw new Error("ZIP64 archives are not supported.");
  }
  if (entryCount < 1 || entryCount > MAX_ENTRY_COUNT) {
    throw new Error(`ZIP must contain between 1 and ${MAX_ENTRY_COUNT} entries.`);
  }
  if (directoryOffset + directorySize > endOffset) {
    throw new Error("ZIP central directory bounds are invalid.");
  }

  const entries: ZipDirectoryEntry[] = [];
  const seen = new Set<string>();
  let cursor = directoryOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("ZIP central directory entry is invalid.");
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const crc = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd + extraLength + commentLength > buffer.length) {
      throw new Error("ZIP entry metadata exceeds archive bounds.");
    }
    const rawName = buffer.subarray(nameStart, nameEnd).toString("utf8");
    cursor = nameEnd + extraLength + commentLength;
    if (rawName.endsWith("/")) {
      continue;
    }
    const name = normalizeEntryName(rawName);
    const caseKey = name.toLowerCase();
    if (seen.has(caseKey)) {
      throw new Error(`Duplicate ZIP entry path: ${name}`);
    }
    seen.add(caseKey);
    if ((flags & 0x1) !== 0) {
      throw new Error(`Encrypted ZIP entries are not accepted: ${name}`);
    }
    if (method !== 0 && method !== 8) {
      throw new Error(`Unsupported ZIP compression method for ${name}.`);
    }
    if (uncompressedSize > MAX_ENTRY_BYTES) {
      throw new Error(`ZIP entry is larger than 5 MB: ${name}`);
    }
    if (compressedSize === 0 && uncompressedSize > 0) {
      throw new Error(`ZIP entry has an invalid compressed size: ${name}`);
    }
    if (uncompressedSize / Math.max(compressedSize, 1) > MAX_COMPRESSION_RATIO) {
      throw new Error(`ZIP entry compression ratio is unsafe: ${name}`);
    }
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("ZIP uncompressed payload exceeds 20 MB.");
    }
    entries.push({ name, method, flags, crc, compressedSize, uncompressedSize, localOffset });
  }
  return entries;
}

function extractZipEntries(buffer: Buffer) {
  const result = new Map<string, Uint8Array>();
  for (const entry of readZipDirectory(buffer)) {
    const offset = entry.localOffset;
    if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) {
      throw new Error(`ZIP local header is invalid: ${entry.name}`);
    }
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const dataStart = offset + 30 + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataEnd > buffer.length) {
      throw new Error(`ZIP entry exceeds archive bounds: ${entry.name}`);
    }
    const compressed = buffer.subarray(dataStart, dataEnd);
    const bytes = entry.method === 0
      ? new Uint8Array(compressed)
      : new Uint8Array(inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_BYTES }));
    if (bytes.length !== entry.uncompressedSize || crc32(bytes) !== entry.crc) {
      throw new Error(`ZIP entry integrity check failed: ${entry.name}`);
    }
    result.set(entry.name, bytes);
  }
  return result;
}

function readText(entries: Map<string, Uint8Array>, path: string) {
  const bytes = entries.get(path);
  if (!bytes) {
    throw new Error(`Package file is missing: ${path}`);
  }
  const text = Buffer.from(bytes).toString("utf8");
  if (text.includes("\ufffd")) {
    throw new Error(`Package file is not valid UTF-8: ${path}`);
  }
  return text;
}

function objectValue(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, label: string, max = 1000) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > max) {
    throw new Error(`${label} is required and must be at most ${max} characters.`);
  }
  return text;
}

function stringArray(value: unknown, label: string, maxItems = 30) {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new Error(`${label} must be an array with at most ${maxItems} items.`);
  }
  return value.map((item, index) => stringValue(item, `${label}[${index}]`, 160));
}

function integerValue(value: unknown, label: string, minimum: number, maximum: number) {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}.`);
  }
  return Number(value);
}

function parseArticleManifest(raw: unknown, index: number): WikiPackageArticleManifest {
  const item = objectValue(raw, `articles[${index}]`);
  const articleId = stringValue(item.article_id, `articles[${index}].article_id`, 160);
  const slug = stringValue(item.slug, `articles[${index}].slug`, 160);
  const file = normalizeEntryName(stringValue(item.file, `articles[${index}].file`, 300));
  if (!stableIdPattern.test(articleId)) {
    throw new Error(`Invalid stable article ID: ${articleId}`);
  }
  if (!slugPattern.test(slug)) {
    throw new Error(`Invalid Wiki slug: ${slug}`);
  }
  if (!file.startsWith("articles/") || !file.endsWith(".md")) {
    throw new Error(`Article Markdown must be inside articles/: ${file}`);
  }
  const role = stringValue(item.article_role, `articles[${index}].article_role`, 20);
  if (role !== "pillar" && role !== "support") {
    throw new Error(`Unsupported article role for ${articleId}.`);
  }
  return {
    article_id: articleId,
    version: integerValue(item.version, `articles[${index}].version`, 1, 1_000_000),
    file,
    title: stringValue(item.title, `articles[${index}].title`, 300),
    slug,
    seo_title: stringValue(item.seo_title, `articles[${index}].seo_title`, 300),
    meta_description: stringValue(item.meta_description, `articles[${index}].meta_description`, 1000),
    category: stringValue(item.category, `articles[${index}].category`, 160),
    tags: stringArray(item.tags, `articles[${index}].tags`),
    summary: stringValue(item.summary, `articles[${index}].summary`, 2000),
    reading_minutes: integerValue(item.reading_minutes, `articles[${index}].reading_minutes`, 1, 240),
    publication_priority: integerValue(item.publication_priority, `articles[${index}].publication_priority`, 0, 300),
    content_cluster: stringValue(item.content_cluster, `articles[${index}].content_cluster`, 160),
    article_role: role,
    related_article_ids: stringArray(item.related_article_ids, `articles[${index}].related_article_ids`),
    indexable: item.indexable === true,
    short_title: typeof item.short_title === "string" ? stringValue(item.short_title, `articles[${index}].short_title`, 200) : undefined,
    sources: Array.isArray(item.sources) ? item.sources as WikiPackageArticleManifest["sources"] : undefined,
    call_to_action: item.call_to_action && typeof item.call_to_action === "object"
      ? item.call_to_action as WikiPackageArticleManifest["call_to_action"]
      : undefined,
  };
}

function parseManifest(text: string): WikiPackageManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("manifest.json is not valid JSON.");
  }
  const value = objectValue(raw, "manifest.json");
  if (value.schema_version !== 1) {
    throw new Error("Only Wiki package schema_version 1 is supported.");
  }
  const packageId = stringValue(value.package_id, "package_id", 160);
  if (!stableIdPattern.test(packageId)) {
    throw new Error("package_id must be a stable lowercase identifier.");
  }
  if (!Array.isArray(value.articles) || value.articles.length < 1 || value.articles.length > 50) {
    throw new Error("manifest.json must contain between 1 and 50 articles.");
  }
  const articles = value.articles.map(parseArticleManifest);
  const ids = articles.map((item) => item.article_id);
  const slugs = articles.map((item) => item.slug);
  if (new Set(ids).size !== ids.length || new Set(slugs).size !== slugs.length) {
    throw new Error("Article IDs and slugs must be unique inside a package.");
  }
  const assets = value.assets === undefined ? undefined : (() => {
    if (!Array.isArray(value.assets) || value.assets.length > 50) {
      throw new Error("manifest assets must be an array with at most 50 items.");
    }
    const parsedAssets = value.assets.map((rawAsset, index) => {
      const asset = objectValue(rawAsset, `assets[${index}]`);
      const path = normalizeEntryName(stringValue(asset.path, `assets[${index}].path`, 300));
      if (!path.startsWith("assets/")) {
        throw new Error(`Asset must be inside assets/: ${path}`);
      }
      return { path, alt: stringValue(asset.alt, `assets[${index}].alt`, 500) };
    });
    if (new Set(parsedAssets.map((asset) => asset.path.toLowerCase())).size !== parsedAssets.length) {
      throw new Error("Asset paths must be unique inside a package.");
    }
    return parsedAssets;
  })();
  return { schema_version: 1, package_id: packageId, articles, assets };
}

function detectImageMime(path: string, bytes: Uint8Array) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png") && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return "image/png" as const;
  }
  if ((lower.endsWith(".jpg") || lower.endsWith(".jpeg")) && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9) {
    return "image/jpeg" as const;
  }
  if (lower.endsWith(".webp") && Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" && Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP") {
    return "image/webp" as const;
  }
  throw new Error(`Asset type or file signature is not allowed: ${path}`);
}

export function parseWikiPackageArchive(
  fileName: string,
  archiveBytes: Uint8Array,
): ValidatedWikiPackage {
  if (!/^halleus-wiki-package-[A-Za-z0-9._-]+\.zip$/.test(fileName)) {
    throw new Error("ZIP name must match halleus-wiki-package-*.zip.");
  }
  if (archiveBytes.length < 22 || archiveBytes.length > MAX_ARCHIVE_BYTES) {
    throw new Error("Wiki package ZIP must be between 22 bytes and 10 MB.");
  }
  const buffer = Buffer.from(archiveBytes);
  const entries = extractZipEntries(buffer);
  const allowedPaths = new Set(["manifest.json"]);
  const manifest = parseManifest(readText(entries, "manifest.json"));
  for (const article of manifest.articles) {
    allowedPaths.add(article.file);
  }
  for (const asset of manifest.assets ?? []) {
    allowedPaths.add(asset.path);
  }
  for (const path of entries.keys()) {
    if (!allowedPaths.has(path)) {
      throw new Error(`ZIP contains an undeclared file: ${path}`);
    }
  }
  for (const path of allowedPaths) {
    if (!entries.has(path)) {
      throw new Error(`Declared package file is missing: ${path}`);
    }
  }

  const assets = (manifest.assets ?? []).map((asset) => {
    const bytes = entries.get(asset.path)!;
    return {
      path: asset.path,
      alt: asset.alt,
      bytes,
      mimeType: detectImageMime(asset.path, bytes),
      contentHash: createHash("sha256").update(bytes).digest("hex"),
    };
  });
  const assetPaths = new Set(assets.map((asset) => asset.path));

  const articles: ValidatedWikiPackage["articles"] = [];
  const quarantinedArticles: ValidatedWikiPackage["quarantinedArticles"] = [];
  for (const article of manifest.articles) {
    try {
      const bodyMarkdown = readText(entries, article.file);
      const parsed = parseWikiMarkdown(bodyMarkdown);
      for (const path of parsed.assetPaths) {
        if (!assetPaths.has(path)) {
          throw new Error(`${article.article_id} references an undeclared asset: ${path}`);
        }
      }
      const allRelated = [...new Set([...article.related_article_ids, ...parsed.internalArticleIds])];
      const snapshot: WikiArticleSnapshot = {
      stableId: article.article_id,
      slug: article.slug,
      title: article.title,
      shortTitle: article.short_title ?? article.title,
      seoTitle: article.seo_title,
      metaDescription: article.meta_description,
      categoryId: article.category,
      tags: article.tags,
      summary: article.summary,
      intro: parsed.intro || article.summary,
      readingMinutes: article.reading_minutes,
      publicationPriority: article.publication_priority,
      contentCluster: article.content_cluster,
      articleRole: article.article_role,
      relatedArticleIds: allRelated,
      indexable: article.indexable,
      bodyMarkdown,
      keyPoints: parsed.keyPoints.length ? parsed.keyPoints : [article.summary],
      sections: parsed.sections,
      contextLinks: [],
      sources: article.sources ?? [],
      callToAction: article.call_to_action ?? null,
      contentVersion: article.version,
      };
      articles.push({ manifest: article, snapshot, assetPaths: parsed.assetPaths });
    } catch (error) {
      quarantinedArticles.push({
        manifest: article,
        errors: [error instanceof Error ? error.message : "Article validation failed."],
      });
    }
  }

  return {
    fileName,
    packageHash: createHash("sha256").update(archiveBytes).digest("hex"),
    manifest,
    articles,
    quarantinedArticles,
    assets,
  };
}
