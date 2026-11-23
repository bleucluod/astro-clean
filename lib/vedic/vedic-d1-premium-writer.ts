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
const LAGNA_VOICE = [
  { core: 'آغازگری و امتحان کردن مسیرهای تازه در مرکز روایت طالع تو قرار می‌گیرد.', balance: 'سرعتِ شروع باید با فرصتِ ساختن یک پایهٔ پایدار همراه شود.' },
  { core: 'ساختن امنیت، انتخاب باحوصله و وفاداری به آنچه ارزشمند می‌دانی، ستون این طالع است.', balance: 'پایداری وقتی سازنده است که راه بازنگری در انتخاب‌ها را نبندد.' },
  { core: 'حضور تو در این نقشه از راه پرسیدن، گفت‌وگو و جابه‌جا شدن میان چند دیدگاه شکل می‌گیرد.', balance: 'پراکندگیِ امکان‌ها زمانی سامان می‌گیرد که به یک تصمیم روشن ختم شوند.' },
  { core: 'ریشه، تعلق و مراقبت از پیوندهای نزدیک، زبان اصلی این طالع را می‌سازند.', balance: 'مرز میان حمایت از دیگران و مراقبت از نیازهای خودت در این روایت اهمیت دارد.' },
  { core: 'دیده شدنِ خلاقانه و پیش‌بردن چیزی که برایت مهم است، به این طالع رنگ می‌دهد.', balance: 'جایگاه شخصی وقتی ریشه می‌گیرد که ارزش آن فقط به تأیید بیرونی وابسته نباشد.' },
  { core: 'تشخیص جزئیات، مرتب کردن آشفتگی و بهتر کردن مسیر، الگوی این طالع است.', balance: 'دقت زمانی به کار می‌آید که فرصت تجربه و حرکت را در انتظارِ بی‌نقصی متوقف نکند.' },
  { core: 'این طالع با شناختِ دیگری، سنجیدن دو سوی ماجرا و پیدا کردن تناسب پیش می‌رود.', balance: 'حفظ تعادل به معنای عقب‌نشینی همیشگی از خواستهٔ خودت نیست.' },
  { core: 'نگاه عمیق، کشف لایه‌های پنهان و روبه‌رو شدن با تغییر، محور این طالع است.', balance: 'شفاف کردن اعتماد و مرزها از پافشاری بر کنترل همهٔ جزئیات مهم‌تر می‌شود.' },
  { core: 'پرسیدن از معنا، تجربه کردن جهانِ بزرگ‌تر و دیدن افقِ دور، راه ورود این طالع است.', balance: 'چشم‌انداز وسیع وقتی اثر پیدا می‌کند که در تصمیم‌های روزمره جای مشخصی داشته باشد.' },
  { core: 'مسئولیت‌پذیری، ساختن قدم‌به‌قدم و جدی گرفتن زمان، ریتم این طالع را می‌سازد.', balance: 'هدف بلندمدت نباید جایی برای لذتِ مسیر و انعطافِ ضروری باقی نگذارد.' },
  { core: 'دیدن الگویی متفاوت، مستقل فکر کردن و ساختن پیوندهای فکری، این طالع را پیش می‌برد.', balance: 'فاصله گرفتن برای یافتن راه نو با قطعِ رابطه و بی‌اعتنایی به نیازهای جمع یکی نیست.' },
  { core: 'همدلی، تخیل و درکِ لایه‌های ناگفتهٔ تجربه، در مرکز این طالع قرار دارند.', balance: 'مرز روشن میان خیال و عمل به این حساسیت فرصتِ شکل گرفتن می‌دهد.' },
] as const;

const LORD_HOUSE_READING = [
  'خانهٔ اول، راهِ پیش‌بردن زندگی را به حضور شخصی و شیوهٔ شروع کردن گره می‌زند. تصمیم‌ها در این محور بیش از هر چیز از موضعِ خودت شکل می‌گیرند.',
  'خانهٔ دوم، مسیر صاحب طالع را به منابع، ارزش‌ها و معیارِ امنیت پیوند می‌دهد. این جایگاه از تو می‌خواهد روشن کنی چه چیزی ارزشِ حفظ و ساختن دارد.',
  'خانهٔ سوم، مسیر صاحب طالع را از راهِ یادگیری، گفت‌وگو و مهارت‌های روزمره باز می‌کند. حرکت در این محور از تجربه‌های نزدیک و پیگیری‌های کوچک شکل می‌گیرد.',
  'خانهٔ چهارم، موضوع خانه، ریشه و حس تعلق را به مرکزِ حرکت صاحب طالع می‌آورد. جای امنِ درونی و نسبت تو با گذشته در این بخش پررنگ است.',
  'خانهٔ پنجم، آفرینش، بیان خود و لذتِ ساختن را به صاحب طالع وصل می‌کند. این محور جایی است که ایده به تجربه‌ای شخصی و زنده تبدیل می‌شود.',
  'خانهٔ ششم، کارِ پیوسته، عادت‌ها و رسیدگی به زندگی روزمره را محورِ رشد می‌کند. حرکت در این خانه از نظمِ قابل ادامه می‌آید، نه از یک جهش کوتاه.',
  'خانهٔ هفتم، مشارکت و برخوردِ مستقیم با دیگری را وارد مسیر صاحب طالع می‌کند. تصمیم‌های شخصی در این محور از گفت‌وگو و شناختِ مرزهای دوطرفه عبور می‌کنند.',
  'خانهٔ هشتم، تغییر، اعتماد و موضوع‌های مشترک را به مسیر صاحب طالع متصل می‌کند. این محور بر شیوهٔ مدیریتِ گذار و بازتعریفِ تکیه‌گاه‌ها تمرکز دارد.',
  'خانهٔ نهم، یادگیریِ عمیق، جهان‌بینی و افق دورتر را به حرکت صاحب طالع پیوند می‌دهد. پرسش اصلیِ این محور پیدا کردن جهتی معنادار برای ادامهٔ راه است.',
  'خانهٔ دهم، مسئولیت، نقش اجتماعی و دیده شدنِ حاصلِ کار را به مسیر صاحب طالع می‌آورد. این خانه رابطهٔ میان هدفِ شخصی و اثرِ بیرونیِ انتخاب‌ها را برجسته می‌کند.',
  'خانهٔ یازدهم، دوستی‌ها، گروه‌ها و چشم‌انداز مشترک را وارد مسیر صاحب طالع می‌کند. در این محور، حرکت فردی با شبکه‌ای از همکاری و امیدهای بلندتر پیوند دارد.',
  'خانهٔ دوازدهم، خلوت، بازنگری و نیاز به فاصله گرفتن از شلوغی را به مسیر صاحب طالع وصل می‌کند. این خانه به شیوهٔ بازیابیِ نیرو و مراقبت از فضای درونی توجه می‌دهد.',
] as const;

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
  // All first-house statements come from the already uncertainty-masked D1 view.
  const firstHouseBodies = view.rows.filter(row =>
    row.houseNumber === 1 && row.signNameFa !== null &&
    row.id !== 'rahu' && row.id !== 'ketu' && row.id !== rulerId);
  const firstHouseBody = firstHouseBodies[0] ?? null;
  const firstHouseFact = firstHouseBody ? bodyFact(firstHouseBody, 'lagna-first-house-body') : null;
  const rulerHostId = rulerRow?.signIndex === null || rulerRow?.signIndex === undefined
    ? null : RULERS[rulerRow.signIndex];
  const hostRow = rulerHostId === null ? null : rows.get(rulerHostId)!;
  const hostFact = lordSafe && hostRow && rulerHostId !== rulerId
    ? bodyFact(hostRow, 'lagna-ruler-sign-host') : null;
  const ascDegree = ascName
    ? new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, useGrouping: false })
        .format(Math.trunc((chart.ascendantLongitude % 30) * 100) / 100)
    : null;
  const ascDegreeFact = ascName && ascDegree !== null
    ? evidence('lagna-degree', 'ascendantLongitude',
        'طالع در درجهٔ ' + ascDegree + ' از نشان ' + ascName + ' قرار گرفته است.', true)
    : null;
  const chapterOneFacts: VedicD1FactualEvidence[] = [
    ascEvidence, rulerEvidence,
    ...(ascDegreeFact ? [ascDegreeFact] : []),
    ...(firstHouseFact ? [firstHouseFact] : []),
    ...(hostFact ? [hostFact] : []),
    ...(!ascName ? [bodyFact(sun, 'lagna-sun-alternative')] : []),
  ];

  const lagnaParagraphs = ascName !== null && rulerId !== null && rulerRow !== null && rulerName !== null ? [
    'طالعِ تو در نشان ' + ascName + ' و درجهٔ ' + ascDegree + ' قرار گرفته است. ' +
      LAGNA_VOICE[ascSign!].core +
      ' این بخش، شیوهٔ ورود به موقعیت‌های تازه را توصیف می‌کند؛ مهم‌ترین نکته‌اش فقط نام نشان نیست، بلکه جایی است که صاحب آن در نقشه قرار گرفته است.',
    lordSafe
      ? 'صاحب طالع تو ' + rulerName + ' است و در نشان ' + rulerRow.signNameFa + '، خانهٔ ' +
        String(rulerRow.houseNumber) + ' قرار دارد. ' + LORD_HOUSE_READING[rulerRow.houseNumber! - 1] +
        ' نقش ' + rulerName + ' در این زنجیره با ' + BODY_SYMBOLS[rulerId] +
        ' پیوند دارد؛ پس مسیرِ طالع از یک ویژگیِ جداافتاده به موضوعِ این خانه می‌رسد.'
      : 'صاحب طالع تو ' + rulerName + ' است. ' + rulerEvidence.factFa +
        ' جایگاه دقیقِ صاحب طالع در این محاسبه به مرز نزدیک شده است؛ به همین دلیل خانهٔ آن وارد تفسیر نمی‌شود. موضوع ثابت این فصل، پیوندِ طالع ' +
        ascName + ' با نقش ' + rulerName + ' در ' + BODY_SYMBOLS[rulerId] + ' است.',
    lordSafe
      ? rulerRow.signNameFa === ascName
        ? 'طالع و صاحب آن در یک نشان قرار گرفته‌اند: ' + ascName + '. در این ترکیب، ' +
          LAGNA_VOICE[ascSign!].core + ' مسیر صاحب طالع را از همان نشان آغاز می‌کند و به موضوع خانهٔ اول بازمی‌گرداند. این دو جایگاه به جای ساختن دو روایت جدا، روی یک محور تمرکز دارند. ' +
          LAGNA_VOICE[ascSign!].balance
        : 'دو نشان در ساختار این طالع نقش دارند: ' + ascName + ' برای شیوهٔ آغاز و ' +
          rulerRow.signNameFa + ' برای مسیر صاحب طالع. اولی بر ' + SIGN_VOICE[ascSign!] +
          ' تکیه دارد؛ دومی به ' + SIGN_VOICE[rulerRow.signIndex!] +
          ' جهت می‌دهد. در کنار هم، این دو نشان یک مسیر دو مرحله‌ای می‌سازند: چگونه شروع می‌کنی و آن شروع را در چه زمینه‌ای پیش می‌بری.'
      : 'طالع ' + ascName + ' به ' + SIGN_VOICE[ascSign!] +
        ' اشاره دارد. ' + LAGNA_VOICE[ascSign!].balance +
        ' از نشان یا خانهٔ نامطمئنِ صاحب طالع برای ساختن بخش دومِ این ترکیب استفاده نشده است.',
    lordSafe && hostRow !== null && rulerHostId !== null
      ? rulerHostId === rulerId
        ? 'صاحب طالع در نشانی قرار دارد که خودِ ' + rulerName +
          ' حاکمِ آن است. این زنجیره در همان سیاره بسته می‌شود و مسیر تفسیر به خانهٔ ' +
          String(rulerRow.houseNumber) + ' برمی‌گردد. در اینجا ' + HOUSE_AREAS[rulerRow.houseNumber! - 1] +
          ' موضوع اصلیِ پیوند میان حضور شخصی و اقدام است.'
        : 'صاحب نشانِ میزبانِ ' + rulerName + '، ' + VEDIC_D1_BODIES_FA[rulerHostId] +
          ' است. ' + hostFact!.factFa +
          (hostRow.houseNumber !== null
            ? ' این زنجیره، موضوعِ خانهٔ ' + String(rulerRow.houseNumber) + ' را با موضوعِ خانهٔ ' +
              String(hostRow.houseNumber) + ' کنار هم می‌گذارد: ' +
              HOUSE_AREAS[rulerRow.houseNumber! - 1] + ' و ' + HOUSE_AREAS[hostRow.houseNumber - 1] +
              '. پیوندِ این دو حوزه یکی از لایه‌های اختصاصیِ مسیر طالع توست.'
            : ' جایگاه خانه‌ای این سیاره روشن نیست و فقط نقشِ آن به‌عنوان حاکمِ نشانِ میزبان ثبت شده است.')
      : 'زنجیرهٔ صاحب طالع در جایی که دادهٔ نشان یا خانهٔ آن نامطمئن است متوقف می‌شود. در این فصل فقط جایگاه‌های ثبت‌شده و معتبر وارد تحلیل شده‌اند؛ تصویرِ طالع از همین شواهد مشخص ساخته می‌شود.',
    firstHouseBody !== null && firstHouseFact !== null
      ? 'خانهٔ اول تنها از نشان طالع تعریف نمی‌شود. ' + firstHouseFact.factFa +
        ' حضور ' + firstHouseBody.labelFa + '، موضوعِ ' + BODY_SYMBOLS[firstHouseBody.id] +
        ' را به شیوهٔ حضور تو اضافه می‌کند. ' +
        (firstHouseBodies.length > 1
          ? 'در همین خانه جایگاه‌های کلاسیک دیگری هم ثبت شده‌اند؛ بنابراین یک موضوع با چند زبان سیاره‌ای بیان می‌شود.'
          : 'این لایه، نشانی مستقل در کنار موقعیت صاحب طالع است و جای آن را نمی‌گیرد.')
      : lordSafe && rulerRow.houseNumber === 1
        ? 'صاحب طالع در خانهٔ اول قرار گرفته و محورِ حضور شخصی را به همان نقطهٔ آغاز بازمی‌گرداند. در این چارت سیارهٔ کلاسیک دیگری با خانهٔ اولِ قطعی ثبت نشده است؛ بنابراین خوانش این بخش بر خودِ صاحب طالع و نشانش استوار می‌ماند.'
        : 'در خانهٔ اولِ این نقشه، سیاره‌ای از هفت‌گانهٔ کلاسیک با جایگاه قطعی ثبت نشده است. این خانه همچنان از نشان طالع و صاحب آن خوانده می‌شود: نشان ' +
          ascName + ' شیوهٔ ورود را مشخص می‌کند و مسیرِ صاحب طالع' +
          (lordSafe ? ' در خانهٔ ' + String(rulerRow.houseNumber) : '') +
          ' زمینهٔ ادامه دادن را نشان می‌دهد.',
    lordSafe
      ? 'جمع‌بندی این فصل از دو قطعهٔ واقعی ساخته می‌شود: طالع ' + ascName +
        ' با ریتمِ ' + SIGN_VOICE[ascSign!] + ' و صاحب آن، ' + rulerName +
        '، در حوزهٔ ' + HOUSE_AREAS[rulerRow.houseNumber! - 1] +
        '. ' + LAGNA_VOICE[ascSign!].balance +
        ' یک نمونهٔ نزدیک از تصمیمی مربوط به این حوزه پیدا کن و ببین چطور میان شیوهٔ آغاز و روشِ ادامه دادن تعادل ساخته‌ای.'
      : 'نتیجهٔ روشن این فصل، طالعِ ' + ascName + ' و حضورِ ' + rulerName +
        ' به‌عنوان حاکمِ آن است. ' + LAGNA_VOICE[ascSign!].balance +
        ' برای بازخوانیِ مسیر صاحب طالع، ابتدا باید جایگاه مرزیِ آن با دادهٔ دقیق‌تر روشن شود؛ تا آن زمان این فصل خانه‌ای را برای آن فرض نمی‌کند.',
  ] : [
    'طالعِ این نقشه روی مرز دو نشان قرار گرفته است؛ به همین دلیل نام نشان و صاحب طالع از آن استخراج نمی‌شود. گزارش جایگزینِ حدسی برای این دو داده نمی‌سازد و خوانشِ اصلی طالع تا بازبینی ساعت تولد باز می‌ماند.',
    'دو جایگاه مستقل هنوز در نقشه ثبت شده‌اند: ' + bodyFact(sun, 'lagna-sun-alternative').factFa +
      ' و ' + bodyFact(moon, 'lagna-moon-alternative').factFa +
      ' این دو شاهد، اطلاعات قابل مطالعه‌اند؛ اما به‌جای طالع یا صاحب آن نمی‌نشینند.',
    'در این نسخه، رابطهٔ طالع با خانهٔ اول یا خانهٔ صاحب طالع قابل استخراج قطعی نیست. بنابراین این بخش دربارهٔ خانهٔ فرضی، حاکمِ انتخاب‌شده یا ویژگی‌هایی که به آن نسبت داده می‌شوند داستان نمی‌سازد.',
    'نقطهٔ بعدی برای دقیق‌تر شدن این بخش، بررسی ساعت ثبت‌شدهٔ تولد است. با روشن شدنِ نشان طالع، مسیر خانهٔ اول و صاحب آن قابل محاسبه و تحلیل می‌شود؛ فعلاً جایگاه‌های مستقل خورشید و ماه در جدول محفوظ‌اند.',
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
    trustNoteFa: 'این متن خوانشی نمادین از داده‌های محاسبه‌شدهٔ D1 است؛ پیش‌بینی قطعی، تشخیص پزشکی، توصیهٔ مالی یا جایگزین تجربه و اختیار شخصی نیست.',
  };
}
