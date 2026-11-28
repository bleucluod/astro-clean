import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const base="55598c3e2854d548890f21c15bc45310f7321d11";
const normalize=s=>s.replace(/\r\n/g,"\n");
const read=p=>normalize(readFileSync(p,"utf8"));
const old=p=>normalize(execFileSync("git",["show",base+":"+p],{encoding:"utf8",maxBuffer:8*1024*1024}));
for(const p of ["app/compare/page.tsx","components/r3-approved-visible-copy.tsx","lib/r3-approved-visible-additions.generated.json","lib/comparison/comparison-product-service.ts","lib/comparison/comparison-full-interpretation.ts"]){
 assert.equal(read(p),old(p),p+" changed");
}
const landing="components/comparison/ComparisonLanding.tsx";
assert.equal(read(landing).replace(' premiumEnabled={process.env.HALLEUS_ENABLE_COMPARE_PRIVATE_STORAGE === "true"}',''),old(landing));
const composer=read("components/comparison/ComparisonComposer.tsx");
assert.match(composer,/premiumEnabled && relationshipContext === "romantic"/);
assert.ok(composer.indexOf("await requestPremiumComparison")<composer.indexOf("const result = createPrivateComparison"));
const report=read("components/comparison/ComparisonReport.tsx");
assert.match(report,/if \(premiumRecord\) return premiumRecord.reading;/);
const store=read("lib/comparison/comparison-premium-store.ts");
assert.ok(store.includes('actor.kind==="account"&&row.payment_status==="verified"'));
assert.ok(store.includes('...(paid?{record:rec}:{})'));
const ledger=read("lib/comparison/comparison-payment-store.ts");
assert.ok(ledger.includes("and ready_for_sale for update"));
const config=read("lib/comparison/comparison-payment-config.ts");
assert.ok(config.includes("HALLEUS_COMPARE_BITPAY_PAYMENTS_ENABLED==='true'"));
const api=read("app/api/compare/premium/route.ts");
assert.match(api,/private, no-store/);
assert.match(api,/noindex, nofollow/);
console.log("COMPARE_PREMIUM_BOUNDARY_PASS (public copy, legacy writer and access boundary)");
