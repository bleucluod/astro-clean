import type { AstrologyReport, RealEngineReportAspect, ZodiacKey } from "@/types/astro";
import type { AdaptiveNarrativeAnchor, AdaptiveReportPlan } from "./adaptive-report-planner";
import { ZODIAC_LABELS } from "./zodiac-labels";

export const PERSONAL_OPENING_VERSION = "personal-opening-20261027-r1" as const;

// This module interprets the approved selection. It never ranks another set of stories.
// A bridge owns a relationship BETWEEN topics, not the lesson or exercise of either chapter.
export type PersonalOpening = {
  version: typeof PERSONAL_OPENING_VERSION;
  title: string;
  paragraphs: string[];
  profileKey: string;
  sourceStoryKeys: string[];
  evidence: Array<{ key: string; sourceIds: string[]; text: string }>;
  ownership: { owner: "opening"; claimIds: string[]; sceneId: string | null; actionId: null };
};

const labels: Record<string, string> = {
  sun: "خورشید", moon: "ماه", mercury: "عطارد", venus: "ونوس", mars: "مریخ",
  jupiter: "مشتری", saturn: "زحل", uranus: "اورانوس", neptune: "نپتون", pluto: "پلوتو",
};
const drives: Record<string, string> = {
  sun: "انتخاب مسیر شخصی", moon: "احساس امنیت", mercury: "فکر و بیان",
  venus: "علاقه و پیوند", mars: "اقدام و پیگیری", jupiter: "گسترش تجربه",
  saturn: "تعهد و محدودیت", uranus: "استقلال و تغییر", neptune: "تخیل و حساسیت", pluto: "عمق و دگرگونی",
};
const bodyOrder = Object.keys(labels);
const ordered = (ids: string[]) => [...new Set(ids)].filter(id => labels[id]).sort((a, b) => bodyOrder.indexOf(a) - bodyOrder.indexOf(b));
const join = (parts: string[]) => parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join("، ")} و ${parts.at(-1)}`;
const fa = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 1 });

type Theme = { id: string; focus: string; criterion: string; payoff: string; setting: string };
const themes: Record<string, Theme> = {
  initiative: { id: "initiative", focus: "اختیار شروع", criterion: "قدم اول واقعاً انتخاب خودت باشد", payoff: "حضور روشن و بی‌واسطه", setting: "شروع یک فعالیت تازه" },
  resources: { id: "resources", focus: "ساختن پشتوانه", criterion: "چیزی قابل اتکا برایت باقی بماند", payoff: "استقلالی که هزینه‌اش را می‌شناسی", setting: "تقسیم وقت و امکانات محدود" },
  communication: { id: "communication", focus: "فهمیدن و فهماندن", criterion: "معنای حرف در رفت‌وبرگشت گم نشود", payoff: "تفاهمی که از توضیح روشن ساخته می‌شود", setting: "گفت‌وگویی با چند برداشت متفاوت" },
  home: { id: "home", focus: "داشتن جای امن", criterion: "در فضای شخصی بتوانی از حالت آماده‌باش بیرون بیایی", payoff: "آرامشی که به حرکت بیرون نیرو می‌دهد", setting: "تغییر برنامه‌ای که به خلوت خانه هم می‌رسد" },
  expression: { id: "expression", focus: "ساختن چیزی با امضای خودت", criterion: "سلیقه و ابتکار تو در نتیجه دیده شود", payoff: "لذت خلق‌کردن و نشان‌دادن", setting: "انتخاب شکل نهایی یک کار شخصی" },
  craft: { id: "craft", focus: "کیفیت اجرای روزمره", criterion: "روش انجام کار قابل ادامه باشد", payoff: "مهارتی که در عمل به آن تکیه می‌کنی", setting: "روزی با چند کار کوچک و به‌هم‌پیوسته" },
  partnership: { id: "partnership", focus: "ساختن تصمیم مشترک", criterion: "طرف مقابل هم سهم روشنی در انتخاب داشته باشد", payoff: "همراهی‌ای که نتیجه می‌سازد", setting: "انتخاب قدم بعدی در یک همکاری" },
  trust: { id: "trust", focus: "اعتماد در نزدیکی", criterion: "سهم آسیب‌پذیری و اختیار روشن باشد", payoff: "اعتمادی که با واگذاری کامل اختیار اشتباه نمی‌شود", setting: "تصمیمی که نتیجه‌اش به اعتماد متقابل وابسته است" },
  meaning: { id: "meaning", focus: "بزرگ‌ترکردن افق زندگی", criterion: "تجربهٔ تازه نگاهت را جلو ببرد", payoff: "جهتی که ارزش یادگرفتن و حرکت‌کردن دارد", setting: "انتخاب میان دو مسیر یادگیری" },
  achievement: { id: "achievement", focus: "ساختن نتیجهٔ قابل‌دیدن", criterion: "بتوانی مسئولیت نتیجه را به نام خودت بپذیری", payoff: "اعتباری که پشتش کار واقعی هست", setting: "ارائهٔ نتیجه‌ای که دیگران هم درباره‌اش نظر می‌دهند" },
  collective: { id: "collective", focus: "پیداکردن سهمت در جمع", criterion: "همکاری به آینده‌ای که می‌خواهی وصل باشد", payoff: "تأثیری که از همراهی چند نفر بزرگ‌تر می‌شود", setting: "انتخاب نقش در یک گروه تازه" },
  retreat: { id: "retreat", focus: "جا دادن به پردازش درونی", criterion: "پیش از واکنش فرصت جمع‌کردن خودت را داشته باشی", payoff: "وضوحی که در فاصله از شلوغی شکل می‌گیرد", setting: "بازگشت از یک روز پر از تماس و درخواست" },
  innovation: { id: "innovation", focus: "امتحان‌کردن راه متفاوت", criterion: "فقط به خاطر آشنابودن یک روش به آن وفادار نمانی", payoff: "تغییری که به یک روش قابل استفاده تبدیل می‌شود", setting: "پیشنهاد روشی تازه در یک جمع" },
  imagination: { id: "imagination", focus: "دریافت لایه‌های نادیدنی تجربه", criterion: "حس و تخیل هم جایی در انتخاب داشته باشند", payoff: "تصویری که پیش از توضیح کامل آن را حس می‌کنی", setting: "روبه‌روشدن با فضایی که حال‌وهوایش از کلمات بیشتر می‌گوید" },
  affection: { id: "affection", focus: "پیوند گرم و قابل لمس", criterion: "علاقه در رفتار روزمره هم حس شود", payoff: "نزدیکی‌ای که برای نگه‌داشتنش نقش بازی نمی‌کنی", setting: "هماهنگ‌کردن یک برنامه با فردی نزدیک" },
  autonomy: { id: "autonomy", focus: "حفظ حق انتخاب", criterion: "در همراهی با دیگران اختیار خودت حذف نشود", payoff: "آزادی‌ای که جای تو را در رابطه روشن می‌کند", setting: "درخواستی که شکل انتخابت را از قبل تعیین می‌کند" },
  expansion: { id: "expansion", focus: "تبدیل امکان به حرکت", criterion: "فرصت خوب به قدمی واقعی برسد", payoff: "پیشروی‌ای که از خوش‌بینی نیرو می‌گیرد", setting: "فرصتی تازه که برای شروع به تصمیم نیاز دارد" },
  identity: { id: "identity", focus: "هماهنگی مسیر بیرونی و نیاز درونی", criterion: "نتیجهٔ بیرونی با حال درونت بیگانه نشود", payoff: "مسیر شخصی‌ای که در آن خودت هم جا داری", setting: "انتخابی که هم دیده می‌شود و هم بر زندگی خصوصی اثر می‌گذارد" },
  capacity: { id: "capacity", focus: "سنجیدن اندازهٔ تعهد", criterion: "میل به گسترش از ظرفیت واقعی جلو نزند", payoff: "رشدی که بتوانی آن را نگه داری", setting: "قبول‌کردن مسئولیتی تازه در کنار کارهای قبلی" },
};
const houses = ["", "initiative", "resources", "communication", "home", "expression", "craft", "partnership", "trust", "meaning", "achievement", "collective", "retreat"];
const signs: Record<ZodiacKey, string> = { aries: "initiative", taurus: "resources", gemini: "communication", cancer: "home", leo: "expression", virgo: "craft", libra: "partnership", scorpio: "trust", sagittarius: "meaning", capricorn: "achievement", aquarius: "innovation", pisces: "imagination" };

// Relational meanings, not two unrelated planet definitions joined into a sentence.
const pairMeanings: Record<string, [string, string, string]> = {
  "sun:mercury": ["بیان دیدگاه شخصی", "حرفت چیزی از انتخاب خودت را روشن کند", "communication"],
  "sun:venus": ["انتخاب چیزی که واقعاً دوست داری", "ارزش انتخابت فقط از پسند دیگران نیاید", "expression"],
  "sun:mars": ["جهت‌دادن به انرژی", "کاری که پیش می‌بری به خواستهٔ خودت وصل باشد", "initiative"],
  "sun:jupiter": ["بزرگ‌کردن میدان تجربه", "فرصت تازه به مسیر شخصی تو جهت بدهد", "meaning"],
  "sun:saturn": ["ساختن اعتبار شخصی", "تعهدی که می‌پذیری با مسیر خودت سازگار باشد", "achievement"],
  "sun:neptune": ["جان‌دادن به یک تصویر ذهنی", "آنچه تصور می‌کنی در انتخاب واقعی هم شکل بگیرد", "imagination"],
  "sun:pluto": ["حفظ اختیار در تغییر", "در دگرگون‌کردن یک موقعیت، خودت هم صاحب انتخاب بمانی", "trust"],
  "moon:mercury": ["به زبان آوردن احساس", "حرفت تجربهٔ درونی‌ات را درست منتقل کند", "communication"],
  "moon:mars": ["تبدیل احساس به واکنش", "کاری که می‌کنی پاسخ همان نیازی باشد که حس کرده‌ای", "initiative"],
  "moon:jupiter": ["گسترش دایرهٔ آسودگی", "تجربهٔ بیشتر، احساس اتکا را هم بیشتر کند", "home"],
  "moon:saturn": ["جا دادن به نیاز در دل تعهد", "مسئولیت‌پذیری به حذف نیاز شخصی تبدیل نشود", "home"],
  "moon:uranus": ["آزادی در فضای امن", "برای داشتن آرامش مجبور به تکرار همیشگی یک روش نباشی", "autonomy"],
  "moon:neptune": ["فهمیدن حال‌وهوای درون", "میان احساس خودت و فضای اطراف تمایز بگذاری", "imagination"],
  "moon:pluto": ["اعتماد به احساس عمیق", "شدت احساس، تمام اختیار واکنش را نگیرد", "trust"],
  "mercury:venus": ["بیان خوشایند و روشن", "حفظ لحن خوب به قیمت گم‌شدن منظورت نباشد", "communication"],
  "mercury:mars": ["تبدیل فکر به حرکت", "سرعت تصمیم با روشنی منظورت همراه باشد", "initiative"],
  "mercury:jupiter": ["وصل‌کردن جزئیات به تصویر بزرگ", "برداشت کلی از جزئیات واقعی جدا نشود", "meaning"],
  "mercury:saturn": ["ساختن فکر قابل اتکا", "دقت به فهم بهتر برسد، نه فقط بررسی طولانی‌تر", "craft"],
  "mercury:uranus": ["پیداکردن راه فکری تازه", "ایدهٔ متفاوت قابل توضیح و استفاده هم باشد", "innovation"],
  "mercury:neptune": ["ترجمهٔ تصویر ذهنی به کلمه", "حس ظریف در توضیح روشن گم نشود", "imagination"],
  "mercury:pluto": ["رسیدن به عمق مسئله", "پرس‌وجو چیزی را روشن کند که واقعاً در تصمیم اثر دارد", "trust"],
  "venus:mars": ["پیوند علاقه و پیش‌قدم‌شدن", "حرکتت با چیزی که واقعاً می‌خواهی هماهنگ باشد", "affection"],
  "venus:jupiter": ["گسترش تجربهٔ لذت و همراهی", "بیشترخواستن، کیفیت تجربه را هم بیشتر کند", "expansion"],
  "venus:saturn": ["ماندگاری علاقه", "تعهد، علاقه را در رفتار قابل اتکا نشان دهد", "partnership"],
  "venus:uranus": ["تازگی در پیوند", "نزدیکی جا برای تفاوت و انتخاب باقی بگذارد", "autonomy"],
  "venus:neptune": ["دیدن زیبایی در پیوند", "تصویری که دوست داری با تجربهٔ واقعی ارتباط داشته باشد", "imagination"],
  "venus:pluto": ["عمق در علاقه", "ارزش پیوند با شدت وابستگی یکی گرفته نشود", "trust"],
  "mars:saturn": ["ساختن حرکت مداوم", "انرژی شروع به ظرفیت ادامه وصل شود", "craft"],
  "mars:uranus": ["بازکردن مسیر تازه با عمل", "تغییر روش به حرکتی قابل ادامه برسد", "innovation"],
  "mars:neptune": ["حرکت به سوی یک تصویر", "انگیزهٔ الهام‌بخش به قدمی مشخص تبدیل شود", "imagination"],
  "mars:pluto": ["به‌کارگرفتن نیروی متمرکز", "شدت پیگیری در خدمت نتیجه بماند", "initiative"],
  "jupiter:uranus": ["آزمودن امکان ناآشنا", "تازگیِ فرصت با جهت حرکتت ارتباط داشته باشد", "innovation"],
  "jupiter:neptune": ["گسترش افق تخیل", "امید، راهی برای تجربه‌کردن هم پیدا کند", "imagination"],
  "jupiter:pluto": ["تغییر اندازهٔ میدان عمل", "گسترش نفوذ با اختیار و مسئولیت همراه باشد", "achievement"],
  "saturn:uranus": ["تغییر ساختار بدون از دست دادن تکیه‌گاه", "روش تازه بتواند مسئولیت روش قبلی را هم بپذیرد", "innovation"],
  "saturn:neptune": ["ساختن شکل واقعی برای یک آرمان", "تصویر مطلوب از ظرفیت اجرای آن جدا نماند", "craft"],
  "saturn:pluto": ["بازسازی یک ساختار ریشه‌دار", "حفظ کنترل مانع تغییر لازم نشود", "achievement"],
  "uranus:neptune": ["تازه‌کردن تصویر امکان‌ها", "تخیل متفاوت در تجربه هم جایی پیدا کند", "imagination"],
  "uranus:pluto": ["تغییر قواعد ریشه‌دار", "آزادی تازه به اختیار واقعی تبدیل شود", "innovation"],
  "neptune:pluto": ["شناخت لایه‌های پنهان تغییر", "حس یک دگرگونی با تجربهٔ واقعی پیوند داشته باشد", "trust"],
};

const scenes: Record<string, string> = {
  initiative: "پیشنهادی مطرح شده و جمع منتظر کسی است که قدم اول را بردارد؛ جلو رفتن تو، شکل ادامهٔ کار را هم تعیین می‌کند",
  resources: "دو کار برای زمان و امکانات یکسان رقابت می‌کنند؛ انتخاب یکی، سهمی را که برای دیگری می‌ماند تغییر می‌دهد",
  communication: "در یک گفت‌وگو، طرف مقابل از حرفت برداشت دیگری کرده است؛ توضیح بعدی تو هم معنای حرف و هم حال‌وهوای رابطه را تغییر می‌دهد",
  home: "یک برنامهٔ بیرونی به ساعت خلوتت رسیده است؛ پذیرفتن آن، فقط تقویم را تغییر نمی‌دهد و بر فرصت بازیابی تو هم اثر می‌گذارد",
  expression: "می‌توانی کاری را به شکل آشنای دیگران تمام کنی یا بخشی از آن را با سلیقهٔ خودت بسازی؛ نتیجه، میزان حضورت در آن کار را نشان می‌دهد",
  craft: "چند کار کوچک به هم وابسته‌اند؛ تغییر روش یکی، ریتم بقیهٔ روز را هم عوض می‌کند",
  partnership: "در یک همکاری، تصمیمی باید گرفته شود که نتیجه‌اش به هر دو نفر می‌رسد؛ شیوهٔ انتخاب، کیفیت همراهی بعدی را هم می‌سازد",
  trust: "کسی برای ادامهٔ یک کار به اعتماد تو نیاز دارد؛ اندازهٔ اختیاری که واگذار می‌کنی، هم نزدیکی و هم احساس تسلطت بر موقعیت را تغییر می‌دهد",
  meaning: "دو مسیر یادگیری پیش روی توست؛ یکی آشناتر است و دیگری تصویر تازه‌ای از امکان‌های آینده می‌دهد",
  achievement: "نتیجهٔ کارت قرار است دیده شود؛ تصمیم دربارهٔ شکل ارائه، با مسئولیتی که حاضر به پذیرفتنش هستی گره می‌خورد",
  collective: "گروهی برای ادامهٔ کار نقش‌ها را تقسیم می‌کند؛ جایگاهی که می‌پذیری، سهمت در جهت آیندهٔ جمع را تغییر می‌دهد",
  retreat: "بعد از چند ساعت تماس و درخواست، فرصت کوتاهی برای خودت پیدا شده است؛ شکل استفاده از آن بر واکنش بعدی تو اثر می‌گذارد",
  innovation: "راه تازه‌ای برای انجام کار به ذهنت رسیده است؛ امتحانش هم امکان جدید می‌سازد و هم عادت قبلی جمع را تغییر می‌دهد",
  imagination: "تصویری از نتیجه در ذهنت روشن است، اما توضیحش هنوز کامل نیست؛ نخستین تلاش برای نشان‌دادنش معلوم می‌کند کدام بخش تصویر قابل انتقال است",
  affection: "قرار است برنامه‌ای را با فردی نزدیک هماهنگ کنی؛ شیوهٔ پیشنهاد تو هم علاقه را نشان می‌دهد و هم انتظارت از همراهی را",
  autonomy: "در یک برنامهٔ مشترک، روش انجام کار از قبل تعیین شده است؛ پذیرفتن یا تغییر آن، حد اختیارت را روشن می‌کند",
  expansion: "فرصتی برای جلو بردن کار پیش آمده است؛ پاسخ تو تعیین می‌کند این امکان در حد ایده بماند یا وارد برنامه شود",
  identity: "پیشنهادی از بیرون جذاب به نظر می‌رسد؛ وقتی آن را در برنامهٔ عادی زندگی می‌گذاری، نیازهای شخصی هم وارد حساب می‌شوند",
  capacity: "مسئولیت تازه‌ای به کارهای قبلی اضافه شده است؛ قبول آن، اندازهٔ تعهدی را که باید ادامه بدهی تغییر می‌دهد",
};

type Topic = { key: string; theme: Theme; mechanics: string; evidence: PersonalOpening["evidence"]; shape: string; ids: string[]; sceneTheme: string };
const geometry: Record<RealEngineReportAspect["aspectId"], string> = { conjunction: "هم‌نشینی", opposition: "تقابل", square: "مربع", trine: "تثلیث", sextile: "سکستایل" };

function aspectMechanism(edge: RealEngineReportAspect) {
  const a = drives[edge.firstPlanetId], b = drives[edge.secondPlanetId];
  if (!a || !b) return "";
  switch (edge.aspectId) {
    case "square": return `در این مربع، ${a} و ${b} به‌سادگی با یک روش پیش نمی‌روند؛ جلو رفتن یکی، دیگری را هم به واکنش وامی‌دارد.`;
    case "opposition": return `این تقابل، ${a} و ${b} را در دو سوی تصمیم قرار می‌دهد؛ انتخاب یک سو، نیاز سوی دیگر را از بین نمی‌برد.`;
    case "conjunction": return `در این هم‌نشینی، ${a} از ${b} جدا عمل نمی‌کند؛ شروع یکی، دیگری را هم وارد تصمیم می‌کند.`;
    case "trine": return `این تثلیث راه رفت‌وآمد میان ${a} و ${b} را روان می‌کند؛ برای به‌کارگرفتن یکی، از دیگری هم کمک می‌گیری.`;
    case "sextile": return `این سکستایل امکان همکاری میان ${a} و ${b} را می‌سازد؛ با واردکردن هر دو در انتخاب، این همراهی به کار می‌افتد.`;
  }
}

function topicFor(report: AstrologyReport, plan: AdaptiveReportPlan, story: AdaptiveNarrativeAnchor): Topic | null {
  const placements = report.realEngine?.placements ?? [];
  const edges = report.realEngine?.aspects ?? report.realEngine?.aspectHighlights ?? [];
  const ids = ordered(story.sourcePlanetIds);
  if (!ids.length || ids.some(id => !placements.some(p => p.id === id))) return null;
  const evidence: PersonalOpening["evidence"] = [];
  const base = { key: story.semanticKey, evidence, ids };
  const group = plan.selection.storyGroups.find(g => g.ownerKey === story.semanticKey);
  const clusterKeys = [story.semanticKey, ...(group?.memberKeys ?? [])].filter((key, i, all) => key.startsWith("cluster:") && all.indexOf(key) === i);
  for (const key of clusterKeys) {
    const facet = group?.perspectives.find(p => p.key === key);
    const members = ordered(facet?.planetIds ?? ids);
    const suffix = key.split(":")[2];
    if (key.startsWith("cluster:house:")) {
      const house = Number(suffix);
      if (!plan.selection.timeReliable || !houses[house] || members.some(id => placements.find(p => p.id === id)?.house !== house)) continue;
      evidence.push({ key, sourceIds: members, text: `${join(members.map(id => labels[id]))} در خانهٔ ${fa(house)} قرار دارند` });
    } else if (suffix in signs && members.every(id => placements.find(p => p.id === id)?.signId === suffix)) {
      evidence.push({ key, sourceIds: members, text: `${join(members.map(id => labels[id]))} در ${ZODIAC_LABELS[suffix as ZodiacKey].faName} هستند` });
    }
  }
  if (story.kind === "cluster") {
    const primary = evidence.find(e => e.key === story.semanticKey);
    if (!primary) return null;
    const suffix = story.semanticKey.split(":")[2];
    const theme = themes[story.semanticKey.startsWith("cluster:house:") ? houses[Number(suffix)] : signs[suffix as ZodiacKey]];
    if (!theme) return null;
    const mechanics = `این تمرکز، ${join(ids.map(id => drives[id]))} را به موضوع ${theme.focus} پیوند می‌دهد.`;
    return { ...base, theme, mechanics, shape: "cluster", sceneTheme: theme.id };
  }
  const aspects = story.sourceAspectIds.map(id => edges.find(a => a.id === id));
  if (!aspects.length || aspects.some(a => !a || !Number.isFinite(a.orb))) return null;
  const valid = aspects as RealEngineReportAspect[];
  for (const a of valid) evidence.push({ key: a.id, sourceIds: [a.id, a.firstPlanetId, a.secondPlanetId], text: `${labels[a.firstPlanetId]} و ${labels[a.secondPlanetId]} ${geometry[a.aspectId]} دارند، با فاصلهٔ ${fa(a.orb)} درجه از زاویهٔ دقیق` });
  if (story.kind === "aspect-pattern") {
    const tense = story.semanticKey.startsWith("pattern:t-square:");
    const theme = tense && ids.includes("jupiter") && ids.includes("saturn") ? themes.capacity : {
      id: tense ? "multi-pressure" : "multi-support", focus: tense ? "انتخاب میان چند خواستهٔ هم‌زمان" : "به‌کارگرفتن توان‌های مکمل",
      criterion: "پاسخ یک نیاز، بقیهٔ نیازهای درگیر را کنار نزند", payoff: "انتخابی که چند بخش درگیر تو در آن سهم دارند", setting: "تصمیمی که چند خواسته را هم‌زمان درگیر می‌کند",
    };
    return { ...base, theme, sceneTheme: tense ? "capacity" : "expansion", shape: tense ? "t-square" : "grand-trine", mechanics: tense
      ? `در این تی‌اسکوئر، ${join(ids.map(id => drives[id]))} یک زنجیره می‌سازند؛ فشار در یک ضلع به دو ضلع دیگر هم می‌رسد.`
      : `در این مثلث هماهنگ، ${join(ids.map(id => drives[id]))} پشتوانهٔ یکدیگرند؛ یک توان می‌تواند راه استفاده از دو توان دیگر را باز کند.` };
  }
  const a = valid[0];
  const pair = ordered([a.firstPlanetId, a.secondPlanetId]).join(":");
  const pairTheme: Record<string, string> = { "moon:venus": "affection", "sun:uranus": "autonomy", "mars:jupiter": "expansion", "sun:moon": "identity", "jupiter:saturn": "capacity" };
  const meaning = pairMeanings[pair];
  const sceneTheme = pairTheme[pair] ?? meaning?.[2];
  if (!sceneTheme) return null;
  const theme = themes[pairTheme[pair]] ?? { ...themes[sceneTheme], id: pair, focus: meaning[0], criterion: meaning[1] };
  return { ...base, theme, sceneTheme, mechanics: aspectMechanism(a), shape: a.aspectId };
}

type Bridge = { id: string; thesis: string; mechanism: string; scene: string; closing: string };

function bridgeFor(a: Topic, b: Topic): Bridge | null {
  const has = (x: string, y: string) => a.theme.id === x && b.theme.id === y;
  if (has("capacity", "initiative") && a.shape === "t-square" && a.ids.includes("moon") && b.ids.includes("jupiter")) return {
    id: "capacity-initiative", thesis: "پیش‌قدم‌شدن برای تو فقط بازکردن یک در تازه نیست؛ با هر شروع، مسئولیتی را هم به نام خودت می‌زنی. کشش به تجربهٔ بیشتر پررنگ است، اما آسودگی‌ات به این بستگی دارد که بعد از فروکش‌کردن هیجان، از پس ادامه‌دادن آن هم بربیایی.",
    mechanism: "مشتری میل به گسترش را وارد ماجرا می‌کند، ماه به امنیت نیاز دارد و زحل حساب تعهد را نگه می‌دارد. حضور مشتری در موضوع دوم، این سه‌راهی را مستقیماً به شیوهٔ پیش‌قدم‌شدنت وصل می‌کند.",
    scene: "فرض کن دو نفر هم‌زمان روی کمک تو حساب کرده‌اند و یک فرصت تازه هم پیش آمده است. جواب مثبت به هر سه، در لحظه حس توانمندی می‌دهد؛ اما برنامهٔ روزهای بعد است که نشان می‌دهد این شروع چقدر با آرامش و مسئولیت‌هایت سازگار بوده است.",
    closing: "امضای این ترکیب در اندازهٔ شروع توست: پیشروی‌ای که برای ادامه‌اش هم جا گذاشته‌ای، بیشتر از یک شروع پرسر‌وصدا به تو قدرت می‌دهد.",
  };
  if (has("meaning", "resources") && ["sun", "mercury", "venus"].every(id => a.ids.includes(id))) return {
    id: "meaning-resources", thesis: "راه تازه وقتی برای تو کشش واقعی پیدا می‌کند که هم نگاهت را بزرگ‌تر کند، هم بتوانی جایی در زندگی واقعی برایش بسازی. هیجان کشف، یک طرف انتخاب توست؛ طرف دیگر، پشتوانه‌ای است که اجازه می‌دهد آن کشف به تجربه‌ای ماندگار تبدیل شود.",
    mechanism: "تمرکز نخست، یادگیری را به هویت، فکر و علاقه وصل می‌کند؛ تمرکز دوم، ظرفیت نگه‌داشتن آن تجربه را وارد تصمیم می‌کند. به همین دلیل، پرسش از معنا و پرسش از منابع در انتخاب تو دو مسیر جدا نیستند.",
    scene: "دو دورهٔ آموزشی را تصور کن: یکی عنوان چشمگیرتری دارد و دیگری راه استفاده از آموخته‌ها را روشن‌تر می‌کند. برای تو انتخاب با جذابیت موضوع تمام نمی‌شود؛ زمان و امکاناتی که می‌توانی پای ادامه‌اش بگذاری هم وزن پیدا می‌کنند.",
    closing: "مسیر رضایت‌بخش تو جایی شکل می‌گیرد که افق بزرگ‌تر، پشتوانهٔ زندگی‌ات را هم غنی‌تر کند؛ دانشی که فقط روی کاغذ بماند، تمام ظرفیت این ترکیب را به کار نمی‌گیرد.",
  };
  if (has("craft", "expression") && ["sun", "mercury", "pluto"].every(id => b.ids.includes(id))) return {
    id: "craft-expression", thesis: "در کارهای تو، کیفیت فقط درست انجام‌دادن نیست؛ باید رد انتخاب و سلیقهٔ خودت هم در نتیجه بماند. همین پیوند باعث می‌شود یک برنامهٔ منظم وقتی جان بگیرد که چیزی برای ساختن داشته باشی، و یک ایدهٔ شخصی وقتی جدی شود که راه اجرای روزمره‌اش پیدا شده باشد.",
    mechanism: "یک تمرکز، چند نیاز را به شیوهٔ انجام کار پیوند می‌دهد؛ دیگری فکر، اراده و عمق را وارد بیان شخصی می‌کند. حاصلِ کنارهم‌آمدنشان، رفت‌وآمد میان ساختن روش و ساختن اثری است که به تو تعلق دارد.",
    scene: "فرض کن راه کوتاه‌تری برای تمام‌کردن یک کار هست، اما نتیجه‌اش شبیه چیزی نمی‌شود که در ذهن داری. اینجا فقط میان سرعت و وسواس انتخاب نمی‌کنی؛ داری تعیین می‌کنی کدام جزئیات واقعاً هویت کار را می‌سازند و کدام‌ها فقط اجرای آن را سنگین می‌کنند.",
    closing: "نظم برای تو وقتی ارزش بیشتری پیدا می‌کند که جا برای ابتکار باز کند؛ نتیجه‌ای که هم قابل تکرار است و هم امضای تو را دارد، این دو بخش چارت را به هم می‌رساند.",
  };
  if (has("affection", "autonomy") && ["sextile", "trine"].includes(a.shape) && ["square", "opposition"].includes(b.shape)) return {
    id: "affection-autonomy", thesis: "می‌توانی با کسی گرم و همراه باشی و هم‌زمان، با برنامه‌ای که برایت تعیین کرده همراه نشوی. در چارت تو، صمیمیت راهی برای پیوند است، اما به‌تنهایی مجوز تصمیم‌گرفتن به جای تو نمی‌شود. کیفیت رابطه برایت به این هم بستگی دارد که نزدیکی چقدر جا برای انتخاب شخصی باقی می‌گذارد.",
    mechanism: "تماس اول، نیاز به امنیت را به ابراز علاقه وصل می‌کند؛ تماس دوم، مسیر شخصی را با میل به استقلال درگیر می‌کند. بنابراین نرم‌بودن در ارتباط، الزاماً به معنی نرم‌شدن در برابر هر انتظار نیست.",
    scene: "تصور کن با اشتیاق در یک برنامهٔ مشترک شرکت کرده‌ای، اما در میانهٔ کار کسی بدون هماهنگی نقش تازه‌ای به تو می‌دهد. علاقه‌ات به آدم‌ها سر جایش است؛ تغییرِ شیوهٔ تصمیم‌گیری است که واکنشت را عوض می‌کند و می‌تواند از بیرون ناگهانی به نظر برسد.",
    closing: "فرق ظریف این ترکیب همین‌جاست: چیزی که پیوند را برای تو حفظ می‌کند، آزادیِ انتخاب‌کردن آن پیوند است.",
  };
  if (has("partnership", "expansion") && ["sextile", "trine"].includes(b.shape)) return {
    id: "partnership-expansion", thesis: "برای تو، همراه خوب فقط کسی نیست که با او تفاهم داری؛ کسی است که در کنار او یک امکان به حرکت تبدیل می‌شود. تصمیم مشترک وقتی رضایت‌بخش است که از گفت‌وگو عبور کند و چیزی را در زندگی جلو ببرد. به همین خاطر، کیفیت همراهی را در نتیجهٔ همکاری هم می‌سنجی.",
    mechanism: "تمرکز نخست، چند بخش چارت را وارد انتخاب‌های دونفره می‌کند؛ تماس دوم، اقدام را به دیدن فرصت پیوند می‌دهد. حاصل این دو، انگیزه برای ساختن حرکتی مشترک است؛ حرکتی که هم رابطه را درگیر می‌کند و هم به آن جهت می‌دهد.",
    scene: "فرض کن تو و یک همراه برای شروع کاری ایده دارید. حرف‌زدن دربارهٔ امکان‌ها انرژی می‌دهد، اما تفاوت اصلی وقتی روشن می‌شود که پیشنهاد به یک قدم مشخص برسد: آن‌وقت می‌بینی تفاهم شما تا چه حد توان حرکت‌دادن کار را هم دارد.",
    closing: "رابطه‌ای که در آن امکان ساختن وجود دارد، بخش بیشتری از تو را بیدار می‌کند؛ نزدیکی و پیشروی در این ترکیب می‌توانند سوخت یکدیگر باشند.",
  };
  if (has("innovation", "identity") && ["opposition", "square"].includes(b.shape)) return {
    id: "innovation-identity", thesis: "برای تو، متفاوت فکرکردن فقط یک سلیقه نیست؛ روی مسیری که انتخاب می‌کنی اثر می‌گذارد. بااین‌حال، هر انتخاب تازه باید از محک دیگری هم بگذرد: در زندگی شخصی چه حسی به تو می‌دهد؟ همین دو معیار باعث می‌شوند موفقیت بیرونی و رضایت درونی همیشه در یک لحظه به دست نیایند.",
    mechanism: "تمرکز آکواریوس چند بخش انتخاب و ارتباطت را به استقلال فکری وصل می‌کند؛ تماس خورشید و ماه، تفاوت میان جهت ارادی و نیاز عاطفی را برجسته می‌کند. پس تازگیِ مسیر، به‌تنهایی دربارهٔ مناسب‌بودن آن برای تمام زندگی تو تصمیم نمی‌گیرد.",
    scene: "تصور کن پیشنهاد تازه‌ای گرفته‌ای که روش کار یا نگاه دیگران به تو را تغییر می‌دهد. جذابیتش روشن است؛ اما وقتی برنامهٔ عادی زندگی را با آن می‌چینی، نیازهایی دیده می‌شوند که در لحظهٔ شنیدن پیشنهاد کمتر به چشم می‌آمدند.",
    closing: "نسخهٔ شخصیِ پیشرفت برای تو از همین نقطه ساخته می‌شود: تغییری که بتوانی با آن زندگی کنی، نه فقط از دور تحسینش کنی.",
  };
  return null;
}

function generalBridge(a: Topic, b: Topic, young: boolean): Bridge {
  const scene = young ? "در یک فعالیت گروهی، پیشنهادی داده‌ای و حالا قرار است با کمک دیگران اجرا شود؛ شکل همراهی آن‌ها، تجربهٔ تو از همان پیشنهاد را هم تغییر می‌دهد" : scenes[a.sceneTheme];
  return {
    id: `combined:${a.theme.id}:${b.theme.id}:${a.shape}:${b.shape}`,
    thesis: `برای تو، ${a.theme.focus} با ${b.theme.focus} پیوند می‌خورد. راهی که برای موضوع اول انتخاب می‌کنی، نحوهٔ تجربهٔ موضوع دوم را هم تغییر می‌دهد. بنابراین رضایت از تصمیم فقط به نتیجهٔ مستقیم آن وابسته نیست؛ اثری که بر بخش دیگر زندگی می‌گذارد هم در حساب تو می‌آید.`,
    mechanism: `${a.mechanics} ${b.mechanics}`,
    scene: `تصور کن ${scene}. در چنین موقعیتی، ${b.theme.focus} هم وارد تصمیم می‌شود؛ برای تو مهم است که ${b.theme.criterion}.`,
    closing: `حاصل این پیوند را در دو چیز می‌بینی: ${a.theme.payoff}، و ${b.theme.payoff}.`,
  };
}

export function buildPersonalOpening(report: AstrologyReport, plan: AdaptiveReportPlan): PersonalOpening {
  const title = report.input.name?.trim() ? `آسمانِ لحظه‌ای که ${report.input.name.trim()} به دنیا آمد` : "آسمانِ لحظهٔ تولد";
  const result: PersonalOpening = { version: PERSONAL_OPENING_VERSION, title, paragraphs: [], profileKey: "insufficient-evidence", sourceStoryKeys: [], evidence: [], ownership: { owner: "opening", claimIds: [], sceneId: null, actionId: null } };
  const stories = plan.topStories.slice(0, 2);
  const topics = stories.map(story => topicFor(report, plan, story));
  // Never silently replace an invalid lead with a lower-ranked topic.
  const a = topics[0];
  if (!a) return result;
  const b = topics[1];
  const selected = b ? [a, b] : [a];
  result.sourceStoryKeys = selected.map(t => t.key);
  result.evidence = selected.flatMap(t => t.evidence);
  const bridge = b ? (plan.audienceMode === "adult" ? bridgeFor(a, b) : null) ?? generalBridge(a, b, plan.audienceMode !== "adult") : null;
  result.profileKey = bridge?.id ?? `single:${a.theme.id}:${a.shape}`;
  // Primary facts stay readable. Merged perspectives retain separate memberships in evidence.
  const facts = selected.map(t => t.evidence.filter(e => !e.key.startsWith("cluster:") || e.key === t.key).map(e => e.text).join("؛ ")).join(". ") + ".";
  result.paragraphs = bridge ? [bridge.thesis, `${facts} ${bridge.mechanism}`, `${bridge.scene} ${bridge.closing}`] : [
    `در این چارت، ${a.theme.focus} نقطهٔ شروع خوانش است. معیار پررنگ این است که ${a.theme.criterion}.`,
    `${facts} ${a.mechanics}`,
    `تصور کن ${scenes[a.sceneTheme]}. این موقعیت، موضوع چارت را به انتخابی قابل لمس تبدیل می‌کند؛ چیزی که اهمیت پیدا می‌کند، ${a.theme.payoff} است.`,
  ];
  if (plan.audienceMode === "caregiver") {
    result.paragraphs = [
      `در چارت این کودک، ${a.theme.focus}${b ? ` با ${b.theme.focus} پیوند دارد` : "یک موضوع برجسته است"}. در سال‌های رشد، این ترکیب در شیوهٔ تجربه‌کردن، بازی و پاسخ به همراهی اطرافیان معنا پیدا می‌کند. نحوهٔ پیش‌قدم‌شدن کودک و پاسخی که از جمع می‌گیرد، دو بخش یک تجربه‌اند.`,
      `${facts} ${a.mechanics}${b ? ` ${b.mechanics}` : ""}`,
      "یک بازی گروهی را تصور کن: کودک می‌خواهد پیشنهاد خودش را امتحان کند و دیگران روش دیگری پیش می‌کشند. واکنش او فقط به نتیجهٔ بازی مربوط نیست؛ فرصتی که برای بیان خواسته و تجربه‌کردن پیدا می‌کند هم بر همراهی بعدی‌اش اثر می‌گذارد.",
    ];
    result.profileKey = `caregiver:${result.profileKey}`;
  }
  result.ownership = { owner: "opening", claimIds: [`opening:${result.profileKey}:${result.sourceStoryKeys.join("+")}`], sceneId: result.paragraphs.length > 2 ? `opening-scene:${result.profileKey}` : null, actionId: null };
  return result;
}
