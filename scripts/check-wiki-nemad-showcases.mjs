import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = path => fs.readFileSync(resolve(root, path), 'utf8');
function load(path, mocks = {}) {
  const compiled = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal((compiled.diagnostics ?? []).filter(d =>
    d.category === ts.DiagnosticCategory.Error).length, 0, 'TypeScript: ' + path);
  const mod = { exports: {} };
  vm.runInNewContext('(function(module,exports,require){' + compiled.outputText + '\n})',
    { console })(mod, mod.exports, name => {
    if (name in mocks) return mocks[name];
    throw Error('Unexpected mock dependency: ' + name);
  });
  return mod.exports;
}

const months = load('lib/shop/nemad-man-months.ts');
const helper = load('lib/wiki/wiki-nemad-showcase.ts', {
  '@/lib/shop/nemad-man-months': months,
});
const catalog = helper.wikiNemadProducts(true);
assert.equal(catalog.length, 12);
assert.equal(new Set(catalog.map(p => p.id)).size, 12);
assert.ok(helper.wikiNemadProducts(false).every(p => !p.orderable));
for (const month of months.NEMAD_MONTHS) {
  const id = `nm-${month.slug}`;
  const product = catalog.find(p => p.id === id);
  assert.ok(product, 'Missing month product: ' + month.slug);
  assert.equal(product.url, `/shop/${month.slug}-sign`);
  assert.ok(fs.existsSync(resolve(root, 'public', product.image.slice(1))),
    'Approved month image missing: ' + product.image);
  const suggestion = helper.suggestWikiNemadMonth(`${month.slug}-man-traits`,
    `خصوصیات مرد متولد ${month.title}`);
  assert.equal(suggestion?.slug, month.slug);
  const copy = helper.wikiNemadSuggestedCopy(id);
  assert.ok(copy.title.includes(month.title));
  assert.ok(copy.description.includes(month.title));
  assert.ok(copy.buttonLabel.includes(month.title));
}
assert.equal(helper.wikiNemadSuggestedCopy('p01'), null);
for (const [slug, title] of [
  ['why-sun-sign-is-not-enough', 'چرا ماه تولد کافی نیست'],
  ['mehr-calendar', 'تقویم مهر'],
  ['mehr-man-traits', 'خصوصیات مرد متولد آبان'],
  ['mehr-aban-compatibility', 'سازگاری متولد مهر و آبان'],
  ['mehr-man-traits', 'خصوصیات مرد متولد مهر و فروردین'],
]) assert.equal(helper.suggestWikiNemadMonth(slug, title), null);

const service = read('lib/wiki/wiki-shop-showcase.ts');
const publicPage = read('app/wiki/[slug]/page.tsx');
const panel = read('components/admin/WikiShopShowcasePanel.tsx');
const route = read('app/api/admin/wiki/shop-showcases/route.ts');
const article = read('components/wiki/WikiArticleRender.tsx');
const metricRoute = read('app/api/wiki/showcase-event/route.ts');
assert.match(service, /wikiNemadProducts\(isShopNemadOrderEnabled\(\)\)/);
assert.match(service, /return result\.sort\(/);
assert.doesNotMatch(service, /automaticNemadWikiOffer|auto-nemad-/);
assert.match(publicPage, /getPublicWikiShopShowcase\(article\.slug\)/);
assert.match(panel, /suggestWikiNemadMonth\(row\.slug, row\.title\)/);
assert.match(panel, /wikiNemadSuggestedCopy\(id\)/);
assert.match(panel, /action: "publish"|"publish"/);
assert.match(article, /track=\{trackShowcases\}/);
assert.match(metricRoute, /s\.product_id = any\(\$\{orderableProducts\}::text\[\]\)/);
assert.match(route, /requireAdminCapability\(request, "wiki\.publish\.write"\)/);
assert.doesNotMatch(read('lib/wiki/wiki-nemad-showcase.ts'), /getAdminDatabase|insert into|update halleus_private/i);
console.log('WIKI_NEMAD_ADMIN=PASS catalog12, correct URLs and images, suggested draft only, reviewed publication, old cards preserved');
