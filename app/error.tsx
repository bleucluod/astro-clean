"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <section className="card">
      <span className="badge">خطای غیرمنتظره</span>

      <h1>یک چیزی درست کار نکرد</h1>

      <p>
        مشکلی در نمایش این بخش پیش آمده است. این خطا می‌تواند از کد صفحه،
        داده‌های مرورگر یا یک وضعیت غیرمنتظره در اجرای برنامه باشد.
      </p>

      <p className="notice">
        پیام فنی: {error.message || "جزئیات خطا در دسترس نیست."}
      </p>

      <button className="button" onClick={reset}>
        تلاش دوباره
      </button>
    </section>
  );
}
