import type { Metadata } from "next";
import { SkyPublicExperience } from "@/components/SkyPublicExperience";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "آرشیو آسمان | هالیوس", robots: { index: false, follow: true } };

export default async function SkyArchiveDayPage({ params, searchParams }: { params: Promise<{ date: string }>; searchParams: Promise<{ city?: string | string[] }> }) {
  const { date } = await params; const query = await searchParams; const city = Array.isArray(query.city) ? query.city[0] : query.city;
  const result = await deliverSkyPublicSnapshot({ city, date });
  return <SkyPublicExperience result={result} cityQuery={city}/>;
}
