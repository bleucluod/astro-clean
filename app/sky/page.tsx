import type { Metadata } from "next";
import { SkyPublicExperience } from "@/components/SkyPublicExperience";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آسمان امروز | هالیوس", description: "وضعیت عمومی و واقعی آسمان امروز بر پایهٔ دادهٔ محاسبه‌شدهٔ هالیوس.", alternates: { canonical: "/sky" } };

export default async function SkyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams; const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const city = first(query.city); const result = await deliverSkyPublicSnapshot({ city, date: first(query.date) });
  return <SkyPublicExperience result={result} cityQuery={city}/>;
}
