import Link from "next/link";
import { RealChartWorkbenchClient } from "../../components/RealChartWorkbenchClient";

export default function ChartPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <section className="rounded-[2rem] bg-[#3E2F25] p-6 text-[#FFF9F2] shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D9B58C]">
          Halleus chart
        </p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">
              چارت تولد واقعی‌تر
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[#F3E7D9]">
              این صفحه حالا به engine واقعی‌تر Halleus وصل است: داده تولد وارد
              می‌شود، جایگاه سیاره‌ها محاسبه می‌شود، چرخ چارت و aspectها ساخته
              می‌شوند، و متن گزارش فارسی از همان خروجی تولید می‌شود.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/engine/real-chart"
              className="rounded-full border border-[#D9B58C]/50 px-4 py-2 font-semibold text-[#FFF9F2] transition hover:bg-[#FFF9F2]/10"
            >
              نسخه engine lab
            </Link>
            <Link
              href="/reports"
              className="rounded-full bg-[#FFF9F2] px-4 py-2 font-semibold text-[#3E2F25] transition hover:opacity-90"
            >
              گزارش‌ها
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-[#E7D8C7] bg-[#FFF9F2] p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <PublicChartFeature
            title="محاسبه واقعی‌تر"
            body="موقعیت سیاره‌ها از engine و مختصات Earth-centered می‌آید، نه seed نمایشی."
          />
          <PublicChartFeature
            title="چارت قابل دیدن"
            body="چرخ چارت، کارت‌های سیاره‌ها و روابط اصلی سیاره‌ها در همان صفحه دیده می‌شود."
          />
          <PublicChartFeature
            title="آماده گزارش"
            body="خروجی چارت به bridge panel و متن فارسی گزارش وصل است."
          />
        </div>
      </section>

      <div className="mt-8">
        <RealChartWorkbenchClient />
      </div>
    </main>
  );
}

function PublicChartFeature({ title, body }: { title: string; body: string }) {
  return (
    <article className="rounded-[1.5rem] border border-[#EFE2D2] bg-white p-4">
      <h2 className="font-bold text-[#3E2F25]">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-[#6B5A4C]">{body}</p>
    </article>
  );
}
