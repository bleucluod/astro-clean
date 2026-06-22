import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "داشبورد شخصی | Astro Clean",
  description:
    "داشبورد شخصی Astro Clean برای مشاهده آخرین گزارش‌ها، وضعیت کاربر و مسیر آینده تحلیل‌های نمادین.",
};

export default function DashboardPage() {
  return (
    <section className="grid">
      <div className="card">
        <span className="badge">داشبورد شخصی</span>

        <h1>خلاصه وضعیت نجومی تو</h1>

        <p>
          این صفحه در آینده مرکز تجربه شخصی کاربر خواهد بود؛ جایی برای دیدن
          آخرین چارت، گزارش‌های ذخیره‌شده، مود روزانه، پیشنهادهای شخصی و مسیر
          رشد نمادین.
        </p>

        <p>
          در MVP، اینجا بعداً آخرین گزارش ذخیره‌شده در مرورگر را نشان می‌دهیم.
          فعلاً فقط ساختار صفحه را آماده می‌کنیم.
        </p>
      </div>
    </section>
  );
}
