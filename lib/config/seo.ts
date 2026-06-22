export const siteConfig = {
  name: "Astro Clean",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  title: "Astro Clean | تحلیل نمادین چارت تولد",
  description:
    "Astro Clean یک تجربه فارسی برای ساخت چارت تولد، گزارش‌های شخصی و مسیر آینده آسترولوژی نمادین است.",
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
];
