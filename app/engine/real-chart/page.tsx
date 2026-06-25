import { RealChartWorkbenchClient } from "../../../components/RealChartWorkbenchClient";

export default function RealChartWorkbenchPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 rounded-3xl bg-[#3E2F25] p-6 text-[#FFF9F2]">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D9B58C]">
          Halleus real engine
        </p>
        <h1 className="mt-3 text-3xl font-bold">چارت واقعی‌تر و قابل دیدن</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-[#F3E7D9]">
          این صفحه برای دیدن ارزش اصلی محصول ساخته شده: birth data وارد می‌شود،
          engine جایگاه سیاره‌ها را حساب می‌کند، چارت به report enrichment وصل
          می‌شود، و خروجی فارسی گزارش همان‌جا دیده می‌شود.
        </p>
      </div>

      <RealChartWorkbenchClient />
    </main>
  );
}
