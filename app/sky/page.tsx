import type { Metadata } from "next";
import { buildPublicPageMetadata, siteConfig } from "@/lib/config/seo";
import { FinalEditorialPage } from "@/components/FinalEditorialPage";
import { SkyHeroLive, SkyPublicExperience } from "@/components/SkyPublicExperience";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import { selectPublicWikiArticlesByPreferredSlugs } from "@/lib/wiki/wiki-public-discovery";
import { getPublicWikiIndex } from "@/lib/wiki/wiki-repository";
import styles from "./sky.module.css";

export const dynamic = "force-dynamic";
const SKY_TITLE = "آسترولوژی امروز | وضعیت ماه، سیارات و ترنزیت‌ها";
const SKY_DESCRIPTION = "آسترولوژی امروز و آسمان امروز را با داده‌های محاسبه‌شده ببین؛ جایگاه ماه و سیارات، فاز ماه، حرکت‌های برگشتی، زاویه‌ها و ساعت رویدادهای روز.";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    title: SKY_TITLE,
    description: SKY_DESCRIPTION,
    canonical: "/sky",
  }),
  alternates: { canonical: "/sky" },
};

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export default async function SkyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const city = first(query.city);
  const [result, catalog] = await Promise.all([deliverSkyPublicSnapshot({ city, date: first(query.date) }), getPublicWikiIndex()]);
  const relatedArticles = selectPublicWikiArticlesByPreferredSlugs(catalog.articles, ["what-is-moon-sign", "astrology-transits-explained", "retrograde-planets-explained", "mordad-1405-transit-guide"]).map((article) => ({ slug: article.slug, title: article.shortTitle }));
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: SKY_TITLE,
    description: SKY_DESCRIPTION,
    inLanguage: "fa-IR",
    url: `${siteConfig.url}/sky`,
    about: ["آسترولوژی امروز", "فاز ماه امروز", "وضعیت سیارات امروز", "ترنزیت‌های امروز"],
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.url,
    },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "fa-IR",
    mainEntity: [
      {
        "@type": "Question",
        name: "آیا آسترولوژی امروز همان فال روزانه است؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "نه. داده‌های جایگاه سیارات، فاز ماه و زاویه‌های روز از محاسبه می‌آیند. فال روزانه معمولاً متنی تفسیری برای یک نشان است. این صفحه علاوه بر توضیح‌های نمادین، خودِ داده‌ها و خط زمانی را هم نشان می‌دهد؛ بنابراین می‌توانی میان محاسبه و برداشت فرق بگذاری.",
        },
      },
      {
        "@type": "Question",
        name: "وضعیت سیارات امروز برای کدام شهر نمایش داده می‌شود؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ساعت‌ها بر اساس منطقهٔ زمانی شهری که داده برای آن به دست آمده نمایش داده می‌شوند. در نمای فعلی، تهران پیش‌فرض است و انتخاب‌گر عمومیِ تغییر شهر و تاریخ دیده نمی‌شود. برای یک تاریخ واحد، ساعت محلی همان رویداد در شهرهای مختلف می‌تواند فرق کند.",
        },
      },
      {
        "@type": "Question",
        name: "فاز ماه امروز چگونه محاسبه می‌شود؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "نام فاز و درصد روشنایی از دادهٔ محاسبه‌شدهٔ همان روز به دست می‌آیند. فاز ماه با نشان ماه یکی نیست: فاز از هندسهٔ روشنایی صحبت می‌کند و نشان از محل ماه در زودیاک.",
        },
      },
    ],
  };

  return <>
    <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(webPageJsonLd) }} type="application/ld+json" />
    <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} type="application/ld+json" />
    <div className={styles.skyPage}>
      <FinalEditorialPage
        pageKey="sky"
        includeSections={["sky-hero"]}
        slots={{
          "sky-hero": <SkyHeroLive result={result} />,
        }}
      />
      <SkyPublicExperience result={result} cityQuery={city} relatedArticles={relatedArticles} embedded showControls={false} />
    </div>
  </>;
}
