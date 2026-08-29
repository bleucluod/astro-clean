import { buildRealEngineChartSignature } from "@/lib/astrology/real-engine-chart-signature";
import {
  buildChartProminenceProfile,
  type ChartProminenceProfile,
} from "@/lib/astrology/chart-prominence";
import {
  buildChartPatternProfile,
  mergeChartPatternsIntoProminence,
  type ChartPatternProfile,
} from "@/lib/astrology/chart-patterns";
import {
  buildChartRulershipProfile,
  type ChartRulershipProfile,
} from "@/lib/astrology/chart-rulership";
import {
  buildValidatedSupplementaryPointsProfile,
  type ValidatedSupplementaryPointsProfile,
} from "@/lib/astrology/validated-supplementary-points";
import {
  buildPersonalPlanetChapters,
  type PersonalPlanetChaptersProfile,
} from "@/lib/astrology/personal-planet-chapters";
import {
  buildWholeChartSynthesis,
  type WholeChartSynthesisProfile,
} from "@/lib/astrology/whole-chart-synthesis";
import { formatZodiacLabel } from "@/lib/astrology/zodiac-labels";
import { enhanceReportOutputV3 } from "@/lib/report-output/report-v3";
import type {
  AstrologyReport,
  RealEngineChartElement,
  RealEngineChartExpression,
  RealEngineChartModality,
  RealEngineReportAspect,
  RealEngineReportPlacement,
} from "@/types/astro";
import type { ReportOutputSection } from "@/types/report-output";
import type { HumanFirstReadingSectionId } from "@/types/human-first-reading";
import type {
  PersonalTransitReportDataBridge,
  PersonalTransitReportDataBridgeSelectedAspectSummary,
} from "@/src/lib/report-output/personal-transit-report-data-bridge";
import {
  buildPersonalTransitBehavioralInterpretation,
  selectPersonalTransitHighlights,
} from "@/src/lib/report-output/personal-transit-relevance";

export const LIVE_REPORT_READING_CONTRACT_VERSION =
  "v0.1.378-complete-birth-report" as const;

export const REPORT_READING_NAVIGATION = [
  { id: "overview", label: "تصویر کلی" },
  { id: "inner-world", label: "دنیای درونی" },
  { id: "relationships", label: "رابطه‌ها" },
  { id: "growth-path", label: "مسیر رشد" },
  { id: "chart-details", label: "جزئیات چارت" },
] as const;

export type ReportReadingNavigationId =
  (typeof REPORT_READING_NAVIGATION)[number]["id"];

export type ReportInsightOwner =
  | "personal-opening"
  | "primary-pattern"
  | "primary-strength"
  | "primary-challenge"
  | "saveable-sentence"
  | "theme-chapter"
  | "relationship-profile"
  | "growth-axis"
  | "weekly-action"
  | "reflection-question"
  | "evidence"
  | "technical-explanation"
  | "limitation";

export type ReportPrimaryPattern = {
  id: string;
  title: string;
  summary: string;
  evidence: string[];
  destination: HumanFirstReadingSectionId;
};

export type ReportValueCard = {
  title: string;
  body: string;
  evidence: string[];
};

export type ReportRelationshipGroup = {
  id: "closeness-security" | "dialogue-needs" | "boundaries-independence" | "friction-repair";
  title: string;
  paragraphs: string[];
};

export type LiveReportThemeChapter = {
  id: string;
  title: string;
  navigationId: ReportReadingNavigationId;
  summary: string;
  paragraphs: string[];
  reflection?: string;
  relationshipGroups?: ReportRelationshipGroup[];
};

export type ReportNarrativeDeepDive = {
  id: string;
  title: string;
  navigationId: ReportReadingNavigationId;
  summary: string;
  paragraphs: string[];
};

export type ReportCorePlacement = {
  id: "sun" | "moon" | "rising";
  label: string;
  position: string;
  role: string;
};

export type ReportChartSignatureSummary = {
  title: string;
  body: string;
  evidenceCount: number;
};

export type ReportGrowthAxis = {
  available: boolean;
  familiarPattern: string;
  growthDirection: string;
  bridge: string;
};

export type ReportReadingTime = {
  natalMinutes: number;
  technicalMinutes: number;
  transitMinutes: number;
  natalWordCount: number;
  technicalWordCount: number;
  transitWordCount: number;
};

export type ReportEvidenceReference = {
  id: string;
  label: string;
  detail: string;
};


export type ReportTechnicalAspectRow = {
  id: string;
  planets: string;
  type: string;
  exactAngle: number;
  separation: number;
  orb: number;
};

export function selectPrimaryNarrativeAspects(
  aspects: RealEngineReportAspect[],
  storedHighlights: RealEngineReportAspect[] = [],
): RealEngineReportAspect[] {
  const candidates = storedHighlights.length > 0 ? storedHighlights : aspects;
  const seen = new Set<string>();
  const output: RealEngineReportAspect[] = [];

  for (const aspect of candidates) {
    if (seen.has(aspect.id)) {
      continue;
    }
    seen.add(aspect.id);
    output.push(aspect);
    if (output.length === 5) {
      break;
    }
  }

  return output;
}

const STANDARD_ASPECT_LABELS: Record<RealEngineReportAspect["aspectId"], string> = {
  conjunction: "مقارنه",
  sextile: "تسدیس",
  square: "مربع",
  trine: "تثلیث",
  opposition: "مقابله",
};

export function buildTechnicalAspectRows(
  aspects: RealEngineReportAspect[],
): ReportTechnicalAspectRow[] {
  return aspects.map((aspect) => ({
    id: aspect.id,
    planets: `${aspect.firstPlanetLabel} — ${aspect.secondPlanetLabel}`,
    type: STANDARD_ASPECT_LABELS[aspect.aspectId],
    exactAngle: aspect.angle,
    separation: aspect.separation,
    orb: aspect.orb,
  }));
}

export type ReportContentOwnership = {
  owner: ReportInsightOwner;
  id: string;
  normalizedText: string;
  role: "owner" | "reference";
  sourceOwnerId?: string;
};

export type LiveReportReadingContract = {
  displayName: string;
  personalOpening: string[];
  chartSignature: ReportChartSignatureSummary;
  prominence: ChartProminenceProfile;
  chartPatterns: ChartPatternProfile;
  rulership: ChartRulershipProfile;
  supplementaryPoints: ValidatedSupplementaryPointsProfile;
  personalPlanetChapters: PersonalPlanetChaptersProfile;
  wholeChartSynthesis: WholeChartSynthesisProfile;
  corePlacements: ReportCorePlacement[];
  primaryPatterns: ReportPrimaryPattern[];
  primaryStrength: ReportValueCard;
  primaryChallenge: ReportValueCard;
  saveableSentence: string;
  recommendedReadingPath: string[];
  themeChapters: LiveReportThemeChapter[];
  deepDiveSections: ReportNarrativeDeepDive[];
  relationshipProfile: ReportRelationshipGroup[];
  growthAxis: ReportGrowthAxis;
  weeklyActions: string[];
  reflectionQuestions: string[];
  limitations: string[];
  evidenceReferences: ReportEvidenceReference[];
  readingTime: ReportReadingTime;
  navigation: typeof REPORT_READING_NAVIGATION;
  contentOwnership: ReportContentOwnership[];
  hasReliableBirthTime: boolean;
  hasTransit: boolean;
};

type ReportWithTransit = AstrologyReport & {
  engineData?: {
    personalTransitReportData?: PersonalTransitReportDataBridge | null;
  } | null;
};

type ChapterSpec = {
  id: string;
  title: string;
  navigationId: ReportReadingNavigationId;
  patternTitle?: string;
};

const SECTION_IDS = {
  summary: "real-engine-first-synthesis",
  core: "real-engine-core-pattern",
  chartRuler: "real-engine-chart-ruler",
  houses: "real-engine-active-houses",
  nodes: "real-engine-node-axis",
  balance: "real-engine-balance",
  practices: "real-engine-personal-summary",
} as const;

const CHAPTER_SPECS: ChapterSpec[] = [
  {
    id: "real-engine-theme-signature",
    title: "تصویر کلی و امضای چارت",
    navigationId: "overview",
    patternTitle: "نحوهٔ دیده‌شدن و جهت‌گیری",
  },
  {
    id: "real-engine-theme-emotional-security",
    title: "احساسات و امنیت درونی",
    navigationId: "inner-world",
    patternTitle: "ریتم امنیت درونی",
  },
  {
    id: "real-engine-theme-mind-language",
    title: "ذهن و زبان",
    navigationId: "inner-world",
  },
  {
    id: "real-engine-theme-relationship-style",
    title: "رابطه و صمیمیت",
    navigationId: "relationships",
    patternTitle: "شیوهٔ نزدیک‌شدن",
  },
  {
    id: "real-engine-theme-will-action",
    title: "اراده و حرکت",
    navigationId: "growth-path",
  },
  {
    id: "real-engine-theme-direction-path",
    title: "جهت و مسیر",
    navigationId: "growth-path",
  },
  {
    id: "real-engine-theme-recurring-patterns",
    title: "الگوهای تکرارشونده و تمرین‌ها",
    navigationId: "growth-path",
    patternTitle: "الگوی تکرارشونده",
  },
];

const ELEMENT_LABELS: Record<RealEngineChartElement, string> = {
  fire: "آتش",
  earth: "زمین",
  air: "هوا",
  water: "آب",
};

const MODALITY_LABELS: Record<RealEngineChartModality, string> = {
  cardinal: "آغازگر",
  fixed: "پایدار",
  mutable: "انعطاف‌پذیر",
};

const EXPRESSION_LABELS: Record<RealEngineChartExpression, string> = {
  active: "فعال و بیرونی",
  receptive: "دریافت‌گر و درونی",
};

const FALLBACK_WEEKLY_ACTIONS = [
  "یک الگوی تکرارشونده را در یک موقعیت واقعی ثبت کن.",
  "پیش از واکنش، نام احساس و نیاز اصلی را جداگانه بنویس.",
  "در پایان هفته بررسی کن کدام انتخاب کوچک بیشتر به تو کمک کرد.",
];

const FALLBACK_PRIMARY_PATTERNS: ReportPrimaryPattern[] = [
  {
    id: "pattern-signature",
    destination: "overview",
    title: "امضای کلی",
    summary: "جایگاه‌های اصلی چارت نشان می‌دهند چه کیفیتی زودتر دیده می‌شود و چه نیازی پشت انتخاب‌ها قرار دارد.",
    evidence: [],
  },
  {
    id: "pattern-emotional-security",
    destination: "inner-world",
    title: "امنیت درونی",
    summary: "ماه و خانهٔ آن کمک می‌کنند ریتم احساس، آرام‌شدن و درخواست حمایت روشن‌تر شود.",
    evidence: [],
  },
  {
    id: "pattern-recurring",
    destination: "growth-path",
    title: "الگوی تکرارشونده",
    summary: "رابطه‌های اصلی سیاره‌ها نشان می‌دهند کدام دو نیاز بارها به تنظیم و گفت‌وگو احتیاج دارند.",
    evidence: [],
  },
];

class OwnershipRegistry {
  private readonly entries: ReportContentOwnership[] = [];

  claim(owner: ReportInsightOwner, id: string, text: string): string | null {
    const sanitized = sanitizeReportText(text);
    const normalized = normalizeReportText(sanitized);

    if (!normalized || this.hasOwnedSemanticMatch(normalized)) {
      return null;
    }

    this.entries.push({ owner, id, normalizedText: normalized, role: "owner" });
    return sanitized;
  }

  reference(
    owner: ReportInsightOwner,
    id: string,
    text: string,
    sourceOwnerId: string,
  ): string | null {
    const sanitized = sanitizeReportText(text);
    const normalized = normalizeReportText(sanitized);

    if (!normalized || this.hasReferenceMatch(owner, normalized)) {
      return null;
    }

    this.entries.push({
      owner,
      id,
      normalizedText: normalized,
      role: "reference",
      sourceOwnerId,
    });
    return sanitized;
  }

  list(): ReportContentOwnership[] {
    return [...this.entries];
  }

  private hasOwnedSemanticMatch(candidate: string): boolean {
    return this.entries.some(({ normalizedText, role }) =>
      role === "owner" && normalizedText === candidate,
    );
  }

  private hasReferenceMatch(owner: ReportInsightOwner, candidate: string): boolean {
    return this.entries.some(({ normalizedText, role, owner: existingOwner }) =>
      role === "reference" &&
      existingOwner === owner &&
      normalizedText === candidate,
    );
  }
}

export function normalizeReportText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u200c\u200f\u202a-\u202e]/gu, "")
    .replace(/[\s\u00a0]+/gu, " ")
    .replace(/[.،؛:!?؟«»()\[\]{}\-–—]/gu, "")
    .trim()
    .toLocaleLowerCase("fa-IR");
}

export function sanitizeReportText(value: string): string {
  const tokens = value
    .replace(/[\s\u00a0]+/gu, " ")
    .trim()
    .split(" ");
  const output: string[] = [];

  for (const token of tokens) {
    if (output.length > 0 && normalizeReportText(output.at(-1) ?? "") === normalizeReportText(token)) {
      continue;
    }
    output.push(token);
  }

  return output
    .join(" ")
    .replace(/ممکن است\s+ممکن است/gu, "ممکن است")
    .replace(/میدان\s+میدان‌های/gu, "میدان‌های")
    .replace(/([.!؟])\s*\1+/gu, "$1")
    .trim();
}

export function calculateReadingMinutes(wordCount: number, wordsPerMinute = 180): number {
  if (wordCount <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

function semanticSimilarity(first: string, second: string): number {
  const firstTokens = new Set(first.split(" ").filter((token) => token.length > 2));
  const secondTokens = new Set(second.split(" ").filter((token) => token.length > 2));

  if (firstTokens.size === 0 || secondTokens.size === 0) {
    return 0;
  }

  const intersection = [...firstTokens].filter((token) => secondTokens.has(token)).length;
  const union = new Set([...firstTokens, ...secondTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function splitParagraphs(body: string): string[] {
  return body
    .replace(/\s+(چطور بخوانی:)/gu, "\n\n$1")
    .replace(/\s+(خلاصه فصل:)/gu, "\n\n$1")
    .replace(/\s+(برای تأمل:)/gu, "\n\n$1")
    .split(/\n{2,}/u)
    .map((part) => sanitizeReportText(part))
    .filter(Boolean);
}

function splitSentences(text: string): string[] {
  return (text.match(/[^.!؟]+[.!؟]?/gu) ?? [])
    .map((sentence) => sanitizeReportText(sentence))
    .filter((sentence) => sentence.length >= 24)
    .map((sentence) => (/[.!؟]$/u.test(sentence) ? sentence : `${sentence}.`));
}

function isReaderCue(paragraph: string): boolean {
  return /^(چطور بخوانی:|خلاصه فصل:)/u.test(paragraph);
}

function isReflection(paragraph: string): boolean {
  return /^برای تأمل:/u.test(paragraph);
}

function isEvidence(paragraph: string): boolean {
  return /^(پشتوانه اصلی:|پشتوانه محاسبه:)/u.test(paragraph);
}

function stripPrefix(paragraph: string, expression: RegExp): string {
  return paragraph.replace(expression, "").trim();
}

function getSection(
  sections: ReportOutputSection[],
  id: string,
): ReportOutputSection | undefined {
  return sections.find((section) => section.id === id);
}

function getSectionParagraphs(section: ReportOutputSection | undefined): string[] {
  if (!section) {
    return [];
  }
  return splitParagraphs(section.body).filter(
    (paragraph) => !isReaderCue(paragraph) && !isReflection(paragraph) && !isEvidence(paragraph),
  );
}

function getSectionReflection(section: ReportOutputSection | undefined): string | undefined {
  const reflection = splitParagraphs(section?.body ?? "").find(isReflection);
  return reflection ? stripPrefix(reflection, /^برای تأمل:\s*/u) : undefined;
}

function getSectionEvidence(section: ReportOutputSection | undefined): string[] {
  return splitParagraphs(section?.body ?? "")
    .filter(isEvidence)
    .map((paragraph) => stripPrefix(paragraph, /^(پشتوانه اصلی:|پشتوانه محاسبه:)\s*/u));
}

function claimSentences(
  registry: OwnershipRegistry,
  owner: ReportInsightOwner,
  id: string,
  text: string,
  limit: number,
): string[] {
  const output: string[] = [];

  for (const sentence of splitSentences(text)) {
    const claimed = registry.claim(owner, `${id}-${output.length + 1}`, sentence);
    if (claimed) {
      output.push(claimed);
    }
    if (output.length === limit) {
      break;
    }
  }

  return output;
}

function claimParagraphs(
  registry: OwnershipRegistry,
  owner: ReportInsightOwner,
  id: string,
  paragraphs: string[],
): string[] {
  const output: string[] = [];

  for (const paragraph of paragraphs) {
    const claimed = registry.claim(
      owner,
      `${id}-paragraph-${output.length + 1}`,
      paragraph,
    );
    if (claimed) {
      output.push(claimed);
    }
  }

  return output;
}

function findParagraph(paragraphs: string[], pattern: RegExp): string | undefined {
  return paragraphs.find((paragraph) => pattern.test(paragraph));
}

function buildRelationshipGroups(
  section: ReportOutputSection | undefined,
  registry: OwnershipRegistry,
): ReportRelationshipGroup[] {
  const paragraphs = getSectionParagraphs(section);
  const groups: Array<{
    id: ReportRelationshipGroup["id"];
    title: string;
    patterns: RegExp[];
  }> = [
    {
      id: "closeness-security",
      title: "نزدیکی و امنیت",
      patterns: [/^نزدیک‌شدن:/u, /^امنیت:/u, /^ریتم صمیمیت:/u],
    },
    {
      id: "dialogue-needs",
      title: "گفت‌وگو و بیان خواسته",
      patterns: [/^گفت‌وگو:/u],
    },
    {
      id: "boundaries-independence",
      title: "مرز و استقلال",
      patterns: [/^مرز:/u, /^استقلال:/u],
    },
    {
      id: "friction-repair",
      title: "اصطکاک و ترمیم",
      patterns: [/^اصطکاک محتمل:/u, /^ترمیم و همکاری:/u],
    },
  ];

  return groups.map((group) => {
    const selected = group.patterns
      .map((pattern) => findParagraph(paragraphs, pattern))
      .filter((paragraph): paragraph is string => Boolean(paragraph))
      .map((paragraph) => stripPrefix(paragraph, /^[^:]+:\s*/u));
    const owned = claimParagraphs(
      registry,
      "relationship-profile",
      group.id,
      selected,
    );

    return {
      id: group.id,
      title: group.title,
      paragraphs:
        owned.length > 0
          ? owned
          : [`در نسخهٔ فعلی دادهٔ کافی برای توضیح شخصیِ «${group.title}» ثبت نشده است.`],
    };
  });
}


function ensureSentence(value: string): string {
  const cleaned = sanitizeReportText(value);
  return !cleaned || /[.!؟]$/u.test(cleaned) ? cleaned : `${cleaned}.`;
}

function buildPrimaryPatternSummary(
  specId: (typeof CHAPTER_SPECS)[number]["id"],
  source: string,
  evidence: string | undefined,
  report: AstrologyReport,
): string {
  if (
    specId === "real-engine-theme-signature" &&
    !hasReliableBirthTime(report)
  ) {
    const sun = getPlacement(report, "sun");
    const moon = getPlacement(report, "moon");
    const independentPositions = [
      sun ? `خورشید ${formatZodiacLabel(sun.signId)}` : null,
      moon ? `ماه ${formatZodiacLabel(moon.signId)}` : null,
    ].filter((item): item is string => Boolean(item));
    return independentPositions.length > 0
      ? `${independentPositions.join(" و ")} داده‌های اصلیِ مستقل از ساعت تولد در این نسخه‌اند.`
      : "این نسخه فقط جایگاه‌های مستقل از ساعت تولد را نگه می‌دارد و رایزینگ یا خانه‌ها را حدس نمی‌زند.";
  }

  const cleanEvidence = evidence
    ?.split("؛")[0]
    ?.replace(/[.!؟]+$/u, "")
    .trim();

  if (cleanEvidence) {
    if (specId === "real-engine-theme-signature") {
      return `${cleanEvidence}؛ چیزی که دیگران زودتر می‌بینند همیشه با ریتم تصمیم‌های درونی یکی نیست.`;
    }
    if (specId === "real-engine-theme-emotional-security") {
      return `${cleanEvidence}؛ اینجا ریتم آرام‌شدن، اعتماد و درخواست حمایت روشن‌تر می‌شود.`;
    }
    if (specId === "real-engine-theme-recurring-patterns") {
      return `${cleanEvidence}؛ این تماس نشان می‌دهد کدام دو نیاز در موقعیت‌های مختلف دوباره به تنظیم برمی‌گردند.`;
    }
  }

  const firstSentence = splitSentences(source)[0] ?? ensureSentence(source);
  return `در زندگی روزمره، ${firstSentence.replace(/^ممکن است\s*/u, "")}`;
}

function buildChapterSummary(
  spec: (typeof CHAPTER_SPECS)[number],
  section: ReportOutputSection | undefined,
): string {
  if (spec.id === "real-engine-theme-relationship-style") {
    return "نزدیکی، امنیت، گفت‌وگو، مرز و ترمیم در یک چارت؛ نه قضاوت دربارهٔ سازگاری دو نفر.";
  }

  const evidence = getSectionEvidence(section)[0];
  if (evidence) {
    return ensureSentence(evidence);
  }

  return `خوانش «${section?.title ?? spec.title}» فقط تا جایی پیش می‌رود که دادهٔ ذخیره‌شده اجازه می‌دهد.`;
}

function buildValueReference(value: string, kind: "strength" | "challenge"): string {
  const cleaned = sanitizeReportText(value);
  if (kind === "strength") {
    const body = cleaned.replace(/^وقتی این بخش خوب کار می‌کند،?\s*/u, "");
    return ensureSentence(`توان برجستهٔ این بخش: ${body}`);
  }

  const body = cleaned.replace(/^زیر فشار،?\s*/u, "");
  return ensureSentence(`چالش برجستهٔ این بخش: ${body}`);
}

function buildLegacyChapterParagraph(
  spec: (typeof CHAPTER_SPECS)[number],
  report: AstrologyReport,
): string {
  const sun = report.chart.sunSign.faName;
  const moon = report.chart.moonSign.faName;
  const rising = report.chart.risingSign.faName;

  switch (spec.id) {
    case "real-engine-theme-signature":
      return `این نسخهٔ قدیمی فقط خورشید ${sun}، ماه ${moon} و رایزینگ ${rising} را به‌عنوان سه نقطهٔ شروع نگه داشته است؛ امضای کامل بدون جایگاه‌های محاسبه‌شده ساخته نمی‌شود.`;
    case "real-engine-theme-emotional-security":
      return `برای احساسات و امنیت درونی، این نسخه فقط ماه ${moon} را ثبت کرده است؛ خانه، جنبه‌ها و شواهد تکمیلی حدس زده نمی‌شوند.`;
    case "real-engine-theme-mind-language":
      return "دادهٔ کامل عطارد و خانهٔ آن در این نسخهٔ قدیمی موجود نیست؛ بنابراین سبک ذهن و زبان به‌جای تفسیر ساختگی، محدود و شفاف می‌ماند.";
    case "real-engine-theme-will-action":
      return "دادهٔ کامل مریخ و تماس‌های آن در این نسخه موجود نیست؛ فصل اراده فقط مرز داده را توضیح می‌دهد و الگوی رفتاری تازه اختراع نمی‌کند.";
    case "real-engine-theme-direction-path":
      return `در این نسخه، جهت کلی فقط از خورشید ${sun} و رایزینگ ${rising} شروع می‌شود؛ مسیر خانه‌ها و سیارهٔ راهبر بدون دادهٔ معتبر بازسازی نمی‌شود.`;
    case "real-engine-theme-recurring-patterns":
      return "فهرست کامل جنبه‌ها در این نسخهٔ قدیمی ذخیره نشده است؛ الگوهای تکرارشونده و تمرین‌های شخصی فقط پس از ساخت گزارش محاسبه‌شده قابل رتبه‌بندی‌اند.";
    default:
      return "این بخش در نسخهٔ قدیمی دادهٔ کافی ندارد و به‌جای متن عمومی، محدودیت آن آشکار نمایش داده می‌شود.";
  }
}

function buildLegacyPrimaryPatterns(report: AstrologyReport): ReportPrimaryPattern[] {
  return [
    {
      id: "pattern-signature",
    destination: "overview",
      title: "سه نقطهٔ پایه",
      summary: `خورشید ${report.chart.sunSign.faName}، ماه ${report.chart.moonSign.faName} و رایزینگ ${report.chart.risingSign.faName} داده‌های پایهٔ این نسخه‌اند.`,
      evidence: [],
    },
    {
      id: "pattern-emotional-security",
    destination: "inner-world",
      title: "مرز خوانش درونی",
      summary: `ماه ${report.chart.moonSign.faName} ثبت شده، اما خانه و تماس‌های تکمیلی در نسخهٔ قدیمی موجود نیستند.`,
      evidence: [],
    },
    {
      id: "pattern-recurring",
    destination: "growth-path",
      title: "الگوهای تکرارشونده",
      summary: "بدون فهرست معتبر جنبه‌ها، این نسخه الگوی تکرارشونده یا تمرین شخصی تازه‌ای را حدس نمی‌زند.",
      evidence: [],
    },
  ];
}

function buildThemeChapters(
  sections: ReportOutputSection[],
  registry: OwnershipRegistry,
  relationshipProfile: ReportRelationshipGroup[],
  report: AstrologyReport,
): LiveReportThemeChapter[] {
  return CHAPTER_SPECS.map((spec) => {
    const section = getSection(sections, spec.id);
    const rawParagraphs = getSectionParagraphs(section);
    const sourceParagraphs = rawParagraphs.length > 0
      ? rawParagraphs
      : [buildLegacyChapterParagraph(spec, report)];
    const paragraphs = spec.id === "real-engine-theme-relationship-style"
      ? []
      : claimParagraphs(
          registry,
          "theme-chapter",
          spec.id,
          sourceParagraphs,
        );
    const summarySource = buildChapterSummary(spec, section);
    const summary =
      registry.reference(
        "theme-chapter",
        `${spec.id}-summary`,
        summarySource,
        spec.id === "real-engine-theme-relationship-style"
          ? "relationship-profile"
          : `${spec.id}-body`,
      ) ?? summarySource;

    return {
      id: spec.id,
      title: section?.title || spec.title,
      navigationId: spec.navigationId,
      summary,
      paragraphs,
      reflection: getSectionReflection(section),
      ...(spec.id === "real-engine-theme-relationship-style"
        ? { relationshipGroups: relationshipProfile }
        : {}),
    };
  });
}

const DEEP_DIVE_SPECS: Array<{
  id: string;
  sectionId: string;
  title: string;
  navigationId: ReportReadingNavigationId;
}> = [
  {
    id: "whole-chart-story",
    sectionId: SECTION_IDS.summary,
    title: "روایت یکپارچهٔ چارت",
    navigationId: "overview",
  },
  {
    id: "chart-ruler-story",
    sectionId: SECTION_IDS.chartRuler,
    title: "سیارهٔ راهبر در زندگی روزمره",
    navigationId: "overview",
  },
  {
    id: "balance-story",
    sectionId: SECTION_IDS.balance,
    title: "ترکیب انرژی‌ها و ریتم واکنش",
    navigationId: "inner-world",
  },
  {
    id: "active-houses-story",
    sectionId: SECTION_IDS.houses,
    title: "میدان‌های پررنگ زندگی",
    navigationId: "growth-path",
  },
  {
    id: "node-axis-story",
    sectionId: SECTION_IDS.nodes,
    title: "الگوی آشنا و جهت تمرین",
    navigationId: "growth-path",
  },
];

function cleanDeepDiveParagraph(
  sectionId: string,
  paragraph: string,
  paragraphIndex: number,
): string | null {
  if (sectionId === SECTION_IDS.summary) {
    if (/^تمرین این هفته:/u.test(paragraph)) {
      return null;
    }
    const withoutRepeatedOpening = paragraphIndex === 0
      ? splitSentences(paragraph).slice(2).join(" ")
      : paragraph;
    return ensureSentence(
      withoutRepeatedOpening.replace(
        /^(کشمکش اصلی:|الگوی خوشه‌ای:|منبع همراه:|ترجمهٔ روزمره:)\s*/u,
        "",
      ),
    );
  }
  return paragraph;
}

function buildDeepDiveSections(
  sections: ReportOutputSection[],
  registry: OwnershipRegistry,
): ReportNarrativeDeepDive[] {
  return DEEP_DIVE_SPECS.flatMap((spec) => {
    const section = getSection(sections, spec.sectionId);
    const sourceParagraphs = getSectionParagraphs(section)
      .map((paragraph, paragraphIndex) =>
        cleanDeepDiveParagraph(spec.sectionId, paragraph, paragraphIndex),
      )
      .filter((paragraph): paragraph is string => Boolean(paragraph));
    const paragraphs = claimParagraphs(
      registry,
      "theme-chapter",
      `deep-dive-${spec.id}`,
      sourceParagraphs,
    );
    if (paragraphs.length === 0) {
      return [];
    }
    const summary = getSectionReflection(section)
      ? ensureSentence(getSectionReflection(section) ?? "")
      : ensureSentence(getSectionEvidence(section)[0] ?? paragraphs[0]);
    return [{
      id: spec.id,
      title: spec.title,
      navigationId: spec.navigationId,
      summary,
      paragraphs,
    }];
  });
}

function buildPrimaryPatterns(
  sections: ReportOutputSection[],
  chapters: LiveReportThemeChapter[],
  registry: OwnershipRegistry,
  report: AstrologyReport,
  prominence: ChartProminenceProfile,
): ReportPrimaryPattern[] {
  const prominencePatterns = prominence.signatures.map(
    (signature, index): ReportPrimaryPattern => ({
      id: signature.id,
      title: signature.title,
      summary:
        registry.claim(
          "primary-pattern",
          `prominence-pattern-${index + 1}`,
          signature.summary,
        ) ?? signature.summary,
      evidence: signature.evidence.slice(0, 3),
      destination: signature.destination,
    }),
  );

  const preferredIds = new Set([
    "real-engine-theme-signature",
    "real-engine-theme-emotional-security",
    "real-engine-theme-recurring-patterns",
  ]);
  const preferred = CHAPTER_SPECS.filter((spec) => preferredIds.has(spec.id));
  const chapterPatterns = preferred.flatMap((spec, index) => {
    const section = getSection(sections, spec.id);
    const chapter = chapters.find((item) => item.id === spec.id);
    const source = getSectionParagraphs(section)[0];
    if (!source || !chapter) {
      return [];
    }
    const evidence = getSectionEvidence(section).slice(0, 2);
    const summary = registry.reference(
      "primary-pattern",
      `chapter-pattern-${index + 1}`,
      buildPrimaryPatternSummary(spec.id, source, evidence[0], report),
      spec.id,
    );
    if (!summary) {
      return [];
    }
    const destination: HumanFirstReadingSectionId =
      spec.id === "real-engine-theme-emotional-security"
        ? "inner-world"
        : spec.id === "real-engine-theme-recurring-patterns"
          ? "growth-path"
          : "overview";
    return [{
      id: `chapter-pattern-${index + 1}`,
      title: spec.patternTitle ?? spec.title,
      summary,
      evidence,
      destination,
    }];
  });

  const fallbackPatterns = report.realEngine
    ? FALLBACK_PRIMARY_PATTERNS
    : buildLegacyPrimaryPatterns(report);

  return [...prominencePatterns, ...chapterPatterns, ...fallbackPatterns]
    .filter((pattern, index, collection) =>
      collection.findIndex((item) => item.id === pattern.id) === index,
    )
    .slice(0, 3);
}

function buildValueCard(
  sections: ReportOutputSection[],
  registry: OwnershipRegistry,
  kind: "strength" | "challenge",
): ReportValueCard {
  const chapterIds = kind === "strength"
    ? ["real-engine-theme-mind-language", "real-engine-theme-will-action"]
    : ["real-engine-theme-emotional-security", "real-engine-theme-recurring-patterns"];
  const pattern = kind === "strength" ? /^وقتی این بخش خوب کار می‌کند/u : /^زیر فشار/u;

  for (const chapterId of chapterIds) {
    const section = getSection(sections, chapterId);
    const paragraph = findParagraph(getSectionParagraphs(section), pattern);
    if (!paragraph) {
      continue;
    }
    const body = registry.reference(
      kind === "strength" ? "primary-strength" : "primary-challenge",
      `primary-${kind}`,
      buildValueReference(paragraph, kind),
      chapterId,
    ) ?? "";
    if (body) {
      return {
        title: kind === "strength" ? "نقطهٔ قوت اصلی" : "چالش اصلی",
        body,
        evidence: getSectionEvidence(section).slice(0, 2),
      };
    }
  }

  return {
    title: kind === "strength" ? "نقطهٔ قوت اصلی" : "چالش اصلی",
    body:
      kind === "strength"
        ? "توان اصلی این چارت در تبدیل مشاهده به یک انتخاب کوچک و قابل انجام دیده می‌شود."
        : "چالش اصلی این است که دو نیاز واقعی پیش از روشن‌شدن، جای یکدیگر را نگیرند.",
    evidence: [],
  };
}

function buildPersonalOpening(
  sections: ReportOutputSection[],
  registry: OwnershipRegistry,
): string[] {
  const summarySection = getSection(sections, SECTION_IDS.summary);
  const firstParagraph = getSectionParagraphs(summarySection)[0] ?? "";
  const opening = claimSentences(registry, "personal-opening", "personal-opening", firstParagraph, 2);

  return opening.length > 0
    ? opening
    : ["این گزارش از چند الگوی محاسبه‌شدهٔ چارت شروع می‌کند تا تصویر کلی پیش از جزئیات روشن باشد."];
}

function buildSaveableSentence(
  sections: ReportOutputSection[],
  registry: OwnershipRegistry,
  primaryStrength: ReportValueCard,
  prominence: ChartProminenceProfile,
): string {
  if (prominence.signatures.length > 0) {
    const rankedSentence = registry.claim(
      "saveable-sentence",
      "prominence-chart-sentence",
      prominence.chartSentence,
    );
    if (rankedSentence) return rankedSentence;
  }

  const summaryParagraphs = getSectionParagraphs(getSection(sections, SECTION_IDS.summary));
  const candidates = summaryParagraphs.flatMap(splitSentences).slice(2);

  for (const candidate of candidates) {
    const claimed = registry.claim("saveable-sentence", "saveable-sentence", candidate);
    if (claimed) {
      return claimed;
    }
  }

  return primaryStrength.evidence[0]
    ? `یادآوری این چارت: ${primaryStrength.evidence[0]} را به یک انتخاب کوچک و قابل مشاهده وصل کن.`
    : "یادآوری این چارت: یک انتخاب کوچک و قابل مشاهده از یک تعریف ثابت دربارهٔ خودت مفیدتر است.";
}

function buildWeeklyActions(
  sections: ReportOutputSection[],
  registry: OwnershipRegistry,
): string[] {
  const section = getSection(sections, SECTION_IDS.practices);
  const match = section?.body.match(
    /سه تمرین کوچک این چارت:\s*۱\)\s*(.*?)؛\s*۲\)\s*(.*?)؛\s*۳\)\s*(.*?)(?:\.|\n|$)/u,
  );
  const candidates = match
    ? match.slice(1, 4).map((action) => sanitizeReportText(action))
    : FALLBACK_WEEKLY_ACTIONS;
  const output = candidates.flatMap((action, index) => {
    const claimed = registry.claim("weekly-action", `weekly-action-${index + 1}`, action);
    return claimed ? [claimed] : [];
  });

  return [...output, ...FALLBACK_WEEKLY_ACTIONS]
    .filter((action, index, collection) =>
      collection.findIndex((item) => normalizeReportText(item) === normalizeReportText(action)) === index,
    )
    .slice(0, 3);
}

function buildReflectionQuestions(
  sections: ReportOutputSection[],
  registry: OwnershipRegistry,
): string[] {
  const preferredIds = CHAPTER_SPECS.map((chapter) => chapter.id);
  const seen = new Set<string>();
  const output: string[] = [];

  for (const id of preferredIds) {
    const reflection = getSectionReflection(getSection(sections, id));
    const normalized = normalizeReportText(reflection ?? "");
    if (!reflection || !normalized || seen.has(normalized)) {
      continue;
    }
    const claimed = registry.claim(
      "reflection-question",
      `reflection-question-${output.length + 1}`,
      reflection,
    );
    if (!claimed) {
      continue;
    }
    seen.add(normalized);
    output.push(claimed);
    if (output.length === 3) {
      break;
    }
  }

  return output;
}

function buildChartSignature(report: AstrologyReport): ReportChartSignatureSummary {
  const placements = report.realEngine?.placements ?? [];
  const signature =
    report.realEngine?.chartSignature ??
    (placements.length > 0 ? buildRealEngineChartSignature(placements) : null);
  if (!signature) {
    return {
      title: "امضای چارت از سه جایگاه پایه",
      body: `خورشید ${report.chart.sunSign.faName}، ماه ${report.chart.moonSign.faName} و رایزینگ ${report.chart.risingSign.faName} نقطهٔ شروع این خوانش‌اند.`,
      evidenceCount: 3,
    };
  }

  const titleParts = [
    signature.dominantElement ? ELEMENT_LABELS[signature.dominantElement] : null,
    signature.dominantModality ? MODALITY_LABELS[signature.dominantModality] : null,
    signature.dominantExpression ? EXPRESSION_LABELS[signature.dominantExpression] : null,
  ].filter((part): part is string => Boolean(part));
  const lowElement = signature.lowElements[0];

  return {
    title:
      titleParts.length === 1
        ? `ریتم غالب چارت: ${titleParts[0]}`
        : titleParts.length > 1
          ? `امضای غالب: ${titleParts.join(" · ")}`
          : "ترکیب متعادل چند کیفیت",
    body: lowElement
      ? `کیفیت ${ELEMENT_LABELS[lowElement]} کم‌حضورتر است؛ این تفاوت نقص نیست و فقط نشان می‌دهد آن ریتم به توجه آگاهانه‌تری نیاز دارد.`
      : "هیچ کیفیت واحدی تمام چارت را در اختیار ندارد؛ امضا از کنار هم گذاشتن چند ریتم شکل می‌گیرد.",
    evidenceCount: signature.evidence.length,
  };
}

function getPlacement(report: AstrologyReport, id: string): RealEngineReportPlacement | undefined {
  return report.realEngine?.placements.find((placement) => placement.id === id);
}

function formatPlacementPosition(
  report: AstrologyReport,
  id: "sun" | "moon" | "rising",
): string {
  if (id === "rising") {
    const angle = report.realEngine?.angles?.asc;
    return angle
      ? `${formatZodiacLabel(angle.signId)}، درجه ${formatPersianNumber(angle.degreeInSign)}`
      : formatZodiacLabel(report.chart.risingSign.key);
  }

  const placement = getPlacement(report, id);
  if (!placement) {
    return formatZodiacLabel(id === "sun" ? report.chart.sunSign.key : report.chart.moonSign.key);
  }

  const house = typeof placement.house === "number"
    ? `، خانه ${formatPersianNumber(placement.house)}`
    : "";
  return `${formatZodiacLabel(placement.signId)}، درجه ${formatPersianNumber(placement.degreeInSign)}${house}`;
}

function buildCorePlacements(report: AstrologyReport): ReportCorePlacement[] {
  const risingPosition = hasReliableBirthTime(report)
    ? formatPlacementPosition(report, "rising")
    : "نامشخص؛ ساعت تولد معتبر در دسترس نیست";

  return [
    { id: "sun", label: "خورشید", position: formatPlacementPosition(report, "sun"), role: "هویت و جهت" },
    { id: "moon", label: "ماه", position: formatPlacementPosition(report, "moon"), role: "احساس و امنیت" },
    { id: "rising", label: "رایزینگ", position: risingPosition, role: "ورود و تصویر اولیه" },
  ];
}

function formatNodePosition(node: { signId: Parameters<typeof formatZodiacLabel>[0]; degreeInSign: number; house?: number | null }): string {
  return `${formatZodiacLabel(node.signId)}، درجه ${formatPersianNumber(node.degreeInSign)}${
    typeof node.house === "number" ? `، خانه ${formatPersianNumber(node.house)}` : ""
  }`;
}

function buildGrowthAxis(report: AstrologyReport): ReportGrowthAxis {
  const nodes = report.realEngine?.lunarNodes;
  if (
    !nodes ||
    nodes.status !== "calculated" ||
    !("northNode" in nodes) ||
    !("southNode" in nodes)
  ) {
    return {
      available: false,
      familiarPattern: "الگوی آشنا در دادهٔ این نسخه کامل ثبت نشده است.",
      growthDirection: "جهت رشد بدون دادهٔ معتبر حدس زده نمی‌شود.",
      bridge: "در این نسخه فقط تمرین‌های رفتاری فصل رشد را دنبال کن.",
    };
  }

  return {
    available: true,
    familiarPattern: formatNodePosition(nodes.southNode),
    growthDirection: formatNodePosition(nodes.northNode),
    bridge: "از پاسخ آشنا به سمت یک رفتار کوچک، تازه و قابل تکرار حرکت کن؛ لازم نیست توانایی‌های قبلی را انکار کنی.",
  };
}

function hasReliableBirthTime(report: AstrologyReport): boolean {
  if (report.input.birthTimeAccuracy === "unknown") return false;
  const value = report.input.birthTime?.trim().toLocaleLowerCase("fa-IR") ?? "";
  return Boolean(value) && !["unknown", "نامشخص", "--:--", "00:00?"].includes(value);
}

function getTransitData(report: AstrologyReport): PersonalTransitReportDataBridge | null {
  return (report as ReportWithTransit).engineData?.personalTransitReportData ?? null;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

const TRANSIT_VISIBLE_FOUNDATION_COPY = [
  "آسمان زمان ساخت گزارش نسبت به چارت تولد تو",
  "این بخش آسمانی را که هنگام ساخت گزارش ثبت شده روی همان چارت تولد می‌گذارد. داده قدیمی هنگام بازکردن دوباره با برچسب امروز نمایش داده نمی‌شود.",
  "چارت تولد از محل و زمان تولد می‌آید و زمان ترنزیت از محل زندگی فعلی؛ هالیوس تهران را بی‌اجازه جایگزین محل فعلی نمی‌کند.",
  "این خوانش فقط یک نشانه موقت برای توجه است و رویداد قطعی یا پیش‌بینی آینده نمی‌سازد.",
] as const;

function getTransitVisibleHighlights(
  transit: PersonalTransitReportDataBridge,
): PersonalTransitReportDataBridgeSelectedAspectSummary[] {
  if (Array.isArray(transit.visibleAspectHighlights)) {
    return transit.visibleAspectHighlights.slice(0, 5);
  }

  const audienceMode = transit.audienceMode ?? "adult";
  return selectPersonalTransitHighlights(transit.aspectHighlights, {
    audienceMode,
    maxVisible: 5,
  }).map((aspect) => ({
    ...aspect,
    relevanceScore: 0,
    interpretation: buildPersonalTransitBehavioralInterpretation(
      aspect,
      audienceMode,
    ),
  }));
}

export function buildTransitVisibleWordCount(
  transit: PersonalTransitReportDataBridge | null,
): number {
  if (!transit) {
    return 0;
  }

  const highlights = getTransitVisibleHighlights(transit);
  const themes = Array.from(
    new Set(highlights.map((aspect) => aspect.interpretation.theme)),
  );
  const contextText = [
    ...TRANSIT_VISIBLE_FOUNDATION_COPY,
    transit.location.birthPlaceName ?? "محل تولد ثبت نشده",
    transit.location.birthTimezone ?? "",
    transit.location.currentResidencePlaceName ?? "محل زندگی فعلی ثبت نشده",
    transit.location.currentResidenceTimezone ?? "",
    transit.transitLocalDate ?? "زمان ساخت گزارش",
    transit.sampleLocalTime ?? "",
    transit.status === "missing-current-residence"
      ? "برای تعیین زمان محلی این بخش، محل زندگی فعلی لازم است و تا ثبت آن هالیوس ادعای شخصی درباره ترنزیت نمی‌سازد."
      : transit.status === "partial-no-aspects"
        ? "در محدوده رابطه‌های اصلی و اورب‌های تعریف‌شده تماس نزدیکی پیدا نشد؛ نبود تماس نزدیک هم یک نتیجه محاسباتی است."
        : "داده ترنزیت ذخیره‌شده آماده است و فقط تماس‌های اولویت‌دار نمایش داده می‌شوند.",
    ...themes,
    ...highlights.flatMap((aspect) => [
      aspect.transitBody,
      aspect.aspect,
      aspect.natalBody,
      aspect.interpretation.theme,
      aspect.interpretation.attention,
      aspect.interpretation.scenario,
      aspect.interpretation.helpful,
      aspect.interpretation.friction,
      aspect.interpretation.action,
      aspect.interpretation.technicalDetail,
    ]),
    transit.technicalDisclaimer ??
      "این مقایسه فقط از داده ذخیره‌شده سیاره‌ها و اورب‌های همان زمان استفاده می‌کند و هیچ رویداد قطعی یا پیش‌بینی آینده نمی‌سازد.",
    ...transit.limitations,
  ];

  return contextText.reduce(
    (total, text) => total + countWords(String(text)),
    0,
  );
}

function buildTechnicalWordCount(report: AstrologyReport): number {
  const snapshot = report.realEngine;
  if (!snapshot) {
    return countWords(report.safetyNote);
  }
  const placementWords = snapshot.placements.reduce(
    (total, placement) => total + countWords(`${placement.label} ${formatZodiacLabel(placement.signId)} ${placement.house ?? ""}`),
    0,
  );
  const houseWords = (snapshot.houses ?? []).reduce(
    (total, house) => total + countWords(`خانه ${house.number} ${formatZodiacLabel(house.signId)}`),
    0,
  );
  const aspectWords = (snapshot.aspects ?? []).reduce(
    (total, aspect) => total + countWords(`${aspect.firstPlanetLabel} ${aspect.aspectLabel} ${aspect.secondPlanetLabel} ${aspect.angle} ${aspect.separation} ${aspect.orb}`),
    0,
  );
  const limitationWords = (snapshot.calculationQuality?.limitations ?? []).reduce(
    (total, limitation) => total + countWords(limitation),
    0,
  );
  return placementWords + houseWords + aspectWords + limitationWords;
}

function buildRulershipTechnicalWordCount(
  rulership: ChartRulershipProfile,
): number {
  const technicalText = [
    ...(rulership.chartRuler
      ? [rulership.chartRuler.pathSummary, ...rulership.chartRuler.evidence]
      : []),
    ...(rulership.dispositorChain
      ? [
          rulership.dispositorChain.summary,
          ...rulership.dispositorChain.steps.flatMap((step) => [
            step.planetLabel,
            step.signLabel,
            step.rulerPlanetLabel,
            step.house ?? "",
          ]),
        ]
      : []),
    ...rulership.houseRulers.flatMap((house) => [
      house.summary,
      ...house.evidence,
    ]),
    ...rulership.planetConditions.flatMap((condition) => [
      condition.dignityLabel,
      condition.expression,
      condition.majorAspect ?? "",
      ...condition.evidence,
    ]),
    ...rulership.excludedTimeDependentFactors,
  ];

  return technicalText.reduce(
    (total, text) => total + countWords(String(text)),
    0,
  );
}

function buildSupplementaryPointsTechnicalWordCount(
  profile: ValidatedSupplementaryPointsProfile,
): number {
  const fortune = profile.partOfFortune;
  if (!fortune) return 0;

  const technicalText = [
    fortune.label,
    fortune.signLabel,
    fortune.degreeInSign,
    fortune.house,
    fortune.sect,
    fortune.formula,
    ...fortune.evidence,
  ];

  return technicalText.reduce<number>(
    (total, text) => total + countWords(String(text)),
    0,
  );
}

function buildReadingTime(
  contractText: string[],
  report: AstrologyReport,
  transit: PersonalTransitReportDataBridge | null,
  rulership: ChartRulershipProfile,
  supplementaryPoints: ValidatedSupplementaryPointsProfile,
): ReportReadingTime {
  const natalWordCount =
    contractText.reduce((total, text) => total + countWords(text), 0) +
    countWords(supplementaryPoints.partOfFortune?.summary ?? "");
  const technicalWordCount =
    buildTechnicalWordCount(report) +
    buildRulershipTechnicalWordCount(rulership) +
    buildSupplementaryPointsTechnicalWordCount(supplementaryPoints);
  const transitWordCount = buildTransitVisibleWordCount(transit);

  return {
    natalMinutes: calculateReadingMinutes(natalWordCount),
    technicalMinutes: calculateReadingMinutes(technicalWordCount),
    transitMinutes: calculateReadingMinutes(transitWordCount),
    natalWordCount,
    technicalWordCount,
    transitWordCount,
  };
}

function buildEvidenceReferences(
  report: AstrologyReport,
  registry: OwnershipRegistry,
): ReportEvidenceReference[] {
  const snapshot = report.realEngine;
  if (!snapshot) {
    const detail = registry.claim(
      "evidence",
      "fallback-report-evidence",
      "این گزارش دادهٔ کامل موتور محاسبه‌شده را ندارد و فقط بخش‌های موجود نمایش داده می‌شوند.",
    );
    return [{
      id: "fallback-report",
      label: "نسخهٔ قدیمی یا جایگزین",
      detail: detail ?? "این گزارش دادهٔ کامل موتور محاسبه‌شده را ندارد.",
    }];
  }

  const placements = snapshot.placements.slice(0, 5).flatMap((placement) => {
    const detail = `${formatZodiacLabel(placement.signId)}${
      typeof placement.house === "number" ? `، خانه ${formatPersianNumber(placement.house)}` : ""
    }`;
    const claimed = registry.claim(
      "evidence",
      `placement-${placement.id}-evidence`,
      `${placement.label}: ${detail}`,
    );
    return claimed
      ? [{
          id: `placement-${placement.id}`,
          label: placement.label,
          detail,
        }]
      : [];
  });
  const methodDetail = registry.claim(
    "technical-explanation",
    "calculation-method",
    `روش خانه‌ها: ${snapshot.houseSystem ?? "ثبت نشده"}. زمان مرجع محاسبه: ${snapshot.utcIso}.`,
  );

  return [
    ...placements,
    ...(methodDetail
      ? [{ id: "calculation-method", label: "روش محاسبه", detail: methodDetail }]
      : []),
  ];
}

function buildLimitations(
  report: AstrologyReport,
  registry: OwnershipRegistry,
): string[] {
  const candidates = [
    ...(report.realEngine?.calculationQuality?.limitations ?? []),
    ...(report.realEngine?.calculationQuality?.warnings ?? []),
    report.safetyNote,
  ];
  const output: string[] = [];

  for (const candidate of candidates) {
    const claimed = registry.claim("limitation", `limitation-${output.length + 1}`, candidate);
    if (claimed) {
      output.push(claimed);
    }
    if (output.length === 4) {
      break;
    }
  }

  return output.length > 0
    ? output
    : ["این گزارش برای خودشناسی و تأمل است و نباید به‌عنوان حکم قطعی خوانده شود."];
}

function collectVisibleNatalText(input: {
  personalOpening: string[];
  chartSignature: ReportChartSignatureSummary;
  chartPatterns: ChartPatternProfile;
  personalPlanetChapters: PersonalPlanetChaptersProfile;
  wholeChartSynthesis: WholeChartSynthesisProfile;
  corePlacements: ReportCorePlacement[];
  primaryPatterns: ReportPrimaryPattern[];
  primaryStrength: ReportValueCard;
  primaryChallenge: ReportValueCard;
  saveableSentence: string;
  recommendedReadingPath: string[];
  themeChapters: LiveReportThemeChapter[];
  deepDiveSections: ReportNarrativeDeepDive[];
  growthAxis: ReportGrowthAxis;
  weeklyActions: string[];
  reflectionQuestions: string[];
  limitations: string[];
}): string[] {
  return [
    ...input.personalOpening,
    input.chartSignature.title,
    input.chartSignature.body,
    ...input.chartPatterns.patterns.flatMap((pattern) => [
      pattern.title,
      pattern.summary,
      pattern.technicalSummary,
      ...pattern.evidence,
    ]),
    ...input.corePlacements.flatMap((placement) => [placement.label, placement.position, placement.role]),
    ...input.primaryPatterns.flatMap((pattern) => [pattern.title, pattern.summary, ...pattern.evidence]),
    input.primaryStrength.body,
    input.primaryChallenge.body,
    input.saveableSentence,
    ...input.recommendedReadingPath,
    ...input.personalPlanetChapters.chapters.flatMap((chapter) => [
      chapter.title,
      chapter.summary,
      ...chapter.sections
        .filter((section) => section.id !== "evidence")
        .flatMap((section) => [section.label, section.body]),
    ]),
    ...input.wholeChartSynthesis.fixedChapters
      .filter((chapter) => chapter.available)
      .flatMap((chapter) => [chapter.title, chapter.summary, ...chapter.paragraphs]),
    ...input.wholeChartSynthesis.dynamicChapters.flatMap((chapter) => [
      chapter.title,
      chapter.summary,
      ...chapter.paragraphs,
    ]),
    ...input.wholeChartSynthesis.lifeAreas
      .filter((area) => area.available)
      .flatMap((area) => [area.title, area.summary, ...area.factors]),
    ...input.themeChapters
      .filter((chapter) =>
        chapter.id === "real-engine-theme-direction-path" ||
        chapter.id === "real-engine-theme-recurring-patterns",
      )
      .flatMap((chapter) => [
        chapter.title,
        chapter.summary,
        ...chapter.paragraphs,
        chapter.reflection ?? "",
      ]),
    ...input.deepDiveSections
      .filter(
        (section) =>
          ![
            "whole-chart-story",
            "chart-ruler-story",
            "balance-story",
            "active-houses-story",
            "node-axis-story",
          ].includes(section.id),
      )
      .flatMap((section) => [
        section.title,
        section.summary,
        ...section.paragraphs,
      ]),
    input.growthAxis.familiarPattern,
    input.growthAxis.growthDirection,
    input.growthAxis.bridge,
    ...input.weeklyActions,
    ...input.reflectionQuestions,
    ...input.limitations,
  ].filter(Boolean);
}

function buildProminenceReadingPath(
  prominence: ChartProminenceProfile,
): string[] {
  const labels: Partial<Record<HumanFirstReadingSectionId, string>> = {
    overview: "تصویر کلی",
    "primary-patterns": "سه الگوی اصلی",
    "strength-challenge": "قوت و چالش",
    "inner-world": "دنیای درونی",
    "mind-language": "ذهن و زبان",
    relationships: "رابطه و مرزها",
    "drive-direction": "انگیزه و جهت",
    "friction-repair": "اصطکاک و ترمیم",
    "growth-path": "مسیر رشد",
    "deeper-layers": "لایه‌های عمیق‌تر",
  };
  const selected = prominence.signatures
    .map((signature) => labels[signature.destination])
    .filter((label): label is string => Boolean(label))
    .filter((label, index, collection) => collection.indexOf(label) === index)
    .slice(0, 2)
    .map((label, index) =>
      index === 0
        ? `اول فصل «${label}» را بخوان؛ بالاترین امضای رتبه‌بندی‌شده به آن وصل است.`
        : `بعد فصل «${label}» را باز کن تا امضای بعدی را در متن کامل ببینی.`,
    );
  return [
    ...selected,
    "جزئیات فنی و آسمان ثبت‌شده را جدا و فقط در صورت نیاز ببین.",
  ].slice(0, 3);
}

export function buildLiveReportReadingContract(
  report: AstrologyReport,
): LiveReportReadingContract {
  const enhanced = enhanceReportOutputV3(
    report as unknown as Record<string, unknown>,
  );
  const sections = enhanced.reportV3Sections;
  const registry = new OwnershipRegistry();
  const displayName = report.input.name?.trim() || "تو";
  const personalOpening = buildPersonalOpening(sections, registry);
  const relationshipProfile = buildRelationshipGroups(
    getSection(sections, "real-engine-theme-relationship-style"),
    registry,
  );
  const themeChapters = buildThemeChapters(
    sections,
    registry,
    relationshipProfile,
    report,
  );
  const deepDiveSections = buildDeepDiveSections(sections, registry);
  const chartPatterns = buildChartPatternProfile(report);
  const rulership = buildChartRulershipProfile(report, {
    hasReliableBirthTime: hasReliableBirthTime(report),
  });
  const supplementaryPoints = buildValidatedSupplementaryPointsProfile(report, {
    hasReliableBirthTime: hasReliableBirthTime(report),
  });
  const personalPlanetChapters = buildPersonalPlanetChapters(report, {
    hasReliableBirthTime: hasReliableBirthTime(report),
    rulership,
    chartPatterns,
    inheritedNarratives: {
      sun:
        themeChapters.find((chapter) => chapter.id === "real-engine-theme-signature")
          ?.paragraphs.slice(0, 8) ?? [],
      moon:
        themeChapters.find(
          (chapter) => chapter.id === "real-engine-theme-emotional-security",
        )?.paragraphs.slice(0, 8) ?? [],
      "rising-ruler":
        deepDiveSections.find((section) => section.id === "chart-ruler-story")
          ?.paragraphs.slice(0, 8) ?? [],
      mercury:
        themeChapters.find((chapter) => chapter.id === "real-engine-theme-mind-language")
          ?.paragraphs.slice(0, 8) ?? [],
      venus: relationshipProfile
        .flatMap((group) => group.paragraphs)
        .slice(0, 8),
      mars:
        themeChapters.find((chapter) => chapter.id === "real-engine-theme-will-action")
          ?.paragraphs.slice(0, 8) ?? [],
    },
  });
  const prominence = mergeChartPatternsIntoProminence(
    buildChartProminenceProfile(report),
    chartPatterns,
  );
  const primaryPatterns = buildPrimaryPatterns(
    sections,
    themeChapters,
    registry,
    report,
    prominence,
  );
  const primaryStrength = buildValueCard(sections, registry, "strength");
  const primaryChallenge = buildValueCard(sections, registry, "challenge");
  const saveableSentence = buildSaveableSentence(
    sections,
    registry,
    primaryStrength,
    prominence,
  );
  const weeklyActions = buildWeeklyActions(sections, registry);
  const limitations = buildLimitations(report, registry);
  const chartSignature = buildChartSignature(report);
  const corePlacements = buildCorePlacements(report);
  const growthAxis = buildGrowthAxis(report);
  const reflectionQuestions = buildReflectionQuestions(sections, registry);
  const recommendedReadingPath = buildProminenceReadingPath(prominence);
  const transit = getTransitData(report);
  const wholeChartSynthesis = buildWholeChartSynthesis(report, {
    prominence,
    chartPatterns,
    rulership,
    supplementaryPoints,
  });
  const readingTime = buildReadingTime(
    collectVisibleNatalText({
      personalOpening,
      chartSignature,
      chartPatterns,
      personalPlanetChapters,
      wholeChartSynthesis,
      corePlacements,
      primaryPatterns,
      primaryStrength,
      primaryChallenge,
      saveableSentence,
      recommendedReadingPath,
      themeChapters,
      deepDiveSections,
      growthAxis,
      weeklyActions,
      reflectionQuestions,
      limitations,
    }),
    report,
    transit,
    rulership,
    supplementaryPoints,
  );

  return {
    displayName,
    personalOpening,
    chartSignature,
    prominence,
    chartPatterns,
    rulership,
    supplementaryPoints,
    personalPlanetChapters,
    wholeChartSynthesis,
    corePlacements,
    primaryPatterns,
    primaryStrength,
    primaryChallenge,
    saveableSentence,
    recommendedReadingPath,
    themeChapters,
    deepDiveSections,
    relationshipProfile,
    growthAxis,
    weeklyActions,
    reflectionQuestions,
    limitations,
    evidenceReferences: buildEvidenceReferences(report, registry),
    readingTime,
    navigation: REPORT_READING_NAVIGATION,
    contentOwnership: registry.list(),
    hasReliableBirthTime: hasReliableBirthTime(report),
    hasTransit: Boolean(transit),
  };
}

function formatPersianNumber(value: number): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value);
}
