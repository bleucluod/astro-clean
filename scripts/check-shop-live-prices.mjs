import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const esmRequire = createRequire(import.meta.url);
const ts = (() => {
  try { return esmRequire('typescript'); }
  catch { return createRequire('/srv/halleus/current/package.json')('typescript'); }
})();

const root=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const compile=(path,dependencies)=>{
  const compiled=ts.transpileModule(read(path),{
    fileName:path,reportDiagnostics:true,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
  });
  assert.equal((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,path);
  const mod={exports:{}};
  const factory=vm.runInNewContext('(function(module,exports,require){'+compiled.outputText+'\n})',
    {Date,Buffer,URL,process:{env:{NODE_ENV:'production'}}});
  factory(mod,mod.exports,name=>{
    if(!(name in dependencies))throw new Error('Unexpected dependency '+path+' -> '+name);
    return dependencies[name];
  });
  return mod.exports;
};
const sizes=[
  {dimension:'10x15',label:'۱۰ × ۱۵',price:900000},
  {dimension:'20x30',label:'۲۰ × ۳۰',price:1599000},
  {dimension:'30x45',label:'۳۰ × ۴۵',price:2300000},
];
const skySizes=[
  {dimension:'10x15',label:'۱۰ × ۱۵',price:1100000},
  {dimension:'20x30',label:'۲۰ × ۳۰',price:1900000},
  {dimension:'30x45',label:'۳۰ × ۴۵',price:2900000},
];
const product={
  SHOP_SIZES:sizes,SHOP_P02_SIZES:skySizes,
  getShopProductPrice:(id,size)=>(id==='p01'?sizes:id==='p02'?skySizes:[])
    .find(row=>row.dimension===size)?.price??null,
};
const now=Date.now();
const fakeRows=[
  {product_id:'p01',size:'10x15',price_toman:10000,revision:2,
    expires_at:new Date(now+3600000).toISOString(),active:true},
  {product_id:'p02',size:'20x30',price_toman:1000,revision:3,
    expires_at:new Date(now-1000).toISOString(),active:false},
];
const sql=async()=>fakeRows;
let auditCount=0;
let row={price_toman:10000,revision:2};
const tx=async(parts,...values)=>{
  const query=parts.join('?').toLowerCase();
  if(query.includes('select price_toman, revision'))return row?[row]:[];
  if(query.includes('update halleus_private.shop_price_overrides')){
    row={price_toman:values[0],revision:row.revision+1};return[];
  }
  if(query.includes('insert into halleus_private.shop_price_overrides')){
    row={price_toman:values[2],revision:1};return[];
  }
  if(query.includes('delete from halleus_private.shop_price_overrides')){row=null;return[];}
  if(query.includes('insert into halleus_private.shop_price_change_events')){auditCount++;return[];}
  throw new Error('Unexpected synthetic SQL '+query);
};
sql.begin=async fn=>fn(tx);
const store=compile('lib/shop/shop-price-store.ts',{
  '@/lib/admin/admin-database':{getAdminDatabase:()=>sql},
  '@/components/shop/product-detail-data':product,
});
assert.equal(store.listBaseShopPrices().length,6);
const snapshot=await store.readShopPriceCatalog();
assert.equal(snapshot.rows.length,6);
assert.equal(snapshot.prices['p01:10x15'],10000,'temporary override');
assert.equal(snapshot.prices['p02:20x30'],1900000,'expired override automatically ignored');
assert.equal(snapshot.rows.find(x=>x.productId==='p02'&&x.size==='20x30').revision,3,'expired revision preserved');
store.assertShopPriceMap(snapshot.prices);
assert.throws(()=>store.assertShopPriceMap({...snapshot.prices,'p01:10x15':0}));
const quote=compile('lib/shop/shop-quote.ts',{
  '@/components/shop/product-detail-data':product,
  './shop-mvp-activation':{isShopP02OrderEnabled:()=>true},
  '@/components/shop/shop-checkout-state':{SHOP_SHIPPING_AND_PACKAGING:{post:100000,tipax:50000}},
  './shop-price-store':store,
});
const item={productId:'p01',size:'10x15',quantity:1};
const paid=quote.quoteShopItems({carrier:'tipax',items:[item]},snapshot.prices);
assert.equal(paid.subtotal,10000);
assert.equal(paid.total,60000,'BitPay order quote must use the DB price plus fixed shipping');
assert.throws(()=>quote.quoteShopItems({carrier:'tipax',items:[item]},{
  ...snapshot.prices,'p01:10x15':-1,
}));
const other=quote.quoteShopItems({carrier:'post',items:[{productId:'p02',size:'20x30',quantity:1}]},snapshot.prices);
assert.equal(other.total,2000000);
const actor='11111111-1111-4111-8111-111111111111';
await assert.rejects(store.editShopPrice({
  actorUserId:actor,productId:'p01',size:'10x15',expectedRevision:2,action:'set',
  priceToman:999,expiresInMinutes:60,
}));
await assert.rejects(store.editShopPrice({
  actorUserId:actor,productId:'p01',size:'10x15',expectedRevision:1,action:'set',
  priceToman:15000,expiresInMinutes:60,
}),error=>error.status===409);
await store.editShopPrice({
  actorUserId:actor,productId:'p01',size:'10x15',expectedRevision:2,action:'set',
  priceToman:15000,expiresInMinutes:60,
});
assert.equal(row.price_toman,15000);
assert.equal(row.revision,3);
await store.editShopPrice({
  actorUserId:actor,productId:'p01',size:'10x15',expectedRevision:3,action:'reset',
});
assert.equal(row,null);
assert.equal(auditCount,2,'all live price mutations must have an audit record');
const migration=read('database/migrations/0035_private_shop_price_overrides.sql');
for(const marker of ['begin;', 'commit;', 'shop_price_overrides','shop_price_change_events',
  'enable row level security','from public, anon, authenticated','reject_audit_event_mutation']) {
  assert.ok(migration.includes(marker),'missing migration boundary '+marker);
}
for(const path of [
  'app/api/shop/prices/route.ts','app/api/admin/shop/prices/route.ts',
  'app/api/shop/quote/route.ts','app/api/shop/orders/route.ts',
  'lib/shop/shop-price-store.ts','lib/shop/shop-quote.ts','lib/shop/shop-order-contract.ts',
  'components/shop/use-shop-live-prices.ts','components/shop/ProductDetail.tsx',
  'components/shop/BirthSkyLiveProduct.tsx','components/shop/ShopCheckoutFlow.tsx',
  'components/admin/ShopPriceEditor.tsx','app/shop/page.tsx','app/shop/birth-sky-map/page.tsx'
]) {
  const tree=ts.createSourceFile(path,read(path),ts.ScriptTarget.ES2022,true,
    path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  assert.equal(tree.parseDiagnostics.length,0,'invalid TypeScript/TSX syntax '+path);
}
const ownerRoute=read('app/api/admin/shop/prices/route.ts');
assert.match(ownerRoute,/requireAdminCapability\(request, 'shop_orders.write'\)/);
assert.match(ownerRoute,/actor\.role !== 'owner'/);
assert.match(ownerRoute,/assertAdminMutationRequest\(request\)/);
for(const path of ['app/api/shop/quote/route.ts','app/api/shop/orders/route.ts']) {
  const source=read(path);
  assert.match(source,/readShopPriceCatalog\(\)/);
  assert.match(source,/catalog\.prices/);
}
const admin=read('components/admin/ShopOrdersWorkspace.tsx');
assert.match(admin,/<ShopPriceEditor accessToken=\{accessToken\} \/>/);
const payment=read('lib/shop/shop-bitpay-attempt-store.ts');
assert.match(payment,/total_toman/,'BitPay must settle the immutable order snapshot');
console.log('SHOP_LIVE_PRICES=PASS: owner guards, live+expired price, 60k checkout, audit, reset, syntax, DB authority, existing BitPay snapshot');
