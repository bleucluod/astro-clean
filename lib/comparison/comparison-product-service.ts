import {
  buildRealSynastry,
  createSynastryNatalSnapshot,
} from "@/lib/astrology/synastry/real-synastry-engine";
import { buildFullComparisonInterpretation } from "@/lib/comparison/comparison-full-interpretation";
import { buildComparisonEvidencePlan } from "@/lib/comparison/comparison-evidence-plan";
import type { AstrologyReport } from "@/types/astro";
import type {
  ComparisonNarrativeChapter,
  ComparisonPrimaryPattern,
  ComparisonReading,
  ComparisonRecord,
  CreateComparisonInput,
  CreateComparisonResult,
} from "@/types/comparison-product";
import {
  COMPARISON_PRIVACY_VERSION,
  COMPARISON_PRODUCT_VERSION,
} from "@/types/comparison-product";
import type {
  HumanFirstDirectionalNarrativeBlock,
  HumanFirstEvidence,
} from "@/types/human-first-reading";
import type {
  RealSynastryReport,
  SynastryBirthTimeStatus,
  SynastryInterChartAspect,
} from "@/types/synastry-engine";

const EMOTIONAL_POINT_IDS = new Set(["moon", "venus", "saturn"]);
const BOUNDARY_POINT_IDS = new Set(["saturn", "uranus", "pluto"]);

export function createPrivateComparison(
  chartAReport: AstrologyReport,
  chartBReport: AstrologyReport,
  input: CreateComparisonInput,
): CreateComparisonResult {

  if (input.chartAId === input.chartBId) {
    return {
      ok: false,
      code: "same-chart",
      message: "برای مقایسه، دو چارت متفاوت انتخاب کن.",
      issues: ["شناسه دو چارت یکسان است."],
    };
  }

  if (!chartAReport.realEngine) {
    return {
      ok: false,
      code: "chart-a-missing-engine",
      message: "چارت اول اطلاعات نجومی کافی برای مقایسه ندارد.",
      issues: ["اطلاعات کامل چارت اول همراه گزارش نیست."],
    };
  }

  if (!chartBReport.realEngine) {
    return {
      ok: false,
      code: "chart-b-missing-engine",
      message: "چارت دوم اطلاعات نجومی کافی برای مقایسه ندارد.",
      issues: ["اطلاعات کامل چارت دوم همراه گزارش نیست."],
    };
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const chartA = createSynastryNatalSnapshot({
    chartId: input.chartAId,
    label: normalizeLabel(input.chartALabel, chartAReport, "نفر اول"),
    birthTimeStatus: input.chartABirthTimeStatus,
    snapshot: chartAReport.realEngine,
  });
  const chartB = createSynastryNatalSnapshot({
    chartId: input.chartBId,
    label: normalizeLabel(input.chartBLabel, chartBReport, "نفر دوم"),
    birthTimeStatus: input.chartBBirthTimeStatus,
    snapshot: chartBReport.realEngine,
  });
  const synastryResult = buildRealSynastry({
    chartA,
    chartB,
    relationshipContext: input.relationshipContext,
    generatedAt,
  });

  if (!synastryResult.ok) {
    return {
      ok: false,
      code: "synastry-failed",
      message: "ساخت گزارش مقایسه کامل نشد. ورودی‌ها را بررسی و دوباره تلاش کن.",
      issues: synastryResult.issues,
    };
  }

  const record: ComparisonRecord = {
    version: COMPARISON_PRODUCT_VERSION,
    id: input.recordId ?? createComparisonId(),
    createdAt: generatedAt,
    updatedAt: generatedAt,
    relationshipContext: input.relationshipContext,
    chartAId: input.chartAId,
    chartBId: input.chartBId,
    chartALabel: chartA.label,
    chartBLabel: chartB.label,
    chartABirthTimeStatus: input.chartABirthTimeStatus,
    chartBBirthTimeStatus: input.chartBBirthTimeStatus,
    privacy: {
      version: COMPARISON_PRIVACY_VERSION,
      visibility: "private",
      indexingPolicy: "noindex",
      rawBirthInputStored: false,
    },
    report: synastryResult.report,
    reading: buildHumanFirstComparisonReading(synastryResult.report, {
      chartALabel: chartA.label,
      chartBLabel: chartB.label,
      chartABirthTimeStatus: input.chartABirthTimeStatus,
      chartBBirthTimeStatus: input.chartBBirthTimeStatus,
    }),
  };

  return { ok: true, record };
}

export function rebuildPrivateComparison(
  existing: ComparisonRecord,
  chartAReport: AstrologyReport,
  chartBReport: AstrologyReport,
): CreateComparisonResult {
  const rebuilt = createPrivateComparison(chartAReport, chartBReport, {
    chartAId: existing.chartAId,
    chartBId: existing.chartBId,
    chartALabel: existing.chartALabel,
    chartBLabel: existing.chartBLabel,
    chartABirthTimeStatus: existing.chartABirthTimeStatus,
    chartBBirthTimeStatus: existing.chartBBirthTimeStatus,
    relationshipContext: existing.relationshipContext,
    recordId: existing.id,
  });

  if (!rebuilt.ok) return rebuilt;

  return {
    ok: true,
    record: {
      ...rebuilt.record,
      createdAt: existing.createdAt,
    },
  };
}

export function getDefaultComparisonBirthTimeStatus(
  report: AstrologyReport,
): "exact" | "unknown" {
  if (report.input.birthTimeAccuracy === "known") return "exact";
  if (report.input.birthTimeAccuracy === "unknown") return "unknown";

  const hasAngles = Boolean(
    report.realEngine?.angles && Object.keys(report.realEngine.angles).length > 0,
  );
  const hasTwelveHouses = report.realEngine?.houses?.length === 12;
  if (!hasAngles || !hasTwelveHouses) return "unknown";

  return "exact";
}
export function getComparisonChartLabel(
  report: AstrologyReport,
  fallback = "چارت بدون نام",
): string {
  return report.input.name?.trim() || fallback;
}

export function buildHumanFirstComparisonReading(
  report: RealSynastryReport,
  context: {
    chartALabel: string;
    chartBLabel: string;
    chartABirthTimeStatus: SynastryBirthTimeStatus;
    chartBBirthTimeStatus: SynastryBirthTimeStatus;
  },
): ComparisonReading {
  const labels = {
    a: normalizePersonLabel(context.chartALabel, "نفر اول"),
    b: normalizePersonLabel(context.chartBLabel, "نفر دوم"),
  };
  const primaryPatterns = selectPrimaryPatterns(report, labels);
  const narrativeOwner = new Set(
    primaryPatterns.flatMap((pattern) => pattern.contactIds),
  );
  const chapters = buildNarrativeChapters(
    report,
    labels,
    primaryPatterns,
    narrativeOwner,
  );
  const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const communication = chapterById.get("communication")!.block;
  const emotionalSecurity = chapterById.get("emotional-security")!.block;
  const closenessIndependence = chapterById.get("attraction-intimacy")!.block;
  const boundariesCommitment = chapterById.get("boundaries-commitment")!.block;
  const frictionRepair = chapterById.get("friction-repair")!.block;
  const support = buildDirectionalBlock(
    "support",
    report.contacts.find((contact) => contact.polarity === "supportive") ?? null,
    labels,
    report.synthesis.supportiveFa,
  );
  const misunderstanding = frictionRepair;
  const growthEvidence = uniqueEvidence([
    ...primaryPatterns.flatMap((pattern) => pattern.evidence),
    ...frictionRepair.evidence,
  ]).slice(0, 6);
  const readingLimitFa = buildReadingLimit(
    context.chartABirthTimeStatus,
    context.chartBBirthTimeStatus,
  );

  const fallbackOverviewParagraphsFa = buildWeightedComparisonOverview(
    report,
    primaryPatterns,
  );
  const fullInterpretation = buildFullComparisonInterpretation(report, {
    labels,
    chartABirthTimeStatus: context.chartABirthTimeStatus,
    chartBBirthTimeStatus: context.chartBBirthTimeStatus,
    fallbackOverviewParagraphsFa,
  });
  const overviewParagraphsFa = fullInterpretation.openingParagraphsFa;
  const conversationQuestionsFa = buildConversationQuestions(labels);
  return {
    overviewFa: overviewParagraphsFa.join(" "),
    overviewParagraphsFa,
    fullInterpretation,
    primaryPatterns,
    chapters,
    conversationQuestionsFa,
    support,
    misunderstanding,
    communication,
    emotionalSecurity,
    closenessIndependence,
    boundariesCommitment,
    frictionRepair,
    growth: {
      personASkill: buildGrowthSkill(labels.a, communication, frictionRepair),
      personBSkill: buildGrowthSkill(labels.b, emotionalSecurity, boundariesCommitment),
      cycleToNotice: frictionRepair.cycle,
      practicalStep:
        "هفته‌ای یک بار، پیش از حل مسئله هر نفر در یک جمله بگوید چه احساسی دارد، چه برداشتی کرده و اکنون چه درخواست کوچکی دارد.",
      evidence: growthEvidence,
    },
    readingLimitFa,
    supportiveFa: support.humanExperience,
    frictionFa: misunderstanding.humanExperience,
    communicationFa: communication.humanExperience,
    emotionalSecurityFa: emotionalSecurity.humanExperience,
    closenessIndependenceFa: closenessIndependence.humanExperience,
    boundariesRepairFa: frictionRepair.practicalStep,
  };
}

function buildNarrativeChapters(
  report: RealSynastryReport,
  labels: { a: string; b: string },
  primaryPatterns: ComparisonPrimaryPattern[],
  narrativeOwner: Set<string>,
): ComparisonNarrativeChapter[] {
  const specs: Array<{
    id: ComparisonNarrativeChapter["id"];
    eyebrow: string;
    title: string;
    section:
      | "communication"
      | "emotional-security"
      | "closeness-independence"
      | "boundaries-commitment"
      | "friction-repair";
    fallback: string;
    predicate: (contact: SynastryInterChartAspect) => boolean;
  }> = [
    {
      id: "communication",
      eyebrow: "گفت‌وگو",
      title: "چرا گاهی حرف هم را متفاوت می‌شنوید؟",
      section: "communication",
      fallback: report.dynamics.communicationFa,
      predicate: (contact) => contact.categories.includes("communication"),
    },
    {
      id: "emotional-security",
      eyebrow: "امنیت عاطفی",
      title: "چه چیزی حس دیده‌شدن یا ناامنی را فعال می‌کند؟",
      section: "emotional-security",
      fallback: "امنیت عاطفی وقتی بیشتر می‌شود که نیاز به پاسخ، مکث و حمایت به زبان روشن گفته شود.",
      predicate: isEmotionalContact,
    },
    {
      id: "attraction-intimacy",
      eyebrow: "کشش و صمیمیت",
      title: "چه چیزی شما را نزدیک می‌کند و کجا به فاصله نیاز دارید؟",
      section: "closeness-independence",
      fallback: report.dynamics.closenessIndependenceFa,
      predicate: (contact) =>
        contact.categories.includes("closeness") ||
        ["venus", "mars"].includes(contact.pointA.id) ||
        ["venus", "mars"].includes(contact.pointB.id),
    },
    {
      id: "boundaries-commitment",
      eyebrow: "مرز و تعهد",
      title: "کجا تعریف مسئولیت، استقلال یا تعهد متفاوت می‌شود؟",
      section: "boundaries-commitment",
      fallback: "تعهد وقتی قابل اعتمادتر می‌شود که مرز، مسئولیت و حق خلوت هر دو نفر از قبل روشن باشد.",
      predicate: (contact) =>
        contact.categories.includes("independence") ||
        BOUNDARY_POINT_IDS.has(contact.pointA.id) ||
        BOUNDARY_POINT_IDS.has(contact.pointB.id),
    },
    {
      id: "friction-repair",
      eyebrow: "اصطکاک و ترمیم",
      title: "وقتی سخت می‌شود، چرخهٔ تنش چطور شروع و متوقف می‌شود؟",
      section: "friction-repair",
      fallback: report.synthesis.tensionFa,
      predicate: (contact) =>
        contact.polarity === "tension" || contact.polarity === "intense",
    },
  ];

  const communicationPlan = buildComparisonEvidencePlan(report).chapterPlans.find(
    (chapter) => chapter.chapter === "communication",
  );
  return specs.map((spec) => {
    if (spec.id === "communication") {
      const primary = report.contacts.find((contact) => contact.id === communicationPlan?.primary?.id);
      const support = report.contacts.find((contact) => contact.id === communicationPlan?.support?.id);
      // Keep legacy allocation for the four chapters awaiting their own rewrite.
      const legacyContact = findOwnedContact(report, narrativeOwner, spec.predicate);
      if (legacyContact) narrativeOwner.add(legacyContact.id);
      return {
        id: spec.id,
        eyebrow: spec.eyebrow,
        title: spec.title,
        ownerContactId: primary?.id ?? null,
        crossReferencePatternId: null,
        crossReferencePatternTitle: null,
        block: buildCommunicationChapter(primary, support, labels),
      };
    }
    const contact = findOwnedContact(report, narrativeOwner, spec.predicate);
    if (contact) narrativeOwner.add(contact.id);
    const crossReference = contact
      ? null
      : primaryPatterns.find((pattern) =>
          pattern.contactIds.some((contactId) => {
            const patternContact = report.contacts.find((item) => item.id === contactId);
            return patternContact ? spec.predicate(patternContact) : false;
          }),
        ) ?? null;
    return {
      id: spec.id,
      eyebrow: spec.eyebrow,
      title: spec.title,
      ownerContactId: contact?.id ?? null,
      crossReferencePatternId: crossReference?.id ?? null,
      crossReferencePatternTitle: crossReference?.title ?? null,
      block: buildDirectionalBlock(spec.section, contact, labels, spec.fallback),
    };
  });
}


/** Interpret the approved communication witness by planet ownership, not input order.
 * The lead is self-contained; the other visible fields add distinct observations.
 * No inference about a missing or excluded contact is made here. */
function buildCommunicationChapter(
  primary: SynastryInterChartAspect | undefined,
  support: SynastryInterChartAspect | undefined,
  labels: { a: string; b: string },
): HumanFirstDirectionalNarrativeBlock {
  if (!primary) {
    const limited = "تماس معتبر و اختصاصی کافی برای توضیح سبک گفت‌وگوی این دو نفر در دست نیست.";
    return {
      id: "communication-insufficient", title: "آنچه هنوز دربارهٔ گفت‌وگوی شما نمی‌دانیم",
      humanExperience: limited, dailySituation: "برای نمونه، از یک جواب کوتاه نمی‌توان فهمید طرف مقابل مخالف است یا فقط توضیح بیشتری می‌خواهد.",
      strength: "این خوانش برای هیچ‌کدام سبک ثابتی تعیین نمی‌کند.",
      challenge: "نبود شاهد را نباید نشانهٔ مشکل در گفت‌وگو دانست.",
      practicalStep: "وقتی معنای یک جواب روشن نیست، دربارهٔ همان جمله سؤال کنید.",
      feelingOrReaction: limited, effect: limited, personA: limited, personB: limited,
      cycle: limited, evidence: [],
    };
  }
  const owner = (contact: SynastryInterChartAspect, point: string) =>
    contact.pointA.id === point ? labels.a : contact.pointB.id === point ? labels.b : null;
  const mercury = owner(primary, "mercury");
  const sun = owner(primary, "sun");
  const moon = owner(primary, "moon");
  const mars = owner(primary, "mars");
  const smooth = primary.aspectId === "trine" || primary.aspectId === "sextile";
  const hard = primary.aspectId === "opposition" || primary.aspectId === "square";
  const relationship = (contact: SynastryInterChartAspect) =>
    `${contact.pointA.label} ${labels.a} و ${contact.pointB.label} ${labels.b} در جنبهٔ ${contact.aspectLabel}`;
  const evidenceFor = (contact: SynastryInterChartAspect, label: string): HumanFirstEvidence => ({
    id: contact.id + "-communication", label,
    detail: relationship(contact) + ".",
  });
  const evidence = [evidenceFor(primary, "شاهد اصلی گفت‌وگو")];
  const secondaryMoon = support && owner(support, "moon");
  const secondaryMercury = support && owner(support, "mercury");
  const secondarySun = support && owner(support, "sun");
  const secondaryJupiter = support && owner(support, "jupiter");
  let title: string, lead: string, example: string, strength: string, challenge: string, step: string;
  let roles: Record<string, string> = {};
  if (mercury && sun && hard) {
    title = "وقتی نقد یک نظر، نقد خودِ آدم شنیده می‌شود";
    lead = `${mercury} برای بررسی یک فکر سراغ دلیل و سؤال می‌رود؛ ${sun} ممکن است همان سؤال را ارزیابی انتخاب خودش بشنود. در تفسیر نجومی، ${relationship(primary)} این فاصله میان قصد گوینده و برداشت شنونده را برجسته می‌کند. مثلاً وقتی ${sun} از ایدهٔ تازه‌ای حرف می‌زند و ${mercury} می‌پرسد «چرا این راه؟»، سؤال دربارهٔ طرح است، نه لزوماً دربارهٔ توانایی صاحب آن.`;
    example = `در انتخاب یک فیلم هم، ${mercury} می‌تواند ضعف داستان را توضیح بدهد، اما ${sun} جواب را مخالفت با سلیقهٔ خودش بشنود. اگر ${sun} فقط می‌پرسد نظرت چیست، لازم است روشن باشد که دنبال بررسی است یا شریک‌کردن دیگری در تجربه‌اش.`;
    strength = `این تفاوت یک امکان هم دارد: ${sun} زاویهٔ شخصی انتخاب را روشن می‌کند و ${mercury} کمک می‌کند دلایل آن قابل توضیح شوند.`;
    challenge = `وقتی ${mercury} بدون بیان موضوع سؤال وارد جزئیات می‌شود، ${sun} ممکن است معنای شخصی به آن بدهد؛ و وقتی ${sun} فقط بر انتخاب خود تأکید می‌کند، سؤال اول بی‌جواب می‌ماند.`;
    step = `${mercury} پیش از نظر دادن مشخص کند کدام بخش ایده را می‌سنجد؛ ${sun} نیز بپرسد «منظورت نقد این پیشنهاد است یا چیز دیگری؟» تا دو موضوع از هم جدا شوند.`;
    roles = { [mercury]: "دلیل و محتوای پیشنهاد را بررسی می‌کند.", [sun]: "معنای سؤال را از زاویهٔ انتخاب شخصی می‌سنجد." };
  } else if (mercury && moon && smooth) {
    title = "وقتی یکی چیزی را حس می‌کند و دیگری برایش کلمه پیدا می‌کند";
    lead = `${moon} لازم نیست همیشه از همان ابتدا برای تجربه‌اش عبارت دقیقی داشته باشد. ${mercury} از جزئیات حرف او سرنخ می‌گیرد و منظور را صورت‌بندی می‌کند. ${relationship(primary)} در زبان سیناستری نشانهٔ این امکان برای فهم متقابل است. مثلاً ${moon} هنگام تعریف یک اتفاق فقط می‌گوید «یه جای کار عجیب بود»؛ ${mercury} می‌پرسد «یعنی انتظار داشتی از قبل خبرت کنند؟» و ابهام به موضوعی روشن تبدیل می‌شود.`;
    example = `وقتی ${mercury} یک خبر را با جزئیات تعریف می‌کند، ${moon} می‌تواند به نکته‌ای اشاره کند که در خود خبر گفته نشده: مثلاً اینکه چرا آن تصمیم برای گوینده مهم بوده است. این بار جهت فهم برعکس است؛ شنونده معنای انسانی حرف را پیدا می‌کند.`;
    strength = `گفت‌وگوی شما از کنار هم گذاشتن دو نوع اطلاعات سود می‌برد: تجربهٔ ${moon} و عبارت‌بندی ${mercury}. هر کدام می‌تواند چیزی را به روایت دیگری اضافه کند.`;
    challenge = `هم‌زبانی به معنای خواندن ذهن نیست. اگر ${mercury} اولین توضیح خودش را جواب نهایی بداند، احتمال دارد نکتهٔ دیگری را که ${moon} هنوز توضیح نداده نشنود.`;
    step = `${mercury} برداشت خود را به صورت سؤال بازگرداند، نه نتیجهٔ قطعی: «درست فهمیدم که مسئله این بود؟» ${moon} همان بخش را تأیید یا اصلاح کند.`;
    roles = { [moon]: "سرنخ تجربه و معنای آن را وارد گفت‌وگو می‌کند.", [mercury]: "به تجربه عبارت و ساختار قابل بررسی می‌دهد." };
  } else if (mercury && mars && smooth) {
    title = "از حرف تا امتحان‌کردن یک ایده";
    lead = `${mercury} با طرح یک راه یا سؤال، جهت گفت‌وگو را عوض می‌کند و ${mars} با یک پیشنهاد عملی به آن جان می‌دهد. ${relationship(primary)} در خوانش نجومی از پیوند میان فکر و اقدام حمایت می‌کند. مثلاً ${mercury} می‌گوید «می‌شه این وسیله رو یه جور دیگه چید؟» و ${mars} پیشنهاد می‌دهد همان‌جا یک بار امتحانش کنند. حرف به جای ماندن در حد فرض، چیزی برای بررسی پیدا می‌کند.`;
    example = `در گفت‌وگو دربارهٔ یک مسیر تازه یا روش انجام کاری، ${mars} می‌تواند نخستین پیشنهاد را مطرح کند و ${mercury} گزینه‌هایش را مرتب کند. این شکل برعکس هم کار می‌کند: اقدام، سؤال تازه‌ای به وجود می‌آورد.`;
    strength = `وقتی موضوع قابل آزمودن است، ${mercury} معیار مقایسه را روشن می‌کند و ${mars} کمک می‌کند از حد بحث نظری فراتر بروید.`;
    challenge = `سرعت تبدیل حرف به عمل گاهی معنای جمله را عوض می‌کند: ${mercury} ممکن است صرفاً یک احتمال مطرح کرده باشد، در حالی که ${mars} آن را پیشنهاد انجام دادن می‌شنود.`;
    step = `قبل از امتحان یک ایده، ${mercury} مشخص کند که در حال فکر کردن با صدای بلند است یا واقعاً پیشنهاد اجرا دارد؛ ${mars} بر همان اساس جواب بدهد.`;
    roles = { [mercury]: "ایده و معیار بررسی را به زبان می‌آورد.", [mars]: "راه آزمودن ایده را مطرح می‌کند." };
  } else {
    // Other Mercury contacts require their own detailed semantic rules.
    // Until then, name the actual witness and limit the interpretation.
    const speaker = mercury ?? labels.a;
    const listener = speaker === labels.a ? labels.b : labels.a;
    const other = primary.pointA.id === "mercury" ? primary.pointB : primary.pointA;
    const focus: Record<string, string> = { sun: "نظر و انتخاب شخصی", moon: "تجربه و احساس", mercury: "معنای کلمات", venus: "سلیقه و شیوهٔ بیان علاقه", mars: "پیشنهاد عملی", jupiter: "دامنه و امکان‌های ایده", saturn: "جزئیات و معیارهای قابل بررسی", uranus: "راه‌های غیرمنتظره", neptune: "معنای ضمنی", pluto: "پرسش‌های عمیق‌تر", asc: "برداشت نخست", dsc: "معنای شراکت", mc: "هدف", ic: "معنای شخصی" };
    const theme = focus[other.id] ?? "معنای پیشنهاد";
    title = "دو زاویه برای شنیدن یک پیشنهاد";
    lead = `${relationship(primary)} شاهد اصلی این بخش است. در چارچوب تفسیر نجومی، بیان و پرسش ${speaker} با ${theme} برای ${listener} پیوند می‌خورد. ${smooth ? "این پیوند می‌تواند فهمیدن منظور را آسان‌تر کند." : hard ? "این پیوند می‌تواند تفاوت برداشت از یک جمله را برجسته کند." : "شکل دقیق این پیوند به موقعیت وابسته است."} مثلاً در گفت‌وگو دربارهٔ یک ایده، موضوع سؤال و دلیل اهمیت آن برای هر نفر ممکن است یکسان نباشد.`;
    example = `در یک نظرخواهی ساده، ${speaker} می‌تواند مشخص کند دربارهٔ کدام بخش نظر می‌خواهد و ${listener} همان بخش را پاسخ دهد.`;
    strength = "این تماس زمینه‌ای برای بررسی تفاوت برداشت فراهم می‌کند، نه حکم قطعی دربارهٔ کیفیت ارتباط.";
    challenge = "از این تماس به تنهایی نمی‌توان انگیزهٔ پنهان یا شیوهٔ ثابت واکنش را نتیجه گرفت.";
    step = "موضوع سؤال را از برداشت شخصی دربارهٔ گوینده جدا کنید و به همان موضوع جواب بدهید.";
    roles = { [speaker]: "پرسش یا عبارت را مطرح می‌کند.", [listener]: "آن را از زاویهٔ موضوع مرتبط می‌سنجد." };
  }
  if (support && (support.aspectId === "sextile" || support.aspectId === "trine" || support.aspectId === "conjunction")) {
    if (secondaryMoon && secondaryMercury && secondaryMoon !== secondaryMercury && moon !== secondaryMoon) {
      strength += ` شاهد دوم، ${relationship(support)}، مسیر دیگری باز می‌کند: وقتی ${secondaryMoon} به جای داوری دربارهٔ یک نظر، تجربهٔ خودش را توضیح می‌دهد، ${secondaryMercury} می‌تواند روی معنای دقیق آن سؤال کند. مثلاً پس از یک بازدید، به‌جای «خوب نبود»، شرح اینکه کدام بخش تجربه دلچسب نبود، موضوع قابل گفت‌وگو را روشن می‌کند.`;
      evidence.push(evidenceFor(support, "شاهد پشتیبان"));
    } else if (secondaryJupiter && secondaryMercury && secondaryJupiter !== secondaryMercury) {
      strength += ` ${relationship(support)} به عنوان شاهد دوم، امکان گسترش یک فکر را نشان می‌دهد: وقتی ${secondaryMercury} دربارهٔ یادگیری یک مهارت حرف می‌زند، ${secondaryJupiter} می‌تواند گزینه‌ای را مطرح کند که پیش از آن در نظر نگرفته بود. این بخش دربارهٔ ساختن ایدهٔ تازه است، نه صرفاً توضیح دوبارهٔ احساس.`;
      evidence.push(evidenceFor(support, "شاهد پشتیبان"));
    }
  }
  if (support && secondarySun && secondaryMercury && secondarySun !== secondaryMercury &&
      (support.aspectId === "opposition" || support.aspectId === "square") && !sun) {
    challenge += ` شاهد دوم، ${relationship(support)}، مرز این توانایی را روشن می‌کند. در موضوعی که انتخاب شخصی ${secondarySun} مطرح است، سؤال ${secondaryMercury} ممکن است نقد خود آن انتخاب شنیده شود؛ حتی وقتی در کارهای عملی هماهنگی خوبی دارند.`;
    evidence.push(evidenceFor(support, "شاهد پشتیبان"));
  }
  return {
    id: "communication-" + primary.id, title, humanExperience: lead,
    dailySituation: example, strength, challenge, practicalStep: step, evidence,
    personA: roles[labels.a] ?? "نقش او در شاهد اصلی به موضوع گفت‌وگو وابسته است.",
    personB: roles[labels.b] ?? "نقش او در شاهد اصلی به موضوع گفت‌وگو وابسته است.",
    feelingOrReaction: challenge, effect: strength, cycle: example,
  };
}

function findOwnedContact(
  report: RealSynastryReport,
  narrativeOwner: Set<string>,
  predicate: (contact: SynastryInterChartAspect) => boolean,
): SynastryInterChartAspect | null {
  return (
    [...report.contacts]
      .filter((contact) => !narrativeOwner.has(contact.id) && predicate(contact))
      .sort(
        (left, right) =>
          right.relevanceScore - left.relevanceScore ||
          left.orb - right.orb ||
          left.id.localeCompare(right.id),
      )[0] ?? null
  );
}

function buildWeightedComparisonOverview(
  report: RealSynastryReport,
  primaryPatterns: ComparisonPrimaryPattern[],
): [string, string] {
  const first = humanizeComparisonText(
    `${report.synthesis.openingFa} ${report.synthesis.wholePairFa}`,
  );
  const patternTitles = primaryPatterns
    .map((pattern) => pattern.title)
    .filter(Boolean)
    .slice(0, 3);
  const second = patternTitles.length
    ? `سه محور پررنگ این خوانش «${patternTitles.join("»، «")}» هستند. این‌ها حکم دربارهٔ آیندهٔ رابطه نیستند؛ بهتر است ببینید هرکدام در گفت‌وگو، امنیت، صمیمیت، مرز و شیوهٔ ترمیم شما چه شکلی پیدا می‌کنند.`
    : "این خوانش به‌جای حکم دربارهٔ آینده، روی الگوهایی تمرکز می‌کند که در گفت‌وگو، امنیت، صمیمیت، مرز و شیوهٔ ترمیم رابطه قابل مشاهده‌اند.";
  return [first, second];
}

function buildConversationQuestions(labels: { a: string; b: string }): [string, string, string] {
  return [
    `وقتی گفت‌وگو سخت می‌شود، ${labels.a} و ${labels.b} هرکدام بیشتر به پاسخ فوری نیاز دارند یا به مکث؟`,
    "چه رفتار کوچکی برای هرکدام از شما نشانهٔ امنیت و چه رفتاری نشانهٔ فشار یا فاصله است؟",
    "یک مرز، انتظار یا درخواست کوچک که اگر این هفته روشن شود، کدام سوءبرداشت تکراری را کمتر می‌کند؟",
  ];
}

function selectPrimaryPatterns(
  report: RealSynastryReport,
  labels: { a: string; b: string },
): ComparisonPrimaryPattern[] {
  const patternContacts = [
    ...report.supportivePatterns,
    ...report.tensionPatterns,
  ]
    .sort(
      (left, right) =>
        right.relevanceScore - left.relevanceScore ||
        left.id.localeCompare(right.id),
    )
    .map((pattern) => ({
      pattern,
      contact: pattern.contactIds
        .map((contactId) =>
          report.contacts.find((contact) => contact.id === contactId),
        )
        .find((contact): contact is SynastryInterChartAspect => Boolean(contact)),
    }));
  const selected: ComparisonPrimaryPattern[] = [];
  const usedContactIds = new Set<string>();

  for (const entry of patternContacts) {
    if (selected.length >= 3) break;
    if (!entry.contact || usedContactIds.has(entry.contact.id)) continue;
    const directional = buildDirectionalBlock(
      entry.pattern.kind === "supportive" ? "support" : "misunderstanding",
      entry.contact,
      labels,
      entry.pattern.summaryFa,
    );
    selected.push({
      ...directional,
      kind: entry.pattern.kind,
      titleFa: directional.title,
      summaryFa: directional.humanExperience,
      contactIds: [...entry.pattern.contactIds],
      relevanceScore: entry.pattern.relevanceScore,
    });
    entry.pattern.contactIds.forEach((id) => usedContactIds.add(id));
  }

  for (const contact of report.contacts) {
    if (selected.length >= 3) break;
    if (usedContactIds.has(contact.id)) continue;
    const kind = contact.polarity === "supportive" ? "supportive" : "tension";
    const directional = buildDirectionalBlock(
      kind === "supportive" ? "support" : "misunderstanding",
      contact,
      labels,
      contact.readingFa,
    );
    selected.push({
      ...directional,
      kind,
      titleFa: directional.title,
      summaryFa: directional.humanExperience,
      contactIds: [contact.id],
      relevanceScore: contact.relevanceScore,
    });
    usedContactIds.add(contact.id);
  }

  const fallbacks: Array<{
    id: string;
    kind: "supportive" | "tension";
    section:
      | "communication"
      | "closeness-independence"
      | "friction-repair";
    fallback: string;
  }> = [
    {
      id: "fallback-communication-pattern",
      kind: "supportive",
      section: "communication",
      fallback: report.dynamics.communicationFa,
    },
    {
      id: "fallback-closeness-pattern",
      kind: "supportive",
      section: "closeness-independence",
      fallback: report.dynamics.closenessIndependenceFa,
    },
    {
      id: "fallback-repair-pattern",
      kind: "tension",
      section: "friction-repair",
      fallback: report.synthesis.tensionFa,
    },
  ];

  for (const fallback of fallbacks) {
    if (selected.length >= 3) break;
    const directional = buildDirectionalBlock(
      fallback.section,
      null,
      labels,
      fallback.fallback,
    );
    selected.push({
      ...directional,
      id: fallback.id,
      kind: fallback.kind,
      titleFa: directional.title,
      summaryFa: directional.humanExperience,
      contactIds: [],
      relevanceScore: -selected.length - 1,
    });
  }

  return selected.slice(0, 3);
}

function buildDirectionalBlock(
  section:
    | "support"
    | "misunderstanding"
    | "communication"
    | "emotional-security"
    | "closeness-independence"
    | "boundaries-commitment"
    | "friction-repair",
  contact: SynastryInterChartAspect | null,
  labels: { a: string; b: string },
  fallback: string,
): HumanFirstDirectionalNarrativeBlock {
  if (!contact) {
    return buildFallbackDirectionalBlock(section, labels, fallback);
  }

  const personAAction = describePointBehavior(contact.pointA.id, labels.a);
  const personBReception = describePointReception(contact.pointB.id, labels.b);
  const supportive = contact.polarity === "supportive";
  const tension =
    contact.polarity === "tension" || contact.polarity === "intense";
  const title = buildDirectionalTitle(section, contact);
  const cycle = supportive
    ? `${labels.a} وقتی رفتارش را روشن می‌گوید، ${labels.b} راحت‌تر معنای آن را درست دریافت می‌کند؛ پاسخ روشن نفر دوم هم اعتماد نفر اول را بیشتر می‌کند و همکاری به‌جای حدس‌زدن ادامه پیدا می‌کند.`
    : `${labels.a} برای شنیده‌شدن فشار بیشتری وارد می‌کند یا توضیح را تکرار می‌کند؛ ${labels.b} این فشار را به‌صورت فاصله، قضاوت یا محدودشدن می‌گیرد و بیشتر عقب می‌رود یا دفاع می‌کند. همین پاسخ دوباره نگرانی نفر اول را بالا می‌برد.`;

  return {
    id: `${section}-${contact.id}`,
    title,
    humanExperience: humanizeComparisonText(
      `${personAAction} ${personBReception} ${contact.readingFa}`,
    ),
    dailySituation: buildDailySituation(section, labels),
    feelingOrReaction: tension
      ? `${labels.a} ممکن است احساس کند تنها مانده یا جدی گرفته نشده است؛ ${labels.b} بیشتر فشار، عجله یا قضاوت را تجربه می‌کند.`
      : `${labels.a} احساس می‌کند پاسخ او دیده شده است و ${labels.b} فضای کافی برای همراه‌شدن بدون از دست‌دادن ریتم خودش دارد.`,
    effect: humanizeComparisonText(contact.readingFa),
    strength: supportive
      ? "این تماس می‌تواند تفاوت‌های دو نفر را به همکاری، یادگیری و حمایت متقابل تبدیل کند."
      : "وقتی چرخه زود تشخیص داده شود، هر دو نفر می‌توانند چیزی را ببینند که به تنهایی کمتر متوجه آن می‌شوند.",
    challenge: tension
      ? "چالش اصلی این است که هر نفر واکنش دیگری را به‌جای نشانهٔ یک نیاز متفاوت، بی‌اعتنایی یا کنترل تعبیر کند."
      : "آسان‌بودن این جریان نباید باعث شود خواسته‌ها ناگفته بمانند یا تفاوت‌ها بدیهی فرض شوند.",
    practicalStep: humanizeComparisonText(contact.growthFa),
    evidence: buildContactEvidence(contact),
    personA: personAAction,
    personB: personBReception,
    cycle,
  };
}

function buildFallbackDirectionalBlock(
  section:
    | "support"
    | "misunderstanding"
    | "communication"
    | "emotional-security"
    | "closeness-independence"
    | "boundaries-commitment"
    | "friction-repair",
  labels: { a: string; b: string },
  fallback: string,
): HumanFirstDirectionalNarrativeBlock {
  const titles: Record<typeof section, string> = {
    support: "وقتی تفاوت‌ها به کمک هم می‌آیند",
    misunderstanding: "وقتی مکث یک نفر برای دیگری شبیه فاصله دیده می‌شود",
    communication: "وقتی سرعت حرف‌زدن و سرعت مرتب‌کردن احساس یکسان نیست",
    "emotional-security": "وقتی هر نفر امنیت را از مسیر متفاوتی می‌سازد",
    "closeness-independence": "وقتی نزدیکی و خلوت هر دو لازم‌اند",
    "boundaries-commitment": "وقتی تعهد به مرز روشن احتیاج دارد",
    "friction-repair": "وقتی چرخه قدیمی پیش از گفت‌وگوی تازه فعال می‌شود",
  };
  const personA = `${labels.a} معمولاً نیاز دارد منظور و خواسته‌اش به‌وضوح دیده شود.`;
  const personB = `${labels.b} برای پاسخ‌دادن بهتر به زمان، فضای امن و درخواست روشن نیاز دارد.`;

  return {
    id: `${section}-fallback`,
    title: titles[section],
    humanExperience: humanizeComparisonText(
      fallback || `${personA} ${personB}`,
    ),
    dailySituation: buildDailySituation(section, labels),
    feelingOrReaction: `${labels.a} می‌تواند مکث را فاصله ببیند و ${labels.b} درخواست پاسخ فوری را فشار تلقی کند.`,
    effect:
      "اگر این تفاوت نام‌گذاری نشود، هر نفر برای محافظت از خودش رفتاری نشان می‌دهد که دقیقاً نگرانی نفر دیگر را بیشتر می‌کند.",
    strength:
      "توان این رابطه در این است که دو ریتم متفاوت می‌توانند زاویه دید کامل‌تری بسازند.",
    challenge:
      "چالش زمانی آغاز می‌شود که هر نفر برداشت خودش را تنها توضیح ممکن بداند.",
    practicalStep:
      "پیش از ادامه بحث، هر نفر در یک جمله بگوید اکنون به پاسخ، مکث، اطمینان یا مرز روشن نیاز دارد.",
    evidence: [],
    personA,
    personB,
    cycle: `${labels.a} توضیح را بیشتر می‌کند، ${labels.b} برای پیداکردن فضای امن عقب می‌رود و این عقب‌رفتن دوباره نگرانی ${labels.a} را بالا می‌برد.`,
  };
}

function buildDirectionalTitle(
  section: string,
  contact: SynastryInterChartAspect,
) {
  const ids = new Set([contact.pointA.id, contact.pointB.id]);

  if (ids.has("moon") && ids.has("mercury")) {
    return "وقتی یکی آمادهٔ حرف‌زدن است و دیگری هنوز احساسش را مرتب می‌کند";
  }
  if (ids.has("moon") && ids.has("saturn")) {
    return "وقتی نیاز به امنیت با احتیاط، مسئولیت یا ترس از آسیب‌پذیری روبه‌رو می‌شود";
  }
  if (ids.has("venus") && ids.has("mars")) {
    return "وقتی شیوه ابراز علاقه و سرعت نزدیک‌شدن یکسان نیست";
  }
  if (ids.has("sun") && ids.has("saturn")) {
    return "وقتی دیده‌شدن با انتظار، مسئولیت یا نقد روبه‌رو می‌شود";
  }
  if (section === "communication") {
    return "وقتی منظور یکی سریع‌تر از آمادگی دیگری برای پاسخ شکل می‌گیرد";
  }
  if (section === "emotional-security") {
    return "وقتی هر نفر از راه متفاوتی به حس امن‌بودن می‌رسد";
  }
  if (section === "closeness-independence") {
    return "وقتی صمیمیت و استقلال باید هم‌زمان جا داشته باشند";
  }
  if (section === "boundaries-commitment") {
    return "وقتی دوام رابطه به مرز و مسئولیت روشن نیاز دارد";
  }
  if (section === "friction-repair" || section === "misunderstanding") {
    return "وقتی یک واکنش دفاعی، نگرانی نفر دیگر را بیشتر می‌کند";
  }
  return contact.polarity === "supportive"
    ? "وقتی دو تفاوت به کمک هم می‌آیند"
    : "وقتی دو نیاز مهم پاسخ یکسانی نمی‌خواهند";
}

function describePointBehavior(pointId: string, label: string): string {
  const behaviors: Record<string, string> = {
    sun: "می‌خواهد حضور، انتخاب و هویت خودش جدی گرفته شود",
    moon: "اول به امنیت و فرصت مرتب‌کردن احساس نیاز دارد",
    mercury: "می‌خواهد موضوع را روشن کند، حرف بزند و به جمع‌بندی برسد",
    venus: "با نرم‌کردن فضا، توجه و نزدیک‌شدن پیوند می‌سازد",
    mars: "سریع‌تر وارد عمل، دفاع یا بیان مستقیم خواسته می‌شود",
    jupiter: "با امید، گسترش نگاه و پیدا‌کردن معنای بزرگ‌تر پاسخ می‌دهد",
    saturn: "مسئولیت، احتیاط و قابل اتکا بودن را جدی می‌گیرد",
    uranus: "برای پاسخ صادقانه به آزادی، فاصله یا راه تازه احتیاج دارد",
    neptune: "از حس، فضای ضمنی و نشانه‌های غیرمستقیم تأثیر می‌گیرد",
    pluto: "شدت، اعتماد و لایه‌های پنهان موضوع را جدی تجربه می‌کند",
    asc: "با حضور و واکنش فوری خودش وارد موقعیت می‌شود",
    dsc: "رفتار طرف مقابل را به‌عنوان نشانه‌ای درباره کیفیت رابطه می‌خواند",
    mc: "اثر بلندمدت و جهت بیرونی موضوع را می‌سنجد",
    ic: "از جای امنیت، خانه و آسیب‌پذیری درونی پاسخ می‌دهد",
  };
  return `${label} ${behaviors[pointId] ?? "از مسیر شخصی خودش وارد این موقعیت می‌شود"}.`;
}

function describePointReception(pointId: string, label: string): string {
  const receptions: Record<string, string> = {
    sun: "این رفتار را از زاویه احترام، دیده‌شدن و ارزش شخصی دریافت می‌کند",
    moon: "آن را با حس امنیت، نزدیکی یا احتمال طردشدن می‌سنجد",
    mercury: "دنبال معنای روشن، توضیح قابل فهم و امکان پاسخ‌دادن می‌گردد",
    venus: "از آن میزان محبت، پذیرش و تمایل به نزدیک‌شدن را برداشت می‌کند",
    mars: "آن را دعوت به عمل، دفاع یا تعیین سریع تکلیف می‌بیند",
    jupiter: "بیشتر به امکان رشد، امید یا گسترش تجربه توجه می‌کند",
    saturn: "آن را با معیار مسئولیت، دوام، خطر و مرز می‌سنجد",
    uranus: "بلافاصله میزان آزادی و فضای شخصی خودش را بررسی می‌کند",
    neptune: "لحن، فضای پنهان و چیزی را که مستقیم گفته نشده دریافت می‌کند",
    pluto: "شدت، اعتماد و احتمال از دست‌دادن کنترل را زودتر حس می‌کند",
    asc: "آن را به شکل واکنشی فوری و شخصی دریافت می‌کند",
    dsc: "آن را نشانه‌ای درباره شراکت و رفتار دوطرفه می‌بیند",
    mc: "به اثر آن بر آینده و جهت مشترک توجه می‌کند",
    ic: "آن را از جای امنیت درونی و حس خانه دریافت می‌کند",
  };
  return `${label} ${receptions[pointId] ?? "آن را با نیازها و ریتم خودش دریافت می‌کند"}.`;
}

function buildDailySituation(
  section: string,
  labels: { a: string; b: string },
): string {
  const situations: Record<string, string> = {
    support: `در برنامه‌ریزی مشترک، حمایت از یک تصمیم یا زمانی که ${labels.a} و ${labels.b} هدف روشنی دارند، این جریان راحت‌تر دیده می‌شود.`,
    misunderstanding: `در خستگی، عجله، بحث حساس یا وقتی پاسخ یکی دیرتر از انتظار دیگری می‌رسد، سوءبرداشت سریع‌تر شکل می‌گیرد.`,
    communication: `هنگام توضیح یک ناراحتی، تصمیم مشترک یا زمانی که یکی پاسخ فوری می‌خواهد و دیگری هنوز در حال فکرکردن است، این الگو پررنگ می‌شود.`,
    "emotional-security": `در لحظه آسیب‌پذیری، درخواست حمایت یا وقتی یکی از شما از حال دیگری مطمئن نیست، تفاوت تعریف امنیت خودش را نشان می‌دهد.`,
    "closeness-independence": `در زمان باهم‌بودن طولانی، نیاز به خلوت یا وقتی میزان تماس و توجه تغییر می‌کند، تعادل نزدیکی و استقلال مهم‌تر می‌شود.`,
    "boundaries-commitment": `در قول‌ها، مسئولیت‌های مشترک، زمان شخصی و تصمیم‌هایی که روی هر دو نفر اثر می‌گذارند، مرزهای روشن نقش اصلی دارند.`,
    "friction-repair": `بعد از سوءتفاهم، دیر جواب‌دادن، نقد یا احساس کنترل‌شدن، شیوه برگشتن از خود اختلاف مهم‌تر می‌شود.`,
  };
  return situations[section] ??
    `در موقعیت‌های روزمره‌ای که نیازهای ${labels.a} و ${labels.b} هم‌زمان فعال می‌شوند، این الگو روشن‌تر است.`;
}

function buildContactEvidence(
  contact: SynastryInterChartAspect,
): HumanFirstEvidence[] {
  const relationship = {
    id: `${contact.id}-relationship`,
    label: "پیوند اصلی",
    detail: `${contact.pointA.label} با ${contact.pointB.label} در ${contact.aspectLabel} قرار دارد.`,
  };
  const distance = {
    id: `${contact.id}-distance`,
    label: "فاصله از زاویهٔ دقیق",
    detail: `این تماس ${formatDegree(contact.orb)} با زاویهٔ دقیق فاصله دارد و به همین دلیل در این خوانش پررنگ‌تر دیده شده است.`,
  };
  return [relationship, distance];
}

function buildGrowthSkill(
  label: string,
  first: HumanFirstDirectionalNarrativeBlock,
  second: HumanFirstDirectionalNarrativeBlock,
): string {
  return `${label} با نام‌گذاری زودتر احساس و درخواست خودش، فرصت می‌دهد چرخه پیش از دفاع یا فاصله متوقف شود. ${first.practicalStep || second.practicalStep}`;
}

function buildReadingLimit(
  chartAStatus: SynastryBirthTimeStatus,
  chartBStatus: SynastryBirthTimeStatus,
): string {
  const base =
    "این خوانش قرار نیست دربارهٔ سرنوشت رابطه حکم بدهد. چیزی که میان شما ساخته می‌شود همیشه به انتخاب‌ها، تجربه‌ها و شیوهٔ گفت‌وگوی هر دو نفر وابسته است.";

  if (chartAStatus === "unknown" && chartBStatus === "unknown") {
    return `${base} چون ساعت تولد دقیق هیچ‌کدام مشخص نیست، رایزینگ و هم‌پوشانی خانه‌ها وارد این خوانش نشده‌اند؛ پیوندهای مستقل از ساعت هر دو نفر همچنان بررسی شده‌اند.`;
  }
  if (chartAStatus === "unknown" || chartBStatus === "unknown") {
    return `${base} چون ساعت تولد دقیق یکی از دو نفر مشخص نیست، رایزینگ و هم‌پوشانی خانه‌ها وارد این خوانش نشده‌اند؛ پیوندهای مستقل از ساعت همچنان بررسی شده‌اند.`;
  }
  return base;
}


function isEmotionalContact(contact: SynastryInterChartAspect): boolean {
  return (
    contact.categories.includes("closeness") ||
    EMOTIONAL_POINT_IDS.has(contact.pointA.id) ||
    EMOTIONAL_POINT_IDS.has(contact.pointB.id)
  );
}

function humanizeComparisonText(value: string): string {
  return value
    .replace(/دسته شواهد:\s*[a-z-]+/giu, "")
    .replace(/(?:personal-planet|luminary|chart-ruler|closeness)/giu, "")
    .replace(/پشتوانه (?:این خوانش|اصلی|محاسبه):\s*/gu, "")
    .replace(/در زندگی واقعی:\s*/gu, "")
    .replace(/توانایی:\s*/gu, "وقتی خوب پیش می‌رود، ")
    .replace(/چالش:\s*/gu, "وقتی سخت می‌شود، ")
    .replace(/برای برگشتن:\s*/gu, "برای برگشتن، ")
    .replace(/\bengine\b/giu, "محاسبهٔ نجومی")
    .replace(/\bruntime\b/giu, "")
    .replace(/\bsnapshot\b/giu, "نسخهٔ ذخیره‌شدهٔ چارت")
    .replace(/\bfixture(?:s)?\b/giu, "مرجع بررسی")
    .replace(/\bcontract(?: version)?\b/giu, "")
    .replace(/\bwriter(?: version)?\b/giu, "")
    .replace(/\branking\b/giu, "")
    .replace(/realEngine/gu, "اطلاعات چارت")
    .replace(/feature disabled/giu, "در این خوانش استفاده نشده")
    .replace(/partial data/giu, "اطلاعات محدود")
    .replace(/[\s\u00a0]+/gu, " ")
    .replace(/^ممکن است\s+ممکن است\s+/u, "ممکن است ")
    .replace(/^ممکن است\s+/u, "گاهی ")
    .replace(/؛\s*ممکن است\s+/gu, "؛ گاهی ")
    .trim();
}

function normalizeLabel(
  explicitLabel: string | null | undefined,
  report: AstrologyReport,
  fallback: string,
): string {
  return explicitLabel?.trim() || getComparisonChartLabel(report, fallback);
}

function normalizePersonLabel(value: string, fallback: string) {
  const normalized = value.trim();
  return normalized && normalized !== "چارت بدون نام" ? normalized : fallback;
}

function createComparisonId(): string {
  const randomPart =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `comparison-${randomPart}`;
}

function formatDegree(value: number) {
  return `${new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
  }).format(value)}°`;
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
