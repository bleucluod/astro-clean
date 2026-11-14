import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import { getSkyObservatoryPeriod, type SkyObservatoryPeriod } from "@/lib/sky-public/sky-observatory-period";
import { SkyObservatoryPreview } from "@/components/sky/SkyObservatoryPreview";
import { wikiShopProductCatalog } from "@/lib/wiki/wiki-shop-showcase";
import { SHOWCASE_SURFACE_SLOTS, type SurfaceOffer } from "@/lib/shop/shop-showcase-contract";

// Visual samples for the development-only review route; never persisted or published.
const SKY_PREVIEW_COPY = [
  { title: "ماه آن روز؛ یادگاری از یک تاریخ", description: "چهرهٔ ماه را برای تاریخ دلخواهت روی یک تابلوی شخصی نگه دار.", buttonLabel: "دیدن تابلوی ماه" },
  { title: "آسمان لحظهٔ تولد روی دیوار تو", description: "نقشهٔ آسمان روز تولد را در قالب یک اثر شخصی ببین.", buttonLabel: "دیدن تابلوی آسمان تولد" },
  { title: "یک تاریخ عزیز، یک تصویر ماندگار", description: "برای لحظه‌ای که می‌خواهی به یاد بماند، یک تابلوی ماه شخصی بساز.", buttonLabel: "آشنایی با تابلو" },
] as const;

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پیش‌نمایش رصدخانهٔ هالیوس",
  robots: { index: false, follow: false },
};

export default async function SkyObservatoryPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[]; city?: string | string[] }>;
}) {
  // Localhost-only review. Never expose expensive multi-day calculations publicly.
  if (process.env.NODE_ENV !== "development") notFound();

  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;
  const selected = first(params.view);
  const view: "today" | SkyObservatoryPeriod =
    selected === "week" || selected === "month" ? selected : "today";
  const result = await deliverSkyPublicSnapshot({ city: first(params.city) });
  if (result.status !== "ready") {
    return <div dir="rtl"><p>{result.message}</p>
      <a href="/sky/preview">بازگشت به آسمان تهران</a></div>;
  }
  const period = view === "today" ? null :
    await getSkyObservatoryPeriod(result.city.id, result.currentLocalDate, view);
  // Use catalogue imagery for a local-only fallback when the admin/API has no active offer.
  const catalogue = wikiShopProductCatalog().filter(product => product.orderable && product.image);
  const previewOffers: Record<string, SurfaceOffer> = {};
  for (const [index, placement] of SHOWCASE_SURFACE_SLOTS.sky.entries()) {
    const product = catalogue[index % catalogue.length];
    const copy = SKY_PREVIEW_COPY[index];
    if (!product?.image || !copy) continue;
    previewOffers[placement.id] = {
      id: "sky-preview-" + placement.id,
      surface: "sky", slot: placement.id, productId: product.id,
      title: copy.title, description: copy.description, buttonLabel: copy.buttonLabel,
      url: product.url, image: product.image, imageAlt: product.name,
    };
  }
  return <SkyObservatoryPreview
    previewOffers={previewOffers}
    city={result.city.faName}
    cityId={result.city.id}
    timezone={result.city.timezone}
    today={result.snapshot}
    period={period}
    view={view}
    referenceTime={result.viewedAt}
  />;
}
