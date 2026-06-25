import { ChartReportBridgePanel } from "../../../components/ChartReportBridgePanel";
import { buildNormalizedChart } from "../../../src/lib/chart/normalized-chart";
import { buildChartReportEnrichment } from "../../../src/lib/report-output/chart-enrichment";
import { buildRealChartReportCopy } from "../../../src/lib/report-output/real-chart-report-copy";

export default function RealChartReportPreviewPage() {
  const chart = buildNormalizedChart({
    source: "fixture",
    time: {
      date: "1994-02-20",
      time: "22:10",
      timezone: "Asia/Baku",
      placeName: "Baku",
    },
    house: {
      system: "whole-sign",
      ascendantLongitude: 47,
    },
    placements: [
      {
        id: "sun",
        label: "Sun",
        pointType: "luminary",
        longitude: 10,
      },
      {
        id: "moon",
        label: "Moon",
        pointType: "luminary",
        longitude: 70,
      },
      {
        id: "mercury",
        label: "Mercury",
        pointType: "personal-planet",
        longitude: 100,
      },
      {
        id: "venus",
        label: "Venus",
        pointType: "personal-planet",
        longitude: 190,
      },
    ],
  });
  const chartReportEnrichment = buildChartReportEnrichment(chart);
  const copyBlocks = buildRealChartReportCopy(chartReportEnrichment);
  const previewReport = {
    id: "real-chart-report-preview",
    title: "Real chart report preview",
    chartReportEnrichment,
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-8 rounded-3xl bg-[#3E2F25] p-6 text-[#FFF9F2]">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#D9B58C]">
          Halleus engine preview
        </p>
        <h1 className="mt-3 text-3xl font-bold">پیش‌نمایش اتصال چارت واقعی به گزارش</h1>
        <p className="mt-3 max-w-3xl text-sm leading-8 text-[#F3E7D9]">
          این صفحه برای تست محصولی است: داده‌ی normalized chart به enrichment تبدیل
          می‌شود، سپس به پنل گزارش و متن فارسی نمونه وصل می‌شود. این هنوز ادعای
          دقت نهایی یا گزارش حرفه‌ای کامل نیست.
        </p>
      </div>

      <div className="space-y-6">
        <ChartReportBridgePanel report={previewReport} />

        <section className="rounded-3xl border border-[#E7D8C7] bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
            Sample report copy
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
            متن نمونه‌ی غنی‌شده از چارت
          </h2>
          <div className="mt-5 space-y-4">
            {copyBlocks.map((block) => (
              <article
                key={block.id}
                className="rounded-2xl border border-[#EFE2D2] bg-[#FFF9F2] p-4"
              >
                <h3 className="font-bold text-[#4A382C]">{block.title}</h3>
                <p className="mt-2 text-sm leading-8 text-[#6B5A4C]">{block.body}</p>
                <p className="mt-3 text-xs text-[#9A6B45]">
                  Source keys: {block.sourceKeys.join(", ")}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
