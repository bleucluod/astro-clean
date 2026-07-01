import type { Metadata } from "next";
import Link from "next/link";
import { ManualOrderRequestForm } from "@/components/ManualOrderRequestForm";

type OrderPageProps = {
  searchParams?: Promise<{
    reportId?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: "درخواست نسخه کامل‌تر گزارش | Halleus",
  description:
    "در Halleus می‌توانی بعد از ساخت گزارش تولد، درخواست نسخه کامل‌تر و انسانی‌تر همان گزارش را آماده کنی.",
  alternates: {
    canonical: "/order",
  },
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
        <span className="section-label">بعد از کپی متن سفارش</span>

        <h2>مسیر سفارش فعلاً دستی و شفاف است</h2>

        <ol>
          <li>متن آماده سفارش را کپی کن و شناسه گزارش نمونه را همراهش نگه دار.</li>
          <li>متن را از راه ارتباطی هماهنگ‌شده برای بررسی دستی ارسال کن.</li>
          <li>زمان، هزینه و محدوده نسخه کامل‌تر قبل از شروع کار تأیید می‌شود.</li>
        </ol>

        <p>
          این مرحله هنوز پرداخت آنلاین یا ارسال خودکار ندارد؛ هدفش این است که
          درخواست مشتری قابل‌پیگیری، منظم و آماده هماهنگی باشد.
        </p>
      </section>

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
