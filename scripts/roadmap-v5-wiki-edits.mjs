// Pure, exact-paragraph planner. Historical native records are evidence, not authority to overwrite live edits.
export const normalize = text => String(text ?? "").normalize("NFC").trim().replace(/\s+/gu," ");
const count = (s,t) => String(s??"").split(t).length-1;
const token = row => "[[page:"+row.destination+"|"+row.anchor+"]]";
const format = row => row.sentence.replace("**"+row.anchor+"**",token(row));
const clone = x => JSON.parse(JSON.stringify(x));
export function nativeContent(doc){return doc.content??doc.article??doc.changes_only??doc;}
function sectionParagraphs(sections,heading) {
  const matches=[];
  for(const [si,s] of sections.entries()){
    const ordered=Array.isArray(s.orderedBlocks)?s.orderedBlocks:null;
    if(ordered){
      const spans=ordered.flatMap((b,i)=>b.kind==="heading"&&normalize(b.text)===normalize(heading)?[[i+1,ordered.findIndex((v,j)=>j>i&&v.kind==="heading")]]:[]);
      if(normalize(s.title)===normalize(heading))spans.unshift([0,ordered.findIndex(b=>b.kind==="heading")]);
      for(const [start,end] of spans)matches.push(ordered.slice(start,end<0?undefined:end).filter(b=>b.kind==="paragraph"&&b.text&&!/^!\[/.test(b.text)).map(b=>({si,text:b.text})));
    }else if(normalize(s.title)===normalize(heading)){
      matches.push((s.paragraphs??[]).filter(p=>p&&!/^!\[/.test(p)).map(text=>({si,text})));
    }
  }
  return matches;
}
function replaceOnce(s,b,a,label){
  if(!b||count(s,b)!==1)throw Error("exact-match failure: "+label);
  return s.replace(b,()=>a);
}
function replaceParagraph(c,heading,before,after){
  const groups=sectionParagraphs(c.sections??[],heading);
  if(groups.length!==1||groups[0].filter(p=>p.text===before).length!==1)throw Error("section drift: "+heading);
  const s=c.sections[groups[0].find(p=>p.text===before).si];
  if(s.paragraphs.filter(p=>p===before).length!==1)throw Error("paragraph projection drift: "+heading);
  s.paragraphs=s.paragraphs.map(p=>p===before?after:p);
  if(Array.isArray(s.orderedBlocks)){
    if(s.orderedBlocks.filter(b=>b.kind==="paragraph"&&b.text===before).length!==1)throw Error("ordered block drift: "+heading);
    s.orderedBlocks=s.orderedBlocks.map(b=>b.kind==="paragraph"&&b.text===before?{...b,text:after}:b);
  }
  c.body_markdown=replaceOnce(c.body_markdown,before,after,heading);
}
export function applyEdit(c,edit){
  if(edit.scope==="section")replaceParagraph(c,edit.heading,edit.before,edit.after);
  else if(edit.scope==="intro"){
    c.intro=replaceOnce(c.intro,edit.before,edit.after,"intro");
    c.body_markdown=replaceOnce(c.body_markdown,edit.before,edit.after,"intro/body");
  }else if(edit.scope==="key_points"){
    if(!Array.isArray(c.key_points)||c.key_points.filter(p=>p===edit.before).length!==1)throw Error("key point drift");
    c.key_points=c.key_points.map(p=>p===edit.before?edit.after:p);
    if(count(c.body_markdown,edit.before)===1)c.body_markdown=c.body_markdown.replace(edit.before,()=>edit.after);
    else if(count(c.body_markdown,edit.before)>1)throw Error("key point body ambiguity");
  }else throw Error("unknown edit scope");
}
function pageCount(body,d){
  return count(body,"[[page:"+d+"|")+count(body,"]("+d+")")+count(body,"](https://halleus.ir"+d+")")+count(body,'href="'+d+'"')+count(body,'href="https://halleus.ir'+d+'"');
}
const legacy={
  "free-vedic-birth-chart":[
    {scope:"intro",before:"برای مقایسه با نتیجهٔ غربی می‌توانی ابتدا [[page:/chart|چارت تولد رایگان]] هالیوس را با همان اطلاعات تولد ببینی؛ این خروجی تروپیکال است، نه چارت ودیک یا جیوتیش.",after:"هالیوس اکنون فرم مستقل چارت ودیک را با مبنای لاهیری و نقشهٔ راشی D1 ارائه می‌دهد. برای مقایسه با نتیجهٔ غربی می‌توانی [[page:/chart|چارت تولد رایگان]] را با همان اطلاعات تولد بسازی؛ آن خروجی تروپیکال است."},
    {scope:"key_points",before:"هالیوس فعلاً چارت تروپیکال می‌سازد و آن را نباید به‌عنوان چارت ودیک معرفی کرد.",after:"هالیوس دو فرم مستقل برای چارت تروپیکال و چارت ودیک راشی D1 با مبنای لاهیری دارد."},
    {scope:"section",heading:"تفاوت چارت هالیوس و خروجی جیوتیش در عمل چیست؟",before:"چارت فعلی هالیوس از زودیاک تروپیکال استفاده می‌کند. بنابراین برچسب‌های خورشید و ماه و رایزینگ را باید در همان چارچوب بخوانی. یک محاسبه‌گر واقعی ودیک معمولاً همان داده‌های تولد را با مرجع سایدریال و تنظیمات آیانامشا به چارت تبدیل می‌کند و می‌تواند لایه‌هایی مانند ناکشاترا، دشا یا ناوامشا داشته باشد. این دو خروجی را نباید زیر یک عنوان جمع کرد.",after:"فرم غربی هالیوس از زودیاک تروپیکال استفاده می‌کند و فرم ودیک آن همان داده‌های تولد را با مرجع سایدریال و مبنای لاهیری به نقشهٔ راشی D1 تبدیل می‌کند. هنگام مقایسه، برچسب و درجهٔ خورشید، ماه و طالع را در چارچوب هر خروجی بخوان. ابزار ودیک هالیوس فعلاً محاسبهٔ ناوامشا یا دشا را ارائه نمی‌دهد."},
    {scope:"section",heading:"پرسش‌های متداول درباره چارت ودیک رایگان",before:"آیا هالیوس خروجی ودیک تولید می‌کند؟ خیر، چارت فعلی هالیوس تروپیکال است؛ خروجی آن را نباید به‌عنوان چارت ودیک معرفی کرد.",after:"آیا هالیوس خروجی ودیک تولید می‌کند؟ بله. فرم مستقل ودیک هالیوس نقشهٔ راشی D1 را با مبنای لاهیری و یک خوانش کوتاه فارسی ارائه می‌دهد. فرم غربی همچنان تروپیکال است؛ ناوامشا و دشا در ابزار فعلی ودیک محاسبه نمی‌شوند."}
  ],
  "what-is-vedic-astrology":[
    {scope:"intro",before:"اگر می‌خواهی ابتدا جایگاه‌های تولدت را بشناسی، [[page:/chart|آسترولوژی چارت تولد رایگان]] در هالیوس راهی برای دیدن چارت تروپیکال است. این خروجی ودیک یا سایدریال نیست و قرار نیست با عنوان چارت هندی معرفی شود.",after:"هالیوس اکنون ابزارهای جداگانهٔ چارت غربی و ودیک دارد. اگر می‌خواهی جایگاه‌های تولدت را در نظام تروپیکال ببینی، [[page:/chart|آسترولوژی چارت تولد رایگان]] همان مسیر غربی است. فرم ودیک، نقشهٔ راشی D1 را با مبنای لاهیری ارائه می‌دهد."},
    {scope:"key_points",before:"چارت فعلی هالیوس تروپیکال است و چارت ودیک، ناوامشا یا دشا تولید نمی‌کند.",after:"هالیوس چارت تروپیکال و چارت ودیک راشی D1 با مبنای لاهیری را جداگانه می‌سازد؛ ناوامشا و دشا فعلاً در ابزار ودیک ارائه نمی‌شوند."},
    {scope:"section",heading:"هالیوس از چه نظامی برای چارت استفاده می‌کند؟",before:"اگر هدفت بررسی چارت شخصی تروپیکال باشد، محصول فعلی برای آن طراحی شده است. اگر هدفت دریافت یک محاسبهٔ ودیک باشد، باید ابزار جداگانه‌ای انتخاب کنی که مبنای سایدریال، آیانامشا و قواعد جیوتیش را شفاف اعلام کند. این مرزبندی از سردرگمی دربارهٔ برج تولد، لاگنا و نتیجهٔ تفسیر جلوگیری می‌کند.",after:"برای مقایسهٔ دو روش، تاریخ، ساعت و شهر تولدت را در هر دو فرم یکسان وارد کن. در ابزار ودیک فعلی هالیوس می‌توانی نقشهٔ راشی D1، جدول جایگاه‌ها و خوانش فارسی را ببینی؛ محاسبهٔ ناوامشا و دشا در این ابزار ارائه نمی‌شود."},
    {scope:"section",heading:"آیا هالیوس چارت ودیک یا دشا می‌سازد؟",before:"خیر. خروجی اصلی چارت در هالیوس تروپیکال است. مطالب آموزشی دربارهٔ جیوتیش به معنای فعال‌بودن محاسبهٔ ودیک، سایدریال، ناوامشا یا دشا در محصول نیستند.",after:"هالیوس چارت ودیک راشی D1 را با مبنای لاهیری می‌سازد و فرم تروپیکال غربی را نیز جداگانه دارد. محاسبهٔ دشا و ناوامشا در ابزار ودیک فعلی ارائه نمی‌شود."}
  ]
};
const vedicOld="چارت اصلی فعلی هالیوس بر پایهٔ زودیاک تروپیکال و رویکرد غربی ساخته می‌شود. بنابراین نه یک چارت جیوتیش ارائه می‌دهد، نه ناوامشا و دشا را محاسبه می‌کند و نه خروجی آن را باید با تنظیمات سایدریال مقایسهٔ مستقیمِ بی‌توضیح کرد. آشنایی با جیوتیش از طریق مقاله‌های آموزشی هالیوس با تولید چارت ودیک در محصول یکی نیست.";
export function prepareArticle(slug,doc,rows,combined){
  const input=nativeContent(doc),c=clone(input),edits=[],checks=[];
  function add(edit){applyEdit(c,edit);edits.push(edit);}
  if(!Array.isArray(c.sections)||typeof c.body_markdown!=="string")throw Error("missing native content: "+slug);
  for(const edit of legacy[slug]??[])add(edit);
  const selected=rows.filter(r=>r.source==="/wiki/"+slug);
  for(const row of selected){
    if(checks.some(x=>x.destination===row.destination))continue;
    const group=row.source===combined.source?selected.filter(x=>x.heading===combined.heading):[row];
    const matches=sectionParagraphs(c.sections,row.heading);
    if(matches.length!==1||!matches[0].length)throw Error("missing or ambiguous heading: "+row.heading);
    const p=row.placement.includes("بند اول")||slug==="what-is-vedic-astrology"?matches[0][0]:matches[0].at(-1);
    const already=group.every(r=>pageCount(c.body_markdown,r.destination)===1&&count(p.text,token(r))===1);
    if(already){for(const r of group)checks.push({destination:r.destination,anchor:r.anchor,heading:r.heading,status:"already-present"});continue;}
    if(group.some(r=>pageCount(c.body_markdown,r.destination)!==0))throw Error("existing destination requires editorial review: "+group.map(r=>r.destination).join(","));
    let next;
    if(slug==="what-is-vedic-astrology"){
      if(p.text!==vedicOld)throw Error("old Vedic paragraph drift");
      next=format(row);
    }else if(group.length>1)next=p.text+" "+combined.sentence;
    else if(count(p.text,row.anchor)===1&&!p.text.includes("[[")&&!p.text.includes("]("))next=p.text.replace(row.anchor,()=>token(row));
    else next=p.text+" "+format(row);
    add({scope:"section",heading:row.heading,before:p.text,after:next,links:group.map(r=>({destination:r.destination,anchor:r.anchor}))});
    for(const r of group){
      if(pageCount(c.body_markdown,r.destination)!==1||count(next,token(r))!==1)throw Error("link parity: "+r.destination);
      checks.push({destination:r.destination,anchor:r.anchor,heading:r.heading,status:"prepared"});
    }
  }
  if(checks.length!==selected.length)throw Error("coverage incomplete");
  return {slug,edits,checks};
}
export function validateArticlePatch(input,patch){
  const c=clone(input);
  for(const e of patch.edits)applyEdit(c,e);
  for(const r of patch.checks){
    if(pageCount(c.body_markdown,r.destination)!==1)throw Error("post-edit destination parity: "+patch.slug+" "+r.destination);
    const groups=sectionParagraphs(c.sections,r.heading);
    if(groups.length!==1||groups[0].filter(p=>count(p.text,token(r))===1).length!==1)throw Error("post-edit paragraph parity: "+patch.slug+" "+r.destination);
  }
  return c;
}

export function verifyAppliedArticle(input,patch){
  const c=clone(input);
  for(const r of patch.checks){
    const groups=sectionParagraphs(c.sections,r.heading);
    if(pageCount(c.body_markdown,r.destination)!==1||groups.length!==1||groups[0].filter(p=>count(p.text,token(r))===1).length!==1)throw Error("applied link parity: "+patch.slug+" "+r.destination);
  }
  // Reverse the exact edits on a copy; confirms all post-images, not just links.
  for(const e of [...patch.edits].reverse())applyEdit(c,{...e,before:e.after,after:e.before});
  return true;
}
