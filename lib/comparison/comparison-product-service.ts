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

  const evidencePlan = buildComparisonEvidencePlan(report);
  const communicationPlan = evidencePlan.chapterPlans.find(
    (chapter) => chapter.chapter === "communication",
  );
  const securityPlan = evidencePlan.chapterPlans.find(
    (chapter) => chapter.chapter === "emotional-security",
  );
  const attractionPlan = evidencePlan.chapterPlans.find(
    (chapter) => chapter.chapter === "attraction-intimacy",
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
        block: buildCommunicationChapter(primary, support, labels, communicationPlan),
      };
    }
    const contact = findOwnedContact(report, narrativeOwner, spec.predicate);
    if (contact) narrativeOwner.add(contact.id);
    if (spec.id === "emotional-security") {
      const primary = report.contacts.find(item => item.id === securityPlan?.primary?.id);
      const support = report.contacts.find(item => item.id === securityPlan?.support?.id);
      return {
        id: spec.id, eyebrow: spec.eyebrow, title: spec.title,
        ownerContactId: primary?.id ?? null,
        crossReferencePatternId: null, crossReferencePatternTitle: null,
        block: buildEmotionalSecurityChapter(primary, support, labels, securityPlan),
      };
    }
    if (spec.id === "attraction-intimacy") {
      const primary = report.contacts.find(item => item.id === attractionPlan?.primary?.id);
      const support = report.contacts.find(item => item.id === attractionPlan?.support?.id);
      return {
        id: spec.id, eyebrow: spec.eyebrow, title: spec.title,
        ownerContactId: primary?.id ?? null,
        crossReferencePatternId: null, crossReferencePatternTitle: null,
        block: buildAttractionChapter(primary, support, labels, report.relationshipContext),
      };
    }
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
  plan: ReturnType<typeof buildComparisonEvidencePlan>["chapterPlans"][number] | undefined,
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
  type Side = "a" | "b";
  const names = labels.a === labels.b
    ? { a: labels.a + " (نفر اول)", b: labels.b + " (نفر دوم)" }
    : labels;
  const ownerSide = (contact: SynastryInterChartAspect, point: string): Side | null =>
    contact.pointA.id === point ? contact.pointA.chartSide :
      contact.pointB.id === point ? contact.pointB.chartSide : null;
  const owner = (contact: SynastryInterChartAspect, point: string) => {
    const side = ownerSide(contact, point);
    return side ? names[side] : null;
  };
  const mercury = owner(primary, "mercury");
  const sun = owner(primary, "sun");
  const moon = owner(primary, "moon");
  const mars = owner(primary, "mars");
  const smooth = primary.aspectId === "trine" || primary.aspectId === "sextile";
  const hard = primary.aspectId === "opposition" || primary.aspectId === "square";
  const aspectNames: Record<string, string> = {
    conjunction: "هم‌نشینیِ", opposition: "مقابلهٔ", square: "مربعِ",
    trine: "تثلیثِ", sextile: "سکستایلِ",
  };
  const relationship = (contact: SynastryInterChartAspect) =>
    `${aspectNames[contact.aspectId] ?? contact.aspectLabel} ${contact.pointA.label}ِ ${names[contact.pointA.chartSide]} با ${contact.pointB.label}ِ ${names[contact.pointB.chartSide]}`;
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
  let roles: Partial<Record<Side, string>> = {};
  const assignRoles = (first: string, firstRole: string, second: string, secondRole: string) => {
    const firstSide: Side = first === names.a ? "a" : "b";
    const secondSide: Side = second === names.a ? "a" : "b";
    roles = { [firstSide]: firstRole, [secondSide]: secondRole };
  };
  if (mercury && sun && hard) {
    title = "یک سؤال، دو معنای متفاوت";
    lead = `${sun} ایده‌ای را با علاقه توضیح می‌دهد و اولین جواب ${mercury} این است: «چرا این راه؟» سؤال می‌تواند دربارهٔ خود پیشنهاد باشد، اما برای ${sun} معنای دیگری پیدا کند: «پس انتخابم را نپسندیدی؟» ${relationship(primary)} در تفسیر نجومی همین فاصله میان نقد یک نظر و واکنش به صاحب آن را برجسته می‌کند.`;
    example = `در بررسی طرح یک پروژه، ${mercury} می‌پرسد «هزینه‌اش چقدره؟» و ${sun} هنوز نمی‌داند طرف مقابل با اصل طرح موافق است یا نه. اگر جواب فقط «این یکی بهتره» باشد، دلیل ترجیح هم ناگفته می‌ماند.`;
    strength = `هنگام مقایسهٔ دو دورهٔ آموزشی، ${sun} توضیح می‌دهد کدام با هدفش جور درمی‌آید و ${mercury} زمان و محتوای آن‌ها را می‌سنجد. اختلاف سلیقه به معیار انتخاب تبدیل می‌شود.`;
    challenge = `فرض کنید ${sun} نوشته‌ای را برای نظرخواهی می‌فرستد. اگر ${mercury} فقط غلط‌های نگارشی را پیدا کند، سؤال اصلی بی‌جواب می‌ماند: آیا خواننده پیام نوشته را گرفته است؟ درست بودن جزئیات با مؤثر بودن کل نوشته فرق دارد.`;
    step = `${sun} نوع بازخورد را مشخص کند: «اول بگو پیام اصلی رو گرفتی یا نه». ${mercury} ابتدا برداشتش را بگوید، سپس یک نکتهٔ قابل اصلاح را مطرح کند.`;
    assignRoles(mercury, "پیشنهاد را از نظر دلیل و جزئیات می‌سنجد.", sun, "به معنای شخصی انتخاب و نظر کلی توجه دارد.");
  } else if (mercury && moon && smooth) {
    title = "معنایی که بین جمله‌ها پیدا می‌شود";
    lead = `${moon} از یک اتفاق می‌گوید: «یه جای کار عجیب بود». ${mercury} می‌پرسد «یعنی انتظار داشتی از قبل خبرت کنند؟» و موضوع از یک حس مبهم به پرسشی روشن تبدیل می‌شود. ${relationship(primary)} در تفسیر نجومی به توانایی پیدا کردن کلمات برای تجربه‌ای اشاره دارد که هنوز کامل بیان نشده است.`;
    example = `این توانایی یک‌طرفه نیست. وقتی ${mercury} ماجرایی را نقل می‌کند، ممکن است ${moon} بپرسد تصمیم قبل از جلسه گرفته شده بود یا بعد از آن. همین ترتیب زمانی معنای خبر را عوض می‌کند.`;
    strength = `هنگام تعریف ماجرای یک سفر برای کسی که همراهشان نبوده، ${mercury} ترتیب وقایع را توضیح می‌دهد و ${moon} لحظه‌ای را به یاد می‌آورد که دلیل تغییر مسیر را روشن می‌کند. شنونده فقط فهرست اتفاق‌ها را نمی‌شنود؛ می‌فهمد چرا رخ دادند.`;
    challenge = `خطر این نزدیکی آن است که یک تعبیر درست، تمام ماجرا فرض شود. اگر ${mercury} وسط حرف ${moon} نتیجه بگیرد «پس از نتیجه ناراضی بودی»، ممکن است موضوع واقعی طرز اعلام آن باشد، نه خود نتیجه.`;
    step = `${mercury} پس از برداشت اولیه بپرسد «کدوم بخشش؟» و ${moon} یک نمونه از خود اتفاق بدهد. قبل از نتیجه‌گیری، تفاوت دو تعبیر را با همان نمونه بررسی کنید.`;
    assignRoles(moon, "اهمیت و معنای تجربه را وارد گفت‌وگو می‌کند.", mercury, "با سؤال دقیق به تجربه صورت روشن می‌دهد.");
  } else if (mercury && mars && smooth) {
    title = "وقتی حرف به یک امتحان کوچک تبدیل می‌شود";
    lead = `${mercury} می‌پرسد «می‌شه این وسیله رو یه جور دیگه چید؟» و ${mars} راهی برای امتحان کردن پیشنهاد پیدا می‌کند. ${relationship(primary)} در تفسیر نجومی پیوند فکر و عمل را برجسته می‌کند: یک پیشنهاد تنها با موافقت یا مخالفت روبه‌رو نمی‌شود؛ نتیجه‌ای پیدا می‌کند که هر دو می‌توانند درباره‌اش حرف بزنند.`;
    example = `فرض کنید ${mars} قواعد یک بازی را با حرکت اول توضیح می‌دهد. ${mercury} حالتی را پیدا می‌کند که در آن قاعده کار نمی‌کند. به‌جای بحث بر سر اینکه توضیح کافی بوده یا نه، می‌توانند همان حالت را دوباره بازی کنند و قاعده را دقیق‌تر بنویسند.`;
    strength = `اگر قرار باشد استفاده از وسیله‌ای را به نفر سومی یاد بدهند، ${mars} می‌تواند نمونهٔ عملی بسازد و ${mercury} ترتیب مراحل را روشن کند. معیار موفقیت این است که یادگیرنده بتواند بدون کمکشان همان کار را انجام دهد.`;
    challenge = `توافق بر سر امتحان یک گزینه به معنای انتخاب نهایی آن نیست. اگر ${mercury} قصد مقایسهٔ سه راه را داشته باشد، موفقیت اولین آزمایش هنوز جواب سؤالش نیست.`;
    step = `ابتدا معیار آزمون را مشخص کنید: «می‌خوایم جا بیشتر بشه یا دسترسی راحت‌تر؟» سپس ${mars} یک تغییر کوچک انجام دهد و ${mercury} نتیجه را با همان معیار توصیف کند.`;
    assignRoles(mercury, "سؤال و معیار سنجش را مطرح می‌کند.", mars, "راه آزمودن ایده را پیشنهاد می‌دهد.");
  } else if (primary.pointA.id === "mercury" && primary.pointB.id === "mercury") {
    title = "آیا از یک کلمه، یک چیز می‌فهمید؟";
    lead = `${relationship(primary)} در خوانش نجومی به عبارت‌بندی هر دو نفر مربوط است. ${smooth ? "این تماس امکان پیدا کردن زبان مشترک را برجسته می‌کند." : hard ? "این تماس تفاوت در تعریف یا ترتیب توضیح را برجسته می‌کند." : "این تماس توجه را به انتخاب واژه‌ها جلب می‌کند."} مثلاً «آماده است» برای یکی می‌تواند به معنای قابل‌بررسی و برای دیگری به معنای تمام‌شده باشد.`;
    example = "در توضیح یک دستور یا مسیر، نخست واژه‌های مبهم را مشخص کنید و بعد سراغ جزئیات بروید.";
    strength = "با تعریف معیار هر نفر، مقایسهٔ دو برداشت ممکن می‌شود.";
    challenge = "از این شاهد به‌تنهایی نمی‌توان تعیین کرد کدام نفر سریع‌تر یا دقیق‌تر حرف می‌زند.";
    step = "هر نفر یک مثال از منظور خودش بزند و بعد تعریف مشترکی برای واژهٔ مورد بحث پیدا کنید.";
    roles.a = roles.b = "عبارت‌بندی و معنای واژه‌ها را وارد گفت‌وگو می‌کند.";
  } else if (!mercury) {
    title = "شاهد محدود برای شیوهٔ گفت‌وگو";
    lead = `${relationship(primary)} در نقشهٔ شواهد این فصل آمده است، اما برای نسبت دادن سبک حرف زدن به هر نفر به‌تنهایی کافی نیست.`;
    example = "هنگام نظرخواهی، از یک جواب کوتاه نتیجهٔ قطعی دربارهٔ منظور دیگری نگیرید.";
    strength = "نقش اختصاصی هر نفر در گفت‌وگو هنوز روشن نیست.";
    challenge = "نباید یک تماس غیرمستقیم را جایگزین شاهد اختصاصی عطارد کرد.";
    step = "پیش از پاسخ، پرسش اصلی را با یک جمله بازگو کنید.";
  } else {
    // Other Mercury contacts require their own detailed semantic rules.
    // Until then, name the actual witness and limit the interpretation.
    const speaker = mercury ?? names.a;
    const listener = speaker === names.a ? names.b : names.a;
    const other = primary.pointA.id === "mercury" ? primary.pointB : primary.pointA;
    const focus: Record<string, string> = { sun: "نظر و انتخاب شخصی", moon: "تجربه و احساس", mercury: "معنای کلمات", venus: "سلیقه و شیوهٔ بیان علاقه", mars: "پیشنهاد عملی", jupiter: "دامنه و امکان‌های ایده", saturn: "جزئیات و معیارهای قابل بررسی", uranus: "راه‌های غیرمنتظره", neptune: "معنای ضمنی", pluto: "پرسش‌های عمیق‌تر", asc: "برداشت نخست", dsc: "معنای شراکت", mc: "هدف", ic: "معنای شخصی" };
    const theme = focus[other.id] ?? "معنای پیشنهاد";
    title = "دو زاویه برای شنیدن یک پیشنهاد";
    lead = `${relationship(primary)} شاهد اصلی این بخش است. در چارچوب تفسیر نجومی، بیان و پرسش ${speaker} با ${theme} برای ${listener} پیوند می‌خورد. ${smooth ? "این پیوند می‌تواند فهمیدن منظور را آسان‌تر کند." : hard ? "این پیوند می‌تواند تفاوت برداشت از یک جمله را برجسته کند." : "شکل دقیق این پیوند به موقعیت وابسته است."} مثلاً در گفت‌وگو دربارهٔ یک ایده، موضوع سؤال و دلیل اهمیت آن برای هر نفر ممکن است یکسان نباشد.`;
    example = `در یک نظرخواهی ساده، ${speaker} می‌تواند مشخص کند دربارهٔ کدام بخش نظر می‌خواهد و ${listener} همان بخش را پاسخ دهد.`;
    strength = "این تماس زمینه‌ای برای بررسی تفاوت برداشت فراهم می‌کند، نه حکم قطعی دربارهٔ کیفیت ارتباط.";
    challenge = "از این تماس به تنهایی نمی‌توان انگیزهٔ پنهان یا شیوهٔ ثابت واکنش را نتیجه گرفت.";
    step = "موضوع سؤال را از برداشت شخصی دربارهٔ گوینده جدا کنید و به همان موضوع جواب بدهید.";
    assignRoles(speaker, "پرسش یا عبارت را مطرح می‌کند.", listener, "آن را از زاویهٔ موضوع مرتبط می‌سنجد.");
  }
  if (support && (support.aspectId === "sextile" || support.aspectId === "trine" || support.aspectId === "conjunction")) {
    if (secondaryMoon && secondaryMercury && secondaryMoon !== secondaryMercury && moon !== secondaryMoon) {
      strength += ` نقش‌ها همیشه ثابت نیستند. پس از دیدن یک نمایش، ${secondaryMoon} شاید بتواند توضیح دهد چرا پایان داستان قانع‌کننده نبود و ${secondaryMercury} از او بپرسد: «غافلگیرت کرد یا دلیل اتفاق‌ها روشن نبود؟» این ظرفیت با ${relationship(support)} پیوند دارد.`;
      evidence.push(evidenceFor(support, "شاهد پشتیبان"));
    } else if (secondaryJupiter && secondaryMercury && secondaryJupiter !== secondaryMercury) {
      strength += ` در تصمیمی دربارهٔ یادگیری یک مهارت، ${secondaryJupiter} ممکن است راهی بیرون از گزینه‌های اولیهٔ ${secondaryMercury} پیشنهاد کند. ${relationship(support)} پشتوانهٔ این برداشت است: گفت‌وگو فقط برای فهمیدن نیست؛ می‌تواند دامنهٔ انتخاب را بزرگ‌تر کند.`;
      evidence.push(evidenceFor(support, "شاهد پشتیبان"));
    }
  }
  if (support && secondarySun && secondaryMercury && secondarySun !== secondaryMercury &&
      (support.aspectId === "opposition" || support.aspectId === "square") && !sun) {
    challenge += ` محدودیت دیگری از ${relationship(support)} پیداست: اگر ${secondarySun} دو پوستر را از نظر زیبایی مقایسه کند و ${secondaryMercury} خوانایی متن را بسنجد، هر دو ممکن است به نتیجه‌ای معتبر اما متفاوت برسند. آزمون خوانایی دربارهٔ زیبایی داوری نمی‌کند.`;
    evidence.push(evidenceFor(support, "شاهد پشتیبان"));
  }
  // Only context assigned by the evidence planner is eligible here. Reference-time
  // placements from an unknown birth time are deliberately not used as sign claims.
  const signProfiles: Record<string, { sign: string; sentence: (description: string) => string }> = {
    "mercury:aries": { sign: "اریز", sentence: (description) => ` در این صحنه، مستقیم بودن پرسش با تعبیر نجومی ${description} هم‌خوان است؛ کوتاهی سؤال هنوز نشانهٔ مخالفت نیست.` },
    "sun:libra": { sign: "لیبرا", sentence: (description) => ` در خوانش ${description}، مقایسهٔ چند معیار می‌تواند راهی برای توضیح دادن یک ترجیح باشد، نه صرفاً دفاع از آن.` },
    "moon:taurus": { sign: "تارس", sentence: (description) => ` در تعبیر ${description}، همین جزئیات قابل یادآوری به روشن شدن داستان کمک می‌کنند.` },
    "mercury:cancer": { sign: "کنسر", sentence: (description) => ` خوانش ${description} نیز به اهمیت موقعیت بیان حرف اشاره دارد: شناخت مخاطب و دلیل گفته شدن آن جمله نیز به فهم معنایش کمک می‌کند.` },
    "mars:libra": { sign: "لیبرا", sentence: (description) => ` ${description} در تعبیر نجومی وجه دیگری به این همکاری می‌دهد: انتخاب روشی که هر دو بتوانند در آزمودنش مشارکت کنند.` },
    "mercury:virgo": { sign: "ویرگو", sentence: (description) => ` در تعبیر ${description}، توجه به ایرادهای جزئی ابزار بررسی است، نه معیار یگانهٔ ارزش یک طرح.` },
  };
  const seenContext = new Set<string>();
  for (const point of [primary.pointA, primary.pointB, ...(support ? [support.pointA, support.pointB] : [])]) {
    const context = plan?.context.find(item => item.ownerChartId === point.chartId && item.pointId === point.id);
    if (!context || context.birthTimeStatus !== "exact" || context.limitation || seenContext.has(context.evidenceId)) continue;
    const profile = signProfiles[point.id + ":" + context.signId];
    if (!profile) continue;
    const description = `${point.label}ِ ${names[point.chartSide]} در نشان ${profile.sign}`;
    const sentence = profile.sentence(description);
    if (point.id === "mars" || point.id === "sun") strength += sentence;
    else if (point.id === "mercury" && ![primary.pointA, primary.pointB].some(p => p.chartId === point.chartId && p.id === point.id)) challenge += sentence;
    else example += sentence;
    seenContext.add(context.evidenceId);
    evidence.push({ id: context.evidenceId, label: "زمینهٔ فردی گفت‌وگو", detail: description + "." });
  }

  const natalRules: Record<string, string> = {
    "mercury:saturn:sextile": "در تفسیر نجومی، به سؤال عددی وجه عملی می‌دهد: می‌توان سقف هزینه را مشخص کرد و بعد دربارهٔ خود ایده نظر داد.",
    "mercury:saturn:trine": "در خوانش فردی، می‌تواند پشتوانهٔ توضیح منظم دلیل ترجیح باشد؛ اول هدف طرح، سپس دلیل انتخاب این راه.",
    "mercury:moon:trine": "یادآور این است که گوینده نیز می‌تواند روایت خودش را کامل کند؛ شنونده لازم نیست همیشه جملهٔ ناتمام او را حدس بزند.",
    "mercury:uranus:opposition": "در این خوانش، احتمال جهش به پرسش تازه را مطرح می‌کند. یک ارتباط ذهنی تازه ممکن است جالب باشد، اما هنوز پاسخ جملهٔ قبلی نیست.",
    "mercury:jupiter:square": "در تفسیر نجومی، احتیاط در تعمیم را برجسته می‌کند: ناموفق بودن یک نمونه، همهٔ روش‌های اجرای همان طرح را رد نمی‌کند.",
  };
  for (const item of plan?.natalContext ?? []) {
    const contactPoint = [primary.pointA, primary.pointB, ...(support ? [support.pointA, support.pointB] : [])]
      .find(point => point.chartId === item.ownerChartId && [item.firstPointId, item.secondPointId].includes(point.id));
    if (!contactPoint) continue;
    const validContext = plan?.context.find(point => point.ownerChartId === item.ownerChartId && point.pointId === contactPoint.id);
    if (!validContext || validContext.birthTimeStatus !== "exact" || validContext.limitation) continue;
    if (![item.firstPointId, item.secondPointId].includes("mercury")) continue;
    const other = item.firstPointId === "mercury" ? item.secondPointId : item.firstPointId;
    const rule = natalRules["mercury:" + other + ":" + item.aspectId];
    const otherLabel = ({ saturn: "زحل", moon: "ماه", uranus: "اورانوس", jupiter: "مشتری" } as Record<string, string>)[other];
    if (!rule || !otherLabel) continue;
    const description = `${aspectNames[item.aspectId]} عطارد با ${otherLabel} در چارت ${names[contactPoint.chartSide]}`;
    const sentence = ` ${description} ${rule}`;
    if (item.aspectId === "opposition" || item.aspectId === "square") challenge += sentence;
    else example += sentence;
    evidence.push({ id: item.evidenceId, label: "جنبهٔ فردی مرتبط", detail: description + "." });
  }
  return {
    id: "communication-" + primary.id, title, humanExperience: lead,
    dailySituation: example, strength, challenge, practicalStep: step, evidence,
    personA: roles.a ?? "نقش او در شاهد اصلی به موضوع گفت‌وگو وابسته است.",
    personB: roles.b ?? "نقش او در شاهد اصلی به موضوع گفت‌وگو وابسته است.",
    feelingOrReaction: challenge, effect: strength, cycle: example,
  };
}


/** Read only the contacts assigned to emotional security. Preserve legacy
 * allocation above for the chapters still awaiting their own rewrite. */
function buildEmotionalSecurityChapter(
  primary: SynastryInterChartAspect | undefined,
  support: SynastryInterChartAspect | undefined,
  labels: { a: string; b: string },
  plan: ReturnType<typeof buildComparisonEvidencePlan>["chapterPlans"][number] | undefined,
): HumanFirstDirectionalNarrativeBlock {
  type Side = "a" | "b";
  const names = labels.a === labels.b
    ? { a: labels.a + " (نفر اول)", b: labels.b + " (نفر دوم)" }
    : labels;
  const side = (contact: SynastryInterChartAspect, point: string): Side | null =>
    contact.pointA.id === point ? contact.pointA.chartSide :
      contact.pointB.id === point ? contact.pointB.chartSide : null;
  const owner = (contact: SynastryInterChartAspect, point: string) => {
    const s = side(contact, point);
    return s ? names[s] : null;
  };
  const aspects: Record<string, string> = {
    conjunction: "هم‌نشینیِ", opposition: "مقابلهٔ", square: "مربعِ",
    trine: "تثلیثِ", sextile: "سکستایلِ",
  };
  const describe = (c: SynastryInterChartAspect) =>
    `${aspects[c.aspectId] ?? c.aspectLabel} ${c.pointA.label}${c.pointA.label.endsWith("و") ? "ی" : c.pointA.label === "ماه" ? "ِ" : c.pointA.label.endsWith("ه") ? "ٔ" : "ِ"} ${names[c.pointA.chartSide]} با ${c.pointB.label}${c.pointB.label.endsWith("و") ? "ی" : c.pointB.label === "ماه" ? "ِ" : c.pointB.label.endsWith("ه") ? "ٔ" : "ِ"} ${names[c.pointB.chartSide]}`;
  const evidenceFor = (c: SynastryInterChartAspect, label: string): HumanFirstEvidence => ({
    id: c.id + "-emotional-security", label, detail: describe(c) + ".",
  });
  const evidence: HumanFirstEvidence[] = [];
  const roles: Partial<Record<Side, string>> = {};
  const assign = (c: SynastryInterChartAspect, point: string, role: string) => {
    const s = side(c, point);
    if (s) roles[s] = role;
  };
  let title: string, lead: string, example: string, strength: string, challenge: string, step: string;
  if (!primary) {
    title = "آنچه دربارهٔ احساس امنیت هنوز روشن نیست";
    lead = "تماس معتبر و اختصاصی کافی برای تعیین شیوهٔ تجربهٔ حمایت در این رابطه در دست نیست.";
    example = "پس از یک روز دشوار، یک نفر ممکن است همراهی بخواهد و نفر دیگر خلوت. این فقط نمونه‌ای از تفاوت نیازهاست، نه توصیف شما.";
    strength = "نیاز واقعی هر نفر از رفتار و درخواست خود او روشن می‌شود.";
    challenge = "نبود شاهد به معنای نبود امنیت عاطفی نیست.";
    step = "اگر روز سختی داشتید، به جای حدس زدن نیاز دیگری از او بپرسید اکنون چه کمکی می‌خواهد.";
  } else {
    evidence.push(evidenceFor(primary, "شاهد اصلی امنیت عاطفی"));
    const moon = owner(primary, "moon");
    const saturn = owner(primary, "saturn");
    const pluto = owner(primary, "pluto");
    const venus = owner(primary, "venus");
    const hard = primary.aspectId === "opposition" || primary.aspectId === "square";
    const smooth = primary.aspectId === "conjunction" || primary.aspectId === "trine" || primary.aspectId === "sextile";
    if (moon && saturn && hard) {
      title = "اول دلگرمی، بعد راه‌حل";
      lead = `${moon} از روزی سخت به خانه برمی‌گردد. ${saturn} به فکر سبک کردن کارهای فرداست، اما ${moon} هنوز به دلگرمی نیاز دارد. در تفسیر ${describe(primary)}، نیاز به دلگرمی با میل به سامان دادن اوضاع روبه‌رو می‌شود. کمکِ به‌موقع فقط به حل مشکل محدود نیست.`;
      example = `بعد از یک نتیجهٔ ناامیدکننده، جملهٔ «دفعهٔ بعد جور دیگری امتحان کن» از طرف ${saturn} شاید برای ${moon} زود باشد. هنوز وقت جبران نرسیده؛ اول باید بتواند از چیزی که از دست داده ناراحت باشد.`;
      strength = `وقتی ${saturn} خودش از مسئولیت‌ها فرسوده شده، شاید همچنان کارهایش را انجام دهد و کمتر از خستگی‌اش بگوید. ${moon} می‌تواند کنار او بنشیند و اجازه بدهد برای مدتی چیزی از او خواسته نشود. لازم نیست یکی از شما همیشه مراقب و دیگری همیشه نیازمند مراقبت باشد.`;
      challenge = `اگر ${saturn} از ${moon} انتظار داشته باشد فردای یک روز سخت سرحال باشد، ممکن است کمکش به تکلیف دیگری تبدیل شود. از آن طرف، ${moon} هم می‌تواند کم شدن بار عملی را ببیند، حتی وقتی دلگرمی کلامی کمتر از انتظارش بوده است.`;
      step = `در روزهای سنگین، رسیدگی را به دو زمان تقسیم کنید: همان شب برای آرام گرفتن و روز بعد برای یافتن راه‌حل. ${saturn} می‌تواند یک کار مشخص را از دوش ${moon} بردارد؛ ${moon} هم زمان مناسب برگشتن به مسئله را تعیین کند.`;
      assign(primary, "moon", "به دیده شدن خستگی و احساس خود نیاز دارد.");
      assign(primary, "saturn", "حمایت را با ایجاد ثبات و کم کردن بار عملی نشان می‌دهد.");
    } else if (moon && pluto && primary.aspectId === "conjunction") {
      title = "برای حمایت لازم نیست همه‌چیز را بدانید";
      lead = `پس از خبری تلخ، ${moon} دوباره به کارهای روزمره‌اش می‌رسد، اما هنوز اندوهگین است. ${describe(primary)} در تفسیر نجومی با حساسیت به احساساتی پیوند دارد که به‌سادگی آشکار نمی‌شوند. ${pluto} ممکن است تغییر حال او را زود دریابد؛ امنیت برای ${moon} آن است که حتی بدون شرح کامل ماجرا نیز بتواند روی همراهی او حساب کند.`;
      example = `بعد از دیداری خانوادگی که ${moon} را اندوهگین کرده، شاید تا فردا حالش بهتر نشود. ${pluto} لازم نیست تمام شب را وقف تغییر حال او کند؛ می‌تواند برنامهٔ عادی شب را حفظ کند تا آن اندوه تمام فضای خانه را نگیرد.`;
      strength = `اگر ${moon} از شکستی خجالت می‌کشد، واکنش بی‌سرزنش ${pluto} می‌تواند از سنگینی شرم کم کند. این حمایت باید دوطرفه باشد؛ ${pluto} هم حق دارد روزی درمانده باشد.`;
      challenge = `اگر ${moon} برای مدتی از اندوه فاصله می‌گیرد، ${pluto} لازم نیست با یک سؤال سنگین همان احساس را دوباره به مرکز توجه بیاورد.`;
      step = `در یک روز سنگین، ${pluto} می‌تواند به جای باز کردن دوبارهٔ موضوع، همراهی بی‌فشار پیشنهاد کند؛ مثلاً با هم چای بخورند. ${moon} نیز آزاد است همان همراهی را بپذیرد یا زمان دیگری را انتخاب کند.`;
      assign(primary, "moon", "برای احساس حساس خود فضای پذیرفته شدن می‌خواهد.");
      assign(primary, "pluto", "به عمق تجربه توجه می‌کند، بدون اینکه مالک آن باشد.");
    } else if (moon && venus && smooth) {
      title = "وقتی جزئیات کوچک خبر از توجه می‌دهند";
      lead = `${venus} هنگام خرید، خوراکی دلخواه ${moon} را هم برمی‌دارد. ${describe(primary)} در تفسیر نجومی نیاز به توجه را به ابراز مهر پیوند می‌دهد. برای ${moon}، این کار نشانهٔ آن است که حتی در غیابش به یاد او بوده‌اند.`;
      example = `در روزی که ${moon} برای یک کار مهم از خانه بیرون رفته، ${venus} می‌تواند بعد از تمام شدن کار سراغش را بگیرد. به خاطر داشتن زمان آن اتفاق، بدون اینکه لازم باشد دوباره یادآوری شود، شکل دیگری از همین توجه است.`;
      strength = `وقتی ${venus} خسته است، ${moon} هم می‌تواند با کم کردن سروصدای خانه فرصتی برای استراحتش بسازد. در این رابطه فقط دریافت لطف مهم نیست؛ هر نفر از شناخت عادت‌های دیگری برای بهتر کردن روز او استفاده می‌کند.`;
      challenge = `اگر ${venus} برای بیرون رفتن برنامه‌ای چیده و ${moon} امروز حال آن را ندارد، اصرار بر اجرای برنامه می‌تواند لطف را به وظیفه تبدیل کند. برای اینکه توجه همچنان دلپذیر بماند، باید امکان نپذیرفتن آن هم وجود داشته باشد.`;
      step = `وقتی از توجه دیگری خوشحال شدید، دقیق بگویید چرا: «اینکه خودت متوجه شدی برام مهم بود.» از همین بازخورد برای شناختن نیازهای هم استفاده کنید، نه از تعداد لطف‌هایی که در طول هفته انجام داده‌اید.`;
      assign(primary, "moon", "توجه را از تناسب رفتار با نیاز عاطفی روز دریافت می‌کند.");
      assign(primary, "venus", "علاقه را در رفتارهای خوشایند و مراقبت روزمره ابراز می‌کند.");
    } else if (moon && venus && hard) {
      title = "مهری که همیشه به شکل دلخواه نمی‌رسد";
      lead = `${venus} برای خوشحال کردن ${moon} پیشنهادی می‌دهد؛ اما ${moon} شاید در آن لحظه چیز دیگری بخواهد. ${describe(primary)} در تفسیر نجومی به فاصلهٔ میان ابراز مهر و نیاز عاطفی اشاره دارد. رد کردن یک پیشنهاد الزاماً رد کردن محبت نیست.`;
      example = `وقتی ${moon} از یک روز شلوغ برمی‌گردد، دعوت ${venus} به جمع دوستان شاید برایش دلپذیر نباشد؛ یک شام آرام می‌تواند مناسب‌تر باشد.`;
      strength = `اگر ${venus} شکل حمایت را تغییر دهد، ${moon} فرصت دارد خودِ توجه را دریافت کند، نه اینکه مجبور باشد از هر پیشنهاد خوشش بیاید.`;
      challenge = `وقتی ${moon} لطفی را نمی‌پذیرد، ${venus} نباید از همان یک واکنش دربارهٔ ارزش محبتش نتیجه بگیرد.`;
      step = `پیش از تدارک یک لطف، ${venus} دو گزینهٔ مشخص پیش روی ${moon} بگذارد؛ ${moon} هم بگوید کدام برای حال امروز او مناسب‌تر است.`;
      assign(primary, "moon", "به حمایتی متناسب با حال خود نیاز دارد.");
      assign(primary, "venus", "مهر را ابراز می‌کند، اما شکل دریافت آن ممکن است متفاوت باشد.");
    } else if (moon && saturn && smooth) {
      title = "آرامش در حضور قابل اتکا";
      lead = `${moon} پس از یک روز آشفته به محیطی آرام برمی‌گردد. ${describe(primary)} در تفسیر نجومی به امکان همراه شدن نیاز عاطفی با ثبات اشاره دارد. حضور آرام و بدون عجلهٔ ${saturn} می‌تواند همان چیزی باشد که ${moon} در آن لحظه از حمایت می‌خواهد.`;
      example = `هنگام انتظار برای خبری مهم، ${saturn} می‌تواند بی‌آنکه قول نتیجه‌ای بدهد، بخشی از زمان انتظار را کنار ${moon} بگذراند.`;
      strength = `${moon} نیز می‌تواند متوجه فشار پنهان مسئولیت‌های ${saturn} شود و فرصتی برای استراحت او فراهم کند.`;
      challenge = `ثبات به معنای بی‌نیازی از ابراز احساس نیست؛ حتی در روزهای عادی، توجه آشکار می‌تواند ارزش حضور را روشن‌تر کند.`;
      step = `در یک موقعیت انتظار، از یکدیگر بپرسید حضور آرام بهتر کمک می‌کند یا انجام کاری مشخص؛ همان را فراهم کنید.`;
      assign(primary, "moon", "از حضور آرام و قابل اتکا بهره می‌برد.");
      assign(primary, "saturn", "می‌تواند با ثبات حضور خود حمایت کند.");
    } else {
      title = "نشانه‌ای برای بررسی شیوهٔ دریافت حمایت";
      lead = `${describe(primary)} شاهد تخصیص‌یافتهٔ این فصل است. در چارچوب تفسیر نجومی، این تماس برای بررسی واکنش عاطفی و دریافت حمایت در رابطه به کار می‌آید؛ اما برای تعیین یک رفتار اختصاصی در این ترکیب هنوز تفسیر دقیق کافی نداریم.`;
      example = "در یک موقعیت دشوار، درخواست همراهی و شکل واقعی کمکی که ارائه شده را جداگانه بررسی کنید.";
      strength = "معنای حمایت را می‌توان از تجربهٔ خود دو نفر روشن کرد.";
      challenge = "از این شاهد به تنهایی نمی‌توان کیفیت امنیت یا انگیزهٔ پنهان کسی را نتیجه گرفت.";
      step = "در موقعیت ناراحتی، نیاز همان لحظه را مشخص کنید و ببینید چه رفتاری واقعاً کمک کرده است.";
    }
    if (support && support.id !== primary.id) {
      const secondaryMoon = owner(support, "moon");
      const secondarySaturn = owner(support, "saturn");
      if (secondaryMoon && secondarySaturn && (support.aspectId === "square" || support.aspectId === "opposition")) {
        strength += ` در تفسیر ${describe(support)}، مراقبت از ${secondaryMoon} نیز با فرصت بازیابی توان پیوند دارد؛ از او نخواهید پیش از آمادگی به روال قبل برگردد.`;
        evidence.push(evidenceFor(support, "شاهد پشتیبان امنیت عاطفی"));
      }
    }

    // Individual context can refine the assigned interaction, never replace it.
    // Reference-time positions for an unknown birth time are not used here.
    const points = [primary.pointA, primary.pointB, ...(support ? [support.pointA, support.pointB] : [])];
    const used = new Set(evidence.map(item => item.id));
    const exactContext = (point: typeof primary.pointA) => plan?.context.find(item =>
      item.ownerChartId === point.chartId && item.pointId === point.id &&
      item.birthTimeStatus === "exact" && !item.limitation);
    const signContext = (contact: SynastryInterChartAspect, pointId: string, signId: string, signName: string) => {
      const point = [contact.pointA, contact.pointB].find(p => p.id === pointId);
      if (!point) return null;
      const context = exactContext(point);
      if (!context || context.signId !== signId || used.has(context.evidenceId)) return null;
      const description = `ماهِ ${names[point.chartSide]} در نشان ${signName}`;
      evidence.push({ id: context.evidenceId, label: "زمینهٔ فردی امنیت عاطفی", detail: description + "." });
      used.add(context.evidenceId);
      return description;
    };
    if (moon && saturn && hard) {
      const context = signContext(primary, "moon", "virgo", "ویرگو");
      if (context) example = `پس از رد شدن یک درخواست کاری، ${moon} خودش سرگرم پیدا کردن ایرادهای آن می‌شود. در تفسیر ${context}، مرتب کردن جزئیات راهی برای بازیافتن آرامش است. توصیهٔ فوریِ ${saturn} شاید فقط فهرست ایرادها را بلندتر کند؛ بهتر است فرصت دهد ${moon} کمی از موضوع فاصله بگیرد.`;
    } else if (moon && pluto && primary.aspectId === "conjunction") {
      const context = signContext(primary, "moon", "scorpio", "اسکورپیو");
      if (context) example = `بعد از دیداری خانوادگی، ${moon} شاید دلش بخواهد تنها بخش کوچکی از تجربه‌اش را با ${pluto} در میان بگذارد. در تفسیر ${context}، اختیار در آشکار کردن احساس اهمیت دارد؛ واکنش آرام ${pluto} به همان بخش کوتاه، راه را برای اعتماد باز نگه می‌دارد.`;
    } else if (moon && venus && smooth) {
      const context = signContext(primary, "moon", "aries", "اریز");
      if (context) example = `پس از یک اتفاق مهم، ${moon} هنوز هیجان‌زده یا کلافه است. در تفسیر ${context}، واکنش به اتفاق‌ها بی‌درنگ است. اگر ${venus} همان موقع سراغش را بگیرد، در تجربهٔ تازهٔ او شریک می‌شود، نه صرفاً در خاطره‌ای که چند روز بعد تعریف می‌کند.`;
    }
    for (const item of plan?.natalContext ?? []) {
      if (used.has(item.evidenceId) || ![item.firstPointId, item.secondPointId].includes("moon")) continue;
      const point = points.find(p => p.id === "moon" && p.chartId === item.ownerChartId);
      if (!point || !exactContext(point)) continue;
      const other = item.firstPointId === "moon" ? item.secondPointId : item.firstPointId;
      const name = names[point.chartSide];
      let sentence: string | null = null;
      let destination: "challenge" | "strength" = "strength";
      if (other === "venus" && item.aspectId === "opposition" && saturn && hard && name === moon) {
        sentence = `مقابلهٔ ماه با زهره در چارت ${name} در تعبیر فردی تمایز دیگری را نشان می‌دهد: دعوت به تفریح می‌تواند خوشایند باشد، اما وقتی بدن به استراحت نیاز دارد، جای خواب را نمی‌گیرد.`;
        destination = "challenge";
      } else if (other === "venus" && item.aspectId === "square" && pluto && name === moon) {
        sentence = `مربعِ ماه با زهره در چارت ${name} نیز در تفسیر نجومی به همین امکان اشاره دارد: او می‌تواند از تماشای یک کمدی لذت ببرد و همچنان دلش گرفته باشد.`;
        destination = "challenge";
      } else if (other === "jupiter" && item.aspectId === "sextile" && pluto && name === pluto) {
        sentence = `سکستایلِ ماه با مشتری در چارت ${name} در خوانش فردی با بازیافتن امید پیوند دارد؛ یک قدم‌زدن کوتاه و بی‌برنامه می‌تواند آغاز خوبی باشد.`;
      } else if (other === "venus" && item.aspectId === "trine" && venus && smooth && name === moon) {
        sentence = `تثلیثِ ماه با زهره در چارت ${name} در خوانش فردی با ابراز مهر هم پیوند دارد. مثلاً وقتی ${venus} از موفقیت کوچکی خبر می‌دهد، ${name} می‌تواند به جای کوچک شمردن آن، فرصتی برای شادی مشترک بسازد. دیده شدن فقط در روزهای دشوار مهم نیست.`;
        strength = "";
      }
      if (!sentence) continue;
      if (destination === "challenge") challenge += " " + sentence;
      else strength = strength ? strength + " " + sentence : sentence;
      const otherLabel = other === "venus" ? "زهره" : "مشتری";
      evidence.push({ id: item.evidenceId, label: "جنبهٔ فردی مرتبط با امنیت", detail: `${aspects[item.aspectId]} ماه با ${otherLabel} در چارت ${name}.` });
      used.add(item.evidenceId);
    }
  }
  return {
    id: primary ? "emotional-security-" + primary.id : "emotional-security-insufficient",
    title, humanExperience: lead, dailySituation: example, strength, challenge,
    practicalStep: step, evidence,
    personA: roles.a ?? "نقش اختصاصی او در دریافت حمایت از این شاهد به تنهایی روشن نیست.",
    personB: roles.b ?? "نقش اختصاصی او در دریافت حمایت از این شاهد به تنهایی روشن نیست.",
    feelingOrReaction: challenge, effect: strength, cycle: example,
  };
}

/** The approved attraction evidence is separate from emotional care and promises. */
function buildAttractionChapter(
  primary: SynastryInterChartAspect | undefined,
  support: SynastryInterChartAspect | undefined,
  labels: { a: string; b: string },
  relationship: RealSynastryReport["relationshipContext"],
): HumanFirstDirectionalNarrativeBlock {
  type Side = "a" | "b";
  const names = labels.a === labels.b
    ? { a: labels.a + " (نفر اول)", b: labels.b + " (نفر دوم)" }
    : labels;
  const romantic = relationship === "romantic";
  const side = (c: SynastryInterChartAspect, id: string): Side | null =>
    c.pointA.id === id ? c.pointA.chartSide : c.pointB.id === id ? c.pointB.chartSide : null;
  const owner = (c: SynastryInterChartAspect, id: string) => {
    const value = side(c, id);
    return value ? names[value] : null;
  };
  const aspects: Record<string, string> = {
    conjunction: "هم‌نشینیِ", opposition: "مقابلهٔ", square: "مربعِ",
    trine: "تثلیثِ", sextile: "سکستایلِ",
  };
  const pointLabel = (p: SynastryInterChartAspect["pointA"]) =>
    p.label + (p.label.endsWith("ه") ? "ٔ" : p.label.endsWith("و") ? "ی" : "ِ");
  const describe = (c: SynastryInterChartAspect) =>
    `${aspects[c.aspectId] ?? c.aspectLabel} ${pointLabel(c.pointA)} ${names[c.pointA.chartSide]} با ${pointLabel(c.pointB)} ${names[c.pointB.chartSide]}`;
  const evidence: HumanFirstEvidence[] = [];
  const roles: Partial<Record<Side, string>> = {};
  const assign = (c: SynastryInterChartAspect, point: string, role: string) => {
    const s = side(c, point);
    if (s) roles[s] = role;
  };
  const addEvidence = (c: SynastryInterChartAspect, label: string) =>
    evidence.push({ id: c.id + "-attraction-intimacy", label, detail: describe(c) + "." });
  let title: string, lead: string, example: string, strength: string, challenge: string, step: string;
  if (!primary) {
    title = "ریتم نزدیکی هنوز روشن نیست";
    lead = "شاهد اختصاصی کافی برای توصیف ریتم نزدیک شدن این دو نفر در دست نیست.";
    example = "لذت از یک فعالیت مشترک و میل به تکرار آن می‌تواند نقطهٔ شروع مشاهده باشد، نه نتیجه‌ای دربارهٔ این رابطه.";
    strength = "علاقه به وقت مشترک را از تجربهٔ واقعی هر دو نفر بشناسید.";
    challenge = "کمبود شاهد به معنای نبود صمیمیت نیست.";
    step = "فعالیتی را که هر دو واقعاً دوست دارید انتخاب کنید و ببینید کدام بخشش برای هر نفر خوشایند است.";
  } else {
    addEvidence(primary, "شاهد اصلی کشش و صمیمیت");
    const venus = owner(primary, "venus");
    const uranus = owner(primary, "uranus");
    const sun = owner(primary, "sun");
    const smooth = ["conjunction", "trine", "sextile"].includes(primary.aspectId);
    if (venus && uranus && smooth) {
      title = "تازگی در کنار آشنایی";
      lead = romantic
        ? `در یک عصر معمولی، ${uranus} پیشنهاد می‌دهد به جای پاتوق همیشگی، جایی تازه را کشف کنید. در تفسیر ${describe(primary)}، همین تغییر کوچک می‌تواند توجه ${venus} را دوباره به او جلب کند؛ کشش از غافلگیری دلپذیر جان می‌گیرد، نه از تکرار یک قرار آشنا.`
        : `وقتی ${uranus} راه تازه‌ای برای گذراندن وقت یا انجام یک فعالیت مشترک پیشنهاد می‌کند، ${venus} می‌تواند از تغییر فضا لذت ببرد. ${describe(primary)} در تفسیر نجومی به همین پیوند تازگی و خوشایندی اشاره دارد.`;
      example = `${venus} ممکن است برای یک عصر دونفره فضایی آشنا و دلنشین انتخاب کند؛ ${uranus} با یک جزئیات پیش‌بینی‌نشده، مثلاً مسیر پیاده‌روی متفاوت، تجربه را از حالت همیشگی خارج می‌کند.`;
      strength = `تازگی لازم نیست بزرگ یا پرهزینه باشد. اگر ${uranus} یک سرگرمی تازه پیدا کرده، ${venus} می‌تواند با انتخاب چیزی که واقعاً دوست دارد آن را به تجربه‌ای مشترک تبدیل کند. این بار کشف کردن برای هر دو نفر خوشایند است.`;
      challenge = `همهٔ تغییرها به یک اندازه جذاب نیستند. اگر ${venus} امروز از همان تجربهٔ آشنا لذت می‌برد، پیشنهاد تازهٔ ${uranus} نباید به آزمون میزان علاقه تبدیل شود. گاهی جذابیت در فرصت انتخاب است.`;
      step = `یک بار ${venus} نوع فعالیت را انتخاب کند و ${uranus} جزئیات تازه‌ای به آن اضافه کند؛ پیش از اجرا مطمئن شوید هر دو واقعاً مشتاق امتحانش هستید.`;
      assign(primary, "uranus", "با آوردن تازگی، توجه و کنجکاوی را برمی‌انگیزد.");
      assign(primary, "venus", "با انتخاب آنچه خوشایند است، تازگی را به تجربهٔ مشترک تبدیل می‌کند.");
    } else if (venus && sun && smooth) {
      title = "جذابیتِ دیدن دیگری در حال درخشیدن";
      lead = romantic
        ? `وقتی ${sun} سرگرم کاری است که واقعاً دوست دارد، ${venus} می‌تواند بیشتر به شیوهٔ حضور و شوق او جذب شود. در تفسیر ${describe(primary)}، تحسینِ ویژگی‌های خودِ دیگری بخشی از کشش است؛ لازم نیست هر بار برنامه‌ای برای ایجاد حال عاشقانه تدارک دیده شود.`
        : `وقتی ${sun} سرگرم کاری است که واقعاً دوست دارد، ${venus} می‌تواند از شور و شیوهٔ حضور او لذت ببرد. در تفسیر ${describe(primary)}، این تحسین به رغبت برای وقت مشترک کمک می‌کند.`;
      example = `در یک جمع، ${sun} با اشتیاق موضوع مورد علاقه‌اش را دنبال می‌کند و ${venus} از دیدن او در همان موقعیت لذت می‌برد. بعدتر، فرصتی برای تجربهٔ مشترک چیزی که هر دو پسندیده‌اند پیدا می‌شود.`;
      strength = `از طرف دیگر، سلیقهٔ ${venus} می‌تواند رنگ تازه‌ای به تجربه‌ای بدهد که ${sun} آغاز کرده است. مثلاً در انتخاب موسیقی برای یک مسیر، لازم نیست تمام توجه به انتخاب نفر آغازگر باشد.`;
      challenge = `تحسین با نیاز دائمی به جلب توجه فرق دارد. اگر ${sun} سرگرم علاقهٔ خودش است، قرار نیست ${venus} همیشه تماشاگر باشد؛ تجربه‌ای که به هر دو نفر میدان می‌دهد دلپذیرتر است.`;
      step = `در یک فعالیت مشترک، هر نفر بخشی را که واقعاً دوست دارد انتخاب کند؛ بعد از آن بگویید کدام لحظه برایتان بیشترین جذابیت را داشت.`;
      assign(primary, "sun", "با دنبال کردن علایق خود و ابراز شوق، توجه را جلب می‌کند.");
      assign(primary, "venus", "با تحسین و سلیقهٔ خود، به آن تجربه رنگ مشترک می‌دهد.");
    } else if (primary.pointA.id === "venus" && primary.pointB.id === "venus" && smooth) {
      const a = names[primary.pointA.chartSide], b = names[primary.pointB.chartSide];
      title = "لذت مشترک از یک تجربه، نه دو برنامهٔ جدا";
      lead = romantic
        ? `در انتخاب یک قرار، ${a} و ${b} می‌توانند از چیزی شبیه به هم لذت ببرند، حتی اگر دربارهٔ جزئیات از قبل هماهنگ نکرده باشند. ${describe(primary)} در تفسیر نجومی به هم‌خوانی سلیقه و شیوهٔ ابراز علاقه اشاره دارد؛ خودِ وقت‌گذرانی کنار هم می‌تواند بخش مهمی از کشش باشد.`
        : `در انتخاب یک سرگرمی یا فعالیت، ${a} و ${b} می‌توانند از چیزهای مشابه لذت ببرند. در تفسیر ${describe(primary)}، هم‌خوانی سلیقه می‌تواند همراهی را دلپذیرتر کند.`;
      example = `هنگام انتخاب یک موسیقی یا فضای تفریحی، یکی چیزی را پیشنهاد می‌دهد و دیگری بی‌آنکه لازم باشد متقاعد شود، از همان انتخاب استقبال می‌کند. لذت هر دو به خودِ تجربه مربوط است.`;
      strength = `این هماهنگی به هر دو نفر فرصت می‌دهد از یک فعالیت ساده برای ساختن لحظه‌ای خوشایند استفاده کنند؛ مثلاً در یک گردش کوتاه بیشتر از مقصد، از فضای تجربه و لحظه‌های میان راه لذت ببرند.`;
      challenge = `شباهت سلیقه به معنای یکسان بودن شدت یا زمان علاقه نیست. ممکن است ${a} بخواهد همان لحظه تجربه را ادامه دهد و ${b} ترجیح بدهد آن را در نقطه‌ای خوشایند تمام کند؛ هیچ‌کدام از این دو انتخاب از پیش معلوم نیست.`;
      step = `هر کدام یک فعالیت دلخواه پیشنهاد دهید و فقط یکی را که هر دو مشتاقش هستید انتخاب کنید. برای طولانی کردن تجربه به اشتیاق همان لحظهٔ هر دو توجه کنید.`;
      roles[primary.pointA.chartSide] = "در ساختن فضای خوشایند مشترک سهم دارد.";
      roles[primary.pointB.chartSide] = "در انتخاب تجربه‌ای که برای هر دو دلپذیر است سهم دارد.";
    } else {
      title = "سرنخی برای شناخت تجربهٔ مشترک";
      lead = `${describe(primary)} شاهد تخصیص‌یافتهٔ این فصل است. برای تعیین شکل دقیق کشش یا نزدیکی در این ترکیب هنوز تفسیر اختصاصی کافی نداریم.`;
      example = "در فعالیتی مشترک ببینید چه چیزی توجه هر نفر را به خود جلب می‌کند.";
      strength = "لذت مشترک را از ترجیح واقعی هر دو نفر بشناسید.";
      challenge = "از یک تماس نمی‌توان شدت علاقه یا میزان تمایل به نزدیکی را نتیجه گرفت.";
      step = "فعالیتی را انتخاب کنید که هر دو به انجامش تمایل دارید.";
    }
    if (support && support.id !== primary.id && ["conjunction", "trine", "sextile"].includes(support.aspectId)) {
      const secondarySun = owner(support, "sun");
      const mars = owner(support, "mars");
      const secondaryVenus = owner(support, "venus");
      if (secondarySun && mars) {
        strength += ` شاهد دوم، ${describe(support)}، از تبدیل شوق به یک تجربهٔ عملی حکایت دارد. وقتی ${secondarySun} از کاری هیجان‌زده است، ${mars} می‌تواند پیشنهاد مشخصی برای انجام آن بدهد؛ مثلاً به جای تعریف کردن از یک مسیر طبیعت‌گردی، زمانی را برای امتحان کردنش در نظر بگیرند.`;
        addEvidence(support, "شاهد پشتیبان کشش و صمیمیت");
      } else if (secondarySun && secondaryVenus) {
        strength += ` در تفسیر ${describe(support)}، ${secondaryVenus} علاوه بر لذت مشترک می‌تواند به ویژگی شخصی ${secondarySun} توجه کند؛ مثلاً وقتی او سرگرم هنری است که به آن علاقه دارد، خودِ اشتیاق او نیز توجه دیگری را جلب کند.`;
        addEvidence(support, "شاهد پشتیبان کشش و صمیمیت");
      }
    }
  }
  return {
    id: primary ? "attraction-intimacy-" + primary.id : "attraction-intimacy-insufficient",
    title, humanExperience: lead, dailySituation: example, strength, challenge,
    practicalStep: step, evidence,
    personA: roles.a ?? "نقش اختصاصی او در ریتم نزدیکی از این شاهد به تنهایی روشن نیست.",
    personB: roles.b ?? "نقش اختصاصی او در ریتم نزدیکی از این شاهد به تنهایی روشن نیست.",
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
