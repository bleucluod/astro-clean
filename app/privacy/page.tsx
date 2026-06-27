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
        <span className="badge">Local Preview Privacy</span>

        <h1>حریم داده در Halleus</h1>

        <p>
          Halleus فعلاً در حالت public preview است. در این حالت، گزارش‌ها و
          یادداشت‌های تو روی مرورگر همین دستگاه ذخیره می‌شوند و هنوز backend،
          حساب کاربری یا دیتابیس production فعال نیست.
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
          می‌شود. همین صفحه باید برای کاربر روشن کند که داده‌ها فعلاً کجا
          می‌مانند، چه چیزی هنوز production نیست و چرا قبل از payment provider
          باید auth و database آماده شوند.
        </p>

        <div className="tag-list">
          <span>Storage: مرورگر کاربر</span>
          <span>Auth: فعال نیست</span>
          <span>Payment: سفارش دستی</span>
        </div>
      </section>

      <section className="card">
        <span className="badge">چه چیزی ذخیره می‌شود؟</span>

        <h2>داده‌های local preview</h2>

        <div className="home-step-list">
          <div>
            <strong>گزارش‌ها</strong>
            <span>گزارش‌های ساخته‌شده فعلاً در local storage مرورگر می‌مانند.</span>
          </div>

          <div>
            <strong>یادداشت و علاقه‌مندی</strong>
            <span>یادداشت‌ها و ستاره‌دارها هم روی همین مرورگر ذخیره می‌شوند.</span>
          </div>

          <div>
            <strong>Export و Import</strong>
            <span>می‌توانی گزارش‌ها را خروجی بگیری و بعداً دوباره وارد کنی.</span>
          </div>
        </div>
      </section>

      <section className="card">
        <span className="badge">Account Later</span>

        <h2>وقتی حساب کاربری اضافه شود</h2>

        <p>
          بعد از فعال شدن auth و database، گزارش‌ها می‌توانند به حساب کاربری
          وصل شوند. تا آن زمان، پرداخت واقعی و ذخیره‌سازی ابری فعال نمی‌شود.
        </p>

        <div className="tag-list">
          <span>Auth: آماده‌سازی شده، فعال نیست</span>
          <span>Database: آماده‌سازی شده، فعال نیست</span>
          <span>Payment: آماده‌سازی شده، فعال نیست</span>
        </div>
      </section>
    </section>
  );
}
