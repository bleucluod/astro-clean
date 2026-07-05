import type { Metadata } from "next";
import Link from "next/link";
import { ReportsList } from "@/components/ReportsList";

export const metadata: Metadata = {
  title: "گزارش‌های ذخیره‌شده | Halleus",
  description:
    "بازگشت به گزارش‌های تولد ساخته‌شده در Halleus؛ گزارش‌های جدید فعلاً public/noindex ذخیره می‌شوند و از local-preview یا حساب کاربری خوانده می‌شوند.",
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
            {isAccountSource ? "گزارش‌های account" : "گزارش‌های من"}
          </span>
          <h1>
            {isAccountSource
              ? "گزارش‌های public/noindex ذخیره‌شده در حساب"
              : "کتابخانه گزارش‌های تو"}
          </h1>
          <p>
            {isAccountSource
              ? "اینجا گزارش‌هایی را می‌بینی که بعد از ورود با username/password در حساب ذخیره شده‌اند. گزارش‌های جدید فعلاً public/noindex هستند و indexable نمی‌شوند."
              : "این صفحه نقطه برگشت به گزارش‌هاست؛ هر گزارشی که ساختی از همین‌جا پیدا می‌شود: گزارش تولدت را باز کن، یادداشتت را ببین، گزارش‌های مهم را ستاره‌دار کن یا از پنل کاربری مسیر بعدی حساب و ذخیره پایدار را دنبال کن."}
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
            {isAccountSource ? "دیدن گزارش‌های همین مرورگر" : "دیدن گزارش‌های account"}
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم داده‌ها
          </Link>
        </div>
      </div>

      <ReportsList reportSource={reportSource} />
    </section>
  );
}
