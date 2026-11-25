/** Product preview: strict 20% cap, exact prefix, no full manuscript in public projection. */
import assert from 'node:assert/strict';
import { extractVedicD1ChapterExcerpt, projectVedicD1ChapterPreview } from '../lib/vedic/vedic-d1-server-preview.ts';
import { VEDIC_D1_PREMIUM_CHAPTERS, VEDIC_D1_READING_VERSION, isVedicD1PremiumPreview } from '../lib/vedic/vedic-d1-reading-contract.ts';
import { handleVedicD1Post } from '../lib/vedic/vedic-d1-http.ts';

const tests=[];
const check=(name,fn)=>tests.push([name,fn]);
const count=s=>s.trim()?s.trim().split(/\s+/u).length:0;
const suffix='این قسمت فقط برای گزارش خریداری‌شده است. '.repeat(8)+'LOCKED_SENTINEL';
const paragraphs=['این آغاز فصل است. جملهٔ دوم کامل است؟',suffix];
const draft={kind:'private-d1-draft',version:'private-version',writerRulesVersion:'private-rules',
  calculationVersion:'private-calculation',trustNoteFa:'PRIVATE_TRUST',
  chapters:VEDIC_D1_PREMIUM_CHAPTERS.map(ch=>({...ch,paragraphsFa:paragraphs,evidence:[{id:'PRIVATE_EVIDENCE'}]}))};
const preview=projectVedicD1ChapterPreview(draft);
check('exact capped complete-sentence prefix',()=>{
  assert.equal(extractVedicD1ChapterExcerpt(paragraphs),'این آغاز فصل است. جملهٔ دوم کامل است؟');
  for(const row of preview) {
    assert.ok(paragraphs.join('\n\n').startsWith(row.excerptFa));
    assert.ok(count(row.excerptFa)<=Math.floor(count(paragraphs.join(' '))/5));
    assert.deepEqual(Object.keys(row).sort(),['excerptFa','id','title']);
  }
  assert.ok(!JSON.stringify(preview).includes('LOCKED_SENTINEL'));
  assert.ok(!JSON.stringify(preview).includes('PRIVATE_EVIDENCE'));
  assert.ok(!JSON.stringify(preview).includes('private-rules'));
});
check('short, empty and overlong opening sentence fail closed',()=>{
  assert.equal(extractVedicD1ChapterExcerpt([]),null);
  assert.equal(extractVedicD1ChapterExcerpt(['']),null);
  assert.equal(extractVedicD1ChapterExcerpt(['این جمله کامل است.']),null);
  assert.equal(extractVedicD1ChapterExcerpt(['یک دو سه چهار پنج شش هفت هشت نه ده. آخر.']),null);
  assert.equal(extractVedicD1ChapterExcerpt(['یک دو سه چهار پنج شش هفت هشت نه ده']),null);
});
check('decimals and closing quote do not create broken fragments',()=>{
  const body=['درجه 12.5 است. «حالا چه؟»','پایان بدون نمایش. '.repeat(20)];
  const text=extractVedicD1ChapterExcerpt(body);
  assert.ok(text.startsWith('درجه 12.5 است.'));
  assert.ok(!text.endsWith('12.'));
  assert.ok(count(text)<=Math.floor(count(body.join(' '))/5));
  assert.ok(/[.!؟?…][»”’"')\]]*$/u.test(text));
});
check('invalid draft order and shape fail closed',()=>{
  assert.throws(()=>projectVedicD1ChapterPreview({...draft,chapters:draft.chapters.slice(0,3)}));
  assert.throws(()=>projectVedicD1ChapterPreview({...draft,chapters:[...draft.chapters].reverse()}));
  assert.throws(()=>projectVedicD1ChapterPreview({...draft,kind:'other'}));
  assert.ok(isVedicD1PremiumPreview(preview));
  assert.ok(!isVedicD1PremiumPreview(preview.slice(0,3)));
  assert.ok(!isVedicD1PremiumPreview(Array(4)));
  assert.ok(!isVedicD1PremiumPreview([...preview].reverse()));
  assert.ok(!isVedicD1PremiumPreview(preview.map(row=>({...row,excerptFa:''}))));
});
const fakeReading={responseVersion:VEDIC_D1_READING_VERSION,kind:'free-d1',premiumStatus:'not-available',
  view:{rows:Array.from({length:9},()=>({}))},shortReading:{textFa:'رایگان',evidence:[]},
  availablePremiumChapterTitles:VEDIC_D1_PREMIUM_CHAPTERS.map(x=>x.title)};
const request=()=>new Request('https://example.invalid/api/vedic/d1',{
  method:'POST',headers:{'content-type':'application/json'},body:'{}'});
const resolveBirth=()=>({ok:true,value:{}});
check('HTTP allowlist removes nested and top-level manuscript extras',async()=>{
  const response=await handleVedicD1Post(request(),resolveBirth,()=>({
    ...fakeReading,fullDraft:draft,
    premiumPreview:preview.map(row=>({...row,paragraphsFa:paragraphs,evidence:draft.chapters[0].evidence})),
  }));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store, max-age=0');
  const body=await response.text();
  const parsed=JSON.parse(body);
  assert.deepEqual(parsed.reading.premiumPreview,preview);
  for(const key of ['LOCKED_SENTINEL','PRIVATE_EVIDENCE','PRIVATE_TRUST','paragraphsFa','fullDraft','writerRulesVersion'])
    assert.ok(!body.includes(key),key+' leaked');
});
check('HTTP rejects malformed preview but preserves valid free chart',async()=>{
  for(const bad of [null,undefined,Array(4),preview.slice(0,3),[...preview].reverse()]) {
    const res=await handleVedicD1Post(request(),resolveBirth,()=>({...fakeReading,premiumPreview:bad}));
    assert.equal(res.status,200);
    assert.equal((await res.json()).reading.premiumPreview,null);
  }
});
let failed=0;
for(const [name,fn] of tests) {
  try {await fn();console.log('PASS '+name);}
  catch(e){failed++;console.error('FAIL '+name+': '+e.message);}
}
if(failed)process.exitCode=1;
else console.log('PASS safe public D1 chapter preview: '+tests.length+' checks');
