import Link from "next/link";

type ReportOrderCtaProps = {
  reportId: string;
};

export function ReportOrderCta({ reportId }: ReportOrderCtaProps) {
  const orderHref = `/order?reportId=${encodeURIComponent(reportId)}`;

  return (
    <section className="grid report-order-context">
      <div className="card">
        <span className="badge">سفارش گزارش کامل‌تر</span>

        <h2>همین گزارش را مبنای نسخه کامل‌تر قرار بده</h2>

        <p>
          اگر می‌خواهی این گزارش کامل‌تر، منسجم‌تر و قابل‌تحویل آماده شود، شناسه
          گزارش به فرم سفارش دستی منتقل می‌شود تا ادامه مسیر بر اساس همین چارت
          پیش برود.
        </p>

        <div className="actions">
          <Link className="button" href={orderHref}>
            سفارش نسخه کامل‌تر این گزارش
          </Link>

          <Link className="button secondary" href="/pricing">
            دیدن پلن‌ها
          </Link>
        </div>
      </div>
    </section>
  );
}
