"use client";

import { useMemo, useState } from "react";
import { ChartReportBridgePanel } from "./ChartReportBridgePanel";
import {
  buildChartFormReportFlow,
  getChartFormReportFlowManualQaSteps,
  type ChartFormReportFlowReport,
} from "../src/lib/report-output/chart-form-report-flow";

type FlowFormState = {
  name: string;
  birthDate: string;
  birthTime: string;
  timezone: string;
  placeName: string;
};

const DEFAULT_FORM: FlowFormState = {
  name: "Halleus Demo",
  birthDate: "1994-02-20",
  birthTime: "22:10",
  timezone: "Asia/Baku",
  placeName: "Baku",
};

export function ChartFormReportFlowClient() {
  const [form, setForm] = useState<FlowFormState>(DEFAULT_FORM);
  const [report, setReport] = useState<ChartFormReportFlowReport>(() =>
    buildChartFormReportFlow(DEFAULT_FORM),
  );
  const qaSteps = useMemo(() => getChartFormReportFlowManualQaSteps(), []);

  function updateField(field: keyof FlowFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function generateReport() {
    setReport(buildChartFormReportFlow(form));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#E7D8C7] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
              Interactive report flow
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
              فرم تولد → گزارش نمونه
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-8 text-[#6B5A4C]">
              این صفحه برای تست محصولی است. ورودی تولد را می‌گیرد و آن را به
              normalized chart، enrichment، bridge panel و متن فارسی گزارش وصل
              می‌کند. محاسبه‌ی نجومی نهایی هنوز در حال اتصال است، پس این نسخه
              فعلاً prototype symbolic flow است.
            </p>
          </div>

          <div className="rounded-full border border-[#D8C2AA] bg-[#FFF9F2] px-4 py-2 text-sm font-semibold text-[#6A4B35]">
            v0.1.51
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <FlowInput
            label="نام"
            value={form.name}
            onChange={(value) => updateField("name", value)}
          />
          <FlowInput
            label="تاریخ تولد"
            type="date"
            value={form.birthDate}
            onChange={(value) => updateField("birthDate", value)}
          />
          <FlowInput
            label="ساعت تولد"
            type="time"
            value={form.birthTime}
            onChange={(value) => updateField("birthTime", value)}
          />
          <FlowInput
            label="Timezone"
            value={form.timezone}
            onChange={(value) => updateField("timezone", value)}
          />
          <FlowInput
            label="محل تولد"
            value={form.placeName}
            onChange={(value) => updateField("placeName", value)}
          />
        </div>

        <button
          type="button"
          onClick={generateReport}
          className="mt-5 rounded-full bg-[#3E2F25] px-5 py-3 text-sm font-bold text-[#FFF9F2] transition hover:opacity-90"
        >
          ساخت گزارش نمونه
        </button>
      </section>

      <ChartReportBridgePanel report={report} />

      <section className="rounded-3xl border border-[#E7D8C7] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
          Generated report copy
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">{report.title}</h2>
        <p className="mt-2 text-sm leading-8 text-[#6B5A4C]">
          Mode: {report.calculationMode}. {report.engineMetadata.warning}
        </p>

        <div className="mt-5 space-y-4">
          {report.copyBlocks.map((block) => (
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

      <section className="rounded-3xl border border-[#E7D8C7] bg-[#FFF9F2] p-5">
        <p className="text-sm font-bold text-[#4A382C]">Manual QA کوتاه</p>
        <ul className="mt-3 space-y-2 text-sm leading-7 text-[#6B5A4C]">
          {qaSteps.map((step) => (
            <li key={step}>• {step}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FlowInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "time";
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#4A382C]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[#E7D8C7] bg-[#FFFDF9] px-4 py-3 text-sm text-[#3E2F25] outline-none transition focus:border-[#9A6B45]"
      />
    </label>
  );
}
