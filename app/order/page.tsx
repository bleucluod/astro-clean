import type { Metadata } from "next";
import Link from "next/link";
import { PremiumRequestForm } from "@/components/PremiumRequestForm";

type OrderPageProps = {
  searchParams?: Promise<{
    reportId?: string | string[];
  }>;
};

export const metadata: Metadata = {
  title: "درخواست نسخه کامل‌تر گزارش | Halleus",
  description:
    "در هالیوس می‌توانی بعد از ساخت گزارش تولد، درخواست نسخه کامل‌تر همان گزارش را ثبت کنی.",
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
        <h1>درخواستت را ثبت کن تا قابل پیگیری باشد</h1>
        <p>
          اگر از صفحه گزارش آمده باشی، شناسه همان گزارش همراه درخواست ثبت
          می‌شود. زمان، هزینه و محدوده کار پیش از شروع جداگانه تأیید خواهد شد.
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
        <span className="section-label">حریم خصوصی و انتشار</span>
        <h2>ثبت سفارش، رضایت انتشار نیست</h2>
        <p>
          انتخاب عمومی یا خصوصی بودن گزارش جداگانه نگه داشته می‌شود. هالیوس یک
          گزارش خصوصی را بدون رضایت صریح صاحب آن عمومی نمی‌کند.
        </p>
        <div className="tag-list">
          <span>صف خصوصی</span>
          <span>قابل پیگیری</span>
          <span>رضایت انتشار جداگانه</span>
        </div>
      </section>
    </section>
  );
}
