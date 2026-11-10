import type { MetadataRoute } from "next";
import { seoRoutes, siteConfig } from "@/lib/config/seo";
import {
  listPublicWikiSitemapArticles,
  listPublicWikiSitemapCategories,
} from "@/lib/wiki/wiki-repository";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [wikiArticles, wikiCategories] = await Promise.all([
    listPublicWikiSitemapArticles(),
    listPublicWikiSitemapCategories(),
  ]);

  const publicPageEntries: MetadataRoute.Sitemap = seoRoutes.map((route) => ({
    url: `${siteConfig.url}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Indexable product URLs stay in sitemap regardless of checkout availability.
  const shopPageEntries: MetadataRoute.Sitemap = [
    { url: `${siteConfig.url}/shop`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${siteConfig.url}/shop/moon-phase-print`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/shop/birth-sky-map`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/shop/milky-way-print`, changeFrequency: "weekly", priority: 0.65 },
  ];

  const wikiCategoryEntries: MetadataRoute.Sitemap = wikiCategories.map(
    (category) => ({
      url: `${siteConfig.url}/wiki/category/${category.id}`,
      lastModified: category.updatedAt,
      changeFrequency: "weekly",
      priority: 0.72,
    }),
  );

  const wikiArticleEntries: MetadataRoute.Sitemap = wikiArticles.map(
    (article) => ({
      url: `${siteConfig.url}/wiki/${article.slug}`,
      lastModified: article.updatedAt,
      changeFrequency: "monthly",
      priority: 0.75,
    }),
  );

  return [...publicPageEntries, ...shopPageEntries, ...wikiCategoryEntries, ...wikiArticleEntries];
}
