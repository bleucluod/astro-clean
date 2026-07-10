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
    "در هالیوس می‌توانی بعد از ساخت گزارش تولد، درخواست نسخه کامل‌تر همان گزارش را آماده کنی.",
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
    <section className="grid manual-order-page order-copy-detox-marker">
      <div className="card manual-order-hero">
        <span className="badge">درخواست نسخه کامل‌تر</span>

        <h1>متن سفارش گزارش کامل‌تر را آماده کن</h1>

        <p>
          برای نسخه کامل‌تر، متن درخواستت را آماده کن و برای هماهنگی دستی بفرست.
          اگر از صفحه گزارش آمده باشی، شناسه همان گزارش در متن سفارش می‌ماند.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش پایه
          </Link>

          <Link className="button secondary" href="/pricing">
            دیدن پلن‌ها
          </Link>
        </div>
      </div>

      <ManualOrderRequestForm initialReportId={initialReportId} />

      <section className="card">
        <span className="section-label">بعد از کپی متن سفارش</span>

        <h2>هماهنگی سفارش قدم‌به‌قدم انجام می‌شود</h2>

        <ol>
          <li>متن آماده سفارش را کپی کن و شناسه گزارش نمونه را همراهش نگه دار.</li>
          <li>متن را از راه ارتباطی هماهنگ‌شده برای بررسی دستی ارسال کن.</li>
          <li>زمان، هزینه و محدوده نسخه کامل‌تر قبل از شروع کار تأیید می‌شود.</li>
        </ol>

        <p>
          این فرم چیزی را در سایت ثبت نمی‌کند؛ فقط کمک می‌کند درخواستت مرتب،
          قابل‌کپی و آماده هماهنگی باشد.
        </p>
      </section>

      <section className="card">
        <span className="section-label">شفافیت سفارش</span>

        <h2>اطلاعات این فرم در سایت ذخیره یا ارسال نمی‌شود</h2>

        <p>
          متن سفارش فقط روی همین صفحه آماده می‌شود. بعد از کپی، خودت آن را از
          راه ارتباطی دلخواه می‌فرستی و جزئیات سفارش جداگانه تأیید می‌شود.
        </p>

        <div className="tag-list">
          <span>قابل کپی</span>
          <span>بدون ارسال خودکار</span>
          <span>با هماهنگی دستی</span>
        </div>
      </section>
    </section>
  );
}
