import type {
  LiveReportReadingContract,
  LiveReportThemeChapter,
  ReportNarrativeDeepDive,
  ReportPrimaryPattern,
} from "@/lib/report-output/live-report-reading-contract";
import type {
  HumanFirstEvidence,
  HumanFirstNarrativeBlock,
  HumanFirstNavigationItem,
  HumanFirstReadingSectionId,
} from "@/types/human-first-reading";

export const HUMAN_FIRST_REPORT_NAVIGATION: readonly HumanFirstNavigationItem[] = [
  { id: "overview", label: "داستان کلی" },
  { id: "primary-patterns", label: "سه الگوی اصلی" },
  { id: "strength-challenge", label: "روی فرم و زیر فشار" },
  { id: "inner-world", label: "دنیای درونی" },
  { id: "mind-language", label: "فکر و بیان" },
  { id: "relationships", label: "رابطه و مرز" },
  { id: "drive-direction", label: "حرکت و جهت" },
  { id: "friction-repair", label: "وقتی گیر می‌کنی" },
  { id: "growth-path", label: "انتخاب تازه‌تر" },
  { id: "deeper-layers", label: "لایه‌های عمیق‌تر" },
] as const;

export type HumanFirstBirthChapter = {
  id: HumanFirstReadingSectionId;
  title: string;
  introduction: string;
  paragraphs: string[];
  practicalStep: string;
  evidence: HumanFirstEvidence[];
};

export type HumanFirstBirthReading = {
  opening: string[];
  primaryPatterns: HumanFirstNarrativeBlock[];
  innerWorld: HumanFirstBirthChapter;
  mindLanguage: HumanFirstBirthChapter;
  relationships: HumanFirstBirthChapter;
  driveDirection: HumanFirstBirthChapter;
  frictionRepair: HumanFirstBirthChapter;
  growthPath: HumanFirstBirthChapter;
  deeperLayers: ReportNarrativeDeepDive[];
  limitations: string[];
};

type PatternKind =
  | "identity"
  | "emotion"
  | "mind"
  | "relationship"
  | "action"
  | "direction"
  | "recurring";

const INTERNAL_UI_TERMS = [
  /\bengine\b/giu,
  /\bruntime\b/giu,
  /\bsnapshot\b/giu,
  /\bfixture(?:s)?\b/giu,
  /\bcontract(?: version)?\b/giu,
  /\bwriter(?: version)?\b/giu,
  /\branking\b/giu,
  /\brealEngine\b/gu,
  /Swiss\s+runtime/giu,
  /feature\s+disabled/giu,
  /partial\s+data/giu,
  /legacy\s*\/\s*fallback/giu,
];

const CHAPTER_COPY: Record<
  Exclude<HumanFirstReadingSectionId, "overview" | "primary-patterns" | "strength-challenge" | "deeper-layers" | "chart-details">,
  { title: string; introduction: string; fallbackStep: string }
> = {
  "inner-world": {
    title: "چه چیزی تو را آرام می‌کند؟",
    introduction:
      "اینجا از نیازهایی می‌خوانی که شاید همیشه از بیرون دیده نشوند، اما در لحظه‌های حساس تعیین می‌کنند چطور آرام می‌شوی و دوباره احساس امنیت می‌کنی.",
    fallbackStep:
      "پیش از جواب‌دادن، فقط نام احساست و چیزی را که الان لازم داری برای خودت روشن کن.",
  },
  "mind-language": {
    title: "چطور چیزی را می‌فهمی و به زبان می‌آوری؟",
    introduction:
      "این فصل درباره لحظه‌ای است که فکر، احساس و کلمه باید به هم برسند؛ جایی که گاهی خیلی زود جواب می‌دهی و گاهی برای پیدا کردن جمله درست زمان بیشتری می‌خواهی.",
    fallbackStep:
      "در یک گفت‌وگوی مهم، اول چیزی را که فهمیده‌ای بگو و بعد خواسته‌ات را در یک جمله کوتاه و روشن بیان کن.",
  },
  relationships: {
    title: "چطور نزدیک می‌شوی و چطور خودت می‌مانی؟",
    introduction:
      "رابطه برای تو فقط نزدیک‌شدن نیست؛ کیفیت اعتماد، حق خلوت، شیوه درخواست محبت و توان گفتن مرزها هم بخشی از همان داستان‌اند.",
    fallbackStep:
      "یک خواسته یا مرز را پیش از بالاگرفتن تنش، کوتاه و مستقیم بگو؛ بدون اینکه آن را با توضیح‌های زیاد پنهان کنی.",
  },
  "drive-direction": {
    title: "چه چیزی تو را واقعاً به حرکت می‌اندازد؟",
    introduction:
      "اینجا می‌بینی انرژی‌ات کجا جان می‌گیرد، چه چیزی آن را پخش می‌کند و چرا بعضی هدف‌ها تو را زنده نگه می‌دارند اما بعضی دیگر خیلی زود بی‌معنا می‌شوند.",
    fallbackStep:
      "یک هدف را به کوچک‌ترین کاری تبدیل کن که همین هفته واقعاً می‌توانی انجامش بدهی.",
  },
  "friction-repair": {
    title: "این چرخه‌ها چطور شروع می‌شوند و چطور می‌توانی برگردی؟",
    introduction:
      "زیر فشار، پاسخ‌های آشنا معمولاً زودتر از انتخاب‌های تازه وارد می‌شوند. وقتی شروع چرخه را بشناسی، لازم نیست تا آخر همان مسیر بروی.",
    fallbackStep:
      "اولین نشانهٔ شروع چرخه را پیدا کن و برای همان لحظه یک مکث کوتاه و از پیش‌تعیین‌شده بگذار.",
  },
  "growth-path": {
    title: "انتخاب تازه‌تر تو کجاست؟",
    introduction:
      "رشد قرار نیست بخش‌های آشنای تو را پاک کند؛ قرار است کنار آن‌ها یک پاسخ تازه هم داشته باشی تا همیشه مجبور نباشی همان راه قبلی را تکرار کنی.",
    fallbackStep:
      "فقط یک رفتار کوچک و تازه را برای هفت روز امتحان کن و ببین چه چیزی تغییر می‌کند.",
  },
};

export function buildHumanFirstBirthReading(
  contract: LiveReportReadingContract,
): HumanFirstBirthReading {
  const opening = contract.personalOpening
    .map(humanizeVisibleText)
    .filter(Boolean)
    .slice(0, 3);
  const patterns = contract.primaryPatterns
    .slice(0, 3)
    .map((pattern, index) =>
      buildHumanFirstPattern(pattern, index, contract),
    );

  const fallbackPatterns = contract.primaryPatterns.length === 0
    ? []
    : patterns;

  return {
    opening:
      opening.length > 0
        ? opening
        : [humanizeVisibleText(contract.chartSignature.body)].filter(Boolean),
    primaryPatterns: ensureThreePatterns(fallbackPatterns, contract),
    innerWorld: buildChapter(
      "inner-world",
      [findChapter(contract, "real-engine-theme-emotional-security")],
      contract,
      0,
    ),
    mindLanguage: buildChapter(
      "mind-language",
      [findChapter(contract, "real-engine-theme-mind-language")],
      contract,
      1,
    ),
    relationships: buildChapter(
      "relationships",
      [findChapter(contract, "real-engine-theme-relationship-style")],
      contract,
      2,
    ),
    driveDirection: buildChapter(
      "drive-direction",
      [
        findChapter(contract, "real-engine-theme-will-action"),
        findChapter(contract, "real-engine-theme-direction-path"),
      ],
      contract,
      0,
    ),
    frictionRepair: buildChapter(
      "friction-repair",
      [findChapter(contract, "real-engine-theme-recurring-patterns")],
      contract,
      1,
    ),
    growthPath: buildChapter(
      "growth-path",
      [
        findChapter(contract, "real-engine-theme-direction-path"),
        findChapter(contract, "real-engine-theme-recurring-patterns"),
      ],
      contract,
      2,
    ),
    deeperLayers: buildDeeperLayers(contract),
    limitations: buildHumanLimitations(contract),
  };
}

export function humanizeVisibleText(value: string): string {
  let output = value
    .replace(/[\s\u00a0]+/gu, " ")
    .replace(/پشتوانه (?:اصلی|محاسبه|این خوانش):\s*/gu, "")
    .replace(/خلاصه فصل:\s*/gu, "")
    .replace(/چطور بخوانی:\s*/gu, "")
    .replace(/توان برجستهٔ این بخش:\s*/gu, "وقتی روی فرم خودتی، ")
    .replace(/چالش برجستهٔ این بخش:\s*/gu, "زیر فشار، ")
    .replace(/در زندگی واقعی:\s*/gu, "")
    .replace(/توانایی:\s*/gu, "وقتی خوب پیش می‌رود، ")
    .replace(/چالش:\s*/gu, "وقتی گیر می‌کند، ")
    .replace(/برای برگشتن:\s*/gu, "برای برگشتن، ")
    .replace(/این توان بیشتر در\s*/gu, "این توان بیشتر وقتی دیده می‌شود که ")
    .replace(/این چالش بیشتر در ممکن است\s*/gu, "زیر فشار ممکن است ")
    .replace(/این چالش بیشتر در\s*/gu, "این بخش بیشتر وقتی سخت می‌شود که ")
    .replace(/نسخهٔ?\s+قدیمی/gu, "این گزارش")
    .replace(/داده(?:‌|ٔ|های)? محاسبه‌شده/gu, "اطلاعات نجومی ثبت‌شده")
    .replace(/دادهٔ ذخیره‌شده/gu, "اطلاعات ثبت‌شده")
    .replace(/فهرست فنی/gu, "جزئیات کامل نجومی")
    .replace(/جدول فنی/gu, "جدول کامل نجومی")
    .replace(/رتبه‌بندی/gu, "مرتب‌کردن")
    .replace(/غیرفعال(?:‌اند| است| هستند)?/gu, "در این خوانش استفاده نشده")
    .replace(/اطلاعات نجومی ثبت‌شدهٔ کافی/gu, "اطلاعات کافی")
    .trim();

  for (const term of INTERNAL_UI_TERMS) {
    output = output.replace(term, "");
  }

  return output
    .replace(/\s+([،؛.!؟])/gu, "$1")
    .replace(/\s{2,}/gu, " ")
    .replace(/دسته شواهد:\s*[a-z-]+/giu, "")
    .replace(/(?:personal-planet|luminary|chart-ruler|closeness)/giu, "")
    .replace(/^ممکن است\s+ممکن است\s+/u, "ممکن است ")
    .replace(/^ممکن است\s+/u, "گاهی ")
    .replace(/؛\s*ممکن است\s+/gu, "؛ گاهی ")
    .replace(/\s{2,}/gu, " ")
    .trim();
}

function buildHumanFirstPattern(
  pattern: ReportPrimaryPattern,
  index: number,
  contract: LiveReportReadingContract,
): HumanFirstNarrativeBlock {
  const kind = classifyPattern(pattern);
  const source = humanizeVisibleText(pattern.summary);
  const practice = humanizeVisibleText(
    contract.weeklyActions[index] ??
      CHAPTER_COPY[sectionForPattern(kind)].fallbackStep,
  );
  const evidence = pattern.evidence
    .map((detail, evidenceIndex) => ({
      id: `${pattern.id}-evidence-${evidenceIndex + 1}`,
      label: "نشانه نجومی",
      detail: humanizeVisibleText(detail),
    }))
    .filter((item) => Boolean(item.detail));
  const copy = getPatternCopy(kind, source);

  return {
    id: pattern.id,
    title: buildPatternTitle(kind, pattern.title),
    humanExperience: copy.humanExperience,
    dailySituation: copy.dailySituation,
    feelingOrReaction: copy.feelingOrReaction,
    effect: source || copy.effect,
    strength: copy.strength,
    challenge: copy.challenge,
    practicalStep: practice,
    evidence,
  };
}

function buildChapter(
  id: Exclude<HumanFirstReadingSectionId, "overview" | "primary-patterns" | "strength-challenge" | "deeper-layers" | "chart-details">,
  chapters: Array<LiveReportThemeChapter | undefined>,
  contract: LiveReportReadingContract,
  actionIndex: number,
): HumanFirstBirthChapter {
  const available = chapters.filter(
    (chapter): chapter is LiveReportThemeChapter => Boolean(chapter),
  );
  const paragraphs = uniqueStrings(
    available.flatMap((chapter) => {
      const relationshipParagraphs = chapter.relationshipGroups?.flatMap(
        (group) => group.paragraphs,
      ) ?? [];
      return [...chapter.paragraphs, ...relationshipParagraphs]
        .map(humanizeVisibleText)
        .filter(Boolean);
    }),
  );
  const evidence = buildChapterEvidence(id, available, contract);
  const copy = CHAPTER_COPY[id];

  return {
    id,
    title: copy.title,
    introduction: copy.introduction,
    paragraphs:
      paragraphs.length > 0
        ? paragraphs
        : [
            "این بخش فقط تا جایی پیش می‌رود که اطلاعات ثبت‌شدهٔ همین چارت اجازه می‌دهد و چیزی را از خودش اضافه نمی‌کند.",
          ],
    practicalStep: humanizeVisibleText(
      contract.weeklyActions[actionIndex] ?? copy.fallbackStep,
    ),
    evidence,
  };
}

function buildChapterEvidence(
  sectionId: HumanFirstReadingSectionId,
  chapters: LiveReportThemeChapter[],
  contract: LiveReportReadingContract,
): HumanFirstEvidence[] {
  const chapterSummaries = chapters
    .map((chapter, index) => ({
      id: `${sectionId}-chapter-${index + 1}`,
      label: chapter.title,
      detail: humanizeVisibleText(chapter.summary),
    }))
    .filter((item) => Boolean(item.detail));
  const tokens = sectionEvidenceTokens(sectionId);
  const matchingReferences = contract.evidenceReferences
    .filter((reference) => {
      const haystack = `${reference.label} ${reference.detail}`;
      return tokens.some((token) => haystack.includes(token));
    })
    .slice(0, 4)
    .map((reference) => ({
      id: reference.id,
      label: humanizeVisibleText(reference.label),
      detail: humanizeVisibleText(reference.detail),
    }))
    .filter((item) => Boolean(item.detail));

  return uniqueEvidence([...chapterSummaries, ...matchingReferences]).slice(0, 5);
}

function buildDeeperLayers(
  contract: LiveReportReadingContract,
): ReportNarrativeDeepDive[] {
  const signature = findChapter(contract, "real-engine-theme-signature");
  const signatureDive: ReportNarrativeDeepDive[] = signature
    ? [
        {
          id: "human-first-signature-deeper-layer",
          title: "لایه‌ای که دیگران زودتر می‌بینند و لایه‌ای که تصمیم می‌گیرد",
          navigationId: "overview",
          summary: humanizeVisibleText(signature.summary),
          paragraphs: signature.paragraphs
            .map(humanizeVisibleText)
            .filter(Boolean),
        },
      ]
    : [];

  return [
    ...signatureDive,
    ...contract.deepDiveSections.map((section) => ({
      ...section,
      title: humanizeVisibleText(section.title),
      summary: humanizeVisibleText(section.summary),
      paragraphs: section.paragraphs
        .map(humanizeVisibleText)
        .filter(Boolean),
    })),
  ];
}

function buildHumanLimitations(contract: LiveReportReadingContract): string[] {
  const output: string[] = [];

  if (!contract.hasReliableBirthTime) {
    output.push(
      "چون ساعت تولد دقیق نیست، درباره رایزینگ و خانه‌ها نتیجه‌گیری نشده؛ بخش‌های مستقل از ساعت همچنان بررسی شده‌اند.",
    );
  }

  for (const limitation of contract.limitations) {
    const containsInternalOnlyLanguage = INTERNAL_UI_TERMS.some((term) => {
      term.lastIndex = 0;
      return term.test(limitation);
    });
    const human = humanizeVisibleText(limitation)
      .replace(
        /زاویه‌ها، حاکم چارت و خانه‌ها[^.؟!]*/gu,
        "رایزینگ و خانه‌ها در این خوانش وارد نتیجه‌گیری نشده‌اند",
      )
      .replace(
        /تعداد جایگاه‌های سیاره‌ای محدود[^.؟!]*/gu,
        "این خوانش فقط از جایگاه‌هایی استفاده کرده که در گزارش ثبت شده‌اند",
      );
    const readableHumanLimit = human
      .replace(/^[:؛،\-\s]+/u, "")
      .replace(/[\s:؛،\-]+$/u, "")
      .trim();
    if (
      readableHumanLimit &&
      !(containsInternalOnlyLanguage && readableHumanLimit.length < 36)
    ) {
      output.push(readableHumanLimit);
    }
  }

  return uniqueStrings(output);
}

function classifyPattern(pattern: ReportPrimaryPattern): PatternKind {
  const value = `${pattern.id} ${pattern.title} ${pattern.summary}`;
  if (/احساس|امنیت|ماه|درون/u.test(value)) return "emotion";
  if (/ذهن|زبان|گفت|عطارد|فکر/u.test(value)) return "mind";
  if (/رابط|صمیم|زهره|مرز/u.test(value)) return "relationship";
  if (/اراده|حرکت|مریخ|عمل/u.test(value)) return "action";
  if (/جهت|مسیر|کار|هدف/u.test(value)) return "direction";
  if (/تکرار|اصطکاک|جنبه|تماس/u.test(value)) return "recurring";
  return "identity";
}

function sectionForPattern(
  kind: PatternKind,
): Exclude<HumanFirstReadingSectionId, "overview" | "primary-patterns" | "strength-challenge" | "deeper-layers" | "chart-details"> {
  switch (kind) {
    case "emotion":
      return "inner-world";
    case "mind":
      return "mind-language";
    case "relationship":
      return "relationships";
    case "action":
    case "direction":
      return "drive-direction";
    case "recurring":
      return "friction-repair";
    default:
      return "growth-path";
  }
}

function buildPatternTitle(kind: PatternKind, sourceTitle: string): string {
  const title = humanizeVisibleText(sourceTitle);
  switch (kind) {
    case "emotion":
      return "وقتی برای فهمیدن احساس خودت به زمان و امنیت نیاز داری";
    case "mind":
      return "وقتی ذهنت جلوتر از احساست آمادهٔ پاسخ‌دادن می‌شود";
    case "relationship":
      return "وقتی نیاز به نزدیکی با حفظ مرزهای شخصی همراه می‌شود";
    case "action":
      return "وقتی میل به حرکت با نیاز به سنجیدن پیامدها روبه‌رو می‌شود";
    case "direction":
      return "وقتی پیشرفت فقط با یک هدف معنادار برایت زنده می‌ماند";
    case "recurring":
      return "وقتی یک واکنش آشنا زیر فشار دوباره فعال می‌شود";
    default:
      return title && !looksTechnical(title)
        ? title
        : "وقتی تصویر بیرونی و ریتم درونی همیشه یکسان نیستند";
  }
}

function getPatternCopy(kind: PatternKind, source: string) {
  switch (kind) {
    case "emotion":
      return {
        humanExperience:
          "در موقعیت‌های حساس، قبل از اینکه چیزی را توضیح بدهی لازم داری بفهمی دقیقاً چه احساسی در تو فعال شده است.",
        dailySituation:
          "این الگو در گفت‌وگوی مبهم، تغییر ناگهانی برنامه یا وقتی حس می‌کنی نیازت شنیده نشده پررنگ‌تر می‌شود.",
        feelingOrReaction:
          "واکنش طبیعی می‌تواند کمی عقب‌کشیدن، فکرکردن بیشتر یا عقب‌انداختن پاسخ تا زمان مرتب‌شدن درونت باشد.",
        effect: source,
        strength:
          "وقتی این بخش خوب کار می‌کند، می‌توانی احساس را جدی بگیری بی‌آنکه مجبور شوی همان لحظه واکنش نشان بدهی.",
        challenge:
          "زیر فشار ممکن است آن‌قدر درونت را مرتب کنی که طرف مقابل سکوتت را فاصله یا بی‌تفاوتی ببیند.",
      };
    case "mind":
      return {
        humanExperience:
          "ذهن تو معمولاً می‌خواهد موضوع را روشن، قابل نام‌گذاری و قابل تصمیم کند؛ حتی وقتی احساس هنوز به زمان بیشتری احتیاج دارد.",
        dailySituation:
          "در بحث‌های مهم یا وقتی چند انتخاب هم‌زمان پیش رویت قرار می‌گیرد، سرعت فکر و سرعت احساس می‌توانند از هم فاصله بگیرند.",
        feelingOrReaction:
          "گاهی سریع توضیح می‌دهی و گاهی آن‌قدر دنبال جمله دقیق می‌گردی که خواسته اصلی دیرتر شنیده می‌شود.",
        effect: source,
        strength:
          "وقتی این بخش خوب کار می‌کند، می‌توانی موضوع پیچیده را روشن کنی و حرفی بزنی که واقعاً منظورت را منتقل کند.",
        challenge:
          "زیر فشار ممکن است یا خیلی زود توضیح بدهی، یا آن‌قدر دنبال جملهٔ بی‌نقص بگردی که خواستهٔ اصلی دیر شنیده شود.",
      };
    case "relationship":
      return {
        humanExperience:
          "نزدیکی برای تو فقط صمیمیت نیست؛ باید همراه احترام، امنیت و فضایی باشد که در آن خودت بمانی.",
        dailySituation:
          "این نیاز وقتی پررنگ می‌شود که طرف مقابل پاسخ فوری، نزدیکی بیشتر یا توضیحی بخواهد که هنوز آماده‌اش نیستی.",
        feelingOrReaction:
          "می‌توانی هم‌زمان میل به نزدیک‌شدن و نیاز به فاصله کوتاه را تجربه کنی؛ همین دوگانگی اگر گفته نشود سوءتفاهم می‌سازد.",
        effect: source,
        strength:
          "وقتی این بخش خوب کار می‌کند، هم نزدیکی را می‌پذیری و هم بدون حذف خودت مرز و نیازت را روشن نگه می‌داری.",
        challenge:
          "زیر فشار ممکن است میان نزدیک‌شدن و عقب‌کشیدن رفت‌وبرگشت کنی و چیزی را که لازم داری دیرتر بگویی.",
      };
    case "action":
      return {
        humanExperience:
          "وقتی چیزی برایت مهم می‌شود، انرژی زیادی برای حرکت داری؛ اما بهترین نتیجه زمانی می‌آید که سرعت عمل با جهت روشن همراه باشد.",
        dailySituation:
          "در شروع کار، رقابت، دفاع از خواسته یا زمانی که احساس می‌کنی فرصت در حال از دست‌رفتن است، این الگو خودش را نشان می‌دهد.",
        feelingOrReaction:
          "فشار می‌تواند تو را به واکنش سریع یا برعکس به نگه‌داشتن انرژی تا زمان اطمینان بیشتر ببرد.",
        effect: source,
        strength:
          "وقتی این بخش خوب کار می‌کند، انرژی‌ات را مستقیم و سنجیده خرج می‌کنی و خواسته‌ات را بدون جنگ یا حذف خودت جلو می‌بری.",
        challenge:
          "زیر فشار ممکن است بین عجله و عقب‌نشینی گیر کنی، خشم را نگه داری یا منتظر زمان کاملاً مناسبی بمانی که نمی‌رسد.",
      };
    case "direction":
      return {
        humanExperience:
          "برای ادامه‌دادن لازم داری بدانی کاری که انجام می‌دهی به چه چیزی بزرگ‌تر از وظیفه روزمره وصل است.",
        dailySituation:
          "وقتی مسیر مبهم، پراکنده یا فقط بر اساس انتظار دیگران تعریف شده باشد، انگیزه افت می‌کند.",
        feelingOrReaction:
          "معمولاً یا دنبال معنای روشن‌تری می‌گردی یا تا پیدا‌شدن جهت شخصی، حرکت را آهسته‌تر می‌کنی.",
        effect: source,
        strength:
          "وقتی این بخش خوب کار می‌کند، مسیرت را از انتظار دیگران جدا می‌کنی و انرژی‌ات را روی چیزی می‌گذاری که واقعاً برایت معنا دارد.",
        challenge:
          "زیر فشار ممکن است پراکنده شوی، انگیزه را از دست بدهی یا فقط برای راضی نگه‌داشتن دیگران مسیر را ادامه بدهی.",
      };
    case "recurring":
      return {
        humanExperience:
          "زیر فشار، یک پاسخ قدیمی زودتر از انتخاب تازه وارد میدان می‌شود؛ شناخت آن به تو فرصت مکث می‌دهد.",
        dailySituation:
          "این چرخه اغلب در خستگی، عجله، احساس قضاوت‌شدن یا تکرار اختلافی آشنا ظاهر می‌شود.",
        feelingOrReaction:
          "ممکن است دفاع کنی، عقب بکشی یا روی یک بخش از موضوع قفل شوی؛ بعدتر می‌بینی نیاز اصلی چیز دیگری بوده است.",
        effect: source,
        strength:
          "وقتی این بخش خوب کار می‌کند، شروع چرخه را زودتر می‌بینی و پیش از واکنش فرصت انتخاب پیدا می‌کنی.",
        challenge:
          "زیر فشار ممکن است دفاع کنی، عقب بکشی یا روی یک بخش از ماجرا قفل شوی و نیاز اصلی را دیرتر ببینی.",
      };
    default:
      return {
        humanExperience:
          "آن چیزی که دیگران در نگاه اول از تو می‌بینند همیشه تمام داستان نیست؛ تصمیم‌های مهم از لایه‌ای شخصی‌تر و آرام‌تر می‌آیند.",
        dailySituation:
          "در جمع تازه، شروع یک مسیر یا زمانی که باید زود خودت را معرفی کنی، فاصله میان ظاهر و تجربه درونی روشن‌تر می‌شود.",
        feelingOrReaction:
          "می‌توانی در ظاهر مطمئن یا سازگار دیده شوی، در حالی که درونت هنوز در حال سنجیدن موقعیت است.",
        effect: source,
        strength:
          "وقتی این بخش خوب کار می‌کند، می‌توانی حضورت را نشان بدهی و هم‌زمان برای فهمیدن ریتم درونی خودت هم جا نگه داری.",
        challenge:
          "زیر فشار ممکن است تصویری که از بیرون دیده می‌شود با چیزی که درونت می‌گذرد فاصله بگیرد و سوءتفاهم بسازد.",
      };
  }
}

function ensureThreePatterns(
  patterns: HumanFirstNarrativeBlock[],
  contract: LiveReportReadingContract,
): HumanFirstNarrativeBlock[] {
  const result = [...patterns];
  const fallbacks: HumanFirstNarrativeBlock[] = [
    buildFallbackPattern("identity", 0, contract),
    buildFallbackPattern("emotion", 1, contract),
    buildFallbackPattern("recurring", 2, contract),
  ];

  for (const fallback of fallbacks) {
    if (result.length >= 3) break;
    result.push(fallback);
  }

  return result.slice(0, 3);
}

function buildFallbackPattern(
  kind: PatternKind,
  index: number,
  contract: LiveReportReadingContract,
): HumanFirstNarrativeBlock {
  const copy = getPatternCopy(kind, "این بخش فقط بر اطلاعاتی تکیه دارد که در همین گزارش ثبت شده است.");
  return {
    id: `human-first-fallback-${kind}`,
    title: buildPatternTitle(kind, ""),
    humanExperience: copy.humanExperience,
    dailySituation: copy.dailySituation,
    feelingOrReaction: copy.feelingOrReaction,
    effect: copy.effect,
    strength: copy.strength,
    challenge: copy.challenge,
    practicalStep: humanizeVisibleText(
      contract.weeklyActions[index] ??
        CHAPTER_COPY[sectionForPattern(kind)].fallbackStep,
    ),
    evidence: [],
  };
}

function findChapter(
  contract: LiveReportReadingContract,
  id: string,
): LiveReportThemeChapter | undefined {
  return contract.themeChapters.find((chapter) => chapter.id === id);
}

function sectionEvidenceTokens(sectionId: HumanFirstReadingSectionId): string[] {
  switch (sectionId) {
    case "inner-world":
      return ["ماه", "احساس", "امنیت", "خانه ۴", "خانه ۸"];
    case "mind-language":
      return ["عطارد", "ذهن", "گفت", "زبان", "خانه ۳"];
    case "relationships":
      return ["زهره", "رابط", "مرز", "خانه ۷", "خانه ۸"];
    case "drive-direction":
      return ["مریخ", "خورشید", "جهت", "کار", "خانه ۱۰"];
    case "friction-repair":
      return ["زحل", "مربع", "مقابله", "اصطکاک", "جنبه"];
    case "growth-path":
      return ["دست", "گره", "رشد", "مسیر", "زحل"];
    default:
      return [];
  }
}

function looksTechnical(value: string): boolean {
  return /(در\s+خانه\s+\d|درجه|اورب|زاویه|مقارنه|مربع|تثلیث|تسدیس|مقابله)/u.test(
    value,
  );
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    const normalized = value.replace(/[\s\u00a0]+/gu, " ").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function uniqueEvidence(values: HumanFirstEvidence[]): HumanFirstEvidence[] {
  const seen = new Set<string>();
  return values.filter((item) => {
    const key = `${item.label}|${item.detail}`;
    if (!item.detail || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
