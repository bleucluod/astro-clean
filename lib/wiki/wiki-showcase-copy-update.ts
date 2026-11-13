import { randomUUID } from "node:crypto";
import { AdminAccessError, type VerifiedAdminActor } from "@/lib/admin/admin-auth";
import { asNumber, asRecord, asString, getAdminDatabase } from "@/lib/admin/admin-database";

type CopyFields = { title: string; description: string; buttonLabel: string };
type CopyItem = {
  articleId: string; articleSlug: string; articleVersion: number;
  productId: "p01" | "p02"; afterSectionIndex: number;
  sectionAnchor: string; sectionTitle: string;
  expectedOriginal: CopyFields; replacement: CopyFields;
};
type Prepared = { id: string; slug: string; revision: number; item: CopyItem; alreadyApplied: boolean };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ANCHOR = /^sec1-[a-f0-9]{8}$/;

function strictText(value: unknown, limit: number, name: string): string {
  if (typeof value !== "string" || !value.trim() || value.length > limit) {
    throw new AdminAccessError(400, "Invalid copy field: " + name);
  }
  return value;
}
function readFields(value: unknown): CopyFields {
  const row = asRecord(value);
  if (Object.keys(row).sort().join(",") !== "buttonLabel,description,title") {
    throw new AdminAccessError(400, "Copy fields must contain title, description and buttonLabel only");
  }
  return {
    title: strictText(row.title, 160, "title"),
    description: strictText(row.description, 500, "description"),
    buttonLabel: strictText(row.buttonLabel, 80, "buttonLabel"),
  };
}
export function readWikiShowcaseCopyPackage(raw: unknown): CopyItem[] {
  const input = asRecord(raw);
  if (input.schemaVersion !== 1 ||
    input.packageType !== "HALLEUS_WIKI_SHOWCASE_PUBLISHED_COPY_UPDATE" ||
    !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 500 ||
    input.expectedCount !== input.items.length) {
    throw new AdminAccessError(400, "Invalid published showcase copy ZIP");
  }
  const slots = new Set<string>();
  const articles = new Set<string>();
  return input.items.map((rawItem: unknown) => {
    const r = asRecord(rawItem);
    if (Object.keys(r).sort().join(",") !==
      "afterSectionIndex,articleId,articleSlug,articleVersion,expectedOriginal,productId,replacement,sectionAnchor,sectionTitle") {
      throw new AdminAccessError(400, "Unexpected fields in showcase copy ZIP");
    }
    if (typeof r.articleId !== "string" || !UUID.test(r.articleId) ||
      typeof r.articleSlug !== "string" || !SLUG.test(r.articleSlug) ||
      !Number.isSafeInteger(r.articleVersion) || (r.articleVersion as number) < 1 ||
      !Number.isSafeInteger(r.afterSectionIndex) || (r.afterSectionIndex as number) < 0 ||
      (r.afterSectionIndex as number) > 1000 ||
      (r.productId !== "p01" && r.productId !== "p02") ||
      typeof r.sectionAnchor !== "string" || !ANCHOR.test(r.sectionAnchor) ||
      typeof r.sectionTitle !== "string" || !r.sectionTitle.trim() || r.sectionTitle.length > 300) {
      throw new AdminAccessError(400, "Invalid showcase identity in copy ZIP");
    }
    const id = r.articleId as string;
    const slot = id + ":" + String(r.afterSectionIndex);
    if (slots.has(slot) || articles.has(id)) {
      throw new AdminAccessError(400, "Duplicate showcase/article in copy ZIP");
    }
    slots.add(slot);
    articles.add(id);
    return {
      articleId: id, articleSlug: r.articleSlug as string,
      articleVersion: r.articleVersion as number, productId: r.productId,
      afterSectionIndex: r.afterSectionIndex as number,
      sectionAnchor: r.sectionAnchor as string, sectionTitle: r.sectionTitle as string,
      expectedOriginal: readFields(r.expectedOriginal), replacement: readFields(r.replacement),
    };
  });
}

function preflight(rows: unknown[], items: CopyItem[]): Prepared[] {
  const matches = new Map<string, Record<string, unknown>>();
  for (const raw of rows) {
    const row = asRecord(raw);
    const key = asString(row.article_id) + ":" + asNumber(row.after_section_index);
    if (matches.has(key)) throw new AdminAccessError(409, "Duplicate published showcase slot");
    matches.set(key, row);
  }
  return items.map((item, index) => {
    const r = matches.get(item.articleId + ":" + item.afterSectionIndex);
    const label = "Copy row " + (index + 1) + " (" + item.articleSlug + ")";
    if (!r || asString(r.slug) !== item.articleSlug ||
      asString(r.product_id) !== item.productId ||
      asString(r.section_anchor) !== item.sectionAnchor ||
      asString(r.section_title) !== item.sectionTitle ||
      asNumber(r.content_version) !== item.articleVersion || r.enabled !== true) {
      throw new AdminAccessError(409, label + ": placement/product/version changed; no updates performed");
    }
    const isOriginal = (Object.keys(item.expectedOriginal) as Array<keyof CopyFields>)
      .every((field) => asString(r[field === "buttonLabel" ? "button_label" : field]) === item.expectedOriginal[field]);
    const alreadyApplied = (Object.keys(item.replacement) as Array<keyof CopyFields>)
      .every((field) => asString(r[field === "buttonLabel" ? "button_label" : field]) === item.replacement[field]);
    if (!isOriginal && !alreadyApplied) {
      throw new AdminAccessError(409, label + ": current copy differs from approved source; no updates performed");
    }
    const id = asString(r.showcase_id);
    const revision = asNumber(r.revision);
    if (!UUID.test(id) || revision < 1) throw new AdminAccessError(409, label + ": invalid existing showcase");
    return { id, slug: item.articleSlug, revision, item, alreadyApplied };
  });
}

/** Preview is read-only. Apply rechecks identities and copy under row locks,
 * then updates only the three copy fields plus revision/audit metadata.
 */
export async function updatePublishedWikiShowcaseCopy(
  actor: VerifiedAdminActor, raw: unknown, apply: boolean,
) {
  const items = readWikiShowcaseCopyPackage(raw);
  const ids = items.map((item) => item.articleId);
  const sql = getAdminDatabase();
  const read = async () => sql`
    select s.id::text as showcase_id, s.article_id::text, s.product_id,
      s.after_section_index, s.section_anchor, s.section_title,
      s.title, s.description, s.button_label, s.enabled, s.revision,
      a.slug, a.content_version
    from halleus_private.wiki_shop_showcases s
    join public.wiki_articles a on a.id = s.article_id
    where s.article_id = any(${ids}::uuid[])
      and a.status = 'published' and a.is_indexable = true
      and a.deleted_at is null and a.scheduled_for is null
      and a.published_at is not null and a.published_at <= now()
  `;
  if (!apply) {
    const approved = preflight(await read(), items);
    return { matchedCount: approved.length,
      changedCount: approved.filter((item) => !item.alreadyApplied).length,
      alreadyAppliedCount: approved.filter((item) => item.alreadyApplied).length,
      slugs: [] as string[] };
  }
  return sql.begin(async (tx) => {
    const rows = await tx`
      select s.id::text as showcase_id, s.article_id::text, s.product_id,
        s.after_section_index, s.section_anchor, s.section_title,
        s.title, s.description, s.button_label, s.enabled, s.revision,
        a.slug, a.content_version
      from halleus_private.wiki_shop_showcases s
      join public.wiki_articles a on a.id = s.article_id
      where s.article_id = any(${ids}::uuid[])
        and a.status = 'published' and a.is_indexable = true
        and a.deleted_at is null and a.scheduled_for is null
        and a.published_at <= now()
      for update of s
    `;
    const approved = preflight(rows, items);
    const changed: string[] = [];
    for (const { id, slug, revision, item, alreadyApplied } of approved) {
      if (alreadyApplied) continue;
      const updated = await tx`
        update halleus_private.wiki_shop_showcases set
          title = ${item.replacement.title},
          description = ${item.replacement.description},
          button_label = ${item.replacement.buttonLabel},
          revision = revision + 1, updated_at = now(),
          updated_by = ${actor.userId}::uuid
        where id = ${id}::uuid and revision = ${revision}
        returning id
      `;
      if (updated.length !== 1) throw new AdminAccessError(409, "Showcase changed during copy update");
      changed.push(slug);
    }
    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        before_summary, after_summary, success, request_correlation_id
      ) values (
        ${actor.userId}::uuid, ${actor.role}, 'wiki.showcase.copy_update',
        'wiki_showcase_copy', 'approved-zip', null,
        ${JSON.stringify({ matched: approved.length, changed: changed.length })}::jsonb,
        true, ${actor.correlationId ?? randomUUID()}
      )
    `;
    return { matchedCount: approved.length, changedCount: changed.length,
      alreadyAppliedCount: approved.length - changed.length,
      slugs: approved.map((entry) => entry.slug) };
  });
}
