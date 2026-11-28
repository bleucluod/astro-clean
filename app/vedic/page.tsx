import { buildPublicPageMetadata } from "@/lib/config/seo";
import { isVedicD1StorageReady, isVedicD1CheckoutReady } from "@/lib/vedic/vedic-d1-payment-config";
import { VedicD1Screen } from "@/components/vedic/VedicD1Screen";
import { VedicD1GuestSessionProvider } from "@/components/vedic/VedicD1GuestSession";
import { WikiArticleBody, WikiIntroText, WikiKeyPoints } from "@/components/wiki/WikiArticleRender";
import { VEDIC_GUIDE_SLUG, VEDIC_PRODUCT_PATH } from "@/lib/wiki/wiki-canonical-redirects";
import { getPublicWikiArticleResolution } from "@/lib/wiki/wiki-repository";
import chartStyles from "@/app/chart/chart-shell.module.css";
import wikiStyles from "@/app/wiki/wiki.module.css";

export const dynamic = "force-dynamic";

export const metadata = buildPublicPageMetadata({
  title: "چارت تولد رایگان ودیک | محاسبه آنلاین به فارسی | هالیوس",
  description: "با تاریخ شمسی یا میلادی، ساعت و شهر تولدت چارت ودیک بساز. نقشهٔ راشی D1، نشان ماه و جایگاه سیاره‌ها را به فارسی ببین و در صورت تمایل تفسیر کامل را بخوان.",
  canonical: VEDIC_PRODUCT_PATH,
});

async function loadGuide() {
  try {
    const resolution = await getPublicWikiArticleResolution(VEDIC_GUIDE_SLUG);
    return resolution.kind === "article" ? resolution : null;
  } catch {
    // The public calculator stays available if the editorial store is temporarily unavailable.
    return null;
  }
}

export default async function VedicPage() {
  const guide = await loadGuide();
  const article = guide?.article;
  return (
    <VedicD1GuestSessionProvider>
      <VedicD1Screen
        storageEnabled={isVedicD1StorageReady()}
        checkoutEnabled={isVedicD1CheckoutReady()}
        guide={guide && article ? (
          <article className={chartStyles.heroEditorial} data-vedic-migrated-guide="true" aria-labelledby="vedic-guide-title">
            <h2 id="vedic-guide-title">{article.title}</h2>
            <WikiIntroText text={article.intro} targets={guide.internalLinkTargets} linksEnabled={false} />
            {article.image ? (
              <figure className={wikiStyles.articleCover}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt={article.image.alt} src={article.image.url} srcSet={article.image.srcSet}
                  width={article.image.width} height={article.image.height} loading="lazy" />
                {article.image.caption ? <figcaption>{article.image.caption}</figcaption> : null}
              </figure>
            ) : null}
            <WikiKeyPoints keyPoints={article.keyPoints} targets={guide.internalLinkTargets} linksEnabled={false} />
            <WikiArticleBody sections={article.sections} contextLinks={[]}
              sources={article.sources ?? []} targets={guide.internalLinkTargets} linksEnabled={false} />
          </article>
        ) : null}
      />
    </VedicD1GuestSessionProvider>
  );
}
