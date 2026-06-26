import Link from "next/link";
import { RealChartWorkbenchClient } from "./RealChartWorkbenchClient";

export function PublicChartRealEngineUpgrade() {
  return (
    <section className="mt-8 rounded-[2rem] border border-[#E7D8C7] bg-[#FFF9F2] p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
            Real engine upgrade
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
            محاسبه واقعی‌تر، بدون حذف ظاهر اصلی چارت
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-8 text-[#6B5A4C]">
            این بخش به صفحه اصلی چارت اضافه شده، اما flow قبلی، انتخاب شهرها و
            ظاهر اصلی را دست نمی‌زند. فعلاً می‌توانی engine واقعی‌تر را همین‌جا
            باز کنی و با چارت اصلی مقایسه کنی.
          </p>
        </div>

        <Link
          href="/engine/real-chart"
          className="rounded-full bg-[#3E2F25] px-5 py-3 text-center text-sm font-bold text-[#FFF9F2] transition hover:opacity-90"
        >
          باز کردن نسخه engine lab
        </Link>
      </div>

      <details className="mt-5 rounded-[1.75rem] border border-[#E4D2BE] bg-white p-4">
        <summary className="cursor-pointer text-sm font-bold text-[#4A382C]">
          محاسبه واقعی‌تر را داخل همین صفحه باز کن
        </summary>
        <p className="mt-3 text-sm leading-8 text-[#6B5A4C]">
          این پنل هنوز جایگزین flow اصلی نیست؛ فقط real chart workbench را داخل
          صفحه عمومی نشان می‌دهد تا مرحله‌به‌مرحله به محصول اصلی وصلش کنیم.
        </p>
        <div className="mt-6">
          <RealChartWorkbenchClient />
        </div>
      </details>
    </section>
  );
}
