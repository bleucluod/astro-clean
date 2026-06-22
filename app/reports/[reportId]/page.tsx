import type { Metadata } from "next";
import { ReportDetail } from "@/components/ReportDetail";

type ReportDetailPageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export const metadata: Metadata = {
  title: "جزئیات گزارش | Astro Clean",
  description:
    "نمایش جزئیات یک گزارش ذخیره‌شده چارت تولد در Astro Clean.",
};

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { reportId } = await params;

  return <ReportDetail reportId={reportId} />;
}
