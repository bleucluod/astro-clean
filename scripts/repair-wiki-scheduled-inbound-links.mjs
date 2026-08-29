import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";

const ARTICLE_LINK_PATTERN = /\[\[article:([a-z0-9]+(?:[._-][a-z0-9]+)*)(?:\|([^\]\r\n]+))?\]\]/g;
const RUN_ID = "wiki-scheduled-inbound-links-full-mizfa-plus-r2-20260829";
const MINIMUM_INBOUND_TARGET = 3;
const DEFAULT_MAX_INBOUND_TARGET = 5;
const SOURCE_MIN_AGE_DAYS = 10;
const INDEXNOW_TIMEOUT_MS = 10_000;

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

const PERSIAN_MONTH_LABELS = MONTHS.map(([, label]) => label);
const STOP_WORDS = new Set(["چیست", "برای", "هایی", "های", "در", "با", "از", "به", "را", "یک", "این", "است", "شود", "کند", "کرد"]);

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
  "چارت تولد رایگان ماریا",
  "چارت تولد انلاین",
  "چارت تولد",
  "فال سالانه 1405",
  "ویژگی های زن مردادی",
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
  "مرد متولد مرداد با چه ماهی ازدواج کند",
  "اورب چیست",
  "اصلاح ساعت تولد",
  "استلیوم",
  "مرد مردادی با چه ماهی ازدواج کند",
  "خانه پنجم",
  "خصوصیات زن متولد شهریور در عشق",
  "زن متولد اردیبهشت چه مردی را دوست دارد",
  "زن متولد اردیبهشت با چه ماهی ازدواج کند",
  "ازدواج اردیبهشت با چه ماهی خوب است",
  "رگ خواب زن متولد فروردین",
  "مرد اردیبهشت با چه ماهی ازدواج کند",
  "زن متولد مهر چه مردی را دوست دارد",
  "مرد متولد اردیبهشت با چه ماهی ازدواج کند",
  "اورانوس در چارت تولد",
  "وضعیت ماه امروز",
  "زن متولد شهریور",
  "فال آسترولوژی چیست",
  "وضعیت سیارات امروز",
  "ساعت تولد",
  "قهر مرد متولد مرداد",
  "نجوم تروپیکال",
  "نقطه ضعف زن متولد اردیبهشت",
  "چارت سیناستری انلاین",
  "چگونه ساعت تولد خود را پیدا کنیم",
  "زن متولد اسفند چه مردی را دوست دارد",
  "آسترولوژی تروپیکال چیست",
  "انواع آسترولوژی",
  "خصوصیات متولدین مرداد",
  "آبان چه برجی است",
  "مرد مرداد ماهی با چه ماهی ازدواج کند",
  "زن متولد شهریور چه مردی را دوست دارد",
  "خصوصیات متولدین شهریور مرد",
  "لرد خانه هفتم چارت تولد",
  "دلتنگی مرد شهریوری",
  "پلوتو در کماندار",
  "چارت ودیک",
  "آسترولوژی روزانه",
];

const CURATED_SCHEDULED_INBOUND_PLANS = [
  {
    target: "best-free-persian-birth-chart-site",
    placements: [
      {
        source: "birth-chart-report-layers",
        anchor: "چارت تولد رایگان فارسی",
        sentence: "اگر کاربر هنوز در مرحله ساخت اولیه باشد، [[article:best-free-persian-birth-chart-site|چارت تولد رایگان فارسی]] کمک می‌کند قبل از ورود به لایه‌های گزارش، داده خام چارت را روشن کند.",
      },
      {
        source: "natal-chart-uses-and-limits",
        anchor: "ساخت چارت تولد",
        sentence: "برای چنین استفاده‌ای، نقطه شروع معمولاً خودِ [[article:best-free-persian-birth-chart-site|ساخت چارت تولد]] است؛ جایی که داده‌های تولد به نقشه قابل خواندن تبدیل می‌شوند.",
      },
      {
        source: "what-is-birth-chart-interpretation",
        anchor: "چارت تولد فارسی",
        sentence: "قبل از تفسیر، باید خودِ [[article:best-free-persian-birth-chart-site|چارت تولد فارسی]] درست و قابل اتکا ساخته شده باشد.",
      },
      {
        source: "how-to-read-birth-chart",
        anchor: "چارت تولد رایگان ماریا",
        sentence: "اگر هنوز چارت را نساخته‌ای، مقایسه ابزارهایی مثل [[article:best-free-persian-birth-chart-site|چارت تولد رایگان ماریا]] کمک می‌کند بفهمی خروجی اولیه را از کجا شروع کنی.",
      },
    ],
  },
  {
    target: "free-vedic-birth-chart",
    placements: [
      {
        source: "what-is-vedic-astrology",
        anchor: "چارت ودیک",
        sentence: "اگر می‌خواهی این تفاوت را روی داده تولد خودت ببینی، [[article:free-vedic-birth-chart|چارت ودیک]] نقطه شروع عملی‌تری است.",
      },
      {
        source: "what-is-tropical-astrology",
        anchor: "چارت ودیک",
        sentence: "برای مقایسه واقعی این دو نگاه، بهتر است کنار چارت تروپیکال، یک [[article:free-vedic-birth-chart|چارت ودیک]] هم داشته باشی.",
      },
      {
        source: "what-is-astrology",
        anchor: "چارت ودیک",
        sentence: "در میان شاخه‌های مختلف، [[article:free-vedic-birth-chart|چارت ودیک]] نمونه‌ای است که محاسبه و زبان تفسیری جداگانه‌ای دارد.",
      },
    ],
  },
  {
    target: "birth-time-civil-registration-records",
    placements: [
      {
        source: "why-birth-time-matters",
        anchor: "ساعت دقیق تولد",
        sentence: "اگر هنوز نمی‌دانی این زمان را از کجا پیدا کنی، [[article:birth-time-civil-registration-records|ساعت دقیق تولد]] باید از مسیرهای قابل پیگیری و نه حدس شخصی بررسی شود.",
      },
      {
        source: "birth-chart-without-birth-time",
        anchor: "ساعت تولد",
        sentence: "وقتی [[article:birth-time-civil-registration-records|ساعت تولد]] پیدا نمی‌شود، بهتر است مرزهای تفسیر را روشن نگه داریم و جای حدس را با قطعیت پر نکنیم.",
      },
      {
        source: "tehran-birth-chart-difference",
        anchor: "چگونه ساعت تولد خود را پیدا کنیم",
        sentence: "در کنار شهر تولد، پرسش عملی‌تر این است که [[article:birth-time-civil-registration-records|چگونه ساعت تولد خود را پیدا کنیم]] تا محاسبه چارت از پایه دقیق‌تر شود.",
      },
      {
        source: "what-is-rising-sign",
        anchor: "ساعت دقیق تولد",
        sentence: "چون رایزینگ با زمان تولد جابه‌جا می‌شود، [[article:birth-time-civil-registration-records|ساعت دقیق تولد]] برای محاسبه طالع فقط یک جزئیات فرعی نیست.",
      },
    ],
  },
  {
    target: "mordad-man-marriage-compatibility",
    placements: [
      {
        source: "mordad-man-traits",
        anchor: "مرد متولد مرداد با چه ماهی ازدواج کند",
        sentence: "وقتی این ویژگی‌ها وارد یک رابطه جدی می‌شوند، پرسش [[article:mordad-man-marriage-compatibility|مرد متولد مرداد با چه ماهی ازدواج کند]] را باید با توجه به نیاز او به احترام، گرما و دیده‌شدن بررسی کرد.",
      },
      {
        source: "mordad-birth-month-compatibility",
        anchor: "مرد مردادی با چه ماهی ازدواج کند",
        sentence: "در بخش ازدواج، پاسخ به اینکه [[article:mordad-man-marriage-compatibility|مرد مردادی با چه ماهی ازدواج کند]] فقط به ماه تولد محدود نیست، اما الگوی احترام و ابراز علاقه نقطه شروع مهمی است.",
      },
      {
        source: "mordad-born-traits",
        anchor: "مرد مرداد ماهی با چه ماهی ازدواج کند",
        sentence: "برای تبدیل این شناخت کلی به انتخاب شریک، بررسی [[article:mordad-man-marriage-compatibility|مرد مرداد ماهی با چه ماهی ازدواج کند]] نشان می‌دهد کدام تفاوت‌ها سازنده‌اند و کدام‌ها به کشمکش تبدیل می‌شوند.",
      },
    ],
  },
  {
    target: "ordibehesht-man-marriage-compatibility",
    placements: [
      {
        source: "ordibehesht-man-traits",
        anchor: "مرد اردیبهشت با چه ماهی ازدواج کند",
        sentence: "وقتی رابطه به تعهد می‌رسد، پاسخ [[article:ordibehesht-man-marriage-compatibility|مرد اردیبهشت با چه ماهی ازدواج کند]] به میزان ثبات، اعتماد و هماهنگی دو نفر در زندگی روزمره وابسته است.",
      },
      {
        source: "ordibehesht-birth-month-compatibility",
        anchor: "مرد متولد اردیبهشت با چه ماهی ازدواج کند",
        sentence: "برای بررسی دقیق‌تر ازدواج، راهنمای [[article:ordibehesht-man-marriage-compatibility|مرد متولد اردیبهشت با چه ماهی ازدواج کند]] سازگاری را از زاویه نیازهای رابطه‌ای او دنبال می‌کند.",
      },
      {
        source: "ordibehesht-born-traits",
        anchor: "مرد متولد اردیبهشت با چه ماهی ازدواج کند",
        sentence: "این ویژگی‌ها در انتخاب شریک هم اثر می‌گذارند؛ برای همین پرسش [[article:ordibehesht-man-marriage-compatibility|مرد متولد اردیبهشت با چه ماهی ازدواج کند]] باید کنار امنیت عاطفی و انعطاف هر دو نفر خوانده شود.",
      },
    ],
  },
  {
    target: "ordibehesht-woman-marriage-compatibility",
    placements: [
      {
        source: "ordibehesht-woman-traits",
        anchor: "زن متولد اردیبهشت چه مردی را دوست دارد",
        sentence: "در رابطه جدی، پاسخ [[article:ordibehesht-woman-marriage-compatibility|زن متولد اردیبهشت چه مردی را دوست دارد]] بیشتر به ثبات، احترام و قابل‌اعتمادبودن طرف مقابل برمی‌گردد.",
      },
      {
        source: "ordibehesht-birth-month-compatibility",
        anchor: "زن متولد اردیبهشت با چه ماهی ازدواج کند",
        sentence: "برای دیدن سازگاری از زاویه انتخاب او، راهنمای [[article:ordibehesht-woman-marriage-compatibility|زن متولد اردیبهشت با چه ماهی ازدواج کند]] تفاوت نیازهای عاطفی ماه‌ها را کنار هم می‌گذارد.",
      },
      {
        source: "ordibehesht-born-traits",
        anchor: "زن متولد اردیبهشت با چه ماهی ازدواج کند",
        sentence: "در تصمیم بلندمدت، پرسش [[article:ordibehesht-woman-marriage-compatibility|زن متولد اردیبهشت با چه ماهی ازدواج کند]] فقط با شباهت‌ها جواب نمی‌گیرد و به شیوه حل اختلاف هم وابسته است.",
      },
    ],
  },
  {
    target: "esfand-woman-marriage-compatibility",
    placements: [
      {
        source: "esfand-woman-traits",
        anchor: "زن متولد اسفند چه مردی را دوست دارد",
        sentence: "وقتی رابطه جدی می‌شود، پاسخ [[article:esfand-woman-marriage-compatibility|زن متولد اسفند چه مردی را دوست دارد]] به همدلی، مرزبندی روشن و احساس امنیت میان دو نفر بستگی دارد.",
      },
      {
        source: "esfand-birth-month-compatibility",
        anchor: "زن متولد اسفند چه مردی را دوست دارد",
        sentence: "در میان الگوهای سازگاری، پرسش [[article:esfand-woman-marriage-compatibility|زن متولد اسفند چه مردی را دوست دارد]] زمانی دقیق‌تر می‌شود که خیال‌پردازی و نیازهای واقعی رابطه از هم جدا شوند.",
      },
      {
        source: "esfand-born-traits",
        anchor: "زن متولد اسفند چه مردی را دوست دارد",
        sentence: "برای بردن این شناخت به سمت انتخاب شریک، بررسی [[article:esfand-woman-marriage-compatibility|زن متولد اسفند چه مردی را دوست دارد]] نشان می‌دهد همراهی عاطفی کجا مفید است و کجا به بی‌مرزی می‌رسد.",
      },
    ],
  },
  {
    target: "mehr-woman-marriage-compatibility",
    placements: [
      {
        source: "mehr-woman-traits",
        anchor: "زن متولد مهر چه مردی را دوست دارد",
        sentence: "در انتخاب جدی، پاسخ [[article:mehr-woman-marriage-compatibility|زن متولد مهر چه مردی را دوست دارد]] به انصاف، گفت‌وگو و توان تصمیم‌گیری مشترک در رابطه برمی‌گردد.",
      },
      {
        source: "mehr-birth-month-compatibility",
        anchor: "زن متولد مهر چه مردی را دوست دارد",
        sentence: "برای بررسی سازگاری از زاویه نیازهای او، راهنمای [[article:mehr-woman-marriage-compatibility|زن متولد مهر چه مردی را دوست دارد]] میان جذابیت اولیه و دوام رابطه تفاوت می‌گذارد.",
      },
      {
        source: "mehr-born-traits",
        anchor: "زن متولد مهر چه مردی را دوست دارد",
        sentence: "وقتی این ویژگی‌ها وارد ازدواج می‌شوند، پرسش [[article:mehr-woman-marriage-compatibility|زن متولد مهر چه مردی را دوست دارد]] با کیفیت تعامل و مرزهای دو نفر پاسخ روشن‌تری می‌گیرد.",
      },
    ],
  },
  {
    target: "shahrivar-woman-marriage-compatibility",
    placements: [
      {
        source: "shahrivar-woman-traits",
        anchor: "زن متولد شهریور چه مردی را دوست دارد",
        sentence: "در رابطه جدی، پاسخ [[article:shahrivar-woman-marriage-compatibility|زن متولد شهریور چه مردی را دوست دارد]] به مسئولیت‌پذیری، صداقت و توجه عملی طرف مقابل وابسته است.",
      },
      {
        source: "shahrivar-birth-month-compatibility",
        anchor: "زن متولد شهریور چه مردی را دوست دارد",
        sentence: "برای دیدن سازگاری از زاویه نیازهای او، راهنمای [[article:shahrivar-woman-marriage-compatibility|زن متولد شهریور چه مردی را دوست دارد]] میان نظم سازنده و سخت‌گیری فرساینده مرز می‌گذارد.",
      },
      {
        source: "shahrivar-born-traits",
        anchor: "زن متولد شهریور چه مردی را دوست دارد",
        sentence: "وقتی انتخاب شریک مطرح است، پرسش [[article:shahrivar-woman-marriage-compatibility|زن متولد شهریور چه مردی را دوست دارد]] با شیوه گفت‌وگو و تحمل تفاوت‌ها پاسخ واقعی‌تری می‌گیرد.",
      },
    ],
  },
];

const CURATED_PLANS_BY_TARGET = new Map(CURATED_SCHEDULED_INBOUND_PLANS.map((plan) => [plan.target, plan.placements]));

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    apply: false,
    selfCheck: false,
    minInbound: MINIMUM_INBOUND_TARGET,
    maxInbound: DEFAULT_MAX_INBOUND_TARGET,
    maxTargets: Number.POSITIVE_INFINITY,
    gscQueriesCsv: process.env.HALLEUS_GSC_QUERIES_CSV ?? "",
    requireCuratedComplete: false,
    compact: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--apply") options.apply = true;
    if (arg === "--self-check") options.selfCheck = true;
    if (arg === "--min-inbound") options.minInbound = Number(args[++index]);
    if (arg === "--max-inbound") options.maxInbound = Number(args[++index]);
    if (arg === "--max-targets") options.maxTargets = Number(args[++index]);
    if (arg === "--gsc-queries-csv") options.gscQueriesCsv = args[++index] ?? "";
    if (arg === "--require-curated-complete") options.requireCuratedComplete = true;
    if (arg === "--compact") options.compact = true;
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

function normalizeSearchText(value) {
  return normalizeText(value)
    .replace(/[؛،؟?!.:()«»|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulWords(value) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

function sanitizeAnchorCandidate(value) {
  return normalizeText(value)
    .replace(/\s*\|\s*هالیوس\s*$/u, "")
    .split(/[؛|]/u)[0]
    ?.replace(/[؟?!.،]+$/u, "")
    .trim() ?? "";
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
    hasOpenDraft: row.has_open_draft === true,
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
    !article.deletedAt &&
    !article.hasOpenDraft
  );
}

function isOldEnoughForScheduledTarget(source, target, nowMs) {
  const publishedAtMs = source.publishedAt ? Date.parse(source.publishedAt) : Number.NaN;
  const targetAtMs = target.scheduledFor ? Date.parse(target.scheduledFor) : Number.NaN;
  const referenceMs = Number.isFinite(targetAtMs) ? targetAtMs : nowMs;
  return isCurrentPublic(source, nowMs) &&
    Number.isFinite(publishedAtMs) &&
    publishedAtMs <= referenceMs - SOURCE_MIN_AGE_DAYS * 24 * 60 * 60 * 1000;
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
  return meaningfulWords(`${article.title} ${article.shortTitle} ${article.seoTitle}`);
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

function topicGuardWords(topic) {
  if (topic === "womanTraits") return ["زن"];
  if (topic === "manTraits") return ["مرد"];
  if (topic === "womanMarriage") return ["زن", "ازدواج"];
  if (topic === "manMarriage") return ["مرد", "ازدواج"];
  if (topic === "compatibility") return ["سازگار", "سازگاری", "رابطه", "ازدواج"];
  if (topic === "bornTraits") return ["متولد", "خصوصیات"];
  if (topic === "house") return ["خانه", "چارت", "زاویه"];
  if (topic === "moon") return ["ماه", "چرخه"];
  if (topic === "transit") return ["ترنزیت", "امروز", "ماه"];
  if (topic === "system") return ["آسترولوژی", "چارت", "طالع"];
  if (topic === "relationship") return ["رابطه", "عشق", "ازدواج"];
  return [];
}

function targetIdentityText(article) {
  return normalizeSearchText(`${article.stableId.replaceAll("-", " ")} ${article.title} ${article.shortTitle} ${article.seoTitle}`);
}

function targetSearchText(article) {
  return targetIdentityText(article);
}

function targetIntentLabels(article) {
  const id = String(article.stableId ?? "");
  const identity = targetIdentityText(article);
  const labels = new Set();

  if (/bts-members-birth-dates-zodiac/.test(id) || identity.includes("bts")) labels.add("celebrityBirthDates");
  if (/best-free-persian-birth-chart-site/.test(id)) labels.add("freePersianBirthChart");
  if (/online-free-astrology/.test(id)) labels.add("onlineAstrology");
  if (/birth-chart-basics|ai-birth-chart|build-birth-chart/.test(id) || identity.includes("ساخت چارت تولد")) labels.add("birthChartBuild");
  if (/birth-chart-report|natal-chart-uses-and-limits|what-is-birth-chart|how-to-read-birth-chart/.test(id)) labels.add("birthChartCore");
  if (/birth-chart-interpretation|how-to-read-birth-chart|birth-chart-report/.test(id) || identity.includes("تفسیر چارت تولد") || identity.includes("تحلیل چارت تولد")) labels.add("birthChartInterpretation");
  if (/without-birth-time/.test(id) || identity.includes("بدون ساعت تولد")) labels.add("birthTimeMissing");
  if (/rectification/.test(id) || identity.includes("اصلاح ساعت تولد")) labels.add("birthTimeRectification");
  if (/birth-time/.test(id) || identity.includes("ساعت دقیق تولد")) labels.add("birthTimeAccuracy");
  if (identity.includes("ساعت") && identity.includes("تولد")) labels.add("birthTimeAccuracy");
  if (/eighth-house/.test(id) || identity.includes("خانه هشتم")) labels.add("houseEighth");
  if (/fifth-house/.test(id) || identity.includes("خانه پنجم")) labels.add("houseFifth");
  if (/sixth-house/.test(id) || identity.includes("خانه ششم")) labels.add("houseSixth");
  if (/seventh-house/.test(id) || identity.includes("خانه هفتم")) labels.add("houseSeventh");
  if (/eleventh-house/.test(id) || identity.includes("خانه یازدهم")) labels.add("houseEleventh");
  if (/empty-houses/.test(id) || identity.includes("خالی بودن خانه")) labels.add("emptyHouses");
  if (/astrology-houses/.test(id) || identity.includes("خانه های چارت تولد")) labels.add("houseInterpretation");
  if (/dominant-planets/.test(id) || identity.includes("سیاره غالب")) labels.add("dominantPlanets");
  if (/career/.test(id) || identity.includes("مسیر شغلی") || identity.includes("خانه دهم") || identity.includes("mc")) labels.add("careerPath");
  if (/creativity|venus-in-natal-chart/.test(id) || identity.includes("خلاقیت") || identity.includes("ونوس")) labels.add("creativity");
  if (/children-gender/.test(id) || identity.includes("جنسیت فرزند") || identity.includes("تعداد فرزند")) labels.add("childrenGender");
  if (/orb/.test(id) || identity.includes("اورب")) labels.add("orb");
  if (/stellium/.test(id) || identity.includes("استلیوم")) labels.add("stellium");
  if (/south-node|north-node|lunar-nodes/.test(id) || identity.includes("نود جنوبی")) labels.add("lunarNodes");
  if (/vedic/.test(id) || identity.includes("ودیک")) labels.add("vedic");
  if (/tropical/.test(id) || identity.includes("تروپیکال")) labels.add("tropical");
  if (/what-is-astrology|astrology-systems|types-of-astrology/.test(id) || identity.includes("انواع آسترولوژی")) labels.add("systemAstrology");
  if (/new-moon|full-moon|moon-phase/.test(id) || identity.includes("ماه نو") || identity.includes("ماه کامل")) labels.add("moonPhase");
  if (/today|daily|weekly|monthly|transit|1405/.test(id) || identity.includes("امروز") || identity.includes("سالانه")) labels.add("transitTiming");
  if (/financial|money/.test(id) || identity.includes("مالی")) labels.add("financialAstrology");
  if (/woman-traits|man-traits|born-traits|birth-month-compatibility|marriage-compatibility/.test(id)) labels.add("monthPersona");
  if (/woman-marriage-compatibility/.test(id)) labels.add("womanMarriage");
  if (/man-marriage-compatibility/.test(id)) labels.add("manMarriage");
  if (/marriage-compatibility/.test(id)) labels.add("monthMarriage");

  return labels;
}

function sourceIntentLabels(article) {
  const labels = targetIntentLabels(article);
  const id = String(article.stableId ?? "");
  const text = normalizeSearchText(`${article.title} ${article.shortTitle} ${article.seoTitle} ${article.bodyMarkdown ?? ""}`.slice(0, 22000));
  const isDifferentSpecificHouse = /(?:first|second|third|fourth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)-house/.test(id);
  if (text.includes("خانه پنجم") && !isDifferentSpecificHouse) labels.add("houseFifth");
  if (text.includes("ساعت تولد") || text.includes("زمان تولد") || text.includes("رایزینگ") || text.includes("طالع")) labels.add("birthTimeAccuracy");
  if (text.includes("شهر تولد") || text.includes("تهران") || text.includes("مختصات")) labels.add("birthTimeAccuracy");
  return labels;
}

function hasAnyLabel(labels, values) {
  return values.some((value) => labels.has(value));
}

function sourceMatchesAllowedLabels(sourceLabels, allowedLabels) {
  return allowedLabels.some((label) => sourceLabels.has(label));
}

function sourceSupportsTargetIntent(target, source) {
  const targetLabels = targetIntentLabels(target);
  const sourceLabels = sourceIntentLabels(source);

  if (targetLabels.has("freePersianBirthChart")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["birthChartCore", "birthChartBuild", "birthChartInterpretation"]);
  }
  if (hasAnyLabel(targetLabels, ["birthChartBuild", "birthChartInterpretation"])) {
    return sourceMatchesAllowedLabels(sourceLabels, ["birthChartCore", "birthChartBuild", "birthChartInterpretation"]);
  }
  if (hasAnyLabel(targetLabels, ["birthTimeMissing", "birthTimeRectification", "birthTimeAccuracy"])) {
    return sourceMatchesAllowedLabels(sourceLabels, ["birthTimeMissing", "birthTimeRectification", "birthTimeAccuracy", "birthChartCore"]);
  }
  if (targetLabels.has("careerPath")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["careerPath", "birthChartCore", "houseInterpretation"]);
  }
  if (targetLabels.has("childrenGender")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["childrenGender", "houseFifth", "houseInterpretation", "relationship"]);
  }
  if (targetLabels.has("creativity")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["creativity", "houseFifth", "relationship"]);
  }
  if (targetLabels.has("houseFifth")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["houseFifth", "creativity", "childrenGender"]);
  }
  if (targetLabels.has("houseEighth")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["houseEighth", "houseInterpretation"]);
  }
  if (targetLabels.has("emptyHouses")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["emptyHouses", "houseInterpretation"]);
  }
  if (targetLabels.has("houseInterpretation")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["houseInterpretation", "houseFifth", "houseEighth", "emptyHouses"]);
  }
  if (targetLabels.has("vedic")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["vedic", "tropical", "systemAstrology"]);
  }
  if (targetLabels.has("tropical")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["tropical", "vedic", "systemAstrology"]);
  }
  if (targetLabels.has("lunarNodes")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["lunarNodes", "birthChartCore"]);
  }
  if (targetLabels.has("moonPhase")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["moonPhase", "transitTiming"]);
  }
  if (targetLabels.has("transitTiming")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["transitTiming", "moonPhase"]);
  }
  if (targetLabels.has("financialAstrology")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["financialAstrology", "birthChartCore"]);
  }
  if (targetLabels.has("dominantPlanets")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["dominantPlanets", "birthChartCore"]);
  }
  if (hasAnyLabel(targetLabels, ["womanMarriage", "manMarriage", "monthMarriage"])) {
    return sourceLabels.has("monthPersona");
  }

  return true;
}

function sourceSupportsAnchorIntent(source, anchor) {
  const anchorLabels = mizfaQueryIntentLabels(anchor);
  const sourceLabels = sourceIntentLabels(source);
  if (!anchorLabels.size) return true;

  if (anchorLabels.has("freePersianBirthChart")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["birthChartCore", "birthChartBuild", "birthChartInterpretation"]);
  }
  if (hasAnyLabel(anchorLabels, ["birthChartBuild", "birthChartInterpretation"])) {
    return sourceMatchesAllowedLabels(sourceLabels, ["birthChartCore", "birthChartBuild", "birthChartInterpretation"]);
  }
  if (hasAnyLabel(anchorLabels, ["birthTimeMissing", "birthTimeRectification", "birthTimeAccuracy"])) {
    return sourceMatchesAllowedLabels(sourceLabels, ["birthTimeMissing", "birthTimeRectification", "birthTimeAccuracy", "birthChartCore"]);
  }
  if (anchorLabels.has("houseFifth")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["houseFifth", "creativity", "childrenGender"]);
  }
  if (anchorLabels.has("houseEighth")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["houseEighth", "houseInterpretation"]);
  }
  if (anchorLabels.has("houseInterpretation")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["houseInterpretation", "houseFifth", "houseEighth", "emptyHouses"]);
  }
  if (anchorLabels.has("emptyHouses")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["emptyHouses", "houseInterpretation"]);
  }
  if (anchorLabels.has("vedic")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["vedic", "tropical", "systemAstrology"]);
  }
  if (anchorLabels.has("tropical")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["tropical", "vedic", "systemAstrology"]);
  }
  if (anchorLabels.has("lunarNodes")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["lunarNodes", "birthChartCore"]);
  }
  if (anchorLabels.has("moonPhase")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["moonPhase", "transitTiming"]);
  }
  if (anchorLabels.has("transitTiming")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["transitTiming", "moonPhase"]);
  }
  if (anchorLabels.has("careerPath")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["careerPath", "birthChartCore", "houseInterpretation"]);
  }
  if (anchorLabels.has("dominantPlanets")) {
    return sourceMatchesAllowedLabels(sourceLabels, ["dominantPlanets", "birthChartCore"]);
  }
  if (hasAnyLabel(anchorLabels, ["womanMarriage", "manMarriage", "monthMarriage"])) {
    return sourceLabels.has("monthPersona");
  }

  return [...anchorLabels].some((label) => sourceLabels.has(label));
}

function curatedPlacementsForTarget(target, oldPublicSources, currentSources, queryHints, sourceAdditions) {
  const planned = CURATED_PLANS_BY_TARGET.get(target.stableId) ?? [];
  if (!planned.length) return null;

  const sourcesByStableId = new Map(oldPublicSources.map((source) => [source.stableId, source]));
  const allowedQueries = new Set(queryHints.map(sanitizeAnchorCandidate).filter(Boolean));
  const placements = [];
  const skipped = [];

  for (const item of planned) {
    const source = sourcesByStableId.get(item.source);
    const anchor = sanitizeAnchorCandidate(item.anchor);
    if (!source) {
      skipped.push({ source: item.source, target: target.stableId, anchor, reason: "curated-source-not-eligible" });
      continue;
    }
    if (currentSources.has(source.stableId) || hasTargetLink(source.bodyMarkdown, target.stableId)) {
      skipped.push({ source: source.stableId, target: target.stableId, anchor, reason: "already-linked" });
      continue;
    }
    if (!allowedQueries.has(anchor)) {
      skipped.push({ source: source.stableId, target: target.stableId, anchor, reason: "curated-anchor-not-in-mizfa-data" });
      continue;
    }
    if (!String(item.sentence ?? "").includes(`[[article:${target.stableId}|${anchor}]]`)) {
      skipped.push({ source: source.stableId, target: target.stableId, anchor, reason: "curated-sentence-missing-anchor-link" });
      continue;
    }
    if (!mizfaQueryMatchesTarget(anchor, target)) {
      skipped.push({ source: source.stableId, target: target.stableId, anchor, reason: "curated-anchor-not-target-match" });
      continue;
    }
    if (!isRelatedSourceForTarget(target, source)) {
      skipped.push({ source: source.stableId, target: target.stableId, anchor, reason: "curated-source-not-related" });
      continue;
    }
    if (!sourceSupportsTargetIntent(target, source) || !sourceSupportsAnchorIntent(source, anchor)) {
      skipped.push({ source: source.stableId, target: target.stableId, anchor, reason: "curated-source-intent-mismatch" });
      continue;
    }
    const existingForSource = sourceAdditions.get(source.stableId) ?? 0;
    if (existingForSource >= 5) {
      skipped.push({ source: source.stableId, target: target.stableId, anchor, reason: "source-quota-full" });
      continue;
    }
    placements.push({
      source,
      anchor,
      sentence: normalizeText(item.sentence),
      score: overlapScore(target, source, queryHints),
    });
  }

  return { placements, skipped };
}

function generatedSentenceForPlacement(target, anchor, index) {
  const link = `[[article:${target.stableId}|${anchor}]]`;
  const topic = detectTopic(target);
  const variants = {
    womanMarriage: [
      `در رابطه جدی، ${link} به این بستگی دارد که نیاز عاطفی، سبک گفت‌وگو و تحمل تفاوت‌ها چقدر کنار هم دوام می‌آورند.`,
      `وقتی پای انتخاب شریک وسط است، ${link} فقط با شباهت ماه تولد جواب نمی‌گیرد و باید رفتار واقعی دو نفر هم دیده شود.`,
      `برای تصمیم بلندمدت، ${link} زمانی معنی‌دارتر می‌شود که امنیت، احترام و شیوه حل اختلاف هم بررسی شوند.`,
    ],
    manMarriage: [
      `در رابطه جدی، ${link} به این برمی‌گردد که نیاز او به اعتماد، احترام و همراهی عملی چطور پاسخ داده می‌شود.`,
      `وقتی ازدواج مطرح می‌شود، ${link} فقط یک تطبیق ساده نیست و باید با سبک تعهد و مدیریت اختلاف سنجیده شود.`,
      `برای انتخاب شریک، ${link} زمانی دقیق‌تر است که کنار رفتار واقعی، ثبات عاطفی و مرزهای رابطه خوانده شود.`,
    ],
    compatibility: [
      `در سنجش رابطه، ${link} باید کنار نیاز عاطفی، شیوه گفت‌وگو و تحمل تفاوت‌های روزمره خوانده شود.`,
      `اگر رابطه جدی‌تر شود، ${link} بیشتر از جذابیت اولیه به سازگاری رفتاری و شیوه حل اختلاف وابسته است.`,
      `برای فهم دوام رابطه، ${link} زمانی مفید است که هم شباهت‌ها و هم نقاط اصطکاک دیده شوند.`,
    ],
    womanTraits: [
      `در رابطه، ${link} را باید از روی رفتار تکرارشونده و نیاز عاطفی فهمید، نه فقط از یک توصیف کلی ماه تولد.`,
      `وقتی این الگو وارد عشق می‌شود، ${link} بیشتر در شیوه اعتماد، توجه و واکنش به ناامنی خودش را نشان می‌دهد.`,
      `برای خواندن دقیق‌تر، ${link} باید کنار ماه، ونوس و تجربه واقعی رابطه قرار بگیرد.`,
    ],
    manTraits: [
      `در رابطه، ${link} بیشتر از رفتارهای عملی، شیوه اعتماد کردن و نوع واکنش او به فشار شناخته می‌شود.`,
      `وقتی این الگو وارد عشق می‌شود، ${link} را باید کنار نیاز به احترام، امنیت و بیان مستقیم خواسته‌ها دید.`,
      `برای خواندن دقیق‌تر، ${link} فقط نقطه شروع است و جایگاه‌های دیگر چارت هم تصویر را کامل می‌کنند.`,
    ],
    house: [
      `در خواندن چارت، ${link} کمک می‌کند این بخش از نقشه تولد به جای یک معنی کلی، در زندگی واقعی فرد دیده شود.`,
      `وقتی این بخش فعال باشد، ${link} نشان می‌دهد موضوع از سطح نماد به تجربه‌های روزمره و تصمیم‌های شخصی نزدیک می‌شود.`,
      `برای تفسیر دقیق‌تر، ${link} باید کنار سیاره‌های درگیر، حاکم خانه و جنبه‌های مهم خوانده شود.`,
    ],
    moon: [
      `در چرخه‌های ماه، ${link} کمک می‌کند تفاوت نمادین این وضعیت با برداشت‌های رایج روشن‌تر شود.`,
      `برای خواندن زمان‌بندی، ${link} زمانی مفید است که کنار موقعیت خورشید، ماه و زمینه کلی چارت دیده شود.`,
      `در آسترولوژی روزمره، ${link} بیشتر درباره ریتم و معناست، نه یک پیش‌بینی قطعی برای همه افراد.`,
    ],
    transit: [
      `در خواندن زمان، ${link} وقتی دقیق‌تر می‌شود که اثر عمومی آسمان با چارت تولد هر فرد جداگانه سنجیده شود.`,
      `برای استفاده عملی، ${link} باید از پیش‌بینی کلی جدا شود و با خانه‌ها و سیاره‌های شخصی مقایسه شود.`,
      `در این نوع تحلیل، ${link} بیشتر نقش نقشه راه دارد تا حکم قطعی درباره اتفاق‌های بیرونی.`,
    ],
    system: [
      `در مقایسه روش‌ها، ${link} کمک می‌کند معلوم شود این سنت از چه زبان، محاسبه و فرض‌هایی استفاده می‌کند.`,
      `برای پرهیز از قاطی‌کردن نظام‌ها، ${link} باید جدا از آسترولوژی تروپیکال و کاربردهای رایج فارسی بررسی شود.`,
      `وقتی سراغ روش‌های مختلف می‌رویم، ${link} نشان می‌دهد هر نظام چه چیزی را پررنگ می‌کند و چه محدودیتی دارد.`,
    ],
    relationship: [
      `در رابطه، ${link} وقتی قابل استفاده است که کنار رفتار واقعی، مرزهای عاطفی و کیفیت گفت‌وگوی دو نفر خوانده شود.`,
      `برای تصمیم جدی، ${link} نباید جای شناخت انسانی را بگیرد، اما می‌تواند پرسش‌های دقیق‌تری برای بررسی رابطه بسازد.`,
      `در این موضوع، ${link} بیشتر به الگوهای تکرارشونده توجه می‌کند تا نتیجه‌گیری سریع از یک نشانه تنها.`,
    ],
    life: [
      `در خواندن چارت، ${link} این موضوع را از حالت کلی بیرون می‌آورد و به بخش مشخصی از تجربه شخصی وصل می‌کند.`,
      `برای تفسیر دقیق‌تر، ${link} باید کنار خانه‌های مرتبط، سیاره‌های فعال و الگوهای تکرارشونده زندگی دیده شود.`,
      `وقتی این محور پررنگ باشد، ${link} نشان می‌دهد چارت چطور یک نیاز درونی را به انتخاب‌های بیرونی وصل می‌کند.`,
    ],
    general: [
      `در این چارچوب، ${link} کمک می‌کند موضوع از یک برداشت کلی به پرسش دقیق‌تر و قابل بررسی‌تری تبدیل شود.`,
      `برای خواندن دقیق‌تر، ${link} باید کنار زمینه مقاله و داده‌های واقعی چارت دیده شود.`,
      `وقتی این موضوع مهم می‌شود، ${link} مرز میان نماد، تجربه و برداشت شخصی را روشن‌تر می‌کند.`,
    ],
  };
  const list = variants[topic] ?? variants.general;
  return list[index % list.length];
}

function automaticPlacementsForTarget(target, oldPublicSources, currentSources, queryHints, sourceAdditions, needed) {
  const mizfaAnchors = mizfaAnchorCandidates(target, queryHints);
  const generatedAnchors = generatedAnchorCandidates(target);
  const anchors = [...new Set([...mizfaAnchors, ...generatedAnchors])];
  const generatedOnlyAnchors = anchors.filter((item) => !mizfaAnchors.includes(item));
  const candidates = [];
  const skipped = [];

  for (const source of oldPublicSources) {
    if (currentSources.has(source.stableId) || hasTargetLink(source.bodyMarkdown, target.stableId)) {
      skipped.push({ source: source.stableId, target: target.stableId, reason: "already-linked" });
      continue;
    }
    if (!isFallbackRelatedSourceForTarget(target, source)) {
      skipped.push({ source: source.stableId, target: target.stableId, reason: "fallback-source-not-related" });
      continue;
    }
    const existingForSource = sourceAdditions.get(source.stableId) ?? 0;
    if (existingForSource >= 5) {
      skipped.push({ source: source.stableId, target: target.stableId, reason: "source-quota-full" });
      continue;
    }
    const anchor = anchors.find((item) =>
      mizfaAnchors.includes(item) ? sourceSupportsAnchorIntent(source, item) : true
    );
    if (!anchor) {
      skipped.push({ source: source.stableId, target: target.stableId, reason: "fallback-anchor-not-supported" });
      continue;
    }
    candidates.push({
      source,
      anchor,
      score: overlapScore(target, source, queryHints) - existingForSource * 4,
      planSource: mizfaAnchors.includes(anchor) ? "mizfa-scored" : "generated-related",
    });
  }

  candidates.sort((left, right) => right.score - left.score || left.source.stableId.localeCompare(right.source.stableId));
  const placements = [];
  for (const candidate of candidates) {
    if (placements.length >= needed) break;
    const anchorIndex = placements.length % anchors.length;
    const anchor = candidate.planSource === "mizfa-scored"
      ? candidate.anchor
      : (generatedOnlyAnchors[anchorIndex % Math.max(1, generatedOnlyAnchors.length)] ?? candidate.anchor);
    placements.push({
      source: candidate.source,
      anchor: sanitizeAnchorCandidate(anchor),
      sentence: generatedSentenceForPlacement(target, sanitizeAnchorCandidate(anchor), placements.length),
      score: candidate.score,
      planSource: candidate.planSource,
    });
  }

  return { placements, skipped };
}

function mizfaQueryIntentLabels(query) {
  const cleaned = normalizeSearchText(query);
  const labels = new Set();

  if (cleaned.includes("بدون ساعت تولد")) labels.add("birthTimeMissing");
  if (cleaned.includes("اصلاح ساعت تولد")) labels.add("birthTimeRectification");
  if (
    cleaned.includes("ساعت دقیق تولد") ||
    cleaned.includes("ساعت تولد") ||
    cleaned.includes("زمان تولد") ||
    cleaned.includes("ساعت دقیق تولدم") ||
    cleaned.includes("چگونه ساعت تولد خود را پیدا کنیم")
  ) {
    labels.add("birthTimeAccuracy");
  }
  if (cleaned.includes("خانه هشتم")) labels.add("houseEighth");
  if (cleaned.includes("خانه پنجم")) labels.add("houseFifth");
  if (cleaned.includes("خالی بودن خانه")) labels.add("emptyHouses");
  if (cleaned.includes("تفسیر خانه های چارت تولد")) labels.add("houseInterpretation");
  if (cleaned.includes("چارت تولد رایگان فارسی") || cleaned.includes("چارت تولد رایگان ماریا")) labels.add("freePersianBirthChart");
  if (cleaned.includes("ساخت چارت تولد") || cleaned === "چارت تولد فارسی" || cleaned.includes("چارت تولد انلاین")) {
    labels.add("birthChartBuild");
    labels.add("freePersianBirthChart");
  }
  if (cleaned.includes("تحلیل چارت تولد") || cleaned.includes("تفسیر چارت تولد")) labels.add("birthChartInterpretation");
  if (cleaned.includes("اورب")) labels.add("orb");
  if (cleaned.includes("استلیوم")) labels.add("stellium");
  if (cleaned.includes("نود جنوبی")) labels.add("lunarNodes");
  if (cleaned.includes("آسترولوژی مالی")) labels.add("financialAstrology");
  if (cleaned.includes("ودیک")) labels.add("vedic");
  if (cleaned.includes("تروپیکال")) labels.add("tropical");
  if (cleaned.includes("ماه نو") || cleaned.includes("ماه کامل")) labels.add("moonPhase");
  if (cleaned.includes("آسترولوژی امروز") || cleaned.includes("وضعیت سیارات امروز") || cleaned.includes("وضعیت ماه امروز") || cleaned.includes("فال سالانه")) labels.add("transitTiming");
  if (cleaned.includes("مسیر شغلی") || cleaned.includes("خانه دهم") || cleaned.includes("mc")) labels.add("careerPath");
  if (cleaned.includes("سیاره غالب")) labels.add("dominantPlanets");
  if (cleaned.includes("bts")) labels.add("celebrityBirthDates");
  const month = PERSIAN_MONTH_LABELS.find((label) => cleaned.includes(label));
  if (month && cleaned.includes("زن") && (cleaned.includes("ازدواج") || cleaned.includes("چه مردی"))) {
    labels.add("womanMarriage");
    labels.add("monthMarriage");
  }
  if (month && cleaned.includes("مرد") && cleaned.includes("ازدواج")) {
    labels.add("manMarriage");
    labels.add("monthMarriage");
  }
  if (month && cleaned.includes("ازدواج") && !cleaned.includes("زن") && !cleaned.includes("مرد")) {
    labels.add("monthMarriage");
  }

  return labels;
}

function anchorMatchesTarget(anchor, target) {
  const cleaned = sanitizeAnchorCandidate(anchor);
  if (!cleaned || cleaned.length < 3 || cleaned.length > 70 || /^مقاله\b/.test(cleaned)) return false;
  const targetMonth = detectMonth(target)?.[1] ?? "";
  const anchorMonth = PERSIAN_MONTH_LABELS.find((label) => normalizeSearchText(cleaned).includes(label));
  if (targetMonth) {
    if (anchorMonth && anchorMonth !== targetMonth) return false;
    if (!normalizeSearchText(cleaned).includes(targetMonth)) return false;
  } else if (anchorMonth) {
    return false;
  }

  const topic = detectTopic(target);
  const guardWords = topicGuardWords(topic);
  if (guardWords.length && !guardWords.some((word) => normalizeSearchText(cleaned).includes(word))) {
    return false;
  }

  const targetText = targetIdentityText(target);
  const words = meaningfulWords(cleaned);
  const hits = words.filter((word) => targetText.includes(word)).length;
  return hits >= Math.min(targetMonth ? 1 : 2, words.length);
}

function mizfaQueryMatchesTarget(query, target) {
  const cleaned = sanitizeAnchorCandidate(query);
  if (!anchorMatchesTarget(cleaned, target)) return false;
  return mizfaQueryIntentMatchesTarget(cleaned, target);
}

function mizfaQueryIntentMatchesTarget(query, target) {
  const cleaned = normalizeSearchText(query);
  const targetText = targetSearchText(target);
  const queryLabels = mizfaQueryIntentLabels(cleaned);
  const targetLabels = targetIntentLabels(target);

  for (const label of queryLabels) {
    if (targetLabels.has(label)) return true;
  }
  if (queryLabels.size > 0) return false;

  if (targetText.includes(cleaned)) return true;

  const words = meaningfulWords(cleaned);
  const hits = words.filter((word) => targetText.includes(word)).length;
  return words.length > 0 && hits === words.length;
}

function isRelatedSourceForTarget(target, source) {
  const targetMonth = detectMonth(target)?.[1] ?? "";
  const sourceMonth = detectMonth(source)?.[1] ?? "";
  if (targetMonth && sourceMonth && targetMonth !== sourceMonth) return false;

  const targetTopic = detectTopic(target);
  const sourceTopic = detectTopic(source);
  if (targetMonth && ["womanTraits", "manTraits", "womanMarriage", "manMarriage", "compatibility", "bornTraits"].includes(targetTopic)) {
    return sourceMonth === targetMonth || normalizeSearchText(source.bodyMarkdown).includes(targetMonth);
  }
  if (targetTopic === "system" && ["womanTraits", "manTraits", "womanMarriage", "manMarriage"].includes(sourceTopic)) return false;
  return sourceSupportsTargetIntent(target, source);
}

function isFallbackRelatedSourceForTarget(target, source) {
  if (isRelatedSourceForTarget(target, source)) return true;
  const targetTopic = detectTopic(target);
  const sourceTopic = detectTopic(source);
  const sameCategory = Boolean(target.categoryId && target.categoryId === source.categoryId);
  const sameCluster = Boolean(target.contentCluster && target.contentCluster === source.contentCluster);
  const sameTopic = targetTopic !== "general" && targetTopic === sourceTopic;

  const targetTerms = [...new Set([
    ...titleWords(target),
    ...slugWords(target.stableId),
  ].map(normalizeText).filter((term) => term.length >= 4))];
  const sourceText = normalizeSearchText(stripWikiLinks([
    source.title,
    source.shortTitle,
    source.seoTitle,
    source.summary,
    source.bodyMarkdown.slice(0, 22000),
  ].join(" ")));
  const hits = targetTerms.filter((term) => sourceText.includes(term)).length;
  if (sameCluster && hits >= 1) return true;
  if (sameTopic && hits >= 1) return true;
  if (sameCategory && hits >= 2) return true;
  return hits >= 3;
}

function mizfaAnchorCandidates(article, queryHints) {
  const candidates = [];
  for (const query of queryHints) {
    if (mizfaQueryMatchesTarget(query, article)) candidates.push(query);
  }

  return [...new Set(candidates.map(sanitizeAnchorCandidate))]
    .filter((item) => anchorMatchesTarget(item, article));
}

function generatedAnchorCandidates(article) {
  const month = detectMonth(article)?.[1] ?? "";
  const topic = detectTopic(article);
  const firstTitlePart = normalizeText(article.shortTitle || article.title)
    .split(/[؛؟?]/u)[0]
    .replace(/\s+/g, " ")
    .trim();
  const candidates = [];

  if (topic === "womanMarriage" && month) {
    candidates.push(`زن متولد ${month} با چه ماهی ازدواج کند`);
    candidates.push(`ازدواج زن متولد ${month}`);
    candidates.push(`سازگاری زن متولد ${month}`);
  }
  if (topic === "manMarriage" && month) {
    candidates.push(`مرد متولد ${month} با چه ماهی ازدواج کند`);
    candidates.push(`ازدواج مرد متولد ${month}`);
    candidates.push(`سازگاری مرد متولد ${month}`);
  }
  if (topic === "compatibility" && month) {
    candidates.push(`${month} با چه ماهی سازگار است`);
    candidates.push(`سازگاری متولدین ${month}`);
    candidates.push(`ازدواج متولد ${month}`);
  }
  if (topic === "womanTraits" && month) {
    candidates.push(`خصوصیات زن متولد ${month}`);
    candidates.push(`زن متولد ${month} در عشق`);
    candidates.push(`رگ خواب زن متولد ${month}`);
  }
  if (topic === "manTraits" && month) {
    candidates.push(`خصوصیات مرد متولد ${month}`);
    candidates.push(`مرد متولد ${month} در عشق`);
    candidates.push(`رگ خواب مرد متولد ${month}`);
  }
  if (topic === "bornTraits" && month) {
    candidates.push(`خصوصیات متولدین ${month}`);
    candidates.push(`متولدین ${month} در عشق`);
    candidates.push(`نقطه ضعف متولدین ${month}`);
  }
  if (topic === "house") {
    candidates.push(firstTitlePart);
    candidates.push(firstTitlePart.replace(/؛.*$/u, ""));
  }
  if (topic === "moon") {
    candidates.push(firstTitlePart);
    if (article.title.includes("ماه کامل")) candidates.push("ماه کامل در آسترولوژی");
    if (article.title.includes("ماه نو")) candidates.push("ماه نو در آسترولوژی");
  }
  if (topic === "transit") {
    candidates.push(firstTitlePart);
    if (article.title.includes("امروز")) candidates.push("آسترولوژی امروز");
    if (article.title.includes("فردا")) candidates.push("طالع‌بینی فردا");
  }
  if (topic === "system") {
    candidates.push(firstTitlePart.includes("آسترولوژی") ? firstTitlePart : `آسترولوژی ${firstTitlePart}`);
  }
  if (topic === "relationship") {
    candidates.push(firstTitlePart);
    if (article.title.includes("ازدواج")) candidates.push("طالع‌بینی ازدواج");
    if (article.title.includes("عشق")) candidates.push("طالع‌بینی عشق");
  }
  if (topic === "life") {
    candidates.push(firstTitlePart);
    if (article.title.includes("پول")) candidates.push("چارت تولد و پول");
    if (article.title.includes("مسیر شغلی")) candidates.push("چارت تولد و مسیر شغلی");
    if (article.title.includes("خانواده")) candidates.push("چارت تولد و خانواده");
    if (article.title.includes("خلاقیت")) candidates.push("چارت تولد و خلاقیت");
  }

  candidates.push(firstTitlePart);

  return [...new Set(candidates.map(sanitizeAnchorCandidate))]
    .map((item) => item.length > 70 ? item.slice(0, 70).trim() : item)
    .filter((item) => anchorMatchesTarget(item, article));
}

function anchorCandidates(article, queryHints) {
  return [...new Set([
    ...mizfaAnchorCandidates(article, queryHints),
    ...generatedAnchorCandidates(article),
  ])];
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

function pickParagraph(sections, hints, usedParagraphs) {
  const hintTerms = [...new Set(hints.flatMap((hint) => meaningfulWords(hint)))];
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
      const termScore = hintTerms.filter((term) => haystack.includes(term)).length;
      if (hintScore <= 0 && termScore < 2) continue;
      candidates.push({ sectionIndex, paragraphIndex, paragraph, hintScore, termScore, length: paragraph.length });
    }
  }
  candidates.sort((left, right) =>
    right.hintScore - left.hintScore ||
    right.termScore - left.termScore ||
    right.length - left.length
  );
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

async function insertAddedInlineLink(tx, sourceArticleId, targetId, anchor) {
  const publicRows = await tx`
    select stable_id
    from public.wiki_articles
    where stable_id = ${targetId}
      and status = 'published'
      and is_indexable = true
      and published_at is not null
      and published_at <= now()
      and scheduled_for is null
      and deleted_at is null
    limit 1
  `;
  const activationStatus = publicRows[0] ? "active" : "pending";
  const sourceToken = `[[article:${targetId}|${anchor}]]`;
  await tx`
    insert into public.wiki_internal_links (
      source_article_id, target_stable_id, link_kind, source_token,
      activation_status, activated_at, last_verified_at, activation_error
    ) values (
      ${sourceArticleId}::uuid, ${targetId}, 'inline', ${sourceToken},
      ${activationStatus}, now(), now(),
      ${activationStatus === "pending" ? "target-not-public-ready" : null}
    )
    on conflict (source_article_id, target_stable_id, link_kind, source_token)
    do update set
      activation_status = excluded.activation_status,
      activated_at = excluded.activated_at,
      last_verified_at = excluded.last_verified_at,
      activation_error = excluded.activation_error,
      disabled_at = null
  `;
}

async function submitIndexNowBestEffort(slugs) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://halleus.ir").replace(/\/+$/, "");
  const key = process.env.HALLEUS_INDEXNOW_KEY;
  const urlList = [...new Set(slugs.filter(Boolean).map((slug) => `${site}/wiki/${slug}`))].slice(0, 10000);
  if (!key || !urlList.length) return { ok: true, skipped: true, submitted: 0 };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INDEXNOW_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        host: new URL(site).host,
        key,
        keyLocation: `${site}/indexnow-key.txt`,
        urlList,
      }),
    });
    return { ok: response.ok, skipped: false, status: response.status, submitted: response.ok ? urlList.length : 0 };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      submitted: 0,
      error: error instanceof Error ? error.message.slice(0, 300) : "IndexNow request failed.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function assertSelfCheck() {
  const source = readFileSync(new URL(import.meta.url), "utf8");
  for (const marker of [
    "const SOURCE_MIN_AGE_DAYS = 10",
    "activationStatus === \"pending\"",
    "Add natural pending inbound links",
    "system.wiki.scheduled_inbound_link_repair",
    "BUILT_IN_MIZFA_QUERIES",
    "INDEXNOW_TIMEOUT_MS",
    "hasTargetLink(source.bodyMarkdown, target.stableId)",
    "sanitizeAnchorCandidate",
    "anchorMatchesTarget",
    "mizfaQueryMatchesTarget",
    "mizfaQueryIntentMatchesTarget",
    "targetIntentLabels",
    "sourceIntentLabels",
    "sourceSupportsTargetIntent",
    "sourceSupportsAnchorIntent",
    "CURATED_SCHEDULED_INBOUND_PLANS",
    "curatedPlacementsForTarget",
    "generated-plan-incomplete",
    "planSource: placement.planSource",
    "sentence: placement.sentence",
    "mizfaQueryIntentLabels",
    "targetIdentityText",
    "isRelatedSourceForTarget",
    "missing-related-mizfa-anchor",
    "requireCuratedComplete: false",
    "arg === \"--require-curated-complete\"",
    "automaticPlacementsForTarget",
    "generatedAnchorCandidates",
    "generatedSentenceForPlacement",
    "isFallbackRelatedSourceForTarget",
    "insertAddedInlineLink",
    "pg_try_advisory_xact_lock",
    "isOldEnoughForScheduledTarget",
  ]) {
    if (!source.includes(marker)) throw new Error(`self-check marker missing: ${marker}`);
  }
  const deyCompatibility = {
    stableId: "dey-birth-month-compatibility",
    title: "دی با چه ماهی سازگار است؟",
    shortTitle: "سازگاری دی",
    seoTitle: "سازگاری متولد دی",
    summary: "",
  };
  const tirWoman = {
    stableId: "tir-woman-traits",
    title: "زن متولد تیر",
    shortTitle: "خصوصیات زن تیر",
    seoTitle: "زن متولد تیر در عشق",
    summary: "",
  };
  const mordadWoman = {
    stableId: "mordad-woman-traits",
    title: "زن متولد مرداد",
    shortTitle: "خصوصیات زن مرداد",
    seoTitle: "زن متولد مرداد در عشق",
    summary: "",
    bodyMarkdown: "زن متولد مرداد در رابطه گرم و مستقیم است.",
  };
  const khordadBornTraits = {
    stableId: "khordad-born-traits",
    title: "خصوصیات متولدین خرداد؛ عشق، دوگانگی، نقطه‌ضعف و قهر",
    shortTitle: "خصوصیات متولدین خرداد",
    seoTitle: "خصوصیات متولدین خرداد",
    summary: "",
    bodyMarkdown: "چارت تولد فارسی می‌تواند جزئیات بیشتری از عطارد نشان دهد.",
  };
  const northNodeVsSouthNode = {
    stableId: "north-node-vs-south-node",
    title: "تفاوت نود شمالی و جنوبی در چارت تولد چیست؟",
    shortTitle: "نود شمالی و جنوبی",
    seoTitle: "نود شمالی و نود جنوبی در چارت تولد",
    summary: "",
    bodyMarkdown: "برای خواندن محور نودها گاهی ساخت چارت تولد لازم است.",
  };
  const birthChartReportLayers = {
    stableId: "birth-chart-report-layers",
    title: "گزارش چارت تولد چه لایه‌هایی دارد؟",
    shortTitle: "گزارش چارت تولد",
    seoTitle: "گزارش چارت تولد",
    summary: "",
    bodyMarkdown: "گزارش چارت تولد بعد از ساخت چارت دقیق‌تر می‌شود.",
  };
  const natalChartUsesAndLimits = {
    stableId: "natal-chart-uses-and-limits",
    title: "چارت تولد چه چیزهایی را می‌تواند و نمی‌تواند به ما بگوید؟",
    shortTitle: "کاربردها و محدودیت‌های چارت تولد",
    seoTitle: "چارت تولد و محدودیت‌های آن",
    summary: "",
    bodyMarkdown: "قبل از ساخت چارت تولد باید بدانیم چارت چه چیزی را نشان می‌دهد.",
    publishedAt: "2026-08-13T06:30:00.000Z",
    scheduledFor: null,
    deletedAt: null,
    status: "published",
    indexable: true,
  };
  const birthChartInterpretation = {
    stableId: "what-is-birth-chart-interpretation",
    title: "تفسیر چارت تولد چیست و چگونه انجام می‌شود؟",
    shortTitle: "تفسیر چارت تولد",
    seoTitle: "تفسیر چارت تولد",
    summary: "",
    bodyMarkdown: "تفسیر چارت تولد بعد از محاسبه دقیق چارت معنا پیدا می‌کند.",
    publishedAt: "2026-07-29T10:30:00.000Z",
    scheduledFor: null,
    deletedAt: null,
    status: "published",
    indexable: true,
  };
  const howToReadBirthChart = {
    stableId: "how-to-read-birth-chart",
    title: "چگونه چارت تولد را بخوانیم؟ راهنمای قدم‌به‌قدم برای مبتدی‌ها",
    shortTitle: "خواندن چارت تولد",
    seoTitle: "چگونه چارت تولد را بخوانیم؟",
    summary: "",
    bodyMarkdown: "برای خواندن چارت، اول باید خود چارت را درست بسازیم.",
    publishedAt: "2026-07-29T10:30:00.000Z",
    scheduledFor: null,
    deletedAt: null,
    status: "published",
    indexable: true,
  };
  const whyBirthTimeMatters = {
    stableId: "why-birth-time-matters",
    title: "چرا ساعت دقیق تولد در چارت تولد مهم است؟",
    shortTitle: "اهمیت ساعت تولد",
    seoTitle: "ساعت دقیق تولد در چارت تولد",
    summary: "",
    bodyMarkdown: "ساعت دقیق تولد برای رایزینگ و خانه‌های چارت لازم است.",
    publishedAt: "2026-07-29T10:30:00.000Z",
    scheduledFor: null,
    deletedAt: null,
    status: "published",
    indexable: true,
  };
  const birthChartWithoutBirthTime = {
    stableId: "birth-chart-without-birth-time",
    title: "چارت تولد بدون ساعت تولد؛ چه چیزهایی را می‌توان خواند؟",
    shortTitle: "چارت بدون ساعت تولد",
    seoTitle: "چارت تولد بدون ساعت تولد",
    summary: "",
    bodyMarkdown: "اگر ساعت تولد معلوم نباشد، باید بخش‌های وابسته به زمان را محتاطانه خواند.",
    publishedAt: "2026-07-16T00:00:00.000Z",
    scheduledFor: null,
    deletedAt: null,
    status: "published",
    indexable: true,
  };
  const tehranBirthChartDifference = {
    stableId: "tehran-birth-chart-difference",
    title: "چارت تولد تهران چه فرقی با شهرهای دیگر دارد؟",
    shortTitle: "چارت تولد تهران",
    seoTitle: "تفاوت شهر تولد در چارت",
    summary: "",
    bodyMarkdown: "شهر تولد و ساعت تولد هر دو روی محاسبه دقیق خانه‌ها اثر می‌گذارند.",
    publishedAt: "2026-07-16T00:00:00.000Z",
    scheduledFor: null,
    deletedAt: null,
    status: "published",
    indexable: true,
  };
  const risingSign = {
    stableId: "what-is-rising-sign",
    title: "رایزینگ یا طالع چیست و چگونه محاسبه می‌شود؟",
    shortTitle: "رایزینگ یا طالع",
    seoTitle: "محاسبه رایزینگ",
    summary: "",
    bodyMarkdown: "رایزینگ با ساعت تولد و شهر تولد محاسبه می‌شود.",
    publishedAt: "2026-07-29T10:30:00.000Z",
    scheduledFor: null,
    deletedAt: null,
    status: "published",
    indexable: true,
  };
  const sixthHouse = {
    stableId: "sixth-house-in-natal-chart",
    title: "خانه ششم در چارت تولد؛ کار روزانه، بدن و نظم",
    shortTitle: "خانه ششم",
    seoTitle: "خانه ششم چارت تولد",
    summary: "",
    bodyMarkdown: "در کنار خانه پنجم، خانه ششم درباره ریتم روزمره حرف می‌زند.",
  };
  const seventhHouse = {
    stableId: "seventh-house-in-natal-chart",
    title: "خانه هفتم در چارت تولد؛ رابطه، تعهد و آینه دیگران",
    shortTitle: "خانه هفتم",
    seoTitle: "خانه هفتم چارت تولد",
    summary: "",
    bodyMarkdown: "خانه پنجم و خانه هفتم هر دو در رابطه دیده می‌شوند.",
  };
  const fifthHouse = {
    stableId: "fifth-house-in-natal-chart",
    title: "خانه پنجم در چارت تولد؛ عشق، خلاقیت و فرزند",
    shortTitle: "خانه پنجم",
    seoTitle: "خانه پنجم چارت تولد",
    summary: "",
    bodyMarkdown: "خانه پنجم درباره خلاقیت، عشق و فرزند حرف می‌زند.",
  };
  const btsBirthDates = {
    stableId: "bts-members-birth-dates-zodiac",
    title: "تاریخ تولد اعضای BTS و برج ماه تولد هر کدام",
    shortTitle: "تاریخ تولد اعضای BTS",
    seoTitle: "تاریخ تولد اعضای BTS و برج‌ها",
    summary: "اگر ساعت دقیق تولد یا چارت تولد بدون ساعت تولد اعضا منتشر نشده باشد، باید با احتیاط خوانده شود.",
  };
  const dominantPlanets = {
    stableId: "dominant-planets-in-natal-chart",
    title: "سیاره غالب در چارت تولد چیست؟",
    shortTitle: "سیاره غالب",
    seoTitle: "سیاره غالب در چارت تولد",
    summary: "",
  };
  const careerPath = {
    stableId: "birth-chart-and-career-path",
    title: "چارت تولد و مسیر شغلی؛ MC، خانه دهم و استعدادها",
    shortTitle: "چارت تولد و مسیر شغلی",
    seoTitle: "چارت تولد و مسیر شغلی",
    summary: "",
  };
  const freeChart = {
    stableId: "best-free-persian-birth-chart-site",
    title: "بهترین سایت چارت تولد رایگان فارسی",
    shortTitle: "چارت تولد رایگان فارسی",
    seoTitle: "چارت تولد رایگان فارسی",
    summary: "",
  };
  const onlineAstrology = {
    stableId: "online-free-astrology",
    title: "آسترولوژی آنلاین رایگان",
    shortTitle: "آسترولوژی آنلاین",
    seoTitle: "آسترولوژی آنلاین رایگان",
    summary: "کاربر شاید دنبال چارت تولد رایگان فارسی هم باشد، اما این صفحه مقصد مستقیم آن نیست.",
  };
  const eighthHouse = {
    stableId: "eighth-house-in-natal-chart",
    title: "خانه هشتم در چارت تولد؛ بحران، صمیمیت و دگرگونی",
    shortTitle: "خانه هشتم",
    seoTitle: "خانه هشتم چارت تولد",
    summary: "",
  };
  const birthChartCreativity = {
    stableId: "birth-chart-and-creativity",
    title: "چارت تولد و خلاقیت؛ خانه پنجم، ونوس و خورشید",
    shortTitle: "چارت تولد و خلاقیت",
    seoTitle: "چارت تولد و خلاقیت",
    summary: "",
  };
  const childrenGender = {
    stableId: "children-gender-astrology",
    title: "آیا طالع‌بینی می‌تواند تعداد یا جنسیت فرزند را پیش‌بینی کند؟",
    shortTitle: "طالع‌بینی جنسیت فرزند",
    seoTitle: "جنسیت فرزند در طالع‌بینی",
    summary: "در بعضی متن‌ها خانه پنجم به فرزند ربط داده می‌شود، اما source لینک باید خودش همین intent را داشته باشد.",
  };
  const birthTimeRecords = {
    stableId: "birth-time-civil-registration-records",
    title: "ساعت تولد در ثبت احوال ثبت می‌شود؟ راه‌های استعلام ساعت دقیق تولد",
    shortTitle: "استعلام ساعت تولد",
    seoTitle: "ساعت دقیق تولد در ثبت احوال",
    summary: "",
  };
  const birthTimeRectification = {
    stableId: "birth-time-rectification",
    title: "اصلاح ساعت تولد چیست؟",
    shortTitle: "اصلاح ساعت تولد",
    seoTitle: "اصلاح ساعت تولد",
    summary: "",
  };
  if (anchorMatchesTarget("فرق ماه نو و ماه کامل", deyCompatibility)) {
    throw new Error("self-check failed: unrelated moon query must not anchor Dey compatibility.");
  }
  if (anchorMatchesTarget("رگ خواب زن متولد آبان", tirWoman)) {
    throw new Error("self-check failed: wrong-month anchor must not anchor Tir woman traits.");
  }
  if (!anchorMatchesTarget("زن متولد تیر", tirWoman)) {
    throw new Error("self-check failed: direct target anchor should be accepted.");
  }
  if (mizfaAnchorCandidates(tirWoman, []).length !== 0) {
    throw new Error("self-check failed: Mizfa candidate planner must not invent anchors without Mizfa data.");
  }
  if (!generatedAnchorCandidates(tirWoman).includes("خصوصیات زن متولد تیر")) {
    throw new Error("self-check failed: generated fallback anchors should come from target identity.");
  }
  if (!mizfaAnchorCandidates(tirWoman, ["زن متولد تیر"]).includes("زن متولد تیر")) {
    throw new Error("self-check failed: planner should accept a matching Mizfa query anchor.");
  }
  if (mizfaQueryMatchesTarget("چارت تولد بدون ساعت تولد", btsBirthDates)) {
    throw new Error("self-check failed: birth-time query must not anchor BTS birth-date target.");
  }
  if (mizfaQueryMatchesTarget("اصلاح ساعت تولد", btsBirthDates)) {
    throw new Error("self-check failed: rectification query must not anchor BTS birth-date target.");
  }
  if (mizfaQueryMatchesTarget("ساعت دقیق تولد", btsBirthDates)) {
    throw new Error("self-check failed: exact birth-time query must not anchor BTS birth-date target.");
  }
  if (mizfaAnchorCandidates(btsBirthDates, ["چارت تولد بدون ساعت تولد", "اصلاح ساعت تولد", "ساعت دقیق تولد"]).length !== 0) {
    throw new Error("self-check failed: BTS target must have no birth-time anchor candidates.");
  }
  if (mizfaQueryMatchesTarget("چارت تولد بدون ساعت تولد", dominantPlanets)) {
    throw new Error("self-check failed: birth-time query must not anchor dominant-planets target.");
  }
  if (mizfaQueryMatchesTarget("خانه هشتم چارت تولد", careerPath)) {
    throw new Error("self-check failed: eighth-house query must not anchor career-path target.");
  }
  if (mizfaQueryMatchesTarget("چارت تولد رایگان فارسی", onlineAstrology)) {
    throw new Error("self-check failed: free Persian birth chart query must not anchor generic online astrology target.");
  }
  if (!mizfaQueryMatchesTarget("خانه هشتم چارت تولد", eighthHouse)) {
    throw new Error("self-check failed: eighth-house query should anchor matching target.");
  }
  if (!mizfaQueryMatchesTarget("اصلاح ساعت تولد", birthTimeRectification)) {
    throw new Error("self-check failed: birth-time rectification query should anchor matching target.");
  }
  if (!mizfaQueryMatchesTarget("چارت تولد رایگان فارسی", freeChart)) {
    throw new Error("self-check failed: free Persian birth chart query should anchor matching target.");
  }
  if (isRelatedSourceForTarget(freeChart, northNodeVsSouthNode)) {
    throw new Error("self-check failed: lunar-node source must not target free Persian birth chart page.");
  }
  if (isRelatedSourceForTarget(freeChart, khordadBornTraits)) {
    throw new Error("self-check failed: month-persona source must not target free Persian birth chart page.");
  }
  if (!isRelatedSourceForTarget(freeChart, birthChartReportLayers)) {
    throw new Error("self-check failed: birth-chart core source should target free Persian birth chart page.");
  }
  const oldEnoughSources = [birthChartReportLayers, natalChartUsesAndLimits, birthChartInterpretation, howToReadBirthChart]
    .map((source) => ({
      publishedAt: "2026-07-29T10:30:00.000Z",
      scheduledFor: null,
      deletedAt: null,
      status: "published",
      indexable: true,
      ...source,
    }));
  const curatedFreeChart = curatedPlacementsForTarget(
    freeChart,
    oldEnoughSources,
    new Set(),
    ["چارت تولد رایگان فارسی", "ساخت چارت تولد", "چارت تولد فارسی", "چارت تولد رایگان ماریا"],
    new Map(),
  );
  if (!curatedFreeChart || curatedFreeChart.placements.length !== 4) {
    throw new Error("self-check failed: curated free-chart target should keep four exact Mizfa placements.");
  }
  const curatedBirthTimeRecords = curatedPlacementsForTarget(
    birthTimeRecords,
    [whyBirthTimeMatters, birthChartWithoutBirthTime, tehranBirthChartDifference, risingSign],
    new Set(),
    ["ساعت دقیق تولد", "ساعت تولد", "چگونه ساعت تولد خود را پیدا کنیم"],
    new Map(),
  );
  if (!curatedBirthTimeRecords || curatedBirthTimeRecords.placements.length !== 4) {
    throw new Error("self-check failed: curated birth-time records target should keep exact Mizfa placements.");
  }
  const curatedFreeAnchors = curatedFreeChart.placements.map((item) => item.anchor);
  if (new Set(curatedFreeAnchors).size !== curatedFreeAnchors.length) {
    throw new Error("self-check failed: curated free-chart anchors should be intentionally varied.");
  }
  if (sourceSupportsAnchorIntent(northNodeVsSouthNode, "چارت تولد رایگان فارسی")) {
    throw new Error("self-check failed: lunar-node source must not support free Persian birth chart anchor.");
  }
  if (sourceSupportsAnchorIntent(khordadBornTraits, "چارت تولد رایگان فارسی")) {
    throw new Error("self-check failed: month-persona source must not support free Persian birth chart anchor.");
  }
  if (!sourceSupportsAnchorIntent(birthChartReportLayers, "چارت تولد رایگان فارسی")) {
    throw new Error("self-check failed: birth-chart core source should support free Persian birth chart anchor.");
  }
  if (isRelatedSourceForTarget(birthChartCreativity, sixthHouse)) {
    throw new Error("self-check failed: sixth-house source must not target fifth-house creativity page.");
  }
  if (sourceSupportsAnchorIntent(sixthHouse, "خانه پنجم")) {
    throw new Error("self-check failed: sixth-house source must not support fifth-house anchor.");
  }
  if (sourceSupportsAnchorIntent(seventhHouse, "خانه پنجم")) {
    throw new Error("self-check failed: seventh-house source must not support fifth-house anchor.");
  }
  if (!isRelatedSourceForTarget(birthChartCreativity, fifthHouse)) {
    throw new Error("self-check failed: fifth-house source should target creativity page.");
  }
  if (!sourceSupportsAnchorIntent(fifthHouse, "خانه پنجم")) {
    throw new Error("self-check failed: fifth-house source should support fifth-house anchor.");
  }
  if (isRelatedSourceForTarget(childrenGender, seventhHouse)) {
    throw new Error("self-check failed: seventh-house source must not target children-gender page.");
  }
  if (!isRelatedSourceForTarget(childrenGender, fifthHouse)) {
    throw new Error("self-check failed: fifth-house source should target children-gender page.");
  }
  for (const unsafeTarget of ["birth-chart-and-creativity", "children-gender-astrology", "exact-birth-date-astrology"]) {
    if (CURATED_PLANS_BY_TARGET.has(unsafeTarget)) {
      throw new Error(`self-check failed: ambiguous Mizfa anchor target must not be curated: ${unsafeTarget}`);
    }
  }
  for (const plan of CURATED_SCHEDULED_INBOUND_PLANS) {
    if (plan.placements.length < MINIMUM_INBOUND_TARGET) {
      throw new Error(`self-check failed: curated target has fewer than three placements: ${plan.target}`);
    }
    for (const placement of plan.placements) {
      if (!BUILT_IN_MIZFA_QUERIES.includes(placement.anchor)) {
        throw new Error(`self-check failed: curated anchor is not in Mizfa data: ${placement.anchor}`);
      }
      if (!placement.sentence.includes(`[[article:${plan.target}|${placement.anchor}]]`)) {
        throw new Error(`self-check failed: curated sentence does not preserve its exact anchor: ${plan.target}`);
      }
    }
  }
  if (isRelatedSourceForTarget(tirWoman, mordadWoman)) {
    throw new Error("self-check failed: wrong-month trait source must not target Tir woman traits.");
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
      revision.snapshot as queued_snapshot,
      exists (
        select 1
        from public.wiki_article_drafts as draft
        where draft.article_id = article.id
      ) as has_open_draft
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
  const currentPublicSources = articles.filter((article) => isCurrentPublic(article, nowMs));
  const scheduledTargets = articles
    .filter((article) => isScheduledTarget(article, nowMs))
    .sort((left, right) => Date.parse(left.scheduledFor) - Date.parse(right.scheduledFor))
    .slice(0, options.maxTargets);
  const sourceAdditions = new Map();
  const targetPreparedSources = new Map();
  const targetInitialSources = new Map();
  const placements = [];
  const incompleteTargets = [];
  const eligibleSourceIds = new Set();

  for (const target of scheduledTargets) {
    const oldPublicSources = currentPublicSources.filter((source) =>
      isOldEnoughForScheduledTarget(source, target, nowMs)
    );
    for (const source of oldPublicSources) eligibleSourceIds.add(source.stableId);
    const currentSources = new Set(
      oldPublicSources
        .filter((source) => hasTargetLink(source.bodyMarkdown, target.stableId))
        .map((source) => source.stableId),
    );
    targetInitialSources.set(target.stableId, new Set(currentSources));
    targetPreparedSources.set(target.stableId, currentSources);
    const desired = desiredInboundCount(target, queryHints, options.maxInbound);
    const needed = Math.max(0, Math.max(options.minInbound, desired) - currentSources.size);
    if (!needed) continue;

    const hints = targetHints(target, queryHints);
    const anchors = anchorCandidates(target, queryHints);
    if (!anchors.length) {
      incompleteTargets.push({
        stableId: target.stableId,
        title: target.title,
        scheduledFor: target.scheduledFor,
        preparedInbound: currentSources.size,
        minimum: options.minInbound,
        reason: "missing-related-mizfa-anchor",
      });
      continue;
    }

    const curatedPlan = curatedPlacementsForTarget(target, oldPublicSources, currentSources, queryHints, sourceAdditions);
    if (curatedPlan) {
      let added = 0;
      for (const candidate of curatedPlan.placements) {
        if (added >= needed) break;
        placements.push({
          source: candidate.source.stableId,
          target: target.stableId,
          anchor: candidate.anchor,
          sentence: candidate.sentence,
          hints,
          score: candidate.score,
          targetTitle: target.title,
          targetScheduledFor: target.scheduledFor,
          desired,
          existingPreparedInbound: currentSources.size,
          planSource: "curated-mizfa",
        });
        sourceAdditions.set(candidate.source.stableId, (sourceAdditions.get(candidate.source.stableId) ?? 0) + 1);
        currentSources.add(candidate.source.stableId);
        added += 1;
      }
    }

    const remainingNeeded = Math.max(0, Math.max(options.minInbound, desired) - currentSources.size);
    if (remainingNeeded > 0) {
      const automaticPlan = automaticPlacementsForTarget(
        target,
        oldPublicSources,
        currentSources,
        queryHints,
        sourceAdditions,
        remainingNeeded,
      );
      for (const candidate of automaticPlan.placements) {
        placements.push({
          source: candidate.source.stableId,
          target: target.stableId,
          anchor: candidate.anchor,
          sentence: candidate.sentence,
          hints,
          score: candidate.score,
          targetTitle: target.title,
          targetScheduledFor: target.scheduledFor,
          desired,
          existingPreparedInbound: currentSources.size,
          planSource: candidate.planSource,
        });
        sourceAdditions.set(candidate.source.stableId, (sourceAdditions.get(candidate.source.stableId) ?? 0) + 1);
        currentSources.add(candidate.source.stableId);
      }
      if (currentSources.size < options.minInbound) {
        incompleteTargets.push({
          stableId: target.stableId,
          title: target.title,
          scheduledFor: target.scheduledFor,
          preparedInbound: currentSources.size,
          minimum: options.minInbound,
          reason: curatedPlan ? "curated-and-generated-plan-incomplete" : "generated-plan-incomplete",
          skipped: [
            ...(curatedPlan?.skipped ?? []),
            ...automaticPlan.skipped.slice(0, 20),
          ],
        });
      }
    }
  }
  const curatedCoverage = scheduledTargets
    .map((target) => ({
      stableId: target.stableId,
      title: target.title,
      scheduledFor: target.scheduledFor,
      planSource: CURATED_PLANS_BY_TARGET.has(target.stableId) ? "curated-mizfa-first" : "generated-related",
      existingPreparedInbound: targetInitialSources.get(target.stableId)?.size ?? 0,
      plannedPreparedInbound: targetPreparedSources.get(target.stableId)?.size ?? 0,
      minimum: options.minInbound,
    }));
  return {
    placements,
    incompleteTargets,
    curatedCoverage,
    targetCount: scheduledTargets.length,
    sourceCount: eligibleSourceIds.size,
  };
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
      await tx`set local lock_timeout = '5s'`;
      await tx`set local statement_timeout = '0'`;
      const repairLock = await tx`select pg_try_advisory_xact_lock(hashtext(${RUN_ID})) as acquired`;
      if (repairLock[0]?.acquired !== true) {
        throw new Error("Another scheduled inbound repair is already running.");
      }
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
        const relatedArticleIds = [...new Set(source.relatedArticleIds ?? [])];
        const usedParagraphs = new Set();
        const appliedForSource = [];
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
          changed = true;
          const appliedPlacement = {
            source: placement.source,
            target: placement.target,
            anchor: placement.anchor,
            sentence: placement.sentence,
            planSource: placement.planSource ?? "scored-mizfa",
            score: placement.score,
            section: sections[picked.sectionIndex].title ?? "",
          };
          applied.push(appliedPlacement);
          appliedForSource.push(appliedPlacement);
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
          for (const placement of appliedForSource) {
            await insertAddedInlineLink(tx, source.id, placement.target, placement.anchor);
          }
        }
      }

      const appliedSourcesByTarget = new Map();
      for (const placement of applied) {
        const sources = appliedSourcesByTarget.get(placement.target) ?? new Set();
        sources.add(placement.source);
        appliedSourcesByTarget.set(placement.target, sources);
      }
      const curatedCoverage = plan.curatedCoverage.map((coverage) => ({
        ...coverage,
        appliedInbound: appliedSourcesByTarget.get(coverage.stableId)?.size ?? 0,
        finalPreparedInbound: coverage.existingPreparedInbound +
          (appliedSourcesByTarget.get(coverage.stableId)?.size ?? 0),
      }));
      const incompleteCuratedTargets = curatedCoverage.filter((item) =>
        item.finalPreparedInbound < item.minimum
      );
      if (options.requireCuratedComplete && incompleteCuratedTargets.length) {
        throw new Error(
          `Scheduled inbound plan is incomplete: ${incompleteCuratedTargets
            .map((item) => `${item.stableId}=${item.finalPreparedInbound}/${item.minimum}`)
            .join(", ")}`,
        );
      }

      if (options.apply && applied.length) {
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
        candidateCount: plan.placements.length,
        plannedCount: applied.length,
        appliedCount: options.apply ? applied.length : 0,
        dryRunPlannedCount: options.apply ? null : applied.length,
        skippedCount: skipped.length,
        changedSourceSlugs,
        incompleteTargets: plan.incompleteTargets,
        curatedCoverage,
        incompleteCuratedTargets,
        applied,
        skipped,
      };
    });

    const discovery = options.apply ? await submitIndexNowBestEffort(result.changedSourceSlugs) : null;
    const output = { ...result, discovery };
    if (options.compact) {
      console.log(JSON.stringify({
        mode: output.mode,
        runId: output.runId,
        scannedScheduledTargets: output.scannedScheduledTargets,
        eligibleOldPublicSources: output.eligibleOldPublicSources,
        candidateCount: output.candidateCount,
        plannedCount: output.plannedCount,
        appliedCount: output.appliedCount,
        changedSourceCount: output.changedSourceSlugs.length,
        coverageCount: output.curatedCoverage.length,
        completeCoverageCount: output.curatedCoverage.filter((item) => item.finalPreparedInbound >= item.minimum).length,
        sampleCoverage: output.curatedCoverage.slice(0, 12),
        incompleteScheduledTargets: output.incompleteCuratedTargets,
        appliedSample: output.applied.slice(0, 20),
        discovery: output.discovery,
      }, null, 2));
    } else {
      console.log(JSON.stringify(output, null, 2));
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
