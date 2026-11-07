// Pure read-only package verification; called on the exact generated objects in this handoff.
export function verifyPackage(data){
 const failures=[];const check=(ok,label)=>{if(!ok)failures.push(label);};
 const {rows,manifest,registry,clusters,suggestions,inputs}=data;
 const ids=new Set(),words=new Set(),occ=new Set(),variants=new Set(),byid=new Map(),bycluster=new Map();
 const chars="۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";
 const norm=k=>k.normalize("NFKC").replace(/ي/g,"ی").replace(/ك/g,"ک").replace(/[۰-۹٠-٩]/g,c=>String(chars.indexOf(c)%10)).replace(/[\u064b-\u065f\u0670\u0640\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,"").replace(/\u200c/g," ").replace(/\s+/g," ").trim().toLowerCase();
 const owners=new Set([...clusters.map(x=>x.owner_id).filter(Boolean),"C-ART","B-ART-COMPARISON","F-PLACE-MAP"]);
 for(const r of rows){
  check(!ids.has(r.id),"duplicate ID "+r.id);ids.add(r.id);byid.set(r.id,r);
  check(!words.has(r.keyword),"duplicate normalized keyword "+r.id);words.add(r.keyword);
  check(r.variants.every(v=>norm(v)===r.keyword),"variant normalization "+r.id);
  for(const v of r.variants)variants.add(v);
  bycluster.set(r.cluster_id,(bycluster.get(r.cluster_id)||0)+1);
  check(/^(X-|REVIEW)/.test(r.cluster_id)?r.owner_id===null:owners.has(r.owner_id),"owner "+r.id);
  for(const ref of r.source_refs){let key=ref[0]+":"+ref[1];check(!occ.has(key),"duplicate source occurrence "+key);occ.add(key);check(ref.length===4&&typeof ref[3]==="string","source shape "+key);}
 }
 check(rows.length===manifest.counts.normalized_unique,"normalized total");
 check(variants.size===manifest.counts.exact_unique,"original exact variants total");
 check(occ.size===manifest.counts.raw_rows,"raw rows total");
 for(const input of inputs)for(let line=2;line<=input.rows+1;line++)check(occ.has(input.id+":"+line),"missing source "+input.id+":"+line);
 for(const c of clusters){check(c.count===bycluster.get(c.id),"cluster count "+c.id);check(!!c.label,"cluster label "+c.id);}
 const primary=new Set(),urls=new Set();
 for(const p of registry.pages){
  check(!primary.has(norm(p.primary)),"duplicate primary "+p.page_id);primary.add(norm(p.primary));
  check(!urls.has(p.url),"duplicate page URL");urls.add(p.url);
  check(p.observed_keyword_ids.every(id=>byid.get(id)?.owner_id===p.page_id),"page ownership "+p.page_id);
  check(p.observed_keywords.includes(p.primary),"primary is not observed "+p.page_id);
  for(const k of p.secondary)check(rows.some(r=>r.keyword===norm(k)&&r.owner_id===p.page_id),"secondary wrong owner "+p.page_id+":"+k);
  check(p.runtime_applied===false,"false runtime state");
 }
 const sn=new Set();
 for(const s of suggestions){check(owners.has(s.owner_id),"suggested owner "+s.id);check(!sn.has(norm(s.keyword)),"duplicate suggestion "+s.id);sn.add(norm(s.keyword));check(!words.has(norm(s.keyword)),"suggestion is observed "+s.id);check(s.search_volume===null&&s.keyword_difficulty===null,"invented metrics "+s.id);}
 check(registry.pages.find(p=>p.page_id==="P01").observed_keyword_ids.length===6,"P01 count");
 check(registry.pages.find(p=>p.page_id==="P02").observed_keyword_ids.length===11,"P02 count");
 check(registry.pages.find(p=>p.page_id==="P03").observed_keyword_ids.length===1,"P03 count");
 return {passed:failures.length===0,failures,totals:{rows:rows.length,occurrences:occ.size,variants:variants.size,clusters:clusters.length,pages:registry.pages.length,suggestions:suggestions.length}};
}
