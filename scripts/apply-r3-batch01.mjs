import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

// Scoped 10-page R3 release candidate. Does not deploy, revalidate, or update Git.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const folder = resolve(root, "content/r3-batch01/wiki");
const ids = ["W005", "W009", "W010", "W011", "W012", "W013", "W014", "W015", "W016", "W017"];
const mode = process.argv.slice(2);
const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const canonical = (v) => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const equal = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const inlinePattern = /\[\[(article|page):([^\]|\r\n]+)\|([^\]\r\n]+)\]\]/g;
const requiredFields = ["title", "seo_title", "meta_description", "summary", "intro", "key_points", "sections", "context_links", "related_article_ids", "related_slugs", "body_markdown"];
const errors = [];
const docs=[];
let manifest;
try { manifest=JSON.parse(readFileSync(resolve(root,"content/r3-batch01/release-data-manifest.json"),"utf8")); }
catch (error) { throw new Error("SAFETY_FATAL manifest missing: "+error.message); }
if(manifest.records.length!==ids.length || ids.some((id,i)=>manifest.records[i].id!==id))throw new Error("SAFETY_FATAL manifest order/count");
if(manifest.archive_sha256!=="6557efc1315ba214ce0f70be3b7dbdbb3d88cdab7cd6dc7cae15b75725bc8274")throw new Error("SAFETY_FATAL frozen authority mismatch");
if(!["--self-check","--check","--apply"].includes(mode[0])||mode.length!==1)throw new Error("Use exactly one: --self-check | --check | --apply");

function extractTokens(d){
  const sections = d.sections.flatMap(s=>[...(s.paragraphs||[]),...(s.bullets||[])]);
  const text=[d.intro,...(d.key_points||[]),...sections].join("\n");
  return [...text.matchAll(inlinePattern)].map(m=>m[0]);
}
function buildBody(d){
  return [d.intro,...(d.key_points.length?["## نکات کلیدی",...d.key_points.map(x=>"- "+x)]:[]),...d.sections.flatMap(s=>["## "+s.title,...s.paragraphs,...(s.bullets||[]).map(x=>"- "+x)])].join("\n\n")+"\n";
}
function collect(doc){
  const d=doc.content, reasons=[];
  const fail=t=>reasons.push(t);
  if(doc.schema!=="HALLEUS_R3_BATCH01_NATIVE_V1")fail("invalid schema");
  if(!ids.includes(doc.page_id))fail("unknown page id");
  if(d.slug!==doc.expected_url.split("/wiki/")[1] || d.stable_id!==d.slug)fail("bad page identity");
  if(!Number.isInteger(doc.baseline_content_version)||d.content_version!==doc.baseline_content_version)fail("invalid baseline content version");
  for(const key of requiredFields)if(!(key in d))fail("missing "+key);
  if(!Array.isArray(d.sections)||d.sections.length<5)fail("missing sections");
  for(const [i,s] of (d.sections||[]).entries())if(!s.title||!Array.isArray(s.paragraphs)||s.paragraphs.some(p=>typeof p!=="string")||(s.bullets&&!Array.isArray(s.bullets)))fail(`section ${i} invalid`);
  if(!Array.isArray(d.key_points)||!d.key_points.every(x=>typeof x==="string"))fail("invalid key points");
  if(!Array.isArray(d.context_links)||d.context_links.length)fail("unselected context links remain");
  if(!Array.isArray(d.related_article_ids)||d.related_article_ids.length||!Array.isArray(d.related_slugs)||d.related_slugs.length)fail("unselected related links remain");
  if(typeof d.body_markdown!=="string"||d.body_markdown!==buildBody(d))fail("body_markdown not fully rebuilt from visible native fields");
  if(!d.intro||!d.title||!d.seo_title||!d.meta_description)fail("incomplete editorial metadata");
  const tokens=extractTokens(d);
  const selected=doc.selected_exact_tokens;
  if(tokens.length!==selected.length||selected.some(t=>tokens.filter(x=>x===t).length!==1)||tokens.some(t=>!selected.includes(t)))fail("missing/extra selected exact links");
  if(!tokens[0]?.startsWith("[[page:/chart|"))fail("first visible link is not to /chart");
  for(const sec of d.sections||[])for(const value of [...sec.paragraphs,...(sec.bullets||[])])if(/\*\*|`|\[([^\]]+)\]\([^)]+\)/.test(value))fail("unsupported inline markdown");
  if(!/^[a-f0-9]{64}$/.test(doc.approved_file_sha256))fail("missing approval hash");
  return reasons;
}
for (let i=0;i<ids.length;i++){
  const entry=manifest.records[i];let text, doc;
  try{
    text=readFileSync(resolve(folder,ids[i]+".json"),"utf8");doc=JSON.parse(text);
    if(sha256(text)!==entry.article_record_sha256)throw Error("content fingerprint mismatch");
    if(entry.artifact_sha256!==doc.approved_file_sha256)throw Error("approved hash mismatch");
    if(entry.source_version!==doc.baseline_content_version)throw Error("source version mismatch");
    const failures=collect(doc);
    if(failures.length)for(const f of failures)errors.push(ids[i]+": "+f);
    docs.push(doc);
  }catch(e){errors.push(ids[i]+": "+e.message);}
}
// Each independent candidate is examined before reporting the consolidated failure set.
if(errors.length){for(const e of errors)console.error("CANDIDATE_FAILURE | "+e);throw Error("Candidate validation failed: "+errors.length+" issues");}
console.log("PASS | CANDIDATE_ALL_TEN_NATIVE_RECORDS EXACT_ANCHORS SOURCE_HASHES STRUCTURED_RENDER_FIELDS");

function expected(row,d){
  const c=d.content;
  return {title:c.title,seo_title:c.seo_title,meta_description:c.meta_description,summary:c.summary,intro:c.intro,key_points:c.key_points,sections:c.sections,body_markdown:c.body_markdown,context_links:[],related_article_ids:[],related_slugs:[]};
}
function reviewRows(rows){
  const by=new Map(rows.map(r=>[r.stable_id,r])),fail=[],items=[];
  for(const doc of docs){
    const row=by.get(doc.content.stable_id);
    if(!row){fail.push(`${doc.page_id}: no exact stable_id row`);continue;}
    if(row.slug!==doc.content.slug||row.status!=="published"||!row.is_indexable||row.deleted_at||!row.published_at||row.scheduled_for){fail.push(`${doc.page_id}: unsafe publication identity/state`);continue;}
    const next=expected(row,doc);
    const already=Number(row.content_version)===doc.baseline_content_version+1&&Object.entries(next).every(([k,v])=>equal(row[k],v));
    if(!already&&Number(row.content_version)!==doc.baseline_content_version)fail.push(`${doc.page_id}: version/content drift current=${row.content_version} baseline=${doc.baseline_content_version}`);
    items.push({doc,row,next,already});
  }
  return {fail,items};
}
function exerciseFixtures(){
  const rows=docs.map((doc,i)=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,stable_id:doc.content.stable_id,slug:doc.content.slug,status:"published",is_indexable:true,deleted_at:null,published_at:"2026-01-01",scheduled_for:null,content_version:doc.baseline_content_version}));
  const base=reviewRows(rows);
  if(base.fail.length||base.items.length!==10||base.items.some(x=>x.already))throw Error("fixture fresh review failed");
  const applied=rows.map((r,i)=>({...r,...expected(r,docs[i]),content_version:docs[i].baseline_content_version+1}));
  const resume=reviewRows(applied);
  if(resume.fail.length||resume.items.some(x=>!x.already))throw Error("fixture RESUMED_PASS failed");
  const stale=applied.map((r,i)=>i===3?{...r,title:"concurrent edit"}:r);
  if(!reviewRows(stale).fail.some(x=>x.includes("W011")))throw Error("fixture changed output not rejected");
  const partial=rows.slice(0,9);
  if(!reviewRows(partial).fail.some(x=>x.includes("no exact stable_id row")))throw Error("fixture missing record not rejected");
  const replaced=rows.map((r,i)=>i===2?{...r,content_version:r.content_version+2}:r);
  if(!reviewRows(replaced).fail.some(x=>x.includes("version/content drift")))throw Error("fixture version drift not rejected");
  if(!reviewRows([...rows,{stable_id:"unrelated",slug:"other"}]).items.length)throw Error("fixture extra record failed");
  console.log("PASS | FIXTURES fresh, resume, stale, partial, missing, extra, drift");
}
exerciseFixtures();
if(mode[0]==="--self-check"){console.log("PASS | SELF_CHECK NO_DATABASE NO_REPO_MUTATION");process.exit(0);}
const conn=process.env.DATABASE_URL;
if(!conn)throw new Error("EXTERNAL_BLOCK: DATABASE_URL unavailable in this environment; do not guess credentials or topology");
if(mode[0]==="--apply"&&(process.env.HALLEUS_R3_BATCH01_RELEASE_APPROVED!=="YES"||!process.env.HALLEUS_R3_RELEASE_APPROVAL_REFERENCE))throw new Error("SAFETY_FATAL: explicit production release approval flag and reference required");
const postgres=(await import("postgres")).default;
const sql=postgres(conn,{max:1,prepare:false,connect_timeout:5});
const slugs=docs.map(d=>d.content.slug);
async function validateTargets(query,docsToCheck){
  const targets=[...new Set(docsToCheck.flatMap(({doc})=>[...doc.content.body_markdown.matchAll(/\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|[^\]]+)?\]\]/g)].map(m=>m[1])))];
  if(!targets.length)return;
  const found=await query`select stable_id from public.wiki_articles where stable_id=any(${targets}::text[]) and status='published' and is_indexable=true and published_at<=now() and scheduled_for is null and deleted_at is null`;
  const present=new Set(found.map(x=>x.stable_id)),absent=targets.filter(t=>!present.has(t));
  if(absent.length)throw new Error("SAFETY_FATAL: target Wiki articles not currently published: "+absent.join(", "));
}
function snapshot(r){return {stableId:r.stable_id,slug:r.slug,title:r.title,shortTitle:r.short_title,seoTitle:r.seo_title||undefined,metaDescription:r.meta_description||undefined,categoryId:r.category_id,tags:r.tags||[],summary:r.summary,intro:r.intro,readingMinutes:Number(r.reading_minutes),publicationPriority:Number(r.publication_priority||0),contentCluster:r.content_cluster||r.category_id,articleRole:r.article_role,relatedArticleIds:r.related_article_ids||[],indexable:!!r.is_indexable,bodyMarkdown:r.body_markdown||"",keyPoints:r.key_points||[],sections:r.sections||[],contextLinks:r.context_links||[],sources:r.sources||[],callToAction:r.call_to_action,contentVersion:Number(r.content_version)}}
async function applyLinks(tx,row,body){
  const ids=[...new Set([...body.matchAll(/\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|[^\]]+)?\]\]/g)].map(m=>m[1]))];
  await tx`delete from public.wiki_internal_links where source_article_id=${row.id}::uuid`;
  for(const target of ids){
    const token=`[[article:${target}]]`;
    await tx`insert into public.wiki_internal_links(source_article_id,target_stable_id,link_kind,source_token,activation_status,activated_at,last_verified_at) values(${row.id}::uuid,${target},'inline',${token},'active',now(),now())`;
  }
}
try{
  if(mode[0]==="--check"){
    const rows=await sql`select * from public.wiki_articles where stable_id=any(${slugs}::text[])`;
    const check=reviewRows(rows);
    for(const item of check.items)console.log((item.already?"RESUMED_PASS":"READY")+" | "+item.doc.page_id+" "+item.doc.content.slug);
    for(const reason of check.fail)console.error("SAFETY_FATAL | "+reason);
    if(check.fail.length)throw new Error("READ_ONLY_PREFLIGHT failed: "+check.fail.length);
    await validateTargets(sql,check.items);
    console.log("PASS | READ_ONLY_DATABASE_PREFLIGHT no writes");
  }else{
    const saved=await sql.begin(async tx=>{
      const rows=await tx`select * from public.wiki_articles where stable_id=any(${slugs}::text[]) for update`;
      const plan=reviewRows(rows);
      if(plan.fail.length)throw new Error("SAFETY_FATAL row conflicts: "+plan.fail.join("; "));
      await validateTargets(tx,plan.items);
      const results=[];
      for(const {doc,row,next,already} of plan.items){
        if(already){results.push({page:doc.page_id,status:"RESUMED_PASS"});continue;}
        const rev=await tx`select coalesce(max(revision_number),0)::int as n from public.wiki_article_revisions where article_id=${row.id}::uuid`;
        const n=Number(rev[0].n)+1;
        await tx`insert into public.wiki_article_revisions(article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values(${row.id}::uuid,${n},${tx.json(snapshot(row))}::jsonb,${"R3 batch01 pre-change snapshot"},null,'published',now())`;
        const updated=await tx`update public.wiki_articles set title=${next.title},seo_title=${next.seo_title},meta_description=${next.meta_description},summary=${next.summary},intro=${next.intro},key_points=${tx.json(next.key_points)}::jsonb,sections=${tx.json(next.sections)}::jsonb,body_markdown=${next.body_markdown},context_links=${tx.json(next.context_links)}::jsonb,related_article_ids=${tx.json(next.related_article_ids)}::jsonb,related_slugs=${tx.json(next.related_slugs)}::jsonb,content_version=${doc.baseline_content_version+1},updated_at=now() where id=${row.id}::uuid and content_version=${doc.baseline_content_version} and status='published' returning *`;
        if(updated.length!==1)throw Error("SAFETY_FATAL concurrent content change "+row.slug);
        await tx`insert into public.wiki_article_revisions(article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values(${row.id}::uuid,${n+1},${tx.json(snapshot(updated[0]))}::jsonb,${"R3 batch01 approved full replacement"},null,'published',now())`;
        await applyLinks(tx,updated[0],next.body_markdown);
        results.push({page:doc.page_id,status:"UPDATED"});
      }
      return results;
    });
    for(const x of saved)console.log(x.status+" | "+x.page);
    console.log("PASS | TRANSACTION_COMMITTED TEN_PAGES_OR_RESUMED; LIVE_VERIFICATION_STILL_REQUIRED");
  }
}finally{await sql.end({timeout:2});}
