// HALLEUS_DEEP_NARRATIVE_SLICE5_FINAL_VISUAL_LANGUAGE_RECONCILIATION_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_VISUAL_REVIEW_FAILURESET_REPAIR_R7_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_VISUAL_REVIEW_RECONCILIATION_R1_20260903
// HALLEUS_DEEP_NARRATIVE_SLICE5_SURFACE_LANGUAGE_PLANNER_R1_20260903

export type ReportNarrativeFacet =
  | "opening"
  | "top-stories"
  | "placements"
  | "houses"
  | "aspects"
  | "nodes"
  | "transits"
  | "technical";

export type ReportSurfacePresentation = "prefixed" | "direct";

export type ReportSurfacePurpose =
  | "thesis"
  | "scene"
  | "strength"
  | "friction"
  | "development";

export type ReportSurfacePattern = {
  id: string;
  purpose: ReportSurfacePurpose;
  family: string;
  prefix: string;
};

export const REPORT_NARRATIVE_FACET_OWNERSHIP: Readonly<
  Record<ReportNarrativeFacet, string>
> = {
  opening: "whole-chart-thesis",
  "top-stories": "multi-factor-synthesis",
  placements: "planet-sign-house-placement",
  houses: "field-of-life-synthesis",
  aspects: "relationship-geometry",
  nodes: "developmental-axis",
  transits: "stored-current-activation",
  technical: "raw-facts-and-evidence",
};

const PATTERNS: readonly ReportSurfacePattern[] = [
  { id: "thesis-fact-a", purpose: "thesis", family: "fact", prefix: "اگر از خود چارت شروع کنیم،" },
  { id: "thesis-fact-b", purpose: "thesis", family: "fact", prefix: "خود دادهٔ چارت اینجا یک چیز را روشن می‌کند:" },
  { id: "thesis-contrast-a", purpose: "thesis", family: "contrast", prefix: "در کنار بقیهٔ لایه‌ها،" },
  { id: "thesis-contrast-b", purpose: "thesis", family: "contrast", prefix: "این بخش یک تفاوت مهم با بقیهٔ چارت دارد:" },
  { id: "thesis-focus-a", purpose: "thesis", family: "focus", prefix: "مرکز ثقل این بخش اینجاست:" },
  { id: "thesis-focus-b", purpose: "thesis", family: "focus", prefix: "چیزی که اینجا بیشتر از همه وزن دارد،" },
  { id: "thesis-mechanism-a", purpose: "thesis", family: "mechanism", prefix: "مکانیسم اصلی ساده است:" },
  { id: "thesis-mechanism-b", purpose: "thesis", family: "mechanism", prefix: "این الگو از یک حرکت مشخص ساخته می‌شود:" },
  { id: "thesis-synthesis-a", purpose: "thesis", family: "synthesis", prefix: "اگر این نشانه‌ها را یک‌جا بخوانیم،" },
  { id: "thesis-synthesis-b", purpose: "thesis", family: "synthesis", prefix: "در جمع‌بندی این لایه،" },

  { id: "scene-daily-a", purpose: "scene", family: "daily", prefix: "در زندگی روزمره،" },
  { id: "scene-daily-b", purpose: "scene", family: "daily", prefix: "در یک روز معمولی،" },
  { id: "scene-moment-a", purpose: "scene", family: "moment", prefix: "لحظه‌ای که این الگو ملموس می‌شود،" },
  { id: "scene-moment-b", purpose: "scene", family: "moment", prefix: "جایی که زودتر متوجهش می‌شوی،" },
  { id: "scene-decision-a", purpose: "scene", family: "decision", prefix: "وقت تصمیم‌گیری،" },
  { id: "scene-decision-b", purpose: "scene", family: "decision", prefix: "وقتی باید بین دو راه یکی را انتخاب کنی،" },
  { id: "scene-interaction-a", purpose: "scene", family: "interaction", prefix: "در برخورد با آدم‌ها و موقعیت‌ها،" },
  { id: "scene-interaction-b", purpose: "scene", family: "interaction", prefix: "در یک تعامل واقعی،" },
  { id: "scene-context-a", purpose: "scene", family: "context", prefix: "در همان حوزه‌ای که این جایگاه فعال است،" },
  { id: "scene-context-b", purpose: "scene", family: "context", prefix: "در بستر روزمرهٔ این بخش،" },

  { id: "strength-capacity-a", purpose: "strength", family: "capacity", prefix: "توان قابل اتکای این الگو این است که" },
  { id: "strength-capacity-b", purpose: "strength", family: "capacity", prefix: "یکی از ظرفیت‌های جدی اینجا این است که" },
  { id: "strength-maturity-a", purpose: "strength", family: "maturity", prefix: "وقتی این بخش پخته‌تر عمل می‌کند،" },
  { id: "strength-maturity-b", purpose: "strength", family: "maturity", prefix: "در شکل بالغ‌ترش،" },
  { id: "strength-leverage-a", purpose: "strength", family: "leverage", prefix: "جایی که می‌توانی از این انرژی استفاده کنی،" },
  { id: "strength-leverage-b", purpose: "strength", family: "leverage", prefix: "امتیاز این ترکیب زمانی دیده می‌شود که" },
  { id: "strength-integration-a", purpose: "strength", family: "integration", prefix: "وقتی دو سوی این الگو با هم کار کنند،" },
  { id: "strength-integration-b", purpose: "strength", family: "integration", prefix: "در حالت یکپارچه‌تر،" },
  { id: "strength-use-a", purpose: "strength", family: "use", prefix: "کاربرد سازنده‌اش این است که" },
  { id: "strength-use-b", purpose: "strength", family: "use", prefix: "بهترین بخش این نیرو وقتی ظاهر می‌شود که" },

  { id: "friction-pressure-a", purpose: "friction", family: "pressure", prefix: "زیر فشار،" },
  { id: "friction-pressure-b", purpose: "friction", family: "pressure", prefix: "وقتی فشار زیاد می‌شود،" },
  { id: "friction-excess-a", purpose: "friction", family: "excess", prefix: "اگر این نیرو از اندازه بگذرد،" },
  { id: "friction-excess-b", purpose: "friction", family: "excess", prefix: "وقتی یک سوی این الگو زیادی جلو بیفتد،" },
  { id: "friction-shadow-a", purpose: "friction", family: "shadow", prefix: "سمت دشوارتر ماجرا اینجاست:" },
  { id: "friction-shadow-b", purpose: "friction", family: "shadow", prefix: "روی دیگر این توان،" },
  { id: "friction-delay-a", purpose: "friction", family: "delay", prefix: "اگر واکنش از انتخاب جلو بزند،" },
  { id: "friction-delay-b", purpose: "friction", family: "delay", prefix: "وقتی فرصت مکث کم شود،" },
  { id: "friction-collision-a", purpose: "friction", family: "collision", prefix: "اصطکاک اصلی وقتی شکل می‌گیرد که" },
  { id: "friction-collision-b", purpose: "friction", family: "collision", prefix: "گره این الگو معمولاً جایی سفت می‌شود که" },

  { id: "development-growth-a", purpose: "development", family: "growth", prefix: "مسیر رشد این بخش از اینجا می‌گذرد:" },
  { id: "development-growth-b", purpose: "development", family: "growth", prefix: "هرچه این الگو پخته‌تر می‌شود،" },
  { id: "development-adjustment-a", purpose: "development", family: "adjustment", prefix: "تغییر کوچک اما مهم این است که" },
  { id: "development-adjustment-b", purpose: "development", family: "adjustment", prefix: "تنظیم مفید اینجا این است که" },
  { id: "development-practice-a", purpose: "development", family: "practice", prefix: "چیزی که ارزش تمرین‌کردن دارد،" },
  { id: "development-practice-b", purpose: "development", family: "practice", prefix: "در عمل، تمرین اصلی این است که" },
  { id: "development-boundary-a", purpose: "development", family: "boundary", prefix: "مرز سالم این الگو وقتی روشن می‌شود که" },
  { id: "development-boundary-b", purpose: "development", family: "boundary", prefix: "برای نگه‌داشتن تعادل،" },
  { id: "development-timing-a", purpose: "development", family: "timing", prefix: "زمان‌بندی اینجا مهم است:" },
  { id: "development-timing-b", purpose: "development", family: "timing", prefix: "اگر به این نیرو زمان درست بدهی،" },
] as const;

export const REPORT_SURFACE_PATTERNS = PATTERNS;

export type ReportSurfaceRealization = {
  text: string;
  patternId: string;
  family: string;
  purpose: ReportSurfacePurpose;
  semanticKey: string;
};

export type ReportSurfaceBlock = {
  id: string;
  semanticKey: string;
  purpose: ReportSurfacePurpose;
  text: string;
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

export function joinReportNarrativeSentences(
  parts: ReadonlyArray<string | null | undefined | false>,
): string {
  const seen = new Set<string>();
  const sentences: string[] = [];
  for (const part of parts) {
    let text = typeof part === "string" ? normalizeText(part) : "";
    if (!text) continue;
    text = text
      .replace(/\s+([،؛.!؟])/gu, "$1")
      .replace(/\.{2,}/gu, ".")
      .replace(/^[؛،.\s]+/u, "")
      .trim();
    if (!text) continue;
    const key = text.replace(/[.؟!]+$/u, "").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!/[.؟!]$/u.test(text)) text += ".";
    sentences.push(text);
  }
  return sentences.join(" ");
}

function patternsForPurpose(purpose: ReportSurfacePurpose): ReportSurfacePattern[] {
  return REPORT_SURFACE_PATTERNS.filter((pattern) => pattern.purpose === purpose);
}

const PURPOSE_ORDINAL: Readonly<Record<ReportSurfacePurpose, number>> = {
  thesis: 0,
  scene: 1,
  strength: 2,
  friction: 3,
  development: 4,
};

const EXTRA_LEADING_SCAFFOLDS: readonly string[] = [
  "در زندگی واقعی،",
  "در زندگی واقعی:",
  "وقتی روی فرم است:",
  "وقتی فشار بالا می‌رود:",
  "وقتی فشار بالا می‌رود،",
  "وقتی خوب کار می‌کند،",
  "حرکت کوچک",
  "نشانه‌هایی که احتمالاً می‌بینی",
  "وجه سازنده",
  "از این دوره چه استفاده‌ای بکنی",
  "این هفته امتحان کن",
  "مسیر سازندهٔ این تماس این است که",
  "ظرفیت قابل استفادهٔ این تماس این است که",
  "اگر این انرژی آگاهانه هدایت شود این است که",
  "وجه پخته‌تر این تماس این است که",
  "بخش مفید این تماس این است که",
  "گیر اصلی زمانی شکل می‌گیرد که",
  "زیر فشار، خطر اینجاست که",
  "بخش دشوار تماس می‌تواند این باشد که",
  "اگر واکنش از انتخاب جلو بزند،",
  "سمت سایهٔ این تماس زمانی دیده می‌شود که",
  "وقتی این دو نیرو یک هدف داشته باشند،",
  "اگر مرز دو نیاز روشن نباشد،",
] as const;

const REPEATED_PHRASE_VARIANTS: readonly {
  source: string;
  variants: readonly string[];
}[] = [
  {
    source: "باید در یک زندگی واقعی با هم کار کنند",
    variants: [
      "در تصمیم‌های واقعی باید کنار هم جا شوند",
      "در تجربهٔ روزمره ناچارند هم‌زمان عمل کنند",
      "در موقعیت‌های ملموس باید راهی برای همزیستی پیدا کنند",
      "در انتخاب‌های عادی زندگی باید با هم تنظیم شوند",
      "در رابطه با اتفاق‌های واقعی باید کنار هم مدیریت شوند",
      "در عمل باید بدون حذف یکدیگر سهم خودشان را پیدا کنند",
      "در روزهای معمولی باید در یک تصمیم واحد کنار هم بنشینند",
      "در موقعیت واقعی باید به یک ریتم قابل استفاده برسند",
      "در تجربهٔ شخصی باید به‌جای رقابت، تقسیم کار پیدا کنند",
      "در انتخاب‌های روزانه باید هم‌زمان دیده شوند",
      "در یک موقعیت ملموس باید به توافقی عملی برسند",
      "در زندگی جاری باید بدون حذف هم حرکت کنند",
    ],
  },
  {
    source: "معمولاً بیش از یک انگیزه هم‌زمان فعال است و تصمیم اینجا روی چند بخش تجربه اثر می‌گذارد.",
    variants: [
      "چند خواسته با هم بالا می‌آیند و یک انتخاب کوچک می‌تواند بیشتر از یک بخش زندگی را تکان بدهد.",
      "ممکن است هم‌زمان دو نیاز متفاوت را حس کنی و نتیجهٔ همان تصمیم در چند جای زندگی دیده شود.",
      "در چنین صحنه‌ای یک انگیزه تنها نیست؛ چند نیاز با هم وارد تصمیم می‌شوند.",
      "یک انتخاب ظاهراً ساده می‌تواند هم‌زمان روی احساس، رابطه یا برنامهٔ روزانه اثر بگذارد.",
      "اغلب چند دلیل با هم تو را هل می‌دهند و لازم است ببینی کدامشان واقعاً اولویت دارد.",
      "ممکن است تصمیم از یک موضوع شروع شود اما اثرش به چند حوزهٔ دیگر هم برسد.",
      "در عمل چند میل با هم فعال می‌شوند و روشن‌کردن خواستهٔ اصلی تصمیم را ساده‌تر می‌کند.",
      "چند انگیزه می‌توانند هم‌زمان وارد صحنه شوند، برای همین یک پاسخ واحد همیشه کافی نیست.",
      "در این موقعیت معمولاً فقط یک نیاز حرف نمی‌زند و انتخاب نهایی روی چند تجربه اثر می‌گذارد.",
      "ممکن است یک اتفاق کوچک چند بخش از زندگی را با هم درگیر کند و اولویت‌بندی لازم شود.",
      "در یک موقعیت معمولی چند خواسته کنار هم ظاهر می‌شوند و انتخاب تو دامنه‌ای بزرگ‌تر از خود صحنه پیدا می‌کند.",
      "اغلب بیش از یک دلیل پشت واکنش هست و دیدن همهٔ آن‌ها انتخاب را دقیق‌تر می‌کند.",
    ],
  },
  {
    source: "این رابطه به‌دلیل درگیری حاکم چارت وزن بیشتری دارد",
    variants: [
      "درگیری سیارهٔ راهبر، وزن این تماس را در همین چارت بیشتر می‌کند",
      "حضور سیارهٔ راهبر باعث می‌شود این رابطه شخصی‌تر از یک تماس فرعی باشد",
      "این تماس به‌خاطر حضور سیارهٔ راهبر در لایه‌های بیشتری از گزارش دیده می‌شود",
      "نقش سیارهٔ راهبر باعث می‌شود این رابطه زودتر وارد تصمیم‌های شخصی شود",
      "این ارتباط با حضور سیارهٔ راهبر برجستگی بیشتری پیدا می‌کند",
      "چون سیارهٔ راهبر درگیر است، اثر این تماس در چند لایهٔ چارت تکرار می‌شود",
      "پیوند با سیارهٔ راهبر این تماس را از یک جزئیات حاشیه‌ای مهم‌تر می‌کند",
      "در این چارت، حضور سیارهٔ راهبر به این رابطه وزن اضافه می‌کند",
      "این تماس از راه سیارهٔ راهبر به بخش‌های بیشتری از تجربه وصل می‌شود",
      "درگیری سیارهٔ راهبر نشان می‌دهد این تماس سهم بیشتری در روایت کلی دارد",
    ],
  },
  {
    source: "بدن و احساس پیش از تصمیم شناخته شوند",
    variants: [
      "پیش از تصمیم، اول واکنش بدن و نام احساس روشن شود",
      "قبل از انتخاب، فرق حس بدنی با برداشت ذهنی مشخص شود",
      "تصمیم بعد از یک مکث کوتاه برای شناخت احساس گرفته شود",
      "اول حال بدنی و عاطفی دیده شود و بعد تصمیم جلو برود",
      "پیش از پاسخ، احساس حاضر و نیاز پشت آن از هم جدا شوند",
      "بدن فرصت پیدا کند علامتش را بدهد و بعد انتخاب انجام شود",
    ],
  },
  {
    source: "نیاز واقعی زودتر از واکنش لحظه‌ای شناخته شود",
    variants: [
      "نیاز اصلی پیش از واکنش فوری نام گرفته شود",
      "اول معلوم شود پشت واکنش سریع چه نیازی قرار دارد",
      "نیاز پایدار از حال لحظه‌ای جدا شود",
      "پیش از جواب فوری، خواستهٔ واقعی روشن شود",
      "فرق نیاز اصلی با موج کوتاه احساس دیده شود",
      "آنچه واقعاً لازم است زودتر از واکنش آنی تشخیص داده شود",
    ],
  },
  {
    source: "خواستن یا خشم پیش از اقدام یک دور درونی پیدا می‌کند",
    variants: [
      "خواستن یا خشم قبل از عمل یک‌بار درون خودت مرور می‌شود",
      "میل به اقدام پیش از بیرون‌آمدن ابتدا درونت بررسی می‌شود",
      "خشم یا خواسته ممکن است قبل از پاسخ بیرونی مدتی درونت بچرخد",
      "پیش از اقدام، خواسته و ناراحتی یک مرحلهٔ درونی را طی می‌کنند",
      "واکنش بیرونی معمولاً بعد از یک بازبینی درونی شکل می‌گیرد",
      "قبل از حرکت، میل یا خشم فرصت پیدا می‌کند درونت دوباره سنجیده شود",
    ],
  },
  {
    source: "پیش از نتیجه‌گیری، احساس و نیاز را جداگانه نام ببر",
    variants: [
      "قبل از نتیجه‌گیری، اسم احساس و نیاز را جدا از هم مشخص کن",
      "پیش از تصمیم نهایی، یک‌بار احساس حاضر و نیاز اصلی را جدا بنویس",
      "قبل از پاسخ، فرق چیزی که حس می‌کنی با چیزی که لازم داری روشن کن",
      "پیش از جمع‌بندی، احساس لحظه‌ای را از نیاز پایدار جدا کن",
      "قبل از انتخاب، برای خودت دو کلمه جدا بنویس: احساس و نیاز",
      "پیش از نتیجه گرفتن، نیاز اصلی را جدا از موج احساسی نام ببر",
    ],
  },
  {
    source: "در چنین وضعی حال لحظه‌ای یا دفاع عاطفی به‌جای نیاز اصلی تصمیم بگیرد",
    variants: [
      "آن‌وقت حال لحظه‌ای ممکن است جای نیاز اصلی تصمیم بگیرد",
      "در این وضعیت دفاع عاطفی می‌تواند خواستهٔ اصلی را از صحنه بیرون ببرد",
      "اینجا واکنش فوری ممکن است قبل از نیاز پایدار فرمان را دست بگیرد",
      "در چنین لحظه‌ای حال زودگذر می‌تواند مسیر انتخاب را تعیین کند",
      "آن‌وقت دفاع عاطفی ممکن است صدای نیاز اصلی را کم‌رنگ کند",
      "در این حالت انتخاب ممکن است بیشتر از واکنش لحظه‌ای بیاید تا از نیاز واقعی",
    ],
  },
  {
    source: "پس‌روی مریخ بخشی از این تعامل را پیش از بیان بیرونی به بازبینی درونی برمی‌گرداند",
    variants: [
      "پس‌روی مریخ بخشی از این واکنش را قبل از بیان به بررسی درونی می‌برد",
      "مریخ پس‌رو باعث می‌شود بخشی از پاسخ پیش از بیرون‌آمدن درونت دوباره سنجیده شود",
      "با مریخ پس‌رو، بخشی از این تعامل پیش از عمل یک مرحلهٔ بازبینی درونی دارد",
      "پس‌روی مریخ واکنش را پیش از بیان بیرونی برای لحظه‌ای به درون برمی‌گرداند",
      "در این تماس، مریخ پس‌رو بخشی از حرکت را قبل از بروز بیرونی دوباره بررسی می‌کند",
      "مریخ پس‌رو باعث می‌شود پاسخ بیرونی بعد از یک دور سنجش درونی شکل بگیرد",
    ],
  },

  {
    source: "چند نیاز می‌توانند روی همان میدان جمع شوند",
    variants: [
      "چند خواسته ممکن است هم‌زمان در همین حوزه سهم بخواهند",
      "بیش از یک نیاز می‌تواند هم‌زمان وارد همین تصمیم شود",
      "چند انگیزه ممکن است در همین موقعیت کنار هم فعال شوند",
      "دو یا چند خواسته می‌توانند هم‌زمان جهت این انتخاب را بکشند",
      "این حوزه گاهی چند نیاز را در یک تصمیم جمع می‌کند",
      "در این موقعیت ممکن است بیش از یک اولویت هم‌زمان فعال باشد",
    ],
  },
  {
    source: "به توان متمرکز تبدیل می‌شود",
    variants: [
      "تمرکز بیشتری پیدا می‌کند",
      "به نیرویی قابل استفاده‌تر تبدیل می‌شود",
      "در یک مسیر مشخص جمع می‌شود",
      "می‌تواند به ظرفیت عملی‌تری برسد",
      "به شکل منسجم‌تری خودش را نشان می‌دهد",
      "از حالت پراکنده به نیرویی جهت‌دار می‌رسد",
    ],
  },
  {
    source: "می‌تواند سریع‌تر و شدیدتر شود",
    variants: [
      "ممکن است زودتر خودش را نشان بدهد",
      "می‌تواند با شدت بیشتری وارد واکنش شود",
      "ممکن است بدون فاصلهٔ کافی پررنگ شود",
      "می‌تواند سریع‌تر از فرصت تنظیم جلو بیفتد",
      "ممکن است دامنهٔ بیشتری پیدا کند",
      "می‌تواند پیش از بازبینی کامل پررنگ شود",
    ],
  },
  {
    source: "در این چارت، حضور سیارهٔ راهبر به این رابطه وزن اضافه می‌کند",
    variants: [
      "حضور سیارهٔ راهبر باعث می‌شود این تماس در روایت کلی سهم بیشتری داشته باشد",
      "چون سیارهٔ راهبر در این تماس حاضر است، اثرش در چند لایهٔ دیگر هم شنیده می‌شود",
      "درگیری سیارهٔ راهبر این رابطه را به یکی از پیوندهای مهم‌تر چارت تبدیل می‌کند",
      "این تماس با حضور سیارهٔ راهبر از یک رابطهٔ فرعی فراتر می‌رود",
      "نقش سیارهٔ راهبر باعث می‌شود این پیوند وزن روایی بیشتری بگیرد",
      "حضور راهبر چارت این تماس را به بخش‌های بیشتری از روایت وصل می‌کند",
    ],
  },
  {
    source: "چون فشار فوری کم است",
    variants: [
      "؛ با فشار فوری کمتر،",
      "؛ در نبود الزام فوری،",
      "؛ با تنش مستقیم کمتر،",
      "؛ وقتی این تماس بدون فشار مستقیم عمل می‌کند،",
      "؛ به‌دلیل نرم‌تر بودن فشار این رابطه،",
      "؛ وقتی این پیوند واکنش فوری طلب نمی‌کند،",
    ],
  },
  {
    source: "ممکن است دیده نشود تا فرصت استفاده‌نشده بماند",
    variants: [
      "ممکن است تا زمانی که آگاهانه به کار گرفته نشود پنهان بماند",
      "ممکن است بدون استفادهٔ عمدی به ظرفیت خام تبدیل شود",
      "ممکن است فرصت آن دیرتر از چیزی که هست دیده شود",
      "ممکن است فقط با تمرین آگاهانه از حالت امکان بیرون بیاید",
      "ممکن است در پس‌زمینه بماند و به خروجی نرسد",
      "ممکن است تا وقتی به عمل وصل نشود کمتر به چشم بیاید",
    ],
  },
  {
    source: "وقتی پایدارتر می‌شود که",
    variants: [
      "و پایداری بیشتر زمانی شکل می‌گیرد که",
      "و شکل قابل اتکاتر آن جایی است که",
      "و نتیجه زمانی ماندگارتر می‌شود که",
      "و این تماس وقتی بهتر جا می‌افتد که",
      "و تعادل بیشتر زمانی ساخته می‌شود که",
      "و مسیر سازنده‌تر جایی باز می‌شود که",
    ],
  },
  {
    source: "انتخابی که از ارزش و خواست واقعی خودت می‌آید روشن‌تر شود",
    variants: [
      "انتخاب شخصی از واکنش به نگاه دیگران جدا بماند",
      "ترجیح واقعی خودت پیش از پاسخ بیرونی روشن شود",
      "جهت انتخاب از ارزش شخصی بیاید نه از اثبات خود",
      "خواست واقعی پیش از سازگار شدن با نگاه بیرونی نام برده شود",
      "ارزش شخصی در تصمیم سهمی روشن و قابل دیدن داشته باشد",
      "انتخاب نهایی با چیزی که واقعاً می‌خواهی هماهنگ بماند",
    ],
  },
  {
    source: "پیش از جواب فوری، خواستهٔ واقعی روشن شود",
    variants: [
      "پیش از پاسخ سریع، نیاز اصلی فرصت نام‌گرفتن پیدا کند",
      "قبل از جواب، خواستهٔ اصلی از واکنش لحظه‌ای جدا شود",
      "نیاز واقعی پیش از بستن تصمیم روشن شود",
      "پاسخ بعد از مشخص شدن خواستهٔ اصلی شکل بگیرد",
      "اول نیاز اصلی روشن شود و بعد پاسخ بیرونی بیاید",
      "پیش از واکنش، معلوم شود دقیقاً چه چیزی لازم داری",
    ],
  },
  {
    source: "فرق نیاز اصلی با موج کوتاه احساس دیده شود",
    variants: [
      "نیاز پایدار از حال زودگذر جدا دیده شود",
      "موج احساس با خواستهٔ اصلی یکی گرفته نشود",
      "احساس لحظه‌ای از نیاز ماندگار تفکیک شود",
      "نیاز اصلی زیر شدت احساس گم نشود",
      "فرق واکنش کوتاه با نیاز واقعی روشن بماند",
      "احساس حاضر و نیاز اصلی دو چیز جدا دیده شوند",
    ],
  },] as const;

const REMOVABLE_GENERIC_CLAUSES: readonly string[] = [
  "در این ترکیب،",
  "در عمل این خانه یک میدان مشترک می‌سازد:",
  "زیر فشار، چند نیاز می‌توانند روی همان میدان جمع شوند؛",
  "جریان میان دو نیرو روان‌تر است و ظرفیت موجود راحت‌تر در دسترس قرار می‌گیرد",
  "استفادهٔ آگاهانه از این روانی می‌تواند یک توان موجود را به خروجی واقعی تبدیل کند",
  "آسانی ممکن است باعث شود امکان موجود بدیهی فرض شود و کمتر به کار گرفته شود",
  "دو نیرو در یک میدان جمع می‌شوند و موضوع را فشرده‌تر و فوری‌تر می‌کنند",
  "تمرکز روی یک اولویت می‌تواند انرژی تماس را یکپارچه کند",
  "نزدیکی زیاد ممکن است فاصلهٔ لازم برای دیدن انتخاب‌های دیگر را کم کند",
] as const;

function stripLeadingScaffolds(value: string): string {
  let text = normalizeText(value);
  const scaffolds = [
    ...REPORT_SURFACE_PATTERNS.map((pattern) => pattern.prefix),
    ...EXTRA_LEADING_SCAFFOLDS,
  ].sort((left, right) => right.length - left.length);
  let changed = true;
  while (changed && text) {
    changed = false;
    for (const scaffold of scaffolds) {
      const forms = [scaffold, scaffold.replace(/[،؛:.]+$/u, "")].filter(Boolean);
      const matched = forms.find((form) => text.startsWith(form));
      if (!matched) continue;
      text = text.slice(matched.length).replace(/^[\s،؛:.-]+/u, "").trim();
      changed = true;
      break;
    }
  }
  return text;
}

function rewriteRepeatedPhrases(
  value: string,
  input: { semanticKey: string; purpose: ReportSurfacePurpose; sequenceIndex?: number },
): string {
  let text = value;
  const baseIndex = (input.sequenceIndex ?? 0) + PURPOSE_ORDINAL[input.purpose];
  for (const group of REPEATED_PHRASE_VARIANTS) {
    const forms = [group.source, group.source.replace(/[،؛:.]+$/u, "")].filter(Boolean);
    const matched = forms.find((form) => text.includes(form));
    if (!matched) continue;
    const variantIndex = (baseIndex + stableHash(`${input.semanticKey}:${group.source}`)) % group.variants.length;
    text = text.split(matched).join(group.variants[variantIndex]);
  }
  for (const clause of REMOVABLE_GENERIC_CLAUSES) {
    const forms = [clause, clause.replace(/[،؛:.]+$/u, "")].filter(Boolean);
    for (const form of forms) text = text.split(form).join("");
  }
  return normalizeText(text)
    .replace(/\s+([،؛.!؟])/gu, "$1")
    .replace(/([؛،])\s*([؛،])/gu, "$1")
    .replace(/^[:؛،.\s]+/u, "")
    .trim();
}

export function normalizeReportNarrativeForSurface(
  value: string,
  input: { semanticKey: string; purpose: ReportSurfacePurpose; sequenceIndex?: number },
): string {
  return rewriteRepeatedPhrases(stripLeadingScaffolds(value), input);
}

export function getReportSurfacePatternCount(): number {
  return REPORT_SURFACE_PATTERNS.length;
}

export function selectReportSurfacePattern(input: {
  reportKey: string;
  semanticKey: string;
  purpose: ReportSurfacePurpose;
  sequenceIndex?: number;
  avoidFamily?: string | null;
}): ReportSurfacePattern {
  const patterns = patternsForPurpose(input.purpose);
  if (patterns.length === 0) {
    throw new Error(`No report surface patterns for purpose ${input.purpose}.`);
  }

  const families = [...new Set(patterns.map((pattern) => pattern.family))];
  const baseFamilyIndex = stableHash(`${input.reportKey}:${input.purpose}`) % families.length;
  let familyIndex = (baseFamilyIndex + (input.sequenceIndex ?? 0)) % families.length;
  if (families[familyIndex] === input.avoidFamily && families.length > 1) {
    familyIndex = (familyIndex + 1) % families.length;
  }
  const family = families[familyIndex];
  const variants = patterns.filter((pattern) => pattern.family === family);
  const variantIndex = stableHash(input.semanticKey) % variants.length;
  return variants[variantIndex];
}

export function realizeReportSurfaceText(
  value: string,
  input: {
    reportKey: string;
    semanticKey: string;
    purpose: ReportSurfacePurpose;
    sequenceIndex?: number;
    avoidFamily?: string | null;
    presentation?: ReportSurfacePresentation;
  },
): ReportSurfaceRealization {
  const text = normalizeReportNarrativeForSurface(value, input);
  if (!text) {
    return {
      text: "",
      patternId: "empty",
      family: "empty",
      purpose: input.purpose,
      semanticKey: input.semanticKey,
    };
  }

  const pattern = selectReportSurfacePattern(input);
  const surfaced = input.presentation === "direct"
    ? text
    : text.startsWith(pattern.prefix)
      ? text
      : `${pattern.prefix} ${text}`;
  return {
    text: surfaced,
    patternId: pattern.id,
    family: pattern.family,
    purpose: input.purpose,
    semanticKey: input.semanticKey,
  };
}

export function planReportSurfaceSequence(
  reportKey: string,
  blocks: readonly ReportSurfaceBlock[],
): ReportSurfaceRealization[] {
  const output: ReportSurfaceRealization[] = [];
  let previousFamily: string | null = null;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const realized = realizeReportSurfaceText(block.text, {
      reportKey,
      semanticKey: block.semanticKey,
      purpose: block.purpose,
      sequenceIndex: index,
      avoidFamily: previousFamily,
    });
    output.push(realized);
    if (realized.family !== "empty") previousFamily = realized.family;
  }
  return output;
}

function tokens(value: string): string[] {
  return normalizeText(value)
    .replace(/[.،؛:!?؟«»()\[\]{}\-–—]/gu, " ")
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter(Boolean);
}

export type ReportRepetitionFinding = {
  fragment: string;
  owners: string[];
};

export type ReportRepetitionMetrics = {
  repeatedThreeWordStarts: ReportRepetitionFinding[];
  adjacentFiveWordStarts: ReportRepetitionFinding[];
  repeatedFiveTokenFragments: ReportRepetitionFinding[];
  repeatedSixTokenFragments: ReportRepetitionFinding[];
  duplicateFullTexts: ReportRepetitionFinding[];
};

export function analyzeReportNarrativeRepetition(
  blocks: readonly { id: string; text: string; facet?: ReportNarrativeFacet }[],
): ReportRepetitionMetrics {
  const normalized = blocks
    .filter((block) => block.facet !== "technical")
    .map((block) => ({ id: block.id, text: normalizeText(block.text), tokens: tokens(block.text) }))
    .filter((block) => block.tokens.length > 0);

  const start3 = new Map<string, string[]>();
  const full = new Map<string, string[]>();
  const ngrams5 = new Map<string, Set<string>>();
  const ngrams6 = new Map<string, Set<string>>();

  for (const block of normalized) {
    if (block.tokens.length >= 3) {
      const key = block.tokens.slice(0, 3).join(" ");
      start3.set(key, [...(start3.get(key) ?? []), block.id]);
    }
    full.set(block.text, [...(full.get(block.text) ?? []), block.id]);
    for (let index = 0; index <= block.tokens.length - 5; index += 1) {
      const fragment = block.tokens.slice(index, index + 5).join(" ");
      const owners = ngrams5.get(fragment) ?? new Set<string>();
      owners.add(block.id);
      ngrams5.set(fragment, owners);
    }
    for (let index = 0; index <= block.tokens.length - 6; index += 1) {
      const fragment = block.tokens.slice(index, index + 6).join(" ");
      const owners = ngrams6.get(fragment) ?? new Set<string>();
      owners.add(block.id);
      ngrams6.set(fragment, owners);
    }
  }

  const adjacentFiveWordStarts: ReportRepetitionFinding[] = [];
  for (let index = 1; index < normalized.length; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    if (previous.tokens.length < 5 || current.tokens.length < 5) continue;
    const previousStart = previous.tokens.slice(0, 5).join(" ");
    const currentStart = current.tokens.slice(0, 5).join(" ");
    if (previousStart === currentStart) {
      adjacentFiveWordStarts.push({ fragment: currentStart, owners: [previous.id, current.id] });
    }
  }

  return {
    repeatedThreeWordStarts: [...start3.entries()]
      .filter(([, owners]) => owners.length > 1)
      .map(([fragment, owners]) => ({ fragment, owners })),
    adjacentFiveWordStarts,
    repeatedFiveTokenFragments: [...ngrams5.entries()]
      .filter(([, owners]) => owners.size > 1)
      .map(([fragment, owners]) => ({ fragment, owners: [...owners] })),
    repeatedSixTokenFragments: [...ngrams6.entries()]
      .filter(([, owners]) => owners.size > 1)
      .map(([fragment, owners]) => ({ fragment, owners: [...owners] })),
    duplicateFullTexts: [...full.entries()]
      .filter(([, owners]) => owners.length > 1)
      .map(([fragment, owners]) => ({ fragment, owners })),
  };
}
