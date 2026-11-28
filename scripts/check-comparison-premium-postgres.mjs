// Explicitly isolated disposable DB only. Never reads DATABASE_URL.
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {resolve,dirname,extname} from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import postgres from "postgres";
import ts from "typescript";
const root=fileURLToPath(new URL("../",import.meta.url));
const url=process.env.HALLEUS_COMPARE_TEST_DATABASE_URL;
if(!url||process.env.HALLEUS_COMPARE_TEST_DISPOSABLE!=="yes")throw Error("EXTERNAL_BLOCK: explicitly provision a disposable PostgreSQL test database");
const parsed=new URL(url);
if(!["postgres:","postgresql:"].includes(parsed.protocol)||!/^halleus_compare_test_[a-z0-9_]+$/.test(parsed.pathname.slice(1)))throw Error("SAFETY_FATAL: wrong disposable database name");
const sql=postgres(url,{max:1,connect_timeout:5,prepare:false});
const rollback=new Error("ROLLBACK_SUCCESSFUL_FIXTURE");
const migration=readFileSync(resolve(root,"database/migrations/0048_private_comparison_premium.sql"),"utf8");
assert.match(migration,/\bbegin;\s*create table/i);assert.match(migration,/commit;\s*$/i);
const native=createRequire(import.meta.url);
let checks=0;
const check=(name,fn)=>{fn();checks++;console.log("PASS "+name);};
try{
 const identity=(await sql`select current_database() as db,to_regnamespace('auth') as auth_schema,to_regnamespace('halleus_private') as private_schema,to_regclass('public.halleus_reports') as existing_reports`)[0];
 if(identity.db!==parsed.pathname.slice(1)||identity.auth_schema||identity.private_schema||identity.existing_reports)throw Error("SAFETY_FATAL: fixture database not empty");
 const roles=await sql`select rolname from pg_roles where rolname in ('anon','authenticated')`;
 if(roles.length!==2)throw Error("EXTERNAL_BLOCK: fixture requires anon and authenticated roles");
 try{await sql.begin(async tx=>{
  await tx.unsafe("create schema auth; create schema halleus_private; create table auth.users (id uuid primary key); create table public.halleus_reports(id text primary key,user_id uuid not null,report_json jsonb not null,deleted_at timestamptz); create sequence halleus_private.shared_display_numbers_seq as bigint; revoke all on schema halleus_private from public,anon,authenticated;");
  await tx.unsafe(migration.replace(/\bbegin;/i,"").replace(/commit;\s*$/i,""));
  const adapter=(...args)=>tx(...args);adapter.begin=fn=>tx.savepoint(fn);
  const cache=new Map();
  let guestBootstraps=0;
  function load(path){
   const abs=resolve(root,path);if(cache.has(abs))return cache.get(abs).exports;
   const mod={exports:{}};cache.set(abs,mod);
   const code=ts.transpileModule(readFileSync(abs,"utf8"),{fileName:abs.endsWith(".mjs")?abs.replace(/\.mjs$/,".js"):abs,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true,allowJs:true},reportDiagnostics:true});
   const errors=(code.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error);assert.equal(errors.length,0,abs);
   const req=q=>{
    if(q==="@/lib/admin/admin-database")return {getAdminDatabase:()=>adapter};
    if(q==="@/lib/comparison/comparison-payment-config")return {isComparisonStorageReady:()=>true};
    if(q==="@/lib/auth/supabase-server-user")return {getSupabaseUserFromAuthorizationHeader:async auth=>auth==="Bearer fixture-account"?{id:"22222222-2222-4222-8222-222222222222"}:null};
    if(q==="@/lib/database/account-persistence-user")return {ensureAccountPersistenceUser:async input=>{assert.equal(input.databaseUrl,"fixture-only");guestBootstraps++;}};
    if(q==="@/lib/config/env"&&["guest-report-session.ts","app/api/compare/premium/route.ts"].some(suffix=>abs.replaceAll("\\","/").endsWith(suffix)))return {getHalleusRuntimeEnv:()=>({databaseUrl:"fixture-only",siteUrl:"https://halleus.ir",authSecret:"fixture-guest-secret-for-isolated-tests"})};
    if(!q.startsWith("@/")&&!q.startsWith("."))return native(q);
    const base=q.startsWith("@/")?resolve(root,q.slice(2)):resolve(dirname(abs),q);
    const f=[base,base+".ts",base+".mjs",base+".js",resolve(base,"index.ts")].find(p=>existsSync(p)&&[".ts",".mjs",".js"].includes(extname(p)));
    if(!f)throw Error("Unresolved fixture import "+q+" from "+abs);
    return load(f);
   };
   new Function("module","exports","require","__dirname","__filename",code.outputText)(mod,mod.exports,req,dirname(abs),abs);return mod.exports;
  }
  const {generateReportContract}=load("lib/report-generation/index.ts");
  const store=load("lib/comparison/comparison-premium-store.ts"),flow=load("lib/comparison/comparison-payment-flow.ts"),{comparisonPaymentStore:ledger}=load("lib/comparison/comparison-payment-store.ts");
  const guest={kind:"guest",id:"11111111-1111-4111-8111-111111111111"},account={kind:"account",id:"22222222-2222-4222-8222-222222222222"},foreign={kind:"account",id:"33333333-3333-4333-8333-333333333333"};
  await tx`insert into auth.users(id) values (${account.id}::uuid),(${foreign.id}::uuid)`;
  const birth=(name,birthDate,birthTime,birthTimeAccuracy)=>({name,birthDate,birthTime,birthTimeAccuracy,birthCity:"Tehran",birthCountry:"Iran",birthCityId:"fixture",birthLatitude:35.6892,birthLongitude:51.389,birthTimezone:"Asia/Tehran"});
  const inputs=[birth("سارا","2001-07-08","12:00","unknown"),birth("نوید","1999-01-29","12:00","unknown")];
  const ids=["fixture-a","fixture-b"];
  for(let i=0;i<2;i++){const n=generateReportContract({input:inputs[i],reportOwnerKind:"local",reportTier:"preview"},{generatedAt:"2026-11-28T14:00:00.000Z"});
   assert.ok(n.ok&&!n.contract.fallback.used&&n.contract.report.realEngine);const record={...n.contract.report,id:ids[i]};
   await tx`insert into public.halleus_reports(id,user_id,report_json) values (${ids[i]},${guest.id}::uuid,${JSON.stringify(record)}::text::jsonb)`;}
  const input={chartAId:ids[0],chartBId:ids[1],relationshipContext:"romantic",chartABirthTimeStatus:"unknown",chartBBirthTimeStatus:"unknown",retryKey:"fixture-comparison-retry"};
  assert.ok(store.parsePremiumComparison(input));assert.equal(store.parsePremiumComparison({...input,record:{}}),null);
  await assert.rejects(store.createPremiumComparison(foreign,input),/CHART_UNAVAILABLE/);checks++;
  await assert.rejects(store.createPremiumComparison(guest,{...input,chartABirthTimeStatus:"exact"}),/TIME_STATUS_INVALID/);checks++;
  const preview=await store.createPremiumComparison(guest,input);
  check("actual generator and PostgreSQL",()=>{assert.ok(preview.preview.readyForSale);assert.equal(preview.preview.chapters.length,5);assert.equal(preview.record,undefined);});
  const retry=await store.createPremiumComparison(guest,input);check("same retry",()=>assert.deepEqual(retry,preview));
  const read=await store.getPremiumComparison(guest,preview.id);check("same preview after read",()=>assert.deepEqual(read,preview));
  await assert.rejects(store.createPremiumComparison(guest,{...input,chartAId:ids[1],chartBId:ids[0]}),/RETRY_CONFLICT/);checks++;
  assert.equal(await store.getPremiumComparison(foreign,preview.id),null);checks++;
  assert.equal(await ledger.reserve(guest.id,preview.id,"a".repeat(64),500000),null);checks++;
  assert.equal(await store.claimComparisonGuestReports(account.id,guest.id),1);checks++;
  assert.equal(await store.getPremiumComparison(guest,preview.id),null);checks++;
  const locked=await store.getPremiumComparison(account,preview.id);check("same ID after claim, locked",()=>{assert.equal(locked.id,preview.id);assert.equal(locked.record,undefined);});
  const config={apiKey:"fixture-key",secret:"fixture-secret-32-characters-long"};
  let creates=0,verifies=0;
  const create=async x=>{creates++;assert.equal(x.amountToman,500000);return {providerPaymentId:"88",amountRial:5000000,redirectUrl:"https://invalid.example/"};};
  const start=await flow.startComparisonPayment(account.id,preview.id,config,ledger,create);assert.equal(start.status,"redirect");
  assert.equal((await flow.startComparisonPayment(account.id,preview.id,config,ledger,create)).redirectUrl,start.redirectUrl);
  check("one provider create",()=>assert.equal(creates,1));
  const payment=(await tx`select id from halleus_private.comparison_premium_payments where report_id=${preview.id}::uuid`)[0];
  const q=new URLSearchParams({attempt:payment.id,proof:flow.proofFor(config.secret,preview.id),id_get:"88",trans_id:"99"});
  const wrong=new URLSearchParams(q);wrong.set("proof","0".repeat(64));
  const verify=async x=>{verifies++;return {status:"paid",providerReference:x.transactionId,confirmedAmountToman:x.expectedAmountToman};};
  assert.equal((await flow.finishComparisonPayment(wrong,config,ledger,verify)).status,"invalid");checks++;
  assert.equal((await flow.finishComparisonPayment(q,config,ledger,async()=>({status:"paid",providerReference:"99",confirmedAmountToman:1}))).status,"pending");checks++;
  assert.equal((await store.getPremiumComparison(account,preview.id)).record,undefined);checks++;
  assert.equal(await flow.retryComparisonPayment(foreign.id,preview.id,config,ledger,verify),"not_found");checks++;
  assert.equal(await flow.retryComparisonPayment(account.id,preview.id,config,ledger,verify),"paid");checks++;
  const full=await store.getPremiumComparison(account,preview.id),raw=(await tx`select record from halleus_private.comparison_premium_reports where id=${preview.id}::uuid`)[0].record;
  check("verified exact immutable full report",()=>{assert.equal(full.purchaseStatus,"paid");assert.deepEqual(full.record,raw);assert.equal(raw.reading.chapters.length,5);for(const chapter of raw.reading.chapters){const wc=["humanExperience","dailySituation","strength","challenge","practicalStep"].map(k=>chapter.block[k]).join(" ").trim().split(/\s+/u).length;assert.ok(wc>=400);}});
  assert.equal((await flow.finishComparisonPayment(q,config,ledger,verify)).status,"paid");check("callback replay not double-verified",()=>assert.equal(verifies,1));
  assert.equal(await store.getPremiumComparison(foreign,preview.id),null);checks++;
  assert.equal(await store.claimComparisonGuestReports(account.id,guest.id),0);checks++;
  assert.equal((await store.listPremiumComparisons(account,0)).length,1);checks++;
  const acl=await tx`select has_table_privilege('anon','halleus_private.comparison_premium_reports','SELECT') as a,has_table_privilege('authenticated','halleus_private.comparison_premium_payments','UPDATE') as b,relrowsecurity as rls from pg_class where oid='halleus_private.comparison_premium_reports'::regclass`;
  check("private RLS and permissions",()=>assert.deepEqual([acl[0].a,acl[0].b,acl[0].rls],[false,false,true]));

  // Exercise the actual direct-entry HTTP route, signed guest cookie and
  // immutable v7 snapshot using the real generator and disposable DB.
  const route=load("app/api/compare/premium/route.ts");
  const direct={birthA:inputs[0],birthB:inputs[1],relationshipContext:"romantic",retryKey:"fixture-direct-comparison-retry"};
  const parser=load("lib/comparison/comparison-direct-input.ts");
  check("direct input rejects invalid dates, coordinates, extra fields and other contexts",()=>{
   assert.ok(parser.parseDirectComparison(direct));
   for(const birthA of [{...direct.birthA,birthDate:"2001-02-30"},{...direct.birthA,birthLatitude:91},{...direct.birthA,birthTimezone:"Not/AZone"},{...direct.birthA,record:{}},{...direct.birthA,currentResidenceCity:"extra"}])assert.equal(parser.parseDirectComparison({...direct,birthA}),null);
   assert.equal(parser.parseDirectComparison({...direct,relationshipContext:"friendship"}),null);
   assert.equal(parser.parseDirectComparison({...direct,birthA:{...direct.birthA,birthTime:"03:20"}}).birthA.birthTime,"12:00");
   assert.equal(parser.parseDirectComparison({...direct,birthA:{...direct.birthA,birthTimeAccuracy:"known",birthTime:"03:20"}}).birthA.birthTime,"03:20");
  });
  const endpoint="https://halleus.ir/api/compare/premium";
  const post=(payload,headers={})=>route.POST(new Request(endpoint,{method:"POST",headers:{"Origin":"https://halleus.ir","Content-Type":"application/json",...headers},body:JSON.stringify(payload)}));
  const get=(id,headers={})=>route.GET(new Request(endpoint+"?id="+id,{headers}));
  assert.equal((await post(direct,{Origin:"https://invalid.example"})).status,403);checks++;
  assert.equal((await post(direct,{Authorization:"Bearer invalid"})).status,401);checks++;
  assert.equal((await post({...direct,birthA:{...direct.birthA,record:{}}})).status,400);checks++;
  assert.equal(guestBootstraps,0);
  const response=await post(direct);
  assert.equal(response.status,200,await response.clone().text());
  const directId=(await response.json()).reportId,cookieHeader=response.headers.get("set-cookie");
  assert.match(cookieHeader,/^halleus_guest_reports=/);
  assert.match(cookieHeader,/HttpOnly; SameSite=Lax/);
  assert.match(response.headers.get("cache-control"),/no-store/);
  const cookie=cookieHeader.split(";")[0];
  check("fresh guest direct generation sets signed cookie exactly once",()=>{assert.match(directId,flow.UUID);assert.equal(guestBootstraps,1);});
  assert.equal((await get(directId)).status,401);checks++;
  assert.equal((await get(directId,{Cookie:cookie+"tampered"})).status,401);checks++;
  const directView=(await (await get(directId,{Cookie:cookie})).json()).report;
  const directRaw=(await tx`select record,preview,ready_for_sale from halleus_private.comparison_premium_reports where id=${directId}::uuid`)[0];
  check("three bounded patterns, five complete chapter previews, no unpaid record or raw input",()=>{
   assert.ok(directView.preview.readyForSale);
   assert.equal(directView.preview.chapters.length,5);assert.equal(directView.preview.primaryPatterns.length,3);
   assert.equal(directView.record,undefined);assert.equal(directView.reading,undefined);
   assert.equal(directRaw.preview.version,"comparison-chapter-preview-v7");assert.equal(directRaw.preview.primaryPatterns,undefined);
   assert.equal(directRaw.record.privacy.rawBirthInputStored,false);
   assert.equal(directRaw.record.chartABirthTimeStatus,"unknown");assert.equal(directRaw.record.chartBBirthTimeStatus,"unknown");
   for(const [index,p] of directView.preview.primaryPatterns.entries()){
    const raw=directRaw.record.reading.primaryPatterns[index],fields=["humanExperience","personA","personB","cycle","dailySituation","strength","challenge","practicalStep"];
    const story=fields.map(k=>raw[k].trim()).filter(Boolean).join("\n\n");
    assert.ok(story.startsWith(p.excerptFa));assert.ok(p.excerptFa.length<story.length);
    assert.ok(p.excerptFa.trim().split(/\s+/u).length<=Math.floor(story.trim().split(/\s+/u).length/5));
   }
   assert.ok(directRaw.record.chartAId.startsWith("compare-natal-"+directId));
  });
  assert.equal((await (await post(direct,{Cookie:cookie})).json()).reportId,directId);checks++;
  assert.equal((await post({...direct,birthB:{...direct.birthB,name:"تغییر"}},{Cookie:cookie})).status,409);checks++;
  const claim=await post({action:"claim_guest"},{Cookie:cookie,Authorization:"Bearer fixture-account"});
  const claimBody=await claim.json();
  check("same direct report claims into account",()=>{assert.equal(claim.status,200);assert.equal(claimBody.claimed,1);});
  assert.equal((await get(directId,{Cookie:cookie})).status,404);checks++;
  const authView=(await (await get(directId,{Authorization:"Bearer fixture-account"})).json()).report;
  assert.equal(authView.id,directId);assert.equal(authView.record,undefined);checks++;
  const directStart=await flow.startComparisonPayment(account.id,directId,config,ledger,async x=>({providerPaymentId:"188",amountRial:5000000,redirectUrl:"https://invalid.example/"}));
  assert.equal(directStart.status,"redirect");
  const directPayment=(await tx`select id from halleus_private.comparison_premium_payments where report_id=${directId}::uuid`)[0];
  const directQuery=new URLSearchParams({attempt:directPayment.id,proof:flow.proofFor(config.secret,directId),id_get:"188",trans_id:"199"});
  const settled=await flow.finishComparisonPayment(directQuery,config,ledger,async x=>({status:"paid",providerReference:x.transactionId,confirmedAmountToman:x.expectedAmountToman}));
  assert.equal(settled.status,"paid");assert.equal(settled.reportId,directId);
  const directPaid=(await (await get(directId,{Authorization:"Bearer fixture-account"})).json()).report;
  check("paid direct report opens same exact immutable record",()=>{assert.equal(directPaid.purchaseStatus,"paid");assert.deepEqual(directPaid.record,directRaw.record);});
  const [natalCount]=await tx`select count(*)::integer as n from public.halleus_reports`;
  check("direct form creates no separate natal report rows",()=>assert.equal(natalCount.n,2));
  throw rollback;
 });}catch(e){if(e!==rollback)throw e;}
 const clean=(await sql`select to_regnamespace('auth') as a,to_regnamespace('halleus_private') as b,to_regclass('public.halleus_reports') as c`)[0];
 assert.deepEqual([clean.a,clean.b,clean.c],[null,null,null]);
 console.log("COMPARE_PREMIUM_POSTGRES_PASS "+checks+" (actual generator + store + ledger; disposable transaction rolled back; injected payment provider)");
}finally{await sql.end({timeout:1});}
