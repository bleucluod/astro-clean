import type { Metadata } from "next";
import { ReportDetail } from "@/components/ReportDetail";
import { ReportOrderCta } from "@/components/ReportOrderCta";

type ReportDetailPageProps = {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<{
    source?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: "جزئیات گزارش | Halleus",
  description:
    "نمایش جزئیات یک گزارش ذخیره‌شده چارت تولد در Halleus.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ReportDetailPage({
  params,
  searchParams,
}: ReportDetailPageProps) {
  const { reportId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawSource = Array.isArray(resolvedSearchParams.source)
    ? resolvedSearchParams.source[0]
    : resolvedSearchParams.source;
  const reportSource =
    rawSource === "account"
      ? "account"
      : rawSource === "beta-db"
        ? "beta-db"
        : rawSource === "local"
          ? "local"
          : "public";

  return (
    <>
      <ReportDetail reportId={reportId} reportSource={reportSource} />
      <ReportOrderCta reportId={reportId} />
    </>
  );
}
