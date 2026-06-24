import { enhanceReportOutputV2 } from "@/lib/report-output/report-v2";
import type { ReportOutputSection } from "@/types/report-output";
import type { ReportOutputV3 } from "@/types/report-output-v3";

type GenericReport = Record<string, unknown>;

type EnhancedV2Report = GenericReport & {
  interpretationSections?: ReportOutputSection[];
  outputQuality?: {
    score?: number;
    warnings?: string[];
  };
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

function polishSection(section: ReportOutputSection): ReportOutputSection {
  const titleMap: Record<string, string> = {
    overview: "نمای کلی گزارش",
    identity: "هویت و الگوی اصلی",
    "emotional-pattern": "ریتم عاطفی",
    relationships: "رابطه‌ها و مرزها",
    career: "کار، انگیزه و مسیر رشد",
    growth: "رشد شخصی",
    "reflection-prompts": "پرسش‌های تأملی",
    disclaimer: "یادآوری مهم",
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

  const title = titleMap[section.kind] ?? section.title;
  const prefix = prefixMap[section.kind] ?? "این بخش برای خوانایی بهتر بازنویسی شده است.";

  return {
    ...section,
    title,
    body: `${prefix} ${section.body}`,
  };
}

export function enhanceReportOutputV3<TReport extends GenericReport>(
  report: TReport,
): TReport & ReportOutputV3 {
  const existing = report as TReport & Partial<ReportOutputV3>;

  if (existing.outputV3Version === "v3-persian-sectioned-preview") {
    return existing as TReport & ReportOutputV3;
  }

  const v2Report = enhanceReportOutputV2(report) as EnhancedV2Report;
  const sections = (v2Report.interpretationSections ?? []).map(polishSection);
  const wordCount = sections.reduce((total, section) => total + countWords(section.body), 0);
  const score = v2Report.outputQuality?.score ?? 0;
  const name = getInputValue(v2Report, "name", "گزارش Halleus");
  const birthCity = getInputValue(v2Report, "birthCity", "شهر تولد");

  return {
    ...v2Report,
    outputV3Version: "v3-persian-sectioned-preview",
    reportV3Summary: {
      version: "v3-persian-sectioned-preview",
      title: `گزارش نمادین ${name}`,
      subtitle: `نسخه خواناتر و فارسی‌تر برای تولد در ${birthCity}`,
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
