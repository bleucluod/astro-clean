import { readFileSync } from "node:fs";
import postgres from "postgres";

const CHANGE_NOTE = "Repair damaged public Wiki article body from canonical content";
const SIDEREAL_STABLE_ID = "what-is-sidereal-astrology";

const SIDEREAL_SECTIONS = [
  {
    title: "تعریف کوتاه",
    paragraphs: [
      "ممکن است چارت تولدت را در دو سایت مختلف ساخته باشی و با دو نتیجه روبه‌رو شده باشی.",
      "در یکی خورشیدت در حمل است و در دیگری در حوت. رایزینگ یا ماهت هم شاید یک نشان جابه‌جا شده باشد.",
      "این تفاوت معمولاً به این معنا نیست که یکی از سایت‌ها تاریخ تولدت را اشتباه خوانده است. احتمال دارد یکی از زودیاک تروپیکال و دیگری از زودیاک سایدرئال استفاده کرده باشد.",
      "آسترولوژی سایدرئال نظامی است که جایگاه نشان‌ها را نسبت به یک مرجع ستاره‌ای تنظیم می‌کند.",
    ],
  },
  {
    title: "سایدرئال یعنی چه؟",
    paragraphs: [
      "واژه‌ی Sidereal به ستاره‌ها مربوط است.",
      "در زودیاک سایدرئال، نقطه‌ی شروع دوازده نشان قرار نیست همیشه به اعتدال بهاری متصل بماند. در عوض، سیستم تلاش می‌کند نشان‌ها را نسبت به پس‌زمینه‌ی ستاره‌ای ثابت نگه دارد.",
      "اما این توضیح یک نکته‌ی مهم دارد: سایدرئال نیز لزوماً مرزهای واقعی و نامساوی صورت‌های فلکی را عیناً دنبال نمی‌کند.",
      "در بیشتر سیستم‌های سایدرئال، زودیاک همچنان به دوازده بخش مساوی سی‌درجه‌ای تقسیم می‌شود. تفاوت اصلی در محل قرارگرفتن صفر درجه‌ی حمل است.",
    ],
  },
  {
    title: "چرا تروپیکال و سایدرئال از هم فاصله گرفته‌اند؟",
    paragraphs: [
      "به‌دلیل حرکت تقدیمی محور زمین.",
      "محور زمین در چرخه‌ای بسیار طولانی به‌آرامی جهت خود را تغییر می‌دهد. در نتیجه، نقاط اعتدال نسبت به ستاره‌ها در طول قرن‌ها جابه‌جا می‌شوند. این پدیده در نجوم Precession نام دارد.",
      "زودیاک تروپیکال صفر درجه‌ی حمل را به اعتدال بهاری متصل نگه می‌دارد.",
      "زودیاک سایدرئال تلاش می‌کند صفر درجه‌ی حمل را با یک مرجع ستاره‌ای تنظیم کند.",
      "در نتیجه، با گذشت زمان میان این دو زودیاک فاصله ایجاد شده است.",
    ],
  },
  {
    title: "آیانامشا چیست؟",
    paragraphs: [
      "Ayanamsha نام مقداری است که اختلاف میان زودیاک تروپیکال و یک زودیاک سایدرئال را نشان می‌دهد.",
      "برای تبدیل یک جایگاه تروپیکال به سایدرئال، مقدار آیانامشا از طول دایرةالبروجی آن کم می‌شود.",
      "اما همه‌ی مکاتب سایدرئال درباره‌ی مقدار دقیق آیانامشا توافق ندارند.",
      "انواع مختلفی مانند این‌ها وجود دارند:",
      "هرکدام نقطه‌ی مرجع یا روش تاریخی متفاوتی دارند. به همین دلیل، دو چارت سایدرئال نیز ممکن است در درجه‌ها و گاهی در نشان‌های نزدیک مرز با هم فرق داشته باشند.",
      "پس عبارت «چارت سایدرئال» به‌تنهایی تمام تنظیمات را مشخص نمی‌کند. باید بدانیم از کدام آیانامشا استفاده شده است.",
    ],
    bullets: ["Lahiri", "Raman", "Krishnamurti", "Fagan–Bradley", "Yukteswar"],
  },
  {
    title: "آیا سایدرئال همان صورت‌های فلکی واقعی است؟",
    paragraphs: [
      "نه کاملاً.",
      "در نجوم مدرن، صورت‌های فلکی مرزهای رسمی و اندازه‌های نامساوی دارند. خورشید مدت یکسانی در همه‌ی آن‌ها نمی‌ماند و مسیر ظاهری آن از محدوده‌ی صورت فلکی مارافسای یا Ophiuchus نیز عبور می‌کند.",
      "اما بیشتر زودیاک‌های سایدرئال آسترولوژیک همچنان از دوازده نشان مساوی سی‌درجه‌ای استفاده می‌کنند.",
      "بنابراین سایدرئال از یک مرجع ستاره‌ای استفاده می‌کند، اما الزاماً همان تقسیم‌بندی رسمی صورت‌های فلکی اتحادیه‌ی بین‌المللی نجوم نیست. IAU آسمان را به ۸۸ صورت فلکی رسمی با مرزهای مشخص تقسیم کرده است.",
    ],
  },
  {
    title: "چرا نشان من در سایدرئال فرق می‌کند؟",
    paragraphs: [
      "فاصله‌ی فعلی بسیاری از زودیاک‌های رایج سایدرئال با تروپیکال چیزی در حدود ۲۳ تا ۲۴ درجه است، هرچند مقدار دقیق به تاریخ و آیانامشا بستگی دارد.",
      "به همین دلیل، بسیاری از جایگاه‌ها در سایدرئال یک نشان عقب‌تر دیده می‌شوند.",
      "برای مثال:",
      "اما اگر جایگاهی در درجه‌های پایانی یک نشان باشد، ممکن است در هر دو سیستم نام نشان یکسان بماند.",
    ],
    bullets: [
      "خورشید تروپیکال در ابتدای ثور ممکن است در سایدرئال حمل باشد.",
      "ماه تروپیکال در میزان ممکن است در سایدرئال سنبله قرار بگیرد.",
      "رایزینگ تروپیکال در دلو ممکن است در سایدرئال جدی شود.",
    ],
  },
  {
    title: "آیا زاویه‌ی سیاره‌ها هم تغییر می‌کند؟",
    paragraphs: [
      "فاصله‌ی واقعی میان سیاره‌ها با تغییر زودیاک عوض نمی‌شود.",
      "اگر دو سیاره در آسمان ۹۰ درجه با هم فاصله داشته باشند، در هر دو سیستم همین فاصله را دارند.",
      "اما نام نشان و درجه‌ی آن‌ها تغییر می‌کند. همچنین اگر روش تفسیر یا قوانین جنبه‌ها میان دو مکتب متفاوت باشد، خوانش نهایی نیز می‌تواند فرق کند.",
      "پس تفاوت چارت‌ها فقط جابه‌جایی نام نشان نیست؛ سیستم تفسیری همراه آن نیز اهمیت دارد.",
    ],
  },
  {
    title: "آیا همه‌ی آسترولوژی سایدرئال ودیک است؟",
    paragraphs: [
      "نه.",
      "آسترولوژی ودیک یا Jyotiṣa معمولاً از زودیاک سایدرئال استفاده می‌کند، اما سایدرئال محدود به ودیک نیست.",
      "مکتب‌هایی از آسترولوژی غربی سایدرئال نیز وجود دارند. یکی از شناخته‌شده‌ترین آن‌ها از آیانامشای Fagan–Bradley استفاده می‌کند.",
      "از سوی دیگر، ودیک فقط یک زودیاک متفاوت نیست. ناکشاتراها، دشاها، چارت‌های تقسیم‌شده، یوگاها و مجموعه‌ای از قواعد سنتی، آن را به یک نظام تفسیری مستقل تبدیل می‌کنند.",
      "بنابراین بهتر است این دو عبارت را یکی ندانیم:",
    ],
    bullets: [
      "سایدرئال: روش تعیین زودیاک",
      "ودیک: یک سنت گسترده‌ی آسترولوژیک که معمولاً سایدرئال است",
    ],
  },
  {
    title: "تروپیکال",
    paragraphs: [],
    bullets: [
      "صفر حمل را به اعتدال بهاری متصل می‌کند.",
      "با چرخه‌ی فصل‌ها تنظیم می‌شود.",
      "در بیشتر آسترولوژی غربی رایج است.",
      "به آیانامشا نیاز ندارد.",
    ],
  },
  {
    title: "سایدرئال",
    paragraphs: [
      "هیچ‌کدام صرفاً «نسخه‌ی به‌روز» دیگری نیستند. مبنای تعریفشان متفاوت است.",
    ],
    bullets: [
      "صفر حمل را با مرجع ستاره‌ای تنظیم می‌کند.",
      "حرکت تقدیمی را در اختلاف زودیاک لحاظ می‌کند.",
      "به انتخاب آیانامشا نیاز دارد.",
      "در Jyotiṣa و بعضی مکاتب غربی استفاده می‌شود.",
    ],
  },
  {
    title: "کدام نشان، نشان واقعی من است؟",
    paragraphs: [
      "این سؤال از یک فرض نادرست شروع می‌شود: اینکه فقط یک روش ممکن برای تعریف نشان وجود دارد.",
      "اگر از تروپیکال استفاده کنی، نشان‌ها نسبت به نقاط فصلی تعریف می‌شوند.",
      "اگر از سایدرئال استفاده کنی، نشان‌ها نسبت به یک مرجع ستاره‌ای تعیین می‌شوند.",
      "هر نتیجه در چارچوب سیستم خودش معنا دارد. بهتر است به‌جای پرسیدن «کدام واقعی است؟» بپرسی:",
    ],
    bullets: [
      "این چارت با چه زودیاکی ساخته شده؟",
      "کدام آیانامشا استفاده شده؟",
      "تفسیر بر اساس کدام سنت نوشته شده؟",
      "آیا محاسبه و تفسیر با هم سازگارند؟",
    ],
  },
  {
    title: "آیا می‌توان چارت تروپیکال و سایدرئال را با هم ترکیب کرد؟",
    paragraphs: [
      "می‌توان آن‌ها را مقایسه کرد، اما ترکیب بی‌قاعده معمولاً نتیجه‌ی روشنی نمی‌دهد.",
      "برای مثال، منطقی نیست جایگاه‌های سایدرئال را بگیریم و بدون توضیح، متن‌های عمومی آسترولوژی مدرن تروپیکال را روی آن‌ها بگذاریم.",
      "هر سیستم تاریخ و قواعد تفسیری خودش را دارد.",
      "روش بهتر این است که:",
    ],
    bullets: [
      "ابتدا یک سیستم را منسجم یاد بگیری.",
      "محاسبه و تفسیر را در همان چارچوب نگه داری.",
      "بعد تفاوت نتیجه‌ی دو سیستم را مطالعه کنی.",
    ],
  },
  {
    title: "آیا سایدرئال دقیق‌تر است؟",
    paragraphs: [
      "کلمه‌ی «دقیق» می‌تواند دو معنی داشته باشد.",
      "از نظر هماهنگی با یک مرجع ستاره‌ای، سایدرئال عمداً برای این کار طراحی شده است.",
      "اما این موضوع به‌تنهایی ادعاهای آسترولوژیک آن را از نظر علمی اثبات نمی‌کند. همان‌طور که محاسبه‌ی دقیق یک چارت تروپیکال نیز به معنای اثبات علمی تفسیر آن نیست.",
      "همچنین به‌دلیل وجود آیانامشاهای مختلف، حتی میان سیستم‌های سایدرئال نیز یک نقطه‌ی شروع یگانه وجود ندارد.",
    ],
  },
  {
    title: "آیا آسترولوژی سایدرئال تاریخچه‌ی قدیمی‌تری دارد؟",
    paragraphs: [
      "زودیاک در دوره‌های باستانی از مشاهده‌ی ستاره‌ها و صورت‌های فلکی جدا نبود. اما دسته‌بندی ساده‌ی «سایدرئال قدیمی و تروپیکال جدید» بیش از حد ساده‌ساز است.",
      "در جهان یونانی، ارتباط نشان‌ها با اعتدال‌ها و انقلاب‌ها پیش از بطلمیوس شناخته شده بود. از سوی دیگر، سنت‌های هندی و بعدتر غربی روش‌های ستاره‌محور خودشان را توسعه دادند.",
      "بهتر است به‌جای یک خط تاریخی ساده، از چند سنت موازی و در حال تغییر حرف بزنیم.",
    ],
  },
  {
    title: "هالیوس باید سایدرئال هم داشته باشد؟",
    paragraphs: [
      "نسخهٔ فعلی هالیوس چارت سایدرئال تولید نمی‌کند. افزودن چنین قابلیتی به انتخاب آیانامشا، محاسبهٔ جداگانه، تفسیرهای سازگار و آزمون‌های فنی مخصوص نیاز دارد.",
      "تا پیش از آماده‌شدن این اجزا، این صفحه فقط مفهوم را آموزش می‌دهد و پیوندی برای ساخت چارت سایدرئال در هالیوس ارائه نمی‌کند.",
    ],
  },
  {
    title: "جمع‌بندی",
    paragraphs: [
      "آسترولوژی سایدرئال زودیاک را با یک مرجع ستاره‌ای تنظیم می‌کند و برای اختلاف میان اعتدال بهاری و نقطه‌ی ستاره‌ای از آیانامشا استفاده می‌کند.",
      "نکات اصلی:",
    ],
    bullets: [
      "سایدرئال با تروپیکال نقطه‌ی شروع متفاوتی دارد.",
      "بیشتر جایگاه‌ها ممکن است یک نشان جابه‌جا شوند.",
      "سایدرئال لزوماً همان مرزهای رسمی صورت‌های فلکی نیست.",
      "چند آیانامشای متفاوت وجود دارد.",
      "همه‌ی آسترولوژی سایدرئال ودیک نیست.",
      "محاسبه و تفسیر باید در یک سیستم سازگار انجام شوند.",
    ],
  },
];

function parseArgs() {
  return {
    apply: process.argv.includes("--apply"),
    compact: process.argv.includes("--compact"),
    selfCheck: process.argv.includes("--self-check"),
  };
}

function jsonArray(value) {
  return Array.isArray(value) ? value : [];
}

function markdownFromArticle(article) {
  const lines = [
    `# ${article.title}`,
    article.intro,
    "## خلاصهٔ مقاله",
    ...jsonArray(article.key_points).map((item) => `- ${item}`),
  ];
  for (const section of SIDEREAL_SECTIONS) {
    lines.push(`## ${section.title}`);
    lines.push(...jsonArray(section.paragraphs));
    lines.push(...jsonArray(section.bullets).map((item) => `- ${item}`));
  }
  return lines.filter(Boolean).join("\n\n");
}

function buildSnapshot(row, sections, bodyMarkdown, contentVersion) {
  return {
    stableId: String(row.stable_id),
    slug: String(row.slug),
    title: String(row.title),
    shortTitle: String(row.short_title),
    seoTitle: row.seo_title ?? undefined,
    metaDescription: row.meta_description ?? undefined,
    categoryId: String(row.category_id),
    tags: jsonArray(row.tags),
    summary: String(row.summary ?? ""),
    intro: String(row.intro ?? ""),
    readingMinutes: Number(row.reading_minutes ?? 0),
    keyPoints: jsonArray(row.key_points),
    sections,
    contextLinks: jsonArray(row.context_links),
    sources: jsonArray(row.sources),
    callToAction: row.call_to_action ?? null,
    relatedArticleIds: jsonArray(row.related_article_ids),
    publicationPriority: Number(row.publication_priority ?? 999),
    contentCluster: String(row.content_cluster ?? row.category_id ?? ""),
    articleRole: String(row.article_role ?? ""),
    contentVersion,
    indexable: row.is_indexable === true,
    bodyMarkdown,
  };
}

function isDamaged(row) {
  const sections = jsonArray(row.sections);
  const paragraphCount = sections.reduce(
    (count, section) => count + jsonArray(section?.paragraphs).length,
    0,
  );
  return sections.length < 8 || paragraphCount < 20 || String(row.body_markdown ?? "").length < 5000;
}

function assertSelfCheck() {
  const source = readFileSync(new URL(import.meta.url), "utf8");
  for (const marker of [
    "Repair damaged public Wiki article body from canonical content",
    "what-is-sidereal-astrology",
    "SIDEREAL_SECTIONS",
    "jsonb_array_length",
    "body_markdown",
    "wiki_article_revisions",
  ]) {
    if (!source.includes(marker)) throw new Error(`self-check marker missing: ${marker}`);
  }
  if (SIDEREAL_SECTIONS.length < 12) throw new Error("self-check failed: sidereal sections are incomplete.");
  console.log("Wiki damaged public content repair self-check OK");
}

async function main() {
  const options = parseArgs();
  if (options.selfCheck) {
    assertSelfCheck();
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    const result = await sql.begin(async (tx) => {
      const rows = await tx`
        select *
        from public.wiki_articles
        where stable_id = ${SIDEREAL_STABLE_ID}
          and status = 'published'
          and deleted_at is null
        for update
      `;
      const row = rows[0];
      if (!row) {
        return { ok: true, changed: false, reason: "article-not-found" };
      }
      await tx`
        select jsonb_array_length(coalesce(${tx.json(jsonArray(row.sections))}::jsonb, '[]'::jsonb))
      `;
      if (!isDamaged(row)) {
        return {
          ok: true,
          changed: false,
          reason: "article-healthy",
          sectionCount: jsonArray(row.sections).length,
        };
      }
      const nextVersion = Number(row.content_version ?? 1) + 1;
      const bodyMarkdown = markdownFromArticle(row);
      const snapshot = buildSnapshot(row, SIDEREAL_SECTIONS, bodyMarkdown, nextVersion);
      if (options.apply) {
        await tx`
          update public.wiki_articles
          set sections = ${tx.json(SIDEREAL_SECTIONS)},
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
            ${CHANGE_NOTE},
            null,
            'published',
            now()
          )
        `;
      }
      return {
        ok: true,
        changed: options.apply,
        reason: "restored-canonical-sections",
        stableId: SIDEREAL_STABLE_ID,
        sectionCount: SIDEREAL_SECTIONS.length,
        paragraphCount: SIDEREAL_SECTIONS.reduce((count, section) => count + jsonArray(section.paragraphs).length, 0),
      };
    });
    console.log(options.compact ? JSON.stringify(result) : JSON.stringify(result, null, 2));
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
