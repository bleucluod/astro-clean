import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "حریم داده و نگهداری گزارش | Halleus",
  description:
    "در Halleus گزارش‌های تولد فعلاً روی مرورگر همین دستگاه ذخیره می‌شوند؛ این صفحه توضیح می‌دهد داده‌ها کجا می‌مانند و کاربر چه انتظاری داشته باشد.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <section className="grid privacy-sales-shell">
      <div className="card">
        <span className="badge">حریم داده و گزارش‌ها</span>

        <h1>حریم داده در Halleus</h1>

        <p>
          در وضعیت فعلی، گزارش‌ها و یادداشت‌های تو روی مرورگر همین دستگاه ذخیره
          می‌شوند. حساب کاربری و ذخیره‌سازی ابری هنوز فعال نیستند.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش
          </Link>

          <Link className="button secondary" href="/reports">
            مدیریت گزارش‌ها
          </Link>

          <Link className="button secondary" href="/pricing">
            پلن‌ها و سفارش دستی
          </Link>
        </div>
      </div>

      <section className="card privacy-sales-note">
        <span className="section-label">اعتماد قبل از سفارش</span>

        <h2>قبل از پرداخت آنلاین، مسیر داده باید روشن بماند</h2>

        <p>
          چون پرداخت آنلاین هنوز فعال نیست، سفارش اولیه به‌صورت دستی انجام
          می‌شود. این صفحه روشن می‌کند داده‌ها فعلاً کجا می‌مانند و چرا قبل از
          حساب کاربری، ذخیره‌سازی ابری و پرداخت آنلاین باید مسیر اعتماد شفاف باشد.
        </p>

        <div className="tag-list">
          <span>ذخیره‌سازی: مرورگر کاربر</span>
          <span>حساب کاربری: فعال نیست</span>
          <span>سفارش: سفارش دستی</span>
        </div>
      </section>

      <section className="card">
        <span className="badge">چه چیزی ذخیره می‌شود؟</span>

        <h2>داده‌هایی که روی همین مرورگر می‌مانند</h2>

        <div className="home-step-list">
          <div>
            <strong>گزارش‌ها</strong>
            <span>گزارش‌های ساخته‌شده فعلاً در حافظه همین مرورگر می‌مانند.</span>
          </div>

          <div>
            <strong>یادداشت و علاقه‌مندی</strong>
            <span>یادداشت‌ها و ستاره‌دارها هم روی همین مرورگر ذخیره می‌شوند.</span>
          </div>

          <div>
            <strong>خروجی و ورود دوباره</strong>
            <span>می‌توانی گزارش‌ها را خروجی بگیری و بعداً دوباره وارد کنی.</span>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="badge">حساب کاربری در مرحله بعد</span>

        <h2>وقتی حساب کاربری اضافه شود</h2>

        <p>
          بعد از فعال شدن حساب کاربری و ذخیره‌سازی ابری، گزارش‌ها می‌توانند به
          حساب تو وصل شوند. تا آن زمان پرداخت آنلاین و نگهداری ابری فعال نیست.
        </p>

        <div className="tag-list">
          <span>حساب کاربری: مرحله بعد</span>
          <span>ذخیره‌سازی ابری: مرحله بعد</span>
          <span>پرداخت آنلاین: مستلزم شفاف شدن مسیر داده</span>
        </div>
      </section>
    </section>
  );
}
