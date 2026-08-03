import {
  buildRealSynastry,
  createSynastryNatalSnapshot,
} from "@/lib/astrology/synastry/real-synastry-engine";
import type { AstrologyReport } from "@/types/astro";
import type {
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
  if (!input.secondPersonConsentConfirmed) {
    return {
      ok: false,
      code: "consent-required",
      message: "برای استفاده از اطلاعات تولد نفر دوم، تأیید رضایت لازم است.",
      issues: ["رضایت استفاده خصوصی از اطلاعات نفر دوم تأیید نشده است."],
    };
  }

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
      secondPersonConsentConfirmedAt: generatedAt,
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
    secondPersonConsentConfirmed: true,
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
  const hasAngles = Boolean(
    report.realEngine?.angles && Object.keys(report.realEngine.angles).length > 0,
  );
  const hasTwelveHouses = report.realEngine?.houses?.length === 12;

  if (!hasAngles || !hasTwelveHouses) return "unknown";
  if (report.input.birthTime.trim() === "12:00") return "unknown";

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
  const supportContact = findContact(
    report,
    (contact) => contact.polarity === "supportive",
  );
  const tensionContact = findContact(
    report,
    (contact) =>
      contact.polarity === "tension" || contact.polarity === "intense",
  );
  const communicationContact = findContact(
    report,
    (contact) => contact.categories.includes("communication"),
  );
  const emotionalContact = findContact(report, isEmotionalContact);
  const closenessContact = findContact(
    report,
    (contact) =>
      contact.categories.includes("closeness") ||
      contact.categories.includes("independence"),
  );
  const boundaryContact = findContact(
    report,
    (contact) =>
      contact.categories.includes("independence") ||
      BOUNDARY_POINT_IDS.has(contact.pointA.id) ||
      BOUNDARY_POINT_IDS.has(contact.pointB.id),
  );
  const repairContact = tensionContact ?? boundaryContact;
  const primaryPatterns = selectPrimaryPatterns(report, labels);
  const support = buildDirectionalBlock(
    "support",
    supportContact,
    labels,
    report.synthesis.supportiveFa,
  );
  const misunderstanding = buildDirectionalBlock(
    "misunderstanding",
    tensionContact,
    labels,
    report.synthesis.tensionFa,
  );
  const communication = buildDirectionalBlock(
    "communication",
    communicationContact,
    labels,
    report.dynamics.communicationFa,
  );
  const emotionalSecurity = buildDirectionalBlock(
    "emotional-security",
    emotionalContact,
    labels,
    "امنیت عاطفی زمانی بیشتر می‌شود که سرعت پاسخ‌دادن، نیاز به مکث و شیوه درخواست حمایت به زبان روشن گفته شوند.",
  );
  const closenessIndependence = buildDirectionalBlock(
    "closeness-independence",
    closenessContact,
    labels,
    report.dynamics.closenessIndependenceFa,
  );
  const boundariesCommitment = buildDirectionalBlock(
    "boundaries-commitment",
    boundaryContact,
    labels,
    "تعهد وقتی قابل اعتمادتر می‌شود که مرز، مسئولیت و حق خلوت هر دو نفر از قبل روشن باشد.",
  );
  const frictionRepair = buildDirectionalBlock(
    "friction-repair",
    repairContact,
    labels,
    report.synthesis.tensionFa,
  );
  const growthEvidence = uniqueEvidence([
    ...primaryPatterns.flatMap((pattern) => pattern.evidence),
    ...frictionRepair.evidence,
  ]).slice(0, 6);
  const readingLimitFa = buildReadingLimit(
    context.chartABirthTimeStatus,
    context.chartBBirthTimeStatus,
  );

  return {
    overviewFa: humanizeComparisonText(
      `${report.synthesis.openingFa} ${report.synthesis.wholePairFa}`,
    ),
    primaryPatterns,
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

function findContact(
  report: RealSynastryReport,
  predicate: (contact: SynastryInterChartAspect) => boolean,
): SynastryInterChartAspect | null {
  return report.contacts.find(predicate) ?? null;
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
