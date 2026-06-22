export type RoadmapItem = {
  title: string;
  description: string;
  phase: "MVP" | "Next" | "Future";
};

export const roadmapItems: RoadmapItem[] = [
  {
    title: "MVP قابل دیدن",
    description:
      "ساخت صفحات اصلی، فرم چارت، گزارش mock، ذخیره محلی گزارش‌ها، پروفایل ساده و feature flag نمایشی.",
    phase: "MVP",
  },
  {
    title: "چارت واقعی و Rule Engine",
    description:
      "جایگزینی mock engine با محاسبات واقعی و جدا نگه داشتن داده خام، قانون‌ها و لایه تفسیر فارسی.",
    phase: "Next",
  },
  {
    title: "داشبورد شخصی",
    description:
      "نمایش آخرین گزارش‌ها، Saved Charts، Saved Reports، Mood Tracking و پیشنهادهای شخصی.",
    phase: "Next",
  },
  {
    title: "اجتماعی و رابطه‌ای",
    description:
      "پروفایل عمومی یا خصوصی، Follow، Block، Friend Orbit، Couple Mode و سازگاری رابطه.",
    phase: "Future",
  },
  {
    title: "محتوا و SEO کنترل‌شده",
    description:
      "Astro Wiki، صفحات آموزشی، metadata، sitemap، Open Graph و در آینده programmatic SEO با templateهای باکیفیت.",
    phase: "Future",
  },
  {
    title: "AI و گیمیفیکیشن",
    description:
      "AI برای طبیعی‌تر کردن متن، نه منبع حقیقت؛ به‌همراه XP، Level، Badge، Quest و Cosmic Coins.",
    phase: "Future",
  },
];
