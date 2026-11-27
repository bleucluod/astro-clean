import assert from "node:assert/strict";
import { parseComparisonPreviewRequest as parse, createComparisonPreviewCandidate as run } from "../lib/comparison/comparison-preview-orchestration.mjs";

const ids = ["communication", "emotional-security", "attraction-intimacy", "boundaries-commitment", "friction-repair"];
const actor = {id: "account-a", kind: "account"};
const request = {chartAId: "A", chartBId: "B", relationshipContext: "romantic", chartABirthTimeStatus: "exact", chartBBirthTimeStatus: "unknown", retryKey: "retry_key_123456"};
function fixture() {
  const calls = [];
  const chart = id => ({id, ownerId: actor.id, ownerKind: actor.kind, deleted: false, provenance: "verified-server-calculation", snapshotRevision: "revision-"+id, birthTimeStatus: id==="A"?"exact":"unknown", report:{id,realEngine:{private:"SNAPSHOT_SECRET"}}});
  const charts = {A:chart("A"),B:chart("B")};
  const generated = {
    record: {version:"comparison-product-v1",id:"server-result",chartAId:"A",chartBId:"B",relationshipContext:"romantic",chartABirthTimeStatus:"exact",chartBBirthTimeStatus:"unknown",
      privacy:{visibility:"private",indexingPolicy:"noindex",rawBirthInputStored:false},report:{private:"REPORT_SECRET"},
      reading:{private:"ROOT_SECRET",overviewParagraphsFa:["افتتاحیهٔ نخست","افتتاحیهٔ دوم"],primaryPatterns:[1,2,3].map(i=>({id:"pattern-"+i,title:"الگوی "+i,humanExperience:"یک چرخه از اینجا آغاز می‌شود",personA:"نقش نخست در چرخه",personB:"نقش دوم در چرخه",cycle:"مسیر چرخه در رابطه",dailySituation:"مثال روزمره در رابطه",strength:"نقطه قوت در رابطه",challenge:"دشواری در این رابطه",practicalStep:"پیشنهاد عملی در رابطه",evidence:[{detail:"PATTERN_PRIVATE"}]})),chapters:ids.map(id=>({id,title:id,ownerContactId:id+":witness",block:{humanExperience:"یک برداشت با شاهد روشن",dailySituation:"DAILY_SECRET یک دو سه چهار",strength:"STRENGTH_SECRET یک دو سه چهار",challenge:"CHALLENGE_SECRET یک دو سه چهار",practicalStep:"PRACTICE_SECRET یک دو سه چهار"}}))}},
    plan:{chapterPlans:ids.map(chapter=>({chapter,status:"supported",primary:{id:chapter+":witness"}}))},
  };
  const deps = {
    loadOwnedChart: async (owner,id)=>{calls.push("load:"+id);return charts[id];},
    generate: async (a,b,binding)=>{calls.push("generate");assert.equal(a.id,"A");assert.equal(b.id,"B");assert.equal(binding.chartARevision,"revision-A");return generated;},
    persist: async value=>{calls.push("persist");assert.equal(value.owner.id,actor.id);assert.equal(value.retryKey,request.retryKey);assert.equal(value.record,generated.record);return {status:"created",reportId:"server-result",internal:"RECEIPT_SECRET"};},
  };
  return {calls,charts,generated,deps};
}
const expected = {ok:false,code:"INVALID_REQUEST"};
assert.deepEqual(parse(request),request);
for (const invalid of [null,[],{}, {...request,chartBId:"A"}, {...request,chartAId:" A"}, {...request,chartAId:"A\nB"}, {...request,chartAId:"x".repeat(221)}, {...request,relationshipContext:"other"}, {...request,chartBBirthTimeStatus:"maybe"}, {...request,retryKey:"short"}, ...["owner","paid","price","reading","plan","recordId","report"].map(key=>({...request,[key]:"SECRET"}))]) {
  const f=fixture();
  assert.deepEqual(await run(actor,invalid,f.deps),expected);
  assert.deepEqual(f.calls,[]);
}
{
  const f=fixture();
  assert.deepEqual(await run(null,request,f.deps),{ok:false,code:"AUTH_REQUIRED"});
  assert.deepEqual(f.calls,[]);
}
for (const mutate of [
  f=>{f.charts.A=null;}, f=>{f.charts.A.ownerId="other";}, f=>{f.charts.A.ownerKind="guest";},
  f=>{f.charts.A.deleted=true;}, f=>{f.charts.A.provenance="client";}, f=>{f.charts.A.snapshotRevision="";},
  f=>{f.charts.A.report.id="other";}, f=>{f.charts.A.report.realEngine=null;}, f=>{f.charts.B.ownerId="other";},
]) {
  const f=fixture();mutate(f);
  assert.deepEqual(await run(actor,request,f.deps),{ok:false,code:"CHART_UNAVAILABLE"});
  assert.equal(f.calls.includes("generate")||f.calls.includes("persist"),false);
}
{
  const f=fixture();
  assert.deepEqual(await run(actor,{...request,chartBBirthTimeStatus:"exact"},f.deps),{ok:false,code:"TIME_STATUS_INVALID"});
  assert.deepEqual(f.calls,["load:A","load:B"]);
}
for(const mutate of [f=>{f.generated.record.chartAId="other";},f=>{f.generated.record.relationshipContext="family";},f=>{f.generated.record.chartBBirthTimeStatus="exact";},f=>{f.generated.record.privacy.visibility="public";}]) {
  const f=fixture();mutate(f);
  assert.deepEqual(await run(actor,request,f.deps),{ok:false,code:"GENERATION_INVALID"});
  assert.equal(f.calls.includes("persist"),false);
}
{
  const f=fixture();f.generated.plan.chapterPlans.pop();
  assert.deepEqual(await run(actor,request,f.deps),{ok:false,code:"PREVIEW_UNAVAILABLE"});
  assert.equal(f.calls.includes("persist"),false);
}
for(const step of ["loadOwnedChart","generate","persist"]) {
  const f=fixture();f.deps[step]=async()=>{throw Error("INTERNAL_SECRET");};
  const result=await run(actor,request,f.deps);
  assert.deepEqual(result,{ok:false,code:"PREVIEW_UNAVAILABLE"});
  if(step!=="persist")assert.equal(f.calls.includes("persist"),false);
}
for(const receipt of [null,{status:"created",reportId:"wrong"},{status:"replay",reportId:"server-result"}]) {
  const f=fixture();f.deps.persist=async()=>receipt;
  assert.deepEqual(await run(actor,request,f.deps),{ok:false,code:"PERSISTENCE_UNCONFIRMED"});
}
{
  const f=fixture();
  const result=await run(actor,request,f.deps);
  assert.deepEqual(f.calls,["load:A","load:B","generate","persist"]);
  assert.deepEqual(Object.keys(result),["ok","reportId","preview"]);
  assert.equal(result.ok,true);
  assert.equal(result.preview.chapters.length,5);
  assert.equal(result.preview.primaryPatterns.length,3);
  assert.deepEqual(result.preview.overviewParagraphsFa,["افتتاحیهٔ نخست","افتتاحیهٔ دوم"]);
  assert.equal(JSON.stringify(result).includes("SECRET"),false);
}
console.log("PASS isolated comparison preview orchestration");
