import type { ReportToneProfile } from "@/types/report-quality";

export const HALLEUS_REPORT_TONE_PROFILE: ReportToneProfile = {
  id: "halleus-symbolic-fa",
  language: "fa-IR",
  principles: [
    "فارسی روان، محترمانه و نزدیک به زبان محصول.",
    "تفسیر نمادین و سنتی، نه ادعای علمی یا قطعیت آینده.",
    "تمرکز روی self-reflection و انتخاب آگاهانه.",
    "پرهیز از ترساندن، وابسته کردن یا دستور دادن.",
    "مرزبندی شفاف با پزشکی، حقوق، مالی و تصمیم‌های قطعی زندگی.",
  ],
  bannedClaims: [
    "قطعاً این اتفاق می‌افتد.",
    "باید این تصمیم را بگیری.",
    "این گزارش تشخیص پزشکی است.",
    "این گزارش توصیه مالی یا حقوقی است.",
    "آینده تو دقیقاً این است.",
  ],
};

export function getReportToneProfile() {
  return HALLEUS_REPORT_TONE_PROFILE;
}
