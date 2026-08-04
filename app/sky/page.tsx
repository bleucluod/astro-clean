import type { Metadata } from "next";
import { SkyPublicExperience } from "@/components/SkyPublicExperience";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آسترولوژی امروز | وضعیت ماه، سیارات و ترنزیت‌ها", description: "وضعیت واقعی آسمان امروز را ببین: جایگاه و حرکت سیاره‌ها، نشان و فاز ماه، درصد روشنایی، جنبه‌های مهم و خط زمانی رویدادها برای شهر انتخاب‌شده.", alternates: { canonical: "/sky" }, robots: { index: true, follow: true } };

export default async function SkyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams; const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const city = first(query.city);
  const [result, catalog] = await Promise.all([deliverSkyPublicSnapshot({ city, date: first(query.date) }), getPublicWikiCatalog()]);
  const preferredSlugs = new Set(["what-is-moon-sign", "retrograde-planets-explained", "mordad-1405-transit-guide"]);
  const relatedArticles = catalog.articles.filter((article) => preferredSlugs.has(article.slug)).map((article) => ({ slug: article.slug, title: article.shortTitle }));
  return <SkyPublicExperience result={result} cityQuery={city} relatedArticles={relatedArticles}/>;
}
