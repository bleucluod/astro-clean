import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Astro Clean | چارت تولد و تحلیل نمادین فارسی",
  description:
    "Astro Clean یک پلتفرم فارسی برای ساخت چارت تولد، گزارش شخصی و تجربه نمادین آسترولوژی است.",
};

export default function Home() {
  return (
    <section className="hero">
      <div>
        <span className="badge">نسخه MVP فارسی Astro Clean</span>

        <h1>چارت تولد و تحلیل نمادین، ساده و شخصی</h1>

        <p>
          Astro Clean یک تجربه فارسی برای ساخت چارت تولد، دریافت گزارش‌های
          شخصی و دنبال کردن مسیر خودشناسی نمادین است. این نسخه هنوز ساده است،
          اما پایه‌ای تمیز برای آینده‌ای بزرگ‌تر می‌سازد.
        </p>

        <p>
          تحلیل‌ها در این محصول به عنوان تفسیر نمادین، سرگرمی و تأمل شخصی
          ارائه می‌شوند؛ نه پیش‌بینی قطعی یا توصیه پزشکی، مالی و حقوقی.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت اولین چارت
          </Link>

          <Link className="button secondary" href="/roadmap">
            دیدن نقشه راه
          </Link>
        </div>
      </div>

      <div className="card">
        <h2>در MVP چه داریم؟</h2>

        <div className="grid">
          <p>✨ فرم ساده اطلاعات تولد</p>
          <p>🌙 موتور mock برای خورشید، ماه و رایزینگ</p>
          <p>📝 ذخیره گزارش‌ها در مرورگر</p>
          <p>🧭 داشبورد شخصی و مسیر آینده محصول</p>
        </div>
      </div>
    </section>
  );
}
