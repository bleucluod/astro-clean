import { AdminAccessError, type VerifiedAdminActor } from '@/lib/admin/admin-auth';
import { asNumber, asRecord, asString, getAdminDatabase } from '@/lib/admin/admin-database';
import { isShopMvpActive, isShopP02OrderEnabled } from '@/lib/shop/shop-mvp-activation';
import { getShopProduct } from '@/components/shop/product-detail-data';
import { getShopProductUrl } from '@/lib/shop/shop-product-url';
import type { ShopProductId } from '@/components/shop/product-detail-data';
import type { WikiArticleSection } from '@/lib/wiki/wiki-content';

export type WikiShopShowcaseItem = {
  articleId: string;
  articleVersion: number;
  productId: ShopProductId;
  afterSectionIndex: number;
  sectionTitle: string;
  title: string;
  description: string;
  buttonLabel: string;
  enabled: boolean;
  expectedRevision: number;
};

type SourceArticle = {
  id: string;
  stableId: string;
  slug: string;
  title: string;
  categoryId: string;
  summary: string;
  intro: string;
  version: number;
  sections: WikiArticleSection[];
};

const productIds: readonly ShopProductId[] = ['p01', 'p02', 'p03'];
const available = (productId: ShopProductId) =>
  productId === 'p01' ? isShopMvpActive()
    : productId === 'p02' ? isShopP02OrderEnabled() : false;

const plain = (value: unknown, field: string, maxLength: number) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
    throw new AdminAccessError(400, 'Invalid showcase ' + field);
  }
  return value.trim();
};

function normalizeArticle(raw: unknown): SourceArticle {
  const row = asRecord(raw);
  return {
    id: asString(row.id),
    stableId: asString(row.stable_id),
    slug: asString(row.slug),
    title: asString(row.title),
    categoryId: asString(row.category_id),
    summary: asString(row.summary),
    intro: asString(row.intro),
    version: asNumber(row.content_version),
    sections: Array.isArray(row.sections) ? row.sections as WikiArticleSection[] : [],
  };
}

export async function listWikiShopShowcaseArticles() {
  const sql = getAdminDatabase();
  const rows = await sql`
    select id::text, stable_id, slug, title, category_id, summary, intro,
           content_version, sections
    from public.wiki_articles
    where status = 'published' and is_indexable = true
      and published_at is not null and published_at <= now()
      and scheduled_for is null and deleted_at is null
    order by title asc
  `;
  return rows.map(normalizeArticle);
}

export function wikiShopProductCatalog() {
  return productIds.map((id) => {
    const product = getShopProduct(id);
    return {
      id,
      name: product.title,
      description: product.introduction,
      url: getShopProductUrl(id),
      image: product.gallery[0]?.src ?? null,
      orderable: available(id),
    };
  });
}

export async function exportWikiShopShowcaseGuide() {
  const articles = await listWikiShopShowcaseArticles();
  return {
    schemaVersion: 1,
    purpose: 'Suggest at most one relevant product placement per Wiki article; skip irrelevant articles.',
    instructions: [
      'Return JSON with schemaVersion 1 and proposals array only; no article HTML and no edits to Wiki content.',
      'Use exact articleId, articleVersion, sectionTitle, and zero-based afterSectionIndex from this export.',
      'Use the content to pick a genuinely relevant product. Skip if none fits.',
      'Position the product after a meaningful H2 section within the article, never after its final section.',
      'For 4 or more H2 sections prefer after index 1 or later, in the middle of the article.',
      'Supply short original Persian title, description and buttonLabel for each suggestion.',
      'Products with orderable=false must not be published as purchase calls to action.',
      'All suggestions require manual human review inside Halleus admin before activation.',
    ],
    outputExample: {
      schemaVersion: 1,
      proposals: [
        {
          articleId: 'use-real-article-id-from-export',
          articleVersion: 1,
          productId: 'p01',
          afterSectionIndex: 1,
          sectionTitle: 'copy-the-exact-section-title',
          title: 'عنوان کوتاه',
          description: 'توضیح مرتبط با موضوع مقاله',
          buttonLabel: 'مشاهدهٔ تابلو',
        },
      ],
    },
    products: wikiShopProductCatalog(),
    articles: articles.map((article) => ({
      articleId: article.id,
      stableId: article.stableId,
      slug: article.slug,
      url: '/wiki/' + article.slug,
      articleVersion: article.version,
      title: article.title,
      categoryId: article.categoryId,
      summary: article.summary,
      intro: article.intro,
      allowedAfterSectionIndexes: article.sections.map((_, i) => i)
        .filter((i) => i < article.sections.length - 1 && (article.sections.length < 4 || i > 0)),
      sections: article.sections.map((section, index) => ({
        afterSectionIndex: index,
        sectionTitle: section.title,
        text: (section.orderedBlocks?.flatMap((block) => {
          if ('text' in block) return [block.text];
          if ('items' in block) return [...block.items];
          if ('header' in block) return [...block.header, ...block.rows.flat()];
          return [];
        }) ?? [...section.paragraphs, ...(section.bullets ?? [])]).join(' ').slice(0, 2200),
      })),
    })),
  };
}

export async function listConfiguredWikiShowcases() {
  const sql = getAdminDatabase();
  const rows = await sql`
    select s.article_id::text as article_id, a.slug, a.title as article_title,
           a.content_version, a.sections, s.article_version, s.product_id,
           s.after_section_index, s.section_title, s.title, s.description,
           s.button_label, s.enabled, s.revision
    from halleus_private.wiki_shop_showcases s
    join public.wiki_articles a on a.id = s.article_id
    where a.deleted_at is null
    order by a.title
  `;
  return rows.map((raw) => {
    const r = asRecord(raw);
    const sections = Array.isArray(r.sections) ? r.sections as WikiArticleSection[] : [];
    const index = asNumber(r.after_section_index);
    return {
      articleId: asString(r.article_id),
      slug: asString(r.slug),
      articleTitle: asString(r.article_title),
      articleVersion: asNumber(r.article_version),
      currentArticleVersion: asNumber(r.content_version),
      productId: asString(r.product_id),
      afterSectionIndex: index,
      sectionTitle: asString(r.section_title),
      title: asString(r.title),
      description: asString(r.description),
      buttonLabel: asString(r.button_label),
      enabled: r.enabled === true,
      expectedRevision: asNumber(r.revision),
      stale: asNumber(r.content_version) !== asNumber(r.article_version) ||
        sections[index]?.title !== asString(r.section_title),
    };
  });
}

function checkedItem(input: unknown): WikiShopShowcaseItem {
  const row = asRecord(input);
  const articleId = plain(row.articleId, 'articleId', 36);
  if (!/^[a-f0-9]{8}-[a-f0-9-]{27,}$/i.test(articleId)) {
    throw new AdminAccessError(400, 'Invalid articleId');
  }
  const productId = row.productId;
  if (typeof productId !== 'string' || !productIds.includes(productId as ShopProductId)) {
    throw new AdminAccessError(400, 'Unknown product');
  }
  const afterSectionIndex = row.afterSectionIndex;
  const articleVersion = row.articleVersion;
  const expectedRevision = row.expectedRevision ?? 0;
  if (!Number.isSafeInteger(afterSectionIndex) || afterSectionIndex < 0 ||
    !Number.isSafeInteger(articleVersion) || articleVersion < 1 ||
    !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    throw new AdminAccessError(400, 'Invalid article version, section index or revision');
  }
  return {
    articleId, articleVersion, productId: productId as ShopProductId,
    afterSectionIndex, expectedRevision,
    sectionTitle: plain(row.sectionTitle, 'sectionTitle', 300),
    title: plain(row.title, 'title', 160),
    description: plain(row.description, 'description', 500),
    buttonLabel: plain(row.buttonLabel, 'buttonLabel', 80),
    enabled: row.enabled === true,
  };
}

function checkPlacement(item: WikiShopShowcaseItem, article: SourceArticle, reviewOnly = false) {
  if (!item.enabled && !reviewOnly) return; // Disabled/stale mappings can always be safely turned off.
  if (article.version !== item.articleVersion) {
    throw new AdminAccessError(409, 'Article changed since AI export: ' + article.slug);
  }
  const i = item.afterSectionIndex;
  if (i >= article.sections.length - 1 ||
    (article.sections.length >= 4 && i === 0) ||
    article.sections[i]?.title !== item.sectionTitle) {
    throw new AdminAccessError(409, 'Invalid or stale mid-article position: ' + article.slug);
  }
  if (item.enabled && !available(item.productId)) {
    throw new AdminAccessError(409, 'Product not currently orderable: ' + item.productId);
  }
}

export async function previewWikiShopShowcaseProposals(value: unknown) {
  if (!Array.isArray(value) || value.length > 500) {
    throw new AdminAccessError(400, 'proposals must be an array (max 500)');
  }
  const articles = new Map((await listWikiShopShowcaseArticles()).map((a) => [a.id, a]));
  const existing = new Map((await listConfiguredWikiShowcases()).map((s) => [s.articleId, s]));
  const seen = new Set<string>();
  return value.map((raw, index) => {
    try {
      const item = checkedItem({ ...asRecord(raw), enabled: false });
      if (seen.has(item.articleId)) throw new AdminAccessError(400, 'Duplicate article in AI package');
      seen.add(item.articleId);
      const article = articles.get(item.articleId);
      if (!article) throw new AdminAccessError(404, 'Article is not currently public');
      checkPlacement(item, article, true);
      const configured = existing.get(item.articleId);
      return { index, valid: true, articleTitle: article.title, slug: article.slug,
        item: { ...item, expectedRevision: configured?.expectedRevision ?? 0 },
        existing: Boolean(configured), orderable: available(item.productId) };
    } catch (error) {
      return { index, valid: false,
        error: error instanceof Error ? error.message : 'Invalid proposal' };
    }
  });
}

export async function saveWikiShopShowcaseBatch(actor: VerifiedAdminActor, value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 100) {
    throw new AdminAccessError(400, 'items must contain 1-100 reviewed placements');
  }
  const items = value.map(checkedItem);
  const ids = new Set(items.map((i) => i.articleId));
  if (ids.size !== items.length) throw new AdminAccessError(400, 'Duplicate article');
  const sql = getAdminDatabase();
  const updatedSlugs = await sql.begin(async (tx) => {
    const changed: string[] = [];
    for (const item of items) {
      const articleRows = await tx`
        select id::text, stable_id, slug, title, category_id, summary, intro,
               content_version, sections
        from public.wiki_articles
        where id = ${item.articleId}::uuid
          and status = 'published' and is_indexable = true
          and published_at is not null and published_at <= now()
          and scheduled_for is null and deleted_at is null
        for update
      `;
      if (!articleRows[0]) throw new AdminAccessError(409, 'Article no longer publicly available');
      const article = normalizeArticle(articleRows[0]);
      checkPlacement(item, article);
      const result = await tx`
        insert into halleus_private.wiki_shop_showcases (
          article_id, product_id, after_section_index, section_title, article_version,
          title, description, button_label, enabled, updated_by
        ) values (
          ${item.articleId}::uuid, ${item.productId}, ${item.afterSectionIndex},
          ${item.sectionTitle}, ${item.articleVersion},
          ${item.title}, ${item.description}, ${item.buttonLabel}, ${item.enabled},
          ${actor.userId}::uuid
        )
        on conflict (article_id) do update set
          product_id = excluded.product_id,
          after_section_index = excluded.after_section_index,
          section_title = excluded.section_title,
          article_version = excluded.article_version,
          title = excluded.title,
          description = excluded.description,
          button_label = excluded.button_label,
          enabled = excluded.enabled,
          updated_by = excluded.updated_by,
          revision = halleus_private.wiki_shop_showcases.revision + 1,
          updated_at = now()
        where halleus_private.wiki_shop_showcases.revision = ${item.expectedRevision}
        returning revision
      `;
      if (!result.length || (item.expectedRevision === 0 && Number(result[0].revision) !== 1) ||
        (item.expectedRevision > 0 && Number(result[0].revision) !== item.expectedRevision + 1)) {
        throw new AdminAccessError(409, 'Showcase was edited by someone else; refresh the panel');
      }
      await tx`
        insert into halleus_private.admin_audit_events (
          actor_user_id, actor_role, action, target_type, target_id,
          before_summary, after_summary, success, request_correlation_id
        ) values (
          ${actor.userId}::uuid, ${actor.role}, 'wiki.showcase.save', 'wiki_article',
          ${item.articleId},
          ${JSON.stringify({ expectedRevision: item.expectedRevision })}::jsonb,
          ${JSON.stringify({ productId: item.productId, index: item.afterSectionIndex, enabled: item.enabled })}::jsonb,
          true, ${actor.correlationId ?? crypto.randomUUID()}
        )
      `;
      changed.push(article.slug);
    }
    return changed;
  });
  return updatedSlugs;
}

/** Public read is strictly scoped to already-published Wiki articles and enabled, nonstale offers. */
export async function getPublicWikiShopShowcase(slug: string) {
  let sql;
  try {
    sql = getAdminDatabase();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") return null;
    throw error;
  }
  let rows;
  try {
    rows = await sql`
      select s.product_id, s.after_section_index, s.section_title,
             s.title, s.description, s.button_label
      from halleus_private.wiki_shop_showcases s
      join public.wiki_articles a on a.id = s.article_id
      where a.slug = ${slug}
        and a.status = 'published' and a.is_indexable = true
        and a.published_at is not null and a.published_at <= now()
        and a.scheduled_for is null and a.deleted_at is null
        and s.enabled = true and s.article_version = a.content_version
        and s.after_section_index < jsonb_array_length(a.sections) - 1
        and (a.sections->s.after_section_index->>'title') = s.section_title
      limit 1
    `;
  } catch (error) {
    // Product promotions are optional: missing migration, temporary DB failures
    // or restricted permissions must never take an otherwise healthy Wiki page down.
    console.warn('WIKI_SHOWCASE_READ_UNAVAILABLE', String(asRecord(error).code ?? 'unknown'));
    return null;
  }
  if (!rows[0]) return null;
  const row = asRecord(rows[0]);
  const productId = asString(row.product_id) as ShopProductId;
  if (!productIds.includes(productId) || !available(productId)) return null;
  const product = getShopProduct(productId);
  return {
    productId,
    afterSectionIndex: asNumber(row.after_section_index),
    sectionTitle: asString(row.section_title),
    title: asString(row.title),
    description: asString(row.description),
    buttonLabel: asString(row.button_label),
    url: getShopProductUrl(productId),
    image: product.gallery[0]?.src ?? '',
    imageAlt: product.gallery[0]?.alt ?? product.title,
  };
}

export type PublicWikiShopShowcase = NonNullable<Awaited<ReturnType<typeof getPublicWikiShopShowcase>>>;
