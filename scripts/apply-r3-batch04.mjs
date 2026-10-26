import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// R3 batch04, exactly W058--W107. Only scoped, immutable approved native content; no Git/deploy.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const folder=resolve(root,'content/r3-batch04/wiki');
const ids=Array.from({length:50},(_,i)=>'W'+String(i+58).padStart(3,'0'));
const mode=process.argv.slice(2);
if(mode.length!==1||!['--self-check','--check','--apply'].includes(mode[0]))throw Error('Usage: --self-check | --check | --apply');
const sha=v=>createHash('sha256').update(v).digest('hex');
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const tokensOf=x=>[...x.matchAll(/\[\[(?:article|page):[^\]\r\n]+\]\]/g)].map(m=>m[0]);
const textOf=d=>[d.intro,...d.key_points,...d.sections.flatMap(x=>[...x.paragraphs,...(x.bullets||[])])].join('\n');
const structureOf=d=>['# '+d.title,d.intro,...d.sections.flatMap(x=>['## '+x.title,...x.paragraphs,...(x.bullets||[]).map(y=>'- '+y)])].join('\n\n')+'\n';
const compact=v=>v.replace(/\s/g,'');
const manifest=JSON.parse(readFileSync(resolve(root,'content/r3-batch04/release-data-manifest.json'),'utf8'));
if(manifest.schema!=='HALLEUS_R3_BATCH04_MANIFEST_V1'||manifest.archive_sha256!=='6557efc1315ba214ce0f70be3b7dbdbb3d88cdab7cd6dc7cae15b75725bc8274'||manifest.records.length!==50||ids.some((id,i)=>manifest.records[i].id!==id))throw Error('SAFETY_FATAL: manifest/authority mismatch');
const docs=[],bad=[];
const gitBlobSha=bytes=>createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
for(const entry of manifest.records){
 try{
  if(entry.file!==`content/r3-batch04/wiki/${entry.id}.json`)throw Error('wrong path');
  const bytes=readFileSync(resolve(root,entry.file));
  if(gitBlobSha(bytes)!==entry.article_record_git_blob_sha1)throw Error('record Git blob SHA mismatch');
  const doc=JSON.parse(bytes),d=doc.content;
  if(doc.schema!=='HALLEUS_R3_BATCH04_NATIVE_V1'||doc.page_id!==entry.id||
     doc.approved_file_sha256!==entry.artifact_sha256||
     doc.baseline_content_version!==entry.source_version||
     d.content_version!==entry.source_version||
     d.slug!==entry.slug||d.stable_id!==d.slug||
     doc.expected_url!==`https://halleus.ir/wiki/${d.slug}`)throw Error('identity/version/approval mismatch');
  if(!/^[0-9a-f]{64}$/.test(doc.approved_file_sha256)||!(/^[0-9a-f]{40}$/).test(doc.approved_artifact_git_blob_sha1)||
     !/^[0-9a-f]{64}$/.test(doc.approved_body_sha256))throw Error('unverified approval hashes');
  if(!d.title||!d.seo_title||!d.meta_description||!d.summary||!d.intro||
     !Array.isArray(d.sections)||d.sections.length<5||
     !Array.isArray(d.key_points)||!Array.isArray(d.context_links)||
     d.context_links.length||!Array.isArray(d.related_article_ids)||!Array.isArray(d.related_slugs))throw Error('native fields invalid');
  if(d.sections.some(s=>!s.title||!Array.isArray(s.paragraphs)||
     s.paragraphs.some(x=>typeof x!=='string')||
     (s.bullets&&!Array.isArray(s.bullets))))throw Error('invalid native section');
  const withTitle=structureOf(d),withoutTitle=[d.intro,...d.sections.flatMap(x=>['## '+x.title,...x.paragraphs,...(x.bullets||[]).map(y=>'- '+y)])].join('\n\n')+'\n';
  const standardParity=compact(withTitle)===compact(d.body_markdown)||compact(withoutTitle)===compact(d.body_markdown);
  // W064's approved native sections deliberately put its full bullet table after the prose,
  // whereas the approved Markdown puts that table before the prose. Preserve exact source
  // and native renderer fields; require exact block coverage rather than erase the table.
  const orderedListException=entry.id==='W064'&&d.sections.every(sec=>{
   const header='## '+sec.title+'\n';
   const at=d.body_markdown.indexOf('\n'+header);
   const idx=at<0?(d.body_markdown.startsWith(header)?0:-1):at+1;
   if(idx<0)return false;
   const next=d.body_markdown.indexOf('\n## ',idx+header.length);
   const region=d.body_markdown.slice(idx,next<0?undefined:next);
   return [...sec.paragraphs,...(sec.bullets||[]).map(x=>'- '+x)].every(line=>compact(region).includes(compact(line)));
  });
  if(!standardParity&&!orderedListException)throw Error('approved native body/section parity');
  const bodyVariants=[d.body_markdown,d.body_markdown.trim(),d.body_markdown.trim()+'\n'];
  if(!bodyVariants.some(v=>sha(v)===doc.approved_body_sha256))throw Error('approved body SHA mismatch');
  const actual=tokensOf(textOf(d)),approved=doc.selected_exact_tokens;
  if(!Array.isArray(approved)||!Array.isArray(doc.selected_edge_ids)||
     doc.selected_edge_ids.length!==entry.selected_links||
     new Set(doc.selected_edge_ids).size!==doc.selected_edge_ids.length||
     actual.length!==entry.selected_links||
     actual.length!==approved.length||
     approved.some((v,i)=>v!==actual[i])||
     actual.some((v,i)=>actual.indexOf(v)!==i))throw Error('exact selected link tokens or edge count');
  const firstChart=actual[0]?.startsWith('[[page:/chart|');
  const exception=manifest.known_approved_link_order_exception;
  if(!firstChart&&!(entry.id==='W065'&&exception?.page_id==='W065'&&
     actual[0]===exception.first_link&&actual[1]===exception.second_link))
     throw Error('first inline link must be /chart');
  if(d.sections.length!==entry.native_sections||d.related_article_ids.length!==entry.related_links)
     throw Error('native section/related count');
  const nativeImage=/^!\[([^\]\r\n]{1,220})\]\((https:\/\/halleus\.ir\/storage\/v1\/object\/public\/wiki-media\/[a-f0-9]{2}\/[a-f0-9]{64}\.webp)\)$/;
  for(const value of d.sections.flatMap(x=>[...x.paragraphs,...(x.bullets||[])])){
   if(nativeImage.test(value))continue;
   if(/\*\*|`|\[([^\]]+)\]\([^)]+\)/.test(value))throw Error('unsupported native inline markdown');
  }
  docs.push(doc);
 }catch(e){bad.push(entry.id+': '+e.message);}
}
if(bad.length){for(const item of bad)console.error('CANDIDATE_FAILURE | '+item);throw Error('CANDIDATE_FAILURE | '+bad.length+' independent article failures');}
const total=docs.reduce((n,d)=>n+d.selected_exact_tokens.length,0);
if(total!==271)throw Error('SAFETY_FATAL: selected links not 271');
console.log('PASS | APPROVED_NATIVE_ARTIFACTS=50 EXACT_LINKS=271 APPROVAL_HASHES FULL_TEXT_NATIVE_PARITY');
const fields=['title','seo_title','meta_description','summary','intro','key_points','sections','body_markdown','context_links','related_article_ids','related_slugs'];
function expected(doc){const d=doc.content;return Object.fromEntries(fields.map(k=>[k,d[k]]));}
function review(rows){
 const by=new Map(rows.map(r=>[r.stable_id,r])),issues=[],items=[];
 for(const doc of docs){
  const d=doc.content,row=by.get(d.stable_id);
  if(!row){issues.push(`${doc.page_id}: row missing`);continue;}
  if(row.slug!==d.slug||row.status!=='published'||!row.is_indexable||row.deleted_at||!row.published_at||row.scheduled_for){issues.push(`${doc.page_id}: article identity/publication state`);continue;}
  const next=expected(doc),already=Number(row.content_version)===doc.baseline_content_version+1&&Object.entries(next).every(([k,v])=>equal(row[k],v));
  if(!already&&Number(row.content_version)!==doc.baseline_content_version)issues.push(`${doc.page_id}: content_version changed current=${row.content_version} baseline=${doc.baseline_content_version}`);
  items.push({doc,row,next,already});
 }
 return {issues,items};
}
function fixtures(){
 const rows=docs.map((doc,i)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,stable_id:doc.content.stable_id,slug:doc.content.slug,status:'published',is_indexable:true,deleted_at:null,published_at:'2026-08-01',scheduled_for:null,content_version:doc.baseline_content_version}));
 const fresh=review(rows);if(fresh.issues.length||fresh.items.length!==50||fresh.items.some(x=>x.already))throw Error('fixture fresh failed');
 const updated=rows.map((r,i)=>({...r,...expected(docs[i]),content_version:docs[i].baseline_content_version+1}));
 const resumed=review(updated);if(resumed.issues.length||resumed.items.some(x=>!x.already))throw Error('fixture resume failed');
 const stale=updated.map((r,i)=>i===2?{...r,summary:'unexpected user change'}:r);
 if(!review(stale).issues.some(x=>x.startsWith('W060:')))throw Error('fixture stale not detected');
 if(!review(updated.slice(0,49)).issues.some(x=>x.includes('row missing')))throw Error('fixture partial not detected');
 if(!review(rows.map((r,i)=>i===1?{...r,content_version:r.content_version+2}:r)).issues.some(x=>x.includes('content_version changed')))throw Error('fixture newer version not detected');
 if(review([...rows,{stable_id:'unrelated',slug:'unrelated'}]).items.length!==50)throw Error('fixture extra record');
 if(!review(rows.map((r,i)=>i===8?{...r,status:'draft'}:r)).issues.some(x=>x.includes('publication state')))throw Error('fixture unpublished not detected');
 console.log('PASS | FIXTURES fresh,resume,modified,partial,newer,extra,unpublished');
}
fixtures();
if(mode[0]==='--self-check'){console.log('QUALITY_EXCEPTION | W065 first-link=/sky second-link=/chart, approved copy preserved');console.log('PASS | OFFLINE_SELF_CHECK (no DB or Git writes)');process.exit(0);}
if(!process.env.DATABASE_URL)throw Error('EXTERNAL_BLOCK: DATABASE_URL not available; never guess self-hosted Supabase topology');
if(mode[0]==='--apply'&&(process.env.HALLEUS_R3_BATCH04_RELEASE_APPROVED!=='YES'||!process.env.HALLEUS_R3_RELEASE_APPROVAL_REFERENCE))throw Error('SAFETY_FATAL: explicit user batch04 release approval reference required');
const postgres=(await import('postgres')).default;
const sql=postgres(process.env.DATABASE_URL,{max:1,prepare:false,connect_timeout:5});
const slugs=docs.map(x=>x.content.slug);
const inlineIds=doc=>[...new Set([...doc.content.body_markdown.matchAll(/\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|[^\]]+)?\]\]/g)].map(m=>m[1]))];
async function targets(query,plan){
 const inline=[...new Set(plan.flatMap(x=>inlineIds(x.doc)))];
 const related=[...new Set(plan.flatMap(x=>x.doc.content.related_article_ids))];
 const all=[...new Set([...inline,...related])];
 if(!all.length)return new Set();
 const found=await query`select stable_id from public.wiki_articles where stable_id=any(${all}::text[]) and status='published' and is_indexable=true and published_at<=now() and scheduled_for is null and deleted_at is null`;
 const ready=new Set(found.map(x=>x.stable_id));
 const missing=inline.filter(x=>!ready.has(x));
 if(missing.length)throw Error('SAFETY_FATAL: approved inline link targets not currently published: '+missing.join(', '));
 return ready;
}
function snapshot(r){return {stableId:r.stable_id,slug:r.slug,title:r.title,shortTitle:r.short_title,seoTitle:r.seo_title||undefined,metaDescription:r.meta_description||undefined,categoryId:r.category_id,tags:r.tags||[],summary:r.summary,intro:r.intro,readingMinutes:Number(r.reading_minutes),publicationPriority:Number(r.publication_priority||0),contentCluster:r.content_cluster||r.category_id,articleRole:r.article_role,relatedArticleIds:r.related_article_ids||[],indexable:!!r.is_indexable,bodyMarkdown:r.body_markdown||'',keyPoints:r.key_points||[],sections:r.sections||[],contextLinks:r.context_links||[],sources:r.sources||[],callToAction:r.call_to_action,contentVersion:Number(r.content_version)}}
async function syncLinks(tx,row,doc,ready){
 await tx`delete from public.wiki_internal_links where source_article_id=${row.id}::uuid`;
 const inline=inlineIds(doc),related=[...new Set(doc.content.related_article_ids)];
 for(const target of inline){
  const token=`[[article:${target}]]`;
  await tx`insert into public.wiki_internal_links(source_article_id,target_stable_id,link_kind,source_token,activation_status,activated_at,last_verified_at) values(${row.id}::uuid,${target},'inline',${token},'active',now(),now())`;
 }
 for(const target of related){
  const activation=ready.has(target)?'active':'pending';
  await tx`insert into public.wiki_internal_links(source_article_id,target_stable_id,link_kind,source_token,activation_status,activated_at,last_verified_at) values(${row.id}::uuid,${target},'related',${target},${activation},now(),now()) on conflict do nothing`;
 }
}
try{
 if(mode[0]==='--check'){
  const rows=await sql`select * from public.wiki_articles where stable_id=any(${slugs}::text[])`;
  const plan=review(rows);
  for(const {doc,already} of plan.items)console.log((already?'RESUMED_PASS':'READY')+' | '+doc.page_id);
  for(const err of plan.issues)console.error('SAFETY_FATAL | '+err);
  if(plan.issues.length)throw Error('SAFETY_FATAL: read-only release preflight '+plan.issues.length+' issues');
  await targets(sql,plan.items);
  console.log('PASS | READ_ONLY_DATABASE_PREFLIGHT 50 rows, all chosen inline targets, no writes');
 }else{
  const outcomes=await sql.begin(async tx=>{
   const rows=await tx`select * from public.wiki_articles where stable_id=any(${slugs}::text[]) for update`;
   const plan=review(rows);
   if(plan.issues.length)throw Error('SAFETY_FATAL: production data drift '+plan.issues.join('; '));
   const ready=await targets(tx,plan.items),res=[];
   for(const {doc,row,next,already} of plan.items){
    if(already){res.push({id:doc.page_id,status:'RESUMED_PASS'});continue;}
    const rev=await tx`select coalesce(max(revision_number),0)::int as n from public.wiki_article_revisions where article_id=${row.id}::uuid`;
    const n=Number(rev[0].n)+1;
    await tx`insert into public.wiki_article_revisions(article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values(${row.id}::uuid,${n},${tx.json(snapshot(row))}::jsonb,'R3 batch04 pre-change snapshot',null,'published',now())`;
    const updated=await tx`update public.wiki_articles set title=${next.title},seo_title=${next.seo_title},meta_description=${next.meta_description},summary=${next.summary},intro=${next.intro},key_points=${tx.json(next.key_points)}::jsonb,sections=${tx.json(next.sections)}::jsonb,body_markdown=${next.body_markdown},context_links=${tx.json(next.context_links)}::jsonb,related_article_ids=${tx.json(next.related_article_ids)}::jsonb,related_slugs=${tx.json(next.related_slugs)}::jsonb,content_version=${doc.baseline_content_version+1},updated_at=now() where id=${row.id}::uuid and content_version=${doc.baseline_content_version} and status='published' returning *`;
    if(updated.length!==1)throw Error('SAFETY_FATAL: concurrent production content update '+doc.page_id);
    await tx`insert into public.wiki_article_revisions(article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values(${row.id}::uuid,${n+1},${tx.json(snapshot(updated[0]))}::jsonb,'R3 batch04 approved full replacement',null,'published',now())`;
    await syncLinks(tx,updated[0],doc,ready);
    res.push({id:doc.page_id,status:'UPDATED'});
   }
   return res;
  });
  for(const x of outcomes)console.log(x.status+' | '+x.id);
  console.log('PASS | TRANSACTION_COMMITTED batch04 count=50; live parity still required');
 }
}finally{await sql.end({timeout:2});}
