import postgres from "postgres";

const ARTICLE_LINK_PATTERN = /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]/g;
const RUN_ID = "wiki-zero-inbound-live-links-20260828";

const placements = [
  {
    source: "what-is-birth-chart-interpretation",
    target: "ai-birth-chart-interpretation",
    anchor: "تحلیل چارت تولد با هوش مصنوعی",
    sentence:
      "اگر می‌خواهی همین مسیر را با ابزار هم امتحان کنی، راهنمای [[article:ai-birth-chart-interpretation|تحلیل چارت تولد با هوش مصنوعی]] کمک می‌کند فرق خروجی سریع و تفسیر دقیق‌تر را بهتر ببینی.",
    hints: ["تفسیر", "چارت تولد", "ابزار"],
  },
  {
    source: "birth-chart-report-layers",
    target: "ai-birth-chart-interpretation",
    anchor: "تفسیر چارت تولد با هوش مصنوعی",
    sentence:
      "برای مقایسه خروجی روایی با ابزارهای خودکار، مقاله [[article:ai-birth-chart-interpretation|تفسیر چارت تولد با هوش مصنوعی]] توضیح می‌دهد کجا باید به سرعت ابزار اعتماد کرد و کجا نیاز به خواندن دقیق‌تر داریم.",
    hints: ["گزارش", "روایت", "تفسیر"],
  },
  {
    source: "birth-chart-and-relationships",
    target: "marriage-astrology-name-vs-synastry",
    anchor: "طالع‌بینی ازدواج با اسم دو طرف یا سینستری",
    sentence:
      "برای اینکه این مقایسه سطحی نشود، [[article:marriage-astrology-name-vs-synastry|طالع‌بینی ازدواج با اسم دو طرف یا سینستری]] فرق روش‌های ساده‌تر با خواندن رابطه از روی چارت را جدا می‌کند.",
    hints: ["سینستری", "رابطه", "ازدواج"],
  },
  {
    source: "seventh-house-in-natal-chart",
    target: "marriage-astrology-name-vs-synastry",
    anchor: "طالع‌بینی ازدواج با اسم دو طرف یا سینستری",
    sentence:
      "اگر سؤال اصلی درباره ازدواج است، خواندن [[article:marriage-astrology-name-vs-synastry|طالع‌بینی ازدواج با اسم دو طرف یا سینستری]] کمک می‌کند خانه هفتم را با روش‌های رایج‌تر مقایسه کنی.",
    hints: ["ازدواج", "رابطه", "شراکت"],
  },
  {
    source: "persian-birth-months-astrology-guide",
    target: "birth-month-flowers",
    anchor: "گل ماه تولد",
    sentence:
      "اگر به جای تحلیل شخصیتی دنبال نمادهای ساده‌تر و مناسب هدیه هستی، [[article:birth-month-flowers|گل ماه تولد]] مسیر سبک‌تری برای شروع می‌دهد.",
    hints: ["نماد", "ماه تولد", "شخصیت"],
  },
  {
    source: "shahrivar-born-traits",
    target: "birth-month-flowers",
    anchor: "گل ماه تولد",
    sentence:
      "برای یک نگاه نمادین‌تر به شهریور و ماه‌های دیگر، راهنمای [[article:birth-month-flowers|گل ماه تولد]] می‌تواند کنار این خوانش شخصیتی قرار بگیرد.",
    hints: ["شهریور", "نماد", "ماه تولد"],
  },
  {
    source: "lilith-in-natal-chart",
    target: "mean-lilith-vs-true-lilith",
    anchor: "فرق Mean Lilith و True Lilith",
    sentence:
      "اگر در نرم‌افزارهای مختلف جایگاه لیلث کمی فرق داشت، مقاله [[article:mean-lilith-vs-true-lilith|فرق Mean Lilith و True Lilith]] توضیح می‌دهد این اختلاف از کجا می‌آید.",
    hints: ["لیلث", "محاسبه", "جایگاه"],
  },
  {
    source: "lunar-nodes-in-natal-chart",
    target: "mean-node-vs-true-node",
    anchor: "فرق Mean Node و True Node",
    sentence:
      "در مورد گره‌های ماه هم اختلاف محاسبه وجود دارد؛ [[article:mean-node-vs-true-node|فرق Mean Node و True Node]] همین تفاوت را با زبان ساده‌تر توضیح می‌دهد.",
    hints: ["گره", "نود", "محاسبه"],
  },
  {
    source: "north-node-vs-south-node",
    target: "mean-node-vs-true-node",
    anchor: "Mean Node و True Node",
    sentence:
      "بعد از فهمیدن نقش نود شمالی و جنوبی، مقاله [[article:mean-node-vs-true-node|Mean Node و True Node]] کمک می‌کند نوع محاسبه گره‌ها را هم درست‌تر بخوانی.",
    hints: ["نود شمالی", "نود جنوبی", "گره"],
  },
  {
    source: "what-is-astrology",
    target: "is-astrology-real-science",
    anchor: "آیا آسترولوژی واقعی است",
    sentence:
      "برای مرزبندی دقیق‌تر بین تجربه شخصی و ادعای علمی، مقاله [[article:is-astrology-real-science|آیا آسترولوژی واقعی است]] همین سؤال را جداگانه و انتقادی‌تر بررسی می‌کند.",
    hints: ["علم", "کاربرد", "اعتبار"],
  },
  {
    source: "natal-chart-uses-and-limits",
    target: "is-astrology-real-science",
    anchor: "واقعی بودن آسترولوژی",
    sentence:
      "اگر بحث به اعتبار کلی این زبان می‌رسد، راهنمای [[article:is-astrology-real-science|واقعی بودن آسترولوژی]] کمک می‌کند محدودیت‌ها را از ادعاهای بزرگ جدا کنی.",
    hints: ["محدودیت", "نمی‌تواند", "اعتبار"],
  },
  {
    source: "marriage-astrology-name-vs-synastry",
    target: "abjad-astrology",
    anchor: "طالع‌بینی ابجد",
    sentence:
      "بخشی از روش‌های اسمی به [[article:abjad-astrology|طالع‌بینی ابجد]] تکیه می‌کنند، برای همین بهتر است قبل از نتیجه‌گیری، منطق و محدودیت آن را جداگانه بشناسی.",
    hints: ["اسم", "ابجد", "ازدواج"],
  },
  {
    source: "what-is-astrology",
    target: "abjad-astrology",
    anchor: "طالع‌بینی ابجد",
    sentence:
      "در کنار چارت تولد، بعضی جست‌وجوها سراغ [[article:abjad-astrology|طالع‌بینی ابجد]] می‌روند؛ این روش بهتر است جدا از آسترولوژی چارت‌محور فهمیده شود.",
    hints: ["روش", "طالع‌بینی", "چارت"],
  },
  {
    source: "what-is-astrology",
    target: "what-is-chinese-astrology",
    anchor: "طالع‌بینی چینی",
    sentence:
      "اگر می‌خواهی تفاوت این نگاه با نظام‌های سال‌محور را ببینی، [[article:what-is-chinese-astrology|طالع‌بینی چینی]] نقطه شروع جداگانه‌ای است.",
    hints: ["نظام", "روش", "طالع‌بینی"],
  },
  {
    source: "what-is-vedic-astrology",
    target: "what-is-chinese-astrology",
    anchor: "طالع‌بینی چینی",
    sentence:
      "برای مقایسه با یک سنت غیرغربی دیگر، [[article:what-is-chinese-astrology|طالع‌بینی چینی]] نشان می‌دهد همه نظام‌ها از منطق چارت غربی شروع نمی‌کنند.",
    hints: ["جیوتیش", "سنت", "تروپیکال"],
  },
  {
    source: "house-systems-in-astrology",
    target: "placidus-houses-in-halleus",
    anchor: "خانه‌های Placidus در هالیوس",
    sentence:
      "اگر می‌خواهی بدانی هالیوس چرا در خروجی اصلی از یک روش مشخص استفاده می‌کند، [[article:placidus-houses-in-halleus|خانه‌های Placidus در هالیوس]] دلیل این انتخاب را توضیح می‌دهد.",
    hints: ["Placidus", "سیستم خانه", "Equal"],
  },
  {
    source: "astrology-houses",
    target: "placidus-houses-in-halleus",
    anchor: "Placidus در هالیوس",
    sentence:
      "برای جزئیات انتخاب روش محاسبه خانه‌ها در خود هالیوس، مقاله [[article:placidus-houses-in-halleus|Placidus در هالیوس]] ادامه طبیعی همین بحث است.",
    hints: ["خانه", "محاسبه", "سیستم"],
  },
  {
    source: "astrology-transits-explained",
    target: "annual-astrology-1405",
    anchor: "طالع‌بینی سال ۱۴۰۵",
    sentence:
      "اگر می‌خواهی همین منطق را در مقیاس یک سال ببینی، [[article:annual-astrology-1405|طالع‌بینی سال ۱۴۰۵]] تصویر کلی‌تری از ترنزیت‌های مهم می‌دهد.",
    hints: ["سال", "ترنزیت", "زمان"],
  },
  {
    source: "shahrivar-1405-transit-guide",
    target: "annual-astrology-1405",
    anchor: "طالع‌بینی سال ۱۴۰۵",
    sentence:
      "برای اینکه جایگاه شهریور را در تصویر بزرگ‌تر سال ببینی، [[article:annual-astrology-1405|طالع‌بینی سال ۱۴۰۵]] مسیر ماه‌های بعد و قبل را هم کنار هم می‌گذارد.",
    hints: ["۱۴۰۵", "شهریور", "ترنزیت"],
  },
  {
    source: "new-moon-vs-full-moon-astrology",
    target: "new-moon-calendar-1405",
    anchor: "تقویم ماه نو ۱۴۰۵",
    sentence:
      "برای پیدا کردن تاریخ هر شروع تازه در سال، [[article:new-moon-calendar-1405|تقویم ماه نو ۱۴۰۵]] مرجع سریع‌تری از توضیح مفهومی ماه نو است.",
    hints: ["ماه نو", "شروع", "چرخه"],
  },
  {
    source: "new-moon-vs-full-moon-astrology",
    target: "full-moon-calendar-1405",
    anchor: "تقویم ماه کامل ۱۴۰۵",
    sentence:
      "برای زمان‌بندی اوج چرخه‌ها هم [[article:full-moon-calendar-1405|تقویم ماه کامل ۱۴۰۵]] تاریخ‌های بدر را یک‌جا جمع کرده است.",
    hints: ["ماه کامل", "اوج", "چرخه"],
  },
  {
    source: "astrology-today-vs-daily-horoscope",
    target: "weekly-astrology",
    anchor: "طالع‌بینی هفتگی",
    sentence:
      "اگر بازه یک روز برای تصمیم‌گیری کافی نیست، [[article:weekly-astrology|طالع‌بینی هفتگی]] کمک می‌کند ریتم چند روز آینده را منظم‌تر ببینی.",
    hints: ["روزانه", "امروز", "فال"],
  },
  {
    source: "astrology-transits-explained",
    target: "weekly-astrology",
    anchor: "طالع‌بینی هفتگی",
    sentence:
      "برای دنبال‌کردن همین تغییرات در بازه کوتاه‌تر، [[article:weekly-astrology|طالع‌بینی هفتگی]] ترنزیت‌های نزدیک را کاربردی‌تر کنار هم می‌گذارد.",
    hints: ["ترنزیت", "زمان", "روز"],
  },
  {
    source: "shahrivar-1405-transit-guide",
    target: "mehr-1405-transit-guide",
    anchor: "ترنزیت مهر ۱۴۰۵",
    sentence:
      "بعد از خواندن موج‌های شهریور، [[article:mehr-1405-transit-guide|ترنزیت مهر ۱۴۰۵]] ادامه زمانی همین مسیر را برای ماه بعد نشان می‌دهد.",
    hints: ["شهریور", "۱۴۰۵", "ترنزیت"],
  },
  {
    source: "mordad-1405-transit-guide",
    target: "mehr-1405-transit-guide",
    anchor: "ترنزیت مهر ۱۴۰۵",
    sentence:
      "برای کامل‌تر دیدن مسیر تابستان تا پاییز، [[article:mehr-1405-transit-guide|ترنزیت مهر ۱۴۰۵]] حلقه بعدی کنار راهنمای مرداد و شهریور است.",
    hints: ["مرداد", "۱۴۰۵", "ترنزیت"],
  },
  {
    source: "why-birth-time-matters",
    target: "find-exact-birth-time",
    anchor: "پیدا کردن ساعت دقیق تولد",
    sentence:
      "اگر ساعت تولد را مطمئن نیستی، راهنمای [[article:find-exact-birth-time|پیدا کردن ساعت دقیق تولد]] چند مسیر عملی‌تر برای نزدیک‌شدن به زمان درست پیشنهاد می‌کند.",
    hints: ["ساعت تولد", "دقیق", "ثبت"],
  },
  {
    source: "birth-chart-without-birth-time",
    target: "find-exact-birth-time",
    anchor: "چگونه ساعت تولد خود را پیدا کنیم",
    sentence:
      "قبل از کنارگذاشتن کامل خانه‌ها و رایزینگ، مقاله [[article:find-exact-birth-time|چگونه ساعت تولد خود را پیدا کنیم]] کمک می‌کند راه‌های قابل بررسی را از دست ندهی.",
    hints: ["بدون ساعت", "رایزینگ", "خانه"],
  },
  {
    source: "birth-moon-phase-in-natal-chart",
    target: "new-moon-in-natal-chart",
    anchor: "ماه نو در چارت تولد",
    sentence:
      "اگر فاز تولد تو نزدیک شروع چرخه باشد، [[article:new-moon-in-natal-chart|ماه نو در چارت تولد]] معنی این شروع درونی را دقیق‌تر باز می‌کند.",
    hints: ["ماه نو", "فاز", "تولد"],
  },
  {
    source: "what-is-moon-sign",
    target: "new-moon-in-natal-chart",
    anchor: "ماه نو در چارت تولد",
    sentence:
      "برای لایه زمانی‌تر نشان ماه، [[article:new-moon-in-natal-chart|ماه نو در چارت تولد]] توضیح می‌دهد شروع چرخه ماه در نقشه تولد چه معنایی دارد.",
    hints: ["نشان ماه", "احساس", "ماه"],
  },
  {
    source: "birth-moon-phase-in-natal-chart",
    target: "full-moon-in-natal-chart",
    anchor: "ماه کامل در چارت تولد",
    sentence:
      "اگر تولد نزدیک بدر باشد، [[article:full-moon-in-natal-chart|ماه کامل در چارت تولد]] نشان می‌دهد این دو قطبی بودن چرخه چطور در خوانش چارت دیده می‌شود.",
    hints: ["ماه کامل", "بدر", "فاز"],
  },
  {
    source: "what-is-moon-sign",
    target: "full-moon-in-natal-chart",
    anchor: "ماه کامل در چارت تولد",
    sentence:
      "برای فهمیدن حالت پررنگ‌تر و آشکارتر ماه، مقاله [[article:full-moon-in-natal-chart|ماه کامل در چارت تولد]] مکمل خوبی برای خواندن نشان ماه است.",
    hints: ["نشان ماه", "احساس", "ماه"],
  },
];

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    apply: args.has("--apply"),
    printPlan: args.has("--print-plan"),
  };
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function countArticleLinks(text) {
  return [...String(text ?? "").matchAll(ARTICLE_LINK_PATTERN)].length;
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

function pickParagraph(sections, hints, usedParagraphs) {
  const candidates = [];
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const paragraphs = Array.isArray(section?.paragraphs) ? section.paragraphs : [];
    for (let paragraphIndex = 0; paragraphIndex < paragraphs.length; paragraphIndex += 1) {
      const paragraphKey = `${sectionIndex}:${paragraphIndex}`;
      const paragraph = String(paragraphs[paragraphIndex] ?? "");
      if (!paragraph.trim() || countArticleLinks(paragraph) >= 3) continue;
      const haystack = normalizeText(`${section?.title ?? ""} ${paragraph}`);
      const hintScore = hints.filter((hint) => haystack.includes(hint)).length;
      candidates.push({
        sectionIndex,
        paragraphIndex,
        paragraph,
        hintScore,
        fresh: usedParagraphs.has(paragraphKey) ? 0 : 1,
        length: paragraph.length,
      });
    }
  }

  candidates.sort((left, right) => {
    return right.hintScore - left.hintScore || right.fresh - left.fresh || right.length - left.length;
  });
  return candidates[0] ?? null;
}

function replaceBodyParagraph(bodyMarkdown, before, after) {
  if (bodyMarkdown.includes(before)) return bodyMarkdown.replace(before, after);
  const compactPattern = escapeRegExp(normalizeText(before)).replace(/\\ /g, String.raw`\s+`);
  const match = bodyMarkdown.match(new RegExp(compactPattern));
  if (!match) return null;
  return bodyMarkdown.replace(match[0], after);
}

function buildSnapshot(row, sections, bodyMarkdown, contentVersion) {
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
    relatedArticleIds: row.related_article_ids ?? [],
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
  const inlineIds = articleIdsFromBody(bodyMarkdown);
  const relatedIds = [...new Set(relatedArticleIds ?? [])];
  await tx`delete from public.wiki_internal_links where source_article_id = ${sourceArticleId}::uuid`;
  for (const targetId of inlineIds) {
    await tx`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at
      ) values (
        ${sourceArticleId}::uuid, ${targetId}, 'inline', ${`[[article:${targetId}]]`},
        'active', now(), now()
      )
    `;
  }
  for (const targetId of relatedIds) {
    await tx`
      insert into public.wiki_internal_links (
        source_article_id, target_stable_id, link_kind, source_token,
        activation_status, activated_at, last_verified_at
      ) values (
        ${sourceArticleId}::uuid, ${targetId}, 'related', ${targetId},
        'active', now(), now()
      )
      on conflict do nothing
    `;
  }
  return { inlineCount: inlineIds.length, relatedCount: relatedIds.length };
}

async function main() {
  const options = parseArgs();
  if (options.printPlan) {
    console.log(JSON.stringify({ runId: RUN_ID, placements }, null, 2));
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  try {
    const result = await sql.begin(async (tx) => {
      const touchedSources = [...new Set(placements.map((item) => item.source))];
      const targetIds = [...new Set(placements.map((item) => item.target))];
      const articleRows = await tx`
        select
          id::text, stable_id, slug, title, short_title, seo_title, meta_description,
          category_id, tags, summary, intro, reading_minutes, key_points, sections,
          context_links, sources, call_to_action, related_article_ids, publication_priority,
          content_cluster, article_role, content_version, is_indexable, body_markdown,
          status, published_at::text, scheduled_for::text, deleted_at::text
        from public.wiki_articles
        where stable_id = any(${[...new Set([...touchedSources, ...targetIds])]}::text[])
        for update
      `;
      const byStableId = new Map(articleRows.map((row) => [String(row.stable_id), row]));
      const missing = [...new Set([...touchedSources, ...targetIds])].filter((stableId) => !byStableId.has(stableId));
      if (missing.length) throw new Error(`Missing Wiki articles: ${missing.join(", ")}`);

      const badTargets = targetIds.filter((stableId) => {
        const row = byStableId.get(stableId);
        return row.status !== "published" || !row.is_indexable || !row.published_at || row.scheduled_for || row.deleted_at;
      });
      if (badTargets.length) throw new Error(`Targets are not public-ready: ${badTargets.join(", ")}`);

      const badSources = touchedSources.filter((stableId) => {
        const row = byStableId.get(stableId);
        return row.status !== "published" || !row.is_indexable || !row.published_at || row.scheduled_for || row.deleted_at;
      });
      if (badSources.length) throw new Error(`Sources are not public-ready: ${badSources.join(", ")}`);

      const openDraftRows = await tx`
        select article.stable_id
        from public.wiki_article_drafts as draft
        join public.wiki_articles as article on article.id = draft.article_id
        where article.stable_id = any(${touchedSources}::text[])
      `;
      if (openDraftRows.length) {
        throw new Error(`Sources with open drafts must be resolved first: ${openDraftRows.map((row) => row.stable_id).join(", ")}`);
      }

      const beforeIncoming = await tx`
        select target_stable_id, count(*)::int as count
        from public.wiki_internal_links
        where target_stable_id = any(${targetIds}::text[])
          and activation_status = 'active'
        group by target_stable_id
      `;

      const beforeIncomingByTarget = Object.fromEntries(beforeIncoming.map((row) => [row.target_stable_id, Number(row.count ?? 0)]));
      const sourcePlacements = new Map();
      for (const placement of placements) {
        const current = sourcePlacements.get(placement.source) ?? [];
        current.push(placement);
        sourcePlacements.set(placement.source, current);
      }

      const applied = [];
      const skipped = [];
      for (const source of touchedSources) {
        const row = byStableId.get(source);
        let bodyMarkdown = String(row.body_markdown ?? "");
        const sections = JSON.parse(JSON.stringify(row.sections ?? []));
        const usedParagraphs = new Set();
        let changed = false;

        for (const placement of sourcePlacements.get(source) ?? []) {
          if (hasTargetLink(bodyMarkdown, placement.target)) {
            skipped.push({ ...placement, reason: "already-linked" });
            continue;
          }
          const picked = pickParagraph(sections, placement.hints, usedParagraphs);
          if (!picked) {
            skipped.push({ ...placement, reason: "no-safe-paragraph" });
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
          changed = true;
          applied.push({
            source,
            target: placement.target,
            anchor: placement.anchor,
            section: sections[picked.sectionIndex].title ?? "",
          });
        }

        if (!changed) continue;
        if (options.apply) {
          const nextVersion = Number(row.content_version ?? 1) + 1;
          const snapshot = buildSnapshot(row, sections, bodyMarkdown, nextVersion);
          await tx`
            update public.wiki_articles
            set sections = ${tx.json(sections)},
                body_markdown = ${bodyMarkdown},
                content_version = ${nextVersion},
                updated_at = now()
            where id = ${row.id}::uuid
          `;
          await tx`
            insert into public.wiki_article_revisions (
              article_id, revision_number, snapshot, change_note, created_by,
              revision_status, published_at
            ) values (
              ${row.id}::uuid,
              (select coalesce(max(existing.revision_number), 0)::integer + 1
               from public.wiki_article_revisions as existing
               where existing.article_id = ${row.id}::uuid),
              ${tx.json(snapshot)},
              ${`Add natural inbound links for ${RUN_ID}`},
              null,
              'published',
              now()
            )
          `;
          await syncInlineLinks(tx, row.id, bodyMarkdown, row.related_article_ids ?? []);
        }
      }

      const afterIncomingByTarget = {};
      if (options.apply) {
        const afterIncoming = await tx`
          select target_stable_id, count(*)::int as count
          from public.wiki_internal_links
          where target_stable_id = any(${targetIds}::text[])
            and activation_status = 'active'
          group by target_stable_id
        `;
        for (const row of afterIncoming) afterIncomingByTarget[row.target_stable_id] = Number(row.count ?? 0);
        await tx`
          insert into halleus_private.admin_audit_events (
            actor_user_id, actor_role, action, target_type, target_id,
            before_summary, after_summary, reason, success, request_correlation_id
          ) values (
            null, 'system', 'system.wiki.zero_inbound_live_link_repair',
            'wiki_graph', ${RUN_ID},
            ${tx.json({ incoming: beforeIncomingByTarget })},
            ${tx.json({ incoming: afterIncomingByTarget, applied, skipped })},
            'Add natural live-to-live inbound Wiki links without removing existing links.',
            true,
            ${RUN_ID}
          )
        `;
      }

      return {
        mode: options.apply ? "applied" : "dry-run",
        sources: touchedSources.length,
        targets: targetIds.length,
        applied,
        skipped,
        beforeIncomingByTarget,
        afterIncomingByTarget,
      };
    });

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
