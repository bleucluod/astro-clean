(async function r3Apply() {
  const fs=await import("node:fs"), path=await import("node:path"), url=await import("node:url");
  const folder=path.resolve(path.dirname(url.fileURLToPath(import.meta.url)),"../content/r3-approved-20261022/wiki");
  const known={"birth-chart-basics":6,"how-to-read-birth-chart":7,"ai-birth-chart-interpretation":6,"best-free-persian-birth-chart-site":5,"what-is-horoscope":6,"what-is-astrology":7,"is-astrology-real-science":6};
  const mode=process.argv.slice(2);
  if(mode.length!==1||!["--self-check","--check","--apply"].includes(mode[0]))throw Error("Use exactly one of --self-check, --check, --apply");
  const canon=v=>Array.isArray(v)?v.map(canon):v&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v;
  const equal=(a,b)=>JSON.stringify(canon(a))===JSON.stringify(canon(b));
  const docs=Object.entries(known).map(([slug,count])=>{
    const data=JSON.parse(fs.readFileSync(path.join(folder,slug+".json"),"utf8"));
    const identity=data.target?.wiki_slug||data.slug||data.article?.slug;
    const version=data.source_authority?.content_version||data.base?.content_version||data.article?.baseline?.content_version;
    const change=data.changes_only||data.changes||data.article?.proposed_fields;
    if(identity!==slug||!Number.isInteger(version)||!change||typeof change.intro!=="string"||!Array.isArray(change.sections)||change.sections.length<5)throw Error("SOURCE_FATAL invalid patch: "+slug);
    if(Object.keys(change).some(k=>!["title","summary","intro","key_points","sections","body_markdown","meta_description"].includes(k)))throw Error("SOURCE_FATAL unapproved field: "+slug);
    if(change.sections.some(s=>!s.title||!Array.isArray(s.paragraphs)||!s.paragraphs.every(v=>typeof v==="string")||(s.bullets&&!Array.isArray(s.bullets))))throw Error("SOURCE_FATAL invalid sections: "+slug);
    const visible=[change.intro,...(change.key_points||[]),...change.sections.flatMap(s=>[...s.paragraphs,...(s.bullets||[])])].join("\n");
    const links=[...visible.matchAll(/\[\[(?:page|article):[^\]]+\]\]/g)].map(x=>x[0]);
    if(links.length!==count||!links[0].startsWith("[[page:/chart|"))throw Error("SOURCE_FATAL invalid R3 link contract: "+slug);
    return {slug,version,change};
  });
  console.log("PASS | APPROVED_WIKI_PATCHES="+docs.length+" FIRST_LINKS=/chart");
  console.log("SOURCE_BLOCKED | astrology-learning-roadmap: approved original missing, no substitution");
  if(mode[0]==="--self-check")return;
  if(!process.env.DATABASE_URL)throw Error("EXTERNAL_BLOCK missing DATABASE_URL");
  const postgres=(await import("postgres")).default;
  const sql=postgres(process.env.DATABASE_URL,{max:1,prepare:false,connect_timeout:5});
  const slugs=docs.map(x=>x.slug);
  const check=rows=>{
    const by=new Map(rows.map(r=>[r.slug,r])),fail=[],items=[];
    for(const item of docs){
      const row=by.get(item.slug);if(!row){fail.push(item.slug+": missing row");continue}
      if(row.stable_id!==item.slug||row.status!=="published"||!row.is_indexable||row.deleted_at||!row.published_at||row.scheduled_for)fail.push(item.slug+": unsafe publication state");
      const already=row.content_version===item.version+1&&Object.entries(item.change).every(([k,v])=>equal(row[k],v));
      if(!already&&row.content_version!==item.version)fail.push(item.slug+": version drift current="+row.content_version+" required="+item.version);
      items.push({item,row,already});
    }
    return {fail,items};
  };
  const snapshot=r=>({stableId:r.stable_id,slug:r.slug,title:r.title,shortTitle:r.short_title,seoTitle:r.seo_title||undefined,metaDescription:r.meta_description||undefined,categoryId:r.category_id,tags:r.tags||[],summary:r.summary,intro:r.intro,readingMinutes:Number(r.reading_minutes),publicationPriority:Number(r.publication_priority||0),contentCluster:r.content_cluster||r.category_id,articleRole:r.article_role,relatedArticleIds:r.related_article_ids||[],indexable:!!r.is_indexable,bodyMarkdown:r.body_markdown||"",keyPoints:r.key_points||[],sections:r.sections||[],contextLinks:r.context_links||[],sources:r.sources||[],callToAction:r.call_to_action,contentVersion:Number(r.content_version)});
  const buildMd=n=>[n.intro,...(n.keyPoints.length?["## نکات کلیدی",...n.keyPoints.map(x=>"- "+x)]:[]),...n.sections.flatMap(s=>["## "+s.title,...s.paragraphs,...(s.bullets||[]).map(x=>"- "+x)])].join("\n\n")+"\n";
  const extractInline=body=>[...new Set([...body.matchAll(/\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|[^\]]+)?\]\]/g)].map(m=>m[1]))];
  async function validateTargets(db,body,slug){
    const ids=extractInline(body);if(!ids.length)return ids;
    const rows=await db`select stable_id from public.wiki_articles where stable_id=any(${ids}::text[]) and status='published' and is_indexable=true and published_at<=now() and scheduled_for is null and deleted_at is null`;
    const found=new Set(rows.map(x=>String(x.stable_id))),missing=ids.filter(id=>!found.has(id));
    if(missing.length)throw Error("SAFETY_FATAL unpublished R3 links in "+slug+": "+missing.join(","));
    return ids;
  }
  async function replaceArticleLinks(tx,row,body){
    const inline=await validateTargets(tx,body,row.slug);
    const related=[...new Set(Array.isArray(row.related_article_ids)?row.related_article_ids:[])].filter(Boolean);
    const targets=[...new Set([...inline,...related])];
    const pub=targets.length?await tx`select stable_id from public.wiki_articles where stable_id=any(${targets}::text[]) and status='published' and is_indexable=true and published_at<=now() and scheduled_for is null and deleted_at is null`:[];
    const ready=new Set(pub.map(x=>String(x.stable_id)));
    await tx`delete from public.wiki_internal_links where source_article_id=${row.id}::uuid`;
    for(const target of inline){
      const state=ready.has(target)?"active":"pending",token="[[article:"+target+"]]";
      await tx`insert into public.wiki_internal_links(source_article_id,target_stable_id,link_kind,source_token,activation_status,activated_at,last_verified_at) values(${row.id}::uuid,${target},'inline',${token},${state},now(),now())`;
    }
    for(const target of related){
      const state=ready.has(target)?"active":"pending";
      await tx`insert into public.wiki_internal_links(source_article_id,target_stable_id,link_kind,source_token,activation_status,activated_at,last_verified_at) values(${row.id}::uuid,${target},'related',${target},${state},now(),now()) on conflict do nothing`;
    }
    console.log("LINK_GRAPH_SYNC | "+row.slug+" inline="+inline.length+" related="+related.length);
  }
  try{
    if(mode[0]==="--check"){
      const state=check(await sql`select * from public.wiki_articles where stable_id = any(${slugs}::text[])`);
      for(const d of state.items)console.log((d.already?"ALREADY_APPLIED":"READY")+" | "+d.item.slug);
      for(const s of state.fail)console.error("SAFETY_FATAL | "+s);
      if(state.fail.length)throw Error("Read-only source preflight failed; no data changed");
      for(const {item,row,already} of state.items){if(!already){const c=item.change,body=c.body_markdown??buildMd({intro:c.intro,keyPoints:c.key_points??row.key_points,sections:c.sections});await validateTargets(sql,body,item.slug);}}
      console.log("PASS | READ_ONLY_PREFLIGHT");return;
    }
    if(process.env.HALLEUS_R3_APPROVED_DEPLOY!=="YES")throw Error("SAFETY_FATAL requires HALLEUS_R3_APPROVED_DEPLOY=YES");
    const results=await sql.begin(async tx=>{
      const state=check(await tx`select * from public.wiki_articles where stable_id = any(${slugs}::text[]) for update`);
      if(state.fail.length)throw Error("SAFETY_FATAL no writes: "+state.fail.join("; "));
      const saved=[];
      for(const {item,row,already} of state.items){
        if(already){saved.push({slug:item.slug,result:"RESUMED_PASS"});continue}
        const c=item.change,n={title:c.title??row.title,summary:c.summary??row.summary,intro:c.intro,metaDescription:c.meta_description??row.meta_description,keyPoints:c.key_points??row.key_points,sections:c.sections};
        n.bodyMarkdown=c.body_markdown??buildMd(n);
        const revision=await tx`select coalesce(max(revision_number),0)::int as n from public.wiki_article_revisions where article_id=${row.id}::uuid`;
        const first=Number(revision[0].n)+1;
        await tx`insert into public.wiki_article_revisions (article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values (${row.id}::uuid,${first},${tx.json(snapshot(row))}::jsonb,${"R3 pre-change snapshot 20261022"},null,'published',now())`;
        const updated=await tx`update public.wiki_articles set title=${n.title},summary=${n.summary},intro=${n.intro},meta_description=${n.metaDescription},key_points=${tx.json(n.keyPoints)}::jsonb,sections=${tx.json(n.sections)}::jsonb,body_markdown=${n.bodyMarkdown},content_version=${item.version+1},updated_at=now() where id=${row.id}::uuid and content_version=${item.version} and status='published' returning *`;
        if(updated.length!==1)throw Error("SAFETY_FATAL concurrent version mutation: "+item.slug);
        await tx`insert into public.wiki_article_revisions (article_id,revision_number,snapshot,change_note,created_by,revision_status,published_at) values (${row.id}::uuid,${first+1},${tx.json(snapshot(updated[0]))}::jsonb,${"R3 user-approved editorial 20261022"},null,'published',now())`;
        await replaceArticleLinks(tx,row,n.bodyMarkdown);
        saved.push({slug:item.slug,result:"UPDATED"});
      }
      return saved;
    });
    for(const r of results)console.log(r.result+" | "+r.slug);
    console.log("PASS | APPROVED_WIKI_TRANSACTION_COMMITTED="+results.length);
    console.log("INFO | Verify public content after normal cache revalidation");
  }finally{await sql.end()}
})().catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exitCode=1;});
