import Link from "next/link";

export default function NotFound() {
  return (
    <section className="grid">
      <div className="card">
        <span className="badge">صفحه پیدا نشد</span>

        <h1>این مسیر در چارت ما نیست</h1>

        <p>
          آدرسی که وارد کرده‌ای وجود ندارد یا هنوز در نسخه MVP ساخته نشده است.
          می‌توانی به خانه برگردی یا اولین چارت mock خودت را بسازی.
        </p>

        <div className="actions">
          <Link className="button" href="/">
            برگشت به خانه
          </Link>

          <Link className="button secondary" href="/chart">
            ساخت چارت
          </Link>
        </div>
      </div>
    </section>
  );
}
