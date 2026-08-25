import { createHash, randomUUID } from "node:crypto";
import type { TransactionSql } from "postgres";

import { AdminAccessError, type VerifiedAdminActor } from "@/lib/admin/admin-auth";
import { asNumber, asRecord, asString, getAdminDatabase } from "@/lib/admin/admin-database";
import {
  getWikiMediaPublicUrl,
  putWikiMediaObject,
  removeWikiMediaObjects,
  storeWikiMedia,
} from "@/lib/wiki/wiki-media";
import {
  normalizeWikiImagePrimary,
  perceptualDistance,
  prepareWikiImageVariants,
  sha256,
} from "@/lib/wiki/wiki-image-processor";
import {
  WIKI_IMAGE_MAX_ATTEMPTS,
  WIKI_IMAGE_MAX_BATCH,
  WIKI_IMAGE_STYLE_VERSION,
  type WikiImageArticleRow,
  type WikiImageReturnManifest,
  type WikiImageReturnManifestItem,
  type WikiImageStoredState,
  type WikiImageVariant,
} from "@/lib/wiki/wiki-image-types";
import { createWikiImageZip, readWikiImageZip } from "@/lib/wiki/wiki-image-zip";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const RESULT_ZIP_MAX_BYTES = 400_000;
const NEAR_DUPLICATE_WARNING_DISTANCE = 6;

function jsonBytes(value: unknown) {
  return encoder.encode(JSON.stringify(value, null, 2));
}

function safeRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function imageState(value: unknown): WikiImageStoredState | null {
  return ["DRAFT_IMAGE", "READY", "NEEDS_RETRY", "REJECTED"].includes(String(value))
    ? (String(value) as WikiImageStoredState)
    : null;
}

function parseVariants(value: unknown): WikiImageVariant[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw) => {
    const row = safeRecord(raw);
    return {
      width: asNumber(row.width),
      height: asNumber(row.height),
      url: asString(row.url),
      storagePath: asString(row.storagePath),
      mimeType: "image/webp" as const,
      byteSize: asNumber(row.byteSize),
      contentHash: asString(row.contentHash),
      perceptualHash: asString(row.perceptualHash),
    };
  });
}

export async function getWikiImagePipelineState(stableId?: string) {
  const sql = getAdminDatabase();
  const rows = await sql`
    select
      article.id::text as article_id,
      article.stable_id,
      article.slug,
      article.title,
      article.category_id,
      category.label as category_label,
      article.status,
      article.is_indexable,
      article.publication_priority,
      coalesce(job.run_at, article.scheduled_for)::text as publish_at,
      assignment.state,
      assignment.revision,
      assignment.alt_fa,
      assignment.alt_state,
      assignment.caption,
      assignment.provenance,
      assignment.focal_x,
      assignment.focal_y,
      assignment.warnings,
      assignment.asset_id::text,
      assignment.updated_at::text,
      asset.storage_path,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'width', variant.width,
          'height', variant.height,
          'storagePath', variant.storage_path,
          'url', ${getWikiMediaPublicUrl("")} || variant.storage_path,
          'mimeType', variant.mime_type,
          'byteSize', variant.byte_size,
          'contentHash', variant.content_hash,
          'perceptualHash', variant.perceptual_hash
        ) order by variant.width asc)
        from halleus_private.wiki_asset_variants as variant
        where variant.asset_id = assignment.asset_id
      ), '[]'::jsonb) as variants
    from public.wiki_articles as article
    join public.wiki_categories as category on category.id = article.category_id
    left join halleus_private.wiki_article_images as assignment on assignment.article_id = article.id
    left join public.wiki_assets as asset on asset.id = assignment.asset_id and asset.deleted_at is null
    left join lateral (
      select run_at
      from halleus_private.wiki_publish_jobs
      where article_id = article.id and status in ('queued','retry')
      order by run_at asc
      limit 1
    ) as job on true
    where article.deleted_at is null
      and (${stableId ?? null}::text is null or article.stable_id = ${stableId ?? null})
    order by
      case when assignment.state = 'READY' then 1 else 0 end asc,
      case when job.run_at is not null then 0 when article.status = 'published' then 1 else 2 end asc,
      job.run_at asc nulls last,
      article.publication_priority desc,
      article.updated_at desc
    limit 250
  `;

  const articles: WikiImageArticleRow[] = rows.map((raw) => {
    const row = asRecord(raw);
    const variants = parseVariants(row.variants);
    const storedState = imageState(row.state);
    return {
      articleId: asString(row.article_id),
      stableId: asString(row.stable_id),
      slug: asString(row.slug),
      title: asString(row.title),
      categoryId: asString(row.category_id),
      categoryLabel: asString(row.category_label),
      status: asString(row.status),
      indexable: Boolean(row.is_indexable),
      publicationPriority: asNumber(row.publication_priority),
      publishAt: row.publish_at ? asString(row.publish_at) : null,
      state: storedState ?? "NO_IMAGE",
      revision: row.revision === null ? null : asNumber(row.revision),
      altFa: row.alt_fa ? asString(row.alt_fa) : null,
      altState: row.alt_state === "reviewed" ? "reviewed" : row.alt_state === "draft" ? "draft" : null,
      caption: row.caption ? asString(row.caption) : null,
      provenance: row.provenance ? safeRecord(row.provenance) : null,
      focalX: row.focal_x === null ? null : asNumber(row.focal_x),
      focalY: row.focal_y === null ? null : asNumber(row.focal_y),
      warnings: safeStringArray(row.warnings),
      assetId: row.asset_id ? asString(row.asset_id) : null,
      imageUrl: variants.find((item) => item.width === 1200)?.url ?? null,
      variants,
      updatedAt: row.updated_at ? asString(row.updated_at) : null,
    };
  });

  const reusableAssetRows = await sql`
    select asset.id::text, asset.original_name, asset.alt_text,
           count(variant.*)::int as variant_count
    from public.wiki_assets as asset
    join halleus_private.wiki_asset_variants as variant on variant.asset_id=asset.id
    where asset.deleted_at is null and asset.mime_type='image/webp'
    group by asset.id, asset.original_name, asset.alt_text
    having count(variant.*) = 3
    order by max(variant.created_at) desc
    limit 100
  `;

  const libraryAssetRows = await sql`
    select
      asset.id::text,
      asset.storage_path,
      asset.original_name,
      asset.mime_type,
      asset.byte_size,
      asset.alt_text,
      asset.created_at::text,
      asset.deleted_at::text,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'width', variant.width,
          'height', variant.height,
          'storagePath', variant.storage_path,
          'url', ${getWikiMediaPublicUrl("")} || variant.storage_path,
          'mimeType', variant.mime_type,
          'byteSize', variant.byte_size,
          'contentHash', variant.content_hash,
          'perceptualHash', variant.perceptual_hash
        ) order by variant.width asc)
        from halleus_private.wiki_asset_variants as variant
        where variant.asset_id = asset.id
      ), '[]'::jsonb) as variants,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'stableId', article.stable_id,
          'title', article.title,
          'state', image.state
        ) order by article.title asc)
        from halleus_private.wiki_article_images as image
        join public.wiki_articles as article on article.id = image.article_id
        where image.asset_id = asset.id and article.deleted_at is null
      ), '[]'::jsonb) as dedicated_usages,
      (
        (select count(*) from public.wiki_articles as body_article
          where body_article.deleted_at is null
            and body_article.sections::text like ('%' || asset.storage_path || '%')) +
        (select count(*) from public.wiki_article_drafts as draft
          where draft.snapshot::text like ('%' || asset.storage_path || '%'))
      )::int as body_reference_count
    from public.wiki_assets as asset
    order by asset.created_at desc
    limit 250
  `;

  const batches = await sql`
    select
      batch.id::text,
      batch.batch_number::text,
      batch.status,
      batch.article_count,
      batch.attempt_count,
      batch.style_snapshot_version,
      batch.created_at::text,
      batch.updated_at::text,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'stableId', item.stable_id,
          'slug', item.slug,
          'title', article.title,
          'status', item.status,
          'attemptCount', item.attempt_count
        ) order by item.stable_id asc)
        from halleus_private.wiki_image_batch_items as item
        join public.wiki_articles as article on article.id = item.article_id
        where item.batch_id = batch.id
      ), '[]'::jsonb) as items
    from halleus_private.wiki_image_batches as batch
    order by batch.created_at desc
    limit 30
  `;

  return {
    styleSnapshotVersion: WIKI_IMAGE_STYLE_VERSION,
    articles,
    reusableAssets: reusableAssetRows.map((raw) => {
      const row = asRecord(raw);
      return { id: asString(row.id), originalName: asString(row.original_name), alt: asString(row.alt_text), variantCount: asNumber(row.variant_count) };
    }),
    libraryAssets: libraryAssetRows.map((raw) => {
      const row = asRecord(raw);
      const variants = parseVariants(row.variants);
      const usedBy = Array.isArray(row.dedicated_usages)
        ? row.dedicated_usages.map((rawUsage) => {
            const usage = safeRecord(rawUsage);
            return {
              stableId: asString(usage.stableId),
              title: asString(usage.title),
              state: imageState(usage.state) ?? "DRAFT_IMAGE",
            };
          })
        : [];
      const bodyReferenceCount = asNumber(row.body_reference_count);
      return {
        id: asString(row.id),
        storagePath: asString(row.storage_path),
        originalName: asString(row.original_name),
        mimeType: asString(row.mime_type),
        byteSize: asNumber(row.byte_size),
        alt: asString(row.alt_text),
        createdAt: asString(row.created_at),
        deletedAt: row.deleted_at ? asString(row.deleted_at) : null,
        variants,
        variantCount: variants.length,
        imageUrl: variants.find((item) => item.width === 480)?.url
          ?? variants.find((item) => item.width === 1200)?.url
          ?? getWikiMediaPublicUrl(asString(row.storage_path)),
        usedBy,
        bodyReferenceCount,
        usageCount: usedBy.length + bodyReferenceCount,
      };
    }),
    batches: batches.map((raw) => {
      const row = asRecord(raw);
      return {
        id: asString(row.id),
        batchNumber: asString(row.batch_number),
        status: asString(row.status),
        articleCount: asNumber(row.article_count),
        attemptCount: asNumber(row.attempt_count),
        styleSnapshotVersion: asString(row.style_snapshot_version),
        createdAt: asString(row.created_at),
        updatedAt: asString(row.updated_at),
        items: Array.isArray(row.items)
          ? row.items.map((rawItem) => {
              const item = safeRecord(rawItem);
              return {
                stableId: asString(item.stableId),
                slug: asString(item.slug),
                title: asString(item.title),
                status: asString(item.status),
                attemptCount: asNumber(item.attemptCount),
              };
            })
          : [],
      };
    }),
  };
}

const STYLE_REFERENCE = {
  version: WIKI_IMAGE_STYLE_VERSION,
  sourceRoutes: ["/", "/chart"],
  capturedAt: "2026-08-15",
  visualLanguage: "dark editorial, minimal, premium",
  backgrounds: ["#020305", "#050609", "#08090c", "#0b0d11", "#101216"],
  text: ["#ffffff", "#f4f6f8", "#edf2f7"],
  accents: ["#dceeff", "#7dd3fc", "#c4b5fd"],
  rules: [
    "one main concept",
    "vector-like forms",
    "controlled gradients",
    "no text unless explicitly required",
    "no heavy grain, noise or star clutter",
    "no fake astronomical measurement",
  ],
};

const STYLE_SNAPSHOT_CONTRACT = {
  language: "dark editorial minimal premium",
  backgrounds: ["#020305", "#050609", "#08090c", "#0b0d11", "#101216"],
  text: ["#ffffff", "#f4f6f8", "#edf2f7"],
  accents: ["#dceeff", "#7dd3fc", "#c4b5fd"],
  rules: [
    "one main concept",
    "vector-like forms",
    "controlled gradients",
    "no unintended text",
    "no heavy grain or star clutter",
    "no fake astronomical measurement",
  ],
};

async function ensureWikiImageStyleSnapshot(sql: ReturnType<typeof getAdminDatabase>) {
  await sql`
    insert into halleus_private.wiki_image_style_snapshots (version, source_routes, contract)
    values (
      ${WIKI_IMAGE_STYLE_VERSION},
      '["/", "/chart"]'::jsonb,
      jsonb_build_object(
        'language', 'dark editorial minimal premium',
        'backgrounds', jsonb_build_array('#020305', '#050609', '#08090c', '#0b0d11', '#101216'),
        'text', jsonb_build_array('#ffffff', '#f4f6f8', '#edf2f7'),
        'accents', jsonb_build_array('#dceeff', '#7dd3fc', '#c4b5fd'),
        'rules', jsonb_build_array(
          'one main concept',
          'vector-like forms',
          'controlled gradients',
          'no unintended text',
          'no heavy grain or star clutter',
          'no fake astronomical measurement'
        )
      )
    )
    on conflict (version) do nothing
  `;
}

function briefMarkdown(article: Record<string, unknown>, index: number) {
  return `# Halleus Wiki Image Brief ${index + 1}\n\n` +
    `Stable ID: ${asString(article.stable_id)}\n` +
    `Slug: ${asString(article.slug)}\n` +
    `Title: ${asString(article.title)}\n` +
    `Category: ${asString(article.category_id)}\n` +
    `Summary: ${asString(article.summary)}\n\n` +
    `Create one independent 16:9 cover. Use the style snapshot exactly. One main symbolic concept, dark editorial premium composition, controlled gradients, no visible text, no watermark, no fake chart measurements.\n`;
}

export async function createWikiImageExport(actor: VerifiedAdminActor, requestedStableIds: string[]) {
  const sql = getAdminDatabase();
  const stableIds = [...new Set(requestedStableIds.map((item) => item.trim()).filter(Boolean))];
  if (stableIds.length > WIKI_IMAGE_MAX_BATCH) throw new AdminAccessError(400, "A Wiki image batch can contain at most 5 articles.");

  await ensureWikiImageStyleSnapshot(sql);

  const candidateRows = await sql`
    select article.id::text, article.stable_id, article.slug, article.title, article.category_id,
           article.summary, article.status, article.publication_priority,
           job.run_at::text as queued_at
    from public.wiki_articles as article
    left join halleus_private.wiki_article_images as assignment on assignment.article_id = article.id and assignment.state = 'READY'
    left join lateral (
      select run_at
      from halleus_private.wiki_publish_jobs
      where article_id = article.id and status in ('queued','retry')
      order by run_at asc limit 1
    ) as job on true
    where article.deleted_at is null
      and assignment.article_id is null
    order by
      case when job.run_at is not null then 0 when article.status = 'published' then 1 else 2 end,
      job.run_at asc nulls last,
      article.publication_priority desc,
      article.updated_at desc
  `;

  const candidateByStableId = new Map(
    candidateRows.map((raw) => [asString(asRecord(raw).stable_id), raw] as const),
  );
  const candidates = stableIds.length
    ? stableIds.map((stableId) => candidateByStableId.get(stableId)).filter(Boolean)
    : candidateRows.slice(0, WIKI_IMAGE_MAX_BATCH);

  if (candidates.length < 1) throw new AdminAccessError(409, "No eligible no-image Wiki articles were found.");
  if (stableIds.length && candidates.length !== stableIds.length) throw new AdminAccessError(409, "One or more selected articles are missing, deleted, or already READY.");

  const batchId = randomUUID();
  const manifestItems = candidates.map((raw, index) => {
    const article = asRecord(raw);
    return {
      articleId: asString(article.id),
      stableId: asString(article.stable_id),
      slug: asString(article.slug),
      title: asString(article.title),
      categoryId: asString(article.category_id),
      briefVersion: 1,
      briefPath: `briefs/${String(index + 1).padStart(2, "0")}-${asString(article.slug)}.md`,
      expectedResult: `images/${asString(article.slug)}-cover.webp`,
    };
  });
  const batchManifest = {
    schemaVersion: 1,
    batchId,
    styleSnapshotVersion: WIKI_IMAGE_STYLE_VERSION,
    maxArticles: 5,
    maxAttemptsTotal: 10,
    maxAttemptsPerArticle: 2,
    primary: { mime: "image/webp", width: 1200, height: 675, maxBytes: 50_000 },
    items: manifestItems,
  };

  const entries: Array<{ name: string; bytes: Uint8Array }> = [
    {
      name: "README.md",
      bytes: encoder.encode("Halleus Wiki Image Pipeline export. Generate each article independently. Never create a collage/contact sheet. Return only reviewed 1200x675 WebP files and return-manifest.json. Max one regeneration per article, max 10 attempts total."),
    },
    { name: "batch-manifest.json", bytes: jsonBytes(batchManifest) },
    { name: "style-reference.json", bytes: jsonBytes(STYLE_REFERENCE) },
    {
      name: "return-contract.md",
      bytes: encoder.encode("Return: return-manifest.json plus images/<article-slug>-cover.webp. Max 5 files. Each must be WebP 1200x675 and <=50000 bytes. Package practical ceiling 400000 bytes. READY requires human visual QA and Persian alt draft. NEEDS_RETRY has no accepted image."),
    },
  ];
  candidates.forEach((raw, index) => {
    const article = asRecord(raw);
    entries.push({ name: manifestItems[index].briefPath, bytes: encoder.encode(briefMarkdown(article, index)) });
  });

  // HALLEUS_WIKI_IMAGE_EXPORT_SAFE_R1: build the archive before persisting the batch.
  // A ZIP-generation failure therefore cannot leave an exported batch behind.
  const bytes = createWikiImageZip(entries);

  const recentRows = await sql`
    select batch.id::text, batch.batch_number::text,
           coalesce(array_agg(item.stable_id order by item.stable_id) filter (where item.id is not null), '{}') as stable_ids
    from halleus_private.wiki_image_batches as batch
    left join halleus_private.wiki_image_batch_items as item on item.batch_id = batch.id
    where batch.created_by = ${actor.userId}::uuid
      and batch.status = 'exported'
      and batch.created_at > now() - interval '5 minutes'
    group by batch.id, batch.batch_number, batch.created_at
    order by batch.created_at desc
    limit 10
  `;
  const candidateKey = manifestItems.map((item) => item.stableId).sort().join("|");
  const recentDuplicate = recentRows.find((raw) => {
    const row = asRecord(raw);
    const ids = Array.isArray(row.stable_ids) ? row.stable_ids.map(String).sort() : [];
    return ids.join("|") === candidateKey;
  });
  if (recentDuplicate) {
    throw new AdminAccessError(
      409,
      `An identical AI image batch was exported in the last 5 minutes (#${asString(asRecord(recentDuplicate).batch_number)}). Check Batch history before retrying.`,
    );
  }

  await sql.begin(async (tx) => {
    await tx`
      insert into halleus_private.wiki_image_batches (
        id, style_snapshot_version, status, article_count, attempt_count, manifest, created_by
      ) values (
        ${batchId}::uuid, ${WIKI_IMAGE_STYLE_VERSION}, 'exported', ${candidates.length}, 0,
        jsonb_build_object(
          'schemaVersion', 1,
          'batchId', ${batchId}::text,
          'styleSnapshotVersion', ${WIKI_IMAGE_STYLE_VERSION}::text,
          'maxArticles', 5,
          'maxAttemptsTotal', 10,
          'maxAttemptsPerArticle', 2,
          'primary', jsonb_build_object(
            'mime', 'image/webp',
            'width', 1200,
            'height', 675,
            'maxBytes', 50000
          ),
          'items', '[]'::jsonb
        ),
        ${actor.userId}::uuid
      )
    `;
    for (let index = 0; index < candidates.length; index += 1) {
      const article = asRecord(candidates[index]);
      await tx`
        insert into halleus_private.wiki_image_batch_items (
          batch_id, article_id, stable_id, slug, brief_version, status
        ) values (
          ${batchId}::uuid, ${asString(article.id)}::uuid, ${asString(article.stable_id)},
          ${asString(article.slug)}, 1, 'exported'
        )
      `;
    }
  });
  return {
    bytes,
    filename: `Halleus-Wiki-Image-Batch-${batchId.slice(0, 8)}.zip`,
    batchId,
    articleCount: candidates.length,
  };
}

function parseReturnManifest(bytes: Uint8Array): WikiImageReturnManifest {
  let value: unknown;
  try { value = JSON.parse(decoder.decode(bytes)); } catch { throw new AdminAccessError(400, "return-manifest.json is invalid JSON."); }
  const root = safeRecord(value);
  if (root.schemaVersion !== 1 || typeof root.batchId !== "string" || root.styleSnapshotVersion !== WIKI_IMAGE_STYLE_VERSION || !Array.isArray(root.items)) {
    throw new AdminAccessError(400, "Return manifest schema/style version is invalid.");
  }
  const attemptsTotal = Number(root.attemptsTotal);
  if (!Number.isInteger(attemptsTotal) || attemptsTotal < 0 || attemptsTotal > WIKI_IMAGE_MAX_ATTEMPTS) {
    throw new AdminAccessError(400, "Return package exceeds the 10-attempt batch limit.");
  }
  if (root.items.length < 1 || root.items.length > WIKI_IMAGE_MAX_BATCH) throw new AdminAccessError(400, "Return manifest must contain 1 to 5 items.");
  return value as WikiImageReturnManifest;
}

function validateVisualQa(item: WikiImageReturnManifestItem) {
  const qa = item.visualQa;
  return Boolean(qa?.cropOk && qa.noUnintendedText && qa.noWatermark && qa.noArtifacts && qa.geometryOk && qa.relevanceOk && qa.compressionOk);
}

function wikiImageProvenanceSource(value: unknown): "ai_batch" | "asset_select" | "direct_upload" {
  const source = asString(safeRecord(value).source);
  if (source === "asset_select" || source === "direct_upload") return source;
  return "ai_batch";
}

function wikiImageProvenance(source: "ai_batch" | "asset_select" | "direct_upload") {
  return { source };
}

function normalizeWikiImageProvenance(value: unknown) {
  return wikiImageProvenance(wikiImageProvenanceSource(value));
}

function perceptualDuplicateWarning(candidateHash: string, rows: unknown[]) {
  const nearest = rows.reduce<{ assetId: string; distance: number } | null>((best, raw) => {
    const row = asRecord(raw);
    const hash = asString(row.perceptual_hash);
    if (!hash) return best;
    const distance = perceptualDistance(hash, candidateHash);
    if (distance > NEAR_DUPLICATE_WARNING_DISTANCE) return best;
    if (best && best.distance <= distance) return best;
    return { assetId: asString(row.asset_id), distance };
  }, null);
  if (!nearest) return null;
  const suffix = nearest.assetId ? ` (${nearest.assetId.slice(0, 8)})` : "";
  return `NEAR_PERCEPTUAL_DUPLICATE: فاصله بصری ${nearest.distance} با یک کاور موجود${suffix}.`;
}

export async function previewWikiImageReturnPackage(packageBytes: Uint8Array) {
  if (packageBytes.length > RESULT_ZIP_MAX_BYTES) throw new AdminAccessError(400, "Wiki image result ZIP exceeds 400 KB.");
  const entries = readWikiImageZip(packageBytes, { maxEntries: 8, maxUncompressedBytes: 800_000 });
  const manifestBytes = entries.get("return-manifest.json");
  if (!manifestBytes) throw new AdminAccessError(400, "return-manifest.json is required.");
  const manifest = parseReturnManifest(manifestBytes);
  const sql = getAdminDatabase();
  const batchRows = await sql`
    select id::text, article_count, attempt_count
    from halleus_private.wiki_image_batches
    where id = ${manifest.batchId}::uuid and style_snapshot_version = ${WIKI_IMAGE_STYLE_VERSION}
    limit 1
  `;
  if (!batchRows[0]) throw new AdminAccessError(404, "Image batch was not found.");
  const expectedRows = await sql`
    select item.id::text, item.article_id::text, item.stable_id, item.slug, item.brief_version,
           article.title
    from halleus_private.wiki_image_batch_items as item
    join public.wiki_articles as article on article.id = item.article_id
    where item.batch_id = ${manifest.batchId}::uuid
    order by item.stable_id
  `;
  if (manifest.items.length !== expectedRows.length) throw new AdminAccessError(409, "Return manifest article count does not match the exported batch.");

  const expected = new Map(expectedRows.map((raw) => {
    const row = asRecord(raw); return [asString(row.stable_id), row] as const;
  }));
  const seen = new Set<string>();
  const previews = [];
  for (const item of manifest.items) {
    if (seen.has(item.stableId)) throw new AdminAccessError(400, "Duplicate stable ID in return manifest.");
    seen.add(item.stableId);
    const row = expected.get(item.stableId);
    if (!row || item.slug !== asString(row.slug) || item.briefVersion !== asNumber(row.brief_version)) {
      throw new AdminAccessError(409, "Return item stable ID/slug/brief version does not match its batch.");
    }
    if (item.status === "NEEDS_RETRY") {
      previews.push({ stableId: item.stableId, slug: item.slug, title: asString(row.title), status: item.status, warnings: ["NEEDS_RETRY"] });
      continue;
    }
    if (item.status !== "READY" || item.mime !== "image/webp" || item.width !== 1200 || item.height !== 675) {
      throw new AdminAccessError(400, "READY images must declare WebP 1200x675.");
    }
    if (!item.altFaDraft?.trim() || item.altFaDraft.trim().length > 500 || item.altState !== "draft") {
      throw new AdminAccessError(400, "READY image requires a Persian alt draft.");
    }
    if (!validateVisualQa(item)) throw new AdminAccessError(400, "READY image has incomplete visual QA.");
    const imageBytes = entries.get(item.filename);
    if (!imageBytes || item.filename !== `images/${item.slug}-cover.webp`) throw new AdminAccessError(400, "READY image filename does not match the stable batch slug.");
    if (imageBytes.length !== item.bytes || imageBytes.length > 50_000 || sha256(imageBytes) !== item.checksum) {
      throw new AdminAccessError(400, "READY image byte/checksum contract failed.");
    }
    const variants = await prepareWikiImageVariants(imageBytes);
    const primary = variants.find((variant) => variant.width === 1200)!;
    const duplicateRows = await sql`
      select variant.asset_id::text, variant.content_hash, variant.perceptual_hash
      from halleus_private.wiki_asset_variants as variant
      join public.wiki_assets as asset on asset.id = variant.asset_id and asset.deleted_at is null
      where variant.width = 1200
    `;
    const exactDuplicate = duplicateRows.find((raw) => {
      const row = asRecord(raw);
      return asString(row.content_hash) === item.checksum;
    });
    if (exactDuplicate) throw new AdminAccessError(409, `Exact image duplicate detected for ${item.slug}.`);
    const warnings = [
      perceptualDuplicateWarning(primary.perceptualHash, duplicateRows),
    ].filter((warning): warning is string => Boolean(warning));
    previews.push({
      stableId: item.stableId,
      slug: item.slug,
      title: asString(row.title),
      status: item.status,
      bytes: imageBytes.length,
      altFaDraft: item.altFaDraft.trim(),
      variants: variants.map(({ bytes, ...variant }) => ({ ...variant, byteSize: bytes.length })),
      warnings,
    });
  }
  const allowed = new Set(["return-manifest.json", ...manifest.items.filter((item) => item.status === "READY").map((item) => item.filename)]);
  for (const name of entries.keys()) if (!allowed.has(name)) throw new AdminAccessError(400, `Unexpected result ZIP entry: ${name}`);
  const planToken = createHash("sha256").update(packageBytes).update(manifest.batchId).digest("hex");
  return { manifest, previews, planToken };
}

async function writeHistory(
  tx: TransactionSql,
  input: { articleId: string; action: string; revision: number; before: unknown; after: unknown; actor: VerifiedAdminActor; reason: string },
) {
  await tx`
    insert into halleus_private.wiki_article_image_history (
      article_id, action, revision, before_snapshot, after_snapshot, actor_user_id, reason
    ) values (
      ${input.articleId}::uuid, ${input.action}, ${input.revision},
      ${JSON.stringify(input.before)}::jsonb, ${JSON.stringify(input.after)}::jsonb,
      ${input.actor.userId}::uuid, ${input.reason}
    )
  `;
  await tx`
    insert into halleus_private.admin_audit_events (
      actor_user_id, actor_role, action, target_type, target_id, before_summary, after_summary,
      reason, success, request_correlation_id
    ) values (
      ${input.actor.userId}::uuid, ${input.actor.role}, ${`admin.wiki.image_${input.action}`},
      'wiki_article_image', ${input.articleId}, ${JSON.stringify(input.before)}::jsonb,
      ${JSON.stringify(input.after)}::jsonb, ${input.reason}, true, ${input.actor.correlationId}
    )
  `;
}

export async function applyWikiImageReturnPackage(actor: VerifiedAdminActor, packageBytes: Uint8Array, planToken: string, reason: string) {
  const preview = await previewWikiImageReturnPackage(packageBytes);
  if (preview.planToken !== planToken) throw new AdminAccessError(409, "Image return package changed after preview.");
  const entries = readWikiImageZip(packageBytes, { maxEntries: 8, maxUncompressedBytes: 800_000 });
  const sql = getAdminDatabase();
  const storedPaths: string[] = [];
  const previewWarningsByStableId = new Map(preview.previews.map((item) => [item.stableId, item.warnings ?? []] as const));
  try {
    for (const item of preview.manifest.items) {
      const itemRows = await sql`
        select item.id::text, item.article_id::text
        from halleus_private.wiki_image_batch_items as item
        where item.batch_id = ${preview.manifest.batchId}::uuid and item.stable_id = ${item.stableId}
        limit 1
      `;
      const itemRow = asRecord(itemRows[0]);
      const articleId = asString(itemRow.article_id);
      if (!articleId) throw new AdminAccessError(409, "Image batch item disappeared before apply.");
      if (item.status === "NEEDS_RETRY") {
        await sql.begin(async (tx) => {
          const current = await tx`select to_jsonb(image) as snapshot from halleus_private.wiki_article_images as image where article_id = ${articleId}::uuid`;
          const before = current[0] ? asRecord(current[0]).snapshot : null;
          const existingAsset = await tx`select asset_id::text, revision from halleus_private.wiki_article_images where article_id = ${articleId}::uuid`;
          if (existingAsset[0]) {
            await tx`update halleus_private.wiki_article_images set state='NEEDS_RETRY', revision=revision+1, warnings='["NEEDS_RETRY"]'::jsonb, updated_by=${actor.userId}::uuid where article_id=${articleId}::uuid`;
          }
          await tx`update halleus_private.wiki_image_batch_items set status='needs_retry', attempt_count=least(2, attempt_count+1) where id=${asString(itemRow.id)}::uuid`;
          const afterRows = await tx`select to_jsonb(image) as snapshot, revision from halleus_private.wiki_article_images as image where article_id = ${articleId}::uuid`;
          if (afterRows[0]) await writeHistory(tx, { articleId, action: "retry", revision: asNumber(afterRows[0].revision), before, after: asRecord(afterRows[0]).snapshot, actor, reason });
        });
        continue;
      }
      const primaryBytes = entries.get(item.filename)!;
      const variants = await prepareWikiImageVariants(primaryBytes);
      const stored = await storeWikiMedia(actor, {
        originalName: `${item.slug}-cover.webp`, alt: item.altFaDraft.trim(), bytes: primaryBytes,
        mimeType: "image/webp", contentHash: item.checksum,
      });
      await sql`update public.wiki_assets set width=1200, height=675 where id=${stored.id}::uuid`;
      for (const variant of variants) {
        const storagePath = variant.width === 1200
          ? stored.storagePath
          : `variants/${stored.id}/${variant.width}x${variant.height}-${variant.contentHash.slice(0, 12)}.webp`;
        if (variant.width !== 1200) {
          await putWikiMediaObject(storagePath, variant.bytes, "image/webp");
          storedPaths.push(storagePath);
        }
        await sql`
          insert into halleus_private.wiki_asset_variants (
            asset_id,width,height,storage_path,mime_type,byte_size,content_hash,perceptual_hash
          ) values (
            ${stored.id}::uuid, ${variant.width}, ${variant.height}, ${storagePath}, 'image/webp',
            ${variant.bytes.length}, ${variant.contentHash}, ${variant.perceptualHash}
          ) on conflict (asset_id,width) do update set
            height=excluded.height, storage_path=excluded.storage_path, mime_type=excluded.mime_type,
            byte_size=excluded.byte_size, content_hash=excluded.content_hash, perceptual_hash=excluded.perceptual_hash
        `;
      }
      await sql.begin(async (tx) => {
        const current = await tx`select to_jsonb(image) as snapshot, revision from halleus_private.wiki_article_images as image where article_id=${articleId}::uuid`;
        const before = current[0] ? asRecord(current[0]).snapshot : null;
        const nextRevision = current[0] ? asNumber(current[0].revision) + 1 : 1;
        const focalX = Math.min(1, Math.max(0, Number(item.focal?.x ?? 0.5)));
        const focalY = Math.min(1, Math.max(0, Number(item.focal?.y ?? 0.5)));
        const warning = (previewWarningsByStableId.get(item.stableId) ?? [])[0] ?? null;
        await tx`
          insert into halleus_private.wiki_article_images (
            article_id,asset_id,state,revision,alt_fa,alt_state,caption,provenance,focal_x,focal_y,warnings,
            brief_version,batch_item_id,updated_by
          ) values (
            ${articleId}::uuid,${stored.id}::uuid,'DRAFT_IMAGE',${nextRevision},${item.altFaDraft.trim()},'draft',null,
            jsonb_build_object('source','ai_batch'),${focalX},${focalY},
            case when ${warning}::text is null then jsonb_build_array() else jsonb_build_array(${warning}::text) end,
            ${item.briefVersion},${asString(itemRow.id)}::uuid,${actor.userId}::uuid
          ) on conflict (article_id) do update set
            asset_id=excluded.asset_id,state='DRAFT_IMAGE',revision=excluded.revision,alt_fa=excluded.alt_fa,
            alt_state='draft',caption=null,provenance=excluded.provenance,focal_x=excluded.focal_x,focal_y=excluded.focal_y,
            warnings=excluded.warnings,brief_version=excluded.brief_version,batch_item_id=excluded.batch_item_id,
            reviewed_by=null,reviewed_at=null,updated_by=excluded.updated_by
        `;
        await tx`update halleus_private.wiki_image_batch_items set status='imported', result_asset_id=${stored.id}::uuid, attempt_count=least(2,attempt_count+1) where id=${asString(itemRow.id)}::uuid`;
        const afterRows = await tx`select to_jsonb(image) as snapshot from halleus_private.wiki_article_images as image where article_id=${articleId}::uuid`;
        await writeHistory(tx, { articleId, action: before ? "replace" : "stage", revision: nextRevision, before, after: asRecord(afterRows[0]).snapshot, actor, reason });
      });
    }
    await sql`
      update halleus_private.wiki_image_batches set
        status = case when exists(select 1 from halleus_private.wiki_image_batch_items where batch_id=${preview.manifest.batchId}::uuid and status='needs_retry') then 'needs_retry' else 'returned' end,
        attempt_count=${preview.manifest.attemptsTotal}
      where id=${preview.manifest.batchId}::uuid
    `;
    return await getWikiImagePipelineState();
  } catch (error) {
    if (storedPaths.length) await removeWikiMediaObjects(storedPaths).catch(() => undefined);
    throw error;
  }
}

export async function stageExistingWikiAsset(actor: VerifiedAdminActor, input: {
  stableId: string;
  assetId: string;
  reason: string;
}) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const articleRows = await tx`select id::text from public.wiki_articles where stable_id=${input.stableId} and deleted_at is null limit 1`;
    const articleId = articleRows[0] ? asString(asRecord(articleRows[0]).id) : "";
    if (!articleId) throw new AdminAccessError(404, "Wiki article was not found.");
    const assetRows = await tx`
      select asset.id::text, asset.alt_text, count(variant.*)::int as variant_count
      from public.wiki_assets as asset
      join halleus_private.wiki_asset_variants as variant on variant.asset_id=asset.id
      where asset.id=${input.assetId}::uuid and asset.deleted_at is null and asset.mime_type='image/webp'
      group by asset.id, asset.alt_text
    `;
    if (!assetRows[0] || asNumber(asRecord(assetRows[0]).variant_count) !== 3) throw new AdminAccessError(409, "Selected asset is not a complete 480/768/1200 Wiki image asset.");
    const current = await tx`select to_jsonb(image) as snapshot,revision from halleus_private.wiki_article_images as image where article_id=${articleId}::uuid`;
    const before = current[0] ? asRecord(current[0]).snapshot : null;
    const revision = current[0] ? asNumber(current[0].revision)+1 : 1;
    await tx`
      insert into halleus_private.wiki_article_images (article_id,asset_id,state,revision,alt_fa,alt_state,caption,provenance,focal_x,focal_y,warnings,brief_version,updated_by)
      values (${articleId}::uuid,${input.assetId}::uuid,'DRAFT_IMAGE',${revision},${asString(asRecord(assetRows[0]).alt_text)},'draft',null,'{"source":"asset_select"}'::jsonb,0.5,0.5,'[]'::jsonb,1,${actor.userId}::uuid)
      on conflict (article_id) do update set asset_id=excluded.asset_id,state='DRAFT_IMAGE',revision=excluded.revision,alt_fa=excluded.alt_fa,alt_state='draft',caption=null,provenance=excluded.provenance,focal_x=0.5,focal_y=0.5,warnings='[]'::jsonb,reviewed_by=null,reviewed_at=null,updated_by=excluded.updated_by
    `;
    const afterRows = await tx`select to_jsonb(image) as snapshot from halleus_private.wiki_article_images as image where article_id=${articleId}::uuid`;
    await writeHistory(tx, { articleId, action: before ? "replace" : "stage", revision, before, after: asRecord(afterRows[0]).snapshot, actor, reason: input.reason });
    return { revision, state: "DRAFT_IMAGE" as const };
  });
}

export async function stageDirectWikiImage(actor: VerifiedAdminActor, input: {
  stableId: string;
  originalName: string;
  mimeType: string;
  bytes: Uint8Array;
  altFa: string;
  reason: string;
}) {
  if (!input.altFa.trim() || input.altFa.trim().length > 500) throw new AdminAccessError(400, "Persian alt is required.");
  if (input.bytes.length > 8_000_000) throw new AdminAccessError(413, "Direct image source is too large.");
  const primaryBytes = await normalizeWikiImagePrimary(input.bytes);
  const variants = await prepareWikiImageVariants(primaryBytes);
  const primaryHash = sha256(primaryBytes);
  const sql = getAdminDatabase();
  const articleRows = await sql`select id::text from public.wiki_articles where stable_id=${input.stableId} and deleted_at is null limit 1`;
  const articleId = articleRows[0] ? asString(asRecord(articleRows[0]).id) : "";
  if (!articleId) throw new AdminAccessError(404, "Wiki article was not found.");
  const duplicateRows = await sql`select content_hash from halleus_private.wiki_asset_variants where width=1200`;
  if (duplicateRows.some((raw) => asString(asRecord(raw).content_hash) === primaryHash)) {
    throw new AdminAccessError(409, "Direct image is an exact duplicate of an existing Wiki cover.");
  }
  const stored = await storeWikiMedia(actor, {
    originalName: input.originalName.replace(/\.[^.]+$/, "") + ".webp",
    alt: input.altFa.trim(), bytes: primaryBytes, mimeType: "image/webp", contentHash: primaryHash,
  });
  await sql`update public.wiki_assets set width=1200,height=675 where id=${stored.id}::uuid`;
  const storedPaths: string[] = [];
  try {
    for (const variant of variants) {
      const storagePath = variant.width === 1200 ? stored.storagePath : `variants/${stored.id}/${variant.width}x${variant.height}-${variant.contentHash.slice(0,12)}.webp`;
      if (variant.width !== 1200) { await putWikiMediaObject(storagePath, variant.bytes, "image/webp"); storedPaths.push(storagePath); }
      await sql`insert into halleus_private.wiki_asset_variants (asset_id,width,height,storage_path,mime_type,byte_size,content_hash,perceptual_hash)
        values (${stored.id}::uuid,${variant.width},${variant.height},${storagePath},'image/webp',${variant.bytes.length},${variant.contentHash},${variant.perceptualHash})
        on conflict (asset_id,width) do update set height=excluded.height,storage_path=excluded.storage_path,mime_type=excluded.mime_type,byte_size=excluded.byte_size,content_hash=excluded.content_hash,perceptual_hash=excluded.perceptual_hash`;
    }
    await sql.begin(async (tx) => {
      const current = await tx`select to_jsonb(image) as snapshot,revision from halleus_private.wiki_article_images as image where article_id=${articleId}::uuid`;
      const before = current[0] ? asRecord(current[0]).snapshot : null;
      const revision = current[0] ? asNumber(current[0].revision)+1 : 1;
      await tx`insert into halleus_private.wiki_article_images (article_id,asset_id,state,revision,alt_fa,alt_state,caption,provenance,focal_x,focal_y,warnings,brief_version,updated_by)
        values (${articleId}::uuid,${stored.id}::uuid,'DRAFT_IMAGE',${revision},${input.altFa.trim()},'draft',null,'{"source":"direct_upload"}'::jsonb,0.5,0.5,'[]'::jsonb,1,${actor.userId}::uuid)
        on conflict (article_id) do update set asset_id=excluded.asset_id,state='DRAFT_IMAGE',revision=excluded.revision,alt_fa=excluded.alt_fa,alt_state='draft',caption=null,provenance=excluded.provenance,focal_x=0.5,focal_y=0.5,warnings='[]'::jsonb,reviewed_by=null,reviewed_at=null,updated_by=excluded.updated_by`;
      const afterRows = await tx`select to_jsonb(image) as snapshot from halleus_private.wiki_article_images as image where article_id=${articleId}::uuid`;
      await writeHistory(tx, { articleId, action: before ? "replace" : "stage", revision, before, after: asRecord(afterRows[0]).snapshot, actor, reason: input.reason });
    });
    return await getWikiImagePipelineState(input.stableId);
  } catch (error) {
    if (storedPaths.length) await removeWikiMediaObjects(storedPaths).catch(() => undefined);
    throw error;
  }
}

// HALLEUS_WIKI_IMAGE_ASSET_LIBRARY_R1
export async function mutateWikiImageAsset(actor: VerifiedAdminActor, input: {
  action: "metadata" | "archive";
  assetId: string;
  altFa?: string;
  reason: string;
}) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select id::text, storage_path, original_name, alt_text, deleted_at::text
      from public.wiki_assets
      where id = ${input.assetId}::uuid
      for update
    `;
    if (!rows[0]) throw new AdminAccessError(404, "Wiki image asset was not found.");
    const row = asRecord(rows[0]);
    if (row.deleted_at) throw new AdminAccessError(409, "Archived Wiki image assets cannot be mutated.");

    const before = {
      alt: asString(row.alt_text),
      storagePath: asString(row.storage_path),
      archived: false,
    };

    if (input.action === "metadata") {
      const altFa = input.altFa?.trim() ?? "";
      if (altFa.length < 1 || altFa.length > 500) {
        throw new AdminAccessError(400, "Asset alt must contain 1 to 500 characters.");
      }
      await tx`update public.wiki_assets set alt_text = ${altFa} where id = ${input.assetId}::uuid`;
      await tx`
        insert into halleus_private.admin_audit_events (
          actor_user_id, actor_role, action, target_type, target_id, before_summary, after_summary,
          reason, success, request_correlation_id
        ) values (
          ${actor.userId}::uuid, ${actor.role}, 'admin.wiki.image_asset_metadata', 'wiki_asset', ${input.assetId},
          ${JSON.stringify(before)}::jsonb, ${JSON.stringify({ ...before, alt: altFa })}::jsonb,
          ${input.reason}, true, ${actor.correlationId}
        )
      `;
      return { assetId: input.assetId, archived: false, alt: altFa };
    }

    const storagePath = asString(row.storage_path);
    const publicUrl = getWikiMediaPublicUrl(storagePath);
    const storageNeedle = "%" + storagePath + "%";
    const publicNeedle = "%" + publicUrl + "%";
    const dedicatedRows = await tx`
      select count(*)::int as count
      from halleus_private.wiki_article_images
      where asset_id = ${input.assetId}::uuid
    `;
    const bodyRows = await tx`
      select (
        (select count(*) from public.wiki_articles as article
          where article.deleted_at is null and (
            article.sections::text like ${storageNeedle} or
            article.sections::text like ${publicNeedle}
          )) +
        (select count(*) from public.wiki_article_drafts as draft
          where draft.snapshot::text like ${storageNeedle} or
                draft.snapshot::text like ${publicNeedle})
      )::int as count
    `;
    const usageCount = asNumber(dedicatedRows[0]?.count) + asNumber(bodyRows[0]?.count);
    if (usageCount > 0) {
      throw new AdminAccessError(409, "This image is still in use. Detach or replace every reference before archiving it.");
    }

    await tx`update public.wiki_assets set deleted_at = now() where id = ${input.assetId}::uuid`;
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id, before_summary, after_summary,
        reason, success, request_correlation_id
      ) values (
        ${actor.userId}::uuid, ${actor.role}, 'admin.wiki.image_asset_archived', 'wiki_asset', ${input.assetId},
        ${JSON.stringify(before)}::jsonb, ${JSON.stringify({ ...before, archived: true })}::jsonb,
        ${input.reason}, true, ${actor.correlationId}
      )
    `;
    return { assetId: input.assetId, archived: true };
  });
}

export async function mutateWikiArticleImage(actor: VerifiedAdminActor, input: {
  action: "metadata" | "approve" | "reject" | "retry" | "detach";
  stableId: string;
  expectedRevision: number;
  reason: string;
  altFa?: string;
  caption?: string | null;
  focalX?: number;
  focalY?: number;
  provenance?: Record<string, unknown>;
}) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select article.id::text as article_id, image.revision, image.state, image.alt_fa, image.alt_state,
             image.caption, image.provenance, image.focal_x, image.focal_y, image.asset_id::text,
             to_jsonb(image) as snapshot
      from public.wiki_articles as article
      join halleus_private.wiki_article_images as image on image.article_id=article.id
      where article.stable_id=${input.stableId} and article.deleted_at is null
      for update
    `;
    if (!rows[0]) throw new AdminAccessError(404, "Wiki article image assignment was not found.");
    const row = asRecord(rows[0]);
    if (asNumber(row.revision) !== input.expectedRevision) throw new AdminAccessError(409, "Wiki image revision changed; refresh before applying.");
    const articleId = asString(row.article_id);
    const before = row.snapshot;
    const nextRevision = input.expectedRevision + 1;
    if (input.action === "detach") {
      await tx`delete from halleus_private.wiki_article_images where article_id=${articleId}::uuid`;
      await writeHistory(tx, { articleId, action: "detach", revision: nextRevision, before, after: null, actor, reason: input.reason });
      return { detached: true };
    }
    let state = asString(row.state) as WikiImageStoredState;
    let altState = asString(row.alt_state);
    const altFa = input.altFa?.trim() ?? asString(row.alt_fa);
    const caption = input.caption === undefined ? (row.caption ? asString(row.caption) : null) : input.caption?.trim() || null;
    const provenance = normalizeWikiImageProvenance(input.provenance ?? row.provenance);
    const provenanceSource = wikiImageProvenanceSource(provenance);
    const focalX = input.focalX === undefined ? asNumber(row.focal_x) : Math.min(1, Math.max(0, input.focalX));
    const focalY = input.focalY === undefined ? asNumber(row.focal_y) : Math.min(1, Math.max(0, input.focalY));
    if (altFa.length < 3 || altFa.length > 500) throw new AdminAccessError(400, "Persian alt must contain 3 to 500 characters.");
    if (input.action === "approve") { state = "READY"; altState = "reviewed"; }
    if (input.action === "reject") state = "REJECTED";
    if (input.action === "retry") state = "NEEDS_RETRY";
    if (input.action === "metadata" && altFa !== asString(row.alt_fa)) altState = "draft";
    await tx`
      update halleus_private.wiki_article_images set
        state=${state}, revision=${nextRevision}, alt_fa=${altFa}, alt_state=${altState}, caption=${caption},
        provenance=jsonb_build_object('source', ${provenanceSource}::text), focal_x=${focalX}, focal_y=${focalY},
        reviewed_by=${state === "READY" ? actor.userId : null}::uuid,
        reviewed_at=${state === "READY" ? new Date().toISOString() : null}::timestamptz,
        updated_by=${actor.userId}::uuid
      where article_id=${articleId}::uuid
    `;
    const afterRows = await tx`select to_jsonb(image) as snapshot from halleus_private.wiki_article_images as image where article_id=${articleId}::uuid`;
    await writeHistory(tx, { articleId, action: input.action, revision: nextRevision, before, after: asRecord(afterRows[0]).snapshot, actor, reason: input.reason });
    return { detached: false, revision: nextRevision, state };
  });
}

export async function getWikiArticleImageHistory(stableId: string) {
  const sql = getAdminDatabase();
  const rows = await sql`
    select history.id::text, history.action, history.revision, history.before_snapshot, history.after_snapshot,
           history.actor_user_id::text, history.reason, history.created_at::text
    from halleus_private.wiki_article_image_history as history
    join public.wiki_articles as article on article.id=history.article_id
    where article.stable_id=${stableId}
    order by history.created_at desc limit 50
  `;
  return rows.map((raw) => asRecord(raw));
}
