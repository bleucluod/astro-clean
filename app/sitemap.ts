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

  return [...publicPageEntries, ...wikiCategoryEntries, ...wikiArticleEntries];
}
