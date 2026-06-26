import type { Metadata } from "next";
import Link from "next/link";
import { ManualOrderRequestForm } from "@/components/ManualOrderRequestForm";

type OrderPageProps = {
  searchParams?: Promise<{
    reportId?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: "درخواست سفارش دستی | Halleus",
  description:
    "درخواست سفارش دستی نسخه کامل‌تر گزارش Halleus پیش از فعال شدن پرداخت آنلاین.",
};

function normalizeReportId(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function OrderPage({ searchParams }: OrderPageProps) {
  const params = await searchParams;
  const initialReportId = normalizeReportId(params?.reportId).trim();

  return (
    <section className="grid manual-order-page">
      <div className="card manual-order-hero">
        <span className="badge">درخواست سفارش دستی</span>

        <h1>سفارش نسخه کامل‌تر گزارش Halleus</h1>

        <p>
          این صفحه پرداخت آنلاین انجام نمی‌دهد. فقط کمک می‌کند درخواستت را مرتب
          آماده کنی، شناسه گزارش نمونه را همراهش نگه داری و متن سفارش را برای
          هماهنگی دستی کپی کنی.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            اول گزارش نمونه بساز
          </Link>

          <Link className="button secondary" href="/pricing">
            دیدن پلن‌ها
          </Link>
        </div>
      </div>

      <ManualOrderRequestForm initialReportId={initialReportId} />

      <section className="card">
        <span className="section-label">شفافیت سفارش</span>

        <h2>اینجا اطلاعاتی به سرور ارسال نمی‌شود</h2>

        <p>
          فرم سفارش فعلاً فقط متن درخواست را آماده می‌کند. پرداخت آنلاین فعال
          نیست، اطلاعات فرم ذخیره یا ارسال نمی‌شود و هماهنگی سفارش خارج از سایت
          انجام می‌شود.
        </p>

        <div className="tag-list">
          <span>Payment: دستی</span>
          <span>Backend: فعال نیست</span>
          <span>Storage: ارسال نمی‌شود</span>
        </div>
      </section>
    </section>
  );
}
