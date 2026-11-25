import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { prepareArticle, nativeContent, validateArticlePatch, verifyAppliedArticle } from "./roadmap-v5-wiki-edits.mjs";

const root=new URL("../",import.meta.url);
const read=p=>readFileSync(new URL(p,root));
const json=p=>JSON.parse(read(p).toString("utf8"));
const sha256=v=>createHash("sha256").update(v).digest("hex");
const blobSha=bytes=>createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==="object"&&!(v instanceof Date)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const digest=v=>sha256(JSON.stringify(stable(v)));
const map=json("content/seo/internal-links-roadmap-v5.json");
const index=json("content/seo/roadmap-v5-wiki-source-index.json");
const batches=[1,2,3,4].map(n=>json("content/seo/roadmap-v5-wiki-patches-0"+n+".json"));
const patches=batches.flatMap(b=>b.patches);
const slugs=patches.map(p=>p.slug);
const pairs=patches.flatMap(p=>p.checks.map(c=>"/wiki/"+p.slug+"|"+c.destination));
const wikiRows=map.rows.filter(r=>r.source.startsWith("/wiki/"));
const args=process.argv.slice(2);
const mode=args[0];
if(!["--self-check","--check","--apply","--verify"].includes(mode)||
  (mode==="--apply"?args.length!==3||args[1]!=="--approved-plan"||!/^[a-f0-9]{64}$/.test(args[2]):args.length!==1))throw Error("Usage: --self-check | --check | --verify | --apply --approved-plan <sha256>");
if(map.roadmapBlob!=="1756dfca6f29f5e594ff13ea70729ec06d89afdc"||map.rows.length!==86||
   wikiRows.length!==69||patches.length!==52||new Set(slugs).size!==52||
   pairs.length!==69||new Set(pairs).size!==69||
   wikiRows.some(r=>!pairs.includes(r.source+"|"+r.destination))||
   batches.some(b=>b.issues.length)||index.missing.length)throw Error("locked roadmap coverage mismatch");

const wikiTokens=s=>[...String(s??"").matchAll(/\[\[(?:article:[^|\]\r\n]+|page:\/wiki\/[^|\]\r\n]+)(?:\|[^\]\r\n]+)?\]\]/g)].map(m=>m[0]);
for(const patch of patches){
  const source=index.sourceRecords[patch.slug];
  if(!source||digest(source)!==digest(patch.source))throw Error("source index drift "+patch.slug);
  const bytes=read(source.path);
  if(blobSha(bytes)!==source.sha)throw Error("native source blob drift "+patch.slug);
  const doc=JSON.parse(bytes.toString("utf8"));
  const regenerated=prepareArticle(patch.slug,doc,map.rows,map.combined);
  if(digest(regenerated)!==digest({slug:patch.slug,edits:patch.edits,checks:patch.checks}))throw Error("prepared candidate drift "+patch.slug);
  const before=nativeContent(doc);
  const after=validateArticlePatch(before,patch);
  verifyAppliedArticle(after,patch);
  if(digest(wikiTokens(before.body_markdown))!==digest(wikiTokens(after.body_markdown)))throw Error("existing Wiki link changed "+patch.slug);
  if(patch.edits.length){
    let blocked=false;
    try{validateArticlePatch(after,patch);}catch{blocked=true;}
    if(!blocked)throw Error("duplicate apply fixture "+patch.slug);
  }
}
console.log("ROADMAP_V5_OFFLINE_PASS wiki_articles=52 wiki_links=69 source_blobs=52");
if(mode==="--self-check")process.exit(0);
if(!process.env.DATABASE_URL)throw Error("DATABASE_URL required; no database access inferred");
if(mode==="--apply"&&process.env.HALLEUS_ROADMAP_V5_DB_APPLY_APPROVED!=="YES")throw Error("Explicit user approval for DB apply required");
const postgres=(await import("postgres")).default;
const sql=postgres(process.env.DATABASE_URL,{max:1,prepare:false});
const fields=["intro","key_points","sections","body_markdown"];
const fingerprint=row=>digest({id:row.id,slug:row.slug,version:Number(row.content_version),updated_at:row.updated_at,...Object.fromEntries(fields.map(k=>[k,row[k]]))});

function review(rows){
  const bySlug=new Map(rows.map(r=>[r.slug,r]));
  const items=[],issues=[];
  for(const patch of patches){
    const row=bySlug.get(patch.slug);
    if(!row||row.status!=="published"||!row.is_indexable||row.deleted_at||row.scheduled_for||!row.published_at||new Date(row.published_at)>new Date()){
      issues.push({slug:patch.slug,reason:"missing or non-public article"});continue;
    }
    let already=false;
    try{verifyAppliedArticle(row,patch);already=true;}catch{}
    if(already){items.push({patch,row,already,next:row});continue;}
    try{
      const next=validateArticlePatch(row,patch);
      if(digest(wikiTokens(row.body_markdown))!==digest(wikiTokens(next.body_markdown)))throw Error("existing wiki links drift");
      items.push({patch,row,next,already:false});
    }catch(e){issues.push({slug:patch.slug,reason:String(e)});}
  }
  const planSha=digest(items.map(i=>({slug:i.patch.slug,before:fingerprint(i.row),already:i.already,after:digest(Object.fromEntries(fields.map(k=>[k,i.next[k]])))})));
  return {items,issues,planSha};
}
function snapshot(r){return {stableId:r.stable_id,slug:r.slug,title:r.title,shortTitle:r.short_title,seoTitle:r.seo_title??null,metaDescription:r.meta_description??r.summary??"",categoryId:r.category_id,tags:r.tags??[],summary:r.summary,intro:r.intro,readingMinutes:Number(r.reading_minutes),publicationPriority:Number(r.publication_priority??0),contentCluster:r.content_cluster??r.category_id,articleRole:r.article_role,relatedArticleIds:r.related_article_ids??[],indexable:!!r.is_indexable,bodyMarkdown:r.body_markdown??"",keyPoints:r.key_points??[],sections:r.sections??[],contextLinks:r.context_links??[],sources:r.sources??[],callToAction:r.call_to_action??null,contentVersion:Number(r.content_version)};}
async function plan(tx,lock){
  if(lock){
    await tx`set local lock_timeout = '5s'`;
    const a=await tx`select pg_try_advisory_xact_lock(hashtext('halleus-roadmap-v5-wiki')) as acquired`;
    if(a[0]?.acquired!==true)throw Error("another roadmap apply running");
    await tx`lock table public.wiki_articles, public.wiki_article_revisions, public.wiki_article_drafts, halleus_private.wiki_publish_jobs in share row exclusive mode`;
  }else await tx`set transaction read only`;
  const rows=await tx`select * from public.wiki_articles where slug=any(${slugs}::text[])`;
  const result=review(rows);
  const pending=await tx`select distinct a.slug from public.wiki_articles a where a.slug=any(${slugs}::text[]) and (exists(select 1 from public.wiki_article_drafts d where d.article_id=a.id) or exists(select 1 from halleus_private.wiki_publish_jobs j where j.article_id=a.id and j.status in ('queued','running','retry'))) `;
  if(mode!=="--verify")for(const p of pending)result.issues.push({slug:p.slug,reason:"open draft or pending publication; no overwrite"});
  return result;
}
try{
  if(mode==="--check"||mode==="--verify"){
    const result=await sql.begin(tx=>plan(tx,false));
    const report={mode,articles:result.items.length,already:result.items.filter(x=>x.already).length,remaining:result.items.filter(x=>!x.already).length,issues:result.issues,plan_sha256:result.planSha};
    console.log(JSON.stringify(report,null,2));
    if(result.issues.length||result.items.length!==52||(mode==="--verify"&&report.remaining))throw Error("ROADMAP_V5_DB_GATE_FAILED");
  }else{
    const result=await sql.begin(async tx=>{
      const p=await plan(tx,true);
      if(p.issues.length||p.items.length!==52||p.planSha!==args[2])throw Error("preflight changed; no writes: "+JSON.stringify(p.issues));
      let updated=0,resumed=0;
      for(const {row,next,patch,already} of p.items){
        if(already){resumed++;continue;}
        const rev=await tx`select coalesce(max(revision_number),0)::integer as n from public.wiki_article_revisions where article_id=${row.id}::uuid`;
        const n=Number(rev[0].n)+1;
        await tx`insert into public.wiki_article_revisions(article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values(${row.id}::uuid,${n},${tx.json(snapshot(row))},'Roadmap v5 before',null,'published',now())`;
        const changed=await tx`update public.wiki_articles set intro=${next.intro},key_points=${tx.json(next.key_points)},sections=${tx.json(next.sections)},body_markdown=${next.body_markdown},content_version=content_version+1,updated_at=now() where id=${row.id}::uuid and content_version=${row.content_version} and status='published' returning *`;
        if(changed.length!==1)throw Error("concurrent update "+patch.slug);
        verifyAppliedArticle(changed[0],patch);
        await tx`insert into public.wiki_article_revisions(article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values(${row.id}::uuid,${n+1},${tx.json(snapshot(changed[0]))},'Roadmap v5 approved links and Vedic copy',null,'published',now())`;
        updated++;
      }
      return {updated,resumed};
    });
    console.log("ROADMAP_V5_DB_COMMITTED "+JSON.stringify(result)+"; cache and HTML verification still required");
  }
}finally{await sql.end();}
