import type { ReportToneProfile } from "@/types/report-quality";

export const HALLEUS_REPORT_TONE_PROFILE: ReportToneProfile = {
  id: "halleus-symbolic-fa",
  language: "fa-IR",
  principles: [
    "فارسی روان، صمیمی و محترمانه؛ نزدیک به گفت‌وگوی یک همراه دقیق.",
    "تفسیر نمادین و سنتی، نه ادعای علمی یا قطعیت آینده.",
    "تمرکز روی خودنگری، تجربه قابل مشاهده و انتخاب آگاهانه.",
    "پرهیز از ترساندن، وابسته کردن یا دستور دادن.",
    "مرزبندی شفاف با پزشکی، حقوق، مالی و تصمیم‌های قطعی زندگی.",
    "توضیح یکپارچه چارت به‌جای ردیف‌کردن برچسب‌ها و اصطلاحات فنی.",
    "دعوت به مشاهده با واژه‌هایی مثل «ممکن است»، «گاهی» و «می‌تواند».",
  ],
  bannedClaims: [
    "قطعاً این اتفاق می‌افتد.",
    "باید این تصمیم را بگیری.",
    "این گزارش تشخیص پزشکی است.",
    "این گزارش توصیه مالی یا حقوقی است.",
    "آینده تو دقیقاً این است.",
  ],
  preferredPatterns: [
    "ممکن است",
    "گاهی",
    "می‌تواند",
    "برای تأمل",
    "در تجربه روزمره",
  ],
  avoidedPatterns: [
    "تو همیشه",
    "تو هرگز",
    "سرنوشت تو",
    "محکوم هستی",
    "چارت ثابت می‌کند",
    "این یعنی حتماً",
  ],
};

export function getReportToneProfile() {
  return HALLEUS_REPORT_TONE_PROFILE;
}

const HALLEUS_REPORT_VOICE_REPLACEMENTS: ReadonlyArray<
  readonly [pattern: RegExp, replacement: string]
> = [
  [/\bself-reflection\b/giu, "خودنگری"],
  [/تو همیشه/gu, "گاهی"],
  [/تو هرگز/gu, "گاهی"],
  [/سرنوشت تو/gu, "این چارت درباره"],
  [/محکوم هستی(?: که)?/gu, "ممکن است گاهی"],
  [/چارت ثابت می‌کند(?: که)?/gu, "چارت به‌صورت نمادین نشان می‌دهد که"],
  [/این یعنی حتماً/gu, "این می‌تواند به این معنا باشد که"],
];

export function applyHalleusReportVoice(text: string): string {
  return HALLEUS_REPORT_VOICE_REPLACEMENTS.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    text,
  );
}
