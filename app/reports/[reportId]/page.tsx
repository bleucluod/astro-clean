import type { Metadata } from "next";
import { ReportDetail } from "@/components/ReportDetail";

type ReportDetailPageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export const metadata: Metadata = {
  title: "جزئیات گزارش | Halleus",
  description:
    "نمایش جزئیات یک گزارش ذخیره‌شده چارت تولد در Halleus.",
};

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { reportId } = await params;

  return <ReportDetail reportId={reportId} />;
}
