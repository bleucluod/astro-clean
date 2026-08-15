import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportDetail } from "@/components/ReportDetail";
import { getSharedReport } from "@/lib/reports/report-access-service";
import { getReportAccessPolicy } from "@/lib/monetization/product-entitlement-service";
import type { AstrologyReport } from "@/types/astro";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "گزارش اشتراکی | هالیوس", robots: { index: false, follow: false } };

export default async function SharedReportPage({ params }: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = await params;
  if (!/^[A-Za-z0-9_-]{40,100}$/u.test(shareToken)) notFound();
  const report = await getSharedReport(shareToken) as AstrologyReport | null;
  if (!report) notFound();
  // HALLEUS_SERVER_SEEDED_SHARED_REPORT_ACCESS_BATCH1_R1
  const initialAccessPolicy = await getReportAccessPolicy();
  return <ReportDetail initialAccessPolicy={initialAccessPolicy} reportId={report.id} reportSource="public" initialReport={report} initialMessage="گزارش از طریق پیوند امن باز شده است." />;
}
