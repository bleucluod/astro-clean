import type { MetadataRoute } from "next";
import { seoRoutes, siteConfig } from "@/lib/config/seo";
import { wikiArticles } from "@/lib/wiki/wiki-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const publicPageEntries: MetadataRoute.Sitemap = seoRoutes.map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const wikiArticleEntries: MetadataRoute.Sitemap = wikiArticles.map(
    (article) => ({
      url: `${siteConfig.url}/wiki/${article.slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.75,
    }),
  );

  return [...publicPageEntries, ...wikiArticleEntries];
}
