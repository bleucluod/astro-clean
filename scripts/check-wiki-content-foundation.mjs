import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "app/wiki/page.tsx",
  "app/wiki/[slug]/page.tsx",
  "app/wiki/wiki.module.css",
  "lib/wiki/wiki-content.ts",
  "lib/config/navigation.ts",
  "docs/HALLEUS_IDEA_GARDEN.md",
  "docs/HALLEUS_PROJECT_CONTEXT.md",
];

const failures = [];

for (const filePath of requiredFiles) {
  if (!existsSync(filePath)) {
    failures.push(`Missing required Wiki file: ${filePath}`);
  }
}

if (failures.length === 0) {
  const indexPage = readFileSync("app/wiki/page.tsx", "utf8");
  const articlePage = readFileSync("app/wiki/[slug]/page.tsx", "utf8");
  const styles = readFileSync("app/wiki/wiki.module.css", "utf8");
  const content = readFileSync("lib/wiki/wiki-content.ts", "utf8");
  const navigation = readFileSync("lib/config/navigation.ts", "utf8");
  const seoConfig = readFileSync("lib/config/seo.ts", "utf8");
  const ideaGarden = readFileSync("docs/HALLEUS_IDEA_GARDEN.md", "utf8");
  const projectContext = readFileSync("docs/HALLEUS_PROJECT_CONTEXT.md", "utf8");

  const assertIncludes = (label, text, markers) => {
    for (const marker of markers) {
      if (!text.includes(marker)) {
        failures.push(`${label} missing marker: ${marker}`);
      }
    }
  };

  const assertExcludes = (label, text, markers) => {
    for (const marker of markers) {
      if (text.includes(marker)) {
        failures.push(`${label} still contains forbidden marker: ${marker}`);
      }
    }
  };

  assertIncludes("Wiki index", indexPage, [
    "Halleus Wiki",
    "wikiArticles",
    "wikiCategories",
    "از اینجا شروع کن",
    "نقشهٔ ویکی",
    "دقت ساعت و شهر تولد",
    "ساخت گزارش شخصی",
    "index: false",
    "follow: true",
  ]);

  assertExcludes("Wiki index", indexPage, [
    "Local preview",
    "Repository-backed storage",
    "Preview account",
    "Feature gate",
    "واژه‌نامه کوتاه",
  ]);

  assertIncludes("Wiki article template", articlePage, [
    "generateStaticParams",
    "generateMetadata",
    "dynamicParams = false",
    "notFound()",
    "getRelatedWikiArticles",
    "article.seoTitle",
    "article.metaDescription",
    '"@type": "Article"',
    '"@type": "BreadcrumbList"',
    'type="application/ld+json"',
    "article.contextLinks",
    "article.sources",
    "article.callToAction",
    "index: false",
    "follow: true",
  ]);

  assertExcludes("Wiki article template", articlePage, [
    '"@type": "FAQPage"',
  ]);

  const expectedSlugs = [
    "birth-chart-basics",
    "sun-moon-rising",
    "astrology-houses",
    "major-aspects",
    "why-birth-time-matters",
    "why-birth-city-matters",
    "birth-chart-without-birth-time",
    "how-to-read-birth-chart",
    "what-is-birth-chart-interpretation",
  ];

  for (const slug of expectedSlugs) {
    if (!content.includes(`slug: "${slug}"`)) {
      failures.push(`Wiki content missing required slug: ${slug}`);
    }
  }

  const declaredSlugs = [...content.matchAll(/slug: "([a-z0-9-]+)"/g)].map(
    (match) => match[1],
  );
  const uniqueSlugs = new Set(declaredSlugs);

  if (declaredSlugs.length !== 9) {
    failures.push(`Expected exactly 9 Wiki articles, found ${declaredSlugs.length}`);
  }

  if (uniqueSlugs.size !== declaredSlugs.length) {
    failures.push("Wiki article slugs are not unique");
  }

  assertIncludes("Wiki content model", content, [
    '"accuracy"',
    "دقت ساعت و شهر تولد",
    "WikiArticleLink",
    "WikiArticleCallToAction",
    "seoTitle?: string",
    "metaDescription?: string",
    "contextLinks?",
    "sources?",
    "callToAction?",
    "چرا ساعت تولد در چارت تولد مهم است؟",
    "چرا شهر تولد در چارت تولد مهم است؟",
    "اگر ساعت تولدم را ندانم، چارت تولد چه می‌شود؟",
    "فرم فعلی هالیوس برای ساخت گزارش به ساعت مشخص نیاز دارد",
    "رایزینگ قطعی نسازد",
    "شهر فعلی با شهر تولد یکی نیست",
    "Placidus",
    "Whole Sign",
    "orb",
    "پیش‌بینی قطعی",
    "چطور چارت تولد خودم را بخوانم؟",
    "سیاره: چه نیرویی در کار است؟",
    "یک ترتیب پیشنهادی برای خواندن چارت",
    "چارت تولد ابزار تشخیص پزشکی یا روان‌شناختی",
    "تفسیر چارت تولد چیست؟",
    "محاسبه می‌گوید در چارت چه چیزی وجود دارد",
    "یک تفسیر خوب چه ویژگی‌هایی دارد؟",
    "تفسیر زرد چه نشانه‌هایی دارد؟",
    "هالیوس نباید برای کاربر سرنوشت قطعی بنویسد",
  ]);

  assertExcludes("Unknown-time product claims", content, [
    "هالیوس چارت بدون ساعت می‌سازد",
    "هالیوس بازهٔ تولد را محاسبه می‌کند",
    "ساعت ۱۲ ظهر را به‌عنوان ساعت واقعی وارد کن",
  ]);

  assertIncludes("Wiki styles", styles, [
    ".hero",
    ".articleGrid",
    ".categoryGrid",
    ".articleLayout",
    ".stickyAside",
    ".sideLinks",
    ".bodyList",
    "@media (max-width: 720px)",
  ]);

  assertIncludes("Public navigation", navigation, [
    'href: "/wiki"',
    'label: "ویکی"',
  ]);

  if (seoConfig.includes('path: "/wiki"')) {
    failures.push("Wiki was added to seoRoutes before indexing approval");
  }

  assertIncludes("Idea Garden", ideaGarden, [
    "v0.1.290 wiki accuracy content batch",
    "v0.1.292 wiki birth-chart interpretation guide",
    "why-birth-time-matters",
    "why-birth-city-matters",
    "birth-chart-without-birth-time",
    "noindex/follow",
  ]);

  assertIncludes("Project Context", projectContext, [
    "v0.1.290 wiki accuracy content batch",
    "seven Persian Wiki articles",
    "render `Article` and `BreadcrumbList` structured data",
    "No sitemap or indexing activation",
    "v0.1.291 wiki birth-chart reading guide",
    "eight Persian Wiki articles",
    "v0.1.292 wiki birth-chart interpretation guide",
    "nine Persian Wiki articles",
  ]);
}

if (failures.length > 0) {
  console.error("Wiki content foundation check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Wiki content foundation check passed.");
console.log("- nine Persian articles are present, including the new birth-chart interpretation guide");
console.log("- Article and BreadcrumbList structured data are rendered without FAQPage overclaiming");
console.log("- unknown birth time is explained without claiming unsupported Halleus form behavior");
console.log("- Wiki remains noindex/follow and outside sitemap");
