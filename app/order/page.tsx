import type { Metadata } from "next";
import Link from "next/link";
import { ManualOrderRequestForm } from "@/components/ManualOrderRequestForm";

export const metadata: Metadata = {
  title: "درخواست سفارش دستی | Halleus",
  description:
    "درخواست سفارش دستی گزارش کامل Halleus پیش از فعال شدن پرداخت آنلاین.",
};

export default function OrderPage() {
  return (
    <section className="grid manual-order-page">
      <div className="card manual-order-hero">
        <span className="badge">درخواست سفارش دستی</span>

        <h1>سفارش نسخه کامل‌تر گزارش Halleus</h1>

        <p>
          پرداخت آنلاین هنوز فعال نیست. در این مرحله می‌توانی اطلاعات سفارش را
          آماده کنی، متن درخواست را کپی کنی و هماهنگی پرداخت و تحویل به‌صورت
          دستی انجام شود.
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

      <ManualOrderRequestForm />

      <section className="card">
        <span className="section-label">شفافیت سفارش</span>

        <h2>این صفحه پرداخت واقعی انجام نمی‌دهد</h2>

        <p>
          فرم سفارش فعلاً فقط متن درخواست را آماده می‌کند. هیچ اطلاعاتی به
          سرور ارسال نمی‌شود، پرداخت آنلاین فعال نیست و هماهنگی سفارش خارج از
          سایت انجام می‌شود.
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