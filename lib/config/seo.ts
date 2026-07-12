export const siteConfig = {
  name: "Halleus",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://halleus.ir").replace(
    /\/$/,
    "",
  ),
  title: "Halleus | گزارش تولد فارسی و خودشناسی نمادین",
  description:
    "Halleus چارت تولد را به گزارش فارسی، آرام و قابل مرور تبدیل می‌کند؛ از ساخت گزارش تا نگهداری و درخواست نسخه کامل‌تر.",
  locale: "fa_IR",
};

export const seoRoutes = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/chart", priority: 0.9, changeFrequency: "weekly" },
  { path: "/product", priority: 0.85, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.75, changeFrequency: "monthly" },
  { path: "/order", priority: 0.65, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.6, changeFrequency: "monthly" },
  { path: "/wiki", priority: 0.9, changeFrequency: "weekly" },
] as const;
