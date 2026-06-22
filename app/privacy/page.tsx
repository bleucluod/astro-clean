import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "حریم داده | Astro Clean",
  description:
    "توضیح شفاف درباره ذخیره داده‌ها، localStorage و محدودیت‌های حریم خصوصی در نسخه MVP آسترو کلین.",
};

const dataItems = [
  {
    title: "گزارش‌ها",
    description:
      "گزارش‌های ساخته‌شده فعلاً فقط در مرورگر همین دستگاه ذخیره می‌شوند.",
  },
  {
    title: "پروفایل",
    description:
      "نام نمایشی، توضیح کوتاه و تنظیم حریم خصوصی فعلاً در localStorage ذخیره می‌شود.",
  },
  {
    title: "بکاپ JSON",
    description:
      "از بخش Admin می‌توانی از داده‌های محلی خروجی JSON بگیری یا بکاپ قبلی را وارد کنی.",
  },
];

const notIncludedItems = [
  "اکانت واقعی کاربر نداریم",
  "دیتابیس نداریم",
  "backend نداریم",
  "پرداخت و اشتراک نداریم",
  "AI integration نداریم",
  "ارسال داده به سرور انجام نمی‌شود",
];

export default function PrivacyPage() {
  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Data & Privacy</span>

        <h1>حریم داده در نسخه MVP</h1>

        <p>
          Astro Clean در این نسخه یک MVP فرانت‌اندی است. یعنی داده‌هایی مثل
          گزارش‌ها و پروفایل، فعلاً روی مرورگر همین دستگاه ذخیره می‌شوند و به
          سرور، دیتابیس یا حساب کاربری ارسال نمی‌شوند.
        </p>

        <p>
          این صفحه برای شفافیت محصول ساخته شده است؛ نه به عنوان متن حقوقی
          رسمی. قبل از deploy واقعی، متن حریم خصوصی باید با شرایط نهایی محصول
          بازبینی شود.
        </p>

        <div className="actions">
          <Link className="button" href="/admin">
            مدیریت داده‌های محلی
          </Link>

          <Link className="button secondary" href="/chart">
            ساخت چارت mock
          </Link>
        </div>
      </div>

      <div className="grid grid-3">
        {dataItems.map((item) => (
          <article className="card" key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className="card">
        <span className="section-label">چیزهایی که فعلاً وجود ندارند</span>

        <h2>محدوده فنی MVP</h2>

        <p>
          نبودن این موارد عمدی است تا MVP سبک، قابل تست و قابل تغییر بماند.
        </p>

        <div className="tag-list">
          {notIncludedItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      <div className="card">
        <span className="section-label">کنترل کاربر</span>

        <h2>چطور داده‌ها را پاک یا منتقل کنم؟</h2>

        <p>
          برای پاک کردن گزارش‌ها، ریست پروفایل، ریست کامل داده‌های دمو یا گرفتن
          بکاپ JSON، وارد صفحه Admin شو. چون داده‌ها محلی هستند، پاک کردن
          localStorage مرورگر هم می‌تواند داده‌های Astro Clean را حذف کند.
        </p>

        <div className="actions">
          <Link className="button" href="/admin">
            رفتن به Admin
          </Link>

          <Link className="button secondary" href="/reports">
            دیدن گزارش‌ها
          </Link>
        </div>
      </div>
    </section>
  );
}
