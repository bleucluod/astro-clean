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

function previewSection(path: string): string {
  if (path === "/") return "آسترولوژی و خودشناسی";
  if (path === "/shop") return "فروشگاه هالیوس";
  if (path.startsWith("/shop/")) return "آثار شخصی‌سازی‌شده";
  if (path.startsWith("/wiki/category/")) return "دسته‌بندی ویکی";
  if (path.startsWith("/wiki/")) return "مقالهٔ ویکی هالیوس";
  if (path === "/wiki") return "ویکی آسترولوژی";
  if (path.startsWith("/sky")) return "آسمان و ترنزیت‌ها";
  if (path.startsWith("/compare")) return "رابطه و سیناستری";
  if (path === "/privacy") return "حریم خصوصی";
  return "هالیوس";
}

/**
 * One server-rendered 1200x630 PNG per public page, with the page's own title
 * and (where present) a verified local image. No private report data is sent.
 * The pathname is part of the URL to keep distinct pages independently cached.
 */
export function socialPreviewImage({
  title,
  canonical,
  photo,
  section,
}: Pick<SocialPreviewInput, "title" | "canonical" | "photo" | "section">) {
  const url = new URL("/api/social-preview", siteConfig.url);
  url.searchParams.set("title", title);
  url.searchParams.set("section", section ?? previewSection(canonical));
  url.searchParams.set("page", canonical);
  url.searchParams.set("v", "2");

  if (photo) {
    try {
      const resolved = new URL(photo, siteConfig.url);
      if (resolved.origin === new URL(siteConfig.url).origin) {
        url.searchParams.set("photo", resolved.pathname);
      }
    } catch {
      // A missing or malformed optional image must not break page metadata.
    }
  }

  return {
    url: url.toString(),
    width: 1200,
    height: 630,
    alt: title + " | هالیوس",
  };
}

export function buildSocialPreviewMetadata({
  title,
  description,
  canonical,
  photo,
  section,
}: SocialPreviewInput): Pick<Metadata, "openGraph" | "twitter"> {
  const socialImage = socialPreviewImage({ title, canonical, photo, section });
  const pageUrl = new URL(canonical, siteConfig.url).toString();
  return {
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
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
  // Preserve real article cover photos (including those hosted in the wiki's
  // public media storage). Articles without a cover get a unique title card.
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
