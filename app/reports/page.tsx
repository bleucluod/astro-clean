import type { Metadata } from "next";
import Link from "next/link";
import { ReportsList } from "@/components/ReportsList";

export const metadata: Metadata = {
  title: "گزارش‌های ذخیره‌شده | Halleus",
  description:
    "بازگشت به گزارش‌های تولد ساخته‌شده در Halleus؛ گزارش‌ها فعلاً خصوصی و روی همین دستگاه نگه داشته می‌شوند و برای اتصال به حساب کاربری آماده می‌شوند.",
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
  const reportSource = rawSource === "beta-db" ? "beta-db" : "local";

  return (
    <section className="grid reports-sales-shell reports-return-shell">
      <div className="card reports-sales-cta reports-return-hero">
        <div>
          <span className="badge">گزارش‌های من</span>
          <h1>کتابخانه خصوصی گزارش‌های تو</h1>
          <p>
            این صفحه نقطه برگشت به گزارش‌هاست؛ هر گزارشی که ساختی از همین‌جا
            پیدا می‌شود: گزارش تولدت را باز کن، یادداشتت را ببین، گزارش‌های
            مهم را ستاره‌دار کن یا از پنل کاربری مسیر بعدی حساب و ذخیره پایدار
            را دنبال کن.
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/dashboard">
            پنل کاربری
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
