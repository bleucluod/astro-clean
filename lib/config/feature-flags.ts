export type FeatureFlag = {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
  phase: "MVP" | "Next" | "Future";
};

export const featureFlags: FeatureFlag[] = [
  {
    key: "mock-chart-engine",
    title: "Mock Chart Engine",
    description: "موتور ساده فعلی برای ساخت خورشید، ماه و رایزینگ mock.",
    enabled: true,
    phase: "MVP",
  },
  {
    key: "local-reports",
    title: "Local Saved Reports",
    description: "ذخیره گزارش‌ها در localStorage بدون دیتابیس.",
    enabled: true,
    phase: "MVP",
  },
  {
    key: "profile-local-storage",
    title: "Local Profile",
    description: "ذخیره پروفایل ساده کاربر در مرورگر.",
    enabled: true,
    phase: "MVP",
  },
  {
    key: "real-astrology-engine",
    title: "Real Astrology Engine",
    description: "محاسبات واقعی چارت تولد، بعد از پایدار شدن MVP فرانت‌اند.",
    enabled: false,
    phase: "Next",
  },
  {
    key: "ai-astrologer-chat",
    title: "AI Astrologer Chat",
    description: "چت هوشمند برای طبیعی‌تر کردن متن، نه منبع حقیقت نجومی.",
    enabled: false,
    phase: "Future",
  },
  {
    key: "programmatic-seo",
    title: "Programmatic SEO",
    description: "تولید صفحات SEO از templateهای کنترل‌شده، نه متن بی‌کیفیت.",
    enabled: false,
    phase: "Future",
  },
];
