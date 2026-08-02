import type { Metadata } from "next";
import { ReportDetail } from "@/components/ReportDetail";

type ReportDetailSource = "local" | "beta-db" | "account" | "public";

type ReportDetailPageProps = {
  params: Promise<{
    reportId: string;
  }>;
  searchParams?: Promise<{
    source?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جزئیات گزارش | Halleus",
  description:
    "نمایش جزئیات یک گزارش ذخیره‌شده چارت تولد در Halleus.",
  robots: {
    index: false,
    follow: false,
  },
};

function resolveReportSource(rawSource: string | undefined): ReportDetailSource {
  if (rawSource === "public") {
    return "public";
  }

  if (rawSource === "account") {
    return "account";
  }

  if (rawSource === "beta-db") {
    return "beta-db";
  }

  if (rawSource === "local") {
    return "local";
  }

  return "local";
}

export default async function ReportDetailPage({
  params,
  searchParams,
}: ReportDetailPageProps) {
  const { reportId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawSource = Array.isArray(resolvedSearchParams.source)
    ? resolvedSearchParams.source[0]
    : resolvedSearchParams.source;
  const reportSource = resolveReportSource(rawSource);
  return (
    <ReportDetail
      reportId={reportId}
      reportSource={reportSource}
      initialReport={null}
      initialMessage=""
    />
  );
}
