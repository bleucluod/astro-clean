"use client";

import { useState } from "react";
import { ChartReportBridgePanel } from "./ChartReportBridgePanel";
import { RealChartAspectPanel } from "./RealChartAspectPanel";
import { RealChartWheel } from "./RealChartWheel";

type RealChartWorkbenchForm = {
  name: string;
  birthDate: string;
  birthTime: string;
  timezone: string;
  placeName: string;
  latitude: string;
  longitude: string;
};

type RealChartPlacement = {
  id: string;
  label: string;
  longitude: number;
  signId: string;
  degreeInSign: number;
  method: string;
};

type RealChartWorkbenchResponse = {
  ok: boolean;
  error?: string;
  realChart?: {
    version: string;
    utcIso: string;
    ascendantLongitude: number;
    calculationNotes: string[];
    placements: RealChartPlacement[];
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

const PLANET_LABELS_FA: Record<string, string> = {
  sun: "خورشید",
  moon: "ماه",
  mercury: "عطارد",
  venus: "زهره",
  mars: "مریخ",
  jupiter: "مشتری",
  saturn: "زحل",
  uranus: "اورانوس",
  neptune: "نپتون",
  pluto: "پلوتو",
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

  const primaryPlacements = result?.realChart?.placements.slice(0, 6) ?? [];
  const secondaryPlacements = result?.realChart?.placements.slice(6) ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-[#E7D8C7] bg-white p-5 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
              Real chart workbench
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#3E2F25]">
              چارت واقعی‌تر با astronomy-engine
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[#6B5A4C]">
              اینجا دیگر فقط preview نیست: داده تولد وارد می‌شود، engine موقعیت
              سیاره‌ها را حساب می‌کند، نتیجه به report bridge وصل می‌شود و متن
              فارسی گزارش از همان چارت ساخته می‌شود.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ProductPill title="Real calculation" body="سیاره‌ها از API واقعی engine می‌آیند." />
              <ProductPill title="Aspect-aware" body="روابط اصلی سیاره‌ها هم محاسبه می‌شود." />
              <ProductPill title="Report-ready" body="خروجی به متن فارسی وصل است." />
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[#EFE2D2] bg-[#FFF9F2] p-4">
            <p className="text-sm font-bold text-[#4A382C]">ورودی سریع تست</p>
            <p className="mt-1 text-xs leading-6 text-[#7A695A]">
              برای تست سریع می‌توانی همین مقدارهای پیش‌فرض Baku را نگه داری.
            </p>

            <div className="mt-4 grid gap-3">
              <WorkbenchInput label="نام" value={form.name} onChange={(value) => updateField("name", value)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <WorkbenchInput label="تاریخ تولد" type="date" value={form.birthDate} onChange={(value) => updateField("birthDate", value)} />
                <WorkbenchInput label="ساعت تولد" type="time" value={form.birthTime} onChange={(value) => updateField("birthTime", value)} />
              </div>
              <WorkbenchInput label="Timezone" value={form.timezone} onChange={(value) => updateField("timezone", value)} />
              <WorkbenchInput label="محل تولد" value={form.placeName} onChange={(value) => updateField("placeName", value)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <WorkbenchInput label="Latitude" value={form.latitude} onChange={(value) => updateField("latitude", value)} />
                <WorkbenchInput label="Longitude" value={form.longitude} onChange={(value) => updateField("longitude", value)} />
              </div>
            </div>

            <button
              type="button"
              onClick={generateRealChart}
              disabled={isLoading}
              className="mt-5 w-full rounded-full bg-[#3E2F25] px-5 py-3 text-sm font-bold text-[#FFF9F2] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "در حال محاسبه..." : "محاسبه چارت واقعی‌تر"}
            </button>
          </div>
        </div>
      </section>

      {result?.ok === false ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm leading-8 text-red-900">
          {result.error}
        </section>
      ) : null}

      {result?.ok && result.realChart ? (
        <>
          <section className="rounded-[2rem] border border-[#E7D8C7] bg-[#3E2F25] p-5 text-[#FFF9F2] shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9B58C]">
              Calculation complete
            </p>
            <h2 className="mt-2 text-2xl font-bold">چارت محاسبه شد</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <ResultMetric label="UTC" value={result.realChart.utcIso} />
              <ResultMetric
                label="ASC approx"
                value={formatChartDegree(result.realChart.ascendantLongitude)}
              />
              <ResultMetric
                label="Placements"
                value={`${result.realChart.placements.length} bodies`}
              />
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <RealChartWheel
              placements={result.realChart.placements}
              ascendantLongitude={result.realChart.ascendantLongitude}
            />

            <section className="rounded-[2rem] border border-[#E7D8C7] bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
                Planet cards
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
                جایگاه‌های اصلی
              </h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {primaryPlacements.map((placement) => (
                  <PlanetPlacementCard key={placement.id} placement={placement} />
                ))}
              </div>

              <details className="mt-4 rounded-2xl border border-[#EFE2D2] bg-[#FFF9F2] p-4">
                <summary className="cursor-pointer text-sm font-bold text-[#4A382C]">
                  سیاره‌های بیرونی و جزئیات بیشتر
                </summary>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {secondaryPlacements.map((placement) => (
                    <PlanetPlacementCard key={placement.id} placement={placement} compact />
                  ))}
                </div>
              </details>
            </section>
          </div>

          <RealChartAspectPanel placements={result.realChart.placements} />

          <section className="rounded-[2rem] border border-[#E7D8C7] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
              Technical transparency
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
              شفافیت محاسبه
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.realChart.calculationNotes.map((note) => (
                <div
                  key={note}
                  className="rounded-2xl border border-[#EFE2D2] bg-[#FFF9F2] p-4 text-sm leading-8 text-[#6B5A4C]"
                >
                  {note}
                </div>
              ))}
            </div>
          </section>

          <ChartReportBridgePanel report={result.report} />

          <section className="rounded-[2rem] border border-[#E7D8C7] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
              Real chart report copy
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
              متن گزارش بر اساس همین چارت
            </h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {result.copyBlocks?.map((block) => (
                <article
                  key={block.id}
                  className="rounded-[1.5rem] border border-[#EFE2D2] bg-[#FFF9F2] p-5"
                >
                  <h3 className="font-bold text-[#4A382C]">{block.title}</h3>
                  <p className="mt-3 text-sm leading-8 text-[#6B5A4C]">{block.body}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function ProductPill({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[#EFE2D2] bg-[#FFF9F2] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#9A6B45]">
        {title}
      </p>
      <p className="mt-2 text-xs leading-6 text-[#6B5A4C]">{body}</p>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#D9B58C]/30 bg-[#FFF9F2]/10 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D9B58C]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-[#FFF9F2]">
        {value}
      </p>
    </div>
  );
}

function PlanetPlacementCard({
  placement,
  compact = false,
}: {
  placement: RealChartPlacement;
  compact?: boolean;
}) {
  const signLabel = SIGN_LABELS[placement.signId] ?? placement.signId;

  return (
    <article className="rounded-[1.5rem] border border-[#EFE2D2] bg-[#FFF9F2] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6B45]">
            {placement.label}
          </p>
          <h3 className="mt-1 text-lg font-bold text-[#3E2F25]">
            {PLANET_LABELS_FA[placement.id] ?? placement.label}
          </h3>
        </div>
        <span className="rounded-full border border-[#D8C2AA] bg-white px-3 py-1 text-xs font-bold text-[#6A4B35]">
          {signLabel}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl bg-white p-3">
          <p className="text-xs text-[#8A6A51]">درجه در برج</p>
          <p className="mt-1 font-bold text-[#3E2F25]">
            {formatChartDegree(placement.degreeInSign)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-3">
          <p className="text-xs text-[#8A6A51]">Longitude</p>
          <p className="mt-1 font-bold text-[#3E2F25]">
            {formatChartDegree(placement.longitude)}
          </p>
        </div>
      </div>
      {!compact ? (
        <p className="mt-3 text-xs leading-6 text-[#7A695A]">
          این جایگاه به متن گزارش و bridge panel متصل است.
        </p>
      ) : null}
    </article>
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
