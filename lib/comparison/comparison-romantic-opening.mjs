/** Pair-specific opening lenses. Use only already assigned, supported contacts.
 * Each lens describes a possible interaction, not observed behaviour or a prediction.
 */
const topics = {
  sun:"انتخاب و هویت شخصی", moon:"نیاز به آرامش و حمایت", mercury:"پرسش و بیان منظور",
  venus:"سلیقه و ابراز علاقه", mars:"پیش‌قدم شدن و واکنش عملی", jupiter:"امید و گسترش تجربه",
  saturn:"ثبات و مسئولیت", uranus:"آزادی و تغییر", neptune:"خیال و معنای ضمنی", pluto:"شدت و اختیار",
  asc:"برداشت نخست", dsc:"انتظار از شراکت", mc:"هدف و مسیر بیرونی", ic:"حریم و احساس تعلق",
};

/**
 * @param {import("../../types/synastry-engine").SynastryInterChartAspect | undefined} contact
 * @param {{a:string,b:string}} names
 */
export function describeRomanticOpeningContact(contact, names) {
  if (!contact) return null;
  const points = [contact.pointA, contact.pointB];
  const owner = id => {const point=points.find(p=>p.id===id);return point ? names[point.chartSide] : null;};
  const hard = ["square","opposition"].includes(contact.aspectId);
  const smooth = ["trine","sextile"].includes(contact.aspectId);
  const joined = contact.aspectId === "conjunction";
  const lens = (first,second,lead,scene) => {
    const x=owner(first), y=owner(second);
    return x && y && first!==second ? {lead:lead(x,y),scene:scene(x,y),id:contact.id} : null;
  };
  let result;
  if (hard) {
    result = lens("mercury","venus",(x,y)=>`وقتی ${x} دربارهٔ انتخاب یا احساس ${y} سؤال می‌پرسد، ممکن است ${y} آن را نپسندیدن خودش بشنود، نه صرفاً نظر متفاوت دربارهٔ یک انتخاب`,(x,y)=>`مثلاً هنگام انتخاب یک هدیه یا قرار، اگر ${x} بپرسد «چرا این را انتخاب کردی؟»، بهتر است ${y} بتواند فرق کنجکاوی او و مخالفت واقعی را از لحن و پاسخ بعدی تشخیص دهد`)
      ?? lens("moon","mars",(x,y)=>`لحظه‌ای که ${x} هنوز از اتفاقی ناراحت است و ${y} می‌خواهد سریع واکنش نشان دهد یا مسئله را حل کند، می‌تواند نقطهٔ حساس رابطه باشد`,(x,y)=>`اگر ${y} فوراً راه‌حل بدهد، ${x} ممکن است هنوز نیاز داشته باشد حرفش شنیده شود؛ مکث پیش از پاسخ در چنین لحظه‌ای ارزش امتحان کردن دارد`)
      ?? lens("venus","saturn",(x,y)=>`ابراز علاقهٔ ${x} و انتظار ${y} از ثبات ممکن است در یک قرار ساده با هم اصطکاک پیدا کند`,(x,y)=>`اگر ${x} یک پیشنهاد عاشقانه بدهد، خوب است ${y} روشن کند که دارد دربارهٔ امکان انجام آن حرف می‌زند یا دربارهٔ تعهد به تکرارش`)
      ?? lens("mercury","mars",(x,y)=>`وقتی ${x} هنوز در حال توضیح منظورش است و ${y} می‌خواهد به نتیجه برسد، احتمال دارد بحث پیش از کامل شدن حرف به واکنش تبدیل شود`,(x,y)=>`در یک اختلاف کوچک، ${y} می‌تواند پیش از پاسخ دادن بگذارد ${x} جمله‌اش را تمام کند`)
      ?? lens("moon","saturn",(x,y)=>`نیاز ${x} به شنیده شدن و تمایل ${y} به حفظ نظم ممکن است در روزهای سخت به دو درخواست متفاوت تبدیل شود`,(x,y)=>`اگر ${x} از روز سختش بگوید، بهتر است ${y} پیش از پیشنهاد راه‌حل بپرسد آیا همراهی می‌خواهد یا کمک عملی`)
      ?? lens("venus","uranus",(x,y)=>`میل ${x} به یک تجربهٔ خوشایند و نیاز ${y} به آزادی تغییر برنامه ممکن است در قرارهای مشترک به اختلاف برسد`,(x,y)=>`اگر ${y} بخواهد برنامه را تغییر دهد، روشن کردن اینکه ${x} از قبل روی کدام بخش حساب کرده است به فهم اختلاف کمک می‌کند`);
  }
  if (!result && (joined || smooth)) {
    result = lens("moon","saturn",(x,y)=>`در روزهایی که ${x} خسته یا آشفته است، حضور آرام و قابل اتکای ${y} می‌تواند از شکل‌های ارزشمند همراهی میان شما باشد`,(x,y)=>`مثلاً ${y} می‌تواند کنار ${x} بماند بی‌آنکه فوراً قول بدهد مشکل را حل کند`)
      ?? lens("venus","mars",(x,y)=>`یکی از ظرفیت‌های نزدیکی شما این است که سلیقه و علاقهٔ ${x} می‌تواند با پیش‌قدم شدن ${y} به یک تجربهٔ مشترک تبدیل شود`,(x,y)=>`مثلاً ${x} از موسیقی یا جایی خوشش می‌آید و ${y} پیشنهاد می‌دهد با هم آن را تجربه کنند، به شرط میل هر دو`)
      ?? lens("venus","uranus",(x,y)=>`پسند و علاقهٔ ${x} می‌تواند کنار میل ${y} به تجربه‌های تازه قرار بگیرد، بدون اینکه هر پیشنهاد به یک قول ثابت تبدیل شود`,(x,y)=>`اگر ${y} برای قرار پیشنهاد غیرمنتظره‌ای بدهد، پاسخ واقعی ${x} مهم‌تر از فرض موافقت اوست`)
      ?? lens("mercury","moon",(x,y)=>`پرسش‌های ${x} می‌توانند به ${y} کمک کنند احساسی را که هنوز نام روشنی ندارد بیان کند`,(x,y)=>`در یک گفت‌وگوی شبانه، ${x} می‌تواند به جای حدس زدن حال ${y} از او بپرسد دقیقاً چه چیزی آزارش داده است`)
      ?? lens("mercury","sun",(x,y)=>`گفت‌وگوی ${x} می‌تواند به ${y} کمک کند دلیل یک انتخاب شخصی را روشن‌تر بیان کند`,(x,y)=>`وقتی ${y} دربارهٔ تصمیمی حرف می‌زند، سؤال ${x} می‌تواند به شناخت بهتر اولویت او کمک کند`);
  }
  if (result) return result;
  const [a,b]=points;
  const first=topics[a.id],second=topics[b.id];
  if (!first || !second) return null;
  return {id:contact.id,
    lead:`در خوانش این دو چارت، ${first} برای ${names[a.chartSide]} و ${second} برای ${names[b.chartSide]} ${hard?"ممکن است در یک موقعیت مشترک به دو خواستهٔ متفاوت تبدیل شوند":smooth?"می‌توانند در یک موقعیت مشترک به هم کمک کنند":"موضوعی مشخص برای بررسی تجربهٔ مشترک شما هستند"}`,
    scene:`در یک تجربهٔ واقعی که به این دو موضوع مربوط است، ببینید ${names[a.chartSide]} چه می‌خواهد و ${names[b.chartSide]} چگونه به آن پاسخ می‌دهد؛ از خود تماس نمی‌توان واکنش قطعی هر نفر را تعیین کرد`};
}

/**
 * @param {import("../../types/synastry-engine").SynastryInterChartAspect[]} contacts
 * @param {{a:string,b:string}} names
 * @returns {{opening:[string,string],openingEvidence:{sentenceId:string,paragraph:1|2,evidenceIds:string[]}[]}|null}
 */
export function buildRomanticOpening(contacts, names) {
  const items = contacts.filter(Boolean).map(contact=>({contact,lens:describeRomanticOpeningContact(contact,names)})).filter(item=>item.lens);
  const rank = (a,b)=> b.contact.relevanceScore-a.contact.relevanceScore || a.contact.orb-b.contact.orb || a.contact.id.localeCompare(b.contact.id);
  const risk=items.filter(i=>["square","opposition"].includes(i.contact.aspectId)).sort(rank)[0];
  const benefit=items.filter(i=>["trine","sextile","conjunction"].includes(i.contact.aspectId)).sort(rank)[0];
  const first=risk??benefit??items.sort(rank)[0];
  if(!first) return {
    opening: ["برای "+names.a+" و "+names.b+" در تماس‌های قابل اتکای این دو چارت هنوز مبنای کافی برای مشخص کردن یک نقطهٔ قوت یا تعارض اختصاصی پیدا نشده است.", "این محدودیت به معنی ناسازگاری یا نبود صمیمیت نیست؛ دربارهٔ تجربهٔ عاطفی هیچ‌کدام نمی‌توان از این داده حکم داد."],
    openingEvidence: [{sentenceId:"opening-p1-s1",paragraph:1,evidenceIds:["report:pair-context"]},{sentenceId:"opening-p2-s1",paragraph:2,evidenceIds:["report:pair-context"]}],
  };
  const second=(first===risk?benefit:risk)??items.filter(i=>i!==first).sort(rank)[0];
  const paragraphs = [
    [first.lens.lead,first.lens.scene],
    [second?.lens.lead??("برای "+names.a+" و "+names.b+" همین موضوع نقطهٔ شروع بررسی رابطه است؛ دربارهٔ سایر الگوها هنوز شاهد کافی برای نتیجه‌گیری اختصاصی نداریم"),second?.lens.scene??"تجربهٔ واقعی هر دو نفر را معیار قرار دهید، نه یک نتیجهٔ قطعی دربارهٔ آینده"],
  ];
  const evidence=[["contact:"+first.contact.id,"contact:"+first.contact.id],[second?"contact:"+second.contact.id:"report:pair-context",second?"contact:"+second.contact.id:"report:pair-context"]];
  const third=items.filter(i=>i!==first&&i!==second).sort(rank)[0];
  if(third) {
    const index=["square","opposition"].includes(third.contact.aspectId)?0:1;
    paragraphs[index].push(third.lens.lead);
    evidence[index].push("contact:"+third.contact.id);
  }
  return {
    opening:[paragraphs[0].join(". ")+".",paragraphs[1].join(". ")+"."],
    openingEvidence:paragraphs.flatMap((sentences,i)=>sentences.map((_,j)=>({sentenceId:"opening-p"+(i+1)+"-s"+(j+1),paragraph:i===0?1:2,evidenceIds:[evidence[i][j]]}))),
  };
}
