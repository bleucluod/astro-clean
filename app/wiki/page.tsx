import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Astro Wiki | آسترو ویکی فارسی",
  description:
    "آسترو ویکی Astro Clean پایه‌ای سبک برای محتوای آموزشی فارسی درباره سیارات، خانه‌ها، رایزینگ‌ها و اصطلاحات آسترولوژی.",
};

export default function WikiPage() {
  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Astro Wiki</span>

        <h1>پایه سبک برای محتوای آموزشی و SEO</h1>

        <p>
          Astro Wiki در آینده محل توضیح سیارات، خانه‌ها، رایزینگ‌ها، جنبه‌ها و
          اصطلاحات آسترولوژی خواهد بود. فعلاً فقط یک صفحه ساده داریم تا مسیر
          محتوایی و SEO از روز اول در ساختار محصول دیده شود.
        </p>

        <h2>موضوعات آینده</h2>

        <p>
          خورشید در نشانه‌ها، ماه در نشانه‌ها، ونوس در خانه‌ها، رایزینگ‌ها،
          سازگاری رابطه، چارت رویدادها و صفحات قابل توسعه برای جستجوی فارسی.
        </p>
      </div>
    </section>
  );
}
