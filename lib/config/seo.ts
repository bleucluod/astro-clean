export const siteConfig = {
  name: "Halleus",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  title: "Halleus | تحلیل نمادین چارت تولد",
  description:
    "Halleus یک تجربه فارسی برای ساخت چارت تولد، گزارش‌های شخصی و مسیر آینده آسترولوژی نمادین است.",
  locale: "fa_IR",
};

export const seoRoutes = [
  "",
  "/chart",
  "/dashboard",
  "/reports",
  "/profile",
  "/admin",
  "/roadmap",
  "/wiki",
  "/privacy",
];
