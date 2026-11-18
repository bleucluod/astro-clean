import { AdminAccessError, type VerifiedAdminActor } from "@/lib/admin/admin-auth";
import { getAdminDatabase } from "@/lib/admin/admin-database";
import { recordAdminAuditEvent } from "@/lib/admin/admin-service";
import { NEMAD_MONTHS } from "@/lib/shop/nemad-man-months";

export type SeoPage = {
  key: string;
  path: string;
  title: string;
  type: "wiki" | "product";
  status: string;
};
export type SeoKeyword = {
  pageKey: string;
  phrase: string;
  phraseKey: string;
  kind: "primary" | "secondary" | "long_tail";
};
export type SeoGscRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  periodStart: string;
  periodEnd: string;
  sourceName: string;
  importedAt: string;
};

const PRODUCTS: SeoPage[] = [
  { key: "shop:/shop", path: "/shop", title: "فروشگاه هالیوس", type: "product", status: "indexable" },
  { key: "shop:/shop/moon-phase-print", path: "/shop/moon-phase-print", title: "ماه آن روز", type: "product", status: "indexable" },
  { key: "shop:/shop/birth-sky-map", path: "/shop/birth-sky-map", title: "آسمان تولد", type: "product", status: "indexable" },
  { key: "shop:/shop/milky-way-print", path: "/shop/milky-way-print", title: "شب ما", type: "product", status: "indexable" },
  ...NEMAD_MONTHS.map((month) => ({
    key: "shop:/shop/" + month.slug + "-sign",
    path: "/shop/" + month.slug + "-sign",
    title: "نماد من — " + month.title,
    type: "product" as const,
    status: "indexable",
  })),
];

export function normalizeSeoPhrase(value: string): string {
  return value.normalize("NFKC")
    .replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u200c\s]+/g, " ")
    .trim().toLocaleLowerCase("fa-IR");
}

function boundedPhrase(raw: unknown, field: string) {
  if (typeof raw !== "string") throw new AdminAccessError(400, field + " معتبر نیست.");
  const phrase = raw.normalize("NFKC").trim().replace(/[\u200c\s]+/g, " ");
  const key = normalizeSeoPhrase(phrase);
  if (key.length < 2 || key.length > 200) {
    throw new AdminAccessError(400, field + " باید بین ۲ تا ۲۰۰ حرف باشد.");
  }
  return { phrase, key };
}

function stringField(raw: unknown, field: string, max: number) {
  if (typeof raw !== "string" || !raw.trim() || raw.trim().length > max) {
    throw new AdminAccessError(400, field + " معتبر نیست.");
  }
  return raw.trim();
}

function dateField(raw: unknown, field: string) {
  const date = stringField(raw, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date) {
    throw new AdminAccessError(400, field + " معتبر نیست.");
  }
  return date;
}

export async function listSeoPages(): Promise<SeoPage[]> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select stable_id, slug, title, status, is_indexable, published_at
    from public.wiki_articles
    where deleted_at is null
    order by title
  `;
  const now = Date.now();
  return [
    ...rows.map((row) => ({
      key: "wiki:" + String(row.stable_id),
      path: "/wiki/" + String(row.slug),
      title: String(row.title),
      type: "wiki" as const,
      status: row.status === "published" && row.is_indexable === true &&
        row.published_at && new Date(row.published_at).getTime() <= now
        ? "indexable" : String(row.status),
    })),
    ...PRODUCTS,
  ];
}

async function requirePage(pageKey: unknown): Promise<string> {
  const key = stringField(pageKey, "صفحه", 250);
  const pages = await listSeoPages();
  if (!pages.some((page) => page.key === key)) {
    throw new AdminAccessError(404, "این مقاله یا محصول در سایت وجود ندارد.");
  }
  return key;
}

export async function readSeoKeywordBank(pageKey: string | null) {
  const sql = getAdminDatabase();
  const [pages, records, showcaseRows] = await Promise.all([
    listSeoPages(),
    sql`select page_key, phrase, phrase_key, kind
      from halleus_private.seo_keyword_targets
      order by page_key, case kind when 'primary' then 0 when 'secondary' then 1 else 2 end, phrase_key`,
    sql`
      select s.product_id, count(distinct s.article_id)::integer as inbound_count
      from halleus_private.wiki_shop_showcases s
      join public.wiki_articles a on a.id = s.article_id
      where s.enabled = true and a.deleted_at is null and a.status = 'published'
        and a.is_indexable = true and a.published_at <= now()
      group by s.product_id
    `,
  ]);
  const targets: SeoKeyword[] = records.map((row) => ({
    pageKey: String(row.page_key),
    phrase: String(row.phrase),
    phraseKey: String(row.phrase_key),
    kind: row.kind as SeoKeyword["kind"],
  }));
  let queries: SeoGscRow[] = [];
  if (pageKey && pages.some((page) => page.key === pageKey)) {
    const rows = await sql`
      select query, clicks, impressions, ctr, position,
        period_start::text as period_start, period_end::text as period_end,
        source_name, imported_at::text as imported_at
      from halleus_private.seo_gsc_queries
      where page_key = ${pageKey}
      order by period_end desc, impressions desc, query
      limit 1000
    `;
    queries = rows.map((row) => ({
      query: String(row.query),
      clicks: Number(row.clicks),
      impressions: Number(row.impressions),
      ctr: Number(row.ctr),
      position: Number(row.position),
      periodStart: String(row.period_start),
      periodEnd: String(row.period_end),
      sourceName: String(row.source_name),
      importedAt: String(row.imported_at),
    }));
  }
  const productShowcases: Record<string, number> = {};
  for (const row of showcaseRows) {
    const productId = String(row.product_id);
    const path = productId === "p01" ? "/shop/moon-phase-print"
      : productId === "p02" ? "/shop/birth-sky-map"
      : productId === "p03" ? "/shop/milky-way-print"
      : productId.startsWith("nm-") ? "/shop/" + productId.slice(3) + "-sign" : null;
    if (path) productShowcases["shop:" + path] = Number(row.inbound_count);
  }
  return { pages, targets, queries, productShowcases };
}

export async function saveSeoKeyword(input: {
  actor: VerifiedAdminActor;
  pageKey: unknown;
  phrase: unknown;
  kind: unknown;
  originalPhrase?: unknown;
}) {
  const pageKey = await requirePage(input.pageKey);
  const { phrase, key } = boundedPhrase(input.phrase, "کلیدواژه");
  const original = typeof input.originalPhrase === "string" && input.originalPhrase.trim()
    ? boundedPhrase(input.originalPhrase, "کلیدواژهٔ قبلی").key : null;
  if (input.kind !== "primary" && input.kind !== "secondary" && input.kind !== "long_tail") {
    throw new AdminAccessError(400, "نوع کلیدواژه معتبر نیست.");
  }
  const kind = input.kind;
  const sql = getAdminDatabase();
  await sql.begin(async (tx) => {
    if (original && original !== key) {
      const existing = await tx`
        select phrase_key from halleus_private.seo_keyword_targets
        where page_key = ${pageKey} and phrase_key in (${original}, ${key}) for update
      `;
      if (!existing.some((row) => row.phrase_key === original)) {
        throw new AdminAccessError(409, "کلیدواژهٔ قبلی تغییر کرده؛ فهرست را تازه کن.");
      }
      if (existing.some((row) => row.phrase_key === key)) {
        throw new AdminAccessError(409, "این عبارت از قبل برای همین صفحه ثبت شده است.");
      }
      await tx`
        delete from halleus_private.seo_keyword_targets
        where page_key = ${pageKey} and phrase_key = ${original}
      `;
    }
    if (kind === "primary") {
      await tx`
        update halleus_private.seo_keyword_targets
        set kind = 'secondary', updated_at = now(), updated_by = ${input.actor.userId}::uuid
        where page_key = ${pageKey} and kind = 'primary' and phrase_key <> ${key}
      `;
    }
    await tx`
      insert into halleus_private.seo_keyword_targets
        (page_key, phrase_key, phrase, kind, updated_by)
      values (${pageKey}, ${key}, ${phrase}, ${kind}, ${input.actor.userId}::uuid)
      on conflict (page_key, phrase_key) do update
      set phrase = excluded.phrase, kind = excluded.kind,
        updated_by = excluded.updated_by, updated_at = now()
    `;
  });
  await recordAdminAuditEvent({
    actor: input.actor, action: "admin.seo.keyword_saved", targetType: "seo_page",
    targetId: pageKey, afterSummary: { phrase, kind, renamed: original !== null && original !== key }, success: true,
  });
}

export async function removeSeoKeyword(input: {
  actor: VerifiedAdminActor;
  pageKey: unknown;
  phrase: unknown;
}) {
  const pageKey = await requirePage(input.pageKey);
  const { key, phrase } = boundedPhrase(input.phrase, "کلیدواژه");
  const sql = getAdminDatabase();
  await sql`delete from halleus_private.seo_keyword_targets
    where page_key = ${pageKey} and phrase_key = ${key}`;
  await recordAdminAuditEvent({
    actor: input.actor, action: "admin.seo.keyword_removed", targetType: "seo_page",
    targetId: pageKey, beforeSummary: { phrase }, success: true,
  });
}

export async function importSeoGscQueries(input: {
  actor: VerifiedAdminActor;
  pageKey: unknown;
  periodStart: unknown;
  periodEnd: unknown;
  sourceName: unknown;
  rows: unknown;
}) {
  const pageKey = await requirePage(input.pageKey);
  const periodStart = dateField(input.periodStart, "تاریخ شروع");
  const periodEnd = dateField(input.periodEnd, "تاریخ پایان");
  if (periodStart > periodEnd) {
    throw new AdminAccessError(400, "بازهٔ زمانی جابه‌جا وارد شده است.");
  }
  const sourceName = stringField(input.sourceName, "نام فایل", 180);
  if (!Array.isArray(input.rows) || input.rows.length < 1 || input.rows.length > 1000) {
    throw new AdminAccessError(400, "هر بار بین ۱ تا ۱۰۰۰ کوئری وارد کن.");
  }
  const records = new Map<string, Record<string, string | number>>();
  for (const raw of input.rows) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new AdminAccessError(400, "قالب کوئری معتبر نیست.");
    }
    const row = raw as Record<string, unknown>;
    const phrase = boundedPhrase(row.query, "کوئری");
    const clicks = row.clicks, impressions = row.impressions;
    const ctr = row.ctr, position = row.position;
    if (!Number.isSafeInteger(clicks) || !Number.isSafeInteger(impressions) ||
      (clicks as number) < 0 || (impressions as number) < (clicks as number) ||
      typeof ctr !== "number" || !Number.isFinite(ctr) || ctr < 0 || ctr > 1 ||
      typeof position !== "number" || !Number.isFinite(position) ||
      position < 0 || position > 10000) {
      throw new AdminAccessError(400, "اعداد Clicks، Impressions، CTR یا Position معتبر نیستند.");
    }
    records.set(phrase.key, {
      query_key: phrase.key, query: phrase.phrase,
      clicks: clicks as number, impressions: impressions as number,
      ctr, position,
    });
  }
  const sql = getAdminDatabase();
  await sql.begin(async (tx) => {
    await tx`delete from halleus_private.seo_gsc_queries
      where page_key = ${pageKey} and period_start = ${periodStart}::date
        and period_end = ${periodEnd}::date`;
    await tx`
      insert into halleus_private.seo_gsc_queries (
        page_key, query_key, query, period_start, period_end,
        clicks, impressions, ctr, position, source_name, imported_by
      )
      select ${pageKey}, r.query_key, r.query, ${periodStart}::date,
        ${periodEnd}::date, r.clicks, r.impressions, r.ctr, r.position,
        ${sourceName}, ${input.actor.userId}::uuid
      from jsonb_to_recordset(${tx.json([...records.values()])}::jsonb)
        as r(query_key text, query text, clicks integer, impressions integer,
             ctr numeric, position numeric)
    `;
  });
  await recordAdminAuditEvent({
    actor: input.actor, action: "admin.seo.gsc_queries_imported", targetType: "seo_page",
    targetId: pageKey, afterSummary: {
      periodStart, periodEnd, sourceName, count: records.size,
    }, success: true,
  });
  return { imported: records.size };
}
