import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
function load(relativePath, dependencies = {}) {
  const source = readFileSync(resolve(root, relativePath), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  }}).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(module,exports,require){${compiled}\n})`)(
    module, module.exports, (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
      return dependencies[name];
    },
  );
  return module.exports;
}
const catalog = load('components/shop/product-detail-data.ts');
const spec = load('lib/shop/shop-print-spec.ts', { '@/components/shop/product-detail-data': catalog });

assert.equal(spec.SHOP_PRINT_TARGET_PPI, 300);
for (const [size, width, height] of [
  ['10x15', 1182, 1772], ['20x30', 2363, 3544], ['30x45', 3544, 5315],
]) {
  const value = spec.getShopPrintSpec(size);
  assert.equal(value.minimumNativePixels.width, width);
  assert.equal(value.minimumNativePixels.height, height);
  assert.equal(value.preferredProfile, 'sRGB');
  const accepted = spec.checkShopRasterPrepress({
    productId: 'p03', size, width, height, space: 'srgb', channels: 3,
    isApprovedFinalMaster: true,
  });
  assert.equal(accepted.readyToPrint, true, `${size} sufficient approved source`);
  assert.equal(spec.checkShopRasterPrepress({
    productId: 'p03', size, width, height, space: 'srgb', channels: 3,
    isApprovedFinalMaster: false,
  }).readyToPrint, false);
}
assert.throws(() => spec.getShopPrintSpec('40x60'));
for (const bad of [
  { width: 1024, height: 1536, space: 'srgb', channels: 3, isApprovedFinalMaster: true },
  { width: 3544, height: 5315, space: 'cmyk', channels: 4, isApprovedFinalMaster: true },
  { width: 5315, height: 3544, space: 'srgb', channels: 3, isApprovedFinalMaster: true },
]) {
  assert.equal(spec.checkShopRasterPrepress({ productId: 'p03', size: '30x45', ...bad }).readyToPrint, false);
}

// A gallery mockup is not a production master: the new unpersonalized proof is
// deliberately rejected for native-resolution and artwork-approval reasons.
const masterPath = resolve(root, 'assets/shop-print/p03-milky-way-proof-v1.webp');
const metadata = await sharp(masterPath).metadata();
assert.equal(metadata.width, 1024);
assert.equal(metadata.height, 1536);
const proof = spec.checkShopRasterPrepress({
  productId: 'p03', size: '10x15', width: metadata.width, height: metadata.height,
  space: metadata.space, channels: metadata.channels, isApprovedFinalMaster: false,
});
assert.equal(proof.readyToPrint, false);
assert.ok(proof.issues.includes('insufficient-native-resolution'));
assert.ok(proof.issues.includes('artwork-not-approved'));
console.log('Shop prepress: 300 PPI size math, RGB, approved-master gates and proof-only artwork boundaries passed.');
