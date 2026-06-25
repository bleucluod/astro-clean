import { ChartFormReportFlowClient } from "../../../components/ChartFormReportFlowClient";

export default function ChartFormReportFlowPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-8 rounded-3xl bg-[#3E2F25] p-6 text-[#FFF9F2]">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D9B58C]">
          Halleus MVP flow
        </p>
        <h1 className="mt-3 text-3xl font-bold">تست مسیر ساخت گزارش از فرم تولد</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-[#F3E7D9]">
          این مسیر برای نزدیک کردن engine preview به تجربه‌ی واقعی محصول ساخته شده:
          کاربر ورودی تولد می‌دهد، گزارش نمونه ساخته می‌شود، و خروجی همان‌جا دیده
          می‌شود.
        </p>
      </div>

      <ChartFormReportFlowClient />
    </main>
  );
}
