import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(readFileSync(resolve(root,'content/r3-batch06/release-data-manifest.json'),'utf8'));
if(manifest.schema!=='HALLEUS_R3_NATIVE_60_APPROVALS_56_UNIQUE_V1'||manifest.records.length!==56)
  throw Error('SAFETY_FATAL: unexpected R3 batch06 manifest');
const docs=manifest.records.map(e=>{
  const d=JSON.parse(readFileSync(resolve(root,'content/r3-batch06/wiki/'+e.page_id+'.json'),'utf8'));
  if(d.page_id!==e.page_id||d.expected_url!=='https://halleus.ir/wiki/'+d.content.slug)throw Error('SAFETY_FATAL: live URL contract');
  return d;
});
const decode=x=>x.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|zwnj|rlm);/gi,(_,v)=>{
  const w=v.toLowerCase();
  if(w[0]==='#'){const n=w[1]==='x'?parseInt(w.slice(2),16):parseInt(w.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
  return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',zwnj:'\u200c',rlm:'\u200f'}[w]||' ';
});
const textOnly=x=>decode(x.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
const expectedText=x=>x.replace(/\[\[(?:page|article):[^|\]]+\|([^\]]+)\]\]/g,'$1').replace(/\s+/g,' ').trim();
function anchors(html){
  const out=[];
  for(const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
    const href=m[1].match(/\bhref="([^"]+)"/i);
    if(href)out.push({href:decode(href[1]).replace(/&amp;/g,'&'),label:textOnly(m[2])});
  }
  return out;
}
const expectedLinks=x=>[...x.matchAll(/\[\[(article|page):([^|\]]+)\|([^\]]+)\]\]/g)].map(m=>({
  href:m[1]==='article'?'/wiki/'+m[2]:m[2],label:m[3]
}));
function verify(doc,html){
  const d=doc.content,t=textOnly(html);
  if(!/<title[^>]*>[\s\S]*?<\/title>/i.test(html))return 'HTML title missing';
  const title=textOnly(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'');
  if(!title.includes(d.seo_title))return 'SEO title mismatch';
  if(!t.includes(d.title))return 'article H1/title missing';
  const intro=expectedText(d.intro).slice(0,70);
  if(!t.includes(intro))return 'approved intro absent (possibly stale ISR)';
  const h2=d.sections[0]?.title;
  if(!h2||!t.includes(h2))return 'first approved H2 missing';
  const pageLinks=anchors(html);
  const links=expectedLinks(d.body_markdown);
  for(const l of links)if(!pageLinks.some(a=>a.href===l.href&&a.label===l.label))return 'approved inline link absent: '+l.href;
  return null;
}
async function get(url){
  const controller=new AbortController(),time=setTimeout(()=>controller.abort(),15000);
  try{const r=await fetch(url,{signal:controller.signal,cache:'no-store',headers:{'Cache-Control':'no-cache'}});
      if(r.status!==200)throw Error('HTTP '+r.status);return await r.text();}
  finally{clearTimeout(time);}
}
async function scan(base){
  const failed=[];
  for(let k=0;k<docs.length;k+=4){
    const group=docs.slice(k,k+4);
    const results=await Promise.allSettled(group.map(d=>get(base+'/wiki/'+d.content.slug)));
    results.forEach((r,i)=>{
      const d=group[i];
      const reason=r.status==='fulfilled'?verify(d,r.value):String(r.reason);
      if(reason)failed.push(d.page_id+': '+reason);
    });
  }
  return failed;
}
for(const base of ['http://127.0.0.1:3000','https://halleus.ir']){
  let failed=[];
  for(let attempt=1;attempt<=20;attempt++){
    failed=await scan(base);
    if(!failed.length)break;
    console.log('LIVE_PARITY_PENDING base='+base+' attempt='+attempt+' remaining='+failed.length+' sample='+failed.slice(0,3).join(' | '));
    if(attempt<20)await new Promise(r=>setTimeout(r,20000));
  }
  if(failed.length)throw Error('LIVE_PARITY_FAILURE base='+base+' pages='+failed.length+' details='+failed.join('; '));
  console.log('LIVE_PARITY_PASS base='+base+' pages='+docs.length);
}
console.log('HALLEUS_R3_BATCH06_LIVE_PARITY_OK urls=56');
