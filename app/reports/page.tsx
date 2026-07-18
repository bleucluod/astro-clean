import type { Metadata } from "next";
import Link from "next/link";
import { AccountReportTitleList } from "@/components/AccountReportTitleList";
import { ReportsList } from "@/components/ReportsList";

export const metadata: Metadata = {
  title: "گزارش‌های من | Halleus",
  description:
    "بازگشت آرام به گزارش‌های تولد ذخیره‌شده در هالیوس؛ گزارش‌هایی که در این دستگاه یا حساب تو پیدا می‌شوند.",
  alternates: {
    canonical: "/reports",
  },
  robots: {
    index: false,
    follow: false,
  },
};

type ReportsPageProps = {
  searchParams?: Promise<{
    source?: string | string[];
  }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawSource = Array.isArray(resolvedSearchParams.source)
    ? resolvedSearchParams.source[0]
    : resolvedSearchParams.source;
  const reportSource = rawSource === "local" ? "local" : "account";
  const isAccountSource = reportSource === "account";

  return (
    <section className="grid reports-sales-shell reports-return-shell">
      <div className="card reports-sales-cta reports-return-hero">
        <div>
          <span className="badge">گزارش‌های من</span>
          <h1>{isAccountSource ? "گزارش‌های حساب" : "کتابخانه گزارش‌ها"}</h1>
          <p>
            {isAccountSource
              ? "گزارش‌هایی که به حساب تو وصل هستند، اینجا دیده می‌شوند. برای خواندن یا ساخت گزارش تازه، مسیر ساده و آرام نگه داشته شده است."
              : "گزارش‌هایی که در این دستگاه پیدا می‌شوند، اینجا کنار هم می‌آیند تا دوباره به خوانش‌های قبلی برگردی."}
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/dashboard">
            پنل من
          </Link>

          <Link className="button secondary" href="/profile">
            حساب و پروفایل
          </Link>

          {isAccountSource ? (
            <Link className="button secondary" href="/reports?source=local">
              گزارش‌های این دستگاه
            </Link>
          ) : null}
        </div>
      </div>

      {isAccountSource ? (
        <AccountReportTitleList />
      ) : (
        <ReportsList reportSource="local" />
      )}
      <span className="reports-page-copy-detox-marker" aria-hidden="true" hidden />
    </section>
  );
}
