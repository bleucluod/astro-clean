import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const contentPath = path.join(root, "lib/wiki/wiki-content.ts");
const seedPath = path.join(root, "database/seeds/0001_wiki_content.sql");
const packageRequire = createRequire(pathToFileURL(path.join(root, "package.json")));
const ts = packageRequire("typescript");

function normalizeLineEndings(value) {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

export async function readWikiContentModule() {
  const source = readFileSync(contentPath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: contentPath,
  }).outputText;

  return import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
}

export function renderWikiSeed(payload) {
  const payloadJson = JSON.stringify(payload, null, 2);

  if (payloadJson.includes("$halleus_wiki_seed$")) {
    throw new Error("Wiki content contains the reserved SQL seed delimiter.");
  }

  return `-- Generated from lib/wiki/wiki-content.ts by scripts/generate-wiki-storage-seed.mjs.
-- Do not hand-edit article copy here. Regenerate and verify parity instead.

begin;

create temporary table halleus_wiki_seed_payload (
  payload jsonb not null
) on commit drop;

insert into halleus_wiki_seed_payload (payload)
values ($halleus_wiki_seed$
${payloadJson}
$halleus_wiki_seed$::jsonb);

do $$
begin
  if to_regclass('public.wiki_categories') is null
    or to_regclass('public.wiki_articles') is null
    or to_regclass('public.wiki_article_revisions') is null
    or to_regclass('public.wiki_redirects') is null then
    raise exception 'Apply 0003_wiki_storage.sql before the Wiki seed.';
  end if;
end;
$$;

with category_seed as (
  select category, ordinality - 1 as sort_order
  from halleus_wiki_seed_payload,
    jsonb_array_elements(payload -> 'categories') with ordinality as item(category, ordinality)
)
insert into public.wiki_categories (
  id,
  label,
  description,
  sort_order,
  created_at,
  updated_at
)
select
  category ->> 'id',
  category ->> 'label',
  category ->> 'description',
  sort_order,
  '2026-07-16T00:00:00Z'::timestamptz,
  '2026-07-16T00:00:00Z'::timestamptz
from category_seed
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order;

with article_seed as (
  select article, ordinality - 1 as sort_order
  from halleus_wiki_seed_payload,
    jsonb_array_elements(payload -> 'articles') with ordinality as item(article, ordinality)
)
insert into public.wiki_articles (
  slug,
  category_id,
  title,
  short_title,
  seo_title,
  meta_description,
  summary,
  intro,
  reading_minutes,
  key_points,
  sections,
  context_links,
  sources,
  call_to_action,
  related_slugs,
  status,
  is_indexable,
  published_at,
  scheduled_for,
  sort_order,
  created_at,
  updated_at
)
select
  article ->> 'slug',
  article ->> 'categoryId',
  article ->> 'title',
  article ->> 'shortTitle',
  article ->> 'seoTitle',
  article ->> 'metaDescription',
  article ->> 'summary',
  article ->> 'intro',
  (article ->> 'readingMinutes')::integer,
  article -> 'keyPoints',
  article -> 'sections',
  article -> 'contextLinks',
  article -> 'sources',
  article -> 'callToAction',
  article -> 'relatedSlugs',
  'published',
  true,
  '2026-07-16T00:00:00Z'::timestamptz,
  null,
  sort_order,
  '2026-07-16T00:00:00Z'::timestamptz,
  '2026-07-16T00:00:00Z'::timestamptz
from article_seed
on conflict (slug) do update set
  category_id = excluded.category_id,
  title = excluded.title,
  short_title = excluded.short_title,
  seo_title = excluded.seo_title,
  meta_description = excluded.meta_description,
  summary = excluded.summary,
  intro = excluded.intro,
  reading_minutes = excluded.reading_minutes,
  key_points = excluded.key_points,
  sections = excluded.sections,
  context_links = excluded.context_links,
  sources = excluded.sources,
  call_to_action = excluded.call_to_action,
  related_slugs = excluded.related_slugs,
  status = excluded.status,
  is_indexable = excluded.is_indexable,
  published_at = excluded.published_at,
  scheduled_for = excluded.scheduled_for,
  sort_order = excluded.sort_order;

with article_seed as (
  select article
  from halleus_wiki_seed_payload,
    jsonb_array_elements(payload -> 'articles') as item(article)
)
insert into public.wiki_article_revisions (
  article_id,
  revision_number,
  snapshot,
  change_note,
  created_by,
  created_at
)
select
  stored.id,
  1,
  seed.article,
  'Initial parity seed from v0.1.326 code-backed Wiki',
  null,
  '2026-07-16T00:00:00Z'::timestamptz
from article_seed as seed
join public.wiki_articles as stored
  on stored.slug = seed.article ->> 'slug'
on conflict (article_id, revision_number) do nothing;

do $$
declare
  expected_categories integer;
  expected_articles integer;
  stored_categories integer;
  stored_articles integer;
begin
  select jsonb_array_length(payload -> 'categories'),
         jsonb_array_length(payload -> 'articles')
    into expected_categories, expected_articles
  from halleus_wiki_seed_payload;

  select count(*) into stored_categories
  from public.wiki_categories as stored
  where stored.id in (
    select category ->> 'id'
    from halleus_wiki_seed_payload,
      jsonb_array_elements(payload -> 'categories') as item(category)
  );

  select count(*) into stored_articles
  from public.wiki_articles as stored
  where stored.slug in (
    select article ->> 'slug'
    from halleus_wiki_seed_payload,
      jsonb_array_elements(payload -> 'articles') as item(article)
  )
    and stored.status = 'published'
    and stored.is_indexable = true
    and stored.published_at is not null
    and stored.scheduled_for is null;

  if stored_categories <> expected_categories then
    raise exception 'Wiki category seed mismatch: expected %, stored %', expected_categories, stored_categories;
  end if;

  if stored_articles <> expected_articles then
    raise exception 'Wiki article seed mismatch: expected %, stored %', expected_articles, stored_articles;
  end if;
end;
$$;

commit;

select 'HALLEUS_V01327_WIKI_CONTENT_SEED=SUCCESS' as marker;
`;
}

export async function expectedWikiSeed() {
  const wikiModule = await readWikiContentModule();
  return renderWikiSeed({
    categories: wikiModule.wikiCategories,
    articles: wikiModule.wikiArticles,
  });
}

async function main() {
  const expected = await expectedWikiSeed();
  const checkOnly = process.argv.includes("--check");

  if (checkOnly) {
    const actual = readFileSync(seedPath, "utf8");
    if (normalizeLineEndings(actual) !== normalizeLineEndings(expected)) {
      console.error("Wiki storage seed content is not synchronized with wiki-content.ts.");
      process.exit(1);
    }
    console.log("Wiki storage seed parity check passed.");
    return;
  }

  writeFileSync(seedPath, expected, "utf8");
  console.log(`Wrote ${path.relative(root, seedPath)}.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
