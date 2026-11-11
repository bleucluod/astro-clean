import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const newFiles = [
  'lib/wiki/wiki-shop-showcase.ts',
  'app/api/admin/wiki/shop-showcases/route.ts',
  'components/admin/WikiShopShowcasePanel.tsx',
  'components/wiki/WikiShopShowcaseCard.tsx',
  'components/wiki/WikiArticleRender.tsx',
  'app/wiki/[slug]/page.tsx',
  'components/admin/WikiAdminPanel.tsx',
  'components/admin/AdminConsole.tsx',
];
for (const path of newFiles) {
  const out = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  assert.deepEqual(
    (out.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error),
    [], 'TSX/TS parse ' + path,
  );
}

const migration = read('database/migrations/0036_wiki_shop_showcases.sql');
assert.match(migration, /create table if not exists halleus_private\.wiki_shop_showcases/);
assert.match(migration, /article_id uuid primary key/);
assert.match(migration, /enable row level security/);
assert.match(migration, /revoke all on halleus_private\.wiki_shop_showcases from public, anon, authenticated/);
assert.doesNotMatch(migration, /drop table|drop schema|truncate|delete from/i);

const api = read('app/api/admin/wiki/shop-showcases/route.ts');
assert.match(api, /requireAdminCapability\(request, 'wiki\.read'\)/);
assert.match(api, /requireAdminCapability\(request, 'wiki\.publish\.write'\)/);
assert.match(api, /assertAdminMutationRequest\(request\)/);
assert.match(api, /mode === 'export'/);
assert.match(api, /action !== 'preview'/);
assert.match(api, /action !== 'apply'/);
assert.match(api, /revalidatePath\('\/wiki\/' \+ slug, 'page'\)/);

const article = read('app/wiki/[slug]/page.tsx');
const renderer = read('components/wiki/WikiArticleRender.tsx');
assert.match(article, /showcase=\{wikiShopShowcase\}/);
assert.match(renderer, /index === showcase\.afterSectionIndex/);
assert.match(renderer, /section\.title === showcase\.sectionTitle/);
assert.match(read('components/admin/AdminConsole.tsx'), /id: "showcases"/);
assert.match(read('components/admin/WikiAdminPanel.tsx'), /<WikiShopShowcasePanel token=\{token\} canWrite=\{canPublish\}/);
const panel = read('components/admin/WikiShopShowcasePanel.tsx');
for (const action of ['mode=export', 'action: "preview"', 'action: "apply"', 'checked={approved.includes(index)}']) {
  assert.ok(panel.includes(action), 'panel missing reviewed workflow: ' + action);
}
assert.doesNotMatch(panel, /localStorage|setInterval/);

class AdminAccessError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const sections = Array.from({ length: 5 }, (_, i) => ({
  title: 'عنوان بخش ' + i, paragraphs: ['بخش آموزشی با توضیح مرتبط ' + i],
}));
const row = {
  id: '11111111-1111-4111-8111-111111111111',
  stable_id: 'demo-moon', slug: 'demo-moon', title: 'مقالهٔ نمونه',
  category_id: 'foundations', summary: 'خلاصهٔ نمونه', intro: 'مقدمهٔ نمونه',
  content_version: 2, sections,
};
let stored = null, writes = 0, audits = 0;
const sql = async (strings, ...values) => {
  const q = strings.join('?').replace(/\s+/g, ' ').toLowerCase();
  if (q.includes('insert into halleus_private.admin_audit_events')) {
    audits++;
    return [];
  }
  if (q.includes('insert into halleus_private.wiki_shop_showcases')) {
    writes++;
    if (stored && values[10] !== stored.revision) return [];
    const newRevision = stored ? stored.revision + 1 : 1;
    stored = { ...stored, product_id: values[1], revision: newRevision };
    return [{ revision: newRevision }];
  }
  if (q.includes('from public.wiki_articles') && !q.includes('join public.wiki_articles')) {
    return values.length && values[0] !== row.id ? [] : [row];
  }
  if (q.includes('from halleus_private.wiki_shop_showcases s')) {
    if (!stored) return [];
    if (q.includes('where a.slug')) return [{
      product_id: stored.product_id, after_section_index: 1, section_title: sections[1].title,
      title: 'عنوان فروش', description: 'توضیح مناسب', button_label: 'مشاهدهٔ تابلو',
    }];
    return [{
      article_id: row.id, slug: row.slug, article_title: row.title,
      content_version: row.content_version, sections, article_version: row.content_version,
      product_id: stored.product_id, after_section_index: 1, section_title: sections[1].title,
      title: 'عنوان فروش', description: 'توضیح مناسب', button_label: 'مشاهدهٔ تابلو',
      enabled: true, revision: stored.revision,
    }];
  }
  throw new Error('Unexpected SQL: ' + q);
};
sql.begin = (callback) => callback(sql);
const getShopProduct = (id) => ({
  title: id === 'p01' ? 'ماه آن روز' : id === 'p02' ? 'آسمان تولد' : 'شب ما',
  introduction: 'محصول نمونه',
  gallery: [{ src: '/shop-preview/sample.webp', alt: 'محصول' }],
});
const dependencies = {
  '@/lib/admin/admin-auth': { AdminAccessError },
  '@/lib/admin/admin-database': {
    getAdminDatabase: () => sql,
    asRecord: (v) => typeof v === 'object' && v !== null && !Array.isArray(v) ? v : {},
    asString: (v) => typeof v === 'string' ? v : '',
    asNumber: Number,
  },
  '@/lib/shop/shop-mvp-activation': { isShopMvpActive: () => true, isShopP02OrderEnabled: () => false },
  '@/components/shop/product-detail-data': { getShopProduct },
  '@/lib/shop/shop-product-url': { getShopProductUrl: (id) => '/shop/' + id },
};
const transpiled = ts.transpileModule(read('lib/wiki/wiki-shop-showcase.ts'), {
  fileName: 'lib/wiki/wiki-shop-showcase.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const module = { exports: {} };
vm.runInNewContext('(function(module,exports,require){' + transpiled.outputText + '\n})', {
  crypto: { randomUUID: () => '77777777-7777-4777-8777-777777777777' },
})(module, module.exports, (name) => {
  if (!(name in dependencies)) throw new Error('Unexpected dependency ' + name);
  return dependencies[name];
});
const mod = module.exports;

const guide = await mod.exportWikiShopShowcaseGuide();
assert.equal(guide.schemaVersion, 1);
assert.equal(guide.articles.length, 1);
assert.deepEqual(Array.from(guide.articles[0].allowedAfterSectionIndexes), [1, 2, 3]);
assert.equal(guide.products.length, 3);
assert.equal(guide.products.find((p) => p.id === 'p02').orderable, false);
const proposal = {
  articleId: row.id, articleVersion: 2, productId: 'p01', afterSectionIndex: 1,
  sectionTitle: sections[1].title, title: 'عنوان فروش',
  description: 'توضیح مناسب', buttonLabel: 'مشاهدهٔ تابلو',
};
let reviews = await mod.previewWikiShopShowcaseProposals([proposal]);
assert.equal(reviews[0].valid, true);
reviews = await mod.previewWikiShopShowcaseProposals([
  { ...proposal, afterSectionIndex: 4, sectionTitle: sections[4].title },
  { ...proposal, articleVersion: 1 },
  { ...proposal, productId: 'p02' },
]);
assert.equal(reviews[0].valid, false, 'No placement at article end');
assert.equal(reviews[1].valid, false, 'Stale article version');
assert.equal(reviews[2].valid, true, 'Closed product may be saved as an inactive draft');

const actor = { userId: '22222222-2222-4222-8222-222222222222', role: 'owner' };
await assert.rejects(mod.saveWikiShopShowcaseBatch(actor, [{ ...proposal, enabled: true, productId: 'p02' }]));
assert.equal(writes, 0, 'Closed product cannot be activated');
await mod.saveWikiShopShowcaseBatch(actor, [{ ...proposal, enabled: true, expectedRevision: 0 }]);
assert.equal(writes, 1);
assert.equal(audits, 1);
assert.equal((await mod.getPublicWikiShopShowcase(row.slug))?.productId, 'p01');
stored.product_id = 'p02';
assert.equal(await mod.getPublicWikiShopShowcase(row.slug), null, 'Closed product must not render');
assert.ok(read('components/shop/ProductDetail.tsx').includes('useShopGallerySwipe'));
console.log('Wiki shop showcase focused safety/placement/export/admin contract OK');
