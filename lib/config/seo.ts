import type { Metadata } from "next";

export const siteConfig = {
  name: "Halleus",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://halleus.ir").replace(
    /\/$/,
    "",
  ),
  title: "هالیوس | آسترولوژی فارسی، چارت تولد، رابطه‌ها و آسمان امروز",
  description:
    "در هالیوس چارت تولدت را بساز، گزارش فارسی و شخصی‌ات را بخوان، چارت ازدواج و سیناستری دو نفر را برای تحلیل رابطه ببین و وضعیت واقعی آسمان امروز را دنبال کن.",
  locale: "fa_IR",
};


type SocialPreviewInput = {
  title: string;
  description: string;
  canonical: string;
  photo?: string;
  section?: string;
};

// Use existing, public images directly. A crawler must never depend on
// runtime font rendering, image composition or a custom preview API.
const SOCIAL_IMAGES: Record<string, string> = {
  "/": "/halleus-visuals/moon-apollo11.webp",
  "/chart": "/halleus-chart-wheel-sample-polished-centered.webp",
  "/compare": "/halleus-compare-og.png",
  "/sky": "/halleus-visuals/moon-apollo11.webp",
  "/wiki": "/halleus-chart-wheel-sample-polished-centered.webp",
  "/product": "/halleus-chart-wheel-sample-polished-centered.webp",
  "/pricing": "/halleus-order-hero.webp",
  "/order": "/halleus-order-hero.webp",
  "/privacy": "/halleus-privacy-hero.webp",
  "/shop": "/shop-preview/hero-desktop-v012.webp",
  "/shop/moon-phase-print": "/shop-preview/p01/mockup-frameless-gibbous-daylight.webp",
  "/shop/birth-sky-map": "/shop-preview/p02/05-raha-parsa-30x45-wall.webp",
  "/shop/milky-way-print": "/shop-preview/our-night.webp",
  "/shop/shipping-returns": "/shop-preview/hero-desktop-v012.webp",
};

function existingPreviewImage(canonical: string): string {
  const exact = SOCIAL_IMAGES[canonical];
  if (exact) return exact;
  if (canonical.startsWith("/shop/")) return SOCIAL_IMAGES["/shop"];
  if (canonical.startsWith("/sky/")) return SOCIAL_IMAGES["/sky"];
  if (canonical.startsWith("/compare/")) return SOCIAL_IMAGES["/compare"];
  if (canonical.startsWith("/wiki/category/famous-birth-charts")) {
    return "/wiki/category/famous-birth-charts/01-famous-archetypes.webp";
  }
  if (canonical.startsWith("/wiki/")) {
    if (/moon|lunar|ماه|phase/.test(canonical)) return SOCIAL_IMAGES["/sky"];
    if (/synastry|relationship|compatib|marriage/.test(canonical)) return SOCIAL_IMAGES["/compare"];
    return SOCIAL_IMAGES["/wiki"];
  }
  return SOCIAL_IMAGES["/"];
}

export function buildSocialPreviewMetadata({
  title,
  description,
  canonical,
  photo,
}: SocialPreviewInput): Pick<Metadata, "openGraph" | "twitter"> {
  const imageUrl = new URL(photo ?? existingPreviewImage(canonical), siteConfig.url).toString();
  const pageUrl = new URL(canonical, siteConfig.url).toString();
  return {
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
      images: [{ url: imageUrl, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

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
  const social = buildSocialPreviewMetadata({
    title,
    description,
    canonical,
    photo: image?.url,
  });
  const articleCover = type === "article" && image ? image : null;
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    ...social,
    openGraph: {
      ...social.openGraph,
      type,
      ...(articleCover ? { images: [articleCover] } : {}),
    },
    twitter: {
      ...social.twitter,
      ...(articleCover ? { images: [articleCover.url] } : {}),
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
