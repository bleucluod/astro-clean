import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Exactly 74 distinct, user-editorially-approved R3 URLs. No database writes except --apply.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const modes=['--self-check','--check','--apply','--verify'];
const mode=process.argv[2];
if(process.argv.length!==3||!modes.includes(mode))throw Error('Usage: --self-check | --check | --apply | --verify');
const manifest=JSON.parse(readFileSync(resolve(root,'content/r3-batch07/manifest.json'),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalize=value=>Array.isArray(value)?value.map(normalize):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,normalize(value[k])])):value;
const equal=(a,b)=>JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
const fatal=message=>{throw Error('SAFETY_FATAL: '+message)};
if(manifest.schema!=='HALLEUS_R3_BATCH07_MANIFEST_V1'||
   manifest.source_backup_commit!=='c90a9b401592eab2b470d7e5920f5f6b40f73c6d'||
   manifest.site_reference_commit!=='557c1db3c7d84e90a029bc885b941a9352c464c6'||
   manifest.record_count!==74||manifest.approval_count!==74||
   manifest.release_authorized!==false||manifest.publication_authorized!==false||
   manifest.records?.length!==74||new Set(manifest.records.map(e=>e.page_id)).size!==74||
   new Set(manifest.records.map(e=>e.canonical_url)).size!==74)fatal('locked 74-URL manifest drift');

const docs=[],issues=[];
const allowedKinds=new Set(['paragraph','list','numbered-list','heading','table','image','quote','divider']);
const trustedImage=url=>{
 try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&(
    /^https:\/\/halleus\.ir\/storage\/v1\/object\/public\/wiki-media\/[a-f0-9]{2}\/[a-f0-9]{64}\.webp$/.test(url)||
    ['images-assets.nasa.gov','assets.science.nasa.gov','science.nasa.gov'].includes(u.hostname));}
 catch{return false}
};
const readDoc=e=>{
 const bytes=readFileSync(resolve(root,'content/r3-batch07/wiki',e.page_id+'.json'));
 if(sha(bytes)!==e.candidate_json_sha256)throw Error('locked native JSON SHA256 mismatch');
 const d=JSON.parse(bytes.toString('utf8')),c=d.content;
 if(d.schema!=='HALLEUS_R3_BATCH07_OFFLINE_CANDIDATE_V1'||d.page_id!==e.page_id||
    d.slug!==e.slug||d.canonical_url!==e.canonical_url||d.canonical_url!=='https://halleus.ir/wiki/'+d.slug||
    d.approved_sha256!==e.approved_sha256||d.approved_blob_sha1!==e.approved_blob_sha1||
    d.baseline_content_version!==e.baseline_content_version||!Number.isInteger(d.baseline_content_version)||d.baseline_content_version<1)
    throw Error('identity, approved hash, or version changed');
 if(!c.title||!c.seo_title||!c.meta_description||!c.intro||!c.body_markdown||
    !Array.isArray(c.sections)||c.sections.length<1||c.sections.length>120||
    c.body_markdown.length>120000||c.sections.length!==(c.body_markdown.match(/^## /gm)||[]).length)
    throw Error('missing or out-of-range native editorial content');
 const all=[...(c.intro_blocks||[]),...c.sections.flatMap(s=>s.orderedBlocks||[])];
 if(c.sections.some(s=>!s.title||!Array.isArray(s.orderedBlocks)||!Array.isArray(s.paragraphs)||!Array.isArray(s.bullets)))throw Error('section format mismatch');
 if(all.some(b=>!allowedKinds.has(b.kind)||
    (b.kind==='paragraph'&&typeof b.text!=='string')||
    (b.kind==='heading'&&(b.level!==3||!b.text))||
    (['list','numbered-list'].includes(b.kind)&&(!Array.isArray(b.items)||b.items.some(x=>typeof x!=='string')))||
    (b.kind==='table'&&(!Array.isArray(b.header)||!Array.isArray(b.rows)||b.rows.some(row=>row.length!==b.header.length)))||
    (b.kind==='image'&&(!b.alt?.trim()||!trustedImage(b.src)))))throw Error('renderer-untrusted block');
 if(all.filter(b=>b.kind==='heading').length!==(c.body_markdown.match(/^### /gm)||[]).length)throw Error('H3 content lost');
 if(all.filter(b=>b.kind==='image').length!==(c.body_markdown.match(/^!\[[^\]\r\n]+\]\(https:\/\/[^\s)]+\)$/gm)||[]).length)throw Error('image content lost');
 return d;
};
for(const entry of manifest.records){try{docs.push(readDoc(entry))}catch(e){issues.push(entry.page_id+': '+e.message)}}
if(issues.length){for(const issue of issues)console.error('CANDIDATE_FAILURE | '+issue);fatal(issues.length+' native candidate errors')}
const slugs=docs.map(d=>d.slug);
const inlineIds=doc=>[...new Set([...doc.content.body_markdown.matchAll(/\[\[(?:article:([a-z0-9]+(?:[._-][a-z0-9]+)*)|page:\/wiki\/([a-z0-9]+(?:[._-][a-z0-9]+)*))(?:\|[^\]\r\n]+)?\]\]/g)].map(m=>m[1]||m[2]))];
const allTargets=[...new Set(docs.flatMap(inlineIds))];
console.log('PASS | OFFLINE_NATIVE_LOCK pages=74 unique='+new Set(slugs).size+' referencedArticles='+allTargets.length);

const updateFields=['title','seo_title','meta_description','intro','sections','body_markdown'];
const expected=doc=>Object.fromEntries([...updateFields,...('summary' in doc.content?['summary']:[])].map(key=>[key,doc.content[key]]));
function review(rows){
 const by=new Map(rows.map(row=>[row.stable_id,row])),issues=[],items=[];
 for(const doc of docs){
   const row=by.get(doc.slug);
   if(!row){issues.push(doc.page_id+': row missing');continue}
   if(row.slug!==doc.slug||row.status!=='published'||!row.is_indexable||row.deleted_at||!row.published_at||row.scheduled_for){issues.push(doc.page_id+': publication or identity drift');continue}
   const next=expected(doc),version=Number(row.content_version),base=doc.baseline_content_version;
   const already=version===base+1&&Object.entries(next).every(([key,value])=>equal(row[key],value));
   if(!already&&version!==base){issues.push(doc.page_id+': content_version or updated text drift (expected '+base+' or exact '+(base+1)+', current '+version+')');continue}
   items.push({doc,row,next,already});
 }
 return {issues,items};
}
function fixtures(){
 const rows=docs.map((d,i)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,stable_id:d.slug,slug:d.slug,status:'published',is_indexable:true,published_at:'2026-08-01',deleted_at:null,scheduled_for:null,content_version:d.baseline_content_version}));
 if(review(rows).issues.length||review(rows).items.some(x=>x.already))fatal('fresh fixture');
 const applied=rows.map((row,i)=>({...row,...expected(docs[i]),content_version:docs[i].baseline_content_version+1}));
 if(review(applied).issues.length||review(applied).items.some(x=>!x.already))fatal('resume fixture');
 const stale=applied.map((row,i)=>i===0?{...row,title:'unexpected admin edit'}:row);
 if(!review(stale).issues.length)fatal('modified after apply fixture');
 if(!review(rows.slice(1)).issues.length)fatal('missing row fixture');
 const moved=rows.map((row,i)=>i===0?{...row,content_version:row.content_version+2}:row);
 if(!review(moved).issues.length)fatal('newer version fixture');
 console.log('PASS | FIXTURES fresh/resume/admin-edit/missing/newer-version');
}
fixtures();
if(mode==='--self-check'){console.log('PASS | NO_DB_NO_GIT_WRITES');process.exit(0)}
if(!process.env.DATABASE_URL)fatal('DATABASE_URL unavailable; DB access never inferred');
if(mode==='--apply'&&(process.env.HALLEUS_R3_BATCH07_RELEASE_APPROVED!=='YES'||
    process.env.HALLEUS_R3_RELEASE_APPROVAL_REFERENCE!=='user-2026-11-01-github-and-vps-sync-74'))
    fatal('explicit user batch07 release approval reference required');

const postgres=(await import('postgres')).default;
const sql=postgres(process.env.DATABASE_URL,{max:1,prepare:false,connect_timeout:5});
async function targets(query,items){
 const required=[...new Set(items.flatMap(x=>inlineIds(x.doc)))];
 const related=[...new Set(items.flatMap(x=>x.row.related_article_ids||[]))];
 const all=[...new Set([...required,...related])];
 if(!all.length)return new Set();
 const found=await query`select stable_id from public.wiki_articles where stable_id=any(${all}::text[]) and status='published' and is_indexable=true and published_at<=now() and scheduled_for is null and deleted_at is null`;
 const ready=new Set(found.map(x=>x.stable_id));
 const missing=required.filter(slug=>!ready.has(slug));
 if(missing.length)fatal('inline link targets not currently published: '+missing.join(', '));
 return ready;
}
function snapshot(r){return {stableId:r.stable_id,slug:r.slug,title:r.title,shortTitle:r.short_title,seoTitle:r.seo_title||undefined,metaDescription:r.meta_description||undefined,categoryId:r.category_id,tags:r.tags||[],summary:r.summary,intro:r.intro,readingMinutes:Number(r.reading_minutes),publicationPriority:Number(r.publication_priority||0),contentCluster:r.content_cluster||r.category_id,articleRole:r.article_role,relatedArticleIds:r.related_article_ids||[],indexable:!!r.is_indexable,bodyMarkdown:r.body_markdown||'',keyPoints:r.key_points||[],sections:r.sections||[],contextLinks:r.context_links||[],sources:r.sources||[],callToAction:r.call_to_action,contentVersion:Number(r.content_version)}}
async function syncLinks(tx,row,doc,ready){
 await tx`delete from public.wiki_internal_links where source_article_id=${row.id}::uuid`;
 for(const target of inlineIds(doc)){
   await tx`insert into public.wiki_internal_links(source_article_id,target_stable_id,link_kind,source_token,activation_status,activated_at,last_verified_at) values(${row.id}::uuid,${target},'inline',${'[[article:'+target+']]'},'active',now(),now())`;
 }
 for(const target of new Set(row.related_article_ids||[])){
   const activation=ready.has(target)?'active':'pending';
   await tx`insert into public.wiki_internal_links(source_article_id,target_stable_id,link_kind,source_token,activation_status,activated_at,last_verified_at) values(${row.id}::uuid,${target},'related',${target},${activation},now(),now()) on conflict do nothing`;
 }
}
try{
 if(mode==='--check'||mode==='--verify'){
   const rows=await sql`select * from public.wiki_articles where stable_id=any(${slugs}::text[])`;
   const plan=review(rows);
   if(plan.issues.length)fatal('read-only DB preflight: '+plan.issues.join('; '));
   await targets(sql,plan.items);
   if(mode==='--verify'&&plan.items.some(x=>!x.already))fatal('post-apply DB exact parity incomplete');
   console.log('PASS | '+(mode==='--verify'?'DB_EXACT_PARITY':'READ_ONLY_DB_PREFLIGHT')+' pages=74 updated='+plan.items.filter(x=>x.already).length);
 }else{
   const outcomes=await sql.begin(async tx=>{
     const rows=await tx`select * from public.wiki_articles where stable_id=any(${slugs}::text[]) for update`;
     const plan=review(rows);
     if(plan.issues.length)fatal('transaction-time DB drift: '+plan.issues.join('; '));
     const ready=await targets(tx,plan.items);let updated=0,resumed=0;
     for(const {doc,row,next,already} of plan.items){
       if(already){resumed++;continue}
       const rev=await tx`select coalesce(max(revision_number),0)::int as n from public.wiki_article_revisions where article_id=${row.id}::uuid`;
       const n=Number(rev[0].n)+1;
       await tx`insert into public.wiki_article_revisions(article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values(${row.id}::uuid,${n},${tx.json(snapshot(row))}::jsonb,'R3 batch07 before',null,'published',now())`;
       const nextSummary=('summary' in next)?next.summary:row.summary;
       const changed=await tx`update public.wiki_articles set title=${next.title},seo_title=${next.seo_title},meta_description=${next.meta_description},summary=${nextSummary},intro=${next.intro},sections=${tx.json(next.sections)}::jsonb,body_markdown=${next.body_markdown},content_version=${doc.baseline_content_version+1},updated_at=now() where id=${row.id}::uuid and content_version=${doc.baseline_content_version} and status='published' returning *`;
       if(changed.length!==1)fatal('concurrent update '+doc.page_id);
       await tx`insert into public.wiki_article_revisions(article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values(${row.id}::uuid,${n+1},${tx.json(snapshot(changed[0]))}::jsonb,'R3 batch07 approved replacement',null,'published',now())`;
       await syncLinks(tx,changed[0],doc,ready);updated++;
     }
     return {updated,resumed};
   });
   console.log('PASS | TRANSACTION_COMMITTED '+JSON.stringify(outcomes)+' | live parity still required');
 }
}finally{await sql.end({timeout:2})}
