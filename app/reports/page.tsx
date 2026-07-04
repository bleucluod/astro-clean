import type { Metadata } from "next";
import Link from "next/link";
import { ReportsList } from "@/components/ReportsList";

export const metadata: Metadata = {
  title: "گزارش‌های ذخیره‌شده | Halleus",
  description:
    "مشاهده و مرور گزارش‌های ذخیره‌شده چارت تولد در Halleus؛ گزارش‌ها فعلاً رایگان و خصوصی می‌مانند تا تجربه خواندن کامل‌تر شود.",
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
    <section className="grid reports-sales-shell">
      <div className="card reports-sales-cta">
        <div>
          <span className="badge">گزارش‌های ذخیره‌شده</span>
          <h1>گزارش‌هایی که ساختی را آرام‌تر مرور کن</h1>
          <p>
            این صفحه نقطه برگشت به گزارش‌هاست: می‌توانی خوانش کامل را ادامه
            بدهی، گزارش‌ها را جستجو کنی، یادداشت اضافه کنی و هر وقت خواستی
            گزارش تازه بسازی. هالیوس فعلاً رایگان، خصوصی و آماده‌سازی‌شده برای
            تست محصول است؛ نه فروش، نه ایندکس عمومی.
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم خصوصی گزارش‌ها
          </Link>
        </div>
      </div>

      <ReportsList reportSource={reportSource} />
    </section>
  );
}
