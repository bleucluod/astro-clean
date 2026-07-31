import type {
  RealEngineReportCalculatedLilith,
  RealEngineReportPlacement,
  ZodiacKey,
} from "@/types/astro";
import { calculateAngularSeparation } from "@/lib/astrology/real-engine-aspects";

export const LILITH_REPORT_INTERPRETATION_VERSION =
  "v0.1.370-validated-lilith-report-interpretation" as const;
export const LILITH_REPORT_MAX_ASPECTS = 2 as const;

export type LilithReportAspect = {
  id: string;
  planetId: string;
  planetLabel: string;
  aspectId: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  aspectLabel: string;
  orb: number;
  text: string;
};

export type LilithReportInterpretation = {
  version: typeof LILITH_REPORT_INTERPRETATION_VERSION;
  signText: string;
  houseText: string | null;
  helpfulText: string;
  growthText: string;
  practiceText: string;
  aspects: LilithReportAspect[];
  trustText: string;
};

type AspectDefinition = {
  id: LilithReportAspect["aspectId"];
  label: string;
  angle: number;
  orb: number;
  mode: "integration" | "support" | "tension";
};

const ASPECTS: readonly AspectDefinition[] = [
  { id: "conjunction", label: "هم‌نشینی", angle: 0, orb: 3, mode: "integration" },
  { id: "opposition", label: "روبه‌رویی", angle: 180, orb: 3, mode: "tension" },
  { id: "square", label: "چالش", angle: 90, orb: 2.5, mode: "tension" },
  { id: "trine", label: "همراهی", angle: 120, orb: 2.5, mode: "support" },
  { id: "sextile", label: "فرصت", angle: 60, orb: 2, mode: "support" },
] as const;

const PLANET_PRIORITY: Record<string, number> = {
  sun: 100,
  moon: 98,
  venus: 94,
  mars: 92,
  mercury: 90,
  saturn: 82,
  pluto: 80,
  jupiter: 72,
  uranus: 68,
  neptune: 66,
};

const PLANET_LABELS: Record<string, string> = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
  uranus: "اورانوس",
  neptune: "نپتون",
  pluto: "پلوتو",
};

const PLANET_FIELDS: Record<string, string> = {
  sun: "هویت، حق دیده‌شدن و انتخاب شخصی",
  moon: "امنیت عاطفی و واکنش‌های غریزی",
  mercury: "فکر، نام‌گذاری و شیوه گفتن حقیقت",
  venus: "ارزش شخصی، کشش، نزدیکی و پسند",
  mars: "میل، خشم، اقدام و نه‌گفتن",
  jupiter: "باور، معنا و حق بزرگ‌ترشدن",
  saturn: "مرز، ترس، مسئولیت و کنترل",
  uranus: "آزادی، تفاوت و شکستن الگو",
  neptune: "حساسیت، خیال و مرز با ابهام",
  pluto: "قدرت، شدت و ترس از دست‌دادن کنترل",
};

const SIGN_TEXT: Record<ZodiacKey, string> = {
  aries:
    "در حمل، این حساسیت بیشتر دور حق شروع‌کردن، خواستن و مستقیم‌بودن جمع می‌شود. مسئله اصلی سرکوب نیرو نیست؛ پیدا کردن شکلی از صراحت است که هم مرز را روشن کند و هم دیگری را به هدف تبدیل نکند.",
  taurus:
    "در ثور، موضوع به بدن، امنیت، مالکیت و حق لذت‌بردن نزدیک می‌شود. فشار ممکن است وقتی بالا برود که ثبات به تحمل اجباری تبدیل شود؛ خوانش سالم از حق انتخاب و ریتم شخصی دفاع می‌کند، نه از چسبیدن به هر چیز آشنا.",
  gemini:
    "در جوزا، حساسیت به صدا، نام‌گذاری و حق پرسیدن مربوط است. ممکن است میان کنجکاوی واقعی و ترس از قضاوت‌شدن فاصله بیفتد؛ راه کمک‌کننده، گفتن نسخه دقیق‌تر و کوتاه‌تر حقیقت بدون بازی ذهنی است.",
  cancer:
    "در سرطان، مرزها به تعلق، مراقبت و حافظه عاطفی وصل می‌شوند. چالش می‌تواند قاطی‌شدن نیاز شخصی با نیاز دیگران باشد؛ رشد یعنی مراقبت بدون ناپدیدکردن خود.",
  leo:
    "در اسد، موضوع دیده‌شدن، خلاقیت و حق اشغال‌کردن فضا پررنگ می‌شود. حساسیت ممکن است میان میل به حضور و ترس از تحقیر نوسان کند؛ بیان سالم، درخشش را از تأیید دائمی جدا می‌کند.",
  virgo:
    "در سنبله، این نقطه به کنترل، درست‌بودن و حق داشتنِ نیازهای ناکامل نزدیک می‌شود. فشار می‌تواند به اصلاح‌گری سخت یا شرم از نقص تبدیل شود؛ مسیر سالم، مرزهای عملی همراه با مهربانی است.",
  libra:
    "در میزان، مرز و میل در میدان رابطه و رضایت دیگران دیده می‌شوند. چالش اصلی ممکن است گفتن «نه» بدون احساس گناه یا گفتن «بله» بدون حذف خود باشد؛ تعادل واقعی از وضوح می‌آید، نه از صلح ظاهری.",
  scorpio:
    "در عقرب، حساسیت به اعتماد، قدرت، صمیمیت و چیزهای ناگفته نزدیک می‌شود. خوانش سالم این شدت را حکم یا راز تاریک نمی‌بیند؛ آن را دعوتی برای مرز روشن، رضایت صریح و روبه‌روشدن با ترس از آسیب‌پذیری می‌داند.",
  sagittarius:
    "در قوس، موضوع به حقیقت شخصی، آزادی و حق دنبال‌کردن معنا مربوط است. فشار ممکن است میان صراحت و بی‌ملاحظگی جابه‌جا شود؛ رشد یعنی آزادی‌ای که مسئولیت اثر کلام و انتخاب را هم می‌پذیرد.",
  capricorn:
    "در جدی، حساسیت دور اقتدار، کنترل، شایستگی و حق استراحت شکل می‌گیرد. ممکن است نیازهای شخصی پشت وظیفه پنهان شوند؛ بیان سالم، قدرت را با حدگذاری و پذیرش آسیب‌پذیری همراه می‌کند.",
  aquarius:
    "در دلو، مرزها به تفاوت، استقلال و تعلق به جمع مربوط می‌شوند. چالش می‌تواند فاصله‌گرفتن برای حفظ آزادی باشد؛ راه سالم، متفاوت‌ماندن بدون قطع کامل تماس عاطفی است.",
  pisces:
    "در حوت، حساسیت به همدلی، خیال و مرزهای نامرئی نزدیک می‌شود. فشار وقتی بالا می‌رود که احساس دیگران با خواسته شخصی قاطی شود؛ رشد یعنی حفظ لطافت همراه با واقع‌سنجی و حد قابل گفتن.",
};

const HOUSE_TEXT: Record<number, string> = {
  1: "در خانه اول، این موضوع در شیوه حضور، تصویر بدنی و حق تعریف‌کردن خود دیده می‌شود.",
  2: "در خانه دوم، میدان اصلی ارزش شخصی، پول، بدن و چیزهایی است که حاضر نیستی برای امنیت ظاهری از دست بدهی.",
  3: "در خانه سوم، مرزها در حرف‌زدن، یادگیری، پیام‌ها و رابطه‌های روزمره فعال می‌شوند.",
  4: "در خانه چهارم، حساسیت به خانه، خانواده، ریشه‌ها و امنیت خصوصی نزدیک است.",
  5: "در خانه پنجم، موضوع در خلاقیت، لذت، دیده‌شدن و حق بازی‌کردن یا عاشق‌شدن آشکار می‌شود.",
  6: "در خانه ششم، مرز میان خدمت، کار روزانه، بدن و فرسودگی اهمیت بیشتری پیدا می‌کند.",
  7: "در خانه هفتم، این لایه بیشتر در صمیمیت، قراردادهای رابطه و چیزی که از دیگری می‌پذیری یا نمی‌پذیری دیده می‌شود.",
  8: "در خانه هشتم، اعتماد، قدرت مشترک، وابستگی، منابع مشترک و آسیب‌پذیری میدان اصلی‌اند.",
  9: "در خانه نهم، موضوع به باور، آموزش، سفر ذهنی و حق ساختن جهان‌بینی شخصی وصل می‌شود.",
  10: "در خانه دهم، حساسیت در جایگاه اجتماعی، اقتدار، مسیر حرفه‌ای و شیوه دیده‌شدن عمومی فعال می‌شود.",
  11: "در خانه یازدهم، مرزها در دوستی، گروه، آرمان مشترک و حق متفاوت‌بودن در جمع دیده می‌شوند.",
  12: "در خانه دوازدهم، این موضوع ممکن است دیرتر نام بگیرد و در خلوت، رؤیا، فرسودگی یا الگوهای پنهان آشکار شود؛ این خانه به زبان محتاط و مشاهده تدریجی نیاز دارد.",
};

export function buildLilithReportInterpretation({
  lilith,
  placements,
}: {
  lilith: RealEngineReportCalculatedLilith;
  placements: RealEngineReportPlacement[];
}): LilithReportInterpretation | null {
  if (
    lilith.approvedForReportOutput !== true ||
    lilith.validationStatus !== "independent-reference-fixtures-passed" ||
    lilith.modelId !== "true-osculating-black-moon-lilith" ||
    !Number.isFinite(lilith.longitude)
  ) {
    return null;
  }

  const aspects = selectLilithAspects(lilith.longitude, placements);
  const houseText =
    typeof lilith.house === "number" ? HOUSE_TEXT[lilith.house] ?? null : null;

  return {
    version: LILITH_REPORT_INTERPRETATION_VERSION,
    signText: SIGN_TEXT[lilith.signId],
    houseText,
    helpfulText:
      "بیان کمک‌کننده این جایگاه معمولاً با تشخیص خواسته واقعی، گفتن حد روشن و پذیرفتن مسئولیت انتخاب همراه است.",
    growthText:
      "اصطکاک وقتی بیشتر می‌شود که حساسیت به برچسب ثابت، آزمون‌گرفتن از دیگران، سکوت طولانی یا واکنش همه‌یا‌هیچ تبدیل شود.",
    practiceText:
      "یک موقعیت کوچک را انتخاب کن و پیش از واکنش، سه چیز را جدا بنویس: چه می‌خواهم، چه چیزی برایم قابل قبول نیست، و چه درخواست روشنی می‌توانم مطرح کنم.",
    aspects,
    trustText:
      "این خوانش بر پایه لیلیت سیاه‌ماه نوسانی/واقعی محلی است که با fixtureهای مستقلِ آفلاین بررسی شده؛ لیلیت میانگین، دارک‌مون/والدماث و سیارک ۱۱۸۱ در آن جایگزین نشده‌اند.",
  };
}

export function selectLilithAspects(
  lilithLongitude: number,
  placements: RealEngineReportPlacement[],
): LilithReportAspect[] {
  return placements
    .flatMap((placement) => {
      if (!Number.isFinite(placement.longitude)) return [];
      const separation = calculateAngularSeparation(
        lilithLongitude,
        placement.longitude,
      );
      const match = ASPECTS
        .map((definition) => ({
          definition,
          orb: Math.abs(separation - definition.angle),
        }))
        .find(({ definition, orb }) => orb <= definition.orb);
      if (!match) return [];
      const planetLabel = PLANET_LABELS[placement.id] ?? placement.label;
      const field = PLANET_FIELDS[placement.id] ?? "این بخش از چارت";
      return [
        {
          id: `lilith-${match.definition.id}-${placement.id}`,
          planetId: placement.id,
          planetLabel,
          aspectId: match.definition.id,
          aspectLabel: match.definition.label,
          orb: match.orb,
          text: buildAspectText(match.definition, planetLabel, field),
        } satisfies LilithReportAspect,
      ];
    })
    .sort(
      (first, second) =>
        first.orb - second.orb ||
        (PLANET_PRIORITY[second.planetId] ?? 0) -
          (PLANET_PRIORITY[first.planetId] ?? 0) ||
        first.id.localeCompare(second.id),
    )
    .slice(0, LILITH_REPORT_MAX_ASPECTS);
}

function buildAspectText(
  definition: AspectDefinition,
  planetLabel: string,
  field: string,
): string {
  if (definition.mode === "tension") {
    return `${definition.label} لیلیت با ${planetLabel} نشان می‌دهد که موضوع مرز و خواسته خام می‌تواند با ${field} اصطکاک پیدا کند. این زاویه حکم بحران نیست؛ بهتر است موقعیت‌های تکرارشونده‌ای را ببینی که در آن‌ها یکی از دو نیاز برای محافظت از دیگری حذف می‌شود.`;
  }
  if (definition.mode === "support") {
    return `${definition.label} لیلیت با ${planetLabel} می‌تواند راه نسبتاً روان‌تری برای پیوند دادن مرز و صداقت با ${field} بسازد. این ظرفیت زمانی مفیدتر است که آگاهانه و بدون توجیه رفتار آسیب‌زننده استفاده شود.`;
  }
  return `هم‌نشینی لیلیت با ${planetLabel} موضوع مرز، حساسیت و خواسته را به ${field} نزدیک می‌کند. این نزدیکی شدت را بیشتر می‌کند، اما معنای ثابت ندارد؛ کیفیت آن به شیوه انتخاب، گفت‌وگو و مسئولیت‌پذیری بستگی دارد.`;
}
