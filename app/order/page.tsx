import type { Metadata } from "next";
import Link from "next/link";
import { PremiumRequestForm } from "@/components/PremiumRequestForm";

type OrderPageProps = {
  searchParams?: Promise<{
    reportId?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: "درخواست نسخه کامل‌تر گزارش چارت تولد | هالیوس",
  description:
    "درخواست نسخه کامل‌تر گزارش هالیوس را ثبت کن. ثبت فرم به معنی پرداخت یا شروع قطعی نیست و زمان، هزینه و محدوده پیش از آغاز جداگانه تأیید می‌شوند.",
  alternates: {
    canonical: "/order",
  },
};

function normalizeReportId(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function OrderPage({ searchParams }: OrderPageProps) {
  const params = await searchParams;
  const initialReportId = normalizeReportId(params?.reportId).trim();

  return (
    <section className="grid manual-order-page order-copy-detox-marker">
      <div className="card manual-order-hero">
        <span className="badge">درخواست نسخه کامل‌تر</span>
        <h1>درخواست نسخه کامل‌تر گزارش را ثبت کن</h1>
        <p>
          اگر از صفحه گزارش آمده باشی، شناسه همان گزارش همراه فرم می‌آید.
          ثبت درخواست هنوز به معنی خرید یا شروع کار نیست؛ زمان، هزینه، محدوده
          و قالب تحویل پیش از شروع جداگانه تأیید می‌شوند.
        </p>
        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش پایه
          </Link>
          <Link className="button secondary" href="/pricing">
            دیدن پلن‌ها
          </Link>
        </div>
      </div>

      <PremiumRequestForm initialReportId={initialReportId} />

      <section className="card">
        <span className="section-label">روند بررسی</span>
        <h2>ثبت درخواست به معنی پرداخت یا شروع خودکار نیست</h2>
        <ol>
          <li>درخواست در صف خصوصی هالیوس ثبت می‌شود.</li>
          <li>جزئیات، زمان و هزینه برای هماهنگی بررسی می‌شود.</li>
          <li>پس از تأیید دوطرفه، وضعیت آماده‌سازی و تحویل پیگیری می‌شود.</li>
        </ol>
      </section>

      <section className="card">
        <span className="section-label">بعد از ثبت</span>
        <h2>چه اتفاقی می‌افتد؟</h2>
        <ol>
          <li>درخواست در صف خصوصی هالیوس ثبت می‌شود.</li>
          <li>نوع گزارش، توضیحات و شناسه گزارش بررسی می‌شوند.</li>
          <li>محدوده، زمان و هزینه برای هماهنگی مشخص می‌شوند.</li>
          <li>فقط پس از تأیید دوطرفه، آماده‌سازی شروع می‌شود.</li>
        </ol>
      </section>

      <section className="card">
        <span className="section-label">حریم خصوصی و انتشار</span>
        <h2>ثبت سفارش، رضایت انتشار نیست</h2>
        <p>
          اطلاعات تماس فقط برای بررسی و پیگیری همین درخواست استفاده می‌شوند.
          ثبت سفارش یا خرید، گزارش خصوصی را عمومی نمی‌کند و اطلاعات تماس برای
          آمار بازدید یا در متن عمومی گزارش استفاده نمی‌شوند.
        </p>
        <div className="tag-list">
          <span>صف خصوصی</span>
          <span>قابل پیگیری</span>
          <span>رضایت انتشار جداگانه</span>
        </div>
        <Link className="button secondary" href="/privacy">حریم خصوصی هالیوس</Link>
      </section>

      <section className="card">
        <span className="section-label">پرسش‌های رایج</span>
        <h2>دربارهٔ ثبت درخواست</h2>
        <div className="home-faq-list">
          <details><summary>آیا ثبت درخواست به معنی خرید است؟</summary><p>خیر. هزینه، زمان و محدوده باید پیش از شروع تأیید شوند.</p></details>
          <details><summary>بدون گزارش پایه می‌توانم درخواست بدهم؟</summary><p>بله، اما گزارش پایه کمک می‌کند درخواست به چارت درست متصل شود.</p></details>
          <details><summary>گزارش سفارشی عمومی می‌شود؟</summary><p>نسخهٔ پریمیوم خصوصی شروع می‌شود و انتشار فقط با انتخاب صریح صاحب گزارش ممکن است.</p></details>
          <details><summary>چه زمانی پاسخ می‌گیرم؟</summary><p>زمان فرضی وعده داده نمی‌شود؛ زمان واقعی پس از بررسی درخواست اعلام می‌شود.</p></details>
        </div>
      </section>
    </section>
  );
}
