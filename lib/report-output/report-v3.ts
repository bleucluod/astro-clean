import { enhanceReportOutputV2 } from "@/lib/report-output/report-v2";
import type { ReportOutputSection } from "@/types/report-output";
import type { ReportOutputV3 } from "@/types/report-output-v3";

type GenericReport = Record<string, unknown>;

type EnhancedV2Report = GenericReport & {
  outputVersion?: string;
  interpretationSections?: ReportOutputSection[];
  outputQuality?: {
    score?: number;
    warnings?: string[];
  };
  realEngine?: unknown;
};

function countWords(text: string) {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

function getInputValue(report: GenericReport, key: string, fallback: string) {
  const input = report.input;

  if (typeof input === "object" && input !== null) {
    const value = (input as Record<string, unknown>)[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const value = report[key];

  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

type PolishSectionOptions = {
  isSectionedPreview: boolean;
};

function polishSection(
  section: ReportOutputSection,
  options: PolishSectionOptions,
): ReportOutputSection {
  const titleMap: Record<string, string> = {
    overview: "نمای کلی گزارش",
    identity: "هویت و الگوی اصلی",
    "emotional-pattern": "ریتم عاطفی",
    relationships: "رابطه‌ها و مرزها",
    career: "کار، انگیزه و مسیر رشد",
    growth: "رشد شخصی",
    "reflection-prompts": "پرسش‌های تأملی",
    disclaimer: "یادآوری",
  };

  const productBodyMap: Record<string, string> = {
    overview:
      "این خوانش یک تصویر کلی از چارت می‌دهد تا گزارش از حالت داده خام خارج شود و به چند الگوی قابل لمس تبدیل شود. به جای اینکه نتیجه را قطعی بداند، کمک می‌کند آرام‌تر ببینی کدام بخش‌های زندگی، نیاز به توجه، مرزبندی یا انتخاب آگاهانه دارند.",
    identity:
      "در این بخش، تمرکز روی شیوه حضور، تصمیم‌گیری و جهت‌گیری درونی است. متن می‌خواهد نشان دهد کدام الگوی اصلی چارت می‌تواند در انتخاب‌ها، اعتماد به خود و شکل دادن به مسیر شخصی دیده شود.",
    "emotional-pattern":
      "اینجا گزارش به ریتم احساسی و نیازهای درونی نزدیک می‌شود: چه چیزهایی به تو حس امنیت می‌دهند، کجا ممکن است احساس‌ها واکنش نشان بدهند، و چطور می‌توانی با خودت مهربان‌تر و روشن‌تر برخورد کنی.",
    relationships:
      "این بخش رابطه‌ها را از زاویه نزدیکی، مرز و گفت‌وگو می‌خواند. هدف این نیست که درباره یک رابطه حکم بدهد؛ هدف این است که الگوی نزدیک شدن، نیاز به صمیمیت و سبک ارتباطی روشن‌تر دیده شود.",
    career:
      "در این قسمت، کار و مسیر رشد به عنوان جایی دیده می‌شود که انگیزه، معنا و توان شخصی باید با هم هماهنگ شوند. متن کمک می‌کند بفهمی چه نوع حرکت یا مسئولیتی می‌تواند با ریتم درونی‌ات سازگارتر باشد.",
    growth:
      "این بخش گزارش را به چند نقطه عملی‌پذیر و آرام تبدیل می‌کند: چه چیزی را می‌توانی بهتر ببینی، کجا لازم است با خودت صادق‌تر باشی، و کدام انتخاب کوچک می‌تواند حس وضوح بیشتری به هفته یا فصل پیش رو بدهد.",
    "reflection-prompts":
      "برای ادامه خوانش، با این پرسش‌ها آرام جلو برو: کدام بخش بیشتر به تجربه فعلی من نزدیک است؟ کجا به مرز روشن‌تر نیاز دارم؟ چه انتخاب کوچکی می‌تواند این هفته مرا به خودم نزدیک‌تر کند؟",
    disclaimer:
      "این گزارش برای تأمل شخصی و شناخت نمادین است. قرار نیست جای تصمیم پزشکی، حقوقی، مالی یا تصمیم قطعی زندگی را بگیرد.",
  };

  const prefixMap: Record<string, string> = {
    overview: "در این بخش، گزارش به شکل خلاصه و انسانی شروع می‌شود.",
    identity: "این بخش درباره تصویر نمادین از خودشناسی و سبک حضور توست.",
    "emotional-pattern": "اینجا تمرکز روی نیازهای عاطفی، ریتم درونی و شیوه تجربه احساسات است.",
    relationships: "این بخش رابطه‌ها را به عنوان فضایی برای شناخت مرز، نزدیکی و گفت‌وگو نگاه می‌کند.",
    career: "اینجا مسیر کار و انگیزه با زبان نمادین و غیرقطعی توضیح داده می‌شود.",
    growth: "این بخش برای تبدیل گزارش به چند نقطه تأمل و رشد شخصی است.",
    "reflection-prompts": "این پرسش‌ها برای فکر کردن‌اند، نه برای گرفتن جواب قطعی.",
    disclaimer: "این یادآوری مرز ایمنی گزارش را روشن می‌کند.",
  };

  const isRealEngineSection = section.id.startsWith("real-engine-");
  const title = isRealEngineSection ? section.title : titleMap[section.kind] ?? section.title;
  const prefix = prefixMap[section.kind] ?? "این بخش برای خوانایی بهتر بازنویسی شده است.";
  const productBody = productBodyMap[section.kind];
  const body =
    options.isSectionedPreview && productBody && !isRealEngineSection
      ? productBody
      : isRealEngineSection
        ? section.body
        : [prefix, section.body].filter(Boolean).join(" ").trim();

  return {
    ...section,
    title,
    body,
  };
}

function hasRealEngineReportText(
  report: EnhancedV2Report,
  sections: ReportOutputSection[],
): boolean {
  return (
    typeof report.realEngine === "object" &&
    report.realEngine !== null &&
    sections.some((section) => section.id.startsWith("real-engine-"))
  );
}

export function enhanceReportOutputV3(
  report: GenericReport,
): GenericReport & ReportOutputV3 {
  const existing = report as GenericReport & Partial<ReportOutputV3>;

  if (existing.outputV3Version === "v3-persian-sectioned-preview") {
    return existing as GenericReport & ReportOutputV3;
  }

  const v2Report = enhanceReportOutputV2(report) as EnhancedV2Report;
  const rawSections = v2Report.interpretationSections ?? [];
  const isRealEngineReportText = hasRealEngineReportText(v2Report, rawSections);
  const isSectionedPreview =
    !isRealEngineReportText &&
    (v2Report.outputVersion === "v2-sectioned-preview" ||
      v2Report.outputQuality?.warnings?.some((warning) =>
        warning.toLowerCase().includes("sectioned preview"),
      ) === true);
  const sections = rawSections
    .filter((section) => section.kind !== "disclaimer")
    .map((section) => polishSection(section, { isSectionedPreview }));
  const wordCount = sections.reduce((total, section) => total + countWords(section.body), 0);
  const score = isRealEngineReportText
    ? Math.max(v2Report.outputQuality?.score ?? 0, 88)
    : v2Report.outputQuality?.score ?? 0;
  const name = getInputValue(v2Report, "name", "گزارش هالیوس");
  const birthCity = getInputValue(v2Report, "birthCity", "شهر تولد");

  return {
    ...v2Report,
    outputV3Version: "v3-persian-sectioned-preview",
    reportV3Summary: {
      version: "v3-persian-sectioned-preview",
      title: `روایت کلی چارت ${name}`,
      subtitle: `این خوانش برای تولد در ${birthCity} ساخته شده تا الگوهای اصلی چارت را آرام‌تر و انسانی‌تر دنبال کنی.`,
      sectionCount: sections.length,
      wordCount,
      readingMinutes: Math.max(1, Math.ceil(wordCount / 180)),
      qualityLabel:
        score >= 80 ? "آماده بازبینی" : score >= 60 ? "آزمایشی" : "نیازمند بازبینی",
    },
    reportV3Sections: sections,
    reportV3Disclaimer:
      "این گزارش نمادین و تأملی است و جایگزین تصمیم پزشکی، حقوقی، مالی یا تصمیم قطعی زندگی نیست.",
  };
}
