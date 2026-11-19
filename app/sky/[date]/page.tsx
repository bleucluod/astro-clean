import type { Metadata } from "next";
import { buildSocialPreviewMetadata } from "@/lib/config/seo";
import { SkyPublicExperience } from "@/components/SkyPublicExperience";
import { deliverSkyPublicSnapshot } from "@/lib/sky-public/sky-public-delivery";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '';
  const title = safeDate ? 'آسمان ' + safeDate + ' | هالیوس' : 'آرشیو آسمان | هالیوس';
  const description = 'وضعیت آسمان، ماه و سیاره‌ها در تاریخ انتخابی.';
  return {
    title,
    description,
    robots: { index: false, follow: true },
    ...buildSocialPreviewMetadata({
      title,
      description,
      canonical: '/sky/' + (safeDate || 'archive'),
      section: 'آرشیو آسمان',
    }),
  };
}

export default async function SkyArchiveDayPage({ params, searchParams }: { params: Promise<{ date: string }>; searchParams: Promise<{ city?: string | string[] }> }) {
  const { date } = await params; const query = await searchParams; const city = Array.isArray(query.city) ? query.city[0] : query.city;
  const result = await deliverSkyPublicSnapshot({ city, date });
  return <SkyPublicExperience result={result} cityQuery={city}/>;
}
