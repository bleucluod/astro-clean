import type { WikiContentGuideArticle } from "@/lib/wiki/wiki-cms-types";

type WikiGuideCategory = {
  id: string;
  label: string;
  description: string;
};

function tableCell(value: string) {
  return value.replaceAll("|", "\\|").replaceAll("\r", " ").replaceAll("\n", " ").trim();
}

export function buildLiveWikiContentGuide(input: {
  baseGuide: string;
  categories: WikiGuideCategory[];
  articles: WikiContentGuideArticle[];
  generatedAt: Date;
}) {
  const categories = [...input.categories].sort((left, right) =>
    left.id.localeCompare(right.id, "en"),
  );
  const articles = [...input.articles].sort((left, right) =>
    left.stableId.localeCompare(right.stableId, "en"),
  );
  const linkableArticles = articles.filter((article) =>
    !article.deletedAt && article.status === "published",
  );
  const categoryLines = categories.map((category) =>
    `- \`${category.id}\` — ${category.label}: ${category.description}`,
  );
  const linkableLines = linkableArticles.map((article) =>
    `| \`${tableCell(article.stableId)}\` | ${tableCell(article.title)} | \`${tableCell(article.categoryId)}\` | \`/wiki/${tableCell(article.slug)}\` |`,
  );
  const reservedLines = articles.map((article) => {
    const status = article.deletedAt ? "deleted-reserved" : article.status;
    return `| \`${tableCell(article.stableId)}\` | \`${tableCell(article.slug)}\` | ${tableCell(article.title)} | \`${tableCell(article.categoryId)}\` | ${status} | ${article.contentVersion} |`;
  });

  return [
    input.baseGuide.trim(),
    "",
    "# فهرست زندهٔ تولید محتوا",
    "",
    `زمان تولید: ${input.generatedAt.toISOString()}`,
    "",
    "این بخش مستقیماً از دیتابیس مدیریت ویکی ساخته شده است. برای هر سفارش تازه، نسخهٔ جدید همین فایل را از پنل دانلود کن؛ sitemap جایگزین این فهرست نیست.",
    "",
    "## دسته‌های مجاز فعلی",
    "",
    ...(categoryLines.length ? categoryLines : ["- هیچ دسته‌ای ثبت نشده است."]),
    "",
    "## مقاله‌های منتشرشده و قابل لینک",
    "",
    "برای لینک‌سازی به مقاله‌های موجود فقط از stable IDهای این جدول استفاده کن.",
    "",
    "| article_id | عنوان | دسته | مسیر عمومی |",
    "| --- | --- | --- | --- |",
    ...(linkableLines.length ? linkableLines : ["| — | هنوز مقالهٔ منتشرشده‌ای وجود ندارد | — | — |"]),
    "",
    "## همهٔ شناسه‌ها و slugهای رزروشده",
    "",
    "هیچ `article_id` یا `slug` این جدول را برای مقاله‌ای تازه استفاده نکن. فقط برای ویرایش همان مقاله، همان `article_id` را با `version` بزرگ‌تر نگه دار.",
    "",
    "| article_id | slug | عنوان | دسته | وضعیت | نسخه |",
    "| --- | --- | --- | --- | --- | ---: |",
    ...(reservedLines.length ? reservedLines : ["| — | — | هنوز مقاله‌ای ثبت نشده | — | — | — |"]),
    "",
  ].join("\n");
}
