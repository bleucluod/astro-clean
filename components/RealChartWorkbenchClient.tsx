"use client";

import { useState } from "react";
import { ChartReportBridgePanel } from "./ChartReportBridgePanel";

type RealChartWorkbenchForm = {
  name: string;
  birthDate: string;
  birthTime: string;
  timezone: string;
  placeName: string;
  latitude: string;
  longitude: string;
};

type RealChartWorkbenchResponse = {
  ok: boolean;
  error?: string;
  realChart?: {
    version: string;
    utcIso: string;
    ascendantLongitude: number;
    calculationNotes: string[];
    placements: Array<{
      id: string;
      label: string;
      longitude: number;
      signId: string;
      degreeInSign: number;
      method: string;
    }>;
  };
  copyBlocks?: Array<{
    id: string;
    title: string;
    body: string;
    sourceKeys: string[];
  }>;
  report?: unknown;
};

const DEFAULT_FORM: RealChartWorkbenchForm = {
  name: "Halleus Demo",
  birthDate: "1994-02-20",
  birthTime: "22:10",
  timezone: "Asia/Baku",
  placeName: "Baku",
  latitude: "40.4093",
  longitude: "49.8671",
};

const SIGN_LABELS: Record<string, string> = {
  aries: "حمل",
  taurus: "ثور",
  gemini: "جوزا",
  cancer: "سرطان",
  leo: "اسد",
  virgo: "سنبله",
  libra: "میزان",
  scorpio: "عقرب",
  sagittarius: "قوس",
  capricorn: "جدی",
  aquarius: "دلو",
  pisces: "حوت",
};

export function RealChartWorkbenchClient() {
  const [form, setForm] = useState<RealChartWorkbenchForm>(DEFAULT_FORM);
  const [result, setResult] = useState<RealChartWorkbenchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function updateField(field: keyof RealChartWorkbenchForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function generateRealChart() {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/engine/real-chart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
        }),
      });
      const payload = (await response.json()) as RealChartWorkbenchResponse;

      setResult(payload);
    } catch (error) {
      setResult({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not generate real chart.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#E7D8C7] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
              Real chart workbench
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
              چارت واقعی‌تر با astronomy-engine
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-8 text-[#6B5A4C]">
              این صفحه اولین خروجی قابل دیدن از engine واقعی‌تر است. جایگاه
              سیاره‌ها با astronomy-engine و Earth-centered ecliptic coordinates
              محاسبه می‌شود. Ascendant و خانه‌ها فعلاً scaffolding تقریبی هستند
              تا UI و report pipeline کامل دیده شود.
            </p>
          </div>

          <div className="rounded-full border border-[#D8C2AA] bg-[#FFF9F2] px-4 py-2 text-sm font-semibold text-[#6A4B35]">
            v0.1.54
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <WorkbenchInput label="نام" value={form.name} onChange={(value) => updateField("name", value)} />
          <WorkbenchInput label="تاریخ تولد" type="date" value={form.birthDate} onChange={(value) => updateField("birthDate", value)} />
          <WorkbenchInput label="ساعت تولد" type="time" value={form.birthTime} onChange={(value) => updateField("birthTime", value)} />
          <WorkbenchInput label="Timezone" value={form.timezone} onChange={(value) => updateField("timezone", value)} />
          <WorkbenchInput label="محل تولد" value={form.placeName} onChange={(value) => updateField("placeName", value)} />
          <WorkbenchInput label="Latitude" value={form.latitude} onChange={(value) => updateField("latitude", value)} />
          <WorkbenchInput label="Longitude" value={form.longitude} onChange={(value) => updateField("longitude", value)} />
        </div>

        <button
          type="button"
          onClick={generateRealChart}
          disabled={isLoading}
          className="mt-5 rounded-full bg-[#3E2F25] px-5 py-3 text-sm font-bold text-[#FFF9F2] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "در حال محاسبه..." : "محاسبه چارت واقعی‌تر"}
        </button>
      </section>

      {result?.ok === false ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-8 text-red-900">
          {result.error}
        </section>
      ) : null}

      {result?.ok && result.realChart ? (
        <>
          <section className="rounded-3xl border border-[#E7D8C7] bg-[#FFF9F2] p-5 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
                  Calculated chart
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
                  خروجی محاسبه‌شده
                </h2>
                <p className="mt-2 text-sm leading-8 text-[#6B5A4C]">
                  UTC: {result.realChart.utcIso} — ASC approx:{" "}
                  {formatChartDegree(result.realChart.ascendantLongitude)}
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-[#ECDCCB] bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F5E9DA] text-[#4A382C]">
                  <tr>
                    <th className="px-4 py-3">Body</th>
                    <th className="px-4 py-3">Sign</th>
                    <th className="px-4 py-3">Degree</th>
                    <th className="px-4 py-3">Longitude</th>
                  </tr>
                </thead>
                <tbody>
                  {result.realChart.placements.map((placement) => (
                    <tr key={placement.id} className="border-t border-[#F0E3D4]">
                      <td className="px-4 py-3 font-semibold text-[#3E2F25]">
                        {placement.label}
                      </td>
                      <td className="px-4 py-3 text-[#6B5A4C]">
                        {SIGN_LABELS[placement.signId] ?? placement.signId}
                      </td>
                      <td className="px-4 py-3 text-[#6B5A4C]">
                        {formatChartDegree(placement.degreeInSign)}
                      </td>
                      <td className="px-4 py-3 text-[#6B5A4C]">
                        {formatChartDegree(placement.longitude)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 rounded-2xl border border-[#ECDCCB] bg-white p-4">
              <p className="text-sm font-bold text-[#4A382C]">شفافیت فنی</p>
              <ul className="mt-2 space-y-2 text-sm leading-7 text-[#6B5A4C]">
                {result.realChart.calculationNotes.map((note) => (
                  <li key={note}>• {note}</li>
                ))}
              </ul>
            </div>
          </section>

          <ChartReportBridgePanel report={result.report} />

          <section className="rounded-3xl border border-[#E7D8C7] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
              Real chart report copy
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
              متن گزارش بر اساس همین چارت
            </h2>
            <div className="mt-5 space-y-4">
              {result.copyBlocks?.map((block) => (
                <article
                  key={block.id}
                  className="rounded-2xl border border-[#EFE2D2] bg-[#FFF9F2] p-4"
                >
                  <h3 className="font-bold text-[#4A382C]">{block.title}</h3>
                  <p className="mt-2 text-sm leading-8 text-[#6B5A4C]">{block.body}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function WorkbenchInput({
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

function formatChartDegree(value: number): string {
  return `${value.toFixed(2)}°`;
}
