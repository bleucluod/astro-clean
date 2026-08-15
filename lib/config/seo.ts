import type { Metadata } from "next";

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


const SOCIAL_FALLBACK_IMAGE = {
  url: "/halleus-logo/social-share-light-1200x630.png",
  width: 1200,
  height: 630,
  alt: "هالیوس؛ آسترولوژی، شناخت و مسیر",
} as const;

export function buildPublicPageMetadata({
  title,
  description,
  canonical,
  image,
  type = "website",
}: {
  title: string;
  description: string;
  canonical: string;
  type?: "website" | "article";
  image?: { url: string; width: number; height: number; alt: string };
}): Metadata {
  const pageUrl = new URL(canonical, siteConfig.url).toString();
  const socialImage = image ?? SOCIAL_FALLBACK_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage.url],
    },
  };
}

export const seoRoutes = [
  { path: "", priority: 1, changeFrequency: "weekly" },
  { path: "/chart", priority: 0.9, changeFrequency: "weekly" },
  { path: "/compare", priority: 0.88, changeFrequency: "weekly" },
  { path: "/sky", priority: 0.88, changeFrequency: "daily" },
  { path: "/product", priority: 0.85, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.75, changeFrequency: "monthly" },
  { path: "/order", priority: 0.65, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.6, changeFrequency: "monthly" },
  { path: "/wiki", priority: 0.9, changeFrequency: "weekly" },
] as const;
