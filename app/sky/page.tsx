import type { Metadata } from "next";
import { buildPublicPageMetadata, siteConfig } from "@/lib/config/seo";
import { FinalEditorialPage } from "@/components/FinalEditorialPage";
import { SkyPublicExperience } from "@/components/SkyPublicExperience";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import { selectPublicWikiArticlesByPreferredSlugs } from "@/lib/wiki/wiki-public-discovery";
import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";

export const dynamic = "force-dynamic";
const SKY_TITLE = "آسترولوژی امروز | وضعیت ماه، سیارات و ترنزیت‌ها";
const SKY_DESCRIPTION = "آسمان امروز و آسترولوژی امروز را با دادهٔ واقعی ببین: فاز ماه، وضعیت سیارات، چارت آسمان، سیارات برگشتی و زمان ترنزیت‌ها برای شهر انتخاب‌شده.";

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
  const [result, catalog] = await Promise.all([deliverSkyPublicSnapshot({ city, date: first(query.date) }), getPublicWikiCatalog()]);
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
          text: "خیر. این صفحه جایگاه واقعی سیارات، فاز ماه و زاویه‌های روز را نشان می‌دهد و اتفاق شخصی را پیش‌بینی نمی‌کند.",
        },
      },
      {
        "@type": "Question",
        name: "وضعیت سیارات امروز برای کدام شهر نمایش داده می‌شود؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ساعت رویدادها براساس شهر و منطقهٔ زمانی انتخاب‌شده نمایش داده می‌شود.",
        },
      },
      {
        "@type": "Question",
        name: "فاز ماه امروز چگونه محاسبه می‌شود؟",
        acceptedAnswer: {
          "@type": "Answer",
          text: "فاز و درصد روشنایی ماه از دادهٔ محاسبه‌شدهٔ همان تاریخ به دست می‌آید و از روز دیگری جایگزین نمی‌شود.",
        },
      },
    ],
  };

  return <>
    <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(webPageJsonLd) }} type="application/ld+json" />
    <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} type="application/ld+json" />
    <FinalEditorialPage
      pageKey="sky"
      includeSections={["sky-hero", "sky-controls"]}
      slotOnlySections={["sky-controls"]}
      slots={{ "sky-controls": <SkyPublicExperience result={result} cityQuery={city} relatedArticles={relatedArticles} embedded /> }}
    />
  </>;
}
