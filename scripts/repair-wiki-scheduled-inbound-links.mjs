import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";

const ARTICLE_LINK_PATTERN = /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]/g;
const RUN_ID = "wiki-scheduled-inbound-links-20260828";
const MINIMUM_INBOUND_TARGET = 3;
const DEFAULT_MAX_INBOUND_TARGET = 5;
const SOURCE_MIN_AGE_DAYS = 10;

const MONTHS = [
  ["farvardin", "فروردین"],
  ["ordibehesht", "اردیبهشت"],
  ["khordad", "خرداد"],
  ["tir", "تیر"],
  ["mordad", "مرداد"],
  ["shahrivar", "شهریور"],
  ["mehr", "مهر"],
  ["aban", "آبان"],
  ["azar", "آذر"],
  ["dey", "دی"],
  ["bahman", "بهمن"],
  ["esfand", "اسفند"],
];

const BUILT_IN_MIZFA_QUERIES = [
  "آسترولوژی امروز",
  "قهر زن شهریوری",
  "رگ خواب زن متولد مهر",
  "رگ خواب زن متولد شهریور",
  "فرق ماه نو و ماه کامل",
  "رگ خواب مردان شهریوری",
  "رگ خواب متولدین زن مرداد",
  "رگ خواب زن متولد آبان",
  "رگ خواب زن متولد اردیبهشت",
  "چارت تولد رایگان فارسی",
  "ساعت دقیق تولد",
  "ساخت چارت تولد",
  "چارت تولد فارسی",
  "تفسیر خانه های چارت تولد",
  "فال سالانه 1405",
  "نود جنوبی",
  "خانه هشتم چارت تولد",
  "رگ خواب مرد متولد اسفند",
  "رگ خواب مرد اردیبهشت",
  "رگ خواب زن متولد اسفند",
  "قهر مرد متولد مهر",
  "خالی بودن خانه های چارت تولد",
  "تفسیر چارت تولد",
  "تحلیل چارت تولد",
  "رگ خواب زن متولد دی",
  "چارت تولد بدون ساعت تولد",
  "استلیوم در چارت تولد",
  "نقطه ضعف زن متولد شهریور",
  "اورب چیست",
  "اصلاح ساعت تولد",
  "خانه پنجم",
  "خصوصیات زن متولد شهریور در عشق",
  "ازدواج اردیبهشت با چه ماهی خوب است",
  "اورانوس در چارت تولد",
  "وضعیت ماه امروز",
  "وضعیت سیارات امروز",
  "آسترولوژی تروپیکال چیست",
  "انواع آسترولوژی",
  "چارت ودیک",
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    apply: false,
    selfCheck: false,
    minInbound: MINIMUM_INBOUND_TARGET,
    maxInbound: DEFAULT_MAX_INBOUND_TARGET,
    maxTargets: Number.POSITIVE_INFINITY,
    gscQueriesCsv: process.env.HALLEUS_GSC_QUERIES_CSV ?? "",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--apply") options.apply = true;
    if (arg === "--self-check") options.selfCheck = true;
    if (arg === "--min-inbound") options.minInbound = Number(args[++index]);
    if (arg === "--max-inbound") options.maxInbound = Number(args[++index]);
    if (arg === "--max-targets") options.maxTargets = Number(args[++index]);
    if (arg === "--gsc-queries-csv") options.gscQueriesCsv = args[++index] ?? "";
  }
  if (!Number.isInteger(options.minInbound) || options.minInbound < 1 || options.minInbound > 10) {
    throw new Error("--min-inbound must be an integer between 1 and 10.");
  }
  if (!Number.isInteger(options.maxInbound) || options.maxInbound < options.minInbound || options.maxInbound > 20) {
    throw new Error("--max-inbound must be an integer between --min-inbound and 20.");
  }
  if (!Number.isFinite(options.maxTargets) || options.maxTargets < 1) {
    options.maxTargets = Number.POSITIVE_INFINITY;
  }
  return options;
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

function stripWikiLinks(value) {
  return String(value ?? "").replace(ARTICLE_LINK_PATTERN, (_, stableId, anchor) => anchor || stableId);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function articleIdsFromBody(bodyMarkdown) {
  return [...new Set([...String(bodyMarkdown ?? "").matchAll(ARTICLE_LINK_PATTERN)].map((match) => match[1]))];
}

function hasTargetLink(bodyMarkdown, target) {
  return new RegExp(String.raw`\[\[article:${escapeRegExp(target)}(?:\||\]\])`).test(bodyMarkdown);
}

function countArticleLinks(text) {
  return [...String(text ?? "").matchAll(ARTICLE_LINK_PATTERN)].length;
}

function splitCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
      continue;
    }
    cell += char;
  }
  cells.push(cell);
  return cells.map((item) => item.trim());
}

function loadQueryHints(csvPath) {
  const hints = [...BUILT_IN_MIZFA_QUERIES];
  if (csvPath && existsSync(csvPath)) {
    const lines = readFileSync(csvPath, "utf8").replaceAll("\r\n", "\n").split("\n").filter(Boolean);
    for (const line of lines.slice(1)) {
      const cells = splitCsvLine(line);
      const query = normalizeText(cells[0]);
      if (query && query.length >= 3 && query.length <= 70) hints.push(query);
    }
  }
  return [...new Set(hints.map(normalizeText).filter(Boolean))];
}

function jsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function legacyMarkdown(row) {
  const lines = [row.intro ?? ""];
  const keyPoints = jsonArray(row.key_points);
  if (keyPoints.length) lines.push("## نکات کلیدی", ...keyPoints.map((point) => `- ${point}`));
  for (const section of jsonArray(row.sections)) {
    lines.push(`## ${section?.title ?? ""}`);
    lines.push(...jsonArray(section?.paragraphs));
    lines.push(...jsonArray(section?.bullets).map((bullet) => `- ${bullet}`));
  }
  return lines.filter(Boolean).join("\n\n");
}

function articleFromRow(row) {
  const queuedSnapshot = row.queued_snapshot && typeof row.queued_snapshot === "object"
    ? row.queued_snapshot
    : null;
  const useQueuedSnapshot = String(row.status ?? "") !== "published" && Boolean(queuedSnapshot);
  const snapshot = useQueuedSnapshot && queuedSnapshot ? queuedSnapshot : {};
  const scheduledFor = row.scheduled_for ?? row.pending_publish_at ?? null;
  return {
    id: String(row.id),
    stableId: String(snapshot.stableId ?? row.stable_id ?? ""),
    slug: String(snapshot.slug ?? row.slug ?? ""),
    title: String(snapshot.title ?? row.title ?? ""),
    shortTitle: String(snapshot.shortTitle ?? row.short_title ?? ""),
    seoTitle: String(snapshot.seoTitle ?? row.seo_title ?? ""),
    metaDescription: snapshot.metaDescription ?? row.meta_description ?? row.summary ?? "",
    categoryId: String(snapshot.categoryId ?? row.category_id ?? ""),
    tags: jsonArray(snapshot.tags ?? row.tags),
    summary: String(snapshot.summary ?? row.summary ?? ""),
    intro: String(snapshot.intro ?? row.intro ?? ""),
    readingMinutes: Number(snapshot.readingMinutes ?? row.reading_minutes ?? 0),
    keyPoints: jsonArray(snapshot.keyPoints ?? row.key_points),
    sections: jsonArray(snapshot.sections ?? row.sections),
    contextLinks: jsonArray(snapshot.contextLinks ?? row.context_links),
    sources: jsonArray(snapshot.sources ?? row.sources),
    callToAction: snapshot.callToAction ?? row.call_to_action ?? null,
    relatedArticleIds: jsonArray(snapshot.relatedArticleIds ?? row.related_article_ids),
    publicationPriority: Number(snapshot.publicationPriority ?? row.publication_priority ?? 999),
    contentCluster: String(snapshot.contentCluster ?? row.content_cluster ?? row.category_id ?? ""),
    articleRole: String(snapshot.articleRole ?? row.article_role ?? ""),
    contentVersion: Number(snapshot.contentVersion ?? row.content_version ?? 1),
    indexable: useQueuedSnapshot ? snapshot.indexable === true : row.is_indexable === true,
    status: String(row.status ?? ""),
    publishedAt: row.published_at ? String(row.published_at) : null,
    scheduledFor: scheduledFor ? String(scheduledFor) : null,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    bodyMarkdown: String(snapshot.bodyMarkdown ?? row.body_markdown ?? "") || legacyMarkdown(row),
  };
}

function isCurrentPublic(article, nowMs) {
  const publishedAtMs = article.publishedAt ? Date.parse(article.publishedAt) : Number.NaN;
  return (
    article.status === "published" &&
    article.indexable &&
    Number.isFinite(publishedAtMs) &&
    publishedAtMs <= nowMs &&
    !article.scheduledFor &&
    !article.deletedAt
  );
}

function isOldEnoughSource(article, nowMs) {
  const publishedAtMs = article.publishedAt ? Date.parse(article.publishedAt) : Number.NaN;
  return isCurrentPublic(article, nowMs) && publishedAtMs <= nowMs - SOURCE_MIN_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function isScheduledTarget(article, nowMs) {
  const scheduledAtMs = article.scheduledFor ? Date.parse(article.scheduledFor) : Number.NaN;
  return (
    article.indexable &&
    !article.deletedAt &&
    !isCurrentPublic(article, nowMs) &&
    (
      article.status === "scheduled" ||
      (Number.isFinite(scheduledAtMs) && scheduledAtMs > nowMs)
    )
  );
}

function titleWords(article) {
  return normalizeText(`${article.title} ${article.shortTitle} ${article.seoTitle}`)
    .replace(/[؛،؟?!.:()«»]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !["چیست", "برای", "هایی", "های", "در", "با", "از", "به", "را"].includes(word));
}

function slugWords(stableId) {
  return String(stableId ?? "").split(/[-_]/).filter((part) => part.length >= 3);
}

function detectMonth(article) {
  return MONTHS.find(([slug, label]) => article.stableId.includes(slug) || article.title.includes(label)) ?? null;
}

function detectTopic(article) {
  const id = article.stableId;
  if (/woman-marriage-compatibility/.test(id)) return "womanMarriage";
  if (/man-marriage-compatibility/.test(id)) return "manMarriage";
  if (/birth-month-compatibility|compatibility/.test(id)) return "compatibility";
  if (/woman-traits/.test(id)) return "womanTraits";
  if (/man-traits/.test(id)) return "manTraits";
  if (/born-traits/.test(id)) return "bornTraits";
  if (/house|ascendant|descendant|midheaven|coeli|ruler|angle/.test(id)) return "house";
  if (/moon|eclipse|full-moon|new-moon/.test(id)) return "moon";
  if (/transit|retrograde|astrology-today|daily|weekly|monthly|1405/.test(id)) return "transit";
  if (/chinese|abjad|vedic|tropical|sidereal|hellenistic/.test(id)) return "system";
  if (/relationship|marriage|love|synastry|divorce/.test(id)) return "relationship";
  if (/money|career|family|creativity|inner-life/.test(id)) return "life";
  return "general";
}

function anchorCandidates(article, queryHints) {
  const month = detectMonth(article);
  const topic = detectTopic(article);
  const candidates = [];
  if (month) {
    const label = month[1];
    if (topic === "womanTraits") candidates.push(`زن متولد ${label}`);
    if (topic === "manTraits") candidates.push(`مرد متولد ${label}`);
    if (topic === "bornTraits") candidates.push(`خصوصیات متولدین ${label}`);
    if (topic === "compatibility") candidates.push(`${label} با چه ماهی سازگار است`, `سازگاری ${label} در رابطه`);
    if (topic === "womanMarriage") candidates.push(`ازدواج زن متولد ${label}`, `زن متولد ${label} در ازدواج`);
    if (topic === "manMarriage") candidates.push(`ازدواج مرد متولد ${label}`, `مرد متولد ${label} در ازدواج`);
  }

  const haystack = normalizeText(`${article.title} ${article.stableId.replaceAll("-", " ")}`);
  for (const query of queryHints) {
    const queryWords = query.split(/\s+/).filter((word) => word.length >= 3);
    const hits = queryWords.filter((word) => haystack.includes(word)).length;
    if (hits >= Math.min(2, queryWords.length)) candidates.push(query);
  }

  const mainTitle = normalizeText(article.title).split(/[؛،?؟]/)[0]?.trim();
  if (mainTitle) candidates.push(mainTitle);
  candidates.push(article.shortTitle, article.seoTitle);

  return [...new Set(candidates.map(normalizeText))]
    .filter((item) => item && item.length >= 3 && item.length <= 70 && !/^مقاله\b/.test(item));
}

function targetHints(article, queryHints) {
  return [...new Set([
    ...titleWords(article).slice(0, 8),
    ...slugWords(article.stableId).slice(0, 8),
    ...anchorCandidates(article, queryHints).flatMap((anchor) => anchor.split(/\s+/)).filter((word) => word.length >= 3),
    article.categoryId,
    article.contentCluster,
  ].map(normalizeText).filter(Boolean))];
}

function overlapScore(target, source, queryHints) {
  const targetPersian = titleWords(target);
  const targetSlug = slugWords(target.stableId);
  const sourceText = normalizeText(stripWikiLinks([
    source.title,
    source.shortTitle,
    source.seoTitle,
    source.summary,
    source.intro,
    source.bodyMarkdown.slice(0, 18000),
  ].join(" "))).toLowerCase();
  let score = 0;
  for (const word of targetPersian) {
    if (sourceText.includes(word.toLowerCase())) score += 7;
  }
  for (const word of targetSlug) {
    if (sourceText.includes(word.toLowerCase())) score += 3;
  }
  if (target.categoryId && target.categoryId === source.categoryId) score += 14;
  if (target.contentCluster && target.contentCluster === source.contentCluster) score += 18;
  if (detectTopic(target) === detectTopic(source)) score += 12;
  const targetMonth = detectMonth(target)?.[1];
  if (targetMonth && sourceText.includes(targetMonth)) score += 20;
  for (const query of queryHints) {
    if (!normalizeText(`${target.title} ${target.summary}`).includes(query)) continue;
    if (sourceText.includes(query)) score += 10;
  }
  const outgoingCount = articleIdsFromBody(source.bodyMarkdown).length;
  score -= Math.max(0, outgoingCount - 8);
  return score;
}

function desiredInboundCount(article, queryHints, maxInbound) {
  let desired = MINIMUM_INBOUND_TARGET;
  const queryText = queryHints.join(" ");
  const importantByQuery = titleWords(article).some((word) => queryText.includes(word));
  if (Number.isFinite(article.publicationPriority) && article.publicationPriority <= 2) desired += 1;
  if (["hub", "pillar", "cluster_hub"].includes(article.articleRole)) desired += 1;
  if (importantByQuery && /chart|birth|ماه|تولد|آسترولوژی|چارت|خانه|رابطه|ازدواج/.test(`${article.stableId} ${article.title}`)) {
    desired += 1;
  }
  return Math.min(maxInbound, desired);
}

function makeSentence(source, target, anchor) {
  const topic = detectTopic(target);
  const month = detectMonth(target)?.[1] ?? "";
  const link = `[[article:${target.stableId}|${anchor}]]`;
  const templates = {
    compatibility: [
      `در همین فضای رابطه، ${link} کمک می‌کند جذب، تعارض و انتظار عاطفی ${month ? `متولد ${month}` : "این الگو"} روشن‌تر دیده شود.`,
      `وقتی بحث از انتخاب شریک جلوتر می‌رود، ${link} تصویر طبیعی‌تری از هماهنگی و اصطکاک می‌سازد.`,
    ],
    womanMarriage: [
      `برای خواندن رابطه از زاویهٔ انتخاب جدی‌تر، ${link} جزئیات همین ماه را در عشق و ازدواج دقیق‌تر می‌کند.`,
      `در کنار شناخت شخصیت، ${link} نشان می‌دهد این الگو در تصمیم عاطفی بلندمدت چطور خودش را نشان می‌دهد.`,
    ],
    manMarriage: [
      `وقتی رابطه به تعهد نزدیک می‌شود، ${link} همین ویژگی‌ها را در ازدواج و انتخاب شریک دقیق‌تر می‌کند.`,
      `برای دیدن رفتار رابطه‌ای در موقعیت جدی‌تر، ${link} ادامهٔ طبیعی همین بحث است.`,
    ],
    womanTraits: [
      `در خوانش شخصی‌تر همین ماه، ${link} ظرافت‌های عاطفی و رفتاری را ملموس‌تر نشان می‌دهد.`,
      `اگر بخواهی این ویژگی‌ها را در تجربهٔ زنانه ببینی، ${link} تصویر نزدیک‌تری می‌سازد.`,
    ],
    manTraits: [
      `برای دیدن بیان مردانهٔ همین کیفیت‌ها، ${link} رفتار، قهر و صمیمیت را مشخص‌تر می‌کند.`,
      `در ادامهٔ همین ماه، ${link} نشان می‌دهد این انرژی در رابطه و تصمیم‌گیری چطور بیرون می‌آید.`,
    ],
    bornTraits: [
      `برای اینکه تصویر این ماه فقط به رابطه محدود نماند، ${link} پایهٔ شخصیتی آن را روشن‌تر می‌کند.`,
      `شناخت ${link} کمک می‌کند نشانه‌های رفتاری این ماه را با دقت بیشتری کنار هم بگذاری.`,
    ],
    house: [
      `در ادامهٔ همین خوانش، ${link} لایهٔ دقیق‌تری از خانه‌ها و زاویه‌های چارت را وارد تصویر می‌کند.`,
      `اگر این بخش از چارت برایت مهم شده، ${link} کمک می‌کند نقش آن را در کل نقشه دقیق‌تر ببینی.`,
    ],
    moon: [
      `در کنار چرخه‌های ماه، ${link} زمان، معنی و اثر نمادین این مرحله را واضح‌تر می‌کند.`,
      `برای دنبال‌کردن ریتم ماه با جزئیات بیشتر، ${link} همین بحث را از زاویهٔ کاربردی‌تری ادامه می‌دهد.`,
    ],
    transit: [
      `برای وصل‌کردن این معنی به زمان حال، ${link} کمک می‌کند اثر ترنزیت‌ها را در بازهٔ مشخص‌تری ببینی.`,
      `وقتی زمان‌بندی مهم می‌شود، ${link} این خوانش را از حالت کلی به وضعیت روز و ماه نزدیک‌تر می‌کند.`,
    ],
    system: [
      `برای مقایسهٔ روش‌ها، ${link} نشان می‌دهد این نگاه با چارت تولد رایج چه تفاوتی دارد.`,
      `اگر روش‌های مختلف آسترولوژی را کنار هم می‌گذاری، ${link} مرز این رویکرد را روشن‌تر می‌کند.`,
    ],
    relationship: [
      `در موضوع رابطه، ${link} کمک می‌کند خوانش از حد برداشت کلی بیرون بیاید و دقیق‌تر شود.`,
      `وقتی پای عشق و انتخاب وسط است، ${link} لایهٔ رابطه‌ای همین بحث را شفاف‌تر می‌کند.`,
    ],
    life: [
      `برای آوردن چارت به زندگی روزمره، ${link} همین نشانه‌ها را در یک حوزهٔ مشخص‌تر دنبال می‌کند.`,
      `اگر می‌خواهی این معنی را کاربردی‌تر ببینی، ${link} آن را به تجربهٔ ملموس‌تری وصل می‌کند.`,
    ],
    general: [
      `در ادامهٔ همین مسیر، ${link} یک لایهٔ مرتبط دیگر به این خوانش اضافه می‌کند.`,
      `برای کامل‌تر شدن تصویر، ${link} کمک می‌کند این موضوع را از زاویهٔ نزدیک‌تری ببینی.`,
    ],
  };
  const bucket = templates[topic] ?? templates.general;
  const seed = source.stableId.length + target.stableId.length + anchor.length;
  return bucket[seed % bucket.length];
}

function pickParagraph(sections, hints, usedParagraphs) {
  const candidates = [];
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const paragraphs = Array.isArray(section?.paragraphs) ? section.paragraphs : [];
    for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
      const key = `${sectionIndex}:${paragraphIndex}`;
      const paragraph = String(paragraphs[paragraphIndex] ?? "");
      if (!paragraph.trim() || usedParagraphs.has(key) || countArticleLinks(paragraph) >= 2) continue;
      const haystack = normalizeText(stripWikiLinks(`${section?.title ?? ""} ${paragraph}`));
      const hintScore = hints.filter((hint) => hint && haystack.includes(hint)).length;
      if (hintScore <= 0) continue;
      candidates.push({ sectionIndex, paragraphIndex, paragraph, hintScore, length: paragraph.length });
    }
  }
  candidates.sort((left, right) => right.hintScore - left.hintScore || right.length - left.length);
  return candidates[0] ?? null;
}

function replaceBodyParagraph(bodyMarkdown, before, after) {
  if (bodyMarkdown.includes(before)) return bodyMarkdown.replace(before, after);
  const compactPattern = escapeRegExp(normalizeText(before)).replace(/\\ /g, String.raw`\s+`);
  const match = bodyMarkdown.match(new RegExp(compactPattern));
  if (!match) return null;
  return bodyMarkdown.replace(match[0], after);
}

function buildSnapshot(row, sections, bodyMarkdown, relatedArticleIds, contentVersion) {
  return {
    stableId: row.stable_id,
    slug: row.slug,
    title: row.title,
    shortTitle: row.short_title,
    seoTitle: row.seo_title,
    metaDescription: row.meta_description ?? row.summary,
    categoryId: row.category_id,
    tags: row.tags ?? [],
    summary: row.summary,
    intro: row.intro,
    readingMinutes: row.reading_minutes,
    publicationPriority: row.publication_priority,
    contentCluster: row.content_cluster ?? row.category_id,
    articleRole: row.article_role,
    relatedArticleIds,
    indexable: row.is_indexable,
    bodyMarkdown,
    keyPoints: row.key_points ?? [],
    sections,
    contextLinks: row.context_links ?? [],
    sources: row.sources ?? [],
    callToAction: row.call_to_action ?? null,
    contentVersion,
  };
}

async function syncInlineLinks(tx, sourceArticleId, bodyMarkdown, relatedArticleIds) {
  const inlineIds = [...new Set(articleIdsFromBody(bodyMarkdown))];
  const relatedIds = [...new Set(relatedArticleIds ?? [])];
  const targetIds = [...new Set([...inlineIds, ...relatedIds])];
  const publicRows = targetIds.length
    ? await tx`
        select stable_id
        from public.wiki_articles
        where stable_id = any(${targetIds}::text[])
          and status = 'published'
          and is_indexable = true
          and published_at is not null
          and published_at <= now()
          and scheduled_for is null
          and deleted_at is null
      `
    : [];
  const publicReadyTargets = new Set(publicRows.map((row) => String(row.stable_id)));
  const statusFor = (targetId) => publicReadyTargets.has(targetId) ? "active" : "pending";

  await tx`delete from public.wiki_internal_links where source_article_id = ${sourceArticleId}::uuid`;
  for (const targetId of inlineIds) {
    const activationStatus = statusFor(targetId);
    await tx`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at, activation_error
      ) values (
        ${sourceArticleId}::uuid, ${targetId}, 'inline', ${`[[article:${targetId}]]`},
        ${activationStatus}, now(), now(),
        ${activationStatus === "pending" ? "target-not-public-ready" : null}
      )
    `;
  }
  for (const targetId of relatedIds) {
    const activationStatus = statusFor(targetId);
    await tx`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at, activation_error
      ) values (
        ${sourceArticleId}::uuid, ${targetId}, 'related', ${targetId},
        ${activationStatus}, now(), now(),
        ${activationStatus === "pending" ? "target-not-public-ready" : null}
      )
      on conflict do nothing
    `;
  }
}

async function submitIndexNowBestEffort(slugs) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://halleus.ir").replace(/\/+$/, "");
  const key = process.env.HALLEUS_INDEXNOW_KEY;
  const urlList = [...new Set(slugs.filter(Boolean).map((slug) => `${site}/wiki/${slug}`))].slice(0, 10000);
  if (!key || !urlList.length) return { ok: true, skipped: true, submitted: 0 };
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      host: new URL(site).host,
      key,
      keyLocation: `${site}/indexnow-key.txt`,
      urlList,
    }),
  });
  return { ok: response.ok, skipped: false, status: response.status, submitted: response.ok ? urlList.length : 0 };
}

function assertSelfCheck() {
  const source = readFileSync(new URL(import.meta.url), "utf8");
  for (const marker of [
    "const SOURCE_MIN_AGE_DAYS = 10",
    "activationStatus === \"pending\"",
    "Add natural pending inbound links",
    "system.wiki.scheduled_inbound_link_repair",
    "BUILT_IN_MIZFA_QUERIES",
    "hasTargetLink(source.bodyMarkdown, target.stableId)",
  ]) {
    if (!source.includes(marker)) throw new Error(`self-check marker missing: ${marker}`);
  }
  console.log("Wiki scheduled inbound repair self-check OK");
}

async function loadArticles(tx) {
  const rows = await tx`
    select
      article.id::text, article.stable_id, article.slug, article.title,
      article.short_title, article.seo_title, article.meta_description,
      article.category_id, article.tags, article.summary, article.intro,
      article.reading_minutes, article.key_points, article.sections,
      article.context_links, article.sources, article.call_to_action,
      article.related_article_ids, article.publication_priority,
      article.content_cluster, article.article_role, article.content_version,
      article.is_indexable, article.body_markdown, article.status,
      article.published_at::text, article.scheduled_for::text,
      article.deleted_at::text, job.run_at::text as pending_publish_at,
      revision.snapshot as queued_snapshot
    from public.wiki_articles as article
    left join lateral (
      select active_job.article_id, active_job.revision_number, active_job.run_at
      from halleus_private.wiki_publish_jobs as active_job
      where active_job.article_id = article.id
        and active_job.status in ('queued', 'running', 'retry')
      order by active_job.run_at asc, active_job.created_at asc
      limit 1
    ) as job on true
    left join public.wiki_article_revisions as revision
      on revision.article_id = job.article_id
     and revision.revision_number = job.revision_number
    where article.deleted_at is null
    order by article.stable_id
  `;
  return rows.map(articleFromRow);
}

function planRepairs(articles, queryHints, options, nowMs) {
  const oldPublicSources = articles.filter((article) => isOldEnoughSource(article, nowMs));
  const scheduledTargets = articles
    .filter((article) => isScheduledTarget(article, nowMs))
    .sort((left, right) => Date.parse(left.scheduledFor) - Date.parse(right.scheduledFor))
    .slice(0, options.maxTargets);
  const sourceAdditions = new Map();
  const targetPreparedSources = new Map();
  const placements = [];
  const incompleteTargets = [];

  for (const target of scheduledTargets) {
    const currentSources = new Set(
      oldPublicSources
        .filter((source) => hasTargetLink(source.bodyMarkdown, target.stableId))
        .map((source) => source.stableId),
    );
    targetPreparedSources.set(target.stableId, currentSources);
    const desired = desiredInboundCount(target, queryHints, options.maxInbound);
    const needed = Math.max(0, Math.max(options.minInbound, desired) - currentSources.size);
    if (!needed) continue;

    const hints = targetHints(target, queryHints);
    const anchors = anchorCandidates(target, queryHints);
    const candidates = oldPublicSources
      .filter((source) => source.stableId !== target.stableId)
      .filter((source) => !currentSources.has(source.stableId))
      .filter((source) => !hasTargetLink(source.bodyMarkdown, target.stableId))
      .map((source) => ({
        source,
        score: overlapScore(target, source, queryHints),
      }))
      .filter((item) => item.score >= 12)
      .sort((left, right) =>
        right.score - left.score ||
        (sourceAdditions.get(left.source.stableId) ?? 0) - (sourceAdditions.get(right.source.stableId) ?? 0)
      );

    let added = 0;
    for (const candidate of candidates) {
      if (added >= needed) break;
      const existingForSource = sourceAdditions.get(candidate.source.stableId) ?? 0;
      if (existingForSource >= 5) continue;
      const anchor = anchors[(added + candidate.source.stableId.length) % anchors.length] ?? target.title;
      placements.push({
        source: candidate.source.stableId,
        target: target.stableId,
        anchor,
        sentence: makeSentence(candidate.source, target, anchor),
        hints,
        score: candidate.score,
        targetTitle: target.title,
        targetScheduledFor: target.scheduledFor,
        desired,
        existingPreparedInbound: currentSources.size,
      });
      sourceAdditions.set(candidate.source.stableId, existingForSource + 1);
      currentSources.add(candidate.source.stableId);
      added += 1;
    }
    if (currentSources.size < options.minInbound) {
      incompleteTargets.push({
        stableId: target.stableId,
        title: target.title,
        scheduledFor: target.scheduledFor,
        preparedInbound: currentSources.size,
        minimum: options.minInbound,
      });
    }
  }
  return { placements, incompleteTargets, targetCount: scheduledTargets.length, sourceCount: oldPublicSources.length };
}

async function main() {
  const options = parseArgs();
  if (options.selfCheck) {
    assertSelfCheck();
    return;
  }

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const queryHints = loadQueryHints(options.gscQueriesCsv);
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  const nowMs = Date.now();

  try {
    const result = await sql.begin(async (tx) => {
      const articles = await loadArticles(tx);
      const byStableId = new Map(articles.map((article) => [article.stableId, article]));
      const plan = planRepairs(articles, queryHints, options, nowMs);
      const touchedSources = [...new Set(plan.placements.map((item) => item.source))];
      const openDraftRows = touchedSources.length
        ? await tx`
            select article.stable_id
            from public.wiki_article_drafts as draft
            join public.wiki_articles as article on article.id = draft.article_id
            where article.stable_id = any(${touchedSources}::text[])
          `
        : [];
      if (openDraftRows.length) {
        throw new Error(`Sources with open drafts must be resolved first: ${openDraftRows.map((row) => row.stable_id).join(", ")}`);
      }

      const sourcePlacements = new Map();
      for (const placement of plan.placements) {
        const current = sourcePlacements.get(placement.source) ?? [];
        current.push(placement);
        sourcePlacements.set(placement.source, current);
      }

      const applied = [];
      const skipped = [];
      const changedSourceSlugs = [];
      for (const [sourceStableId, items] of sourcePlacements) {
        const source = byStableId.get(sourceStableId);
        if (!source) continue;
        let bodyMarkdown = source.bodyMarkdown;
        const sections = JSON.parse(JSON.stringify(source.sections));
        let relatedArticleIds = [...new Set(source.relatedArticleIds ?? [])];
        const usedParagraphs = new Set();
        let changed = false;

        for (const placement of items) {
          const target = byStableId.get(placement.target);
          if (!target) {
            skipped.push({ ...placement, reason: "missing-target" });
            continue;
          }
          if (hasTargetLink(bodyMarkdown, placement.target)) {
            skipped.push({ ...placement, reason: "already-linked" });
            continue;
          }
          const picked = pickParagraph(sections, placement.hints, usedParagraphs);
          if (!picked) {
            skipped.push({ ...placement, reason: "no-safe-related-paragraph" });
            continue;
          }
          const before = String(sections[picked.sectionIndex].paragraphs[picked.paragraphIndex]);
          const after = `${before.trim()} ${placement.sentence}`;
          const nextBody = replaceBodyParagraph(bodyMarkdown, before, after);
          if (!nextBody) {
            skipped.push({ ...placement, reason: "body-paragraph-not-found" });
            continue;
          }
          sections[picked.sectionIndex].paragraphs[picked.paragraphIndex] = after;
          usedParagraphs.add(`${picked.sectionIndex}:${picked.paragraphIndex}`);
          bodyMarkdown = nextBody;
          relatedArticleIds = [...new Set([...relatedArticleIds, placement.target])];
          changed = true;
          applied.push({
            source: placement.source,
            target: placement.target,
            anchor: placement.anchor,
            score: placement.score,
            section: sections[picked.sectionIndex].title ?? "",
          });
        }

        if (!changed) continue;
        changedSourceSlugs.push(source.slug);
        if (options.apply) {
          const row = await tx`
            select *
            from public.wiki_articles
            where stable_id = ${source.stableId}
            for update
          `;
          const currentRow = row[0];
          const nextVersion = Number(currentRow.content_version ?? source.contentVersion ?? 1) + 1;
          const snapshot = buildSnapshot(currentRow, sections, bodyMarkdown, relatedArticleIds, nextVersion);
          await tx`
            update public.wiki_articles
            set sections = ${tx.json(sections)},
                body_markdown = ${bodyMarkdown},
                related_article_ids = ${tx.json(relatedArticleIds)},
                content_version = ${nextVersion},
                updated_at = now()
            where id = ${source.id}::uuid
          `;
          await tx`
            insert into public.wiki_article_revisions (
              article_id, revision_number, snapshot, change_note, created_by,
              revision_status, published_at
            ) values (
              ${source.id}::uuid,
              (select coalesce(max(existing.revision_number), 0)::integer + 1
               from public.wiki_article_revisions as existing
               where existing.article_id = ${source.id}::uuid),
              ${tx.json(snapshot)},
              ${`Add natural pending inbound links for ${RUN_ID}`},
              null,
              'published',
              now()
            )
          `;
          await syncInlineLinks(tx, source.id, bodyMarkdown, relatedArticleIds);
        }
      }

      if (options.apply) {
        await tx`
          insert into halleus_private.admin_audit_events (
            actor_user_id, actor_role, action, target_type, target_id,
            before_summary, after_summary, reason, success, request_correlation_id
          ) values (
            null, 'system', 'system.wiki.scheduled_inbound_link_repair',
            'wiki_graph', ${RUN_ID},
            ${tx.json({
              sourceMinAgeDays: SOURCE_MIN_AGE_DAYS,
              minInbound: options.minInbound,
              maxInbound: options.maxInbound,
            })},
            ${tx.json({
              appliedCount: applied.length,
              skippedCount: skipped.length,
              changedSourceCount: changedSourceSlugs.length,
              incompleteTargets: plan.incompleteTargets,
            })},
            'Prepare natural contextual pending inbound links for scheduled Wiki articles without removing existing links.',
            true,
            ${RUN_ID}
          )
        `;
      }

      return {
        mode: options.apply ? "applied" : "dry-run",
        runId: RUN_ID,
        sourceMinAgeDays: SOURCE_MIN_AGE_DAYS,
        minInbound: options.minInbound,
        maxInbound: options.maxInbound,
        scannedScheduledTargets: plan.targetCount,
        eligibleOldPublicSources: plan.sourceCount,
        plannedCount: plan.placements.length,
        appliedCount: applied.length,
        skippedCount: skipped.length,
        changedSourceSlugs,
        incompleteTargets: plan.incompleteTargets,
        applied,
        skipped,
      };
    });

    const discovery = options.apply ? await submitIndexNowBestEffort(result.changedSourceSlugs) : null;
    console.log(JSON.stringify({ ...result, discovery }, null, 2));
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
