import type {
  WikiContentGuideArticle,
  WikiContentGuideQueueItem,
} from "@/lib/wiki/wiki-cms-types";

type WikiGuideCategory = {
  id: string;
  label: string;
  description: string;
};

const POSITIONED_JOB_STATUSES = new Set(["queued", "retry"]);

function tableCell(value: string) {
  return value.replaceAll("|", "\\|").replaceAll("\r", " ").replaceAll("\n", " ").trim();
}

function queueTimestamp(item: WikiContentGuideQueueItem) {
  const value = Date.parse(item.runAt);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function queueStatusRank(status: WikiContentGuideQueueItem["jobStatus"]) {
  if (status === "running") return 0;
  if (POSITIONED_JOB_STATUSES.has(status)) return 1;
  return 2;
}

function queueStatusLabel(status: WikiContentGuideQueueItem["jobStatus"]) {
  if (status === "running") return "در حال انتشار";
  if (status === "queued") return "در صف";
  if (status === "retry") return "تلاش مجدد";
  return "ناموفق";
}

export function buildLiveWikiContentGuide(input: {
  baseGuide: string;
  categories: WikiGuideCategory[];
  articles: WikiContentGuideArticle[];
  queue: WikiContentGuideQueueItem[];
  generatedAt: Date;
}) {
  const categories = [...input.categories].sort((left, right) =>
    left.id.localeCompare(right.id, "en"),
  );
  const articles = [...input.articles].sort((left, right) =>
    left.stableId.localeCompare(right.stableId, "en"),
  );
  const queue = [...input.queue].sort((left, right) =>
    queueStatusRank(left.jobStatus) - queueStatusRank(right.jobStatus) ||
    queueTimestamp(left) - queueTimestamp(right) ||
    right.publicationPriority - left.publicationPriority ||
    left.stableId.localeCompare(right.stableId, "en"),
  );
  const positionedQueue = queue.filter((item) =>
    POSITIONED_JOB_STATUSES.has(item.jobStatus),
  );
  const positionByStableId = new Map(
    positionedQueue.map((item, index) => [item.stableId, index + 1]),
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
  const queueLines = queue.map((item) => {
    const position = positionByStableId.get(item.stableId);
    const positionLabel = item.jobStatus === "running"
      ? "در حال انتشار"
      : position
        ? position.toLocaleString("fa-IR")
        : "خارج از صف";
    return `| ${positionLabel} | \`${tableCell(item.stableId)}\` | ${tableCell(item.title)} | ${item.articleRole === "pillar" ? "pillar" : "support"} | \`${tableCell(item.contentCluster ?? "—")}\` | ${item.publicationPriority.toLocaleString("fa-IR")} | ${queueStatusLabel(item.jobStatus)} | \`${tableCell(item.runAt)}\` |`;
  });
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
    "## صف زندهٔ انتشار",
    "",
    "این جدول وضعیت صف در لحظهٔ دانلود راهنماست. برای مقاله‌های تازه فقط امتیاز نسبی `publication_priority` را در بازهٔ ۰ تا ۳۰۰ تعیین کن؛ جایگاه یا تاریخ انتشار را داخل manifest ننویس. وابستگی مقاله‌ها و تقدم pillar می‌توانند از امتیاز عددی مهم‌تر باشند.",
    "",
    "| جایگاه فعلی | article_id | عنوان | نقش | خوشه | اولویت | وضعیت job | زمان برنامه‌ریزی |",
    "| --- | --- | --- | --- | --- | ---: | --- | --- |",
    ...(queueLines.length ? queueLines : ["| — | — | صف انتشار خالی است | — | — | — | — | — |"]),
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
