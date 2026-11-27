import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {openComparisonDemoStore} from '../lib/comparison/comparison-demo-store.mjs';
const dir=mkdtempSync(join(tmpdir(),'compare-test-')); const file=join(dir,'demo.sqlite');
let s=openComparisonDemoStore(file); let checks=0; const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
try {
 const a=s.session('guest-1'), b=s.session('guest-2');
 const chart={input:{name:'test'},realEngine:{test:true}};
 const ca=s.saveChart(a,chart,'exact').chartId, cb=s.saveChart(a,chart,'unknown').chartId, other=s.saveChart(b,chart,'exact').chartId;
 const req={chartAId:ca,chartBId:cb,relationshipContext:'romantic',chartABirthTimeStatus:'exact',chartBBirthTimeStatus:'unknown',retryKey:'test-retry-key-1234'};
 const ids=['communication','emotional-security','attraction-intimacy','boundaries-commitment','friction-repair'];
 let calls=0;
 const generate=(x,y,input)=>{
   calls++;
   const chapters=ids.map(id=>({id,title:id,ownerContactId:id==='friction-repair'?null:id,block:{humanExperience:id==='communication'?'preview '.repeat(20).trim():id==='friction-repair'?'limited evidence':'preview',dailySituation:'PRIVATE',strength:'strength',challenge:'challenge',practicalStep:'practice'}}));
   return {record:{...input,id:input.recordId,chartALabel:'A',chartBLabel:'B',updatedAt:'2026-01-01T00:00:00Z',privacy:{visibility:'private',indexingPolicy:'noindex'},reading:{overviewParagraphsFa:["افتتاحیهٔ نخست","افتتاحیهٔ دوم"],primaryPatterns:[1,2,3].map(i=>({id:"pattern-"+i,title:"الگوی "+i,humanExperience:"یک چرخه از اینجا آغاز می‌شود",personA:"نقش نخست در چرخه",personB:"نقش دوم در چرخه",cycle:"مسیر چرخه در رابطه",dailySituation:"مثال روزمره در رابطه",strength:"نقطه قوت در رابطه",challenge:"دشواری در این رابطه",practicalStep:"پیشنهاد عملی در رابطه",evidence:[{detail:"PATTERN_PRIVATE"}]})),chapters}},plan:{chapterPlans:ids.map(chapter=>({chapter,status:chapter==='friction-repair'?'insufficient':'supported',primary:chapter==='friction-repair'?null:{id:chapter}}))}};
 };
 eq(s.create(a,{...req,chartBId:other},generate).code,'CHART_UNAVAILABLE'); eq(s.create(a,{...req,chartBBirthTimeStatus:'exact'},generate).code,'TIME_STATUS_INVALID');eq(calls,0);
 eq(s.create(a,{...req,paid:true},generate).code,'INVALID_REQUEST');
 const p=s.create(a,req,generate);eq(p.ok,true);eq(p.paid,false);eq('record' in p,false);eq(JSON.stringify(p).includes('PRIVATE'),false);eq(p.preview.chapters.length,5);eq(p.preview.primaryPatterns.length,3);eq(p.preview.overviewParagraphsFa,["افتتاحیهٔ نخست","افتتاحیهٔ دوم"]);eq(p.preview.chapters.every(c=>typeof c.excerptFa==='string'&&c.excerptFa.length>0),true);eq(p.preview.chapters[0].excerptFa,'preview '.repeat(4).trim());eq(p.preview.chapters[4].excerptFa,'limited');
 eq(s.create(a,req,generate),p);eq(calls,1);eq(s.create(a,{...req,relationshipContext:'work'},generate).code,'RETRY_CONFLICT');
 eq(p.summary.chartALabel,'A');eq(p.summary.id,p.reportId);
 eq(s.status(a).charts[0].input.name,'test');eq(s.status(b).charts.length,1);
 eq(s.status(b).reports.length,0);eq(JSON.stringify(s.status(a).reports).includes('PRIVATE'),false);
 eq(Object.keys(s.status(a).reports[0]).sort(),['chartALabel','chartBLabel','id','relationshipContext','updatedAt']);
 const p2=s.create(a,{...req,retryKey:'second-retry-key-123'},generate);eq(p2.paid,false);
 // Emulate a row persisted by v1: four missing leads. Reopen without losing ownership or payment state.
 s.close();const oldDb=new DatabaseSync(file);
 const old={version:'comparison-chapter-preview-v1',chapters:p.preview.chapters.map((c,i)=>({...c,excerptFa:i===3?c.excerptFa:null}))};
 oldDb.prepare('UPDATE comparisons SET preview=? WHERE id=?').run(JSON.stringify(old),p.reportId);oldDb.close();
 s=openComparisonDemoStore(file);eq(s.read(a,p.reportId),p);eq(s.read(a,p.reportId).paid,false);
 eq(s.read(b,p.reportId).code,'REPORT_UNAVAILABLE');eq(s.checkout(a,p.reportId).code,'LOGIN_REQUIRED');eq(s.login(a).account,true);
 const i=s.checkout(a,p.reportId);eq(i.amountToman,500000);eq(s.checkout(a,p.reportId),i);eq(s.settle(b,p.reportId,i.invoiceId,'verified').code,'REPORT_UNAVAILABLE');eq(s.settle(a,p2.reportId,i.invoiceId,'verified').code,'INVOICE_UNAVAILABLE');
 eq(s.settle(a,p.reportId,i.invoiceId,'cancelled').paid,false);eq(s.settle(a,p.reportId,i.invoiceId,'verified').code,'INVOICE_UNAVAILABLE');
 const j=s.checkout(a,p.reportId);eq(j.invoiceId===i.invoiceId,false);eq(s.settle(a,p.reportId,j.invoiceId,'verified').paid,true);eq(s.settle(a,p.reportId,j.invoiceId,'verified').paid,true);eq(s.checkout(a,p.reportId).status,'verified');eq(s.read(a,p2.reportId).paid,false);eq(s.read(a,p.reportId).record.reading.chapters[0].block.dailySituation,'PRIVATE');
 s.close();s=openComparisonDemoStore(file);eq(s.read(a,p.reportId).paid,true);eq(s.read(b,p.reportId).ok,false);eq(s.status(a).charts.length,2);eq(s.status(a).reports.length,2);
 for (const context of ['friendship','family','work','general']) {
   const preview=s.create(a,{...req,relationshipContext:context,retryKey:'context-test-'+context+'-123456'},generate);
   eq(preview.ok,true);eq(preview.paid,false);eq('record' in preview,false);
 }
 const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 eq(existsSync(new URL('../app/compare/demo/page.tsx',import.meta.url)),false);
 eq(existsSync(new URL('../components/comparison/ComparisonDemo.tsx',import.meta.url)),false);
 eq(source('app/compare/page.tsx').includes('redirect('),false);
 eq(source('components/comparison/ComparisonLanding.tsx').includes('<ComparisonComposer embedded localDemo={localDemo} />'),true);
 eq(source('components/comparison/ComparisonComposer.tsx').includes('router.push(`/compare/${encodeURIComponent(result.reportId)}`)'),true);
 eq(source('components/comparison/ComparisonReport.tsx').includes('if (localDemo) return record.reading;'),true);
 eq(source('app/compare/[comparisonId]/page.tsx').includes('localDemo={localDemo}'),true);
 console.log('PASS',checks,'SQLite and native-route assertions');
}finally{s.close();rmSync(dir,{recursive:true,force:true});}
