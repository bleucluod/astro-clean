import type { MetadataRoute } from "next";
import { seoRoutes, siteConfig } from "@/lib/config/seo";
import { listPublicWikiSitemapArticles } from "@/lib/wiki/wiki-repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const wikiArticles = await listPublicWikiSitemapArticles();

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
