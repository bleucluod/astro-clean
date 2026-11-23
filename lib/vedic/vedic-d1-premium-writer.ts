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

const RULERS: readonly VedicD1PlacementId[] = [
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
  if (!definition || paragraphsFa.length < 3 || facts.length < 2 ||
      new Set(facts.map(fact => fact.id)).size !== facts.length ||
      paragraphsFa.some(p => p.trim().length < 70)) {
    throw new Error('VEDIC_D1_PREMIUM_CHAPTER_INCOMPLETE');
  }
  return { id: definition.id, title: definition.title, paragraphsFa, evidence: facts };
}

/** Uses the seven classical sign rulers, not Uranus/Neptune/Pluto or strength assumptions. */
export function buildVedicD1PrivateManuscriptDraft(chart: VedicD1AssembledChart): VedicD1PrivateManuscriptDraft {
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
  const lordSafe = rulerRow !== null && rulerRow.houseNumber !== null && rulerRow.signNameFa !== null;
  const lagnaParagraphs = ascName && rulerId && rulerRow && rulerName ? [
    'در خواندن سنتی راشی، طالع دریچهٔ ورود به نقشه است، نه یک برچسب قطعی برای شخصیت. طالع تو در ' + ascName +
      ' قرار گرفته؛ این نشان در زبان نمادین ودیک توجه را به ' + SIGN_VOICE[ascSign!] +
      ' می‌برد. بهتر است این معنا را در تجربه‌های واقعی خودت بسنجی، نه اینکه هر ویژگی را از پیش دربارهٔ خودت درست بدانی.',
    'صاحب طالع در این دستگاه ' + rulerName + ' است. ' + rulerEvidence.factFa +
      (lordSafe ? ' خانهٔ ' + String(rulerRow.houseNumber) + ' با موضوع ' +
        HOUSE_AREAS[rulerRow.houseNumber! - 1] + ' پیوند دارد. این جایگاه کمک می‌کند ببینیم موضوع طالع در کدام بخش زندگی بیشتر سؤال می‌سازد.' :
        ' چون این جایگاه به مرز محاسباتی نزدیک است، از نسبت دادن خانه یا نشان قطعی به صاحب طالع خودداری می‌کنیم.'),
    'در تعبیر نمادین، ' + rulerName + ' به ' + BODY_SYMBOLS[rulerId] +
      ' اشاره می‌کند؛ بنابراین رابطهٔ میان طالع و صاحب آن را می‌توان از زاویهٔ «چطور آغاز می‌کنم و چطور ادامه می‌دهم؟» خواند. این یک امکان برای تأمل است، نه پیش‌بینی قطعی دربارهٔ رویدادها یا توانایی‌های تو.',
    'برای عملی کردن این بخش، یک موقعیت واقعی را به یاد بیاور که در آن میان خواستهٔ شخصی و شرایط بیرونی انتخاب کردی. آیا شیوهٔ شروع کردن و ادامه دادنِ تو با این دو نشانه هم‌خوان بود؟ اگر نبود، تجربهٔ خودت را بر متن مقدم بدان.',
  ] : [
    'طالعِ محاسبه‌شده نزدیک مرز دو نشان است و بودجهٔ خطای عددی اجازه نمی‌دهد نام نشان را قطعی بنویسیم. به همین دلیل تعیین صاحب طالع و خانهٔ او نیز در این گزارش انجام نمی‌شود؛ جایگزین کردن یک حدس با یک تعبیر پرجزئیات، خوانش را شخصی‌تر نمی‌کند.',
    'به جای نتیجه‌گیری دربارهٔ طالع، می‌توان از دادهٔ قابل بررسی دیگری شروع کرد: ' + rulerEvidence.factFa +
      ' این شاهد مربوط به ماه است و جای خالی تعیین طالع را پر نمی‌کند؛ فقط نقطه‌ای موقت برای گفت‌وگو دربارهٔ تجربهٔ شخصی فراهم می‌آورد.',
    'اگر ساعت دقیق‌ترِ ثبت‌شده‌ای در دسترس باشد، بازبینی طالع ارزشمند است. تا آن زمان هیچ ویژگی قطعی یا مسیر زندگی را از روی صاحب طالعِ نامطمئن بیان نمی‌کنیم و بهتر است پرسش‌های این بخش را باز نگه داریم.',
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
    'از خودت بپرس وقتی تحت فشار هستی، کدام رفتار واقعاً به تو احساس امنیت می‌دهد و کدام رفتار صرفاً تکرار یک عادت است؟ پاسخ این پرسش را تجربهٔ تو می‌سازد، نه نام نشان یا ناکشاترا.',
  ];

  // Prioritize reliable occupied houses, then angular houses. Never promote an uncertain house to a categorical claim.
  const reliable = view.rows.filter(row => row.houseNumber !== null && row.signNameFa !== null);
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
  const houseFacts = [
    focus ? bodyFact(focus, 'focus-primary') : bodyFact(sun, 'focus-primary'),
    companion ? bodyFact(companion, 'focus-secondary') :
      bodyFact(focus?.id === 'moon' ? sun : moon, 'focus-secondary'),
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
    focus && companion && focus.houseNumber === companion.houseNumber
      ? 'این دو جایگاه در یک خانه قرار گرفته‌اند. این هم‌مکانی نشان می‌دهد چند نماد در یک موضوع مشترک جمع شده‌اند، اما به‌تنهایی به معنای پیوند زاویه‌ای، قدرت ویژه یا نتیجهٔ خوب و بد نیست. برای سنجش عمق این موضوع، مثال‌های واقعی از تجربهٔ خودت مهم‌تر از یک برچسب ثابت‌اند.'
      : 'دو محور بالا را می‌توان کنار هم خواند، اما نباید از اختلافشان تناقض شخصیتی یا سرنوشت مشخص نتیجه گرفت. این نسخه فقط D1 و خانه‌های تمام‌نشان را می‌خواند؛ نه از دشا، نه از یوگاها و نه از زاویه‌هایی که در این محاسبه ثبت نشده‌اند، ادعایی نمی‌سازد.',
  ];

  const synthesisFacts = [ascEvidence, moonFacts[0], rulerEvidence];
  const synthParagraphs = [
    ascName && moonSign
      ? 'یک تصویر شخصی از کنار هم گذاشتن دو نقطه شکل می‌گیرد: طالع در ' + ascName +
        ' و ماه در ' + moonSign + '. طالع زبان شیوهٔ حضور و شروع کردن است و ماه راهی برای پرسیدن از نیازهای عاطفی. تفاوت این دو نه عیب است و نه تناقض؛ شاید موقعیت‌هایی را به یاد بیاوری که بیرون از خودت یک شیوه و در خلوت شیوهٔ دیگری داشته‌ای.'
      : 'در این چارت دست‌کم یکی از دو نشان طالع یا ماه به مرز محاسباتی نزدیک است. برای همین جمع‌بندی از دو برچسب قطعی دربارهٔ شخصیت شروع نمی‌شود. شواهد در کنار هم نوشته می‌شوند، اما تفسیر مربوط به نشان نامطمئن عمداً باز می‌ماند.',
    rulerId && rulerRow && rulerRow.houseNumber !== null && ascName
      ? 'صاحب طالع، ' + rulerName + '، در خانهٔ ' + String(rulerRow.houseNumber) + ' قرار دارد؛ موضوع آن خانه، ' +
        HOUSE_AREAS[rulerRow.houseNumber - 1] + ' است. با توجه به جایگاه ماه، می‌توان پرسید چگونه میان پیگیری بیرونیِ این موضوع و نیاز عاطفیِ درونت تعادل برقرار می‌کنی. این پرسش از دو شاهد مشخص چارت آمده، نه از پیش‌بینی یک اتفاق.'
      : 'در این نسخه نمی‌توان خانهٔ صاحب طالع را با اطمینان کافی مبنای تعبیر گذاشت. بهتر است تفسیر ناتمام را آشکارا ناتمام بگذاریم؛ جایگاه‌های قطعی دیگر در جدول برای مطالعه محفوظ‌اند و هیچ متنی جای دادهٔ نامطمئن را پر نمی‌کند.',
    focus
      ? 'یک محور دیگر هم به تصویر اضافه می‌شود: ' + houseFacts[0].factFa +
        ' این جایگاه می‌تواند گفت‌وگو را از «من چه ویژگی‌ای دارم؟» به «این ویژگی را در کدام بخش زندگی تجربه می‌کنم؟» ببرد. همچنان انتخاب، محیط، تاریخچهٔ زندگی و خواسته‌های تو بیرون از این نمودار قرار دارند و از آن قابل محاسبه نیستند.'
      : 'در نبود محور خانه‌ایِ قابل اتکا، این خوانش را به مشاهدهٔ تجربه‌های واقعی محدود می‌کنیم. بازبینی ساعت تولد و درجه‌های مرزی از ساختن داستان مفصل و نادرست مفیدتر است.',
    'تمرین تأملی: یک تجربهٔ اخیر را انتخاب کن که در آن میان نیاز به آرامش و میل به حرکت یا تغییر تصمیم گرفته‌ای. دو ستون کوتاه بنویس: «چه چیزی واقعاً نیاز داشتم؟» و «چه انتخابی کردم؟». سپس ببین کدام پرسش این چارت به تجربه‌ات نزدیک شد و کدام نه. قرار نیست نقشه پاسخ را به جای تو تعیین کند.',
  ];

  const chapters = [
    chapter(0, lagnaParagraphs, [ascEvidence, rulerEvidence]),
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
    trustNoteFa: 'این متن خوانشی نمادین از داده‌های محاسبه‌شدهٔ D1 است؛ پیش‌بینی قطعی، تشخیص پزشکی، توصیهٔ مالی یا جایگزین تجربه و اختیار شخصی نیست.',
  };
}
