import type { Metadata } from "next";
import Link from "next/link";
import { ReportsList } from "@/components/ReportsList";

export const metadata: Metadata = {
  title: "گزارش‌های ذخیره‌شده | Halleus",
  description:
    "مشاهده و مدیریت گزارش‌های ذخیره‌شده چارت تولد در Halleus؛ بعد از ساخت گزارش می‌توانی مسیر نسخه کامل‌تر را هم بررسی کنی.",
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
          <h1>گزارش‌هایی که ساختی را مرور کن</h1>
          <p>
            این صفحه نقطه بعد از ساخت گزارش است: می‌توانی گزارش‌ها را بخوانی،
            برگردی، یادداشت اضافه کنی و اگر نسخه کامل‌تر خواستی، مسیر پلن‌ها و
            سفارش دستی را بررسی کنی.
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش جدید
          </Link>

          <Link className="button secondary" href="/pricing">
            دیدن پلن‌ها
          </Link>
        </div>
      </div>

      <ReportsList reportSource={reportSource} />
    </section>
  );
}
