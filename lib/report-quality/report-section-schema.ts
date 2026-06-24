import type { ReportSectionBlueprint } from "@/types/report-quality";

export const REPORT_SECTION_BLUEPRINTS: ReportSectionBlueprint[] = [
  {
    kind: "overview",
    title: "نمای کلی",
    purpose: "شروع نرم و انسانی گزارش بدون قطعیت‌گویی.",
    required: true,
    minWords: 70,
    maxWords: 180,
  },
  {
    kind: "identity",
    title: "هویت و الگوی اصلی",
    purpose: "توضیح نمادین درباره خودشناسی و جهت‌گیری فرد.",
    required: true,
    minWords: 90,
    maxWords: 220,
  },
  {
    kind: "emotional-pattern",
    title: "الگوی عاطفی",
    purpose: "توضیح تجربه احساسی و نیازهای درونی با زبان مراقبانه.",
    required: true,
    minWords: 90,
    maxWords: 220,
  },
  {
    kind: "relationships",
    title: "رابطه‌ها",
    purpose: "تفسیر نمادین درباره رابطه، نزدیکی و مرزها.",
    required: true,
    minWords: 80,
    maxWords: 200,
  },
  {
    kind: "career",
    title: "کار و مسیر رشد",
    purpose: "نگاه نمادین به سبک کار، انگیزه و مسیر حرفه‌ای.",
    required: true,
    minWords: 80,
    maxWords: 200,
  },
  {
    kind: "growth",
    title: "رشد شخصی",
    purpose: "پیشنهادهای self-reflection بدون دستور قطعی.",
    required: true,
    minWords: 80,
    maxWords: 200,
  },
  {
    kind: "reflection-prompts",
    title: "پرسش‌های تأملی",
    purpose: "پایان گزارش با چند سؤال قابل فکر کردن.",
    required: true,
    minWords: 30,
    maxWords: 120,
  },
  {
    kind: "disclaimer",
    title: "یادآوری",
    purpose: "توضیح اینکه گزارش نمادین است و جای توصیه تخصصی را نمی‌گیرد.",
    required: true,
    minWords: 25,
    maxWords: 90,
  },
];

export function getRequiredReportSections() {
  return REPORT_SECTION_BLUEPRINTS.filter((section) => section.required);
}
