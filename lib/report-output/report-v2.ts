import type {
  ReportOutputSection,
  SectionedReportOutput,
} from "@/types/report-output";

type GenericReport = Record<string, unknown>;

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

function createSectionedPreview(report: GenericReport): ReportOutputSection[] {
  const name = getInputValue(report, "name", "این فرد");
  const birthCity = getInputValue(report, "birthCity", "شهر تولد");
  const birthDate = getInputValue(report, "birthDate", "تاریخ تولد");

  return [
    {
      id: "overview",
      kind: "overview",
      title: "نمای کلی",
      body: `این گزارش برای ${name} و داده تولد ${birthDate} در ${birthCity} ساخته شده است. نسخه فعلی هنوز preview است، اما ساختار خروجی به شکل بخش‌بندی‌شده آماده شده تا بعداً با موتور چارت واقعی و تفسیر دقیق‌تر جایگزین شود.`,
    },
    {
      id: "identity",
      kind: "identity",
      title: "هویت و الگوی اصلی",
      body: "در نسخه V2، گزارش به جای یک متن یک‌تکه، از بخش‌های مشخص ساخته می‌شود. این کار کمک می‌کند هر بخش معنی، لحن و مرز ایمنی خودش را داشته باشد و بعداً به placementهای واقعی وصل شود.",
    },
    {
      id: "emotional-pattern",
      kind: "emotional-pattern",
      title: "الگوی عاطفی",
      body: "این بخش برای توضیح تجربه عاطفی با زبان مراقبانه طراحی شده است. در نسخه نهایی، متن باید نمادین و تأملی بماند و هیچ‌وقت نقش تشخیص روان‌شناختی یا درمانی نگیرد.",
    },
    {
      id: "relationships",
      kind: "relationships",
      title: "رابطه‌ها",
      body: "بخش رابطه‌ها قرار است درباره نزدیکی، مرزها و سبک ارتباط صحبت کند، بدون اینکه برای تصمیم‌های عاطفی دستور قطعی بدهد. هدف، self-reflection است نه پیش‌بینی قطعی.",
    },
    {
      id: "career",
      kind: "career",
      title: "کار و مسیر رشد",
      body: "این بخش مسیر کار و انگیزه را به زبان نمادین توضیح می‌دهد. در نسخه نهایی، نباید تبدیل به توصیه مالی، شغلی یا تصمیم قطعی شود.",
    },
    {
      id: "growth",
      kind: "growth",
      title: "رشد شخصی",
      body: "تمرکز این بخش روی انتخاب آگاهانه و رشد شخصی است. خروجی خوب باید به کاربر حس امکان، وضوح و تأمل بدهد، نه ترس یا وابستگی.",
    },
    {
      id: "reflection-prompts",
      kind: "reflection-prompts",
      title: "پرسش‌های تأملی",
      body: "۱. کدام بخش این گزارش بیشتر به تجربه فعلی تو نزدیک است؟ ۲. کجاها نیاز به مرز روشن‌تر داری؟ ۳. چه انتخاب کوچکی می‌تواند این هفته به رشد تو کمک کند؟",
    },
    {
      id: "disclaimer",
      kind: "disclaimer",
      title: "یادآوری",
      body: "این گزارش نمادین و تأملی است و جایگزین تصمیم پزشکی، حقوقی، مالی یا تصمیم قطعی زندگی نیست.",
    },
  ];
}

export function enhanceReportOutputV2<TReport extends GenericReport>(
  report: TReport,
): TReport & SectionedReportOutput {
  const existingSections = report.interpretationSections;

  if (Array.isArray(existingSections) && existingSections.length > 0) {
    return report as TReport & SectionedReportOutput;
  }

  return {
    ...report,
    outputVersion: "v2-sectioned-preview",
    interpretationSections: createSectionedPreview(report),
    outputQuality: {
      version: "v2-sectioned-preview",
      score: 82,
      checkedAt: new Date().toISOString(),
      warnings: [
        "This is still a sectioned preview output. Real chart placements are not active yet.",
      ],
    },
  };
}
