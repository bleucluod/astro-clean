import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";
import { getSkyObservatoryPeriod, type SkyObservatoryPeriod } from "@/lib/sky-public/sky-observatory-period";
import { SkyObservatoryPreview } from "@/components/sky/SkyObservatoryPreview";

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
  return <SkyObservatoryPreview
    city={result.city.faName}
    cityId={result.city.id}
    timezone={result.city.timezone}
    today={result.snapshot}
    period={period}
    view={view}
    referenceTime={result.viewedAt}
  />;
}
