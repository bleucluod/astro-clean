import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { FinalEditorialPage } from "@/components/FinalEditorialPage";
import { HomepageLiveSky } from "@/components/HomepageLiveSky";
import { HomepageProductProof } from "@/components/HomepageProductProof";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import { sortPublicWikiArticlesNewestFirst } from "@/lib/wiki/wiki-public-discovery";
import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";

import styles from "./home.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "هالیوس | آسترولوژی فارسی، چارت تولد و تحلیل رابطه",
  description: "در هالیوس چارت تولد فارسی بساز، دو چارت را برای تحلیل خصوصی رابطه کنار هم بگذار، وضعیت واقعی آسمان امروز را ببین و آسترولوژی را مرحله‌به‌مرحله یاد بگیر.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

const zodiacSymbols = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

function BirthChartVisual() {
  return <div className={styles.heroVisual} aria-label="نمای نمادین چرخ چارت تولد">
    <div className={styles.chartWheel} aria-hidden="true">
      <div className={styles.outerOrbit} /><div className={styles.middleOrbit} /><div className={styles.innerOrbit} />
      {zodiacSymbols.map((symbol, index) => {
        const angle = index * 30;
        const style = { transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-142px) rotate(${-angle}deg)` } as CSSProperties;
        return <span className={styles.zodiacSymbol} key={symbol} style={style}>{symbol}</span>;
      })}
      <span className={`${styles.aspectLine} ${styles.aspectLineOne}`} />
      <span className={`${styles.aspectLine} ${styles.aspectLineTwo}`} />
      <span className={`${styles.aspectLine} ${styles.aspectLineThree}`} />
      <span className={`${styles.aspectLine} ${styles.aspectLineFour}`} />
      <div className={styles.chartCore}><span>هالیوس</span><small>خوانش فارسی چارت</small></div>
    </div>
  </div>;
}

export default async function Home() {
  const [catalogResult, skyResult] = await Promise.allSettled([getPublicWikiCatalog(), deliverSkyPublicSnapshot({})]);
  const catalog = catalogResult.status === "fulfilled" ? catalogResult.value : { articles: [], categories: [] };
  const articles = sortPublicWikiArticlesNewestFirst(catalog.articles);
  const sky = skyResult.status === "fulfilled" ? skyResult.value : null;

  const wikiCards = <div className={styles.wikiGrid}>
    {articles.slice(0, 4).map((article) => <article className={styles.wikiCard} key={article.slug}>
      <h3><Link href={`/wiki/${article.slug}`}>{article.shortTitle}</Link></h3><p>{article.summary}</p>
    </article>)}
  </div>;

  return <div className={styles.page} data-home-theme="halleus-soft-app" data-product-surface="Halleus Home">
    <FinalEditorialPage
      pageKey="home"
      slots={{
        "home-hero": <BirthChartVisual />,
        "live-sky-today": <HomepageLiveSky result={sky} />,
        "report-showcase": <HomepageProductProof />,
        "wiki-learning-paths": wikiCards,
      }}
    />
  </div>;
}
