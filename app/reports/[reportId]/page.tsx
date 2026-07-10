import type { Metadata } from "next";
import { ReportDetail } from "@/components/ReportDetail";
import { getPublicServerStoredReport } from "@/lib/storage/server-report-persistence";
import type { AstrologyReport } from "@/types/astro";

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
  if (rawSource === "account") {
    return "account";
  }

  if (rawSource === "beta-db") {
    return "beta-db";
  }

  if (rawSource === "local") {
    return "local";
  }

  return "public";
}

async function readInitialPublicReport({
  reportId,
  reportSource,
}: {
  reportId: string;
  reportSource: ReportDetailSource;
}): Promise<AstrologyReport | null> {
  if (reportSource !== "public") {
    return null;
  }

  try {
    const reportRecord = await getPublicServerStoredReport({ reportId });

    return reportRecord?.report ?? null;
  } catch {
    return null;
  }
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
  const initialPublicReport = await readInitialPublicReport({
    reportId,
    reportSource,
  });

  return (
    <ReportDetail
      reportId={reportId}
      reportSource={reportSource}
      initialReport={initialPublicReport}
      initialMessage={
        initialPublicReport ? "گزارش آماده است." : ""
      }
    />
  );
}
