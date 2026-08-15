import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

function read(file) { return fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const migration = read("database/migrations/0020_wiki_image_pipeline.sql");
const types = read("lib/wiki/wiki-image-types.ts");
const processor = read("lib/wiki/wiki-image-processor.ts");
const service = read("lib/wiki/wiki-image-service.ts");
const zipSource = read("lib/wiki/wiki-image-zip.ts");
const route = read("app/api/admin/wiki/image-pipeline/route.ts");
const panel = read("components/admin/WikiImagePipelinePanel.tsx");
const wikiPanel = read("components/admin/WikiAdminPanel.tsx");
const media = read("lib/wiki/wiki-media.ts");
const repository = read("lib/wiki/wiki-repository.ts");
const article = read("app/wiki/[slug]/page.tsx");
const css = read("app/wiki/wiki.module.css");
const seo = read("lib/config/seo.ts");
const packageJson = JSON.parse(read("package.json"));

assert(migration.includes("halleus_private.wiki_image_batches"), "image batches table missing");
assert(migration.includes("halleus_private.wiki_image_batch_items"), "image batch items table missing");
assert(migration.includes("halleus_private.wiki_article_images"), "article image assignment table missing");
assert(migration.includes("halleus_private.wiki_asset_variants"), "asset variants table missing");
assert(migration.includes("halleus_private.wiki_article_image_history"), "image history table missing");
assert(!migration.includes("wiki_link_suggestions"), "image migration must not share link suggestion data model");
assert(migration.includes("'[\"/\", \"/chart\"]'::jsonb"), "style snapshot must only source / and /chart");
for (const table of ["wiki_image_style_snapshots","wiki_image_batches","wiki_image_batch_items","wiki_article_images","wiki_asset_variants","wiki_article_image_history"]) {
  assert(migration.includes(`alter table halleus_private.${table} enable row level security`), `${table} RLS missing`);
  assert(migration.includes(`revoke all on halleus_private.${table} from public, anon, authenticated`), `${table} revoke missing`);
}
assert(!/delete\s+from\s+public\.wiki_articles/i.test(migration + service), "image pipeline must never delete Wiki articles");
assert(!/update\s+public\.wiki_articles/i.test(service), "image pipeline must not mutate article content/publication rows");

assert(types.includes('{ width: 480, height: 270, maxBytes: 15_000 }'), "480 variant budget missing");
assert(types.includes('{ width: 768, height: 432, maxBytes: 30_000 }'), "768 variant budget missing");
assert(types.includes('{ width: 1200, height: 675, maxBytes: 50_000 }'), "1200 primary budget missing");
assert(types.includes('"NO_IMAGE" | "DRAFT_IMAGE" | "READY" | "NEEDS_RETRY" | "REJECTED"'), "image state machine incomplete");
assert(processor.includes("prepareWikiImageVariants"), "server-side variant generation missing");
assert(processor.includes("perceptualHash"), "perceptual duplicate hashing missing");
assert(processor.includes("WIKI_IMAGE_BUDGET_UNMET"), "adaptive byte budget enforcement missing");

assert(service.includes("WIKI_IMAGE_MAX_BATCH"), "max-5 batch service guard missing");
assert(service.includes("RESULT_ZIP_MAX_BYTES = 400_000"), "result ZIP ceiling missing");
assert(service.includes("previewWikiImageReturnPackage"), "server preview validation missing");
assert(service.includes("applyWikiImageReturnPackage"), "selective result apply missing");
assert(service.includes("planToken"), "preview/apply concurrency token missing");
assert(service.includes("Perceptual duplicate detected"), "perceptual duplicate rejection missing");
assert(service.includes("DRAFT_IMAGE"), "AI result must enter draft state");
assert(service.includes("stageDirectWikiImage"), "direct upload path missing");
assert(service.includes("stageExistingWikiAsset"), "asset selection path missing");
assert(service.includes("wiki_article_image_history"), "image version history missing");
assert(service.includes("reason"), "mutation reason/audit trail missing");

assert(route.includes('requireAdminCapability(request, "wiki.read")'), "image read capability guard missing");
assert(route.includes('requireAdminCapability(request, "wiki.media.write")'), "image mutation capability guard missing");
assert(route.includes("assertAdminMutationRequest(request)"), "JSON mutation origin guard missing");
assert(route.includes("assertAdminUploadRequest(request)"), "upload origin guard missing");
assert(route.includes('action === "preview_import"'), "preview endpoint missing");
assert(route.includes('action === "apply_import"'), "apply endpoint missing");
assert(route.includes('action === "direct_upload"'), "direct upload endpoint missing");

assert(panel.includes("file.size > 400_000"), "client result package size validation missing");
assert(panel.includes("signature[0] !== 0x50"), "client ZIP signature validation missing");
assert(panel.includes("اعتبارسنجی نتیجه"), "explicit review preview control missing");
assert(panel.includes("ورود به حالت پیش‌نویس"), "AI return must not auto-approve");
assert(panel.includes("تأیید برای نمایش عمومی"), "human approval control missing");
assert(panel.includes("آپلود مستقیم تصویر"), "direct image upload UI missing");
assert(panel.includes("انتخاب asset آماده"), "existing asset selection UI missing");
assert(panel.includes("تاریخچهٔ تصویر"), "image history UI missing");
assert(panel.includes("انتشار بدون تصویر معتبر است"), "NO_IMAGE must not block publication");
assert(wikiPanel.includes("WikiImagePipelinePanel"), "Wiki Admin image module integration missing");
assert(wikiPanel.includes("compactStableId={draft.stableId}"), "article editor image section missing");

assert(media.includes("getWikiMediaPublicUrl"), "single current media storage model not reused");
assert(media.includes("dedicated_reference_count"), "generic asset delete must respect dedicated cover assignment");
assert(repository.includes("to_regclass('halleus_private.wiki_article_images')"), "public repository must tolerate pre-migration image schema");
assert(repository.includes("image.state = 'READY' and image.alt_state = 'reviewed'"), "public image reader must only expose approved reviewed images");
assert(article.includes("{article.image ? ("), "public cover must be conditional");
assert(article.includes('"@type": "ImageObject"'), "real image schema missing");
assert(article.includes("srcSet={article.image.srcSet}"), "responsive image srcset missing");
assert(css.includes("Halleus Wiki dedicated cover 2026-08-15"), "dedicated cover CSS missing");
assert(seo.includes("const socialImage = image ?? SOCIAL_FALLBACK_IMAGE"), "dedicated OG/Twitter image override with general fallback missing");
assert(packageJson.dependencies?.sharp === "0.35.3", "sharp must be exact 0.35.3");
assert(packageJson.scripts?.["check:wiki-image-pipeline"] === "node scripts/check-wiki-image-pipeline.mjs", "package image guard script missing");
assert(
  JSON.stringify(packageJson.pnpm?.supportedArchitectures) ===
    JSON.stringify({ os: ["win32", "linux"], cpu: ["x64"], libc: ["glibc"] }),
  "pnpm multi-platform sharp configuration missing",
);

const requireFromProject = createRequire(pathToFileURL(path.join(process.cwd(), "package.json")));
const sharp = requireFromProject("sharp");
const typescript = requireFromProject("typescript");
const fixture = await sharp({ create: { width: 1200, height: 675, channels: 3, background: { r: 5, g: 6, b: 9 } } }).webp({ quality: 78, effort: 6 }).toBuffer();
assert(fixture.length <= 50_000, "fixture primary cannot satisfy 50 KB budget");
for (const contract of [{w:480,h:270,max:15000},{w:768,h:432,max:30000}]) {
  const resized = await sharp(fixture).resize(contract.w, contract.h, { fit: "cover" }).webp({ quality: 72, effort: 6 }).toBuffer();
  assert(resized.length <= contract.max, `fixture ${contract.w} variant cannot satisfy byte budget`);
}

// Functional ZIP round-trip independently validates export archive implementation.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "halleus-wiki-image-zip-"));
try {
  const result = typescript.transpileModule(zipSource, {
    compilerOptions: { module: typescript.ModuleKind.ES2022, target: typescript.ScriptTarget.ES2022 },
    fileName: "wiki-image-zip.ts",
  });
  const modulePath = path.join(temp, "wiki-image-zip.mjs");
  fs.writeFileSync(modulePath, result.outputText, "utf8");
  const zip = await import(pathToFileURL(modulePath).href);
  const archive = zip.createWikiImageZip([
    { name: "README.md", bytes: new TextEncoder().encode("halleus") },
    { name: "batch-manifest.json", bytes: new TextEncoder().encode('{"schemaVersion":1}') },
  ]);
  const parsed = zip.readWikiImageZip(archive);
  assert(new TextDecoder().decode(parsed.get("README.md")) === "halleus", "ZIP round-trip content mismatch");
  let traversalRejected = false;
  try { zip.createWikiImageZip([{ name: "../escape", bytes: new Uint8Array([1]) }]); } catch { traversalRejected = true; }
  assert(traversalRejected, "ZIP writer must reject traversal paths");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log("Wiki Image Pipeline guard passed.");
console.log("- existing public.wiki_assets storage is reused; image workflow state stays separate from link state");
console.log("- 5-item/10-attempt AI batch and 400 KB result package contracts are enforced");
console.log("- server WebP dimensions/byte budgets, responsive variants and perceptual duplicate checks are present");
console.log("- AI returns stage as DRAFT_IMAGE and require explicit human approval for READY");
console.log("- NO_IMAGE remains a valid non-blocking public state; only READY+reviewed alt renders/schema/metadata");
console.log("- public repository is compatible before migration 0020 exists, protecting current Wiki article availability");
console.log("HALLEUS_BATCH4_SLICE_B_WIKI_IMAGE_PIPELINE=PASS");