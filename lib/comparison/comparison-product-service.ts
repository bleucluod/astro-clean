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
  const legacyPatterns = selectPrimaryPatterns(report, labels);
  const narrativeOwner = new Set(
    legacyPatterns.flatMap((pattern) => pattern.contactIds),
  );
  const chapters = buildNarrativeChapters(
    report,
    labels,
    legacyPatterns,
    narrativeOwner,
  );
  const narrative = buildPairNarrative(report, labels, chapters);
  const primaryPatterns = narrative.patterns;
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
  const readingLimitFa = buildReadingLimit(
    context.chartABirthTimeStatus,
    context.chartBBirthTimeStatus,
  );

  const fallbackOverviewParagraphsFa = buildWeightedComparisonOverview(
    report,
    primaryPatterns,
  );
  const fullInterpretation = {
    ...buildFullComparisonInterpretation(report, {
    labels,
    chartABirthTimeStatus: context.chartABirthTimeStatus,
    chartBBirthTimeStatus: context.chartBBirthTimeStatus,
    fallbackOverviewParagraphsFa,
    }),
    openingParagraphsFa: narrative.opening,
    openingEvidence: narrative.openingEvidence,
  };
  const overviewParagraphsFa = fullInterpretation.openingParagraphsFa;
  const conversationQuestionsFa = narrative.questions;
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
    growth: narrative.growth,
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
  const boundaryPlan = evidencePlan.chapterPlans.find(
    (chapter) => chapter.chapter === "boundaries-commitment",
  );
  const frictionPlan = evidencePlan.chapterPlans.find(
    (chapter) => chapter.chapter === "friction-repair",
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
        block: buildAttractionChapter(primary, support, labels, report.relationshipContext, attractionPlan),
      };
    }
    if (spec.id === "boundaries-commitment") {
      const primary = report.contacts.find(item => item.id === boundaryPlan?.primary?.id);
      const support = report.contacts.find(item => item.id === boundaryPlan?.support?.id);
      return {
        id: spec.id, eyebrow: spec.eyebrow, title: spec.title,
        ownerContactId: primary?.id ?? null,
        crossReferencePatternId: null, crossReferencePatternTitle: null,
        block: buildBoundaryChapter(primary, support, labels, report.relationshipContext, boundaryPlan),
      };
    }
    const primary = report.contacts.find(item => item.id === frictionPlan?.primary?.id);
    const support = report.contacts.find(item => item.id === frictionPlan?.support?.id);
    return {
      id: spec.id, eyebrow: spec.eyebrow, title: spec.title,
      ownerContactId: primary?.id ?? null,
      crossReferencePatternId: null, crossReferencePatternTitle: null,
      block: buildFrictionChapter(primary, support, labels, report.relationshipContext, frictionPlan),
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
  plan: ReturnType<typeof buildComparisonEvidencePlan>["chapterPlans"][number] | undefined,
): HumanFirstDirectionalNarrativeBlock {
  type Side = "a" | "b";
  const names = labels.a === labels.b
    ? { a: labels.a + " (نفر اول)", b: labels.b + " (نفر دوم)" }
    : labels;
  const romantic = relationship === "romantic";
  const setting = {
    romantic: "قرار",
    friendship: "وقت‌گذرانی دوستانه",
    family: "وقت مشترک خانوادگی",
    work: "همکاری",
    general: "وقت مشترک",
  }[relationship];
  const activity = {
    romantic: "قرار بعدی",
    friendship: "یک بازی یا سرگرمی دوستانه",
    family: "آماده‌کردن یک خوراکی خانوادگی",
    work: "یک کار مشترک",
    general: "یک فعالیت مشترک",
  }[relationship];
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
      title = romantic ? "وقتی تازگی دوباره جرقه می‌زند" : "لذت کشف راهی تازه در کنار هم";
      lead = romantic
        ? `وسط یک قرار معمولی، ${uranus} پیشنهاد می‌دهد به نمایشگاهی بروند که هیچ‌کدام ندیده‌اند. توجه ${venus} به خودِ ابتکار جلب می‌شود، نه فقط مقصد. ${describe(primary)} در زبان نجومی به این پیوند میان غافلگیری و کشش اشاره دارد.`
        : `${{ friendship: `در یک دورهمی، ${uranus} بازی تازه‌ای پیشنهاد می‌دهد و ${venus} به بخش خلاقانهٔ آن علاقه نشان می‌دهد.`, family: `در جمع خانوادگی، ${uranus} ایده‌ای برای متفاوت کردن یک برنامهٔ آشنا دارد و ${venus} از بخش دلپذیر آن استقبال می‌کند.`, work: `در یک کار مشترک، ${uranus} راهی غیرمنتظره برای ساختن نتیجه پیشنهاد می‌دهد و ${venus} به جذابیت خودِ ایده توجه می‌کند.`, general: `هنگام یک فعالیت مشترک، ${uranus} انتخابی تازه پیش می‌کشد و ${venus} از بخش دلپذیر آن استقبال می‌کند.` }[relationship]} ${describe(primary)} در خوانش نجومی به همین پیوند تازگی و میل به همراهی اشاره دارد.`;
      example = romantic
        ? `گاهی ${venus} فضای قرار را انتخاب می‌کند و ${uranus} با یک بازی بداهه یا شوخی غیرمنتظره حال آن را عوض می‌کند. این بار تازگی از رفتار می‌آید، نه از مکان.`
        : `در ${activity}، ${uranus} روشی متفاوت پیشنهاد می‌دهد و ${venus} مشخص می‌کند کدام بخش آن برایش جالب است؛ تغییر روال زمانی ارزش دارد که برای هر دو خوشایند باشد.`;
      strength = `جذابیت ابتکار در مشارکت دوطرفه است؛ ${venus} قرار نیست همیشه دریافت‌کنندهٔ پیشنهادهای ${uranus} بماند.`;
      challenge = (romantic ? `اگر ${venus} هنوز از لحظه لذت می‌برد، عوض کردن ناگهانی برنامه ممکن است حال خوش دیدار را از بین ببرد. ${uranus} لازم نیست برای زنده نگه داشتن کشش مدام اتفاق تازه‌ای رقم بزند.` : `اگر ${venus} از نتیجهٔ فعلی یا بخشی از فعالیت راضی است، تغییر ناگهانی ممکن است همان لذت را از بین ببرد. ${uranus} لازم نیست برای حفظ جذابیت کار مشترک مدام روال را عوض کند.`);
      step = romantic
        ? `یک بار بخشی از قرار را از پیش مشخص نکنید. ${uranus} یک گزینه پیش بکشد و ${venus} آزاد باشد همان را انتخاب کند یا وقت مشترک را به شکل قبلی ادامه دهد.`
        : ({ friendship: `برای دورهمی بعد، ${venus} بازی مورد علاقه‌اش را انتخاب کند و ${uranus} فقط یک قاعدهٔ تازه به آن اضافه کند.`, family: `در جمع بعدی، ${venus} یک رسم دلخواه را حفظ کند و ${uranus} فقط در بخشی که هر دو دوست دارند تنوع ایجاد کند.`, work: `${venus} یک ویژگی مطلوب از نمونهٔ فعلی را مشخص کند و ${uranus} نسخهٔ متفاوتی بسازد که آن ویژگی را از دست ندهد.`, general: `${venus} بخش دلخواه فعالیت را انتخاب کند و ${uranus} تنها یک تغییر پیشنهاد دهد.` }[relationship]);
      assign(primary, "uranus", "با آوردن تازگی، توجه و کنجکاوی را برمی‌انگیزد.");
      assign(primary, "venus", "با انتخاب آنچه خوشایند است، تازگی را به تجربهٔ مشترک تبدیل می‌کند.");
    } else if (venus && sun && smooth) {
      title = romantic ? "وقتی خودِ دیگری جذاب است" : "رغبت به همراهی از دل تحسین";
      lead = romantic
        ? `وقتی ${sun} با شوق سرگرم چیزی است که دوست دارد، توجه ${venus} فقط به آن سرگرمی نیست؛ شیوهٔ حضور خودِ او هم جذاب است. ${describe(primary)} در خوانش نجومی به همین پیوند میان ابراز خود و پسندیدن دیگری اشاره دارد. کشش لزوماً از یک قرار طراحی‌شده آغاز نمی‌شود.`
        : `${{ friendship: `وقتی ${sun} با علاقه از سرگرمی خودش حرف می‌زند، ${venus} از شیوهٔ روایت او لذت می‌برد، حتی اگر همان سرگرمی را نپسندد.`, family: `وقتی ${sun} با شوق چیزی می‌سازد یا هنرش را نشان می‌دهد، توجه ${venus} به خودِ او هم جلب می‌شود.`, work: `وقتی ${sun} با تسلط کار دلخواهش را پیش می‌برد، ${venus} به شیوهٔ ارائه یا اجرای او توجه می‌کند.`, general: `وقتی ${sun} با شوق مشغول علاقهٔ خودش است، توجه ${venus} فقط به آن فعالیت نیست؛ شیوهٔ حضور او هم خوشایند است.` }[relationship]} ${describe(primary)} در خوانش نجومی به پیوند میان ابراز خود و تحسین دیگری اشاره دارد.`;
      example = romantic
        ? `فرض کنید ${sun} چیزی را که مدت‌ها برای ساختنش وقت گذاشته نشان می‌دهد. ${venus} به اشتیاق او در توضیح جزئی کوچک توجه می‌کند، حتی اگر آن کار انتخاب خودش نباشد.`
        : `در ${activity}، توجه ${venus} ممکن است به شیوهٔ کار ${sun} جلب شود، حتی اگر انتخاب خودش متفاوت باشد. پسندیدن توانایی یک نفر لزوماً به معنای پسندیدن همهٔ انتخاب‌های او نیست.`;
      strength = romantic
        ? `برای لذت بردن از کنار ${sun} بودن، لازم نیست ${venus} همهٔ علایق او را از آنِ خودش کند. همین تفاوت به هر دو اجازه می‌دهد بخشی از دیدار را به میل شخصی خود بگذرانند.`
        : `برای لذت بردن از همراهی، لازم نیست ${venus} همان علاقهٔ ${sun} را داشته باشد؛ تحسین یک ویژگی با شریک شدن در همهٔ علایق فرق دارد.`;
      challenge = romantic
        ? `در دیداری که ${venus} میل دارد سرگرم علاقهٔ خودش باشد، تلاش ${sun} برای گرفتن توجه دوباره ممکن است حال طبیعی دیدار را عوض کند. کم‌شدن توجه در یک لحظه را نباید با از میان رفتن کشش یکی گرفت.`
        : `قدردانی از توانایی ${sun} نباید ${venus} را به تماشاگر دائمی تبدیل کند. در ${activity}، برای علاقه و مشارکت هر دو نفر جا بگذارید؛ هر دو باید بتوانند گاهی مسیر خودشان را دنبال کنند.`;
      step = ({ romantic: `در دیدار بعد، ${sun} و ${venus} هر کدام زمانی برای علاقهٔ شخصی خود داشته باشند؛ فقط بخشی را با هم انجام دهند که واقعاً هر دو دوست دارند.`, friendship: `در دورهمی بعد، هر کدام یک فعالیت دلخواه پیشنهاد دهد و تنها گزینه‌ای را با هم انجام دهند که برای هر دو جذاب است.`, family: `${sun} و ${venus} هر کدام بخشی از برنامهٔ خانوادگی را که واقعاً دوست دارند انتخاب کنند؛ لازم نیست تمام وقت را به یک سرگرمی بگذرانند.`, work: `${sun} بخشی از کار را که به آن علاقه دارد پیش ببرد؛ ${venus} از میان بخش‌های باقیمانده کاری را انتخاب کند که خودش به آن رغبت دارد، نه صرفاً به پیروی از ${sun}.`, general: `هر کدام بخش مورد علاقهٔ خودش را انتخاب کند و تنها در نقطه‌ای به دیگری بپیوندد که هر دو از آن لذت می‌برند.` }[relationship]);
      assign(primary, "sun", "با دنبال کردن علایق خود و ابراز شوق، توجه را جلب می‌کند.");
      assign(primary, "venus", "با تحسین و سلیقهٔ خود، به آن تجربه رنگ مشترک می‌دهد.");
    } else if (primary.pointA.id === "venus" && primary.pointB.id === "venus" && smooth) {
      const a = names[primary.pointA.chartSide], b = names[primary.pointB.chartSide];
      title = "لذت بردن از همان لحظه";
      lead = romantic
        ? `گاهی ${a} و ${b} در یک قرار معمولی همزمان به همان شوخی فیلم می‌خندند. ${describe(primary)} در خوانش نجومی به هم‌خوانی سلیقه اشاره دارد: برای لذت بردن از کنار هم بودن، همیشه به برنامه‌ای ویژه نیاز ندارند.`
        : `${{ friendship: `در یک دورهمی، ${a} و ${b} از همان شوخی ظریف لذت می‌برند، بی‌آنکه یکی برای همراهی با دیگری خودش را به خنده بزند.`, family: `هنگام یک مهمانی خانوادگی، ${a} و ${b} از همان بخش خوشایند جمع لذت می‌برند.`, work: `وقتی دو نمونهٔ طراحی را کنار هم می‌بینند، ${a} و ${b} ممکن است هر دو از ویژگی بصری یکسانی خوششان بیاید.`, general: `در یک فعالیت مشترک، ${a} و ${b} گاهی از همان بخش تجربه لذت می‌برند.` }[relationship]} ${describe(primary)} در خوانش نجومی به این هم‌خوانی سلیقه اشاره دارد.`;
      example = romantic
        ? `در یک کافه، شاید هر دو از موسیقی پس‌زمینه خوششان بیاید، بی‌آنکه لازم باشد سرگرمی تازه‌ای پیدا کنند. همین رضایت مشترک می‌تواند دلیل انتخاب دوبارهٔ آن فضا باشد.`
        : `در ${activity}، هر دو از یک بخش تجربه استقبال می‌کنند؛ نه صرفاً برای اینکه انتخاب دیگری را تأیید کنند، بلکه چون برای خودشان هم خوشایند است.`;
      strength = `اشتراک سلیقه به این معنا نیست که تفاوت فردی باید ناپدید شود. در یک تجربهٔ مشترک هر نفر می‌تواند چیزی از ذوق خودش به فضا اضافه کند.`;
      challenge = `هم‌خوانی سلیقه لزوماً ریتم یکسانی نمی‌سازد. یکی از این دو شاید هنوز از لحظه لذت ببرد و دیگری ترجیح بدهد همان‌جا آن را تمام کند. این شاهد به‌تنهایی تعیین نمی‌کند کدام نفر زودتر به مکث نیاز دارد.`;
      step = ({ romantic: `بعد از یک قرار خوشایند، لازم نیست برای طولانی‌تر کردنش برنامهٔ دیگری بچینید. وقتی هر دو هنوز از دیدار راضی هستید، همان‌جا به آن پایان دهید.`, friendship: `وقتی بازی هنوز لذت‌بخش است ولی یکی خسته شده، همان دور آخر را پایان دورهمی بگذارید.`, family: `بعد از بخش خوشایند یک جمع خانوادگی، ادامهٔ برنامه را اجباری نکنید؛ هر نفر بتواند به کار دلخواهش برگردد.`, work: `پس از رسیدن به طرحی که هر دو پسندیده‌اید، آن نسخه را نگه دارید و ادامهٔ تغییرات را تنها در صورت رغبت هر دو امتحان کنید.`, general: `پس از بخش خوشایند فعالیت، هر دو بتوانید بدون الزام به ادامه آن را تمام کنید.` }[relationship]);
      roles[primary.pointA.chartSide] = "با سلیقهٔ خودش در ساختن تجربه‌ای خوشایند برای هر دو سهم دارد.";
      roles[primary.pointB.chartSide] = roles[primary.pointA.chartSide];
    } else if (venus && uranus && ["square", "opposition"].includes(primary.aspectId)) {
      title = "تازگی با ریتم متفاوت";
      lead = `${describe(primary)} در تعبیر نجومی به تفاوت در استقبال از تغییر اشاره دارد. ${uranus} ممکن است وسط ${setting} پیشنهاد دیگری مطرح کند، در حالی که ${venus} هنوز از انتخاب قبلی لذت می‌برد. تازه بودن برای هر دو الزاماً در همان لحظه خوشایند نیست.`;
      example = ({ romantic: `مثلاً ${venus} هنوز از قدم‌زدن لذت می‌برد که ${uranus} پیشنهاد می‌دهد همین حالا مسیر دیگری را امتحان کنند. گزینهٔ تازه شاید برای دیدار بعد دلپذیر باشد، نه در آن لحظه.`, friendship: `اگر ${uranus} وسط بازی پیشنهاد عوض کردن آن را بدهد، ${venus} شاید ترجیح دهد دور فعلی را تمام کند.`, family: `اگر ${uranus} سرگرمی تازه‌ای پیشنهاد دهد، ${venus} شاید هنوز بخواهد از گفت‌وگوی جمع خانوادگی لذت ببرد.`, work: `اگر ${uranus} وسط ساخت نمونه طرح تازه‌ای پیشنهاد دهد، ${venus} شاید هنوز از شکل گرفتن نسخهٔ فعلی راضی باشد.`, general: `پیشنهاد تازهٔ ${uranus} شاید برای نوبت بعد برای ${venus} خوشایندتر باشد تا وسط تجربهٔ فعلی.` }[relationship]);
      strength = `وقتی ${venus} فرصت دارد از تجربهٔ فعلی به اندازهٔ دلخواه لذت ببرد، پیشنهاد تازهٔ ${uranus} هم می‌تواند جذابیت خودش را پیدا کند؛ لازم نیست یکی جای دیگری را فوراً بگیرد.`;
      challenge = `اگر هر تغییر با اصرار همراه شود، حتی پیشنهاد جالب هم ممکن است برای ${venus} جذابیتش را از دست بدهد. این شاهد دربارهٔ زمان استقبال از تازگی است، نه میزان علاقه به دیگری.`;
      step = `برای یک تجربهٔ مشترک، ${uranus} فقط یک تغییر پیشنهاد کند و ${venus} انتخاب کند آیا همین بار آن را امتحان کند یا نه.`;
      assign(primary, "uranus", "گزینهٔ تازه‌ای پیش می‌کشد.");
      assign(primary, "venus", "خوشایندی تغییر را از سلیقهٔ خودش می‌سنجد.");
    } else if (venus && owner(primary, "mars") && smooth) {
      const mars = owner(primary, "mars");
      title = "از پسندیدن تا همراه شدن";
      lead = `${describe(primary)} در تعبیر نجومی به پیوند میان پسندیدن و پیش‌قدم شدن اشاره دارد. در ${setting}، ${venus} چیزی را که دوست دارد انتخاب می‌کند و ${mars} راهی برای تجربه کردن آن پیشنهاد می‌دهد.`;
      example = ({ romantic: `مثلاً ${venus} از آهنگی خوشش می‌آید و ${mars} پیشنهاد می‌دهد با آن برقصند؛ پسندیدن یک صدا به فرصتی برای نزدیکی تبدیل می‌شود، اگر هر دو مایل باشند.`, friendship: `اگر ${venus} بازی تازه‌ای را بپسندد، ${mars} می‌تواند وسایلش را آماده کند و شروع آن را آسان‌تر سازد.`, family: `اگر ${venus} خوراکی خاصی را دوست داشته باشد، ${mars} می‌تواند پیشنهاد دهد یک بار با هم آن را درست کنند.`, work: `وقتی ${venus} از طرحی استقبال می‌کند، ${mars} می‌تواند نمونهٔ کوچکی از آن بسازد تا هر دو نتیجه را ببینند.`, general: `وقتی ${venus} بخشی از تجربه را می‌پسندد، ${mars} می‌تواند امکان انجام دادن همان بخش را فراهم کند.` }[relationship]);
      strength = `نقطهٔ قوت این همراهی زمانی دیده می‌شود که ${mars} برای سلیقهٔ ${venus} جا باز کند و ${venus} نیز بتواند به پیشنهاد عملی او با میل خودش پاسخ دهد.`;
      challenge = `آمادگی ${mars} برای شروع، به‌تنهایی آمادگی ${venus} را مشخص نمی‌کند.`;
      step = `پیش از شروع، ${mars} بپرسد آیا ${venus} همین حالا مایل به امتحان کردن آن است یا ترجیح می‌دهد بعداً سراغش بروند.`;
      assign(primary, "venus", "ترجیح خود را وارد تجربه می‌کند.");
      assign(primary, "mars", "برای شروع تجربه پیش‌قدم می‌شود.");
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
        const scene = venus && uranus
          ? (romantic ? `اگر ${secondarySun} وسط یک دیدار برای رقصیدن از جا بلند شود، ${mars} می‌تواند خودش دست او را بگیرد و حرکت را ادامه دهد؛ این بار پاسخ به ابتکار، اقدام است.` : `در ${activity}، ${mars} بخشی از اجرا را به عهده می‌گیرد تا پیشنهاد ${secondarySun} صرفاً در حد نظر نماند.`)
          : (romantic ? `مثلاً در یک بازی دونفره، ${secondarySun} روش شروع را تعیین می‌کند و ${mars} با حرکت بعدی ریتم بازی را حفظ می‌کند؛ این بار فعالیت هماهنگ است، نه فقط تماشای دیگری.` : `در یک فعالیت دونفره، ${secondarySun} مسیر آغاز را نشان می‌دهد و ${mars} بخش بعدی را پیش می‌برد؛ همراهی از مشاهده به عمل می‌رسد.`);
        strength += venus && uranus
          ? ` ${describe(support)} در خوانش نجومی به این امکان اشاره دارد که ${mars} به ابتکار ${secondarySun} با کاری از جانب خودش پاسخ دهد. ${scene}`
          : ` ${describe(support)} در خوانش نجومی به هماهنگی حرکت دو نفر در یک فعالیت مشترک اشاره دارد. ${scene}`;
        addEvidence(support, "شاهد پشتیبان کشش و صمیمیت");
      } else if (secondarySun && secondaryVenus) {
        const scene = { romantic: `هنگام دیدن عکس‌های یک گردش، ${secondaryVenus} بیش از خودِ منظره به زاویهٔ دید ${secondarySun} توجه کند.`, friendship: `هنگام یک بازی، ${secondaryVenus} از شیوهٔ متفاوت ${secondarySun} برای پیدا کردن جواب خوشش بیاید.`, family: `هنگام آماده‌کردن سفره، ${secondaryVenus} از شیوهٔ شخصی ${secondarySun} برای تزئین آن استقبال کند.`, work: `هنگام ساخت نمونهٔ اولیه، ${secondaryVenus} از ظرافتی که ${secondarySun} در انتخاب مواد به خرج داده خوشش بیاید، حتی اگر شیوهٔ کار خودش متفاوت باشد.`, general: `در یک فعالیت مشترک، ${secondaryVenus} از شیوهٔ شخصی ${secondarySun} برای انجام بخشی از آن استقبال کند.` }[relationship];
        strength += ` ${describe(support)} در تعبیر نجومی یک استثنا را نشان می‌دهد: حتی جایی که انتخاب دو نفر متفاوت است، شیوهٔ شخصی دیگری می‌تواند دلپذیر باشد؛ مثلاً ${scene}`;
        addEvidence(support, "شاهد پشتیبان کشش و صمیمیت");
      }
    }
    // Only allocated, exact individual context can refine a supported interaction.
    // Do not infer a person’s sign or degree from reference-time estimates.
    const contacts = [primary, ...(support && evidence.some(e => e.id === support.id + "-attraction-intimacy") ? [support] : [])];
    const points = contacts.flatMap(c => [c.pointA, c.pointB]);
    const rules: Record<string, (name: string, description: string) => string> = {
      "venus:jupiter:conjunction": (name, description) => {
        const scene = { romantic: "به جای رفتن سراغ برنامهٔ بعد، کمی بیشتر همان‌جا بماند", friendship: "بازی دلخواهش را یک دور دیگر ادامه دهد", family: "بعد از غذا پیشنهاد دهد کمی بیشتر کنار هم بمانند", work: "بعد از دیدن نتیجهٔ یک روش خوشایند، بررسی کاربرد دیگری از آن را پیشنهاد دهد", general: "پس از یک بخش خوشایند، فرصت دیگری برای ادامهٔ همان فعالیت پیشنهاد کند" }[relationship];
        return `اگر ${name} از بخشی از ${setting} لذت ببرد، شاید ترجیح دهد آن تجربه را گسترش دهد؛ مثلاً ${scene}. ${description} در تعبیر نجومی سرنخی برای همین میل است.`;
      },
      "venus:mars:conjunction": (name, description) => {
        const scene = { romantic: "برای دیدار بعد خودش پیشنهاد رفتن به جایی را بدهد که از آن خوشش آمده", friendship: "برای دورهمی بعد خودش یک بازی محبوب انتخاب کند", family: "پیشنهاد دهد دفعهٔ بعد خوراکی مورد علاقه‌اش را خودش آماده کند", work: "پس از دیدن طرحی که می‌پسندد، داوطلب ساخت نمونه‌ای از آن شود", general: "برای تکرار تجربهٔ دلخواهش خودش پیش‌قدم شود" }[relationship];
        return `برای ${name} پسندیدن یک تجربه می‌تواند انگیزهٔ شروع تجربهٔ بعدی باشد؛ مثلاً ${scene}. ${description} در تعبیر نجومی پیوند سلیقه با میل به اقدام مستقل را نشان می‌دهد.`;
      },
      "sun:venus:conjunction": (name, description) => {
        const scene = { romantic: "موسیقی یا چیدمان فضای دیدار", friendship: "موضوع یک بازی یا سرگرمی", family: "شیوهٔ چیدن سفره", work: "ترکیب رنگ و چیدمان یک ارائهٔ مشترک", general: "جزئی از فضای فعالیت مشترک" }[relationship];
        return `برای ${name} انتخاب ${scene} می‌تواند راهی برای نشان دادن سلیقهٔ شخصی باشد. ${description} در تعبیر نجومی پیوند میان ذوق و ابراز خود را توضیح می‌دهد.`;
      },
    };
    for (const item of plan?.natalContext ?? []) {
      const pair = [item.firstPointId, item.secondPointId];
      const point = points.find(p => p.chartId === item.ownerChartId && pair.includes(p.id));
      if (!point || evidence.some(e => e.id === item.evidenceId)) continue;
      const valid = plan?.context.find(c => c.ownerChartId === point.chartId && c.pointId === point.id);
      if (!valid || valid.birthTimeStatus !== "exact" || valid.limitation) continue;
      const key = pair.join(":") + ":" + item.aspectId;
      const rule = rules[key] ?? rules[[...pair].reverse().join(":") + ":" + item.aspectId];
      if (!rule) continue;
      const labelMap: Record<string, string> = { sun: "خورشید", venus: "زهره", mars: "مریخ", jupiter: "مشتری" };
      const description = `${aspects[item.aspectId]} ${labelMap[pair[0]]} و ${labelMap[pair[1]]} در چارت ${names[point.chartSide]}`;
      const scene = rule(names[point.chartSide], description);
      // The allocated context supplies the paid example, rather than restating it.
      example = evidence.some(e => e.label === "جنبهٔ فردی مرتبط با کشش و صمیمیت") ? `${example} ${scene}` : scene;
      evidence.push({ id: item.evidenceId, label: "جنبهٔ فردی مرتبط با کشش و صمیمیت", detail: description + "." });
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

/** Keep expectations and agreements separate from closeness and conflict repair. */
function buildBoundaryChapter(
  primary: SynastryInterChartAspect | undefined,
  support: SynastryInterChartAspect | undefined,
  labels: { a: string; b: string },
  relationship: RealSynastryReport["relationshipContext"],
  plan: ReturnType<typeof buildComparisonEvidencePlan>["chapterPlans"][number] | undefined,
): HumanFirstDirectionalNarrativeBlock {
  type Side = "a" | "b";
  const names = labels.a === labels.b
    ? { a: labels.a + " (نفر اول)", b: labels.b + " (نفر دوم)" } : labels;
  const roles: Partial<Record<Side, string>> = {};
  const evidence: HumanFirstEvidence[] = [];
  const side = (c: SynastryInterChartAspect, id: string) =>
    c.pointA.id === id ? c.pointA.chartSide : c.pointB.id === id ? c.pointB.chartSide : null;
  const owner = (c: SynastryInterChartAspect, id: string) => {
    const s = side(c, id);
    return s ? names[s] : null;
  };
  const assign = (c: SynastryInterChartAspect, id: string, role: string) => {
    const s = side(c, id);
    if (s) roles[s] = role;
  };
  const aspects: Record<string, string> = {
    conjunction: "هم‌نشینیِ", opposition: "مقابلهٔ", square: "مربعِ",
    trine: "تثلیثِ", sextile: "سکستایلِ",
  };
  const pointName = (p: SynastryInterChartAspect["pointA"]) =>
    ({ dsc: "دیسندنت", asc: "اسندنت", ic: "آی‌سی", mc: "ام‌سی" } as Record<string, string>)[p.id] ?? p.label;
  const withEzafe = (p: SynastryInterChartAspect["pointA"]) => {
    const name = pointName(p);
    return name + (name.endsWith("ه") ? "ٔ" : name.endsWith("و") ? "ی" : "ِ");
  };
  const describe = (c: SynastryInterChartAspect) =>
    `${aspects[c.aspectId] ?? c.aspectLabel} ${withEzafe(c.pointA)} ${names[c.pointA.chartSide]} با ${withEzafe(c.pointB)} ${names[c.pointB.chartSide]}`;
  const addEvidence = (c: SynastryInterChartAspect, label: string) => {
    if (!evidence.some(e => e.id === c.id + "-boundaries-commitment"))
      evidence.push({ id: c.id + "-boundaries-commitment", label, detail: describe(c) + "." });
  };
  const planWord = { romantic: "برنامهٔ آخر هفته", friendship: "دورهمی آخر هفته", family: "دیدار خانوادگی", work: "زمان تحویل یک کار", general: "برنامهٔ مشترک" }[relationship];
  const scenes = {
    romantic: { invitation: "رفتن به کنسرت", reserve: "ساعت دیدار را خالی نگه می‌دارد", personal: "کلاس دلخواهش", duty: "پیگیری تعمیر خانه", handoff: "تماس با تعمیرکار", privateRequest: "دعوت از مهمان به خانهٔ دیگری بدون هماهنگی", uncertain: "دعوت به یک سفر", alternative: "رزرو بلیت" },
    friendship: { invitation: "رفتن به نمایشگاه", reserve: "برای دیدار برنامهٔ دیگری نمی‌چیند", personal: "تمرین ورزشی‌اش", duty: "هماهنگی یک گردش گروهی", handoff: "خبر دادن به بقیه", privateRequest: "آمدن به خانه بدون قرار قبلی", uncertain: "پیوستن به یک گردش گروهی", alternative: "خرید بلیت" },
    family: { invitation: "دیدار خانوادگی", reserve: "زمان دیدار را خالی نگه می‌دارد", personal: "قرار شخصی‌اش", duty: "رسیدگی به یک کار خانوادگی", handoff: "پیگیری نوبت", privateRequest: "دعوت مهمان به خانهٔ دیگری بدون هماهنگی", uncertain: "شرکت در یک مهمانی خانوادگی", alternative: "پذیرفتن مسئولیت رفت‌وآمد" },
    work: { invitation: "تغییر موعد تحویل", reserve: "زمان بازبینی فایل را خالی نگه می‌دارد", personal: "کار مستقلش", duty: "تحویل یک پروژه", handoff: "آماده‌کردن نسخهٔ اولیه", privateRequest: "درخواست انجام کار خارج از ساعت کاری", uncertain: "پذیرفتن یک مسئولیت اضافه", alternative: "تعیین موعد تحویل" },
    general: { invitation: "انجام یک کار مشترک", reserve: "وقت لازم را خالی نگه می‌دارد", personal: "برنامهٔ مستقلش", duty: "آماده‌سازی یک برنامه", handoff: "هماهنگی محل", privateRequest: "درخواست استفاده از وقت شخصی بدون هماهنگی", uncertain: "شرکت در یک برنامهٔ تازه", alternative: "پذیرفتن مسئولیت اجرایی" },
  }[relationship];
  const concrete = {
    romantic: { clash: "زمان کلاس با ساعتی که برای خرید مشترک کنار گذاشته‌اند تداخل دارد", decision: "انتخاب هزینه و زمان تعمیر", next: "زمان مناسب برای نصب", privacy: (name: string) => `برای پنجشنبه مهمان دعوت کند و خانهٔ ${name} را محل پذیرایی در نظر بگیرد` },
    friendship: { clash: "زمان تمرین با کاری که برای جمع پذیرفته‌اند تداخل دارد", decision: "انتخاب مقصد و هزینهٔ گردش", next: "ساعت مناسب برای دیدار", privacy: (name: string) => `بدون هماهنگی برای رفتن به خانهٔ ${name} برنامه بریزد` },
    family: { clash: "زمان قرار با مسئولیت خانوادگی پذیرفته‌شده تداخل دارد", decision: "انتخاب زمان و هزینهٔ کار خانوادگی", next: "زمان مناسب برای نوبت", privacy: (name: string) => `برای دعوت مهمان به خانهٔ ${name} برنامه بریزد` },
    work: { clash: "زمان کار مستقل با موعدی که هر دو پذیرفته‌اند تداخل دارد", decision: "انتخاب دامنه و موعد تحویل", next: "دامنهٔ بازبینی نسخه", privacy: (name: string) => `انجام کار خارج از ساعت توافق‌شده را جزو مسئولیت قبلی ${name} بداند` },
    general: { clash: "زمان برنامهٔ مستقل با مسئولیت مشترک پذیرفته‌شده تداخل دارد", decision: "انتخاب زمان و هزینهٔ برنامه", next: "زمان مناسب برای اجرا", privacy: (name: string) => `بدون پرسیدن برای وقت شخصی ${name} تصمیم بگیرد` },
  }[relationship];
  const terms = {
    romantic: { consequence: "اگر خرید بلیت هزینه‌ای غیرقابل‌برگشت دارد، پیش از خرید مشخص کنید چه کسی آن هزینه را می‌پذیرد", release: "اگر قرار تا موعد خرید بلیت قطعی نشد، هر نفر می‌تواند برای آن ساعت برنامهٔ دیگری بچیند", review: "اگر تعمیرکار هزینهٔ تازه‌ای اعلام کند، مسئول تماس فقط خبر را منتقل می‌کند؛ تأیید مبلغ با هر دو نفر است", limited: "کسی که می‌خواهد بلیت رزرو کند، می‌تواند گزینهٔ قابل‌لغو را به هزینهٔ خودش نگه دارد", limit: "تا فردا ظهر جواب بدهیم؛ تا آن موقع برای دیگری بلیت نخریم" },
    friendship: { consequence: "اگر خرید بلیت برای جمع هزینه‌ای غیرقابل‌برگشت دارد، پیش از خرید سهم هر نفر را مشخص کنید", release: "اگر دیدار تا موعد خرید بلیت قطعی نشد، هر نفر می‌تواند برای آن ساعت برنامهٔ دیگری بچیند", review: "اگر هزینهٔ گردش از مبلغ توافق‌شده بیشتر شد، مسئول هماهنگی مبلغ تازه را برای تصمیم جمع اعلام می‌کند", limited: "کسی که می‌خواهد بلیت بخرد، می‌تواند گزینهٔ قابل‌لغو را به هزینهٔ خودش نگه دارد", limit: "تا فردا ظهر جواب بدهیم؛ تا آن موقع برای دیگری بلیت نخریم" },
    family: { consequence: "اگر آماده‌سازی دیدار هزینه یا کار اضافه دارد، پیش از شروع سهم هر نفر را مشخص کنید", release: "اگر دیدار تا موعد هماهنگی قطعی نشد، هر نفر می‌تواند برای آن ساعت برنامهٔ دیگری بچیند", review: "اگر موعد تازه با برنامهٔ یکی از اعضا تداخل داشت، مسئول پیگیری گزینه‌ها را اعلام می‌کند؛ انتخاب با افراد درگیر است", limited: "کسی که می‌خواهد در مهمانی حاضر شود، می‌تواند رفت‌وآمد خودش را جداگانه هماهنگ کند", limit: "تا فردا ظهر جواب بدهیم؛ تا آن موقع رفت‌وآمد دیگری را قطعی نکنیم" },
    work: { consequence: "اگر تغییر موعد به کار اضافه نیاز دارد، پیش از اعلام آن مسئول این کار را مشخص کنید", release: "اگر موعد جدید تا پایان زمان هماهنگی قطعی نشد، برنامهٔ کاری قبلی مبنا می‌ماند", review: "اگر نسخهٔ اولیه به کاری خارج از دامنهٔ توافق نیاز داشت، مسئول اجرا گزینه‌ها را اعلام می‌کند؛ تغییر دامنه تصمیم مشترک است", limited: "کسی که می‌خواهد کار اضافه را قبول کند، می‌تواند ابتدا ظرفیت کاری خودش را بررسی کند", limit: "تا فردا ظهر ظرفیت را بررسی کنیم؛ تا آن موقع موعد تازه‌ای اعلام نکنیم" },
    general: { consequence: "اگر برنامه هزینه یا کار اضافه دارد، پیش از اقدام سهم هر نفر را مشخص کنید", release: "اگر برنامه تا موعد هماهنگی قطعی نشد، هر نفر می‌تواند برای آن ساعت برنامهٔ دیگری بچیند", review: "اگر اجرای برنامه به هزینه یا زمانی بیشتر از توافق نیاز داشت، مسئول هماهنگی تغییر را اعلام می‌کند؛ پذیرش آن تصمیم مشترک است", limited: "کسی که می‌خواهد زودتر اقدام کند، می‌تواند فقط سهم خودش را پیش ببرد", limit: "تا فردا ظهر جواب بدهیم؛ تا آن موقع مسئولیت دیگری را قطعی نکنیم" },
  }[relationship];

  // A remaining allocated support must contribute its own boundary question.
  // The planet supplies the interpretive lens, the personal point supplies the domain.
  const boundaryLens = (contact: SynastryInterChartAspect) => {
    const outer = ["saturn", "uranus", "pluto"].find(id => owner(contact, id));
    const target = ["sun", "venus", "asc", "dsc", "ic", "mc"].find(id => owner(contact, id));
    if (!outer || !target) return null;
    const holder = owner(contact, outer)!;
    const person = owner(contact, target)!;
    const tense = contact.aspectId === "square" || contact.aspectId === "opposition";
    const domain = {
      sun: { topic: "انتخاب مسیر شخصی", scene: `${person} دربارهٔ ${scenes.personal} تصمیم می‌گیرد`, rule: "دلیل انتخاب شخصی لازم نیست به تأیید دیگری برسد" },
      venus: { topic: "اختیار در انتخاب و پسند شخصی", scene: `${person} پیشنهاد ${scenes.invitation} را هنوز نپذیرفته است`, rule: "پیشنهاد با رضایت هر دو به توافق تبدیل می‌شود" },
      asc: { topic: "اختیار در شیوهٔ انجام کار", scene: `${person} برای انجام سهم خودش روش دیگری انتخاب می‌کند`, rule: "معیار مشترک نتیجه است، نه یکسان بودن روش" },
      dsc: { topic: "حدود نقش در همکاری", scene: `${person} می‌خواهد مسئولیت ${scenes.handoff} روشن باشد`, rule: "سپردن یک کار، اختیار همهٔ تصمیم‌ها را منتقل نمی‌کند" },
      ic: { topic: "حریم زندگی خصوصی", scene: `${holder} می‌خواهد ${concrete.privacy(person)}`, rule: "استفاده از فضای شخصی یا وقت خارج از توافق نیاز به رضایت تازه دارد" },
      mc: { topic: "اختیار در مسیر کاری و مسئولیت بیرونی", scene: `${person} می‌خواهد زمان برنامهٔ مستقلش را مشخص کند`, rule: "تعهد مشترک باید با مسئولیت‌های بیرونی قابل جمع باشد" },
    }[target];
    const lens = {
      saturn: "انتظار از مسئولیت و ثبات",
      uranus: "تمایل به تغییر و آزادی عمل",
      pluto: "پرسشِ اختیار و نفوذ در تصمیم",
    }[outer];
    return { holder, person, target, outer, tense, domain, lens };
  };
  let title: string, lead: string, example: string, strength: string, challenge: string, step: string;
  if (!primary || plan?.status !== "supported") {
    title = "کدام پیشنهاد واقعاً قول است؟";
    lead = primary
      ? `${describe(primary)} از جنس تماس میان جایگاه‌های سیاره‌ای کند است. در این خوانش، چنین شاهدی برای شناخت انتظار شخصی هر نفر از قول و استقلال کافی نیست.`
      : "شاهد اختصاصی کافی برای توصیف انتظار این دو نفر از قول و مسئولیت در دست نیست.";
    if (primary) addEvidence(primary, "شاهد محدود مرز و تعهد");
    example = `برای ${scenes.uncertain}، ${terms.limited}.`;
    strength = "پیش از پاسخ، مشخص کنید چه اطلاعاتی هنوز کم است؛ مثلاً زمان آزاد یا هزینهٔ نهایی. اگر اطلاعات لازم تا موعد پاسخ آماده نشد، می‌توانید زمان دیگری برای تصمیم پیشنهاد کنید.";
    challenge = "اگر تا موعد پاسخ نرسید، سکوت را موافقت فرض نکنید.";
    step = `یک توافق کوتاه برای همین موقعیت: «${terms.limit}». این یک پیشنهاد عمومی برای روشن‌کردن توافق است.`;
  } else {
    addEvidence(primary, "شاهد اصلی مرز و تعهد");
    const saturn = owner(primary, "saturn");
    const venus = owner(primary, "venus");
    const dsc = owner(primary, "dsc");
    const hard = primary.aspectId === "square" || primary.aspectId === "opposition";
    if (saturn && venus) {
      title = "وقتی یک انتخاب به قول تبدیل می‌شود";
      lead = `${venus} پیشنهاد ${scenes.invitation} را مطرح می‌کند؛ ${saturn} پیش از کنار گذاشتن وقتش می‌خواهد بداند قرار قطعی است یا نه. در خوانش نجومی، ${describe(primary)} ${hard ? "تفاوت میان آزادی انتخاب و توقع پایبندی را پررنگ می‌کند" : "ترجیح شخصی را به نیاز به یک قرار قابل اتکا پیوند می‌دهد"}. برای ${saturn} پاسخ روشن به پیشنهاد، مبنای برنامه‌ریزی بعدی است.`;
      example = `${terms.release}. این قاعده از ${saturn} نمی‌خواهد برای پیشنهادی نامشخص وقتش را نگه دارد و به ${venus} فرصت انتخاب می‌دهد.`;
      strength = `${terms.consequence}. ${saturn} می‌تواند شرط لازم برای قطعی شدن برنامه را روشن کند و ${venus} تصمیم بگیرد آیا آن شرط را می‌پذیرد یا نه.`;
      challenge = "پس از قطعی شدن برنامه، نمی‌توان زمان و کاری را که دیگری به آن اختصاص داده نادیده گرفت. تغییر یک قرار پذیرفته‌شده با گرفتن اجازه برای هر انتخاب شخصی فرق دارد.";
      step = "برای برنامهٔ بعدی دو جملهٔ روشن داشته باشید: «تا این ساعت جواب قطعی می‌دهم» و «اگر بعد از تأیید نیاز به تغییر بود، قبل از اقدام با هم هماهنگ می‌کنیم.»";
      assign(primary, "saturn", "پیشنهاد را از نظر قابل اتکا بودن و مسئولیت می‌سنجد.");
      assign(primary, "venus", "خواست و ترجیح شخصی را وارد تصمیم مشترک می‌کند.");
      if (support && owner(support, "saturn") && owner(support, "venus") &&
          side(support, "saturn") !== side(primary, "saturn")) {
        const otherSaturn = owner(support, "saturn");
        const otherVenus = owner(support, "venus");
        strength += ` در تماس دوم، ${describe(support)}، این بار ${otherSaturn} است که روی تعهد حساب می‌کند${support.aspectId === "square" || support.aspectId === "opposition" ? " و انتخاب شخصی نفر دیگر ممکن است با قرار قبلی جور درنیاید" : ""}. فرض کنید ${otherVenus} برای ${scenes.personal} وقت گذاشته و ${concrete.clash}. اگر ${otherVenus} بتواند سهم مشترک را در ساعتی دیگر انجام دهد، ${otherSaturn} می‌تواند دربارهٔ زمان جایگزین نظر بدهد، نه دربارهٔ ارزش برنامهٔ شخصی او.`;
        addEvidence(support, "شاهد پشتیبان مرز و تعهد");
      }
    } else if (saturn && dsc) {
      title = "چه کسی مسئول کدام بخش است؟";
      lead = `در ${scenes.duty}، برای ${dsc} مهم است بداند کدام بخش را می‌تواند به ${saturn} بسپارد. ${describe(primary)} در خوانش نجومی مسئولیت را به نقطهٔ شراکت در چارت ${dsc} پیوند می‌دهد. اینجا معیار اعتماد، انجام کاری است که دیگری پذیرفته، نه تعداد کارهایی که به عهده گرفته است.`;
      example = `مثلاً ${saturn} مسئولیت ${scenes.handoff} را می‌پذیرد. به جای اینکه ${dsc} هر مرحله را دوباره پیگیری کند، می‌توانند از پیش تعیین کنند ${saturn} چه زمانی نتیجه را به ${dsc} اطلاع دهد. سپس دربارهٔ ${concrete.next} با هم تصمیم می‌گیرند.`;
      strength = `${terms.review}. این سقف اختیار را پیشاپیش تعیین کنید تا ${saturn} برای تصمیم‌های کوچک منتظر نماند و ${dsc} در تصمیم‌های مهم غافلگیر نشود. اگر کار تازه‌ای پیش آمد، ابتدا روشن کنید داخل همین سهم است یا باید جداگانه پذیرفته شود.`;
      challenge = "گاهی از یک توافق مشخص، انتظار تازه‌ای شکل می‌گیرد.";
      step = "برای یک کار تکراری، پایان دورهٔ آزمایشی تعیین کنید؛ آن روز بررسی کنید تقسیم کار هنوز برای هر دو مناسب است یا باید عوض شود.";
      assign(primary, "saturn", "معیار مسئولیت و امکان اتکا را وارد توافق می‌کند.");
      assign(primary, "dsc", "از رفتار مشخص طرف مقابل معنای شراکت را می‌سنجد.");
      if (support && owner(support, "saturn") && owner(support, "ic")) {
        const privateSide = owner(support, "ic");
        const dutySide = owner(support, "saturn");
        challenge += ` ${describe(support)} در خوانش نجومی ${support.aspectId === "square" || support.aspectId === "opposition" ? "تفاوت میان انتظار از مسئولیت و نیاز به حفظ اختیار شخصی را برجسته می‌کند" : "پیوند مسئولیت مشترک با حفظ اختیار شخصی را برجسته می‌کند"}. آی‌سی به حریم خانه و زندگی خصوصی مربوط است. فرض کنید ${dutySide} بخواهد ${concrete.privacy(privateSide)}. در این موقعیت ${privateSide} می‌تواند درخواست تازه را رد کند، بدون اینکه تعهد قبلی‌اش لغو شود.`;
        addEvidence(support, "شاهد پشتیبان مرز و تعهد");
      }
    } else if (saturn && ["sun", "asc", "ic", "mc"].some(id => owner(primary, id))) {
      const target = ["sun", "asc", "ic", "mc"].find(id => owner(primary, id))!;
      const person = owner(primary, target)!;
      const dimension = { sun: "اختیار انتخاب مسیر شخصی", asc: "شیوهٔ مستقل پیش بردن کار", ic: "اختیار در فضای خصوصی", mc: "انتخاب مسیر و مسئولیت بیرونی" }[target as "sun" | "asc" | "ic" | "mc"];
      title = "مسئولیت مشترک تا کجا پیش می‌رود؟";
      lead = `${describe(primary)} در خوانش نجومی ${hard ? "تفاوت میان" : "پیوند میان"} انتظار ${saturn} از مسئولیت و ${dimension} ${person} را برجسته می‌کند. پذیرفتن یک کار مشترک لزوماً به معنی واگذاری تصمیم شخصی نیست.`;
      const lens = boundaryLens(primary)!;
      example = `فرض کنید ${lens.domain.scene}. در این موقعیت ${lens.domain.rule}.`;
      strength = `${terms.review}. در چنین توافقی، اختیار اجرای سهم مشخص با تصمیم دربارهٔ دامنهٔ آن یکی نیست.`;
      challenge = `اگر انتظار ${saturn} از مسئولیت فراتر از چیزی باشد که ${person} پذیرفته است، این انتظار هنوز توافق نیست. برای بخش اضافه باید جداگانه تصمیم بگیرند.`;
      step = "کنار یک مسئولیت بنویسید کدام بخش قطعی است و کدام انتخاب همچنان به عهدهٔ انجام‌دهنده می‌ماند.";
      assign(primary, "saturn", "حد مسئولیت پذیرفته‌شده را روشن می‌کند.");
      assign(primary, target, "اختیار تصمیم مربوط به مسیر خود را حفظ می‌کند.");
    } else if (boundaryLens(primary)) {
      const lens = boundaryLens(primary)!;
      title = lens.outer === "uranus" ? "کجا تغییر برنامه به توافق تازه نیاز دارد؟" : "اختیار هر نفر در تصمیم مشترک";
      lead = `${describe(primary)} در خوانش نجومی ${lens.tense ? "تفاوت احتمالی میان" : "پیوند میان"} ${lens.lens} برای ${lens.holder} و ${lens.domain.topic} برای ${lens.person} را مطرح می‌کند. این تماس به‌تنهایی رفتار کنترل‌گرانه یا بی‌تعهدی را ثابت نمی‌کند.`;
      example = `فرض کنید ${lens.domain.scene}. در این موقعیت ${lens.domain.rule}.`;
      strength = lens.outer === "uranus" ? "برای تغییر برنامه، بخشی را که هنوز قابل انتخاب است از کاری که قبلاً پذیرفته‌اید جدا کنید؛ به این ترتیب آزادی عمل مستلزم لغو همهٔ توافق‌ها نیست." : "پیش از تصمیمی که برای هر دو پیامد دارد، دامنهٔ اختیار هر نفر را تعیین کنید؛ نظر دادن با حق تصمیم نهایی یکسان نیست.";
      challenge = "پذیرفتن یک پیشنهاد نباید به معنای موافقت با درخواست‌های بعدی باشد.";
      step = "برای یک تصمیم واقعی، مشخص کنید چه کسی پیشنهاد می‌دهد، چه کسی باید رضایت بدهد و چه چیزی از ابتدا توافق نشده است.";
      assign(primary, lens.outer, lens.lens + " را وارد موضوع می‌کند.");
      assign(primary, lens.target, lens.domain.topic + " برای او محل بررسی است.");
    } else {
      title = "حدود یک توافق مشترک";
      lead = `${describe(primary)} شاهد تخصیص‌یافتهٔ این فصل است. در تفسیر نجومی می‌توان آن را از زاویهٔ حدود اختیار و مسئولیت بررسی کرد، اما شکل دقیق قول یا ترجیح هر نفر به شاهد اختصاصی‌تر نیاز دارد.`;
      example = `هنگام تعیین ${planWord}، فرق پیشنهاد و توافق قطعی را مشخص کنید.`;
      strength = "توافق می‌تواند فقط همان مسئولیتی را شامل شود که هر دو پذیرفته‌اند.";
      challenge = "از این تماس به‌تنهایی نمی‌توان میزان وفاداری، کنترل‌گری یا دوام رابطه را نتیجه گرفت.";
      step = "مسئولیت پذیرفته‌شده و بخش قابل تغییر برنامه را جداگانه بنویسید.";
    }
    if (support && !evidence.some(e => e.id === support.id + "-boundaries-commitment")) {
      const extra = boundaryLens(support);
      if (extra) {
        challenge += ` شاهد دوم، ${describe(support)}، ${extra.tense ? "تفاوت احتمالی میان" : "پیوند میان"} ${extra.lens} برای ${extra.holder} و ${extra.domain.topic} برای ${extra.person} را مطرح می‌کند. ${boundaryLens(primary)?.target === extra.target ? `این بار به تصمیمی نگاه کنید که دو نفر باید پیش از انجام آن با هم توافق کنند؛ اگر ${extra.person} سهمی از آن نپذیرفته، صرف نظر ${extra.holder} برای قطعی شدنش کافی نیست.` : `فرض کنید ${extra.domain.scene}؛ ${extra.domain.rule}.`}`;
        addEvidence(support, "شاهد پشتیبان مرز و تعهد");
      }
    }
  }
  const unknownRole = "انتظار اختصاصی او دربارهٔ قول یا استقلال از این شاهد روشن نیست.";
  return {
    id: primary ? "boundaries-commitment-" + primary.id : "boundaries-commitment-insufficient",
    title, humanExperience: lead, dailySituation: example, strength, challenge,
    practicalStep: step, evidence,
    personA: roles.a ?? unknownRole, personB: roles.b ?? unknownRole,
    feelingOrReaction: challenge, effect: strength, cycle: example,
  };
}

/** Describe escalation and repair, not the original disagreement or a diagnosis. */
function buildFrictionChapter(
  primary: SynastryInterChartAspect | undefined,
  support: SynastryInterChartAspect | undefined,
  labels: { a: string; b: string },
  relationship: RealSynastryReport["relationshipContext"],
  plan: ReturnType<typeof buildComparisonEvidencePlan>["chapterPlans"][number] | undefined,
): HumanFirstDirectionalNarrativeBlock {
  type Side = "a" | "b";
  const names = labels.a === labels.b
    ? { a: labels.a + " (نفر اول)", b: labels.b + " (نفر دوم)" } : labels;
  const roles: Partial<Record<Side, string>> = {};
  const evidence: HumanFirstEvidence[] = [];
  const side = (c: SynastryInterChartAspect, id: string) =>
    c.pointA.id === id ? c.pointA.chartSide : c.pointB.id === id ? c.pointB.chartSide : null;
  const owner = (c: SynastryInterChartAspect, id: string) => {
    const s = side(c, id);
    return s ? names[s] : null;
  };
  const assign = (c: SynastryInterChartAspect, id: string, role: string) => {
    const s = side(c, id);
    if (s) roles[s] = role;
  };
  const aspects: Record<string, string> = {
    conjunction: "هم‌نشینیِ", opposition: "مقابلهٔ", square: "مربعِ",
    trine: "تثلیثِ", sextile: "سکستایلِ",
  };
  const pointName = (p: SynastryInterChartAspect["pointA"]) =>
    ({ asc: "اسندنت", dsc: "دیسندنت", ic: "آی‌سی", mc: "ام‌سی" } as Record<string, string>)[p.id] ?? p.label;
  const ezafe = (p: SynastryInterChartAspect["pointA"]) => {
    const name = pointName(p);
    return name + (name.endsWith("ه") ? "ٔ" : name.endsWith("و") ? "ی" : "ِ");
  };
  const describe = (c: SynastryInterChartAspect) =>
    `${aspects[c.aspectId] ?? c.aspectLabel} ${ezafe(c.pointA)} ${names[c.pointA.chartSide]} با ${ezafe(c.pointB)} ${names[c.pointB.chartSide]}`;
  const addEvidence = (c: SynastryInterChartAspect, label: string) => {
    if (!evidence.some(e => e.id === c.id + "-friction-repair"))
      evidence.push({ id: c.id + "-friction-repair", label, detail: describe(c) + "." });
  };
  const scenes = {
    romantic: { immediate: "وقت آماده‌کردن شام", control: "وقتی برای رسیدن به یک قرار عجله دارید و مسیر را انتخاب می‌کنید", verbal: "وقتی کلیدها پیدا نمی‌شوند", privateSpace: "وقتی بحث در خانه ادامه پیدا کرده" },
    friendship: { immediate: "وقت چیدن میز دورهمی", control: "هنگام جمع‌کردن وسایل یک گردش", verbal: "هنگام پیدا کردن نشانی یک مقصد", privateSpace: "وسط یک اختلاف در جمع دوستان" },
    family: { immediate: "وقت آماده‌کردن غذای خانوادگی", control: "هنگام مرتب‌کردن وسایل مشترک", verbal: "هنگام پیدا کردن یک مدرک گمشده", privateSpace: "وسط یک اختلاف خانوادگی" },
    work: { immediate: "وقت تنظیم فایل مشترک", control: "هنگام رفع یک اشکال در فایل مشترک", verbal: "هنگام پیدا کردن علت یک خطای فنی", privateSpace: "وسط یک اختلاف در جلسه" },
    general: { immediate: "وقت انجام کار مشترک", control: "هنگام مرتب‌کردن وسایل مشترک", verbal: "هنگام پیدا کردن علت یک اشکال", privateSpace: "وسط یک اختلاف در جمع" },
  }[relationship];
  // Keep the primary escalation and the repair trial inside the same concrete situation.
  const controlScenes = {
    romantic: { setting: "در راه رسیدن به یک قرار", action: "اصرار می‌کند از مسیر میان‌بر بروند", objection: "اگه بسته باشه بیشتر دیر می‌رسیم", trial: "در نقشه وضعیت همان مسیر و زمان رسیدن از هر دو راه را بررسی کنند، بدون اینکه هنوز مسیرشان را عوض کنند", reversal: "اگر مسیر بدون توافق عوض شده، پیش از ادامه دوباره امکان انتخاب مسیر را فراهم کنند", restart: "به محض اینکه بحث ساکت می‌شود، دوباره به سمت میان‌بر می‌پیچد" },
    friendship: { setting: "هنگام آماده کردن وسایل یک گردش", action: "می‌خواهد وسایل را یک‌باره در یک کیف جا بدهد", objection: "ممکنه وسایل ظریف آسیب ببینن", trial: "اول با چند وسیلهٔ معمولی ظرفیت کیف را بسنجند و وسایل ظریف را بیرون نگه دارند", reversal: "اگر وسایل بدون توافق جابه‌جا شده‌اند، دوباره آن‌ها را برای بررسی در دسترس بگذارند", restart: "به محض اینکه بحث ساکت می‌شود، دوباره سراغ جمع کردن وسایل می‌رود" },
    family: { setting: "هنگام مرتب کردن وسایل خانوادگی", action: "می‌خواهد چند وسیله را فوراً به انبار ببرد", objection: "شاید همین هفته بهشون نیاز داشته باشیم", trial: "اول فقط وسایلی را جدا کنند که هر دو مطمئن‌اند به آن‌ها نیاز فوری ندارند", reversal: "اگر وسیله‌ای بدون توافق جابه‌جا شده، آن را دوباره در دسترس بگذارند", restart: "به محض اینکه بحث ساکت می‌شود، دوباره یکی از وسایل را برمی‌دارد" },
    work: { setting: "هنگام رفع اشکال یک فایل مشترک", action: "می‌خواهد نسخهٔ اصلی فایل را همان لحظه تغییر دهد", objection: "اگه بخش‌های دیگه هم خراب بشن چی", trial: "تغییر را ابتدا روی یک نسخهٔ جداگانه امتحان کنند و نتیجه را کنار نسخهٔ اصلی بسنجند", reversal: "اگر فایل اصلی بدون توافق تغییر کرده، نسخهٔ قبلی را برای بازبینی در دسترس بگذارند", restart: "به محض اینکه بحث ساکت می‌شود، دوباره دست به تغییر نسخهٔ اصلی می‌زند" },
    general: { setting: "هنگام مرتب کردن وسایل مشترک", action: "می‌خواهد همهٔ وسایل را به محل تازه‌ای منتقل کند", objection: "شاید اونجا دسترسی سخت‌تر بشه", trial: "جای چند وسیلهٔ کم‌استفاده را موقتاً عوض کنند و دسترسی را بسنجند", reversal: "اگر وسایل بدون توافق منتقل شده‌اند، امکان برگرداندنشان را فراهم کنند", restart: "به محض اینکه بحث ساکت می‌شود، دوباره یکی از وسایل را جابه‌جا می‌کند" },
  }[relationship];
  const immediateActions = {
    romantic: "سبزی‌هایی را که دیگری برای سالاد خرد کرده، بی‌هماهنگی ریزتر خرد می‌کند",
    friendship: "ظرف‌هایی را که دیگری چیده، بی‌هماهنگی جابه‌جا می‌کند",
    family: "مواد غذایی را که دیگری جدا کرده، بی‌هماهنگی با هم مخلوط می‌کند",
    work: "عنوان‌ها و ترتیب بخش‌هایی را که دیگری تنظیم کرده، بی‌هماهنگی تغییر می‌دهد",
    general: "ابزارهایی را که دیگری برای ادامهٔ کار آماده کرده، بی‌هماهنگی جابه‌جا می‌کند",
  }[relationship];
  const followupScenes = {
    romantic: "پس از جمع شدن سفره",
    friendship: "پس از جمع شدن میز",
    family: "پس از پایان کار خانوادگی",
    work: "پس از ذخیرهٔ فایل",
    general: "پس از پایان کار",
  }[relationship];
  let title: string, lead: string, example: string, strength: string, challenge: string, step: string;
  if (!primary || plan?.status !== "supported") {
    title = "اختلاف از کجا بزرگ‌تر می‌شود؟";
    lead = primary
      ? `${describe(primary)} در نقشهٔ این فصل شاهد محدودی است؛ از آن نمی‌توان ترتیب واکنش‌های این دو نفر هنگام اختلاف را تعیین کرد.`
      : "شاهد اختصاصی کافی برای تعیین چرخهٔ تنش این دو نفر در دست نیست.";
    if (primary) addEvidence(primary, "شاهد محدود اصطکاک و ترمیم");
    example = "برای شناخت چرخه، یک اختلاف واقعی را از لحظه‌ای که شدت گرفت مرور کنید؛ چه رفتار قابل مشاهده‌ای پیش از تغییر لحن اتفاق افتاد؟";
    strength = "تفاوت میان موضوع اولیه و واکنشی که اختلاف را بزرگ‌تر کرد، نقطهٔ مناسبی برای پیدا کردن راه برگشت است.";
    challenge = "از این دادهٔ محدود نمی‌توان تعیین کرد کدام نفر بیشتر به دفاع یا فاصله گرفتن روی می‌آورد.";
    step = "یک پیشنهاد عمومی: هر نفر یک رفتار قابل تغییر از جانب خودش انتخاب کند و زمان مناسبی برای بازگشت به موضوع تعیین کنید.";
  } else {
    addEvidence(primary, "شاهد اصلی اصطکاک و ترمیم");
    const mars = owner(primary, "mars");
    const asc = owner(primary, "asc");
    const pluto = owner(primary, "pluto");
    const mercury = owner(primary, "mercury");
    if (mars && asc) {
      title = "وقتی مداخله به واکنش متقابل تبدیل می‌شود";
      lead = `${mars} برای جلو بردن کار دست به کار می‌شود؛ ${asc} ممکن است این کمک ناخواسته را دخالت بداند. ${describe(primary)} در خوانش نجومی برخوردِ عمل و واکنش فوری را برجسته می‌کند. اگر ${mars} بعد از اعتراض ${asc} باز هم اصرار کند، اختلاف دیگر فقط بر سر نحوهٔ انجام کار نیست. مسئله این می‌شود که آیا اعتراض دیگری واقعاً در رفتار بعدی اثر دارد یا نه.`;
      example = `${scenes.immediate}، فرض کنید ${mars} ${immediateActions}؛ ${asc} می‌گوید «خودم داشتم انجامش می‌دادم». اگر جواب ${mars} این باشد که «ولی این‌طوری سریع‌تره» و همچنان ادامه دهد، اعتراض به یک حرکت کوچک به بحث دربارهٔ احترام تبدیل می‌شود.`;
      strength = `اعتراض ${asc} فرصتی برای تغییر مسیر است. ${mars} می‌تواند همان کاری را که به عهده گرفته متوقف کند و اگر بخشی از نتیجه تغییر کرده، از ${asc} بپرسد چه چیزی هنوز قابل اصلاح است. اگر نتیجه برگشت‌پذیر نیست، مسئولیت اصلاح آن را به عهده بگیرد، نه اینکه کار اضافه را به دیگری واگذار کند.`;
      challenge = "اگر فقط روی پایان یافتن کار حساب کنید، ممکن است همکاری بعدی برای یکی از شما با انتظار تکرار همان برخورد آغاز شود.";
      step = `در همکاری بعدی، ${mars} پیش از دست زدن به کار دیگری پیشنهاد مشخصی بدهد و منتظر پاسخ بماند. ${asc} می‌تواند همان مقدار کمک را که واقعاً لازم دارد درخواست کند. آزمون ترمیم این است که هر دو بتوانید دوباره کنار هم کار کنید، بی‌آنکه یکی مراقب باشد دیگری کارش را از دستش نگیرد.`;
      assign(primary, "mars", "با ادامهٔ اقدام پس از مقاومت می‌تواند تنش را بیشتر کند؛ توقف مداخله نقطهٔ برگشت اوست.");
      assign(primary, "asc", "به مداخلهٔ مستقیم واکنش فوری نشان می‌دهد؛ مشخص کردن کمک قابل قبول نقطهٔ برگشت اوست.");
    } else if (mars && pluto) {
      title = "وقتی اختلاف به زورآزمایی تبدیل می‌شود";
      lead = `${mars} برای پایان دادن به اختلاف به اقدام رو می‌آورد و ${pluto} ممکن است آن را تحمیل نتیجه بداند. ${describe(primary)} در تفسیر نجومی به تشدید متقابل اشاره دارد. نقطهٔ خطر وقتی است که انتخاب راه بهتر دیگر کافی نیست و تغییر نظر برای هر کدام به معنی باختن می‌شود. حتی یک پیشنهاد درست هم ممکن است رد شود، چون پذیرفتن آن در آن لحظه شبیه تسلیم شدن است.`;
      example = `${controlScenes.setting}، ${mars} ${controlScenes.action}. ${pluto} می‌گوید: «${controlScenes.objection}». اگر پاسخ ${mars} به نگرانی فقط اصرار باشد، ${pluto} ممکن است حتی پیشنهادهای بعدی را هم نپذیرد؛ در حالی که هنوز نمی‌دانید نگرانی اولیه چقدر موجه بوده است.`;
      strength = `پیشنهاد ${mars} زمانی ارزش بررسی دوباره پیدا می‌کند که ${pluto} برای پذیرفتنش مجبور نباشد نگرانی خودش را انکار کند: ${controlScenes.trial}. پیش از آزمون، هر نفر بگوید دیدن چه نتیجه‌ای باعث می‌شود نظرش را تغییر دهد؛ این شرط برای هر دو یکسان باشد.`;
      challenge = "تهدید، تحقیر یا گرفتن اختیار از دیگری راه ترمیم نیست؛ هیچ جنبهٔ نجومی هم به معنای وقوع یا توجیه این رفتارها نیست.";
      step = `برای ترمیم اختلاف ابتدا اختیار از دست رفته را برگردانید: ${controlScenes.reversal}. اگر نتیجهٔ بررسی نظر یکی را تأیید کرد، دیگری باید بتواند نظرش را تغییر دهد بی‌آنکه بعداً به رخ او کشیده شود. این رفتار مهم‌تر از گرفتن اعتراف به اشتباه است؛ اختلاف بعدی نباید با یادآوری اینکه دفعهٔ قبل چه کسی برنده شد شروع شود.`;
      assign(primary, "mars", "برای پایان دادن به اختلاف به اقدام رو می‌آورد؛ پیشنهاد آزمون برگشت‌پذیر مسیر ترمیم اوست.");
      assign(primary, "pluto", "ممکن است در برابر تحمیل نتیجه سخت‌تر بر موضع بایستد؛ بیان نگرانی مشخص مسیر ترمیم اوست.");
    } else if (mars && mercury) {
      title = "وقتی هر توضیح، پاسخ تندتری به دنبال می‌آورد";
      lead = `${mercury} می‌خواهد دلیل اتفاق را روشن کند و ${mars} وقتی بحث کش پیدا می‌کند به دنبال پایان آن است. ${describe(primary)} در تفسیر نجومی به چرخه‌ای اشاره دارد که شتاب یکی، توضیح دیگری را طولانی‌تر می‌کند. نخستین نشانهٔ تشدید می‌تواند این باشد که هر دو به جای پاسخ به موضوع، به طرز حرف زدن یکدیگر واکنش نشان دهند.`;
      example = `${scenes.verbal}، ${mercury} دلیل اتفاق را توضیح می‌دهد و ${mars} وسط جمله می‌گوید «خب، حالا چی کار کنیم؟». اگر ${mercury} این بار بگوید «تو اصلاً گوش نمی‌دی» و ${mars} جواب بدهد «باز شروع کردی»، مسئله به داوری دربارهٔ رفتار هم تبدیل شده است.`;
      strength = `به محض اینکه بحث از اتفاق مشخص به عبارتی مثل «تو همیشه...» رسید، می‌توانید تغییر مسیر را همان‌جا نام ببرید. ${mars} می‌تواند بگوید «این جوابم تند بود» و ${mercury} به جای دفاع از همهٔ توضیحات قبلی، بگوید کدام پاسخ او را آزرده است. اینجا هدف تغییر شیوهٔ برخورد است، نه یافتن سریع‌تر راه‌حل.`;
      challenge = `ممکن است نتیجهٔ عملی کاملاً درست باشد، اما یکی از شما از جمله‌ای که هنگام اختلاف شنیده هنوز ناراحت باشد. شوخی با آن جمله یا گفتن «دیگه که حل شد» می‌تواند باعث شود دفعهٔ بعد موضوع ساده‌ای هم با حالت دفاعی آغاز شود.`;
      step = `در بازگشت به اختلاف، هر نفر فقط یک جمله از خودش را که به دیگری آسیب زده انتخاب کند و شکل دیگری از همان جمله بگوید. ${mars} مثلاً به جای «باز شروع کردی» بگوید «الان دارم تند جواب می‌دم؛ بیست دقیقه دیگه برگردیم به همین بحث». ${mercury} هم می‌تواند به جای «تو اصلاً گوش نمی‌دی» بگوید «وقتی وسط جمله‌ام جواب دادی، نتونستم حرفم رو تموم کنم». معیار ترمیم این است که در اختلاف بعدی این جملهٔ جایگزین واقعاً به کار بیاید.`;
      assign(primary, "mercury", "توضیح را در پاسخ به قطع شدن تکرار می‌کند؛ بازگشت به جملهٔ ناتمام به جای تکرار همهٔ بحث مسیر برگشت اوست.");
      assign(primary, "mars", "می‌خواهد بحث را با عمل یا پاسخ سریع تمام کند؛ کامل شنیدن یک جمله مسیر ترمیم اوست.");
    } else {
      title = "پیش از اینکه واکنش به واکنش تبدیل شود";
      lead = `${describe(primary)} شاهد تخصیص‌یافتهٔ این فصل است. این تماس امکان اصطکاک را مطرح می‌کند، اما برای تعیین شکل دقیق چرخهٔ این دو نفر باید نوع واکنش‌ها را با تجربهٔ خودشان بررسی کرد.`;
      example = `فرض کنید ${scenes.privateSpace} شدت بحث بالا رفته است؛ نخستین تغییر قابل مشاهده در رفتار هر نفر را از موضوع اصلی جدا کنید.`;
      strength = "توقف رفتار تشدیدکننده فرصتی می‌دهد که بعداً فقط به موضوع اصلی برگردید.";
      challenge = "برای این ترکیب نمی‌توان یک نقش ثابت در آغاز یا پایان اختلاف به هر نفر نسبت داد.";
      step = "هنگام بازگشت به بحث، هر نفر یک رفتار مشخص خودش را نام ببرد که می‌تواند دفعهٔ بعد تغییر دهد.";
    }
    if (support && support.id !== primary.id) {
      addEvidence(support, "شاهد پشتیبان اصطکاک و ترمیم");
      const sm = owner(support, "mars");
      const sic = owner(support, "ic");
      const sa = owner(support, "asc");
      if (sm && sic) {
        challenge += ` ${describe(support)} در خوانش نجومی وجه دیگری دارد: آی‌سی به فضای خصوصی و پایهٔ زندگی فرد مربوط است و مریخ می‌تواند با ورود فوری به آن فضا پیوند داشته باشد. ${mars && asc ? followupScenes : "پس از پایان اختلاف"}، ممکن است ${sm} برای روشن شدن ماجرا پیگیر باشد و ${sic} هنوز به خلوت نیاز داشته باشد. اگر ${sic} زمانی برای بازگشت تعیین کند و خودش در همان زمان بحث را آغاز کند، مکث به رها شدن موضوع تبدیل نمی‌شود. این بار آغاز ترمیم بر عهدهٔ کسی است که ابتدا فاصله گرفته بود.`;
      } else if (sm && sa) {
        challenge += ` ${describe(support)} در خوانش نجومی به واکنش فوری در برابر حرکت دیگری نیز مربوط است. ${mars && pluto && sm === mars && sa === pluto ? `تصور کنید ${sm} ${controlScenes.restart}.` : `تصور کنید ${sm} پس از سکوت دوباره کار مورد اختلاف را شروع می‌کند.`} برای ${sa} این حرکت ممکن است به معنی بی‌اعتبار بودن نتیجهٔ بحث باشد. سکوت را نشانهٔ حل اختلاف نگیرید؛ تغییر رفتار در همان موقعیت معیار است.`;
      } else {
        challenge += ` شاهد پشتیبان، ${describe(support)}، امکان بررسی یک لایهٔ دیگر از واکنش را می‌دهد؛ نوع آن باید جدا از الگوی اصلی و بدون فرض نقش تازه بررسی شود.`;
      }
    }
  }
  const unknownRole = "نقش اختصاصی او در تشدید یا ترمیم اختلاف از این شاهد روشن نیست.";
  return {
    id: primary ? "friction-repair-" + primary.id : "friction-repair-insufficient",
    title, humanExperience: lead, dailySituation: example, strength, challenge,
    practicalStep: step, evidence,
    personA: roles.a ?? unknownRole, personB: roles.b ?? unknownRole,
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


type PairCycleDraft = {
  title: string;
  opening: string;
  lead: string;
  roles: [string, string];
  cycle: string;
  situation: string;
  strength: string;
  challenge: string;
  step: string;
  question: string;
  experiment: string;
  next: [string, string];
};

/** A cycle connects two chapter-owned findings; it is not another contact ranking. */
function buildPairNarrative(
  report: RealSynastryReport,
  labels: { a: string; b: string },
  chapters: ComparisonNarrativeChapter[],
) {
  type Side = "a" | "b";
  const names = labels.a === labels.b
    ? { a: labels.a + " (نفر اول)", b: labels.b + " (نفر دوم)" }
    : labels;
  const plan = buildComparisonEvidencePlan(report);
  const witness = (id: ComparisonNarrativeChapter["id"]) => {
    const entry = plan.chapterPlans.find(item => item.chapter === id);
    return entry?.status === "supported"
      ? report.contacts.find(contact => contact.id === entry.primary?.id)
      : undefined;
  };
  const comm = witness("communication");
  const security = witness("emotional-security");
  const attraction = witness("attraction-intimacy");
  const boundary = witness("boundaries-commitment");
  const friction = witness("friction-repair");
  const match = (contact: SynastryInterChartAspect | undefined, first: string, second: string, aspect: string): Side | null => {
    if (!contact || contact.aspectId !== aspect) return null;
    if (contact.pointA.id === first && contact.pointB.id === second) return contact.pointA.chartSide;
    if (contact.pointB.id === first && contact.pointA.id === second) return contact.pointB.chartSide;
    return null;
  };
  const ordered = (side: Side, first: string, second: string): [string, string] =>
    side === "a" ? [first, second] : [second, first];
  const opposite = (side: Side): Side => side === "a" ? "b" : "a";
  const situation = ({
    romantic: "هنگام برنامه‌ریزی برای وقت مشترک",
    friendship: "هنگام هماهنگی یک دیدار دوستانه",
    family: "هنگام هماهنگی یک کار خانوادگی",
    work: "هنگام تنظیم کار مشترک",
    general: "هنگام تصمیم‌گیری دربارهٔ یک کار مشترک",
  } as const)[report.relationshipContext];
  const contextName = ({
    romantic: "رابطهٔ عاطفی", friendship: "دوستی", family: "رابطهٔ خانوادگی",
    work: "همکاری", general: "رابطه",
  } as const)[report.relationshipContext];

  const groups = [
    { key: "words-to-action", ids: ["communication", "friction-repair"] as const, contacts: [comm, friction] },
    { key: "care-to-enjoyment", ids: ["emotional-security", "attraction-intimacy"] as const, contacts: [security, attraction] },
    { key: "choice-to-agreement", ids: ["attraction-intimacy", "boundaries-commitment"] as const, contacts: [attraction, boundary] },
  ];
  const genericDraft = (index: number): PairCycleDraft => {
    const group = groups[index];
    const available = group.ids.map(id => chapters.find(chapter => chapter.id === id))
      .filter(chapter => chapter && witness(chapter.id));
    const focus = available.map(chapter => "«" + chapter!.block.title + "»").join(" و ");
    const link = focus
      ? "این پرسش را در کنار یافتهٔ " + focus + " بررسی کنید، نه به عنوان یک نتیجهٔ قطعی دیگر."
      : "برای نسبت دادن این چرخه به دو چارت شاهد اختصاصی کافی نداریم.";
    if (index === 0) return {
      title: "فاصلهٔ میان شنیدن و تصمیم گرفتن",
      opening: "در بخش گفت‌وگو و اختلاف، باید دید آیا آنچه ابتدا برای فهمیدن گفته می‌شود در لحظهٔ تصمیم نیز همان معنا را حفظ می‌کند",
      lead: link, roles: ["برداشت از حرف را از انتخاب نهایی جدا و قابل اصلاح نگه دارید.", "برداشت از حرف را از انتخاب نهایی جدا و قابل اصلاح نگه دارید."],
      cycle: "به عنوان یک احتمال، برداشت از حرف می‌تواند به تصمیم و تصمیم به واکنش تازه منجر شود؛ ترتیب واقعی را در تجربهٔ خود بررسی کنید.",
      situation: situation + "، یک پیشنهاد حل‌نشده را دنبال کنید.",
      strength: "بهتر است بتوان بدون پذیرفتن پیشنهاد، معنای آن را فهمید.",
      challenge: "از یک اختلاف نمی‌توان سبک همیشگی هیچ‌کدام را نتیجه گرفت.",
      step: "در یک تصمیم ساده، آنچه شنیدید و آنچه هنوز باید انتخاب شود را جداگانه ثبت کنید.",
      question: "در آخرین تصمیم مشترک، کدام بخش حرف هنوز برایتان نامفهوم بود؟",
      experiment: "یک تصمیم کوچک را ثبت کنید و بعد ببینید نتیجه با برداشت اولیه چه تفاوتی داشت.",
      next: ["یک برداشت و یک انتخاب هنوز باز را مشخص کنید.", "یک برداشت و یک انتخاب هنوز باز را مشخص کنید."],
    };
    if (index === 1) return {
      title: "از رسیدگی تا میل به همراهی",
      opening: "حمایت و لذت از همراهی دو تجربهٔ متفاوت‌اند و خوب است روشن شود در چه موقعیتی هرکدام برای شما اهمیت دارد",
      lead: link, roles: ["تفاوت کمک و وقت خوش را در تجربهٔ خود پیدا کنید و نوع همراهی مناسب را بگویید.", "تفاوت کمک و وقت خوش را در تجربهٔ خود پیدا کنید و نوع همراهی مناسب را بگویید."],
      cycle: "ممکن است رسیدگی فرصت همراهی ایجاد کند یا به وظیفه بدل شود؛ این تفاوت را در تجربه بسنجید.",
      situation: "بعد از یک روز پرکار، میان دو راه متفاوت برای همراهی انتخاب کنید.",
      strength: "همراهی داوطلبانه با انجام وظیفه فرق دارد.",
      challenge: "کمک یا لذت مشترک به تنهایی نشانهٔ احساس یکسان نیست.",
      step: "برای یک دیدار، یک امکان برای همراهی و یک امکان برای خلوت در نظر بگیرید.",
      question: "چه وقت همراهی دیگری به جای آسودگی برایتان به وظیفه بدل می‌شود؟",
      experiment: "پس از دیدار، تجربهٔ کمک و لذت را جداگانه توصیف کنید.",
      next: ["نوع همراهی مناسب و امکان خلوت را مشخص کنید.", "نوع همراهی مناسب و امکان خلوت را مشخص کنید."],
    };
    return {
      title: "ترجیح مشترک، توافق جداگانه",
      opening: "پایدار بودن یک توافق را باید جدا از تجربهٔ خوشایند با هم بررسی کرد، به‌خصوص هر جا شاهد کافی برای انتظار شخصی از تعهد نداریم",
      lead: link, roles: ["ترجیح خود را بدون وعدهٔ ناخواسته بیان کنید و پیش از اتکا به ترجیح دیگری، دربارهٔ توافق سؤال کنید.", "ترجیح خود را بدون وعدهٔ ناخواسته بیان کنید و پیش از اتکا به ترجیح دیگری، دربارهٔ توافق سؤال کنید."],
      cycle: "یک انتخاب خوشایند می‌تواند به انتظار تکرار شدن تبدیل شود؛ این انتظار هنوز به معنی توافق نیست.",
      situation: situation + "، پیشنهاد تکرار یک کار خوشایند را بررسی کنید.",
      strength: "موافقت با یک تجربه لازم نیست موافقت با تکرار همیشگی آن باشد.",
      challenge: "نمی‌توان از پسند مشترک دربارهٔ تعهد قطعی نتیجه گرفت.",
      step: "یک ترجیح را از یک تصمیم قابل اتکا جدا کنید.",
      question: "کدام تجربه را دوست دارید بی‌آنکه لازم باشد به برنامه‌ای ثابت تبدیل شود؟",
      experiment: "یک پیشنهاد را بدون تعهد به تکرار آن امتحان کنید.",
      next: ["پیشنهاد را از توافق قابل اتکا جدا کنید.", "پیشنهاد را از توافق قابل اتکا جدا کنید."],
    };
  };

  const draft = groups.map((_, index) => genericDraft(index));
  let side = match(comm, "mercury", "sun", "opposition");
  if (side && match(friction, "mars", "asc", "square") === side) {
    const x = names[side], y = names[opposite(side)];
    draft[0] = {
      title: "وقتی بررسی به گرفتن اختیار بدل می‌شود",
      opening: x + " و " + y + " ممکن است دربارهٔ یک انتخاب به اندازهٔ کافی حرف زده باشند اما هنوز بر سر اینکه تصمیم نهایی با چه کسی است به توافق نرسیده باشند",
      lead: "مرز این دو فصل در لحظه‌ای پیدا می‌شود که بررسی یک پیشنهاد تمام شده اما هنوز معلوم نیست چه کسی اجازهٔ تغییر آن را دارد؛ پس ادامهٔ استدلال ممکن است دیگر به فهم موضوع کمکی نکند.",
      roles: ordered(side, "ممکن است پس از پیدا کردن راه بهتر بخواهد آن را اجرا کند.", "می‌تواند مخالفت با تغییر را حتی پس از شنیدن دلیل بیان کند."),
      cycle: "پیشنهاد بررسی می‌شود؛ راه بهتر پیدا می‌شود؛ اجرای بی‌اجازه آن را به اختلاف دربارهٔ اختیار تبدیل می‌کند.",
      situation: situation + "، یکی تغییر مسیر رفت‌وآمد را پیشنهاد می‌کند و دیگری از قبل برنامهٔ خودش را چیده است.",
      strength: "بهترین استدلال می‌تواند بدون گرفتن حق انتخاب دیگری مفید بماند.",
      challenge: "پاسخ مثبت به شنیدن دلیل، رضایت به اجرای تصمیم نیست.",
      step: "بعد از بررسی مسیرها مشخص کنید کدام تصمیم فقط به یک نفر مربوط است و کدام تصمیم نیاز به توافق دارد.",
      question: "کدام تصمیم مشترک اخیر از نظر یکی از شما هنوز فقط یک پیشنهاد بود؟",
      experiment: "در سه تصمیم کوچک این هفته، قبل از عمل بنویسید انتخاب با چه کسی است و در پایان ببینید کدام تصمیم بدون بحث اضافه پیش رفت.",
      next: ordered(side, "پیشنهاد پذیرفته‌نشده را به عمل تبدیل نکند.", "نه گفتن به اجرا را از رد کردن همهٔ دلایل جدا کند."),
    };
  }
  side = match(comm, "moon", "mercury", "sextile");
  if (side && match(friction, "pluto", "mars", "square") === side) {
    const x = names[side], y = names[opposite(side)];
    draft[0] = {
      title: "وقتی فهمیدن برای انتخاب کافی نیست",
      opening: y + " ممکن است منظور " + x + " را به‌خوبی فهمیده باشد و با وجود این بر سر راه انجام کار با او اختلاف داشته باشد؛ فهم متقابل لزوماً توافق عملی نیست",
      lead: "در این پیوند مهارت پیدا کردن معنای حرف می‌تواند به تصمیم مشترک کمک کند، اما اگر به ابزار ثابت کردن اینکه کدام نظر درست است بدل شود، همان مزیت در نقطهٔ اختلاف کارایی‌اش را از دست می‌دهد.",
      roles: ordered(side, "می‌تواند تجربهٔ خودش را روشن کند بی‌آنکه آن را دلیل نهایی برای انتخاب هر دو بداند.", "می‌تواند برداشت دقیقی داشته باشد و همچنان گزینه‌ای متفاوت پیشنهاد کند."),
      cycle: "فهم مشترک شکل می‌گیرد؛ یکی انتظار موافقت پیدا می‌کند؛ گزینهٔ متفاوت به رقابت تعبیر می‌شود و دانستن منظور هم مسئله را حل نمی‌کند.",
      situation: situation + "، هر دو دربارهٔ مشکل اصلی هم‌نظرند اما برای رفع آن دو راه دارند.",
      strength: "توافق بر سر مسئله می‌تواند محفوظ بماند حتی اگر راه حل هر نفر متفاوت باشد.",
      challenge: "فهمیدن نظر یک نفر نباید برای دیگری بدهیِ موافقت ایجاد کند.",
      step: "پیش از مقایسهٔ دو راه، یک جمله بنویسید که هر دو دربارهٔ خود مسئله قبول دارید.",
      question: "آخرین بار که منظور هم را فهمیدید اما بر سر راه حل موافق نبودید چه شد؟",
      experiment: "این هفته یک اختلاف نظر را انتخاب کنید و معیار موفقیت را نه انتخاب راه یک نفر، بلکه حفظ توافق دربارهٔ خود مسئله پس از تصمیم نهایی قرار دهید.",
      next: ordered(side, "هنگام انتخاب، دلیل مشترک را از ترجیح خودش جدا نگه دارد.", "مخالفت با یک راه را بدون زیر سؤال بردن فهم مشترک بیان کند."),
    };
  }
  side = match(comm, "mars", "mercury", "trine");
  if (side && match(friction, "mercury", "mars", "opposition") === side) {
    const x = names[side], y = names[opposite(side)];
    draft[0] = {
      title: "وقتی نقش پیشنهاددهنده و مجری عوض می‌شود",
      opening: x + " و " + y + " در بعضی موقعیت‌ها از فکر به عمل می‌رسند اما در موقعیتی که نقش آغازگر و پاسخ‌دهنده عوض شود همان سرعت ممکن است نتیجهٔ دیگری داشته باشد",
      lead: "هماهنگی هنگام امتحان کردن یک ایده لزوماً هنگام رد یا اصلاح آن برقرار نمی‌ماند؛ فرق این دو موقعیت در این است که آیا هر دو هنوز امکان متوقف کردن تجربه را دارند.",
      roles: ordered(side, "در یک موقعیت مجری و در موقعیت دیگر توضیح‌دهنده است.", "در یک موقعیت جهت آزمون را تعیین می‌کند و در موقعیت دیگر ممکن است بخواهد آن را سریع تمام کند."),
      cycle: "ایده به آزمون تبدیل می‌شود؛ نتیجه نیاز به توضیح تازه دارد؛ اگر توقف آزمون ممکن نباشد گفت‌وگو به کشمکش بر سر پایان آن تبدیل می‌شود.",
      situation: situation + "، روشی تازه برای انجام یک کار امتحان می‌کنید اما نتیجهٔ نخست مطلوب نیست.",
      strength: "تغییر نقش‌ها می‌تواند فرصتی برای دیدن هر دو سوی تصمیم باشد.",
      challenge: "شروع کردن با توافق، به معنای ادامه دادن با توافق نیست.",
      step: "پیش از آغاز یک آزمون مشخص کنید هر دو چگونه می‌توانند درخواست توقف یا بازبینی آن را مطرح کنند.",
      question: "کدام تجربه را شروع کردید اما هنگام تغییر نتیجه دربارهٔ ادامهٔ آن حرف نزدید؟",
      experiment: "یک آزمون کوتاه با زمان بازبینی مشخص انجام دهید؛ نتیجه را با همان معیار اولیه بسنجید و جداگانه بررسی کنید آیا هر دو امکان توقف داشتید.",
      next: ordered(side, "پایان آزمون را فرصت بازبینی بداند، نه شکست پیشنهاد.", "زمان بازبینی را بدون پایان دادن یک‌طرفه به گفت‌وگو رعایت کند."),
    };
  }
  side = match(security, "moon", "saturn", "opposition");
  if (side && match(attraction, "uranus", "venus", "sextile") === side) {
    const x = names[side], y = names[opposite(side)];
    draft[1] = {
      title: "تازگی وقتی بار تازه ایجاد نکند",
      opening: "از کنار هم گذاشتن بخش مراقبت و بخش کشش می‌توان پرسید چه زمانی ابتکار " + x + " برای " + y + " فرصتی خوشایند است و چه زمانی به کاری دیگر برای مدیریت کردن بدل می‌شود",
      lead: "ایدهٔ تازه ممکن است همان چیزی باشد که توجه را جلب می‌کند، اما اگر آماده‌سازی آن به نفر دیگر واگذار شود، هزینهٔ این لذت با خود تجربه یکسان تقسیم نمی‌شود.",
      roles: ordered(side, "با ابتکار خود فرصت تجربه‌ای تازه فراهم می‌کند.", "می‌تواند لذت پیشنهاد را جدا از بار آماده‌سازی آن بسنجد."),
      cycle: "پیشنهاد جذاب است؛ آماده‌سازی آن هزینه پیدا می‌کند؛ اگر هزینه دیده نشود، استقبال کمتر می‌شود و ممکن است پیشنهاددهنده علت را اشتباه بفهمد.",
      situation: situation + "، یک گزینهٔ تازه نیاز به رزرو یا تهیهٔ وسایل دارد.",
      strength: "ابتکار همراه با پذیرفتن بخشی از زحمت آن می‌تواند فضای بیشتری برای لذت ایجاد کند.",
      challenge: "علاقه به ایده به معنی پذیرفتن تمام مقدمات آن نیست.",
      step: "پیش از انتخاب گزینهٔ تازه، هزینهٔ زمانی و کار لازم برای آن را مشخص کنید.",
      question: "کدام پیشنهاد خوشایند برای یکی از شما کار بیشتری ایجاد کرد؟",
      experiment: "یک فعالیت تازه را با تقسیم مقدمات آن امتحان کنید.",
      next: ordered(side, "سهمی از مقدمات ایدهٔ خودش را بپذیرد.", "پیش از موافقت، بار واقعی آن را بیان کند."),
    };
  }
  side = match(security, "pluto", "moon", "conjunction");
  if (side && match(attraction, "sun", "venus", "trine") === side) {
    const x = names[side], y = names[opposite(side)];
    draft[1] = {
      title: "همراهی بدون مسئولیتِ تغییر حال",
      opening: "کنار توجه " + x + " به حال " + y + "، در این خوانش برای لذت بردن از حضور و علایق شخصی نیز جا هست و لازم نیست همهٔ زمان مشترک صرف بهتر کردن حال یک نفر شود",
      lead: "وقتی یکی از دو نفر روز دشواری دارد، ممکن است دیگری سرگرمی مورد علاقه‌اش را هم کنار بگذارد تا کاملاً در دسترس باشد؛ تکرار این وضعیت می‌تواند حمایت را به تنها شکل با هم بودن تبدیل کند.",
      roles: ordered(side, "می‌تواند مراقب حال دیگری باشد و همچنان بخشی از زندگی خودش را ادامه دهد.", "می‌تواند همراهی دریافت کند بی‌آنکه مسئول کنار گذاشتن علایق دیگری باشد."),
      cycle: "یک روز دشوار به مراقبت می‌انجامد؛ همهٔ برنامه‌ها کنار می‌روند؛ تکرار این وضعیت فرصت تجربه‌های مستقل و خوشایند را کم می‌کند.",
      situation: "در روزی که یکی از شما حوصلهٔ برنامهٔ قبلی را ندارد، دیگری هنوز علاقه‌مند به انجام بخشی از آن است.",
      strength: "حمایت و حفظ علاقهٔ شخصی می‌توانند در یک روز کنار هم وجود داشته باشند.",
      challenge: "رد کردن یک فعالیت از سوی یک نفر لزوماً درخواست لغو آن برای هر دو نیست.",
      step: "یک بخش از برنامه را که انجام مستقلش مشکلی ایجاد نمی‌کند مشخص کنید.",
      question: "کدام علاقهٔ شخصی را می‌توانید حفظ کنید حتی وقتی دیگری روز دشواری دارد؟",
      experiment: "در یک روز دشوار یک زمان کوتاه برای حمایت و یک زمان مستقل در نظر بگیرید.",
      next: ordered(side, "در کنار همراهی، یک علاقهٔ مستقل را حفظ کند.", "بدون احساس بدهکاری، همراهی لازم را مشخص کند."),
    };
  }
  side = match(security, "moon", "venus", "conjunction");
  if (side && match(attraction, "venus", "venus", "trine")) {
    const x = names[side], y = names[opposite(side)];
    draft[1] = {
      title: "خوشایند بودن همیشه به معنای رسیدگی نیست",
      opening: "هم‌خوانی سلیقه و توجه روزمره در تجربهٔ " + x + " و " + y + " ممکن است کنار هم قرار بگیرند، اما آنچه برای هر دو خوشایند است الزاماً همان چیزی نیست که یکی امروز برای احساس حمایت لازم دارد",
      lead: "ممکن است یک برنامه برای هر دو لذت‌بخش باشد و در همان روز یکی ترجیح بدهد مدتی تنها بماند؛ انتخاب متفاوت در چنین لحظه‌ای به خودی خود نشانهٔ کم شدن علاقه به همراهی نیست.",
      roles: ordered(side, "می‌تواند بین چیزی که معمولاً دوست دارد و نیاز امروز خود تفاوت بگذارد.", "می‌تواند پیشنهاد آشنای خوشایند را با توجه به وضعیت امروز تغییر دهد."),
      cycle: "سلیقهٔ مشترک انتخاب را آسان می‌کند؛ انتخاب آشنا تکرار می‌شود؛ نیاز متفاوت امروز کمتر دیده می‌شود مگر اینکه هر دو امکان تغییر آن را داشته باشند.",
      situation: "برنامه‌ای که معمولاً هر دو دوست دارید در روزی پیشنهاد می‌شود که یکی خسته است.",
      strength: "تغییر یک برنامه می‌تواند با همان علاقه به تجربهٔ مشترک سازگار باشد.",
      challenge: "خوش آمدن از یک فعالیت در گذشته به معنای آماده بودن برای آن در هر زمان نیست.",
      step: "پیش از تکرار برنامهٔ آشنا، یک گزینهٔ کم‌زحمت‌تر هم در نظر بگیرید.",
      question: "چه تجربه‌ای را هر دو دوست دارید ولی گاهی لازم است شکل سبک‌تری از آن را انتخاب کنید؟",
      experiment: "یک برنامهٔ آشنا را با گزینهٔ ساده‌تر آن مقایسه کنید.",
      next: ordered(side, "نیاز امروز را جدا از سلیقهٔ همیشگی بیان کند.", "تغییر برنامه را نشانهٔ رد شدن خودش نداند."),
    };
  }
  side = match(attraction, "uranus", "venus", "sextile");
  if (side && match(boundary, "venus", "saturn", "conjunction") === side) {
    const x = names[side], y = names[opposite(side)];
    draft[2] = {
      title: "غافلگیری با جای امنی برای تغییر",
      opening: "در انتخاب‌های خوشایند " + x + " و " + y + " هم امکان تجربهٔ تازه اهمیت دارد و هم اینکه برنامهٔ مشترک تا چه زمانی قابل تغییر است",
      lead: "برای حفظ تازگی لازم نیست همهٔ اجزای برنامه تا آخر نامعلوم بمانند؛ می‌توان بخش‌هایی را از قبل قابل اتکا کرد و بخش دیگری را آزاد گذاشت.",
      roles: ordered(side, "امکان تازه را در بخشی از برنامه که هنوز باز است پیدا کند.", "بخش‌هایی را که برای برنامه‌ریزی به ثبات نیاز دارند مشخص کند."),
      cycle: "برنامه قطعی می‌شود؛ امکان تازه‌ای پیدا می‌شود؛ اگر هیچ جای تغییر نمانده باشد انتخاب بین لذت و اتکا سخت می‌شود.",
      situation: situation + "، زمان و مقصد اصلی ثابت می‌مانند ولی فعالیت میان راه باز است.",
      strength: "توافق می‌تواند برای نوآوری جا باز کند، نه اینکه همهٔ انتخاب‌ها را از قبل ببندد.",
      challenge: "تغییر بخشی که دیگری بر آن حساب کرده با تغییر بخش باز تفاوت دارد.",
      step: "در برنامهٔ بعدی فقط یک بخش باز و یک بخش قطعی تعریف کنید.",
      question: "در یک برنامهٔ مشترک کدام بخش باید ثابت باشد تا بتوانید از تغییر بخش دیگر لذت ببرید؟",
      experiment: "یک برنامه با بخش ثابت و باز بسازید و ببینید چه تغییری بدون هزینه برای دیگری ممکن شد.",
      next: ordered(side, "تازگی را در بخش آزاد جست‌وجو کند.", "مرز بخش ثابت را از پیش روشن کند."),
    };
  }
  side = match(attraction, "sun", "venus", "trine");
  if (side && match(boundary, "saturn", "dsc", "conjunction") === side) {
    draft[2] = {
      title: "تحسین کسی، سپردن کار به او نیست",
      opening: "در این پیوند می‌توان پسندیدن شیوهٔ حضور دیگری را از اعتماد به انجام یک مسئولیت جدا کرد؛ اولی ممکن است آسان‌تر شکل بگیرد اما دومی به تجربهٔ رفتار مشخص نیاز دارد",
      lead: "اگر کسی در کاری توانمند به نظر برسد، ممکن است انجام کار مشابه در آینده هم بی‌آنکه درباره‌اش حرف زده باشید از او انتظار برود؛ تحسین در این نقطه می‌تواند ناخواسته به بار دائمی تبدیل شود.",
      roles: ordered(side, "می‌تواند توانایی خود را نشان دهد بی‌آنکه هر بار عهده‌دار همان کار شود.", "می‌تواند توانایی را تحسین کند و برای مسئولیت بعدی توافق تازه بخواهد."),
      cycle: "توانایی دیده می‌شود؛ کار به همان نفر واگذار می‌شود؛ تکرار واگذاری به نقش ثابت تبدیل می‌شود مگر اینکه قابل بازبینی بماند.",
      situation: situation + "، یکی کاری را بهتر انجام می‌دهد ولی همیشه برای آن وقت ندارد.",
      strength: "تقسیم کار می‌تواند از توانایی استفاده کند بدون اینکه اختیار تغییر نقش را بگیرد.",
      challenge: "مهارت یک نفر دلیل کافی برای وظیفهٔ همیشگی او نیست.",
      step: "یک کار را که معمولاً به یک نفر سپرده می‌شود برای نوبت بعد از نو تقسیم کنید.",
      question: "کدام توانایی تحسین‌شده به مرور به وظیفهٔ ثابت یکی از شما تبدیل شده است؟",
      experiment: "یک نوبت تقسیم متفاوت را امتحان کنید و کیفیت نتیجه و بار زمانی را جداگانه بسنجید.",
      next: ordered(side, "ظرفیت واقعی خود را برای نوبت بعد بیان کند.", "مسئولیت را فقط پس از توافق دوباره واگذار کند."),
    };
  }

  if (match(attraction, "venus", "venus", "trine") &&
      plan.chapterPlans.find(item => item.chapter === "boundaries-commitment")?.status === "limited") {
    const sharedRole = "می‌تواند از تکرار یک تجربه لذت ببرد و دربارهٔ نظم آیندهٔ آن جداگانه تصمیم بگیرد.";
    const sharedNext = "درخواست تکرار را بدون فرض پذیرش همیشگی مطرح کند.";
    draft[2] = {
      title: "عادت خوشایند، قرار همیشگی نیست",
      opening: "هم‌خوانی سلیقه در این دو چارت زمینهٔ بررسی تجربه‌های مشترک را فراهم می‌کند، اما شاهد فصل مرز و تعهد برای تعیین انتظار شخصی هیچ‌کدام از یک توافق پایدار کافی نیست",
      lead: "یک تجربهٔ لذت‌بخش ممکن است چند بار تکرار شود و کم‌کم بخشی از روال زندگی شود؛ این چرخه صرفاً یک پرسش عملی بر پایهٔ هم‌خوانی سلیقه است، نه پیش‌بینی رفتار شما در تعهد.",
      roles: [sharedRole, sharedRole],
      cycle: "تجربه‌ای خوشایند تکرار می‌شود؛ زمان دیگری به طور ضمنی برای آن کنار گذاشته می‌شود؛ در نخستین نوبت تغییر برنامه روشن می‌شود آیا تکرار یک انتخاب بوده یا یک انتظار ناگفته.",
      situation: "پس از چند بار انجام یک فعالیت مشترک، یکی از شما برای نوبت بعد برنامه‌ای مستقل دارد.",
      strength: "می‌توان لذت تجربه‌های گذشته را حفظ کرد بی‌آنکه برای آینده همان نظم را الزامی دانست.",
      challenge: "دادهٔ موجود نمی‌گوید کدام نفر از تغییر یک عادت ناراحت خواهد شد یا چه کسی بیشتر به تداوم آن نیاز دارد.",
      step: "دربارهٔ یک عادت خوشایند، جدا از میزان علاقه، مشخص کنید نوبت بعد آزاد است یا از قبل زمانش را کنار می‌گذارید.",
      question: "کدام عادت مشترک را دوست دارید ادامه دهید، اما ترجیح می‌دهید برای هر نوبت جداگانه تصمیم بگیرید؟",
      experiment: "یک تجربهٔ مشترک را برای نوبت بعد بدون رزرو ضمنی زمان دیگری پیشنهاد کنید.",
      next: [sharedNext, sharedNext],
    };
  }

  const patterns: ComparisonPrimaryPattern[] = draft.map((item, index) => {
    const group = groups[index];
    const contacts = group.contacts.filter((contact): contact is SynastryInterChartAspect => !!contact);
    const evidence = uniqueEvidence(group.ids.flatMap(id => witness(id)
      ? (chapters.find(chapter => chapter.id === id)?.block.evidence ?? []).slice(0, 1) : []));
    return {
      id: "pair-cycle-" + group.key, kind: index === 0 ? "tension" : "supportive",
      title: item.title, titleFa: item.title, summaryFa: item.lead,
      humanExperience: item.lead, personA: item.roles[0], personB: item.roles[1],
      cycle: item.cycle, dailySituation: item.situation, strength: item.strength,
      challenge: item.challenge, practicalStep: item.step, feelingOrReaction: item.challenge,
      effect: item.strength, evidence, contactIds: contacts.map(contact => contact.id),
      relevanceScore: contacts.length ? Math.max(...contacts.map(contact => contact.relevanceScore)) : 0,
    };
  });
  const opening: [string, string] = [
    draft[0].opening + ". " + draft[1].opening + ". " +
      "در " + contextName + "، پرسش مهم فقط این نیست که چه چیزی شما را به هم نزدیک می‌کند، بلکه این است که در گذر از یک موقعیت به موقعیت دیگر کدام امکان باقی می‌ماند و کدام نیاز به انتخاب دوباره دارد.",
    draft[2].opening + ". " +
      "در فصل‌های پیش رو هر موضوع جداگانه با شاهد خودش بررسی می‌شود و سه چرخه به شما کمک می‌کنند ارتباط میان آن موضوع‌ها را در زندگی روزمره پیدا کنید، بدون اینکه از یک تماس دربارهٔ سرنوشت پیوند نتیجه بگیریم. " +
      "این تصویر را با تجربه‌های واقعی خود مقایسه کنید؛ اگر بخشی با تجربهٔ شما نمی‌خواند، قرار نیست برای درست جلوه دادن خوانش خودتان را تغییر دهید یا از روی یک نشانه دربارهٔ دیگری قضاوت کنید.",
  ];
  const cite = (indexes: number[]) => {
    const ids = [...new Set(indexes.flatMap(index => patterns[index].contactIds.map(id => "contact:" + id)))];
    return ids.length ? ids : ["report:pair-context"];
  };
  const openingEvidence = [
    { sentenceId: "opening-p1-s1", paragraph: 1 as const, evidenceIds: cite([0]) },
    { sentenceId: "opening-p1-s2", paragraph: 1 as const, evidenceIds: cite([1]) },
    { sentenceId: "opening-p1-s3", paragraph: 1 as const, evidenceIds: cite([0, 1]) },
    { sentenceId: "opening-p2-s1", paragraph: 2 as const, evidenceIds: cite([2]) },
    { sentenceId: "opening-p2-s2", paragraph: 2 as const, evidenceIds: cite([0, 1, 2]) },
    { sentenceId: "opening-p2-s3", paragraph: 2 as const, evidenceIds: ["report:pair-context"] },
  ];
  const questions: [string, string, string] = [draft[0].question, draft[1].question, draft[2].question];
  const growth = {
    personASkill: draft[0].next[0],
    personBSkill: draft[0].next[1],
    cycleToNotice: draft[0].cycle,
    practicalStep: draft[0].experiment,
    evidence: uniqueEvidence(patterns.flatMap(pattern => pattern.evidence)),
  };
  return { patterns, opening, openingEvidence, questions, growth };
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
