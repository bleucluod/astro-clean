import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const map=new Map([
 ['@/lib/admin/admin-origin','lib/admin/admin-origin.ts'],
 ['@/lib/config/env','lib/config/env.ts'],
 ['@/lib/config/halleus','lib/config/halleus.ts'],
]);
const stubs=new Map([
 ['@/lib/auth/supabase-server-user','export async function getSupabaseUserFromAuthorizationHeader(){return null}'],
 ['@/lib/comparison/comparison-payment-config','export const isComparisonCheckoutReady=()=>true; export const comparisonPaymentConfig=()=>({})'],
 ['@/lib/comparison/comparison-payment-flow','export const UUID=/^never$/; export function startComparisonPayment(){throw Error("UNEXPECTED_PAYMENT")} export function retryComparisonPayment(){throw Error("UNEXPECTED_PAYMENT")}'],
 ['@/lib/comparison/comparison-payment-store','export const comparisonPaymentStore={}'],
]);
const hook=registerHooks({resolve(specifier,context,next){
 if(map.has(specifier))return {url:pathToFileURL(resolve(root,map.get(specifier))).href,shortCircuit:true};
 if(stubs.has(specifier))return {url:'data:text/javascript,'+encodeURIComponent(stubs.get(specifier)),shortCircuit:true};
 return next(specifier,context);
}});
try{
 process.env.NEXT_PUBLIC_HALLEUS_SITE_URL='https://halleus.ir';
 const {POST}=await import('../app/api/compare/payment/route.ts');
 for(const [origin,status] of [[null,401],['https://halleus.ir',401],['https://example.invalid',403],['https://halleus.ir.evil.example',403],['null',403],['http://127.0.0.1:3000',401]]){
  const res=await POST(new Request('http://127.0.0.1:3000/api/compare/payment',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:'{}'}));
  assert.equal(res.status,status,String(origin));
  assert.match(res.headers.get('cache-control'),/no-store/);
 }
 console.log('COMPARE_PAYMENT_PROXY_ORIGIN_PASS (actual route, auth/provider stubbed; no invoice or charge)');
}finally{hook.deregister();}
