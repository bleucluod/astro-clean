import type { Metadata } from "next";
import Link from "next/link";
import { ReportsList } from "@/components/ReportsList";

export const metadata: Metadata = {
  title: "گزارش‌های ذخیره‌شده | Halleus",
  description:
    "بازگشت به گزارش‌های تولد ساخته‌شده در Halleus؛ گزارش‌های همین مرورگر و گزارش‌های حساب جدا دیده می‌شوند و گزارش‌های حساب private/noindex می‌مانند.",
  alternates: {
    canonical: "/reports",
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
  const reportSource =
    rawSource === "account" ? "account" : rawSource === "beta-db" ? "beta-db" : "local";
  const isAccountSource = reportSource === "account";

  return (
    <section className="grid reports-sales-shell reports-return-shell">
      <div className="card reports-sales-cta reports-return-hero">
        <div>
          <span className="badge">
            {isAccountSource ? "گزارش‌های حساب" : "گزارش‌های من"}
          </span>
          <h1>
            {isAccountSource
              ? "گزارش‌هایی که به حساب تو وصل‌اند"
              : "کتابخانه گزارش‌های همین مرورگر"}
          </h1>
          <p>
            {isAccountSource
              ? "اینجا فقط نسخه‌هایی را می‌بینی که بعد از ورود با username/password به حساب فعلی وصل شده‌اند. این مسیر برای مالکیت و برگشت امن به گزارش‌هاست؛ گزارش‌های حساب private/noindex می‌مانند و indexable نمی‌شوند."
              : "اینجا نقطه برگشت به گزارش‌هایی است که روی همین مرورگر پیدا می‌شوند. برای گزارش‌های بعدی می‌توانی وارد حساب شوی تا نسخه حساب جدا از local-preview خوانده شود؛ migration گزارش‌های قدیمی هنوز انجام نمی‌شود."}
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/dashboard">
            پنل کاربری
          </Link>

          <Link
            className="button secondary"
            href={isAccountSource ? "/reports" : "/reports?source=account"}
          >
            {isAccountSource ? "دیدن گزارش‌های همین مرورگر" : "دیدن گزارش‌های حساب"}
          </Link>

          <Link className="button secondary" href="/profile">
            ورود و ثبت‌نام
          </Link>
        </div>
      </div>

      <ReportsList reportSource={reportSource} />
    </section>
  );
}
