import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const root = process.cwd();
const deps = createRequire(path.join(root, 'package.json'));
const ts = deps('typescript');
const React = deps('react');
const { renderToStaticMarkup } = deps('react-dom/server');
const original = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith('@/')) request = path.join(root, request.slice(2));
  try { return original.call(this, request, parent, isMain, options); }
  catch (error) {
    if (!request.startsWith('.') && !path.isAbsolute(request)) return deps.resolve(request);
    throw error;
  }
};
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = function(module, filename) {
    const source=fs.readFileSync(filename, 'utf8');
    const output = ts.transpileModule(source, {
      fileName: filename,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    module._compile(output.outputText, filename);
  };
}
require.extensions['.css'] = function(module) {
  module.exports = { __esModule: true, default: new Proxy({}, {get: (_, key) => String(key)}) };
};

const assert = require('node:assert/strict');
const { generateReportContract } = require(path.join(root,'lib/report-generation/report-generation-service.ts'));
const { buildAdaptiveReportPlan, assertAdaptiveAnchorIntegrity } = require(path.join(root,'lib/astrology/adaptive-report-planner.ts'));
const { rankNarrativeCandidates } = require(path.join(root,'lib/astrology/report-narrative-selection.ts'));
const { buildRecomposedOpeningStory, ReportAdaptiveOverview, ReportAdaptiveNarrative } = require(path.join(root,'components/report/ReportAdaptiveNarrative.tsx'));
const { DEFAULT_REPORT_ACCESS_POLICY } = require(path.join(root,'lib/monetization/access-policy.ts'));
const fixedDate='2026-10-27T08:00:00.000Z';
const rows=[['A','1986-03-17','04:35'],['B','1991-08-23','14:20'],['C','1997-12-02','21:10'],['D','2001-05-14','08:50'],['E','1980-10-09','17:45'],['F','1994-01-27','11:25']];
function calculate([id,birthDate,birthTime], extra={}) {
 const input={name:'نمونه '+id,birthDate,birthTime,birthTimeAccuracy:'known',birthCity:'تهران',birthCountry:'ایران',birthLatitude:35.6892,birthLongitude:51.389,birthTimezone:'Asia/Tehran',currentResidenceCity:'تهران',currentResidenceCountry:'ایران',currentResidenceLatitude:35.6892,currentResidenceLongitude:51.389,currentResidenceTimezone:'Asia/Tehran',...extra};
 const result=generateReportContract({input},{generatedAt:fixedDate});
 assert(result.ok && result.contract.report.realEngine, 'Actual engine calculation required');
 const report=result.contract.report;
 const plan=buildAdaptiveReportPlan(report);
 assertAdaptiveAnchorIntegrity(plan);
 return {id,input,report,plan};
}
const samples=rows.map(row=>calculate(row));
const results=[];
function check(name,fn) { fn(); results.push({name,status:'PASS'}); }
for(const sample of samples) {
 const {id,report,plan}=sample;
 check(id+': shared lead, score provenance, immutable input and deterministic selection',()=>{
  assert.equal(plan.selection.opening.leadKey,plan.topStories[0]?.semanticKey);
  const before=JSON.stringify(report);
  assert.deepEqual(buildAdaptiveReportPlan(report),plan);
  assert.equal(JSON.stringify(report),before);
  for(const d of plan.selection.decisions) assert(Math.abs(d.terms.reduce((n,t)=>n+t.points,0)-d.score)<0.002);
  for(const story of plan.topStories) assert(plan.selection.decisions.find(d=>d.semanticKey===story.semanticKey)?.eligible);
  const shuffled=structuredClone(report); shuffled.realEngine.placements.reverse(); shuffled.realEngine.aspects.reverse();
  assert.deepEqual(buildAdaptiveReportPlan(shuffled).topStories.map(s=>s.semanticKey),plan.topStories.map(s=>s.semanticKey));
 });
 check(id+': real renderer executes using shared contract',()=>{
  const html=renderToStaticMarkup(React.createElement(React.Fragment,null,
   React.createElement(ReportAdaptiveOverview,{report,accessMode:'premium',accessPolicy:DEFAULT_REPORT_ACCESS_POLICY}),
   React.createElement(ReportAdaptiveNarrative,{report,accessMode:'premium',accessPolicy:DEFAULT_REPORT_ACCESS_POLICY,renderOverview:false})));
  assert(html.length>1000); sample.renderedHtml=html;
 });
 console.log(id,plan.topStories.map(s=>s.semanticKey+':'+s.score).join(' | '));
}
check('B: independent house/sign winners cannot be falsely combined',()=>{
 const p=samples[1].plan;
 if(p.selection.opening.sign) assert(p.selection.opening.jointMemberIds.every(id=>samples[1].report.realEngine.placements.find(x=>x.id===id).signId===p.selection.opening.sign));
 assert.notDeepEqual([p.selection.opening.house,p.selection.opening.sign],[2,'leo']);
});
const controls={};
check('Six computed charts one minute later: retain the leading topic',()=>{
 controls.near=rows.map(row=>{const [h,m]=row[2].split(':').map(Number);const time=String(h+Math.floor((m+1)/60)).padStart(2,'0')+':'+String((m+1)%60).padStart(2,'0');const later=calculate([row[0]+'+1m',row[1],time]); const original=samples.find(s=>s.id===row[0]);assert.equal(later.plan.topStories[0].semanticKey,original.plan.topStories[0].semanticKey); return {id:row[0],time,lead:later.plan.selection.opening.leadKey};});
});
check('Unknown time: no inferred houses, ruler bonus, angular bonus or unbounded Moon lead',()=>{
 const unknown=calculate(rows[0],{birthTimeAccuracy:'unknown'});
 assert(!unknown.plan.selection.timeReliable);
 assert.equal(unknown.plan.selection.opening.house,null);
 assert(!unknown.plan.bigThree.some(p=>p.planetId==='asc'));
 assert.equal(unknown.plan.importantHouses.length,0);
 assert(unknown.plan.topStories.every(s=>!s.sourceHouseIds.length && !s.sourcePlanetIds.includes('moon')));
 assert(unknown.plan.selection.decisions.every(d=>!d.terms.some(t=>t.key==='ruler'||t.key==='angular')));
 controls.unknown={input:unknown.input,selection:unknown.plan.selection};
});
const fixture=(key,ids,aspectIds=[],kind='aspect')=>({anchorId:key,semanticKey:key,kind,title:key,summary:'',dailyLife:'',healthyExpression:'',friction:'',action:'',score:999,sourcePlanetIds:ids,sourceAspectIds:aspectIds,sourceHouseIds:[],sourcePatternId:null,sourceNodeIds:[],rankingReasons:[],evidenceRefs:[],absorbedSemanticKeys:[]});
check('Generational concentration cannot buy personal importance with a huge legacy score',()=>{
 const report=structuredClone(samples[0].report);report.realEngine.angles=undefined;
 const ranked=rankNarrativeCandidates(report,[fixture('outer',['uranus','neptune','pluto'],[],'cluster'),fixture('personal',['sun','mercury'])],'');
 assert(!ranked.decisions.find(d=>d.semanticKey==='outer').eligible);
 assert(ranked.decisions.find(d=>d.semanticKey==='personal').eligible);
 controls.generation=ranked.decisions;
});
check('Single-factor orb control: smooth monotonic score; no tight-orb cliff',()=>{
 const report=structuredClone(samples[0].report); const a=report.realEngine.aspects.find(a=>a.firstPlanetId==='sun'||a.secondPlanetId==='sun'); assert(a);
 const c=fixture('orb',[a.firstPlanetId,a.secondPlanetId],[a.id]);
 const scores=[1.49,1.50,1.51,4].map(orb=>{a.orb=orb;return rankNarrativeCandidates(report,[c],samples[0].plan.chartRulerId).decisions[0].score});
 assert(scores[0]>=scores[1]&&scores[1]>=scores[2]&&scores[2]>scores[3]); assert(scores[0]-scores[2]<0.2); controls.orb={orbs:[1.49,1.50,1.51,4],scores};
});
check('Changing selected lead changes opening input and current first paragraph',()=>{
 const {report,plan}=samples[1]; const changed={...plan,topStories:[...plan.topStories].reverse(),selection:{...plan.selection,opening:{...plan.selection.opening,house:null,sign:null}}};
 assert.notEqual(buildRecomposedOpeningStory(report,plan).paragraphs[0],buildRecomposedOpeningStory(report,changed).paragraphs[0]);
});
check('A story does not duplicate a standalone placement to fill three slots',()=>{
 for(const {plan} of samples) assert(plan.topStories.every(s=>s.kind!=='planet'&&s.kind!=='ruler-story'));
});
check('Shared planets do not suppress distinct aspect mechanisms',()=>{
 const d=samples[3].plan;
 assert(d.topStories.filter(s=>s.sourcePlanetIds.includes('moon')).length>1);
 assert(new Set(d.topStories.flatMap(s=>s.sourceAspectIds)).size===d.topStories.flatMap(s=>s.sourceAspectIds).length);
});
check('All story-owned aspects are excluded from standalone aspect chapters',()=>{
 for(const {plan} of samples){const used=new Set(plan.topStories.flatMap(s=>s.sourceAspectIds));assert(plan.importantAspects.every(s=>!used.has(s.aspect.id)));}
});
check('Angular proximity changes importance, not house membership alone',()=>{
 const report=structuredClone(samples[0].report);const c=fixture('outer-axis',['uranus','neptune'],[],'cluster');
 const p=report.realEngine.placements.find(p=>p.id==='uranus');
 report.realEngine.angles={asc:{...report.realEngine.angles.asc,longitude:p.longitude}};
 let ranked=rankNarrativeCandidates(report,[c],'');assert(ranked.decisions[0].eligible);assert(ranked.decisions[0].terms.some(t=>t.key==='angular'));
 report.realEngine.angles=undefined; ranked=rankNarrativeCandidates(report,[c],'');assert(!ranked.decisions[0].eligible);
});
check('Child and youth calculation retain their language audience routing',()=>{
 for(const [id,date,expected] of [['child','2021-05-14','caregiver'],['youth','2012-05-14','youth']]) {
  const s=calculate([id,date,'08:50']);assert.equal(s.plan.audienceMode,expected);
 }
});
const output={version:samples[0].plan.selection.version,generatedAt:fixedDate,results,controls,samples:samples.map(({id,input,plan,report})=>({id,input,audienceMode:plan.audienceMode,selection:plan.selection,stories:plan.topStories,placements:report.realEngine.placements,aspects:report.realEngine.aspects}))};
if(process.argv.includes('--write-review')) {
 const dir=path.join(root,'docs/report-premium/reviews/step-01');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'selection-results.json'),JSON.stringify(output,null,2)+'\n');
 const lines=['# مرحلهٔ اول — انتخاب موضوع و مالکیت روایت','', 'وضعیت: منتظر تأیید کاربر. این خروجی جدول انتخاب واقعی موتور است؛ متن نهایی افتتاحیه نیست.','', 'همهٔ ورودی‌ها آزمایشی‌اند؛ تهران، ساعت معلوم، مختصات ۳۵٫۶۸۹۲ و ۵۱٫۳۸۹، منطقهٔ زمانی تهران؛ تاریخ مرجع ۲۷ اکتبر ۲۰۲۶ ساعت ۰۸:۰۰ به وقت جهانی.','', 'امتیازها ابزار مقایسهٔ تحریری‌اند، نه درصد احتمال. وزن‌ها پیشنهاد قابل‌بررسی‌اند؛ صحت علمی یا بهترین‌بودن مطلق آن‌ها اثبات نشده است.',''];
 const baseline=JSON.parse(fs.readFileSync(path.join(dir,'baseline-selections.json'),'utf8'));
 for(const sample of output.samples){
  lines.push('## چارت '+sample.id,'',sample.input.birthDate+' — '+sample.input.birthTime,'','| رتبه | موضوع منتخب | امتیاز | شواهد واقعی |','|---|---|---|---|');
  sample.stories.forEach((s,i)=>lines.push('| '+[i+1,s.title,s.score,s.evidenceRefs.map(e=>e.label+': '+e.detail).join('؛ ')].map(x=>String(x).replace(/\|/g,'/').replace(/\n/g,' ')).join(' | ')+' |'));
  lines.push('','انتخاب‌های قبلی: '+baseline.samples.find(b=>b.id===sample.id).stories.map(s=>s.title).join('؛ ')+'.','','### چرا این انتخاب‌ها؟','');
  for(const s of sample.stories){const d=sample.selection.decisions.find(d=>d.semanticKey===s.semanticKey);lines.push('**'+s.title+'**','',...d.terms.map(t=>'- '+t.reason+'؛ سهم '+t.points),'');}
  lines.push('### نامزدهای دیگر و دلیل انتخاب‌نشدن','','| موضوع | امتیاز | تصمیم |','|---|---|---|');
  for(const d of sample.selection.decisions.filter(d=>!d.selected))lines.push('| '+[d.title,d.score,d.disposition].map(x=>String(x).replace(/\|/g,'/')).join(' | ')+' |');
  lines.push('','### تقسیم روایت','','افتتاحیه: '+sample.selection.opening.purpose+'. مثال و تمرین داستان اصلی به افتتاحیه منتقل نمی‌شوند.','','| صاحب برداشت | کار اختصاصی | شناسهٔ مثال | شناسهٔ اقدام |','|---|---|---|---|');
  for(const r of sample.selection.ownership.reservations)lines.push('| '+[r.owner,r.purpose,r.sceneId??'هنوز نوشته نشده',r.actionId??'هنوز نوشته نشده'].join(' | ')+' |');
  lines.push('','### تکرارهای فعلی که باید در مرحلهٔ صاحبشان اصلاح شوند','');
  for(const c of sample.selection.ownership.sharedCopy)lines.push('- «'+c.text+'» — صاحب: `'+c.owner+'`؛ مصرف دوباره ممنوع در: '+c.blockedConsumers.map(x=>'`'+x+'`').join('،'));
  lines.push('','این دفتر، تکرار دقیق موجود را آشکار می‌کند؛ تضمین حذف همهٔ شباهت‌های معنایی نیست. بازبینی معنایی و اصلاح متن در مرحلهٔ هر بخش انجام می‌شود.','');
 }
 lines.push('## کنترل‌ها','',...results.map(r=>'- '+r.name+': '+r.status),'','مرحلهٔ بعد فقط پس از تأیید این انتخاب‌ها: بازنویسی افتتاحیه.');
 fs.writeFileSync(path.join(dir,'REVIEW.md'),lines.join('\n')+'\n');
}
console.log('Selection checks passed:',results.length);
