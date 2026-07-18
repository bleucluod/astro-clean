import { AdminAccessError } from "@/lib/admin/admin-auth";
import type {
  WikiArticleSnapshot,
  WikiArticleRole,
  WikiScheduleSettings,
} from "@/lib/wiki/wiki-cms-types";
import { parseWikiMarkdown } from "@/lib/wiki/wiki-markdown";

const stableIdPattern = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const categoryIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdminAccessError(400, "Wiki article payload must be an object.");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, maxLength: number) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > maxLength) {
    throw new AdminAccessError(400, `${field} is required and too long or empty.`);
  }
  return result;
}

function nullableText(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return text(value, "optional Wiki field", maxLength);
}

function textArray(value: unknown, field: string, maxItems = 50) {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new AdminAccessError(400, `${field} must be an array.`);
  }
  return [...new Set(value.map((item) => text(item, field, 300)))];
}

function integer(value: unknown, field: string, minimum: number, maximum: number) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new AdminAccessError(400, `${field} is outside the allowed range.`);
  }
  return result;
}

function linkArray(value: unknown) {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value) || value.length > 30) {
    throw new AdminAccessError(400, "contextLinks must be a small array.");
  }
  return value.map((raw) => {
    const item = record(raw);
    const href = text(item.href, "context link href", 500);
    if (!href.startsWith("/") && !href.startsWith("https://")) {
      throw new AdminAccessError(400, "Context links must use an internal path or HTTPS.");
    }
    return { label: text(item.label, "context link label", 200), href };
  });
}

function sourceArray(value: unknown) {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value) || value.length > 40) {
    throw new AdminAccessError(400, "sources must be a small array.");
  }
  return value.map((raw) => {
    if (typeof raw === "string") {
      return text(raw, "source", 1000);
    }
    const item = record(raw);
    const href = text(item.href, "source href", 1000);
    if (!href.startsWith("https://")) {
      throw new AdminAccessError(400, "External Wiki sources must use HTTPS.");
    }
    return { label: text(item.label, "source label", 300), href };
  });
}

function callToAction(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }
  const item = record(value);
  const href = text(item.href, "CTA href", 500);
  if (!href.startsWith("/")) {
    throw new AdminAccessError(400, "Wiki CTA must use an internal path.");
  }
  return {
    title: text(item.title, "CTA title", 300),
    text: text(item.text, "CTA text", 1200),
    label: text(item.label, "CTA label", 160),
    href,
  };
}

export function readWikiCategoryInput(value: unknown) {
  const input = record(value);
  const id = text(input.id, "category id", 80);
  if (!categoryIdPattern.test(id)) {
    throw new AdminAccessError(400, "Wiki category ID must use lowercase Latin letters, numbers, and hyphens.");
  }
  return {
    id,
    label: text(input.label, "category label", 160),
    description: text(input.description, "category description", 1000),
  };
}

export function readWikiArticleSnapshot(value: unknown): WikiArticleSnapshot {
  const input = record(value);
  const stableId = text(input.stableId, "stableId", 160);
  const slug = text(input.slug, "slug", 160);
  if (!stableIdPattern.test(stableId) || !slugPattern.test(slug)) {
    throw new AdminAccessError(400, "Wiki stableId or slug format is invalid.");
  }
  const bodyMarkdown = text(input.bodyMarkdown, "bodyMarkdown", 120_000);
  let parsed;
  try {
    parsed = parseWikiMarkdown(bodyMarkdown);
  } catch (error) {
    throw new AdminAccessError(
      400,
      error instanceof Error ? error.message : "Wiki Markdown is invalid.",
    );
  }
  const role = text(input.articleRole, "articleRole", 20);
  if (role !== "pillar" && role !== "support") {
    throw new AdminAccessError(400, "articleRole must be pillar or support.");
  }
  const keyPoints = parsed.keyPoints.length
    ? parsed.keyPoints
    : Array.isArray(input.keyPoints)
      ? textArray(input.keyPoints, "keyPoints", 12)
      : [];
  const summary = text(input.summary, "summary", 2000);

  return {
    stableId,
    slug,
    title: text(input.title, "title", 300),
    shortTitle: text(input.shortTitle ?? input.title, "shortTitle", 200),
    seoTitle: nullableText(input.seoTitle, 300),
    metaDescription: text(input.metaDescription, "metaDescription", 1000),
    categoryId: text(input.categoryId, "categoryId", 160),
    tags: textArray(input.tags ?? [], "tags", 30),
    summary,
    intro: text(input.intro ?? parsed.intro ?? summary, "intro", 5000),
    readingMinutes: integer(input.readingMinutes, "readingMinutes", 1, 240),
    publicationPriority: integer(input.publicationPriority ?? 0, "publicationPriority", 0, 300),
    contentCluster: text(input.contentCluster, "contentCluster", 160),
    articleRole: role as WikiArticleRole,
    relatedArticleIds: textArray(input.relatedArticleIds ?? [], "relatedArticleIds", 50),
    indexable: input.indexable === true,
    bodyMarkdown,
    keyPoints: keyPoints.length ? keyPoints : [summary],
    sections: parsed.sections,
    contextLinks: linkArray(input.contextLinks),
    sources: sourceArray(input.sources),
    callToAction: callToAction(input.callToAction),
    contentVersion: integer(input.contentVersion ?? 1, "contentVersion", 1, 1_000_000),
  };
}

export function readWikiScheduleSettings(value: unknown): WikiScheduleSettings {
  const input = record(value);
  const allowedWeekdays = Array.isArray(input.allowedWeekdays)
    ? [...new Set(input.allowedWeekdays.map((item) => integer(item, "allowedWeekdays", 0, 6)))]
    : [];
  if (allowedWeekdays.length === 0) {
    throw new AdminAccessError(400, "At least one publication weekday is required.");
  }
  const publishTime = text(input.publishTime, "publishTime", 8);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(publishTime)) {
    throw new AdminAccessError(400, "publishTime must use HH:MM.");
  }
  const timezone = text(input.timezone, "timezone", 100);
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date());
  } catch {
    throw new AdminAccessError(400, "Unknown IANA timezone.");
  }
  const maxArticlesPerDay = integer(input.maxArticlesPerDay, "maxArticlesPerDay", 1, 12);
  const blackoutDates = textArray(input.blackoutDates ?? [], "blackoutDates", 100);
  if (blackoutDates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
    throw new AdminAccessError(400, "blackoutDates must use YYYY-MM-DD.");
  }
  return {
    articlesPerWeek: maxArticlesPerDay * allowedWeekdays.length,
    maxArticlesPerDay,
    allowedWeekdays,
    publishTime,
    timezone,
    minimumIntervalHours: integer(input.minimumIntervalHours, "minimumIntervalHours", 1, 168),
    blackoutDates,
    pillarBeforeSupport: input.pillarBeforeSupport !== false,
    maxHorizonDays: integer(input.maxHorizonDays, "maxHorizonDays", 7, 730),
    publishingPaused: input.publishingPaused === true,
  };
}
