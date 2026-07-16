import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { AdminAccessError, type VerifiedAdminActor } from "@/lib/admin/admin-auth";
import { asNumber, asRecord, asString, getAdminDatabase } from "@/lib/admin/admin-database";
import { getHalleusRuntimeEnv } from "@/lib/config/env";

export type WikiMediaUpload = {
  originalName: string;
  alt: string;
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  contentHash?: string;
};

let mediaClient: SupabaseClient | null = null;

function getWikiMediaClient() {
  if (mediaClient) {
    return mediaClient;
  }
  const env = getHalleusRuntimeEnv();
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error("Supabase server media storage is not configured.");
  }
  mediaClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return mediaClient;
}

function extensionForMime(mimeType: WikiMediaUpload["mimeType"]) {
  return mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp";
}

function publicUrl(storagePath: string) {
  return getWikiMediaClient().storage.from("wiki-media").getPublicUrl(storagePath).data.publicUrl;
}

export async function storeWikiMedia(actor: VerifiedAdminActor, upload: WikiMediaUpload) {
  if (!upload.alt.trim() || upload.alt.length > 500 || upload.bytes.length < 1 || upload.bytes.length > 5 * 1024 * 1024) {
    throw new AdminAccessError(400, "Wiki media requires alt text and a file up to 5 MB.");
  }
  const hash = upload.contentHash ?? createHash("sha256").update(upload.bytes).digest("hex");
  const sql = getAdminDatabase();
  const existing = await sql`
    select id::text, storage_path, original_name, mime_type, byte_size, alt_text
    from public.wiki_assets
    where content_hash = ${hash} and deleted_at is null
    limit 1
  `;
  if (existing[0]) {
    const row = asRecord(existing[0]);
    return {
      id: asString(row.id),
      url: publicUrl(asString(row.storage_path)),
      storagePath: asString(row.storage_path),
      reused: true,
    };
  }
  const storagePath = `${hash.slice(0, 2)}/${hash}.${extensionForMime(upload.mimeType)}`;
  const client = getWikiMediaClient();
  const uploaded = await client.storage.from("wiki-media").upload(storagePath, upload.bytes, {
    contentType: upload.mimeType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (uploaded.error && !/already exists/i.test(uploaded.error.message)) {
    throw new Error(uploaded.error.message);
  }
  try {
    const rows = await sql`
      insert into public.wiki_assets (
        content_hash, storage_path, original_name, mime_type, byte_size, alt_text, created_by
      ) values (
        ${hash}, ${storagePath}, ${upload.originalName}, ${upload.mimeType},
        ${upload.bytes.length}, ${upload.alt.trim()}, ${actor.userId}::uuid
      )
      on conflict (content_hash) do update set deleted_at = null
      returning id::text
    `;
    return {
      id: asString(rows[0]?.id),
      url: publicUrl(storagePath),
      storagePath,
      reused: false,
    };
  } catch (error) {
    if (!uploaded.error) {
      await client.storage.from("wiki-media").remove([storagePath]);
    }
    throw error;
  }
}

export async function listWikiMedia() {
  const sql = getAdminDatabase();
  const rows = await sql`
    select asset.id::text, asset.storage_path, asset.original_name, asset.mime_type,
           asset.byte_size, asset.alt_text, asset.created_at::text, asset.deleted_at::text,
           (
             (select count(*) from public.wiki_articles as article
              where article.sections::text like ('%' || asset.storage_path || '%')) +
             (select count(*) from public.wiki_article_drafts as draft
              where draft.snapshot::text like ('%' || asset.storage_path || '%'))
           )::int as reference_count
    from public.wiki_assets as asset
    order by created_at desc
    limit 200
  `;
  return rows.map((raw) => {
    const row = asRecord(raw);
    return {
      id: asString(row.id),
      storagePath: asString(row.storage_path),
      url: publicUrl(asString(row.storage_path)),
      originalName: asString(row.original_name),
      mimeType: asString(row.mime_type),
      byteSize: asNumber(row.byte_size),
      alt: asString(row.alt_text),
      createdAt: asString(row.created_at),
      deletedAt: row.deleted_at ? asString(row.deleted_at) : null,
      referenceCount: asNumber(row.reference_count),
      orphan: asNumber(row.reference_count) === 0,
    };
  });
}

export async function deleteWikiMedia(actor: VerifiedAdminActor, assetId: string, reason: string) {
  const sql = getAdminDatabase();
  const rows = await sql`
    select id::text, storage_path
    from public.wiki_assets
    where id = ${assetId}::uuid and deleted_at is null
    limit 1
  `;
  if (!rows[0]) {
    throw new AdminAccessError(404, "Wiki media asset was not found.");
  }
  const row = asRecord(rows[0]);
  const path = asString(row.storage_path);
  const url = publicUrl(path);
  const references = await sql`
    select (
      (select count(*) from public.wiki_articles where sections::text like ${`%${url}%`}) +
      (select count(*) from public.wiki_article_drafts where snapshot::text like ${`%${url}%`})
    )::int as reference_count
  `;
  if (asNumber(references[0]?.reference_count) > 0) {
    throw new AdminAccessError(409, "Referenced Wiki media cannot be deleted.");
  }
  const removed = await getWikiMediaClient().storage.from("wiki-media").remove([path]);
  if (removed.error) {
    throw new Error(removed.error.message);
  }
  await sql.begin(async (tx) => {
    await tx`update public.wiki_assets set deleted_at = now() where id = ${assetId}::uuid`;
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        before_summary, after_summary, reason, success, request_correlation_id
      ) values (
        ${actor.userId}::uuid, ${actor.role}, 'admin.wiki.media_deleted', 'wiki_asset', ${assetId},
        ${tx.json({ storagePath: path })}, ${tx.json({ deleted: true })}, ${reason}, true,
        ${actor.correlationId}
      )
    `;
  });
}
