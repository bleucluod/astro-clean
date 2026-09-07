// HALLEUS_COMPARE_FULL_INTERPRETATION_SLICE2_R5
import type {
  ComparisonCalculationExplanation,
  ComparisonContactInterpretation,
  ComparisonDeepLayer,
  ComparisonDeepLayerItem,
  ComparisonFullInterpretation,
  ComparisonInterpretationCoverageEntry,
  ComparisonNatalContext,
  ComparisonOpeningEvidence,
  ComparisonOverlayInterpretation,
} from "@/types/comparison-product";
import {
  REAL_ENGINE_SYNASTRY_COVERAGE_FIELDS,
} from "@/types/synastry-engine";
import type {
  RealEngineSynastryCoverageField,
  RealSynastryReport,
  SynastryBirthTimeStatus,
  SynastryHouseOverlay,
  SynastryInterChartAspect,
  SynastryNatalPoint,
  SynastryNatalSnapshot,
  SynastryRelationshipContext,
} from "@/types/synastry-engine";

const SIGN_LABELS_FA: Record<string, string> = {
  aries: "حمل",
  taurus: "ثور",
  gemini: "جوزا",
  cancer: "سرطان",
  leo: "اسد",
  virgo: "سنبله",
  libra: "میزان",
  scorpio: "عقرب",
  sagittarius: "قوس",
  capricorn: "جدی",
  aquarius: "دلو",
  pisces: "حوت",
};

const CONTEXT_LABELS_FA: Record<SynastryRelationshipContext, string> = {
  romantic: "رابطهٔ عاطفی",
  friendship: "دوستی",
  family: "رابطهٔ خانوادگی",
  work: "همکاری",
  general: "رابطه",
};

// Advanced point cross-chart policy remains deferred-no-approved-orb-policy until an approved orb contract exists.
const TECHNICAL_COVERAGE_FIELDS = new Set<RealEngineSynastryCoverageField>([
  "version",
  "generatedAt",
  "behavioralAudienceMode",
  "cityLabel",
  "utcIso",
  "ascendantLongitude",
  "houseContext",
  "calculationQuality",
  "note",
]);

const HOUSE_THEME_FA: Record<number, string> = {
  1: "حضور، تصویر شخصی و نحوه دیده‌شدن",
  2: "ارزش‌ها، امنیت و منابع شخصی",
  3: "گفت‌وگو، یادگیری و رفت‌وآمد روزمره",
  4: "خانه، ریشه و امنیت عاطفی",
  5: "لذت، خلاقیت و ابراز محبت",
  6: "عادت‌ها، کارهای روزمره و مسئولیت عملی",
  7: "شراکت، مذاکره و تعریف رابطه",
  8: "اعتماد، مرز، قدرت و منابع مشترک",
  9: "جهان‌بینی، یادگیری، سفر و معنا",
  10: "هدف، نقش اجتماعی و جهت بلندمدت",
  11: "دوستی، شبکه، آرمان و کار جمعی",
  12: "خلوت، لایه‌های پنهان و حساسیت‌های ناگفته",
};

const POINT_MEANING_FA: Record<string, string> = {
  "north-node": "گرهٔ شمالی جهت رشدی را نشان می‌دهد که فرد برای توسعهٔ تجربه‌های تازه بیشتر به سوی آن کشیده می‌شود.",
  "south-node": "گرهٔ جنوبی الگوهای آشنا و مهارت‌هایی را نشان می‌دهد که راحت‌تر فعال می‌شوند اما گاهی می‌توانند تکراری شوند.",
  "black-moon-lilith": "لیلیت به لایه‌های خام‌ترِ مرز، کشش، استقلال و بخش‌هایی اشاره می‌کند که فرد همیشه مایل نیست آن‌ها را نرم یا قابل‌قبول نشان دهد.",
  chiron: "کایرون نقطه‌ای از حساسیت و یادگیری را برجسته می‌کند که می‌تواند هم زخم‌پذیری و هم ظرفیت همدلی را فعال کند.",
  "part-of-fortune": "سهم سعادت به ناحیه‌ای اشاره می‌کند که هماهنگی میان شرایط، بدن و انتخاب‌های عملی می‌تواند احساس روانی بیشتری ایجاد کند.",
  vertex: "ورتکس یک نقطهٔ وابسته به زمان تولد است که در خوانش رابطه به تجربه‌های برخورد، جهت‌گیری و رویدادهای معنادار زمینه می‌دهد.",
  ceres: "سرس با شیوهٔ مراقبت، تغذیهٔ روانی و الگوی رسیدگی‌کردن پیوند دارد.",
  pallas: "پالاس با الگوی تشخیص، حل مسئله و دیدن ساختارها ارتباط دارد.",
  juno: "جونو به انتظارات فرد از شراکت، وفاداری، برابری و قرارداد رابطه زمینه می‌دهد.",
  vesta: "وستا تمرکز، وقف‌کردن انرژی و نیاز به یک حریم شخصی یا موضوع محوری را برجسته می‌کند.",
  eris: "اریس می‌تواند نقطهٔ حساسیت به نادیده‌گرفته‌شدن، رقابت یا به‌هم‌خوردن نظم تثبیت‌شده را پررنگ کند.",
  pholus: "فولوس در این خوانش به نقاطی اشاره می‌کند که یک محرک کوچک می‌تواند زنجیره‌ای بزرگ‌تر از واکنش‌ها را فعال کند.",
  nessus: "نسوس در لایهٔ پیشرفته با موضوع مرز، بازتولید الگو و مسئولیت در برابر چرخه‌های تکرارشونده خوانده می‌شود.",
};

const LOT_MEANING_FA: Record<string, string> = {
  fortune: "سهم بخت به شرایط مادی، بدنی و موقعیت‌هایی مربوط است که امور در آن‌ها روان‌تر پیش می‌روند.",
  spirit: "سهم روح به جهت ارادی، تصمیم و چیزی مربوط است که فرد فعالانه دنبال می‌کند.",
  eros: "سهم اروس میل، کشش و نیروی پیگیری خواسته را در یک لایهٔ سنتی توصیف می‌کند.",
  necessity: "سهم ضرورت به الزام‌ها، فشارهای اجتناب‌ناپذیر و چیزی مربوط است که باید با آن روبه‌رو شد.",
  courage: "سهم جسارت زمینهٔ اقدام، خطرپذیری و ایستادگی را برجسته می‌کند.",
  victory: "سهم پیروزی به تجربهٔ پیشروی، موفقیت و حمایت از هدف مربوط است.",
  nemesis: "سهم نمسیس محدودیت، پیامد و نقطه‌ای را برجسته می‌کند که افراط می‌تواند با بازخورد روبه‌رو شود.",
};

export function buildFullComparisonInterpretation(
  report: RealSynastryReport,
  input: {
    labels: { a: string; b: string };
    chartABirthTimeStatus: SynastryBirthTimeStatus;
    chartBBirthTimeStatus: SynastryBirthTimeStatus;
    fallbackOverviewParagraphsFa?: [string, string];
  },
): ComparisonFullInterpretation {
  const overlays = report.houseOverlays.map((overlay) =>
    buildOverlayInterpretation(report, overlay, input.labels),
  );
  const contacts = report.contacts.map((contact) =>
    buildContactInterpretation(report, contact, overlays, input.labels, {
      a: input.chartABirthTimeStatus,
      b: input.chartBBirthTimeStatus,
    }),
  );
  const deepLayers = buildDeepLayers(report, input.labels);
  const natalContexts: [ComparisonNatalContext, ComparisonNatalContext] = [
    buildNatalContext(report.chartA, "a", input.labels.a),
    buildNatalContext(report.chartB, "b", input.labels.b),
  ];
  const calculation = buildCalculationExplanation(report, input.labels, {
    a: input.chartABirthTimeStatus,
    b: input.chartBBirthTimeStatus,
  });
  const coverage = buildInterpretationCoverage(report, deepLayers, contacts, overlays);
  const fingerprint = buildNarrativeFingerprint(report);
  const opening = buildPairOpening(
    report,
    input.labels,
    fingerprint,
    deepLayers,
    input.fallbackOverviewParagraphsFa,
  );

  return {
    version: "comparison-full-interpretation-v1",
    fingerprint,
    openingParagraphsFa: opening.paragraphs,
    openingEvidence: opening.evidence,
    contacts,
    overlays,
    deepLayers,
    natalContexts,
    coverage,
    calculation,
  };
}

function buildPairOpening(
  report: RealSynastryReport,
  labels: { a: string; b: string },
  fingerprint: string,
  deepLayers: ComparisonDeepLayer[],
  fallbackOverviewParagraphsFa?: [string, string],
): {
  paragraphs: [string, string];
  evidence: ComparisonOpeningEvidence[];
} {
  const supportive = report.contacts.find((contact) => contact.polarity === "supportive") ?? report.contacts[0] ?? null;
  const tension = report.contacts.find(
    (contact) => contact.polarity === "tension" || contact.polarity === "intense",
  ) ?? report.contacts[1] ?? supportive;
  const overlay = report.houseOverlays[0] ?? null;
  const supportTheme = describeContactTheme(supportive);
  const tensionTheme = describeContactTheme(tension);
  const signatureTheme = describeSignatureInteraction(report.chartA, report.chartB);
  const overlayTheme = overlay
    ? HOUSE_THEME_FA[overlay.targetHouse] ?? "بخشی مشخص از زندگی روزمره"
    : "بخش‌های عملی و روزمرهٔ رابطه";
  const deeperTheme = chooseDeeperOpeningTheme(deepLayers);
  const contextLabel = CONTEXT_LABELS_FA[report.relationshipContext];
  const angle = parseInt(fingerprint.slice(-2), 16) % 4;
  const anglePhrase = [
    "داستان اصلی این پیوند از کنار هم قرارگرفتن دو نیاز متفاوت ساخته می‌شود، نه از شبیه‌بودن کامل.",
    "این رابطه بیشتر وقتی خودش را نشان می‌دهد که تفاوت ریتم‌ها مجبور می‌شوید دربارهٔ نیاز واقعی پشت واکنش‌ها حرف بزنید.",
    "در این پیوند، بخش مهم ماجرا این است که همان تفاوتی که گاهی اصطکاک می‌سازد می‌تواند به مکمل‌بودن تبدیل شود.",
    "این دو چارت یک داستان یک‌خطی ندارند؛ چند نیروی هم‌زمان باعث می‌شوند رابطه هم ظرفیت آرامش داشته باشد و هم نقطه‌های حساس خودش را.",
  ][angle];

  const paragraph1 = `${anglePhrase} میان ${labels.a} و ${labels.b}، ${supportTheme} جایی است که همکاری طبیعی‌تر شکل می‌گیرد و هر دو نفر می‌توانند بدون تلاش دائمی برای تغییر دیگری، از تفاوت سبک‌هایشان استفاده کنند. در عین حال ${signatureTheme} باعث می‌شود سرعت تصمیم‌گیری، میزان نیاز به توضیح و شیوهٔ برگشتن به تعادل همیشه یکسان نباشد؛ بنابراین کیفیت این پیوند بیشتر از شباهت، به توانایی خواندن ریتم یکدیگر وابسته است.`;
  const paragraph2 = `بخش حساس‌تر داستان جایی فعال می‌شود که ${tensionTheme} زیر فشار قرار می‌گیرد؛ در آن لحظه هر نفر ممکن است واکنش دیگری را شخصی‌تر از چیزی که هست تعبیر کند و چرخه‌ای بسازد که با توضیح بیشتر، عقب‌نشینی یا دفاع ادامه پیدا کند. ${overlay ? `هم‌زمان، ${overlayTheme} در زندگی ${overlay.targetChartSide === "a" ? labels.a : labels.b} زودتر فعال می‌شود و موضوع رابطه را از سطح احساس به انتخاب‌های واقعی روزمره می‌برد.` : `چون دادهٔ خانه‌ای قابل اتکا برای هر دو سمت کامل نیست، این بخش با احتیاط بیشتری خوانده می‌شود و روایت روی تماس‌های محاسبه‌شده تکیه می‌کند.`} ${deeperTheme} در ${contextLabel} این یعنی رابطه زمانی بالغ‌تر کار می‌کند که هم ظرفیت حمایت دیده شود و هم بخش دشوار ماجرا نام‌گذاری شود؛ نه اینکه یکی از آن‌ها برای حفظ تصویر خوب رابطه حذف شود.`;

  const paragraphs = ensureOpeningWordBudget(
    [paragraph1, paragraph2],
    fallbackOverviewParagraphsFa ?? inputOpeningFallback(report, labels),
  );
  const evidence: ComparisonOpeningEvidence[] = [
    { sentenceId: "opening-p1-s1", paragraph: 1 as const, evidenceIds: openingEvidenceIds(supportive, null, "fingerprint:" + fingerprint) },
    { sentenceId: "opening-p1-s2", paragraph: 1 as const, evidenceIds: openingEvidenceIds(supportive, null, signatureEvidenceId(report)) },
    { sentenceId: "opening-p1-s3", paragraph: 1 as const, evidenceIds: [signatureEvidenceId(report), "fingerprint:" + fingerprint] },
    { sentenceId: "opening-p2-s1", paragraph: 2 as const, evidenceIds: openingEvidenceIds(tension, null, "fingerprint:" + fingerprint) },
    { sentenceId: "opening-p2-s2", paragraph: 2 as const, evidenceIds: openingEvidenceIds(null, overlay, overlay ? `overlay:${overlay.id}` : "birth-time:limited") },
    { sentenceId: "opening-p2-s3", paragraph: 2 as const, evidenceIds: deepLayers.flatMap((layer) => layer.items.slice(0, 1).map((item) => item.evidenceIds[0])).filter(Boolean).slice(0, 3) },
  ].map((item) => ({ ...item, evidenceIds: item.evidenceIds.length > 0 ? item.evidenceIds : ["report:pair-context"] }));

  return { paragraphs, evidence };
}

function ensureOpeningWordBudget(
  paragraphs: [string, string],
  fallback: [string, string],
): [string, string] {
  const total = countPersianWords(paragraphs[0]) + countPersianWords(paragraphs[1]);
  if (total >= 160 && total <= 240) return paragraphs;
  if (total < 160) {
    const extra = "این خوانش عمداً هم نقطهٔ اتکا و هم نقطهٔ فشار را کنار هم نگه می‌دارد تا نتیجه شبیه تعریف کلی از سازگاری نباشد و بتواند به رفتارهای قابل مشاهده در همین رابطه وصل شود.";
    const extended: [string, string] = [paragraphs[0], `${paragraphs[1]} ${extra}`];
    const extendedTotal = countPersianWords(extended[0]) + countPersianWords(extended[1]);
    if (extendedTotal >= 160 && extendedTotal <= 240) return extended;
  }
  const fallbackTotal = countPersianWords(fallback[0]) + countPersianWords(fallback[1]);
  return fallbackTotal >= 160 && fallbackTotal <= 240 ? fallback : paragraphs;
}

function inputOpeningFallback(
  report: RealSynastryReport,
  labels: { a: string; b: string },
): [string, string] {
  const first = `رابطهٔ ${labels.a} و ${labels.b} از مجموعه‌ای از تماس‌های واقعی میان دو چارت ساخته می‌شود و یک عامل به‌تنهایی نمی‌تواند داستان آن را توضیح دهد. بعضی بخش‌ها همکاری و فهم متقابل را آسان‌تر می‌کنند و بعضی بخش‌ها زمانی که خستگی، عجله یا ترس وارد رابطه می‌شود به نقطهٔ فشار تبدیل می‌شوند. این خوانش به‌جای یک حکم کلی، روی همین تفاوت میان ظرفیت حمایت و محل اصطکاک تمرکز می‌کند تا روشن شود کجا دو نفر طبیعی‌تر به هم می‌رسند و کجا لازم است معنای واکنش‌های یکدیگر را دقیق‌تر بخوانند.`;
  const second = `در ${CONTEXT_LABELS_FA[report.relationshipContext]}، ارزش این تصویر زمانی بیشتر می‌شود که از آن برای نام‌گذاری الگوهای واقعی استفاده شود: چه چیزی احساس امنیت می‌سازد، چه چیزی میل به عقب‌نشینی یا دفاع را بالا می‌برد، و کدام انتخاب کوچک می‌تواند چرخه را عوض کند. ساعت تولد و کیفیت داده هر جا لازم باشد دامنهٔ اطمینان را محدود می‌کنند و نقاطی که هنوز orb policy تأییدشده ندارند به‌عنوان تماس تازه جعل نمی‌شوند. بنابراین داستان نهایی هم شخصی است و هم مرزش با چیزی که موتور واقعاً محاسبه نکرده روشن می‌ماند.`;
  return [first, second];
}

function countPersianWords(value: string): number {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function buildContactInterpretation(
  report: RealSynastryReport,
  contact: SynastryInterChartAspect,
  overlays: ComparisonOverlayInterpretation[],
  labels: { a: string; b: string },
  birthTime: { a: SynastryBirthTimeStatus; b: SynastryBirthTimeStatus },
): ComparisonContactInterpretation {
  const theme = describeContactTheme(contact);
  const relatedOverlays = overlays.filter((overlay) =>
    overlay.relatedContactIds.includes(contact.id),
  );
  const natalA = describeNatalModifier(report.chartA, contact.pointA.id, labels.a);
  const natalB = describeNatalModifier(report.chartB, contact.pointB.id, labels.b);
  const confidenceFa = buildContactConfidence(contact, birthTime);
  const supportive = contact.polarity === "supportive";
  const tension = contact.polarity === "tension" || contact.polarity === "intense";
  const tightness = contact.allowedOrb > 0 ? Math.max(0, 1 - contact.orb / contact.allowedOrb) : 0;
  const importanceFa = contact.relevanceScore >= 80 || tightness >= 0.8
    ? `این تماس به‌دلیل نزدیکی به زاویهٔ دقیق و امتیاز ارتباطی ${contact.relevanceScore.toLocaleString("fa-IR")} در لایهٔ پررنگ‌تر گزارش قرار می‌گیرد.`
    : contact.relevanceScore >= 45
      ? `این تماس وزن میانی دارد؛ به‌تنهایی داستان رابطه را تعیین نمی‌کند اما وقتی با شواهد هم‌جهت تکرار شود معنای بیشتری پیدا می‌کند.`
      : `این تماس در رتبهٔ پایین‌تری قرار دارد و بهتر است به‌عنوان زمینهٔ تکمیلی خوانده شود، نه محور اصلی رابطه.`;

  return {
    id: contact.id,
    titleFa: contact.titleFa,
    pointAFactFa: formatPointFact(contact.pointA, labels.a),
    pointBFactFa: formatPointFact(contact.pointB, labels.b),
    aspectFa: `${contact.aspectLabel} با فاصلهٔ ${formatDegree(contact.separation)} و اورب ${formatDegree(contact.orb)} از سقف مجاز ${formatDegree(contact.allowedOrb)}`,
    importanceFa,
    healthyFa: supportive
      ? `در حالت سالم، ${theme} به مسیر همکاری تبدیل می‌شود و تفاوت واکنش‌ها به‌جای تهدید، اطلاعات بیشتری دربارهٔ نیاز هر نفر می‌دهد.`
      : `در حالت سالم، حتی اگر این تماس ساده نباشد، ${theme} می‌تواند به گفت‌وگوی روشن دربارهٔ تفاوت نیازها و تنظیم مرزها کمک کند.`,
    stressFa: tension
      ? `زیر فشار، ${theme} می‌تواند سریع به سوءبرداشت، دفاع یا تلاش برای وادارکردن دیگری به همان ریتم تبدیل شود.`
      : `زیر فشار، مزیت این تماس ممکن است بدیهی فرض شود و خواسته‌های ناگفته زیر ظاهر آرام رابطه پنهان بمانند.`,
    contextFa: describeRelationshipContextForContact(report.relationshipContext, theme),
    natalContextFa: `${natalA} ${natalB}`,
    overlayContextFa: relatedOverlays.length > 0
      ? relatedOverlays.map((item) => item.contextFa).join(" ")
      : `برای این تماس هم‌پوشانی خانه‌ای مستقیم و قابل اتکایی ثبت نشده است؛ بنابراین این بخش از تفسیر روی خود تماس و زمینهٔ natal دو نفر تکیه می‌کند.`,
    confidenceFa,
    evidenceIds: uniqueStrings([
      contact.id,
      ...relatedOverlays.map((item) => item.id),
      ...findNatalAspectEvidence(report.chartA, contact.pointA.id),
      ...findNatalAspectEvidence(report.chartB, contact.pointB.id),
    ]),
  };
}

function buildOverlayInterpretation(
  report: RealSynastryReport,
  overlay: SynastryHouseOverlay,
  labels: { a: string; b: string },
): ComparisonOverlayInterpretation {
  const sourceLabel = overlay.sourceChartSide === "a" ? labels.a : labels.b;
  const targetLabel = overlay.targetChartSide === "a" ? labels.a : labels.b;
  const theme = HOUSE_THEME_FA[overlay.targetHouse] ?? "یک حوزه مشخص از زندگی";
  const relatedContactIds = report.contacts
    .filter((contact) =>
      (contact.pointA.chartSide === overlay.sourceChartSide && contact.pointA.id === overlay.sourcePointId) ||
      (contact.pointB.chartSide === overlay.sourceChartSide && contact.pointB.id === overlay.sourcePointId),
    )
    .map((contact) => contact.id);

  return {
    id: overlay.id,
    directionFa: `${sourceLabel} → زندگی ${targetLabel}`,
    titleFa: `${overlay.sourcePointLabel} ${sourceLabel} در خانهٔ ${overlay.targetHouse.toLocaleString("fa-IR")} ${targetLabel}`,
    meaningFa: `${theme} در حضور ${sourceLabel} برای ${targetLabel} زودتر فعال می‌شود.`,
    contextFa: describeOverlayContext(report.relationshipContext, overlay.targetHouse, sourceLabel, targetLabel),
    supportiveFa: `وقتی این حوزه با انتخاب روشن و مرز قابل مذاکره مدیریت شود، حضور ${sourceLabel} می‌تواند به ${targetLabel} کمک کند این بخش از زندگی را آگاهانه‌تر ببیند.`,
    stressFa: `اگر نقش‌ها یا انتظارها نامشخص بمانند، همین حوزه می‌تواند محل فرافکنی، فشار یا تفسیر عجولانهٔ رفتار دیگری شود.`,
    confidenceFa: `این هم‌پوشانی فقط چون هر دو چارت دادهٔ خانه‌ای قابل استفاده دارند محاسبه شده است؛ با تغییر معنی‌دار ساعت تولد، جایگاه خانه می‌تواند تغییر کند.`,
    relatedContactIds,
    evidenceIds: uniqueStrings([overlay.id, ...relatedContactIds]),
  };
}

function describeOverlayContext(
  context: SynastryRelationshipContext,
  house: number,
  sourceLabel: string,
  targetLabel: string,
): string {
  if (house === 8 && context === "work") {
    return `در همکاری، این خانه دربارهٔ منابع مشترک، محرمانگی، اختیار، ریسک و نحوهٔ تقسیم مسئولیت خوانده می‌شود و باید صرفاً در همین چارچوب حرفه‌ای تفسیر شود. حضور ${sourceLabel} می‌تواند این موضوع‌ها را در تجربهٔ کاری ${targetLabel} پررنگ‌تر کند.`;
  }
  if (house === 8 && context === "romantic") {
    return `در رابطهٔ عاطفی، این خانه اعتماد، صمیمیت عمیق، مرزهای آسیب‌پذیری و منابع مشترک را برجسته می‌کند؛ حضور ${sourceLabel} این موضوع‌ها را برای ${targetLabel} زودتر به سطح می‌آورد.`;
  }
  const base: Record<SynastryRelationshipContext, string> = {
    romantic: `در رابطهٔ عاطفی، ${HOUSE_THEME_FA[house] ?? "این حوزه"} بخشی از تجربهٔ نزدیک‌شدن، اعتماد و ساختن زندگی مشترک می‌شود.`,
    friendship: `در دوستی، ${HOUSE_THEME_FA[house] ?? "این حوزه"} بیشتر در کیفیت همراهی، مرز دوستی و شیوهٔ حضور در زندگی یکدیگر دیده می‌شود.`,
    family: `در رابطهٔ خانوادگی، ${HOUSE_THEME_FA[house] ?? "این حوزه"} با نقش‌ها، سابقهٔ مشترک و انتظارهای خانوادگی گره می‌خورد.`,
    work: `در همکاری، ${HOUSE_THEME_FA[house] ?? "این حوزه"} به تقسیم نقش، تصمیم، مسئولیت و کیفیت هماهنگی عملی مربوط می‌شود.`,
    general: `${HOUSE_THEME_FA[house] ?? "این حوزه"} یکی از جاهایی است که اثر حضور دو نفر در زندگی واقعی یکدیگر واضح‌تر می‌شود.`,
  };
  return base[context];
}

function buildDeepLayers(
  report: RealSynastryReport,
  labels: { a: string; b: string },
): ComparisonDeepLayer[] {
  const layers: ComparisonDeepLayer[] = [];
  const nodeItems = [
    ...buildNodeItems(report.chartA, "a", labels.a, report.relationshipContext),
    ...buildNodeItems(report.chartB, "b", labels.b, report.relationshipContext),
  ];
  pushLayer(layers, "lunar-nodes", "نودهای ماه و مسیر رشد", "نودها به‌عنوان زمینهٔ رشدی هر نفر خوانده می‌شوند؛ برای آن‌ها تماس بین‌چارتی تازه بدون orb policy تأییدشده ساخته نمی‌شود.", nodeItems);

  const specialItems = [
    ...buildLilithItems(report.chartA, "a", labels.a, report.relationshipContext),
    ...buildLilithItems(report.chartB, "b", labels.b, report.relationshipContext),
    ...buildSpecialPointItems(report.chartA, "a", labels.a, report.relationshipContext),
    ...buildSpecialPointItems(report.chartB, "b", labels.b, report.relationshipContext),
  ];
  pushLayer(layers, "special-points", "لایه‌های عمیق‌تر و نقاط ویژه", "کایرون، ورتکس، لیلیت و اجرام پیشرفته فقط در محدودهٔ داده و اعتبار واقعی موتور توضیح داده می‌شوند.", specialItems);

  const fixedStarItems = [
    ...buildFixedStarItems(report.chartA, "a", labels.a, report.relationshipContext),
    ...buildFixedStarItems(report.chartB, "b", labels.b, report.relationshipContext),
  ];
  pushLayer(layers, "fixed-stars", "ستاره‌های ثابت", "فقط conjunction candidateهای موجود در snapshot توضیح داده می‌شوند و برای ستاره‌های ثابت aspect تازه اختراع نمی‌شود.", fixedStarItems);

  const lotItems = [
    ...buildTraditionalLotItems(report.chartA, "a", labels.a, report.relationshipContext),
    ...buildTraditionalLotItems(report.chartB, "b", labels.b, report.relationshipContext),
  ];
  pushLayer(layers, "traditional-lots", "سهم‌های سنتی", "سهم‌های سنتی با فرمول و sect ثبت‌شدهٔ خود موتور خوانده می‌شوند و خانهٔ آن‌ها فقط در زمینهٔ Placidus موجود استفاده می‌شود.", lotItems);

  const retrogradeItems = [
    ...buildRetrogradeItems(report.chartA, "a", labels.a, report.relationshipContext),
    ...buildRetrogradeItems(report.chartB, "b", labels.b, report.relationshipContext),
  ];
  pushLayer(layers, "retrogrades", "حرکت بازگشتی", "retrograde به‌عنوان modifier زمینهٔ فردی استفاده می‌شود و به‌تنهایی حکم دربارهٔ کیفیت رابطه نمی‌دهد.", retrogradeItems);

  const signatureItems = [
    ...buildSignatureItems(report.chartA, "a", labels.a, report.relationshipContext),
    ...buildSignatureItems(report.chartB, "b", labels.b, report.relationshipContext),
  ];
  pushLayer(layers, "chart-signatures", "امضای کلی دو چارت", "ترکیب عناصر، کیفیت‌ها و بیان فعال/پذیرا برای توضیح تفاوت ریتم دو نفر استفاده می‌شود.", signatureItems);

  const natalAspectItems = [
    ...buildNatalAspectItems(report.chartA, "a", labels.a, report.relationshipContext),
    ...buildNatalAspectItems(report.chartB, "b", labels.b, report.relationshipContext),
  ];
  pushLayer(layers, "natal-aspects", "زمینهٔ جنبه‌های تولد", "جنبه‌های درون هر چارت توضیح می‌دهند چرا یک تماس مشابه می‌تواند برای دو نفر اثر یکسانی نداشته باشد.", natalAspectItems);

  return layers;
}

function pushLayer(
  layers: ComparisonDeepLayer[],
  id: string,
  titleFa: string,
  summaryFa: string,
  items: ComparisonDeepLayerItem[],
) {
  if (items.length === 0) return;
  layers.push({ id, titleFa, summaryFa, items });
}

function buildNodeItems(
  snapshot: SynastryNatalSnapshot,
  side: "a" | "b",
  label: string,
  context: SynastryRelationshipContext,
): ComparisonDeepLayerItem[] {
  const nodes = snapshot.engineSnapshot?.lunarNodes;
  if (!nodes) return [];
  if (nodes.status === "calculated" && "northNode" in nodes && "southNode" in nodes) {
    return [nodes.northNode, nodes.southNode].map((node) =>
      buildPointLayerItem({
        id: `node:${side}:${node.id}`,
        pointId: node.id,
        titleFa: `${node.id === "north-node" ? "گرهٔ شمالی" : "گرهٔ جنوبی"} ${label}`,
        label,
        signId: node.signId,
        degreeInSign: node.degreeInSign,
        house: node.house ?? null,
        reliability: node.reliability,
        context,
        evidenceIds: [`engine:${side}:lunarNodes`, `point:${side}:${node.id}`],
        limitation: node.limitation,
      }),
    );
  }
  return [buildDeferredLayerItem(`node:${side}:deferred`, `نودهای ماه ${label}`, nodes.limitation ?? "نودهای ماه در این snapshot قابل تفسیر نیستند.", [`engine:${side}:lunarNodes`])];
}

function buildLilithItems(
  snapshot: SynastryNatalSnapshot,
  side: "a" | "b",
  label: string,
  context: SynastryRelationshipContext,
): ComparisonDeepLayerItem[] {
  const lilith = snapshot.engineSnapshot?.lilith;
  if (!lilith) return [];
  if (lilith.status === "calculated" && "longitude" in lilith && "approvedForReportOutput" in lilith) {
    if (!lilith.approvedForReportOutput) {
      return [buildDeferredLayerItem(`lilith:${side}:not-approved`, `لیلیت ${label}`, lilith.limitation ?? "لیلیت محاسبه شده اما برای خروجی تفسیری تأیید نشده است.", [`engine:${side}:lilith`])];
    }
    return [buildPointLayerItem({
      id: `lilith:${side}`,
      pointId: lilith.id,
      titleFa: `لیلیت ${label}`,
      label,
      signId: lilith.signId,
      degreeInSign: lilith.degreeInSign,
      house: lilith.house ?? null,
      reliability: lilith.reliability,
      context,
      evidenceIds: [`engine:${side}:lilith`, `point:${side}:${lilith.id}`],
      limitation: lilith.limitation,
    })];
  }
  return [buildDeferredLayerItem(`lilith:${side}:deferred`, `لیلیت ${label}`, lilith.limitation ?? "لیلیت برای این snapshot قابل تفسیر نیست.", [`engine:${side}:lilith`])];
}

function buildSpecialPointItems(
  snapshot: SynastryNatalSnapshot,
  side: "a" | "b",
  label: string,
  context: SynastryRelationshipContext,
): ComparisonDeepLayerItem[] {
  return (snapshot.engineSnapshot?.specialPoints ?? []).map((point) => {
    if (point.status !== "calculated") {
      return buildDeferredLayerItem(
        `special:${side}:${point.id}:deferred`,
        `${point.labelFa} ${label}`,
        point.limitation,
        [`engine:${side}:specialPoints`, `point:${side}:${point.id}`],
      );
    }
    return buildPointLayerItem({
      id: `special:${side}:${point.id}`,
      pointId: point.id,
      titleFa: `${point.labelFa} ${label}`,
      label,
      signId: point.signId,
      degreeInSign: point.degreeInSign,
      house: point.house,
      reliability: point.reliability,
      context,
      evidenceIds: [`engine:${side}:specialPoints`, `point:${side}:${point.id}`],
      limitation: null,
    });
  });
}

function buildFixedStarItems(
  snapshot: SynastryNatalSnapshot,
  side: "a" | "b",
  label: string,
  context: SynastryRelationshipContext,
): ComparisonDeepLayerItem[] {
  const fixed = snapshot.engineSnapshot?.specialistAstrology?.fixedStars;
  if (!fixed) return [];
  return fixed.conjunctionCandidates.map((candidate, index) => ({
    id: `fixed-star:${side}:${candidate.starId}:${candidate.anchorId}:${index}`,
    titleFa: `${candidate.starLabelFa} با ${candidate.anchorLabel} در چارت ${label}`,
    meaningFa: `موتور این مورد را به‌عنوان نامزد هم‌نشینی ستارهٔ ثابت با ${candidate.anchorLabel} ثبت کرده است؛ orb ثبت‌شده ${candidate.orbDegrees.toFixed(2)} درجه است.`,
    relationshipExpressionFa: `در این ${CONTEXT_LABELS_FA[context]}، این داده یک لایهٔ فرعی برای فهم زمینهٔ natal ${label} است و به‌تنهایی تماس بین‌چارتی محسوب نمی‌شود.`,
    supportiveExpressionFa: `اگر موضوع این anchor در سایر شواهد هم تکرار شود، این نامزد می‌تواند به‌عنوان تأکید ثانویه در همان محور خوانده شود.`,
    stressExpressionFa: `نباید از این داده aspectهای دیگر یا نتیجهٔ قطعی ساخته شود؛ contract فعلی فقط conjunction candidate ثبت‌شده را می‌شناسد.`,
    contextualExpressionFa: `کاتالوگ ${fixed.catalogueVersion} و سقف نامزدی ${fixed.conjunctionCandidateOrbDegrees.toFixed(2)} درجه مبنای این ثبت هستند.`,
    confidenceFa: `اعتبار این مورد محدود به همان candidate ذخیره‌شده در snapshot است؛ narrative promotion مستقل از contact هنوز contract جداگانه می‌خواهد.`,
    evidenceIds: [`engine:${side}:specialistAstrology.fixedStars.conjunctionCandidates`, `fixed-star:${side}:${candidate.starId}:${candidate.anchorId}`],
  }));
}

function buildTraditionalLotItems(
  snapshot: SynastryNatalSnapshot,
  side: "a" | "b",
  label: string,
  context: SynastryRelationshipContext,
): ComparisonDeepLayerItem[] {
  const lots = snapshot.engineSnapshot?.specialistAstrology?.traditionalLots;
  if (!lots) return [];
  return lots.lots.map((lot) => ({
    id: `lot:${side}:${lot.id}`,
    titleFa: `${lot.labelFa} ${label}`,
    meaningFa: LOT_MEANING_FA[lot.id] ?? "این سهم سنتی یک نقطهٔ محاسبه‌شده بر پایهٔ فرمول ثبت‌شدهٔ موتور است.",
    relationshipExpressionFa: `برای ${label} این سهم در ${SIGN_LABELS_FA[lot.signId] ?? lot.signId} و خانهٔ ${lot.house?.toLocaleString("fa-IR") ?? "نامشخص"} قرار دارد و به‌عنوان زمینهٔ فردی وارد خوانش ${CONTEXT_LABELS_FA[context]} می‌شود.`,
    supportiveExpressionFa: `وقتی موضوع این سهم با تماس‌ها یا هم‌پوشانی‌های مستقل تکرار شود، می‌تواند به فهم دقیق‌تر همان محور کمک کند.`,
    stressExpressionFa: `این سهم نباید جای تماس‌های واقعی بین دو چارت را بگیرد یا به‌تنهایی به حکم دربارهٔ آیندهٔ رابطه تبدیل شود.`,
    contextualExpressionFa: `فرمول ${lot.formulaId}، sect ${lot.sect} و رفتار ${lot.dayNightBehavior} در snapshot ثبت شده‌اند.`,
    confidenceFa: `خانهٔ این سهم طبق contract فقط placement در Placidus است و whole-sign interpretation روی آن اعمال نشده است.`,
    evidenceIds: [`engine:${side}:specialistAstrology.traditionalLots`, `lot:${side}:${lot.id}`],
  }));
}

function buildRetrogradeItems(
  snapshot: SynastryNatalSnapshot,
  side: "a" | "b",
  label: string,
  context: SynastryRelationshipContext,
): ComparisonDeepLayerItem[] {
  const retrogrades = snapshot.engineSnapshot?.retrogrades;
  if (!retrogrades) return [];
  if (retrogrades.status !== "calculated") {
    return [buildDeferredLayerItem(`retrograde:${side}:deferred`, `حرکت بازگشتی ${label}`, retrogrades.limitation ?? "retrograde برای این snapshot قابل استفاده نیست.", [`engine:${side}:retrogrades`])];
  }
  if (retrogrades.planetIds.length === 0) {
    return [{
      id: `retrograde:${side}:none`,
      titleFa: `حرکت بازگشتی ${label}`,
      meaningFa: "در snapshot این چارت هیچ سیارهٔ اصلی با وضعیت retrograde ثبت نشده است.",
      relationshipExpressionFa: `پس در ${CONTEXT_LABELS_FA[context]} modifier بازگشتی برای سیاره‌های اصلی ${label} به روایت اضافه نمی‌شود.`,
      supportiveExpressionFa: "این وضعیت به‌خودی‌خود امتیاز مثبت یا منفی نیست.",
      stressExpressionFa: "نبود retrograde نباید به سادگی یا بی‌چالشی رابطه تعبیر شود.",
      contextualExpressionFa: `روش محاسبه: ${retrogrades.method ?? "ثبت نشده"}.`,
      confidenceFa: "این توضیح فقط وضعیت محاسبه‌شدهٔ snapshot را گزارش می‌کند.",
      evidenceIds: [`engine:${side}:retrogrades`],
    }];
  }
  return retrogrades.planetIds.map((planetId) => ({
    id: `retrograde:${side}:${planetId}`,
    titleFa: `${planetId} بازگشتی در چارت ${label}`,
    meaningFa: `حرکت بازگشتی ${planetId} به‌عنوان modifier نشان می‌دهد پردازش و بیان موضوع‌های این سیاره می‌تواند بیشتر درونی، بازبینی‌شونده یا غیرخطی تجربه شود.`,
    relationshipExpressionFa: `در ${CONTEXT_LABELS_FA[context]} این modifier فقط برای توضیح واکنش ${label} به تماس‌های مربوط به ${planetId} استفاده می‌شود.`,
    supportiveExpressionFa: "بازبینی بیشتر می‌تواند به دقت و خودآگاهی کمک کند.",
    stressExpressionFa: "زیر فشار، بازگشت مکرر به موضوع یا دیرتر بیرونی‌کردن تصمیم می‌تواند برای نفر مقابل مبهم شود.",
    contextualExpressionFa: `روش ثبت‌شده: ${retrogrades.method ?? "نامشخص"}.`,
    confidenceFa: "این modifier از وضعیت motion محاسبه‌شده می‌آید و حکم مستقل دربارهٔ شخصیت یا رابطه نیست.",
    evidenceIds: [`engine:${side}:retrogrades`, `retrograde:${side}:${planetId}`],
  }));
}

function buildSignatureItems(
  snapshot: SynastryNatalSnapshot,
  side: "a" | "b",
  label: string,
  context: SynastryRelationshipContext,
): ComparisonDeepLayerItem[] {
  const signature = snapshot.engineSnapshot?.chartSignature;
  if (!signature) return [];
  return [{
    id: `signature:${side}`,
    titleFa: `امضای چارت ${label}`,
    meaningFa: `گرایش غالب این چارت از نظر عنصر ${signature.dominantElement ?? "بدون غالب روشن"}، کیفیت ${signature.dominantModality ?? "بدون غالب روشن"} و بیان ${signature.dominantExpression ?? "بدون غالب روشن"} ثبت شده است.`,
    relationshipExpressionFa: `در ${CONTEXT_LABELS_FA[context]} این ترکیب به توضیح سرعت واکنش، شیوهٔ اقدام و نحوهٔ تنظیم انرژی ${label} کمک می‌کند.`,
    supportiveExpressionFa: `شناخت این ریتم کمک می‌کند تفاوت سبک با بی‌علاقگی یا فشار اشتباه گرفته نشود.`,
    stressExpressionFa: `دسته‌های کم یا صفر می‌توانند باعث شوند بعضی شیوه‌های پاسخ به‌طور خودکار در دسترس نباشند و نیاز به تمرین آگاهانه داشته باشند.`,
    contextualExpressionFa: `کمبودها: عنصر ${signature.lowElements.join("، ") || "ندارد"}؛ کیفیت ${signature.lowModalities.join("، ") || "ندارد"}؛ بیان ${signature.lowExpressions.join("، ") || "ندارد"}.`,
    confidenceFa: `این signature با روش ${signature.method} و شواهد ${signature.evidence.length.toLocaleString("fa-IR")} جایگاه اصلی ساخته شده است.`,
    evidenceIds: [`engine:${side}:chartSignature`, ...signature.evidence.map((item) => `placement:${side}:${item.placementId}`)],
  }];
}

function buildNatalAspectItems(
  snapshot: SynastryNatalSnapshot,
  side: "a" | "b",
  label: string,
  context: SynastryRelationshipContext,
): ComparisonDeepLayerItem[] {
  return (snapshot.engineSnapshot?.aspects ?? []).map((aspect) => ({
    id: `natal-aspect:${side}:${aspect.id}`,
    titleFa: `${aspect.firstPlanetLabel} ${aspect.aspectLabel} ${aspect.secondPlanetLabel} در چارت ${label}`,
    meaningFa: aspect.narrative || aspect.meaning,
    relationshipExpressionFa: `این جنبهٔ natal توضیح می‌دهد چرا ${label} تماس‌های بین‌چارتی مربوط به ${aspect.firstPlanetLabel} یا ${aspect.secondPlanetLabel} را با زمینهٔ ازپیش‌موجود خودش تجربه می‌کند.`,
    supportiveExpressionFa: `اگر تماس بیرونی با این الگوی natal هم‌جهت باشد، فرد ممکن است سریع‌تر آن را بشناسد و مسیر استفاده از آن برایش آشناتر باشد.`,
    stressExpressionFa: `اگر تماس بیرونی همان تنش natal را دوباره فعال کند، واکنش می‌تواند شدیدتر یا تکرارشونده‌تر از چیزی باشد که فقط از تماس بین دو چارت انتظار می‌رود.`,
    contextualExpressionFa: `در ${CONTEXT_LABELS_FA[context]} این جنبه modifier است، نه تماس تازه میان دو نفر.`,
    confidenceFa: `اورب natal ثبت‌شده ${aspect.orb.toFixed(2)} درجه است و این داده مستقیماً از snapshot ${label} می‌آید.`,
    evidenceIds: [`engine:${side}:aspects`, `natal-aspect:${side}:${aspect.id}`],
  }));
}

function buildPointLayerItem(input: {
  id: string;
  pointId: string;
  titleFa: string;
  label: string;
  signId: string;
  degreeInSign: number;
  house: number | null;
  reliability: string | null | undefined;
  context: SynastryRelationshipContext;
  evidenceIds: string[];
  limitation: string | null;
}): ComparisonDeepLayerItem {
  const meaning = POINT_MEANING_FA[input.pointId] ?? "این نقطه یک لایهٔ محاسبه‌شدهٔ تکمیلی در چارت تولد است.";
  const placement = `${SIGN_LABELS_FA[input.signId] ?? input.signId} ${input.degreeInSign.toFixed(1)}°${input.house ? `، خانهٔ ${input.house.toLocaleString("fa-IR")}` : ""}`;
  return {
    id: input.id,
    titleFa: input.titleFa,
    meaningFa: meaning,
    relationshipExpressionFa: `${input.titleFa} در ${placement} قرار دارد و در ${CONTEXT_LABELS_FA[input.context]} به‌عنوان زمینهٔ واکنش ${input.label} و در صورت وجود، هم‌پوشانی خانه‌ای معتبر استفاده می‌شود.`,
    supportiveExpressionFa: "در حالت سازنده، آگاهی از این نقطه کمک می‌کند موضوع آن به زبان روشن و قابل مذاکره وارد رابطه شود.",
    stressExpressionFa: "زیر فشار، موضوع این نقطه می‌تواند به واکنش دفاعی یا تکرار یک الگوی آشنا تبدیل شود؛ تفسیر آن باید با شواهد مستقل دیگر سنجیده شود.",
    contextualExpressionFa: "برای این گروه از نقاط تا وقتی orb policy معتبر تعریف نشده، تماس بین‌چارتی تازه ساخته نمی‌شود؛ نبود contact ساختگی بخشی از صداقت محاسباتی گزارش است.",
    confidenceFa: `${input.reliability ? `اعتبار داده: ${input.reliability}. ` : ""}${input.limitation ?? "محدودیت ویژه‌ای در snapshot ثبت نشده است."}`,
    evidenceIds: input.evidenceIds,
  };
}

function buildDeferredLayerItem(
  id: string,
  titleFa: string,
  reasonFa: string,
  evidenceIds: string[],
): ComparisonDeepLayerItem {
  return {
    id,
    titleFa,
    meaningFa: "این لایه در قرارداد موتور وجود دارد اما دادهٔ قابل تفسیر فعلی برای آن کامل نیست.",
    relationshipExpressionFa: "برای جلوگیری از ساختن معنای نجومی جعلی، این مورد به‌صورت deferred نگه داشته می‌شود.",
    supportiveExpressionFa: "مزیت این وضعیت این است که گزارش مرز میان دادهٔ واقعی و دادهٔ محاسبه‌نشده را شفاف نگه می‌دارد.",
    stressExpressionFa: "نباید از نبود داده نتیجهٔ مثبت یا منفی دربارهٔ رابطه ساخته شود.",
    contextualExpressionFa: reasonFa,
    confidenceFa: "DEFERRED_WITH_REASON",
    evidenceIds,
  };
}

function buildNatalContext(
  snapshot: SynastryNatalSnapshot,
  side: "a" | "b",
  label: string,
): ComparisonNatalContext {
  const engine = snapshot.engineSnapshot;
  const signature = engine?.chartSignature;
  const retrograde = engine?.retrogrades;
  const summaryFa = signature
    ? `${label} در امضای کلی چارت، ${signature.dominantElement ?? "بدون عنصر غالب"} / ${signature.dominantModality ?? "بدون کیفیت غالب"} / ${signature.dominantExpression ?? "بدون بیان غالب"} را دارد؛ این ریتم به‌عنوان modifier تماس‌های رابطه استفاده می‌شود.`
    : `${label} امضای کلی محاسبه‌شده در snapshot ندارد؛ زمینهٔ natal از جایگاه‌ها و جنبه‌های موجود خوانده می‌شود.`;
  const factsFa = [
    ...(engine?.placements ?? []).map((placement) => `${placement.label}: ${SIGN_LABELS_FA[placement.signId] ?? placement.signId} ${placement.degreeInSign.toFixed(1)}°${placement.house ? `، خانه ${placement.house.toLocaleString("fa-IR")}` : ""}${placement.motion?.status === "retrograde" ? "، بازگشتی" : ""}.`),
    ...(engine?.aspects ?? []).map((aspect) => `${aspect.firstPlanetLabel} ${aspect.aspectLabel} ${aspect.secondPlanetLabel}: اورب ${aspect.orb.toFixed(2)}°.`),
  ];
  if (retrograde?.status === "calculated" && retrograde.planetIds.length > 0) {
    factsFa.push(`سیاره‌های بازگشتی ثبت‌شده: ${retrograde.planetIds.join("، ")}.`);
  }
  return {
    chartSide: side,
    chartLabel: label,
    summaryFa,
    factsFa,
    evidenceIds: uniqueStrings([
      `engine:${side}:placements`,
      ...(engine?.aspects ?? []).map((aspect) => `natal-aspect:${side}:${aspect.id}`),
      signature ? `engine:${side}:chartSignature` : "",
      retrograde ? `engine:${side}:retrogrades` : "",
    ]),
  };
}

function buildCalculationExplanation(
  report: RealSynastryReport,
  labels: { a: string; b: string },
  birthTime: { a: SynastryBirthTimeStatus; b: SynastryBirthTimeStatus },
): ComparisonCalculationExplanation {
  const snapshots = [
    { side: "a" as const, label: labels.a, snapshot: report.chartA, time: birthTime.a },
    { side: "b" as const, label: labels.b, snapshot: report.chartB, time: birthTime.b },
  ];
  const methodNotesFa: string[] = [];
  const warningsFa: string[] = [];
  for (const entry of snapshots) {
    const engine = entry.snapshot.engineSnapshot;
    if (!engine) {
      warningsFa.push(`${entry.label}: full engine snapshot در این رکورد قدیمی وجود ندارد.`);
      continue;
    }
    methodNotesFa.push(`${entry.label}: نسخهٔ ${engine.version}، شهر ${engine.cityLabel}، زمان UTC ${engine.utcIso}.`);
    if (engine.houseContext) {
      methodNotesFa.push(`${entry.label}: سیستم خانه ${engine.houseContext.appliedSystem} با confidence ${engine.houseContext.confidence}.`);
    }
    if (engine.lunarNodes) {
      methodNotesFa.push(`${entry.label}: روش نودها ${engine.lunarNodes.method ?? "نامشخص"}.`);
    }
    if (engine.lilith && engine.lilith.status === "calculated" && "validationStatus" in engine.lilith) {
      methodNotesFa.push(`${entry.label}: لیلیت ${engine.lilith.validationStatus} و approvedForReportOutput=${String(engine.lilith.approvedForReportOutput)}.`);
    }
    if (engine.specialistAstrology?.fixedStars) {
      const fixed = engine.specialistAstrology.fixedStars;
      methodNotesFa.push(`${entry.label}: کاتالوگ ستاره‌های ثابت ${fixed.catalogueVersion} با orb نامزدی ${fixed.conjunctionCandidateOrbDegrees.toFixed(2)}°.`);
    }
    if (engine.specialistAstrology?.traditionalLots) {
      methodNotesFa.push(`${entry.label}: مجموعه فرمول سهم‌ها ${engine.specialistAstrology.traditionalLots.formulaSetVersion}.`);
    }
    if (engine.specialistAstrology?.asteroidLab) {
      methodNotesFa.push(`${entry.label}: asteroid lab در سطح ${engine.specialistAstrology.asteroidLab.surface} است و main-report promotion=${engine.specialistAstrology.asteroidLab.mainReportPromotion}.`);
    }
    warningsFa.push(...(engine.calculationQuality?.warnings ?? []).map((item) => `${entry.label}: ${item}`));
    warningsFa.push(...(engine.calculationQuality?.limitations ?? []).map((item) => `${entry.label}: ${item}`));
  }
  warningsFa.push(...report.quality.limitations);
  const bothExact = birthTime.a === "exact" && birthTime.b === "exact";
  return {
    summaryFa: bothExact
      ? "هر دو ساعت تولد به‌عنوان دقیق وارد این مقایسه شده‌اند؛ بنابراین زاویه‌ها و هم‌پوشانی‌های خانه‌ای در صورت وجود دادهٔ معتبر قابل استفاده‌اند."
      : "حداقل یک ساعت تولد نامعلوم است؛ تماس‌های سیاره‌ای همچنان قابل استفاده‌اند اما زاویه‌ها و خانه‌های وابسته به زمان با محدودیت یا حذف همراه می‌شوند.",
    confidenceFa: report.quality.status === "complete"
      ? "کیفیت محاسبات این مقایسه در contract فعلی complete است؛ این به معنی قطعیت دربارهٔ آیندهٔ رابطه نیست."
      : "کیفیت محاسبات این مقایسه partial است و محدودیت‌های زیر باید همراه تفسیر خوانده شوند.",
    methodNotesFa: uniqueStrings(methodNotesFa),
    warningsFa: uniqueStrings(warningsFa),
  };
}

function buildInterpretationCoverage(
  report: RealSynastryReport,
  deepLayers: ComparisonDeepLayer[],
  contacts: ComparisonContactInterpretation[],
  overlays: ComparisonOverlayInterpretation[],
): ComparisonInterpretationCoverageEntry[] {
  const deepEvidence = deepLayers.flatMap((layer) => layer.items.flatMap((item) => item.evidenceIds));
  return REAL_ENGINE_SYNASTRY_COVERAGE_FIELDS.map((field) => {
    const aEntry = report.chartA.engineCoverage?.[field];
    const bEntry = report.chartB.engineCoverage?.[field];
    const bothUnavailable = aEntry?.dataState !== "preserved" && bEntry?.dataState !== "preserved";
    const status: ComparisonInterpretationCoverageEntry["status"] = bothUnavailable
      ? "unavailable-with-reason"
      : TECHNICAL_COVERAGE_FIELDS.has(field)
        ? "technically-explained"
        : "interpreted";
    const evidenceIds = uniqueStrings([
      ...(field === "placements" || field === "angles" ? contacts.flatMap((item) => item.evidenceIds) : []),
      ...(field === "houses" || field === "houseSystem" ? overlays.flatMap((item) => item.evidenceIds) : []),
      ...deepEvidence.filter((id) => id.includes(`:${field}`) || id.includes(`.${field}`)),
      `engine:a:${field}`,
      `engine:b:${field}`,
    ]);
    return {
      field,
      status,
      chartADataState: aEntry?.dataState ?? "unavailable",
      chartBDataState: bEntry?.dataState ?? "unavailable",
      reasonFa: bothUnavailable
        ? `فیلد ${field} در هیچ‌یک از دو engine snapshot موجود نیست و از نبود آن معنای تفسیری ساخته نمی‌شود.`
        : status === "technically-explained"
          ? `فیلد ${field} برای روش، provenance یا کیفیت محاسبه توضیح داده می‌شود و معنای روان‌شناختی جعلی نمی‌گیرد.`
          : `فیلد ${field} در لایهٔ خوانش، تماس‌ها، هم‌پوشانی‌ها یا زمینهٔ natal استفاده شده است.`,
      evidenceIds,
    };
  });
}

function describeContactTheme(contact: SynastryInterChartAspect | null): string {
  if (!contact) return "شیوهٔ نزدیک‌شدن و پاسخ‌دادن به یکدیگر";
  const ids = new Set([contact.pointA.id, contact.pointB.id]);
  if (contact.categories.includes("communication") || ids.has("mercury")) return "شیوهٔ حرف‌زدن، شنیدن و معناکردن پیام‌ها";
  if (ids.has("venus") && ids.has("mars")) return "کشش، ابراز علاقه و سرعت نزدیک‌شدن";
  if (ids.has("moon") && ids.has("saturn")) return "نیاز به امنیت در برابر احتیاط، مسئولیت یا ترس از آسیب‌پذیری";
  if (ids.has("sun") && ids.has("saturn")) return "دیده‌شدن در برابر انتظار، مسئولیت و حساسیت به نقد";
  if (contact.categories.includes("closeness") && contact.categories.includes("independence")) return "تعادل میان نزدیکی و نیاز به فضای شخصی";
  if (contact.categories.includes("closeness")) return "امنیت، محبت و تجربهٔ نزدیک‌شدن";
  if (contact.categories.includes("independence") || ids.has("saturn") || ids.has("uranus") || ids.has("pluto")) return "مرز، آزادی، تعهد و قدرت تغییر";
  if (contact.categories.includes("luminary")) return "هویت، دیده‌شدن و حس تعلق در کنار یکدیگر";
  return "ریتم اثرگذاری و واکنش دو نفر به یکدیگر";
}

function describeSignatureInteraction(chartA: SynastryNatalSnapshot, chartB: SynastryNatalSnapshot): string {
  const a = chartA.engineSnapshot?.chartSignature;
  const b = chartB.engineSnapshot?.chartSignature;
  if (!a || !b) return "دو نفر همیشه با سرعت و شیوهٔ یکسانی احساس، تصمیم و اقدام را تنظیم نمی‌کنند";
  if (a.dominantExpression && b.dominantExpression && a.dominantExpression !== b.dominantExpression) {
    return "یکی از دو نفر معمولاً انرژی را مستقیم‌تر بیرون می‌برد و دیگری پیش از واکنش بیشتر دریافت و پردازش می‌کند";
  }
  if (a.dominantModality && b.dominantModality && a.dominantModality !== b.dominantModality) {
    return "ریتم شروع‌کردن، ثابت‌ماندن و تغییر مسیر برای دو نفر یکسان نیست";
  }
  if (a.dominantElement && b.dominantElement && a.dominantElement !== b.dominantElement) {
    return "دو نفر از مسیرهای متفاوتی به اطمینان می‌رسند؛ یکی ممکن است زودتر به عمل یا ایده برود و دیگری به تجربهٔ ملموس یا احساس";
  }
  return "بخش مهمی از ریتم کلی دو چارت شبیه است، اما همین شباهت می‌تواند بعضی نقاط کور مشترک را هم تقویت کند";
}

function chooseDeeperOpeningTheme(layers: ComparisonDeepLayer[]): string {
  const priority = ["lunar-nodes", "special-points", "chart-signatures", "retrogrades", "traditional-lots", "fixed-stars", "natal-aspects"];
  const layer = priority.map((id) => layers.find((item) => item.id === id && item.items.length > 0)).find(Boolean);
  if (!layer) return "لایه‌های عمیق‌تر موتور در این رکورد شواهد کافی برای ورود پررنگ به opening ندارند.";
  if (layer.id === "lunar-nodes") return "زمینهٔ نودهای ماه نیز موضوع رشد و تکرار الگوهای آشنا را به این داستان اضافه می‌کند.";
  if (layer.id === "special-points") return "نقاط ویژه نیز نشان می‌دهند بعضی حساسیت‌ها یا نیازهای مرزی فقط با تماس‌های اصلی توضیح داده نمی‌شوند.";
  if (layer.id === "chart-signatures") return "امضای کلی دو چارت کمک می‌کند تفاوت ریتم واکنش‌ها فقط به یک تماس منفرد نسبت داده نشود.";
  if (layer.id === "retrogrades") return "حرکت‌های بازگشتی ثبت‌شده می‌توانند سرعت پردازش و بیرونی‌کردن بعضی موضوع‌ها را برای یکی از دو نفر تغییر دهند.";
  return `${layer.titleFa} به‌عنوان لایهٔ تکمیلی فقط وقتی وارد روایت می‌شود که با شواهد اصلی هم‌جهت باشد.`;
}

function describeRelationshipContextForContact(
  context: SynastryRelationshipContext,
  theme: string,
): string {
  const templates: Record<SynastryRelationshipContext, string> = {
    romantic: `در رابطهٔ عاطفی، ${theme} مستقیماً روی اعتماد، صمیمیت، ابراز علاقه و تصمیم‌های مشترک اثر می‌گذارد.`,
    friendship: `در دوستی، ${theme} بیشتر در کیفیت همراهی، احترام به آزادی و شیوهٔ حل سوءبرداشت‌ها دیده می‌شود.`,
    family: `در رابطهٔ خانوادگی، ${theme} با نقش‌های قدیمی، توقع‌های تثبیت‌شده و حساسیت به سابقهٔ مشترک ترکیب می‌شود.`,
    work: `در همکاری، ${theme} باید به زبان نقش، مسئولیت، تصمیم، بازخورد و مرز حرفه‌ای ترجمه شود؛ نه به copy عاشقانه یا جنسی.`,
    general: `در این رابطه، ${theme} یکی از مسیرهای اصلی مشاهدهٔ اثر متقابل دو نفر در زندگی واقعی است.`,
  };
  return templates[context];
}

function describeNatalModifier(
  snapshot: SynastryNatalSnapshot,
  pointId: string,
  label: string,
): string {
  const aspects = (snapshot.engineSnapshot?.aspects ?? []).filter(
    (aspect) => aspect.firstPlanetId === pointId || aspect.secondPlanetId === pointId,
  );
  if (aspects.length > 0) {
    const first = aspects[0];
    const other = first.firstPlanetId === pointId ? first.secondPlanetLabel : first.firstPlanetLabel;
    return `در چارت خودِ ${label}، ${pointId} با ${other} در ${first.aspectLabel} است؛ بنابراین این نقطه از قبل یک زمینهٔ natal فعال دارد و تماس رابطه روی صفحهٔ خالی فرود نمی‌آید.`;
  }
  const signature = snapshot.engineSnapshot?.chartSignature;
  return signature
    ? `برای ${label} جنبهٔ natal مستقیمی برای این نقطه در snapshot پیدا نشد؛ modifier از امضای کلی ${signature.dominantExpression ?? "بدون بیان غالب"} و ${signature.dominantModality ?? "بدون کیفیت غالب"} گرفته می‌شود.`
    : `برای ${label} modifier natal اختصاصی ثبت نشده است و تفسیر این تماس به خود تماس محدود می‌ماند.`;
}

function buildContactConfidence(
  contact: SynastryInterChartAspect,
  birthTime: { a: SynastryBirthTimeStatus; b: SynastryBirthTimeStatus },
): string {
  const angleDependent = contact.pointA.kind === "angle" || contact.pointB.kind === "angle";
  if (angleDependent) {
    return birthTime.a === "exact" && birthTime.b === "exact"
      ? "این تماس angle-dependent است و فقط چون هر دو ساعت تولد در این رکورد exact هستند وارد محاسبه شده است."
      : "این تماس به زاویه وابسته است و با ساعت تولد نامعلوم نباید معتبر فرض شود.";
  }
  return "هندسهٔ اصلی این تماس سیاره‌ای به ساعت خانه‌ها وابسته نیست؛ اما modifierهای خانه و زاویه فقط در صورت زمان تولد معتبر اضافه می‌شوند.";
}

function formatPointFact(point: SynastryNatalPoint, label: string): string {
  return `${point.label} ${label}: ${SIGN_LABELS_FA[point.signId] ?? point.signId} ${point.degreeInSign.toFixed(2)}°، طول ${point.longitude.toFixed(2)}°${point.natalHouse ? `، خانهٔ ${point.natalHouse.toLocaleString("fa-IR")}` : ""}${point.motion?.status === "retrograde" ? "، بازگشتی" : ""}.`;
}

function formatDegree(value: number): string {
  return `${value.toFixed(2)}°`;
}

function findNatalAspectEvidence(snapshot: SynastryNatalSnapshot, pointId: string): string[] {
  const side = snapshot === undefined ? "?" : snapshot.chartId;
  return (snapshot.engineSnapshot?.aspects ?? [])
    .filter((aspect) => aspect.firstPlanetId === pointId || aspect.secondPlanetId === pointId)
    .slice(0, 3)
    .map((aspect) => `natal-aspect:${side}:${aspect.id}`);
}

function openingEvidenceIds(
  contact: SynastryInterChartAspect | null,
  overlay: SynastryHouseOverlay | null,
  fallback: string,
): string[] {
  return uniqueStrings([
    contact ? `contact:${contact.id}` : "",
    overlay ? `overlay:${overlay.id}` : "",
    fallback,
  ]);
}

function signatureEvidenceId(report: RealSynastryReport): string {
  const hasA = Boolean(report.chartA.engineSnapshot?.chartSignature);
  const hasB = Boolean(report.chartB.engineSnapshot?.chartSignature);
  return hasA || hasB ? "engine:pair:chartSignature" : "report:pair-context";
}

function buildNarrativeFingerprint(report: RealSynastryReport): string {
  const parts = [
    report.relationshipContext,
    report.chartA.chartId,
    report.chartB.chartId,
    ...report.contacts.slice(0, 8).map((contact) => contact.canonicalKey),
    ...report.houseOverlays.slice(0, 8).map((overlay) => overlay.id),
    signatureFingerprint(report.chartA),
    signatureFingerprint(report.chartB),
    advancedFingerprint(report.chartA),
    advancedFingerprint(report.chartB),
  ];
  let hash = 2166136261;
  for (const character of parts.join("|")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `pair-${hash.toString(16).padStart(8, "0")}`;
}

function signatureFingerprint(snapshot: SynastryNatalSnapshot): string {
  const signature = snapshot.engineSnapshot?.chartSignature;
  if (!signature) return "no-signature";
  return [
    signature.dominantElement,
    signature.dominantModality,
    signature.dominantExpression,
    ...signature.lowElements,
    ...signature.lowModalities,
    ...signature.lowExpressions,
  ].join(":");
}

function advancedFingerprint(snapshot: SynastryNatalSnapshot): string {
  const engine = snapshot.engineSnapshot;
  if (!engine) return "legacy-no-engine";
  const special = (engine.specialPoints ?? []).map((point) => `${point.id}:${point.status}`).join(",");
  const fixed = (engine.specialistAstrology?.fixedStars.conjunctionCandidates ?? []).map((item) => `${item.starId}:${item.anchorId}:${item.orbDegrees.toFixed(2)}`).join(",");
  const lots = (engine.specialistAstrology?.traditionalLots.lots ?? []).map((item) => `${item.id}:${item.signId}`).join(",");
  return `${special}|${fixed}|${lots}`;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}