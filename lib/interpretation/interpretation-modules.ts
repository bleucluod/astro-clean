import type { InterpretationModuleBlueprint } from "@/types/interpretation";

export const INTERPRETATION_MODULE_BLUEPRINTS: InterpretationModuleBlueprint[] = [
  {
    id: "overview",
    kind: "overview",
    title: "نمای کلی",
    purpose: "شروع گزارش با زبان نمادین، آرام و غیرقطعی.",
    requiredPlacements: ["sun", "moon", "ascendant"],
    safetyNotes: ["از پیش‌بینی قطعی پرهیز شود.", "گزارش به عنوان دعوت به تأمل معرفی شود."],
  },
  {
    id: "identity",
    kind: "identity",
    title: "هویت و الگوی اصلی",
    purpose: "توضیح نمادین درباره جهت‌گیری شخصیت و سبک خودابرازی.",
    requiredPlacements: ["sun", "ascendant"],
    safetyNotes: ["هویت کاربر ثابت و جبری تعریف نشود."],
  },
  {
    id: "emotional-pattern",
    kind: "emotional-pattern",
    title: "الگوی عاطفی",
    purpose: "توضیح نیازهای احساسی و ریتم درونی با زبان مراقبانه.",
    requiredPlacements: ["moon", "venus"],
    safetyNotes: ["از تشخیص روان‌شناختی یا درمانی پرهیز شود."],
  },
  {
    id: "relationships",
    kind: "relationships",
    title: "رابطه‌ها",
    purpose: "نگاه نمادین به نزدیکی، مرزها و سبک ارتباط.",
    requiredPlacements: ["venus", "mars", "moon"],
    safetyNotes: ["برای تصمیم رابطه‌ای دستور قطعی داده نشود."],
  },
  {
    id: "career",
    kind: "career",
    title: "کار و مسیر رشد",
    purpose: "تفسیر سبک کار، انگیزه و جهت رشد حرفه‌ای.",
    requiredPlacements: ["sun", "mars", "saturn"],
    safetyNotes: ["توصیه مالی یا شغلی قطعی داده نشود."],
  },
  {
    id: "growth",
    kind: "growth",
    title: "رشد شخصی",
    purpose: "دعوت به خودشناسی و انتخاب آگاهانه.",
    requiredPlacements: ["jupiter", "saturn"],
    safetyNotes: ["از زبان ترساننده یا وابسته‌کننده پرهیز شود."],
  },
  {
    id: "reflection-prompts",
    kind: "reflection-prompts",
    title: "پرسش‌های تأملی",
    purpose: "پایان گزارش با سؤال‌های قابل فکر کردن.",
    requiredPlacements: [],
    safetyNotes: ["سؤال‌ها باید باز و غیرهدایت‌گر باشند."],
  },
  {
    id: "disclaimer",
    kind: "disclaimer",
    title: "یادآوری",
    purpose: "مرزبندی با توصیه تخصصی و قطعیت‌گویی.",
    requiredPlacements: [],
    safetyNotes: ["باید در هر گزارش کامل وجود داشته باشد."],
  },
];

export function getInterpretationModuleBlueprints() {
  return INTERPRETATION_MODULE_BLUEPRINTS;
}
