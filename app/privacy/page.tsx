import Link from "next/link";

export default function PrivacyPage() {
  return (
    <section className="grid">
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
        </div>
      </div>

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
