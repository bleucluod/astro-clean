import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// A small, reversible editorial delta on top of the immutable 74-article R3 batch.
// No database writes are possible in --self-check, --check or --verify modes.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
if (process.argv.length !== 3 || !['--self-check', '--check', '--apply', '--verify'].includes(mode)) {
  throw Error('Usage: node scripts/apply-r3-final-closeout.mjs --self-check|--check|--apply|--verify');
}
const fatal = (message) => { throw Error('SAFETY_FATAL: ' + message); };
const equal = (a, b) => {
  const normal = (x) => Array.isArray(x) ? x.map(normal) : x && typeof x === 'object'
    ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, normal(x[k])])) : x;
  return JSON.stringify(normal(a)) === JSON.stringify(normal(b));
};
const specs = [
  { pageId: 'W247', slug: 'what-is-chinese-astrology', target: 'chinese-zodiac-compatibility-marriage', anchor: 'سازگاری طالع‌بینی چینی' },
  { pageId: 'W252', slug: 'chinese-zodiac-birth-month-inner-animal', target: 'what-is-moon-sign', anchor: 'نشان ماه چیست' },
  { pageId: 'W268', slug: 'birth-month-flowers', target: 'birth-chart-basics', anchor: 'چارت تولد چیست' },
];
const manifest = JSON.parse(readFileSync(resolve(root, 'content/r3-batch07/manifest.json'), 'utf8'));
if (manifest.schema !== 'HALLEUS_R3_BATCH07_MANIFEST_V1' || manifest.record_count !== 74 ||
    manifest.approval_count !== 74 || manifest.records?.length !== 74 ||
    manifest.release_authorized !== false || manifest.publication_authorized !== false ||
    manifest.source_backup_commit !== 'c90a9b401592eab2b470d7e5920f5f6b40f73c6d') {
  fatal('approved batch07 manifest changed');
}

const count = (source, token) => source.split(token).length - 1;
function replaceDeep(value, token, anchor, changes) {
  if (typeof value === 'string') {
    changes.count += count(value, token);
    return value.replaceAll(token, anchor);
  }
  if (Array.isArray(value)) return value.map((item) => replaceDeep(item, token, anchor, changes));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceDeep(item, token, anchor, changes)]));
  }
  return value;
}

const items = specs.map((spec) => {
  const entry = manifest.records.find((record) => record.page_id === spec.pageId);
  if (!entry || entry.slug !== spec.slug) fatal('missing or altered approved page ' + spec.pageId);
  const bytes = readFileSync(resolve(root, 'content/r3-batch07/wiki', spec.pageId + '.json'));
  if (createHash('sha256').update(bytes).digest('hex') !== entry.candidate_json_sha256) {
    fatal('locked approved JSON hash changed: ' + spec.pageId);
  }
  const doc = JSON.parse(bytes.toString('utf8'));
  if (doc.schema !== 'HALLEUS_R3_BATCH07_OFFLINE_CANDIDATE_V1' ||
      doc.slug !== spec.slug || doc.baseline_content_version !== entry.baseline_content_version ||
      doc.approved_sha256 !== entry.approved_sha256 ||
      doc.canonical_url !== 'https://halleus.ir/wiki/' + spec.slug) fatal('approved page identity changed');
  const token = `[[article:${spec.target}|${spec.anchor}]]`;
  const content = doc.content;
  const sectionChanges = { count: 0 };
  const updatedSections = replaceDeep(content.sections, token, spec.anchor, sectionChanges);
  if (count(content.body_markdown, token) !== 1 || sectionChanges.count !== 2 ||
      count(content.intro, token) !== 0 || !content.body_markdown.includes(token)) {
    fatal('unexpected extra-link footprint: ' + spec.pageId);
  }
  const original = Object.fromEntries(['title', 'seo_title', 'meta_description', 'intro', 'sections', 'body_markdown',
    ...('summary' in content ? ['summary'] : [])].map((field) => [field, content[field]]));
  const updated = { ...original, sections: updatedSections, body_markdown: content.body_markdown.replace(token, spec.anchor) };
  if (updated.body_markdown.includes(token) || JSON.stringify(updated.sections).includes(token)) {
    fatal('extra token still present in proposed article ' + spec.pageId);
  }
  return { ...spec, token, doc, original, updated, beforeVersion: doc.baseline_content_version + 1 };
});
if (items.length !== 3 || new Set(items.map((x) => x.slug)).size !== 3) fatal('expected exactly three unique sources');
console.log('PASS | R3_CLOSEOUT_LOCK three_extra_links=3 approved_batch_unchanged=74');

function review(rows, linkRows) {
  const bySlug = new Map(rows.map((row) => [row.stable_id, row]));
  const issues = [], changes = [];
  for (const item of items) {
    const row = bySlug.get(item.slug);
    if (!row || row.slug !== item.slug || row.status !== 'published' || !row.is_indexable ||
        row.deleted_at || !row.published_at || row.scheduled_for) {
      issues.push(item.pageId + ': source not published or missing'); continue;
    }
    const version = Number(row.content_version);
    const before = version === item.beforeVersion && Object.entries(item.original).every(([key, value]) => equal(row[key], value));
    const after = version === item.beforeVersion + 1 && Object.entries(item.updated).every(([key, value]) => equal(row[key], value));
    if (!before && !after) {
      issues.push(item.pageId + ': content or version drift; refuse to overwrite later edits'); continue;
    }
    const matching = linkRows.filter((link) => link.source_article_id === row.id &&
      link.target_stable_id === item.target && link.link_kind === 'inline');
    if (matching.length !== (before ? 1 : 0)) {
      issues.push(item.pageId + ': inline link registry out of sync'); continue;
    }
    if (before && matching[0].source_token !== `[[article:${item.target}]]`) {
      issues.push(item.pageId + ': inline link registry token changed'); continue;
    }
    changes.push({ item, row, already: after });
  }
  return { issues, changes };
}

function fixtures() {
  const rows = items.map((item, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    stable_id: item.slug, slug: item.slug, status: 'published', is_indexable: true,
    deleted_at: null, scheduled_for: null, published_at: '2026-11-01',
    content_version: item.beforeVersion, ...item.original,
  }));
  const links = items.map((item, i) => ({ source_article_id: rows[i].id, target_stable_id: item.target,
    link_kind: 'inline', source_token: `[[article:${item.target}]]` }));
  const ready = review(rows, links);
  if (ready.issues.length || ready.changes.some((x) => x.already)) fatal('fresh fixture');
  const applied = rows.map((row, i) => ({ ...row, ...items[i].updated, content_version: items[i].beforeVersion + 1 }));
  const resumed = review(applied, []);
  if (resumed.issues.length || resumed.changes.some((x) => !x.already)) fatal('resume fixture');
  if (!review(rows.slice(1), links).issues.length) fatal('missing-row fixture');
  if (!review([{ ...rows[0], body_markdown: 'later admin edit' }, ...rows.slice(1)], links).issues.length) fatal('admin-edit fixture');
  if (!review([{ ...rows[0], content_version: rows[0].content_version + 3 }, ...rows.slice(1)], links).issues.length) fatal('newer-version fixture');
  if (!review(rows, links.slice(1)).issues.length) fatal('link-registry fixture');
  if (!review(rows, [{ ...links[0], source_token: 'unexpected' }, ...links.slice(1)]).issues.length) fatal('modified-link-token fixture');
  console.log('PASS | R3_CLOSEOUT_FIXTURES fresh/resume/admin-edit/missing/newer/link-registry');
}
fixtures();
if (mode === '--self-check') {
  console.log('PASS | R3_CLOSEOUT_NO_DB_NO_GIT_WRITES');
  process.exit(0);
}
if (!process.env.DATABASE_URL) fatal('DATABASE_URL unavailable; DB access never inferred');
if (mode === '--apply' && (process.env.HALLEUS_R3_CLOSEOUT_APPROVED !== 'YES' ||
    process.env.HALLEUS_R3_CLOSEOUT_APPROVAL_REFERENCE !== 'user-explicit-vps-r3-closeout')) {
  fatal('separate user VPS closeout approval required; GitHub preparation is not release approval');
}

const postgres = (await import('postgres')).default;
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 5 });
const slugs = items.map((x) => x.slug);

function snapshot(r) {
  return {
    stableId: r.stable_id, slug: r.slug, title: r.title, shortTitle: r.short_title,
    seoTitle: r.seo_title || undefined, metaDescription: r.meta_description || undefined,
    categoryId: r.category_id, tags: r.tags || [], summary: r.summary, intro: r.intro,
    readingMinutes: Number(r.reading_minutes), publicationPriority: Number(r.publication_priority || 0),
    contentCluster: r.content_cluster || r.category_id, articleRole: r.article_role,
    relatedArticleIds: r.related_article_ids || [], indexable: !!r.is_indexable,
    bodyMarkdown: r.body_markdown || '', keyPoints: r.key_points || [], sections: r.sections || [],
    contextLinks: r.context_links || [], sources: r.sources || [], callToAction: r.call_to_action,
    contentVersion: Number(r.content_version),
  };
}

try {
  if (mode === '--check' || mode === '--verify') {
    const rows = await sql`select * from public.wiki_articles where stable_id=any(${slugs}::text[])`;
    const ids = rows.map((row) => row.id);
    const links = await sql`select source_article_id, target_stable_id, link_kind, source_token from public.wiki_internal_links where source_article_id=any(${ids}::uuid[])`;
    const result = review(rows, links);
    if (result.issues.length) fatal('read-only database parity: ' + result.issues.join('; '));
    if (mode === '--verify' && result.changes.some((x) => !x.already)) fatal('three-link removal not applied');
    console.log('PASS | R3_CLOSEOUT_' + (mode === '--check' ? 'READ_ONLY_PREFLIGHT' : 'DB_EXACT_PARITY') +
      ' sources=3 removed=' + result.changes.filter((x) => x.already).length);
  } else {
    const result = await sql.begin(async (tx) => {
      const rows = await tx`select * from public.wiki_articles where stable_id=any(${slugs}::text[]) order by stable_id for update`;
      const ids = rows.map((row) => row.id);
      const links = await tx`select source_article_id, target_stable_id, link_kind, source_token from public.wiki_internal_links where source_article_id=any(${ids}::uuid[]) for update`;
      const plan = review(rows, links);
      if (plan.issues.length) fatal('transaction-time drift: ' + plan.issues.join('; '));
      let updated = 0, resumed = 0;
      for (const { item, row, already } of plan.changes) {
        if (already) { resumed++; continue; }
        const rev = await tx`select coalesce(max(revision_number),0)::int as n from public.wiki_article_revisions where article_id=${row.id}::uuid`;
        const n = Number(rev[0].n) + 1;
        await tx`insert into public.wiki_article_revisions(article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values(${row.id}::uuid,${n},${tx.json(snapshot(row))}::jsonb,'R3 final link closeout before',null,'published',now())`;
        const changed = await tx`update public.wiki_articles set sections=${tx.json(item.updated.sections)}::jsonb,body_markdown=${item.updated.body_markdown},content_version=${item.beforeVersion+1},updated_at=now() where id=${row.id}::uuid and content_version=${item.beforeVersion} and body_markdown=${item.original.body_markdown} and status='published' returning *`;
        if (changed.length !== 1) fatal('concurrent mutation detected: ' + item.pageId);
        const removed = await tx`delete from public.wiki_internal_links where source_article_id=${row.id}::uuid and target_stable_id=${item.target} and link_kind='inline' and source_token=${'[[article:'+item.target+']]'} returning source_article_id`;
        if (removed.length !== 1) fatal('link-registry deletion mismatch: ' + item.pageId);
        await tx`insert into public.wiki_article_revisions(article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values(${row.id}::uuid,${n+1},${tx.json(snapshot(changed[0]))}::jsonb,'R3 final link closeout after',null,'published',now())`;
        updated++;
      }
      return { updated, resumed };
    });
    console.log('PASS | R3_CLOSEOUT_TRANSACTION_COMMITTED ' + JSON.stringify(result) + ' | live verification still required');
  }
} finally {
  await sql.end({ timeout: 2 });
}
