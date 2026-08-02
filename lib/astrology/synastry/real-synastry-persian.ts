import type {
  SynastryAspectDefinition,
  SynastryContactCategory,
  SynastryDynamics,
  SynastryInterChartAspect,
  SynastryNatalSnapshot,
  SynastryPattern,
  SynastryPersianSynthesis,
  SynastryPointReference,
  SynastryRelationshipContext,
} from "../../../types/synastry-engine.js";
import { REAL_SYNASTRY_WRITER_VERSION } from "../../../types/synastry-engine.js";
import type { RealEngineReportHouseNumber } from "../../../types/astro.js";

const PLANET_LABELS_FA: Record<string, string> = {
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

const ANGLE_LABELS_FA: Record<string, string> = {
  asc: "طالع",
  dsc: "غروب",
  mc: "میانه آسمان",
  ic: "پایین آسمان",
};

const HOUSE_READING_FA: Record<RealEngineReportHouseNumber, string> = {
  1: "حضور و شیوه دیده‌شدن را در رابطه پررنگ می‌کند.",
  2: "موضوع ارزش‌ها، امنیت و منابع شخصی را فعال می‌کند.",
  3: "گفت‌وگو، یادگیری و رفت‌وآمد روزمره را درگیر می‌کند.",
  4: "حس خانه، ریشه و امنیت عاطفی را برجسته می‌کند.",
  5: "بازی، خلاقیت، لذت و ابراز محبت را فعال می‌کند.",
  6: "عادت‌ها، همکاری روزمره و مسئولیت‌های عملی را پررنگ می‌کند.",
  7: "تعریف شراکت، مذاکره و آینه‌بودن برای یکدیگر را فعال می‌کند.",
  8: "اعتماد، صمیمیت عمیق، مرزها و منابع مشترک را برجسته می‌کند.",
  9: "معنا، جهان‌بینی، سفر و رشد فکری را درگیر می‌کند.",
  10: "هدف، نقش اجتماعی و جهت بلندمدت را پررنگ می‌کند.",
  11: "دوستی، آرمان مشترک و فضای جمعی را فعال می‌کند.",
  12: "لایه‌های پنهان، خلوت و حساسیت‌های ناآشکار را برجسته می‌کند.",
};

const CONTEXT_LABELS_FA: Record<SynastryRelationshipContext, string> = {
  romantic: "رابطه عاطفی",
  friendship: "دوستی",
  family: "رابطه خانوادگی",
  work: "همکاری",
  general: "رابطه",
};

export function getSynastryPointIdLabelFa(
  pointId: string,
  fallbackLabel: string,
): string {
  return PLANET_LABELS_FA[pointId] ?? ANGLE_LABELS_FA[pointId] ?? fallbackLabel;
}

export function getSynastryPointLabelFa(point: SynastryPointReference): string {
  return getSynastryPointIdLabelFa(point.id, point.label);
}

export function getCanonicalSynastryPointLabelsFa(
  pointA: SynastryPointReference,
  pointB: SynastryPointReference,
): [string, string] {
  const labels = [
    getSynastryPointLabelFa(pointA),
    getSynastryPointLabelFa(pointB),
  ].sort((a, b) => a.localeCompare(b, "fa"));
  return [labels[0], labels[1]];
}

export function buildSynastryContactReadingFa(input: {
  pointA: SynastryPointReference;
  pointB: SynastryPointReference;
  aspectId: SynastryAspectDefinition["id"];
  polarity: SynastryInterChartAspect["polarity"];
  categories: SynastryContactCategory[];
}): string {
  const [firstLabel, secondLabel] = getCanonicalSynastryPointLabelsFa(
    input.pointA,
    input.pointB,
  );
  const aspectPhrase = getAspectBehaviorPhrase(input.aspectId);
  const categoryPhrase = input.categories.includes("communication")
    ? "این تماس به‌ویژه روی شیوه حرف‌زدن، شنیدن و معناکردن پیام‌ها اثر می‌گذارد."
    : input.categories.includes("closeness") &&
        input.categories.includes("independence")
      ? "این تماس هم میل به نزدیکی و هم نیاز به مرز یا فضای شخصی را فعال می‌کند."
      : input.categories.includes("closeness")
        ? "این تماس در تجربه محبت، امنیت و کشش عاطفی دیده می‌شود."
        : input.categories.includes("independence")
          ? "این تماس موضوع مرز، آزادی، تعهد یا تغییر را برجسته می‌کند."
          : input.categories.includes("angle")
            ? "این تماس روی برداشت اولیه، جهت رابطه یا نقش بیرونی آن اثر می‌گذارد."
            : "این تماس یکی از مسیرهای اصلی اثرگذاری دو چارت بر یکدیگر است.";
  const polarityPhrase =
    input.polarity === "supportive"
      ? "مسیر همکاری در آن طبیعی‌تر است، اما برای زنده ماندن همچنان به توجه نیاز دارد."
      : input.polarity === "tension"
        ? "تفاوت ریتم می‌تواند اصطکاک بسازد، ولی با گفت‌وگو به رشد و شناخت دقیق‌تر تبدیل می‌شود."
        : input.polarity === "intense"
          ? "شدت این تماس نیازمند مرز روشن و پرهیز از واکنش‌های همه‌یا‌هیچ است."
          : "این تماس نه خودبه‌خود آسان است و نه الزاماً دشوار؛ نحوه استفاده از آن تعیین‌کننده است.";

  return `${firstLabel} و ${secondLabel} ${aspectPhrase}. ${categoryPhrase} ${polarityPhrase}`;
}

export function buildSynastryContactGrowthFa(
  aspectId: SynastryAspectDefinition["id"],
  categories: SynastryContactCategory[],
): string {
  if (categories.includes("communication")) {
    return "پیش از نتیجه‌گیری، منظور را بازگویی کنید و از طرف مقابل بخواهید اصلاحش کند.";
  }
  if (
    categories.includes("closeness") &&
    categories.includes("independence")
  ) {
    return "زمان نزدیکی و زمان خلوت را به‌جای حدس‌زدن، روشن و قابل مذاکره کنید.";
  }
  if (aspectId === "square" || aspectId === "opposition") {
    return "اختلاف را به یک درخواست مشخص تبدیل کنید و درباره یک رفتار قابل مشاهده توافق کنید.";
  }
  if (categories.includes("saturn-outer")) {
    return "میان ثبات و تغییر، یک مرز کوچک و قابل بازبینی تعریف کنید.";
  }
  return "این ظرفیت را با یک رفتار کوچک و تکرارشونده وارد زندگی روزمره کنید.";
}

export function buildSynastryPatterns(
  contacts: readonly SynastryInterChartAspect[],
  kind: "supportive" | "tension",
): SynastryPattern[] {
  const eligible = contacts.filter((contact) =>
    kind === "supportive"
      ? contact.polarity === "supportive"
      : contact.polarity === "tension" || contact.polarity === "intense",
  );
  const groups: Array<{
    id: string;
    titleFa: string;
    predicate: (contact: SynastryInterChartAspect) => boolean;
  }> = [
    {
      id: "communication",
      titleFa: "ریتم گفت‌وگو",
      predicate: (contact) => contact.categories.includes("communication"),
    },
    {
      id: "emotional-closeness",
      titleFa: "نزدیکی و امنیت",
      predicate: (contact) => contact.categories.includes("closeness"),
    },
    {
      id: "structure-and-space",
      titleFa: "تعهد، مرز و آزادی",
      predicate: (contact) =>
        contact.categories.includes("independence") ||
        contact.categories.includes("saturn-outer"),
    },
    {
      id: "identity-and-direction",
      titleFa: "هویت و جهت رابطه",
      predicate: (contact) =>
        contact.categories.includes("luminary") ||
        contact.categories.includes("angle") ||
        contact.categories.includes("chart-ruler"),
    },
  ];

  const patterns: SynastryPattern[] = [];
  const used = new Set<string>();
  for (const group of groups) {
    const matches = eligible
      .filter(
        (contact) =>
          !used.has(contact.id) && group.predicate(contact),
      )
      .slice(0, 3);
    if (matches.length === 0) continue;
    for (const match of matches) used.add(match.id);
    patterns.push({
      id: `${kind}-${group.id}`,
      kind,
      titleFa: group.titleFa,
      summaryFa:
        kind === "supportive"
          ? `${matches.map((item) => item.titleFa).join("، ")} مسیر قابل اتکایی برای همکاری می‌سازند.`
          : `${matches.map((item) => item.titleFa).join("، ")} به توجه، مرزبندی و گفت‌وگوی آگاهانه نیاز دارند.`,
      contactIds: matches.map((item) => item.id),
      relevanceScore: Math.round(
        matches.reduce((sum, item) => sum + item.relevanceScore, 0) /
          matches.length,
      ),
    });
  }

  return patterns
    .sort(
      (left, right) =>
        right.relevanceScore - left.relevanceScore ||
        left.id.localeCompare(right.id),
    )
    .slice(0, 4);
}

export function buildSynastryDynamics(
  contacts: readonly SynastryInterChartAspect[],
): SynastryDynamics {
  const communicationContacts = contacts
    .filter((contact) => contact.categories.includes("communication"))
    .slice(0, 3);
  const closenessContacts = contacts
    .filter(
      (contact) =>
        contact.categories.includes("closeness") ||
        contact.categories.includes("independence"),
    )
    .slice(0, 4);

  const communicationFa = communicationContacts.length
    ? `در گفت‌وگو، ${communicationContacts.map((item) => item.titleFa).join("، ")} برجسته‌اند. بهتر است سرعت پاسخ، نیاز به توضیح و معنای کلمات را صریح کنید.`
    : "تماس برجسته‌ای با عطارد دیده نشد؛ کیفیت گفت‌وگو را باید بیشتر از رفتار واقعی و عادت‌های ارتباطی سنجید.";
  const closenessIndependenceFa = closenessContacts.length
    ? `در محور نزدیکی و استقلال، ${closenessContacts.map((item) => item.titleFa).join("، ")} مهم‌اند. رابطه وقتی پایدارتر می‌شود که محبت، مرز و زمان شخصی هم‌زمان قابل گفت‌وگو باشند.`
    : "داده موجود الگوی پررنگی برای محور نزدیکی و استقلال نشان نمی‌دهد؛ این بخش نباید بیش از شواهد موجود تفسیر شود.";

  return {
    communicationFa,
    closenessIndependenceFa,
    evidenceContactIds: uniqueStrings([
      ...communicationContacts.map((item) => item.id),
      ...closenessContacts.map((item) => item.id),
    ]),
  };
}

export function buildSynastryPersianSynthesis(input: {
  chartA: SynastryNatalSnapshot;
  chartB: SynastryNatalSnapshot;
  relationshipContext: SynastryRelationshipContext;
  supportivePatterns: SynastryPattern[];
  tensionPatterns: SynastryPattern[];
  dynamics: SynastryDynamics;
  limitations: string[];
}): SynastryPersianSynthesis {
  const labels = [input.chartA.label, input.chartB.label].sort((a, b) =>
    a.localeCompare(b, "fa"),
  );
  const contextLabel = CONTEXT_LABELS_FA[input.relationshipContext];
  const supportiveFa = input.supportivePatterns.length
    ? `پایه‌های حمایتی اصلی در ${input.supportivePatterns.map((item) => item.titleFa).join("، ")} دیده می‌شوند. این بخش‌ها ظرفیت رابطه‌اند، نه تضمین نتیجه.`
    : "در داده موجود الگوی حمایتی پررنگی دیده نشد؛ این به معنای ناسازگاری نیست و فقط محدودیت شواهد فعلی را نشان می‌دهد.";
  const tensionFa = input.tensionPatterns.length
    ? `نقاط نیازمند توجه در ${input.tensionPatterns.map((item) => item.titleFa).join("، ")} متمرکزند. این الگوها حکم شکست رابطه نیستند و بیشتر محل تمرین و مذاکره‌اند.`
    : "الگوی تنش برجسته‌ای در جنبه‌های محاسبه‌شده دیده نشد؛ نبود تنش برجسته به معنای بی‌نیازی از گفت‌وگو نیست.";

  return {
    writerVersion: REAL_SYNASTRY_WRITER_VERSION,
    titleFa: `مقایسه چارت ${labels[0]} و ${labels[1]}`,
    openingFa: `این خوانش برای ${contextLabel}، اثر متقابل دو چارت را از روی جنبه‌های واقعی میان جایگاه‌ها بررسی می‌کند؛ نه از روی تطبیق سطحی نشانه‌ها و نه با درصد سازگاری.`,
    wholePairFa: `${supportiveFa} ${tensionFa}`,
    supportiveFa,
    tensionFa,
    communicationFa: input.dynamics.communicationFa,
    closenessIndependenceFa: input.dynamics.closenessIndependenceFa,
    limitationFa: input.limitations.join(" "),
  };
}

export function buildSynastryHouseOverlayReadingFa(input: {
  sourcePointLabel: string;
  sourceChartLabel: string;
  targetChartLabel: string;
  targetHouse: RealEngineReportHouseNumber;
}): string {
  return `${input.sourcePointLabel} چارت ${input.sourceChartLabel} در خانه ${input.targetHouse} چارت ${input.targetChartLabel} قرار می‌گیرد و ${HOUSE_READING_FA[input.targetHouse]}`;
}

export function buildSynastryContactEvidenceFa(input: {
  pointA: SynastryPointReference;
  pointB: SynastryPointReference;
  aspectLabel: string;
  orb: number;
  categories: SynastryContactCategory[];
}): string[] {
  return [
    `${getSynastryPointLabelFa(input.pointA)} با ${getSynastryPointLabelFa(input.pointB)} در ${input.aspectLabel} قرار دارد.`,
    `فاصله از زاویه دقیق ${round(input.orb, 2).toFixed(2)} درجه است.`,
    ...input.categories.map((category) => `دسته شواهد: ${category}`),
  ];
}

function getAspectBehaviorPhrase(
  aspectId: SynastryAspectDefinition["id"],
): string {
  if (aspectId === "conjunction") return "در یک نقطه متمرکز می‌شوند";
  if (aspectId === "sextile") return "راه همکاری آرامی میان خود باز می‌کنند";
  if (aspectId === "trine") return "با ریتم روان‌تری به هم پاسخ می‌دهند";
  if (aspectId === "square") return "دو ریتم متفاوت و فعال می‌سازند";
  return "دو قطب مکمل و گاهی متضاد را روبه‌روی هم قرار می‌دهند";
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
