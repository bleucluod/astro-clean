import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => fs.readFileSync(resolve(root, path), 'utf8');
function load(path, mocks = {}) {
  const result = ts.transpileModule(read(path), {
    fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  assert.equal((result.diagnostics ?? []).filter(d =>
    d.category === ts.DiagnosticCategory.Error).length, 0, 'Invalid TypeScript: ' + path);
  const mod = { exports: {} };
  vm.runInNewContext('(function(module,exports,require){' + result.outputText + '\n})',
    { console })(mod, mod.exports, name => {
      if (name in mocks) return mocks[name];
      throw Error('Unexpected dependency: ' + name + ' in ' + path);
    });
  return mod.exports;
}
const months = load('lib/shop/nemad-man-months.ts');
const positions = load('lib/wiki/wiki-showcase-positions.ts');
const helper = load('lib/wiki/wiki-nemad-showcase.ts', {
  '@/lib/shop/nemad-man-months': months,
  './wiki-showcase-positions': positions,
});
const catalog = helper.wikiNemadProducts(true);
assert.equal(catalog.length, 12);
assert.equal(new Set(catalog.map(p => p.id)).size, 12);
assert.ok(helper.wikiNemadProducts(false).every(p => !p.orderable));
const sections = Array.from({ length: 6 }, (_, i) => ({
  title: 'بخش ' + i, paragraphs: ['متن یک بخش معنادار '.repeat(12)],
}));
for (const month of months.NEMAD_MONTHS) {
  const article = { slug: month.slug + '-man-traits',
    title: 'خصوصیات مرد متولد ' + month.title, sections };
  const product = catalog.find(p => p.id === 'nm-' + month.slug);
  assert.ok(product);
  assert.equal(product.url, '/shop/' + month.slug + '-sign');
  assert.ok(fs.existsSync(resolve(root, 'public', product.image.slice(1))),
    'Missing approved image: ' + product.image);
  const offer = helper.automaticNemadWikiOffer(article, new Set(), []);
  assert.ok(offer, 'Missing article match: ' + month.slug);
  assert.equal(offer.productId, product.id);
  assert.equal(offer.url, product.url);
  assert.equal(offer.image, product.image);
  assert.equal(offer.sectionTitle, sections[offer.afterSectionIndex].title);
  assert.ok(!/^[a-f0-9]{8}-/i.test(offer.id), 'Auto cards must not impersonate DB UUIDs');
  assert.equal(helper.automaticNemadWikiOffer(article, new Set(), [product.id]), null,
    'Do not duplicate manager-approved monthly card');
  assert.equal(helper.automaticNemadWikiOffer(article, new Set([1,2,3,4]), []), null,
    'Do not collide with existing section placements');
}
for (const [slug,title] of [
  ['why-sun-sign-is-not-enough', 'چرا ماه تولد کافی نیست'],
  ['mehr-calendar', 'تقویم مهر'],
  ['mehr-man-traits', 'خصوصیات مرد متولد آبان'],
  ['mehr-aban-compatibility', 'سازگاری متولد مهر و آبان'],
  ['mehr-man-traits', 'خصوصیات مرد متولد مهر و فروردین'],
]) {
  assert.equal(helper.automaticNemadWikiOffer({ slug, title, sections }, new Set(), []), null,
    'A general or mixed article must not get a month-specific product');
}
const source = read('lib/wiki/wiki-shop-showcase.ts');
const page = read('app/wiki/[slug]/page.tsx');
const article = read('components/wiki/WikiArticleRender.tsx');
const events = read('app/api/wiki/showcase-event/route.ts');
assert.match(source, /wikiNemadProducts\(isShopNemadOrderEnabled\(\)\)/);
assert.match(source, /automaticNemadWikiOffer\(/);
assert.match(source, /used\.add\(afterSectionIndex\)/);
assert.match(page, /getPublicWikiShopShowcase\(article\.slug,\s*\{ title: article\.title, sections: article\.sections \}\)/);
assert.match(article, /!offer\.id\.startsWith\('auto-nemad-'\)/);
assert.match(events, /s\.product_id = any\(\$\{orderableProducts\}::text\[\]\)/);
assert.doesNotMatch(source, /insert into|update halleus_private.*nm-/i);
console.log('WIKI_NEMAD_MONTH_SHOWCASES=PASS 12 month URLs, approved images, matching, no collisions, legacy metrics');
