import type { WikiArticle, WikiCategory } from "@/lib/wiki/wiki-content";

export type DatedWikiArticle = WikiArticle & {
  updatedAt: string;
};

export type PublicWikiCategoryView = {
  category: WikiCategory;
  articles: DatedWikiArticle[];
  updatedAt: string;
};

const PUBLIC_CATEGORY_ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

function updatedAtTimestamp(article: DatedWikiArticle) {
  const timestamp = Date.parse(article.updatedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareText(left: string, right: string) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function sortPublicWikiArticlesNewestFirst(
  articles: readonly DatedWikiArticle[],
) {
  return [...articles].sort((left, right) => {
    const dateDifference = updatedAtTimestamp(right) - updatedAtTimestamp(left);
    return dateDifference || compareText(left.slug, right.slug);
  });
}

export function buildPublicWikiCategoryViews(
  articles: readonly DatedWikiArticle[],
  categories: readonly WikiCategory[],
) {
  return categories.flatMap<PublicWikiCategoryView>((category) => {
    if (!PUBLIC_CATEGORY_ID_PATTERN.test(category.id)) {
      return [];
    }

    const categoryArticles = sortPublicWikiArticlesNewestFirst(
      articles.filter((article) => article.categoryId === category.id),
    );

    if (categoryArticles.length === 0) {
      return [];
    }

    return [
      {
        category,
        articles: categoryArticles,
        updatedAt: categoryArticles[0].updatedAt,
      },
    ];
  });
}

export function findPublicWikiCategoryView(
  categoryId: string,
  articles: readonly DatedWikiArticle[],
  categories: readonly WikiCategory[],
) {
  return (
    buildPublicWikiCategoryViews(articles, categories).find(
      (view) => view.category.id === categoryId,
    ) ?? null
  );
}
