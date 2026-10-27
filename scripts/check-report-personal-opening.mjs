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
const { ReportAdaptiveOverview, ReportAdaptiveNarrative } = require(path.join(root,'components/report/ReportAdaptiveNarrative.tsx'));
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
const {buildPersonalOpening}=require(path.join(root,'lib/astrology/report-personal-opening.ts'));
const results=[];
function check(name,fn){fn();results.push({name,status:'PASS'});}
const normalize=s=>s.replace(/[\u200c\s]+/gu,' ').trim();
const sentences=s=>s.split(/[.!؟]+/u).map(normalize).filter(s=>s.split(' ').length>=7);
const words=s=>s.trim().split(/\s+/u).length;
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/report-premium/reviews/step-01-r2/selection-results.json'),'utf8'));
const output=[];
for(const {id,input,report,plan} of samples){
 const opening=buildPersonalOpening(report,plan);
 const html=renderToStaticMarkup(React.createElement(ReportAdaptiveOverview,{report,accessMode:'premium',accessPolicy:DEFAULT_REPORT_ACCESS_POLICY}));
 const body=html.match(/data-report-opening-story="personal-three-paragraph"[^>]*>([\s\S]*?)<\/div>/u)?.[1];
 assert(body,'Active opening container must render');
 const rendered=[...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gu)].map(m=>m[1].replace(/&amp;/g,'&').replace(/&#x27;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>'));
 check(id+': exact active-renderer parity, deterministic output, immutable input',()=>{
  assert.deepEqual(rendered,opening.paragraphs);
  const before=JSON.stringify(report);assert.deepEqual(buildPersonalOpening(report,plan),opening);assert.equal(JSON.stringify(report),before);
  assert.deepEqual(opening.sourceStoryKeys,plan.topStories.slice(0,2).map(s=>s.semanticKey));
  const prior=baseline.samples.find(s=>s.id===id);
  assert.deepEqual(plan.topStories,prior.stories,'Approved stories must remain byte-for-byte identical');
  assert.deepEqual(plan.selection.decisions,prior.selection.decisions);
 });
 check(id+': evidence, ownership, complete prose and no copied chapter sentences',()=>{
  assert.equal(opening.paragraphs.length,3);assert(opening.evidence.length>=2);
  const sourceIds=new Set([...report.realEngine.placements.map(p=>p.id),...report.realEngine.aspects.map(a=>a.id)]);
  for(const e of opening.evidence)for(const source of e.sourceIds)assert(sourceIds.has(source));
  const reservation=plan.selection.ownership.reservations.find(r=>r.owner==='opening');
  assert.equal(reservation.claimId,opening.ownership.claimIds[0]);assert.equal(reservation.sceneId,opening.ownership.sceneId);
  const copy=opening.paragraphs.join(' ');assert(!/undefined|null|وقتی وقتی|این هفته|حتماً اتفاق|همیشه اتفاق/u.test(copy));
  const own=sentences(copy);assert.equal(new Set(own).size,own.length);
  const rest=plan.topStories.flatMap(s=>[s.summary,s.dailyLife,s.healthyExpression,s.friction,s.action]).join(' ');
  const other=new Set(sentences(rest));assert(own.every(s=>!other.has(s)));
  const restHtml=renderToStaticMarkup(React.createElement(ReportAdaptiveNarrative,{report,accessMode:'premium',accessPolicy:DEFAULT_REPORT_ACCESS_POLICY,renderOverview:false}));
  const restText=normalize(restHtml.replace(/<[^>]*>/g,' '));
  assert(own.every(s=>!restText.includes(s)),'Opening sentences cannot be copied into another visible chapter');
 });
 output.push({id,input,opening,renderedParagraphs:rendered,wordCount:words(rendered.join(' ')),selectedStories:plan.topStories.slice(0,2).map(s=>({key:s.semanticKey,summary:s.summary,scene:s.dailyLife,action:s.action})),selectionVersion:plan.selection.version});
 console.log(id,opening.profileKey,words(rendered.join(' ')));
}
check('Six distinct first sentences and endings; no shared long narrative sentence',()=>{
 for(const index of [0,-1])assert.equal(new Set(output.map(s=>sentences(s.opening.paragraphs.join(' ')).at(index))).size,6);
 for(let i=0;i<output.length;i++)for(let j=i+1;j<output.length;j++){
  const other=new Set(sentences(output[j].opening.paragraphs.join(' ')));
  assert(sentences(output[i].opening.paragraphs.join(' ')).every(s=>!other.has(s)));
 }
});
check('Renaming a person or report ID never spins the narrative',()=>{
 const {report,plan}=samples[0];const renamed=structuredClone(report);renamed.id='different-id';renamed.input.name='نام دیگر';
 assert.deepEqual(buildPersonalOpening(renamed,plan).paragraphs,output[0].opening.paragraphs);
});
check('Permutation of source arrays cannot change the opening',()=>{
 for(const {report,plan} of samples){const shuffled=structuredClone(report);shuffled.realEngine.placements.reverse();shuffled.realEngine.aspects.reverse();
 assert.deepEqual(buildPersonalOpening(shuffled,buildAdaptiveReportPlan(shuffled)),buildPersonalOpening(report,plan));}
});
const near=rows.map(row=>{const [h,m]=row[2].split(':').map(Number);return calculate([row[0]+'+1m',row[1],String(h+Math.floor((m+1)/60)).padStart(2,'0')+':'+String((m+1)%60).padStart(2,'0')]);});
check('Six one-minute neighbours keep the thesis and scene where the selected topics remain',()=>{
 for(let i=0;i<near.length;i++){
 const opening=buildPersonalOpening(near[i].report,near[i].plan);assert.equal(opening.profileKey,output[i].opening.profileKey);
 assert.equal(opening.paragraphs[0],output[i].opening.paragraphs[0]);assert.equal(opening.paragraphs[2],output[i].opening.paragraphs[2]);}
});
const unknown=calculate(rows[0],{birthTimeAccuracy:'unknown'});
check('Unknown time excludes house/angle claims and unbounded Moon interpretation',()=>{
 const opening=buildPersonalOpening(unknown.report,unknown.plan);
 assert(!/خانه|طالع|ماه/u.test(opening.paragraphs.join(' ')));
});
check('Missing source evidence cannot silently become invented opening claims',()=>{
 const report=structuredClone(samples[0].report);report.realEngine.aspects=[];
 assert.equal(buildPersonalOpening(report,samples[0].plan).profileKey,'insufficient-evidence');
 assert.equal(buildPersonalOpening(report,samples[0].plan).paragraphs.length,0);
});
check('A square cannot inherit a harmonious contact bridge',()=>{
 const {report,plan}=samples[3];const altered=structuredClone(report);
 const edge=altered.realEngine.aspects.find(a=>a.id==='moon-sextile-venus');edge.aspectId='square';
 const changed=buildPersonalOpening(altered,plan);assert.notEqual(changed.profileKey,output[3].opening.profileKey);
 assert(changed.paragraphs.join(' ').includes('مربع'));assert(!changed.paragraphs.join(' ').includes('سکستایل'));
});
check('Cluster house/sign facets keep independent actual memberships',()=>{
 for(const index of [2,4,5]){
 const {report}=samples[index];const opening=output[index].opening;
 for(const e of opening.evidence){if(e.key.startsWith('cluster:house:'))for(const id of e.sourceIds)assert.equal(report.realEngine.placements.find(p=>p.id===id).house,Number(e.key.split(':')[2]));
 if(e.key.startsWith('cluster:sign:'))for(const id of e.sourceIds)assert.equal(report.realEngine.placements.find(p=>p.id===id).signId,e.key.split(':')[2]);}
 }
});
const extra=[];
for(let i=0;i<18;i++){
 const year=1973+i*2;const month=String(i%12+1).padStart(2,'0');const day=String(i%24+3).padStart(2,'0');
 const sample=calculate(['extra-'+i,`${year}-${month}-${day}`,String((i*5)%24).padStart(2,'0')+':15']);
 const opening=buildPersonalOpening(sample.report,sample.plan);extra.push({id:sample.id,input:sample.input,opening,wordCount:words(opening.paragraphs.join(' '))});
}
const young=[calculate(['youth','2011-06-12','11:20']),calculate(['child','2020-04-03','05:10'])];
check('Eighteen additional engine charts and two younger samples retain provenance without fixed-date rules',()=>{
 for(const s of extra){assert(s.opening.paragraphs.length>=2);assert(!/undefined|null|وقتی وقتی/u.test(s.opening.paragraphs.join(' ')));}
 for(const {report,plan} of young){const o=buildPersonalOpening(report,plan);assert(!/سرمایه‌گذاری|همسر|حقوق|استخدام/u.test(o.paragraphs.join(' ')));}
 const code=fs.readFileSync(path.join(root,'lib/astrology/report-personal-opening.ts'),'utf8');
 for(const row of rows)assert(!code.includes(row[1]));
});
if(process.argv.includes('--write-review')){
 const dir=path.join(root,'docs/report-premium/reviews/step-02');fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'opening-results.json'),JSON.stringify({version:output[0].opening.version,generatedAt:fixedDate,results,samples:output,additional:extra,unknownTime:{input:unknown.input,opening:buildPersonalOpening(unknown.report,unknown.plan)},younger:young.map(({input,report,plan})=>({input,audienceMode:plan.audienceMode,opening:buildPersonalOpening(report,plan)}))},null,2)+'\n');
 const lines=['# مرحلهٔ دوم — شروع شخصی گزارش','', 'وضعیت: پیش‌نویس اجرایی برای تأیید کاربر؛ منتشر نشده است.','', 'این متن‌ها عین خروجی موتور و نمایشگر فعلیِ شاخهٔ کارند؛ برای این فایل دستی بازنویسی نشده‌اند. تمام نمونه‌ها آزمایشی‌اند؛ تهران، ساعت معلوم و تاریخ مرجع ۲۷ اکتبر ۲۰۲۶ ساعت ۰۸:۰۰ جهانی.','', 'فقط شروع گزارش تغییر کرده است. انتخاب‌های تأییدشدهٔ مرحلهٔ اول ثابت‌اند. فصل‌های بعد هنوز نسخهٔ قدیمی‌اند و در نوبت خود بازنویسی می‌شوند.',''];
 output.forEach((sample,i)=>{lines.push('## نمونهٔ '+(i+1).toLocaleString('fa-IR'),'','```text',sample.input.birthDate+' '+sample.input.birthTime+' — Asia/Tehran','```','',sample.wordCount.toLocaleString('fa-IR')+' واژه','',...sample.renderedParagraphs.flatMap(p=>[p,'']),'### شواهد قابل ردیابی','',...sample.opening.evidence.map(e=>'- '+e.text+'.'),'','### مرز روایت این بخش','','برداشت ترکیبی و موقعیت این افتتاحیه برای همین بخش رزرو شده‌اند؛ داستان عمیق بعدی نباید آن‌ها را با تغییر عبارت تکرار کند.','','```text',sample.opening.ownership.claimIds[0],sample.opening.ownership.sceneId,'```','');});
 fs.writeFileSync(path.join(dir,'REVIEW.md'),lines.join('\n')+'\n');
}
console.log('Active opening checks passed:',results.length);

