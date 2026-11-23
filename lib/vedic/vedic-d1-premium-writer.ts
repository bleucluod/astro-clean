/**
 * Server-side D1 *private draft* generator. Never import from the free route,
 * free builder or a client component. Persistence and entitlement are separate
 * subsequent steps. All interpretation is symbolic, conditional, and traceable
 * to validated sidereal D1 placements; no aspects, dashas or D9 are invented.
 */
import type { VedicD1PlacementId } from './vedic-d1-contract.ts';
import type { VedicD1AssembledChart } from './vedic-d1-assembly.ts';
import { buildVedicD1NorthView, VEDIC_D1_BODIES_FA, VEDIC_D1_SIGNS_FA,
  type VedicD1NorthPlacementRow } from './vedic-d1-north-layout.ts';
import { VEDIC_D1_PREMIUM_CHAPTERS, type VedicD1FactualEvidence } from './vedic-d1-reading-contract.ts';
import { VEDIC_D1_PRIVATE_MANUSCRIPT_VERSION, VEDIC_D1_WRITER_RULES_VERSION,
  type VedicD1PremiumChapter, type VedicD1PrivateManuscriptDraft } from './vedic-d1-premium-contract.ts';

type ClassicalRuler = Exclude<VedicD1PlacementId, 'rahu' | 'ketu'>;
// Traditional seven-planet sign rulers. Rahu/Ketu never rule the ascendant here.
const RULERS: readonly ClassicalRuler[] = [
  'mars', 'venus', 'mercury', 'moon', 'sun', 'mercury',
  'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter',
];
const SIGN_VOICE = [
  'پیش‌قدم‌شدن و پیدا کردن راهی برای آغاز حرکت',
  'آهسته ساختنِ حس امنیت و وفادار ماندن به ارزش‌های شخصی',
  'پرسشگری، یاد گرفتن و کنار هم گذاشتن چند روایت',
  'مراقبت از پیوندها و ساختن یک جای امن عاطفی',
  'خلاقانه دیده‌شدن و روشن کردن چیزی که برایت عزیز است',
  'دقت، سامان دادن و بهتر کردن کارهای نیمه‌تمام',
  'شنیدن دو سوی ماجرا و جست‌وجوی تعادل در رابطه',
  'رفتن زیر سطح اتفاق‌ها و جدی گرفتن دگرگونی',
  'گسترش افق، یادگیری از تجربه و دنبال کردن معنا',
  'ساختن چیزی ماندگار با صبر و مسئولیت',
  'دیدن الگوهای متفاوت و آزمودن راه‌های تازه',
  'همدلی، خیال و پذیرفتن لایه‌های ظریف تجربه',
] as const;
const HOUSE_AREAS = [
  'تصویر شخصی، حضور و شیوهٔ شروع کردن',
  'منابع، داشته‌ها و ارزش‌هایی که به آن‌ها تکیه می‌کنی',
  'گفت‌وگو، مهارت و تجربه‌های نزدیک روزمره',
  'ریشه‌ها، خانه و حس تعلق',
  'آفرینش، بازی و شیوهٔ بیان خود',
  'عادت‌ها، کار روزانه و رسیدگی به جزئیات',
  'مشارکت و رابطهٔ یک‌به‌یک',
  'تغییر، اعتماد و منابع مشترک',
  'جست‌وجوی معنا، آموزش و چشم‌انداز دورتر',
  'نقش اجتماعی، مسئولیت و مسیر فعالیت',
  'دوستی‌ها، جمع و افق‌های مشترک',
  'خلوت، استراحت و چیزهایی که به توجه درونی نیاز دارند',
] as const;
const BODY_SYMBOLS: Readonly<Record<VedicD1PlacementId, string>> = {
  sun: 'حس جهت و شیوهٔ روشن کردن اولویت‌ها',
  moon: 'پاسخ عاطفی و نیاز به آشنایی و آرامش',
  mars: 'انرژیِ اقدام و روبه‌رو شدن با مانع',
  mercury: 'پرسیدن، یاد گرفتن و به زبان آوردن تجربه',
  jupiter: 'گسترش دید، معنا و آموزش',
  venus: 'ارزش، لذت و شیوهٔ پیوند گرفتن',
  saturn: 'ساختار، مرز و پایداری در زمان',
  rahu: 'کشش به تجربه‌های ناآشنا در نمادپردازی ودیک',
  ketu: 'فاصله گرفتن و بازنگری در الگوهای آشنا در نمادپردازی ودیک',
};

/**
 * Chapter 1 editorial motifs. These are interpretive vocabulary, not
 * planet strengths, deterministic life claims, or ephemeris calculations.
 */
/**
 * Reader-facing English zodiac names in Persian script. Chapter 1 only:
 * other chapters await their own editorial review.
 */
const CHAPTER1_ZODIAC = [
  'اریس', 'تارس', 'جمنای', 'کنسر', 'لیو', 'ویرگو',
  'لیبرا', 'اسکورپیو', 'سجیتریس', 'کپریکورن', 'آکواریوس', 'پایسیز',
] as const;

// Illustrations are everyday examples, not claims that a person has done them.
const CHAPTER1_SIGN_LIFE = [
  'مثلاً وقتی قرار است یک کار تازه راه بیفتد، از این زاویه مهم‌ترین بخش همان قدم اول است؛ نوشتن اولین پیام، تماس گرفتن یا امتحان کردن نسخهٔ اولیه.',
  'مثلاً در انتخاب یک وسیلهٔ مهم یا تصمیم برای خرج کردن، این نگاه کیفیت، دوام و ارزشِ بلندمدت را جلوتر از هیجان لحظه می‌گذارد.',
  'مثلاً در یک جلسه که چند نظر متفاوت مطرح می‌شود، این نگاه از سؤال پرسیدن و وصل کردن حرف‌ها به هم شروع می‌کند.',
  'مثلاً وقتی خانه یا جمع دوستان به‌هم ریخته است، این نگاه ابتدا دنبال فضایی می‌گردد که آدم‌ها دوباره در آن احساس نزدیکی و امنیت کنند.',
  'مثلاً اگر قرار باشد کاری را به جمع معرفی کنی، این نگاه روی شکل ارائه و نشانی که از خودت باقی می‌گذاری تمرکز می‌کند.',
  'مثلاً موقع برنامه‌ریزی سفر یا تحویل یک پروژه، این نگاه جزئیات جاافتاده را پیدا می‌کند؛ همان نکته‌ای که بعداً می‌تواند کل برنامه را روان‌تر کند.',
  'مثلاً وقتی در یک گفت‌وگوی دونفره اختلاف نظر پیش می‌آید، این نگاه دنبال حرفی می‌گردد که هم خواستهٔ خودت و هم طرف مقابل شنیده شود.',
  'مثلاً وقتی یک همکاری به بن‌بست می‌رسد، این نگاه پیش از تصمیم نهایی سراغ علتِ پنهانِ اختلاف و مرزهای اعتماد می‌رود.',
  'مثلاً وقتی فرصت یاد گرفتن مهارتی تازه پیش می‌آید، این نگاه اول تصویر بزرگ‌تر را می‌بیند: قرار است این تجربه چه دری را باز کند؟',
  'مثلاً برای رسیدن به یک هدف شش‌ماهه، این نگاه از تقسیم کار به قدم‌های هفتگی و ادامه دادن حتی در روزهای معمولی نیرو می‌گیرد.',
  'مثلاً وقتی همه یک راه مشخص را تکرار می‌کنند، این نگاه گزینهٔ متفاوتی روی میز می‌گذارد و آن را با دلیل توضیح می‌دهد.',
  'مثلاً وقتی کسی حرفش را کامل نمی‌زند، این نگاه به حال‌وهوا و حرف‌های نگفتهٔ او توجه می‌کند، اما برای تصمیم گرفتن به واقعیت هم برمی‌گردد.',
] as const;

const CHAPTER1_HOUSE_LIFE = [
  'مثلاً در اولین برخورد با یک تیم یا هنگام معرفی یک ایده، نحوهٔ شروعِ صحبت و حضورت نقش اصلی را دارد.',
  'مثلاً موقع بودجه بستن برای خرید یا انتخاب بین پس‌انداز و یک خواستهٔ فوری، این محور خودش را نشان می‌دهد.',
  'مثلاً در یاد گرفتن یک نرم‌افزار یا گفت‌وگوی روزانه با همکار، قدم‌های کوچک و تکرارشونده نتیجه را می‌سازند.',
  'مثلاً تصمیم برای جابه‌جایی خانه یا وقت گذاشتن برای خانواده، فقط یک برنامهٔ بیرونی نیست؛ پای حس تعلق هم وسط است.',
  'مثلاً وقتی می‌خواهی یک ویدئو، طرح، نوشته یا سرگرمی شخصی را به چیزی قابل ارائه تبدیل کنی، این محور فعال می‌شود.',
  'مثلاً وقتی حجم کار زیاد است و باید بین کارها اولویت بگذاری، داشتن یک روال قابل انجام از برنامهٔ بی‌نقص مهم‌تر است.',
  'مثلاً وقتی قرار است با یک دوست یا همکار روی کاری توافق کنی، کیفیتِ شنیدن و روشن کردن توقعات نتیجه را عوض می‌کند.',
  'مثلاً وقتی یک خرج مشترک یا تعهد مهم پیش می‌آید، بهتر است دربارهٔ مسئولیت‌ها و حد و مرزها دقیق حرف بزنی.',
  'مثلاً وقتی برای ادامهٔ تحصیل یا رفتن به یک دوره تصمیم می‌گیری، پرسش اصلی فقط مدرک نیست؛ معنای این مسیر برای تو هم مهم است.',
  'مثلاً وقتی یک مسئولیت کاری تازه قبول می‌کنی، باید بین نتیجه‌ای که می‌خواهی دیده شود و زمانی که واقعاً داری تعادل بسازی.',
  'مثلاً در برنامه‌ریزی یک کار گروهی، آدم‌های اطرافت و هدف مشترک به اندازهٔ توان فردی اهمیت پیدا می‌کنند.',
  'مثلاً بعد از چند روز شلوغ، وقت تنهایی و جمع‌کردن فکرها می‌تواند بخشی از برنامه باشد، نه کاری که همیشه عقب می‌افتد.',
] as const;

const CHAPTER1_PLANET_LIFE: Readonly<Record<ClassicalRuler, string>> = {
  sun: 'مثل وقتی در جمع باید مشخص کنی چه چیزی برایت مهم است و مسئولیت تصمیم نهایی را بپذیری.',
  moon: 'مثل وقتی قبل از جواب دادن به یک پیام ناراحت‌کننده، اول لازم داری احساس خودت را بشناسی.',
  mars: 'مثل وقتی کار گیر کرده و به‌جای بحث طولانی، شروع می‌کنی گره را یکی‌یکی باز کردن.',
  mercury: 'مثل وقتی برای یک ایده فهرست می‌سازی، اطلاعات را جمع می‌کنی و بعد آن را برای دیگری توضیح می‌دهی.',
  jupiter: 'مثل وقتی میان دو انتخاب، فقط نتیجهٔ فوری را نمی‌بینی و دنبال چیزی می‌گردی که به رشدت کمک کند.',
  venus: 'مثل وقتی برای چیدن یک فضا یا ساختن رابطه‌ای صمیمی، به کیفیت و احساسِ آدم‌ها توجه می‌کنی.',
  saturn: 'مثل وقتی برای یک هدف بلندمدت زمان می‌گذاری، حتی اگر نتیجه‌اش همین هفته دیده نشود.',
};

const CHAPTER1_HOUSE_ACTION = [
  'خودت را به یک جمع تازه معرفی کنی',
  'برای یک خرید مهم بودجه ببندی',
  'مهارتی را تمرین کنی و به دیگری یاد بدهی',
  'دربارهٔ خانه یا خانواده تصمیم بگیری',
  'یک طرح، نوشته یا ویدئو را آمادهٔ ارائه کنی',
  'برای کارهای شلوغ روزت اولویت تعیین کنی',
  'با دوست یا همکارت دربارهٔ یک همکاری به توافق برسی',
  'دربارهٔ یک هزینه یا تعهد مشترک تصمیم بگیری',
  'برای یاد گرفتن یک مهارت تازه برنامه بریزی',
  'مسئولیت کاری جدیدی را قبول کنی',
  'برای یک پروژهٔ گروهی هدف مشترکی مشخص کنی',
  'برای استراحت و جمع‌وجور کردن فکرها وقت بگذاری',
] as const;

const CHAPTER1_NEXT_STEP = [
  'در اولین برخورد با یک جمع، یک جملهٔ کوتاه برای معرفیِ روشنِ خواسته‌ات آماده کن.',
  'پیش از یک خرید مهم، سه چیز را بنویس: نیاز اصلی، بودجه و چیزی که حاضر نیستی از آن بگذری.',
  'برای مهارتی که دوست داری یاد بگیری، یک تمرین ده‌دقیقه‌ای انتخاب کن و همان را تکرار کن.',
  'در تصمیمی مربوط به خانه یا خانواده، خواستهٔ خودت را کنار نیاز بقیه به زبان بیاور.',
  'از ایده‌ای که مدت‌ها در ذهنت مانده، یک نسخهٔ کوچک و قابل نشان دادن بساز.',
  'از میان فهرست کارها، فقط یک مورد را انتخاب کن که همین امروز می‌شود کاملش کرد.',
  'در یک همکاری، قبل از شروع دربارهٔ وظیفه‌ها و انتظارهای دوطرفه حرف بزن.',
  'در تصمیمی دربارهٔ پول یا مسئولیت مشترک، سهم هر نفر را روشن و مکتوب کن.',
  'برای موضوعی که دوست داری بیشتر یاد بگیری، اولین منبع و زمان مطالعه را مشخص کن.',
  'برای یک مسئولیت کاری، نتیجهٔ قابل اندازه‌گیری و موعد تحویل تعیین کن.',
  'در یک کار گروهی، یک هدف مشترک و یک قدم مشخص برای هر نفر بنویس.',
  'برای آخر هفته، کمی زمان خالی بگذار که لازم نباشد هیچ کاری را به نتیجه برسانی.',
] as const;

const CHAPTER1_SIGN_START = [
  'قدم اول را سریع برمی‌داری',
  'قبل از شروع، دوام و ارزشِ انتخاب را می‌سنجی',
  'چند سؤال می‌پرسی و اطلاعات را کنار هم می‌گذاری',
  'اول حال‌وهوای آدم‌های درگیر را می‌سنجی',
  'فکر می‌کنی ایده را چطور معرفی کنی',
  'جزئیات جاافتاده را در یک چک‌لیست پیدا می‌کنی',
  'حرف دو طرف را می‌شنوی',
  'مسئله را از زیرِ ظاهرش بررسی می‌کنی',
  'اول هدف بزرگ‌تر را تصور می‌کنی',
  'قدم‌های کار را به چند بخش تقسیم می‌کنی',
  'یک مسیر متفاوت پیشنهاد می‌دهی',
  'ایده را با تصویر و احساسش تصور می‌کنی',
] as const;

const CHAPTER1_SIGN_CONTINUE = [
  'و بعد برای حفظ شتاب، یک کار کوچک را همان روز تمام می‌کنی',
  'و بعد آن را با ریتمی آرام اما پیوسته جلو می‌بری',
  'و بعد با یک گفت‌وگوی روشن، مسیر را مشخص می‌کنی',
  'و بعد فضایی امن برای ادامهٔ همکاری می‌سازی',
  'و بعد نسخه‌ای آمادهٔ ارائه درست می‌کنی',
  'و بعد با یک برنامهٔ ساده ایرادهایش را برطرف می‌کنی',
  'و بعد دربارهٔ توافق نهایی حرف می‌زنی',
  'و بعد مرزهای اعتماد و مسئولیت را روشن می‌کنی',
  'و بعد یادگیری را با یک تجربهٔ واقعی پیش می‌بری',
  'و بعد برای تمام کردنش زمان و مرحلهٔ مشخص می‌گذاری',
  'و بعد آن راه تازه را در مقیاس کوچک امتحان می‌کنی',
  'و بعد آن تصویر را به یک کار عملی تبدیل می‌کنی',
] as const;

const CHAPTER1_ZODIAC_BY_INDEX = (index: number): string => CHAPTER1_ZODIAC[index];

function chapterOneBodyFact(row: VedicD1NorthPlacementRow, id: string): VedicD1FactualEvidence {
  const sign = row.signIndex === null ? null : CHAPTER1_ZODIAC_BY_INDEX(row.signIndex);
  const house = row.houseNumber;
  const full = sign !== null && house !== null;
  const factFa = full
    ? VEDIC_D1_BODIES_FA[row.id] + ' در ' + sign + ' و خانهٔ ' + String(house) + ' قرار دارد.'
    : sign !== null
      ? VEDIC_D1_BODIES_FA[row.id] + ' در ' + sign + ' قرار دارد؛ خانهٔ آن مشخص نیست.'
      : 'نشان و خانهٔ ' + VEDIC_D1_BODIES_FA[row.id] + ' به مرز محاسباتی نزدیک است.';
  return evidence(id, 'placements.' + row.id + '.houseNumber', factFa, full, row.id);
}

function chapterOneName(value: string | undefined): string {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new Error('VEDIC_D1_DISPLAY_NAME_INVALID');
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length === 0 || name.length > 40 ||
      !/^[\p{L}\p{M}]+(?:[ \u200c-][\p{L}\p{M}]+)*$/u.test(name)) {
    throw new Error('VEDIC_D1_DISPLAY_NAME_INVALID');
  }
  return name;
}

type Row = VedicD1NorthPlacementRow;

function evidence(id: string, sourceField: string, factFa: string, certain: boolean,
  bodyId?: VedicD1PlacementId): VedicD1FactualEvidence {
  return { id, sourceField, status: certain ? 'certain' : 'near-boundary',
    factFa, ...(bodyId ? { bodyId } : {}) };
}
function bodyFact(row: Row, id: string): VedicD1FactualEvidence {
  const sign = row.signNameFa;
  const house = row.houseNumber;
  const full = sign !== null && house !== null;
  const fact = full
    ? VEDIC_D1_BODIES_FA[row.id] + ' در نشان ' + sign + ' و خانهٔ ' + String(house) + ' است.'
    : sign !== null
      ? VEDIC_D1_BODIES_FA[row.id] + ' در نشان ' + sign + ' است؛ خانهٔ قطعی قابل اتکا نیست.'
      : 'جایگاه ' + VEDIC_D1_BODIES_FA[row.id] + ' به مرز نشان نزدیک است؛ نشان و خانهٔ قطعی اعلام نمی‌شود.';
  return evidence(id, 'placements.' + row.id + '.houseNumber', fact, full, row.id);
}
function chapter(index: number, paragraphsFa: string[], facts: VedicD1FactualEvidence[]): VedicD1PremiumChapter {
  const definition = VEDIC_D1_PREMIUM_CHAPTERS[index];
  if (!definition || paragraphsFa.length < 4 || facts.length < 2 ||
      new Set(facts.map(fact => fact.id)).size !== facts.length ||
      paragraphsFa.some(p => p.trim().length < 70)) {
    throw new Error('VEDIC_D1_PREMIUM_CHAPTER_INCOMPLETE');
  }
  return { id: definition.id, title: definition.title, paragraphsFa, evidence: facts };
}

/** Uses the seven classical sign rulers, not Uranus/Neptune/Pluto or strength assumptions. */
export function buildVedicD1PrivateManuscriptDraft(
  chart: VedicD1AssembledChart,
  options: { displayName?: string } = {},
): VedicD1PrivateManuscriptDraft {
  const displayName = chapterOneName(options.displayName);
  const familiar = displayName ? displayName + '، ' : '';
  const view = buildVedicD1NorthView(chart); // Independently checks all 9 placements, houses and Moon classification.
  const rows = new Map(view.rows.map(row => [row.id, row]));
  const moon = rows.get('moon')!;
  const sun = rows.get('sun')!;
  const ascSign = view.canDrawHouses ? chart.ascendantSignIndex : null;
  const ascName = ascSign === null ? null : VEDIC_D1_SIGNS_FA[ascSign];
  const rulerId = ascSign === null ? null : RULERS[ascSign];
  const rulerRow = rulerId === null ? null : rows.get(rulerId)!;
  const rulerName = rulerId === null ? null : VEDIC_D1_BODIES_FA[rulerId];

  const rulerEvidence = rulerRow
    ? bodyFact(rulerRow, 'lagna-ruler-placement')
    : bodyFact(moon, 'lagna-uncertain-moon-reference');
  const ascEvidence = evidence('lagna-sign', 'ascendantSignIndex',
    ascName ? 'طالع ودیک در نشان ' + ascName + ' قرار دارد.' :
      'طالع نزدیک مرز دو نشان است؛ تعیین نشان و صاحب طالع قطعی نیست.',
    ascName !== null);
  // Existing shared evidence and ascName remain unchanged for chapters 2–4.
  const chapterOneRulerEvidence = rulerRow
    ? chapterOneBodyFact(rulerRow, 'lagna-ruler-placement')
    : chapterOneBodyFact(moon, 'lagna-uncertain-moon-reference');
  const chapterOneAscName = ascSign === null ? null : CHAPTER1_ZODIAC_BY_INDEX(ascSign);
  const chapterOneAscEvidence = evidence('lagna-sign', 'ascendantSignIndex',
    chapterOneAscName ? 'طالع در ' + chapterOneAscName + ' قرار دارد.' :
      'طالع نزدیک مرز دو نشان است و هنوز نمی‌شود یک نشان مشخص برای آن ثبت کرد.',
    chapterOneAscName !== null);
  const lordSafe = rulerRow !== null && rulerRow.houseNumber !== null && rulerRow.signIndex !== null;
  const firstHouseBodies = view.rows.filter(row =>
    row.houseNumber === 1 && row.signIndex !== null &&
    row.id !== 'rahu' && row.id !== 'ketu' && row.id !== rulerId);
  const firstHouseBody = firstHouseBodies[0] ?? null;
  const firstHouseFact = firstHouseBody ? chapterOneBodyFact(firstHouseBody, 'lagna-first-house-body') : null;
  const rulerHostId = rulerRow?.signIndex === null || rulerRow?.signIndex === undefined
    ? null : RULERS[rulerRow.signIndex];
  const hostRow = rulerHostId === null ? null : rows.get(rulerHostId)!;
  const hostFact = lordSafe && hostRow && rulerHostId !== rulerId
    ? chapterOneBodyFact(hostRow, 'lagna-ruler-sign-host') : null;
  const ascDegree = chapterOneAscName
    ? new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, useGrouping: false })
        .format(Math.trunc((chart.ascendantLongitude % 30) * 100) / 100)
    : null;
  const ascDegreeFact = chapterOneAscName && ascDegree !== null
    ? evidence('lagna-degree', 'ascendantLongitude',
        'طالع در درجهٔ ' + ascDegree + ' از ' + chapterOneAscName + ' قرار دارد.', true)
    : null;
  const chapterOneFacts: VedicD1FactualEvidence[] = [
    chapterOneAscEvidence, chapterOneRulerEvidence,
    ...(ascDegreeFact ? [ascDegreeFact] : []),
    ...(firstHouseFact ? [firstHouseFact] : []),
    ...(hostFact ? [hostFact] : []),
    ...(!chapterOneAscName ? [chapterOneBodyFact(sun, 'lagna-sun-alternative')] : []),
  ];

  const lagnaParagraphs = chapterOneAscName !== null && rulerId !== null && rulerRow !== null && rulerName !== null ? [
    familiar + 'طالعِ ودیکت در ' + chapterOneAscName + ' و درجهٔ ' + ascDegree + ' قرار دارد. ' +
      'محور این طالع، ' + SIGN_VOICE[ascSign!] + ' است. ' +
      CHAPTER1_SIGN_LIFE[ascSign!] +
      ' اینجا داستان از نحوهٔ شروع کردن تو آغاز می‌شود و با جایگاهِ صاحب طالع ادامه پیدا می‌کند.',
    lordSafe
      ? 'حاکم ' + chapterOneAscName + '، ' + rulerName + ' است. ' + rulerName + ' در ' +
        CHAPTER1_ZODIAC_BY_INDEX(rulerRow.signIndex!) + ' و خانهٔ ' + String(rulerRow.houseNumber) + ' قرار دارد. ' +
        'پس مسیرِ این طالع فقط به شروع‌های تو مربوط نیست؛ به ' + HOUSE_AREAS[rulerRow.houseNumber! - 1] + ' هم وصل می‌شود. ' +
        CHAPTER1_HOUSE_LIFE[rulerRow.houseNumber! - 1] + ' نقش ' + rulerName + ' در این ترکیب به ' +
        BODY_SYMBOLS[rulerId] + ' مربوط است. ' + CHAPTER1_PLANET_LIFE[rulerId]
      : 'حاکم ' + chapterOneAscName + '، ' + rulerName + ' است. ' + chapterOneRulerEvidence.factFa +
        ' چون نشان یا خانهٔ این سیاره دقیق مشخص نشده، مسیرش را به یک خانهٔ فرضی وصل نمی‌کنیم. ' +
        'برای خواندن بخشِ مطمئن چارت، از ویژگیِ ' + SIGN_VOICE[ascSign!] + ' شروع می‌کنیم. ' +
        CHAPTER1_SIGN_LIFE[ascSign!],
    lordSafe
      ? rulerRow.signIndex === ascSign
        ? 'یک نکتهٔ مهم این است که طالع و صاحب آن هر دو در ' + chapterOneAscName + ' هستند. ' +
          'یعنی موضوعِ ' + SIGN_VOICE[ascSign!] + ' هم در نحوهٔ شروع و هم در مسیر ادامه دادن تکرار می‌شود. ' +
          'مثلاً اگر برای کاری ذوق داشته باشی، همان روشی که شروعش کرده‌ای، در شکل ادامه دادن آن هم نقش پیدا می‌کند. ' +
          'این ترکیب از یک موضوع واحد دو بار حرف می‌زند، نه از دو شخصیت جدا.'
        : 'بین ' + chapterOneAscName + ' و ' + CHAPTER1_ZODIAC_BY_INDEX(rulerRow.signIndex!) + ' یک تفاوتِ جالب وجود دارد. ' +
          chapterOneAscName + ' روی ' + SIGN_VOICE[ascSign!] + ' تأکید می‌کند؛ اما صاحب طالع در ' +
          CHAPTER1_ZODIAC_BY_INDEX(rulerRow.signIndex!) + ' به سمت ' +
          SIGN_VOICE[rulerRow.signIndex!] + ' می‌رود. ' +
          'فرض کن می‌خواهی کاری را از صفر شروع کنی: اول ' + CHAPTER1_SIGN_START[ascSign!] +
          ' ' + CHAPTER1_SIGN_CONTINUE[rulerRow.signIndex!] +
          '. این ترکیب، یک شروعِ مشخص را به روشی برای ادامه دادن تبدیل می‌کند.'
      : 'داستانِ این طالع فعلاً از نشانِ ' + chapterOneAscName + ' شروع می‌شود. ' +
        'برای نمونه، ' + CHAPTER1_SIGN_LIFE[ascSign!] +
        ' خانه و نشانِ صاحب طالع را وارد این روایت نمی‌کنیم، چون در دادهٔ عددی روشن نیستند.',
    lordSafe && hostRow !== null && rulerHostId !== null
      ? rulerHostId === rulerId
        ? 'یک لایهٔ دیگر هم هست: ' + rulerName + ' در نشانی قرار گرفته که خودش حاکمِ آن است. ' +
          'در نتیجه، زنجیرهٔ صاحب طالع به همان سیاره برمی‌گردد و موضوعِ خانهٔ ' +
          String(rulerRow.houseNumber) + ' را پررنگ می‌کند. ' +
          CHAPTER1_HOUSE_LIFE[rulerRow.houseNumber! - 1] +
          ' این بخش با یک نشانهٔ مشخص از چارت ساخته شده، نه از یک فهرست عمومیِ ویژگی‌ها.'
        : 'برای فهمیدن قدمِ بعدی باید ببینیم حاکمِ نشانِ ' + CHAPTER1_ZODIAC_BY_INDEX(rulerRow.signIndex!) +
          ' کجاست. این حاکم ' + VEDIC_D1_BODIES_FA[rulerHostId] + ' است. ' + hostFact!.factFa +
          (hostRow.houseNumber !== null
            ? hostRow.houseNumber === rulerRow.houseNumber
              ? ' هر دو در خانهٔ ' + String(hostRow.houseNumber) + ' قرار گرفته‌اند. ' +
                'فرض کن می‌خواهی ' + CHAPTER1_HOUSE_ACTION[hostRow.houseNumber - 1] +
                '؛ اینجا صاحب طالع و حاکمِ نشان میزبانش، دو نقش متفاوت را در یک موضوع مشترک کنار هم می‌گذارند.'
              : ' اینجا موضوعِ خانهٔ ' + String(rulerRow.houseNumber) + ' با خانهٔ ' +
                String(hostRow.houseNumber) + ' به هم می‌رسد. ' +
                'فرض کن می‌خواهی ' + CHAPTER1_HOUSE_ACTION[rulerRow.houseNumber! - 1] +
                ' و در همان مسیر لازم است ' + CHAPTER1_HOUSE_ACTION[hostRow.houseNumber - 1] +
                '. این‌جا یک تصمیم شخصی با همکاری یا مسئولیتِ دیگری گره می‌خورد؛ هر دو باید در یک برنامهٔ واقعی جا شوند.'
            : ' خانهٔ این حاکم به مرز محاسباتی نزدیک است؛ پس در این بخش فقط رابطهٔ حاکمیتِ نشان را نگه می‌داریم.')
      : 'در همین حد، طالع و حاکمِ شناخته‌شده‌اش برای شروع خوانش کافی‌اند. ' +
        'هر جا خانهٔ دقیق روشن نباشد، مسیرِ تفسیر متوقف می‌شود تا معنیِ اشتباهی به یک موضوع روزمره نسبت داده نشود.',
    firstHouseBody !== null && firstHouseFact !== null
      ? 'خانهٔ اول یک نشانهٔ دیگر هم دارد: ' + firstHouseFact.factFa + ' ' +
        'این سیاره شیوهٔ حضورت را با موضوعِ ' + BODY_SYMBOLS[firstHouseBody.id] + ' ترکیب می‌کند. ' +
        (firstHouseBody.id === 'mars'
          ? 'مثلاً وقتی برنامه‌ای به‌هم می‌ریزد، این بخش از چارت واکنشِ «بیایید ببینیم مشکل کجاست و حلش کنیم» را به تصویر می‌کشد.'
          : CHAPTER1_PLANET_LIFE[firstHouseBody.id as ClassicalRuler]) +
        ' نقش این سیاره از صاحب طالع جداست، اما در همان تصویر کلی کنار آن قرار می‌گیرد.'
      : lordSafe && rulerRow.houseNumber === 1
        ? 'صاحب طالع در خانهٔ اول است؛ یعنی جای شروع و مسیر ادامه دادن به یک نقطه برمی‌گردند. ' +
          'وقتی قرار است با آدم‌های تازه آشنا شوی یا ایده‌ای را معرفی کنی، موضوعِ حضورِ خودت به مرکز ماجرا می‌آید. ' +
          'در این چارت سیارهٔ کلاسیکِ دیگری با جایگاه مطمئن در خانهٔ اول ثبت نشده است.'
        : 'در خانهٔ اول، سیارهٔ کلاسیکِ دیگری با جایگاه مشخص دیده نمی‌شود. ' +
          'پس برای خواندنِ شروع‌ها، خودِ نشانِ ' + chapterOneAscName + ' مهم است. ' +
          CHAPTER1_SIGN_LIFE[ascSign!] + ' بقیهٔ مسیر را جایگاهِ صاحب طالع روشن می‌کند.',
    lordSafe
      ? familiar + 'نخِ اصلی این فصل از ' + chapterOneAscName + ' به ' +
        CHAPTER1_ZODIAC_BY_INDEX(rulerRow.signIndex!) + ' و خانهٔ ' + String(rulerRow.houseNumber) + ' می‌رسد. ' +
        'یک طرف، ' + SIGN_VOICE[ascSign!] + ' است؛ طرف دیگر، ' +
        HOUSE_AREAS[rulerRow.houseNumber! - 1] + '. ' +
        'برای دیدن این ترکیب در زندگی معمولی، یک قدم کوچک کافی است: ' +
        CHAPTER1_NEXT_STEP[rulerRow.houseNumber! - 1] +
        ' این قدم، دقتِ شروع را به نتیجه‌ای واقعی وصل می‌کند؛ لازم نیست قبل از امتحان کردن، همهٔ جزئیات کامل شده باشند.'
      : familiar + 'خط اصلی این فصل، ' + chapterOneAscName + ' و شیوهٔ شروع کردنِ مربوط به آن است. ' +
        CHAPTER1_SIGN_LIFE[ascSign!] +
        ' برای تفسیرِ دقیق‌ترِ مسیر صاحب طالع، ابتدا باید جایگاهِ مرزی آن روشن شود.',
  ] : [
    familiar + 'طالعِ ودیکِ این چارت نزدیک مرز دو نشان قرار دارد. ' +
      'به همین دلیل نمی‌شود یک اسم مشخص برای نشان یا صاحب طالع انتخاب کرد. ' +
      'با این وجود بخش‌های دیگر چارت ثبت شده‌اند و جای اطلاعاتِ عددی خالی نیست.',
    'خورشید و ماه دو نقطهٔ مستقل از طالع هستند: ' +
      chapterOneBodyFact(sun, 'lagna-sun-alternative').factFa + ' ' +
      chapterOneBodyFact(moon, 'lagna-uncertain-moon-reference').factFa +
      ' این دو جایِ طالعِ نامشخص را نمی‌گیرند؛ برای دیدن ادامهٔ نقشه به آن‌ها رجوع می‌کنیم.',
    'در این وضعیت خانهٔ اول و صاحب آن را به‌صورت حدسی تعیین نمی‌کنیم. ' +
      'مثلاً اگر دربارهٔ شیوهٔ شروع یک پروژه حرف بزنیم، آن توضیح را به یک برجِ انتخاب‌شده از روی حدس نسبت نمی‌دهیم. ' +
      'این بخش از گزارش تا بررسیِ زمان تولد باز می‌ماند.',
    'قدمِ بعد روشن است: ساعتِ ثبت‌شدهٔ تولد را بررسی کن تا درجه و نشان طالع دقیق‌تر محاسبه شوند. ' +
      'بعد می‌شود جایگاهِ صاحب طالع، خانهٔ اول و مثال‌های مربوط به همان چارت را به متن اضافه کرد.',
  ];

  const moonSign = moon.signNameFa;
  const nak = view.moonNakshatra;
  const moonFacts = [
    evidence('moon-sign', 'placements.moon.signIndex',
      moonSign ? 'ماه در نشان ' + moonSign + ' قرار دارد.' :
        'ماه به مرز نشان نزدیک است؛ نشان قطعی آن تعیین نمی‌شود.', moonSign !== null, 'moon'),
    evidence('moon-nakshatra', 'nakshatra.index',
      nak.nameFa ? 'ناکشاترای ماه ' + nak.nameFa +
        (nak.pada === null ? ' است؛ تعیین پادا قطعی نیست.' : ' و پادای آن ' + String(nak.pada) + ' است.') :
        'ماه نزدیک مرز ناکشاتراست؛ نام ناکشاترا و پادا قطعی نیست.',
      nak.nameFa !== null && nak.pada !== null, 'moon'),
    bodyFact(moon, 'moon-house'),
    bodyFact(sun, 'sun-moon-context'),
  ];
  const moonParagraphs = [
    moonSign
      ? 'ماه در ' + moonSign + ' قرار دارد. در زبان نمادینِ ودیک، این جایگاه را می‌توان پنجره‌ای به شیوهٔ پاسخ دادن به احساسات دانست. در این نشان، موضوع ' +
        SIGN_VOICE[moon.signIndex!] + ' می‌تواند یکی از زاویه‌های تأمل باشد؛ اما هیچ نشان به‌تنهایی تجربهٔ عاطفی یک فرد را توضیح نمی‌دهد.'
      : 'ماه به مرز نشان نزدیک است؛ بنابراین توصیف عاطفی را به ویژگی‌های یک نشان معین گره نمی‌زنیم. تفاوت کوچک عددی می‌تواند طبقه‌بندی را عوض کند و درست‌تر است معنای این بخش را مشروط نگه داریم.',
    nak.nameFa
      ? 'ناکشاترای ثبت‌شدهٔ ماه ' + nak.nameFa + ' است.' +
        (nak.pada === null ? ' پادا نزدیک مرز است و در این خوانش به آن معنای جزئی نسبت داده نمی‌شود.' :
          ' پادای ' + String(nak.pada) + ' بخش کوچک‌تری از همان تقسیم‌بندی ۲۷گانه را نشان می‌دهد.') +
        ' ناکشاترا یک تقسیم نجومی-نمادین است؛ از نام آن به‌تنهایی نباید یک داستان روان‌شناختی یا پیش‌بینی دربارهٔ آینده استخراج کرد.'
      : 'محاسبهٔ ماه به مرز دو ناکشاترا نزدیک است؛ نام و پادا را قطعی اعلام نمی‌کنیم. با وجود این محدودیت، جایگاه ماه در جدول عددی حفظ شده تا مبنای بازبینی وجود داشته باشد.',
    'برای کامل کردن تصویر به خانهٔ ماه هم نگاه می‌کنیم: ' + moonFacts[2].factFa +
      (moon.houseNumber === null ? ' بدون خانهٔ مطمئن، از نسبت دادن موضوعات خانوادگی یا رابطه‌ای به موقعیت ماه پرهیز می‌کنیم.' :
        ' در روش خانه‌های تمام‌نشان، خانهٔ ' + String(moon.houseNumber) + ' با ' +
        HOUSE_AREAS[moon.houseNumber - 1] + ' مرتبط است. این ارتباط صرفاً موضوعی برای مشاهدهٔ تجربه‌های خودت است.'),
    sun.signNameFa && moonSign
      ? 'برای جدا کردن نیاز عاطفی از مسیرِ بیان خود، ماه را کنار خورشید می‌گذاریم: ' + moonFacts[3].factFa +
        ' در همین نقشه، ماه در ' + moonSign + ' دیده می‌شود.' +
        (moonSign === sun.signNameFa
          ? ' هر دو در یک نشان قرار گرفته‌اند؛ بااین‌حال یکی بودن نشان‌ها دلیل یکسان بودن نیازها و تصمیم‌ها نیست.'
          : ' دو نشان متفاوتند؛ این تفاوت صرفاً دو زاویهٔ نمادین برای پرسیدن از تجربه است، نه نشانهٔ ناسازگاری در شخصیت.') +
        ' لازم نیست میان این دو یکی را «واقعی‌تر» تصور کنی.'
      : 'خورشید هم به‌عنوان شاهد جداگانه در همین چارت ثبت شده است: ' + moonFacts[3].factFa +
        ' چون دست‌کم یکی از جایگاه‌ها نزدیک مرز است، از نتیجه‌گیری قطعی دربارهٔ رابطهٔ دو نشان خودداری می‌کنیم.',
    moon.houseNumber !== null
      ? 'یک پرسش مشخص از خانهٔ ' + String(moon.houseNumber) + ' بیرون می‌آید: در زمینهٔ ' +
        HOUSE_AREAS[moon.houseNumber - 1] +
        ' چه زمانی به آرامش نیاز داشته‌ای و برای پاسخ به این نیاز چه کرده‌ای؟ اگر مثال واقعی پیدا نمی‌کنی، لازم نیست معنای چارت را به زندگی‌ات تحمیل کنی.'
      : 'خانهٔ ماه فعلاً نامطمئن است. به جای نسبت دادن نیاز عاطفی به یک حوزهٔ مشخص، یک هفته موقعیت‌هایی را یادداشت کن که در آن‌ها آرام‌تر یا ناآرام‌تر شده‌ای؛ بعد با دادهٔ دقیق‌تر به طبقه‌بندی خانه برگرد.'
  ];

  // A concentration is a count of the seven classical planets, NOT a claim
  // about strength/yogas/aspects. Do not inflate the count with Rahu/Ketu.
  const reliable = view.rows.filter(row => row.houseNumber !== null && row.signNameFa !== null &&
    row.id !== 'rahu' && row.id !== 'ketu');
  const houseCounts = new Map<number, number>();
  for (const row of reliable) houseCounts.set(row.houseNumber!, (houseCounts.get(row.houseNumber!) ?? 0) + 1);
  const ranked = [...reliable].sort((a, b) =>
    (houseCounts.get(b.houseNumber!)! - houseCounts.get(a.houseNumber!)!) ||
    (Number([1,4,7,10].includes(b.houseNumber!)) - Number([1,4,7,10].includes(a.houseNumber!))) ||
    (a.houseNumber! - b.houseNumber!) || a.id.localeCompare(b.id));
  const focus = ranked[0] ?? null;
  const companion = ranked.find(row => row.id !== focus?.id &&
    (focus === null || row.houseNumber !== focus.houseNumber)) ??
    ranked.find(row => row.id !== focus?.id) ?? null;
  const sameHouse = focus ? reliable.filter(row => row.houseNumber === focus.houseNumber && row.id !== focus.id) : [];
  const houseFacts = [
    focus ? bodyFact(focus, 'focus-primary') : bodyFact(sun, 'focus-primary'),
    companion ? bodyFact(companion, 'focus-secondary') :
      bodyFact(focus?.id === 'moon' ? sun : moon, 'focus-secondary'),
    ...(sameHouse.length > 0 ? [bodyFact(sameHouse[0], 'focus-house-companion')] : []),
  ];
  const houseParagraphs = [
    focus ? 'برای پیدا کردن محورهای برجسته در چارت D1، اول سراغ جایگاه‌هایی می‌رویم که خانهٔ آن‌ها از نظر محاسباتی قابل اتکاست. ' +
      houseFacts[0].factFa + ' در این بخش، خانهٔ ' + String(focus.houseNumber) +
      ' به ' + HOUSE_AREAS[focus.houseNumber! - 1] + ' اشاره می‌کند؛ حضور ' +
      VEDIC_D1_BODIES_FA[focus.id] + ' را می‌توان از زاویهٔ ' + BODY_SYMBOLS[focus.id] +
      ' خواند، بدون اینکه این قرارگیری را به رخدادی حتمی تعبیر کنیم.'
      : 'در این نمونه، هیچ خانهٔ سیاره‌ای با اطمینان کافی قابل نام‌گذاری نیست. جدول موقعیت‌ها حفظ شده ولی از ادعای «تأکید خانهٔ مشخص» یا نسبت دادن یک نتیجهٔ زندگی به آن خودداری می‌کنیم؛ این محدودیت برای گزارشی که قرار است قابل اعتماد باشد ضروری است.',
    companion ? 'برای اینکه گزارش فقط بر یک نقطه بنا نشود، جایگاه دوم را هم کنار آن می‌گذاریم: ' +
      houseFacts[1].factFa + ' در تعبیر سنتی، ' + VEDIC_D1_BODIES_FA[companion.id] +
      ' نمادی از ' + BODY_SYMBOLS[companion.id] + ' است. موضوع خانهٔ ' +
      String(companion.houseNumber) + ' یعنی ' + HOUSE_AREAS[companion.houseNumber! - 1] +
      ' می‌تواند با محور نخست هم‌پوشانی یا تفاوت داشته باشد؛ پاسخ واقعی را باید در موقعیت‌های زندگی سنجید.'
      : 'برای خواندن دومین شاهد، جایگاه ماه نیز ثبت شده است: ' + houseFacts[1].factFa +
      ' این شاهد در وضعیت مرزی جای یک خانهٔ قطعی دیگر را نمی‌گیرد؛ فقط مانع می‌شود کمبود داده با یک تفسیر ساختگی پر شود.',
    sameHouse.length > 0 && focus
      ? 'در خانهٔ ' + String(focus.houseNumber) + ' تنها یک جایگاه نداریم. ' + houseFacts[2].factFa +
        ' کنار ' + VEDIC_D1_BODIES_FA[focus.id] + ' قرار گرفتنِ ' + VEDIC_D1_BODIES_FA[sameHouse[0].id] +
        ' یعنی دو نماد به موضوع ' + HOUSE_AREAS[focus.houseNumber - 1] +
        ' گره می‌خورند. این فقط هم‌خانگیِ تمام‌نشان است؛ نه اثبات قرانِ درجه‌ای، قدرت بیشتر یا رویدادی حتمی.'
      : focus
        ? 'در خانهٔ انتخاب‌شده، از میان هفت سیارهٔ کلاسیک جایگاه دیگری با طبقه‌بندی مطمئن ثبت نشده است. این کم‌تراکم بودن به معنای کم‌اهمیت بودن آن حوزه نیست؛ انتخاب این محور صرفاً راهی برای خواندن مرحله‌به‌مرحلهٔ دادهٔ موجود است.'
        : 'چون خانهٔ مطمئنی برای مقایسه نداریم، نه تراکم سیاره‌ای اعلام می‌کنیم و نه خانه‌ای را «قوی‌تر» می‌نامیم. نخست باید درجه‌های مرزی با دادهٔ تولد دقیق‌تر بررسی شوند.',
    focus && companion
      ? 'برای کنار هم گذاشتن دو محور، یک موقعیت واقعی پیدا کن که در آن ' + HOUSE_AREAS[focus.houseNumber! - 1] +
        ' با ' + HOUSE_AREAS[companion.houseNumber! - 1] +
        ' هم‌زمان مطرح بوده است. نقش ' + VEDIC_D1_BODIES_FA[focus.id] + ' و ' +
        VEDIC_D1_BODIES_FA[companion.id] + ' را به‌عنوان دو نماد بخوان؛ لازم نیست میانشان جنبهٔ نجومیِ محاسبه‌نشده فرض کنی.'
      : 'اگر خانه‌ها نامطمئن‌اند، این بخش را با پرسیدن از یک تصمیم روزمره ادامه بده: در آن تصمیم به کدام دادهٔ واقعی تکیه کردی و کدام پیش‌فرض را بعداً اصلاح کردی؟ این تمرین به تحلیل خانهٔ حدسی نیاز ندارد.',
  ];

  const synthesisFacts = [ascEvidence, moonFacts[0], rulerEvidence, houseFacts[0]];
  const synthParagraphs = [
    ascName && moonSign
      ? 'یک تصویر شخصی از کنار هم گذاشتن دو نقطه شکل می‌گیرد: طالع در ' + ascName +
        ' و ماه در ' + moonSign + '. طالع زبان شیوهٔ حضور و شروع کردن است و ماه راهی برای پرسیدن از نیازهای عاطفی.' +
        (ascName === moonSign
          ? ' هر دو در یک نشان قرار دارند، اما این به معنای یکسان بودن نقش طالع و ماه در همهٔ تجربه‌ها نیست.'
          : ' این دو نشان متفاوت‌اند؛ می‌شود از تفاوتشان برای طرح پرسش استفاده کرد، نه برای نتیجه گرفتن از تناقض شخصیت.') +
        ' تجربه‌های واقعی خودت می‌توانند این برداشت نمادین را تأیید، محدود یا رد کنند.'
      : 'در این چارت دست‌کم یکی از دو نشان طالع یا ماه به مرز محاسباتی نزدیک است. برای همین جمع‌بندی از دو برچسب قطعی دربارهٔ شخصیت شروع نمی‌شود. شواهد در کنار هم نوشته می‌شوند، اما تفسیر مربوط به نشان نامطمئن عمداً باز می‌ماند.',
    rulerId && rulerRow && rulerRow.houseNumber !== null && ascName
      ? 'صاحب طالع، ' + rulerName + '، در خانهٔ ' + String(rulerRow.houseNumber) + ' قرار دارد؛ موضوع آن خانه، ' +
        HOUSE_AREAS[rulerRow.houseNumber - 1] + ' است. با توجه به جایگاه ماه، می‌توان پرسید چگونه میان پیگیری بیرونیِ این موضوع و نیاز عاطفیِ درونت تعادل برقرار می‌کنی. این پرسش از دو شاهد مشخص چارت آمده، نه از پیش‌بینی یک اتفاق.'
      : 'در این نسخه نمی‌توان خانهٔ صاحب طالع را با اطمینان کافی مبنای تعبیر گذاشت. بهتر است تفسیر ناتمام را آشکارا ناتمام بگذاریم؛ جایگاه‌های قطعی دیگر در جدول برای مطالعه محفوظ‌اند و هیچ متنی جای دادهٔ نامطمئن را پر نمی‌کند.',
    focus
      ? 'یک محور دیگر هم به تصویر اضافه می‌شود: ' + houseFacts[0].factFa +
        ' این جایگاه می‌تواند گفت‌وگو را از «من چه ویژگی‌ای دارم؟» به «این ویژگی را در کدام بخش زندگی تجربه می‌کنم؟» ببرد. همچنان انتخاب، محیط، تاریخچهٔ زندگی و خواسته‌های تو بیرون از این نمودار قرار دارند و از آن قابل محاسبه نیستند.'
      : 'در نبود محور خانه‌ایِ قابل اتکا، این خوانش را به مشاهدهٔ تجربه‌های واقعی محدود می‌کنیم. بازبینی ساعت تولد و درجه‌های مرزی از ساختن داستان مفصل و نادرست مفیدتر است.',
    focus && moon.houseNumber !== null
      ? 'تمرین تأملی ویژهٔ همین نقشه: یک موقعیت اخیر را انتخاب کن که هم به ' + HOUSE_AREAS[focus.houseNumber! - 1] +
        ' مربوط بوده و هم به ' + HOUSE_AREAS[moon.houseNumber - 1] +
        '. بنویس چه احساسی داشتی، چه چیزی برایت مهم بود و در پایان چه انتخابی کردی. سپس ببین کدام بخش از تعبیر به تجربه‌ات نزدیک است و کدام بخش نه.'
      : 'تمرین تأملی این خوانش: یک موقعیت واقعی را در سه جمله مرور کن؛ چه حسی داشتی، چه تصمیمی گرفتی و بعداً چه چیزی را متفاوت دیدی؟ وقتی جایگاه خانه‌ها نامطمئن است، همین مشاهدهٔ ساده از ساختن یک ارتباط نجومی ساختگی مفیدتر است.',
  ];

  const chapters = [
    chapter(0, lagnaParagraphs, chapterOneFacts),
    chapter(1, moonParagraphs, moonFacts),
    chapter(2, houseParagraphs, houseFacts),
    chapter(3, synthParagraphs, synthesisFacts),
  ];
  return {
    kind: 'private-d1-draft',
    version: VEDIC_D1_PRIVATE_MANUSCRIPT_VERSION,
    writerRulesVersion: VEDIC_D1_WRITER_RULES_VERSION,
    calculationVersion: chart.calculationVersion,
    chapters,
    trustNoteFa: 'این گزارش خوانشی از نقشهٔ تولد توست؛ برداشت و تطبیق آن با زندگی‌ات به عهدهٔ خودت است.',
  };
}
