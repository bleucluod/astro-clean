"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ReportCard } from "@/components/ReportCard";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { createMockReport } from "@/lib/astrology/mock-engine";
import type {
  AstrologyReport,
  BirthInput,
  RealEngineReportSnapshot,
} from "@/types/astro";
import {
  IRAN_CITY_OPTIONS,
  findIranCityByName,
  getIranCityDisplayName,
} from "@/lib/locations/iran-cities";
import { saveGeneratedReport } from "@/lib/storage/report-write-service";
import { enhanceReportOutputV2 } from "@/lib/report-output/report-v2";

const initialForm: BirthInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  birthCity: "تهران",
  birthCountry: "ایران",
};

const todayIsoDate = new Date().toISOString().slice(0, 10);

type IranCityOption = (typeof IRAN_CITY_OPTIONS)[number];

type RealEnginePlacement = {
  id: string;
  label: string;
  longitude: number;
  signId: RealEngineReportSnapshot["placements"][number]["signId"];
  degreeInSign: number;
  method: string;
};

type RealChartApiResponse = {
  ok: boolean;
  error?: string;
  realChart?: {
    utcIso: string;
    ascendantLongitude: number;
    calculationNotes: string[];
    placements: RealEnginePlacement[];
  };
};

type RealEngineBridgeState =
  | {
      status: "idle";
      message: string;
    }
  | {
      status: "loading";
      message: string;
    }
  | {
      status: "ready";
      message: string;
      cityLabel: string;
      utcIso: string;
      ascendantLongitude: number;
      placements: RealEnginePlacement[];
    }
  | {
      status: "error";
      message: string;
    };

const initialRealEngineBridge: RealEngineBridgeState = {
  status: "idle",
  message:
    "همین فرم و همین شهرها می‌توانند قبل از ساخت گزارش، engine واقعی‌تر را هم صدا بزنند.",
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

const SIGN_LABELS_FA: Record<string, string> = {
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

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

export function ChartForm() {
  const router = useRouter();
  const [form, setForm] = useState<BirthInput>(initialForm);
  const [report, setReport] = useState<AstrologyReport | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [realEngineBridge, setRealEngineBridge] =
    useState<RealEngineBridgeState>(initialRealEngineBridge);

  const isRealEngineLoading = realEngineBridge.status === "loading";

  function updateField(field: keyof BirthInput, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function normalizeBirthForm() {
    const normalizedCityName = form.birthCity.trim() || initialForm.birthCity;
    const selectedCity = findIranCityByName(normalizedCityName);
    const fallbackCity =
      findIranCityByName(initialForm.birthCity) ?? IRAN_CITY_OPTIONS[0];

    if (!fallbackCity) {
      throw new Error("لیست شهرها برای محاسبه real engine در دسترس نیست.");
    }

    const engineCity = selectedCity ?? fallbackCity;

    const normalizedForm: BirthInput = {
      ...form,
      name: (form.name ?? "").trim(),
      birthCity: selectedCity?.faName ?? normalizedCityName,
      birthCountry: initialForm.birthCountry,
      birthCityId: selectedCity?.id,
      birthLatitude: selectedCity?.latitude,
      birthLongitude: selectedCity?.longitude,
      birthTimezone: selectedCity?.timezone,
    };

    return {
      normalizedForm,
      engineCity,
    };
  }

  async function requestRealEnginePreview(
    normalizedForm: BirthInput,
    engineCity: IranCityOption,
    mode: "preview" | "submit",
  ) {
    setRealEngineBridge({
      status: "loading",
      message:
        mode === "preview"
          ? "در حال محاسبه real engine با همین تاریخ، ساعت و شهر..."
          : "در حال اتصال ورودی فرم به real engine قبل از ساخت گزارش...",
    });

    try {
      const response = await fetch("/api/engine/real-chart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedForm.name || "Halleus User",
          birthDate: normalizedForm.birthDate,
          birthTime: normalizedForm.birthTime,
          timezone: engineCity.timezone,
          placeName: getIranCityDisplayName(engineCity),
          latitude: engineCity.latitude,
          longitude: engineCity.longitude,
        }),
      });

      const payload = (await response.json()) as RealChartApiResponse;

      if (!response.ok || !payload.ok || !payload.realChart) {
        throw new Error(
          payload.error ?? "Real engine نتوانست چارت را از این ورودی بسازد.",
        );
      }

      setRealEngineBridge({
        status: "ready",
        message:
          mode === "preview"
            ? "Real engine با همین فرم و شهر انتخاب‌شده پاسخ داد."
            : "Real engine قبل از ساخت گزارش از همین ورودی صدا زده شد.",
        cityLabel: getIranCityDisplayName(engineCity),
        utcIso: payload.realChart.utcIso,
        ascendantLongitude: payload.realChart.ascendantLongitude,
        placements: payload.realChart.placements,
      });

      return payload;
    } catch (error) {
      setRealEngineBridge({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Real engine در این مرحله پاسخ نداد.",
      });

      throw error;
    }
  }

  async function handlePreviewRealEngine() {
    setSaveMessage("");

    if (!form.birthDate || !form.birthTime) {
      setRealEngineBridge({
        status: "error",
        message:
          "برای پیش‌نمایش real engine، اول تاریخ تولد و ساعت تولد را وارد کن.",
      });
      return;
    }

    try {
      const { normalizedForm, engineCity } = normalizeBirthForm();
      await requestRealEnginePreview(normalizedForm, engineCity, "preview");
    } catch {
      // The visible bridge state already contains the useful error message.
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage("");

    const { normalizedForm, engineCity } = normalizeBirthForm();
    let realEngineResult: RealChartApiResponse | null = null;

    try {
      realEngineResult = await requestRealEnginePreview(
        normalizedForm,
        engineCity,
        "submit",
      );
    } catch {
      // Keep the old safe save flow alive while the real report pipeline is being merged.
    }

    const baseReport = enhanceReportOutputV2(createMockReport(normalizedForm));
    const nextReport = attachRealEngineSnapshotToReport(
      baseReport,
      realEngineResult,
      engineCity,
    );

    await saveGeneratedReport(nextReport);
    notifyLocalDataChanged();

    setReport(nextReport);
    setSaveMessage(
      nextReport.realEngine
        ? "گزارش ساخته و ذخیره شد. داده real engine هم داخل گزارش ذخیره شد. در حال انتقال به صفحه جزئیات..."
        : "گزارش ساخته و ذخیره شد. real engine در این لحظه پاسخ نداد، اما مسیر امن MVP حفظ شد. در حال انتقال به صفحه جزئیات...",
    );

    router.push(`/reports/${nextReport.id}`);
  }

  return (
    <div className="grid chart-page">
      <form className="card form" onSubmit={handleSubmit}>
        <div>
          <span className="badge">فرم MVP</span>

          <h1>ساخت چارت تولد</h1>

          <p>
            اطلاعات تولد را وارد کن تا یک گزارش نمادین فارسی ساخته شود. همین
            فرم حالا می‌تواند real engine را هم با تاریخ، ساعت و شهر انتخاب‌شده
            صدا بزند؛ اگر engine پاسخ بدهد، داده‌های واقعی‌تر داخل گزارش
            ذخیره‌شده هم ثبت می‌شود.
          </p>

          <SafetyDisclaimer compact />
        </div>

        <div className="form-grid">
          <label className="field">
            <span>نام اختیاری</span>
            <input
              autoComplete="name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="مثلاً آراز"
            />
          </label>

          <label className="field">
            <span>تاریخ تولد</span>
            <input
              required
              type="date"
              max={todayIsoDate}
              autoComplete="bday"
              value={form.birthDate}
              onChange={(event) => updateField("birthDate", event.target.value)}
            />
          </label>

          <label className="field">
            <span>ساعت تولد</span>
            <input
              required
              type="time"
              value={form.birthTime}
              onChange={(event) => updateField("birthTime", event.target.value)}
            />
          </label>

          <label className="field">
            <span>شهر تولد</span>
            <input
              required
              autoComplete="address-level2"
              value={form.birthCity}
              onChange={(event) => updateField("birthCity", event.target.value)}
              placeholder="مثلاً تهران"
              list="iran-city-options"
            />
          </label>
          <datalist id="iran-city-options">
            {IRAN_CITY_OPTIONS.map((city) => (
              <option key={city.id} value={getIranCityDisplayName(city)} />
            ))}
          </datalist>

          <label className="field">
            <span>کشور</span>
            <input
              required
              readOnly
              autoComplete="country-name"
              value={form.birthCountry}
              onChange={(event) =>
                updateField("birthCountry", event.target.value)
              }
              placeholder="مثلاً ایران"
            />
          </label>
        </div>

        <div className="actions">
          <button className="button" type="submit">
            ساخت گزارش و رفتن به جزئیات
          </button>

          <button
            className="button secondary"
            type="button"
            disabled={isRealEngineLoading}
            onClick={handlePreviewRealEngine}
          >
            {isRealEngineLoading
              ? "در حال محاسبه..."
              : "پیش‌نمایش real engine"}
          </button>

          <Link className="button secondary" href="/reports">
            دیدن گزارش‌های ذخیره‌شده
          </Link>
        </div>

        {saveMessage ? <p className="success-message">{saveMessage}</p> : null}
      </form>

      {report ? (
        <div className="grid">
          <ReportCard report={report} />
          <RealEngineBridgePreview preview={realEngineBridge} />
        </div>
      ) : (
        <div className="card">
          <span className="badge">پیش‌نمایش خروجی</span>

          <h2>گزارش اینجا ساخته می‌شود</h2>

          <p>
            بعد از ثبت فرم، Halleus گزارش ذخیره‌شونده را می‌سازد؛ حالا اگر
            real engine پاسخ بدهد، snapshot جایگاه‌های واقعی‌تر هم همراه گزارش
            ذخیره می‌شود.
          </p>

          <div className="grid grid-3">
            <div className="mini-card">
              <strong>فرم</strong>
              <span>اصلی</span>
            </div>

            <div className="mini-card">
              <strong>شهرها</strong>
              <span>حفظ‌شده</span>
            </div>

            <div className="mini-card">
              <strong>گزارش</strong>
              <span>real snapshot</span>
            </div>
          </div>

          <RealEngineBridgePreview preview={realEngineBridge} />
        </div>
      )}
    </div>
  );
}

function attachRealEngineSnapshotToReport(
  report: AstrologyReport,
  payload: RealChartApiResponse | null,
  engineCity: IranCityOption,
): AstrologyReport {
  if (!payload?.ok || !payload.realChart) {
    return report;
  }

  const realEngine: RealEngineReportSnapshot = {
    version: "real-engine-preview-v1",
    generatedAt: new Date().toISOString(),
    cityLabel: getIranCityDisplayName(engineCity),
    utcIso: payload.realChart.utcIso,
    ascendantLongitude: payload.realChart.ascendantLongitude,
    placements: payload.realChart.placements,
    note:
      "این snapshot از real engine با همان ورودی فرم اصلی ساخته شده است. گزارش متنی هنوز در حال مهاجرت مرحله‌ای از mock به engine واقعی‌تر است.",
  };

  return {
    ...report,
    realEngine,
  };
}

function RealEngineBridgePreview({
  preview,
}: {
  preview: RealEngineBridgeState;
}) {
  const ready = preview.status === "ready";
  const placements = ready ? preview.placements.slice(0, 6) : [];

  return (
    <div className="mini-card">
      <strong>محاسبه واقعی‌تر با همین فرم</strong>
      <span>{preview.message}</span>

      {preview.status === "loading" ? (
        <p>در حال ارسال تاریخ، ساعت و شهر به real engine...</p>
      ) : null}

      {preview.status === "error" ? (
        <p className="success-message">{preview.message}</p>
      ) : null}

      {ready ? (
        <div className="grid">
          <div className="grid grid-3">
            <div className="mini-card">
              <strong>شهر engine</strong>
              <span>{preview.cityLabel}</span>
            </div>

            <div className="mini-card">
              <strong>ASC approx</strong>
              <span>{formatDegree(preview.ascendantLongitude)}</span>
            </div>

            <div className="mini-card">
              <strong>UTC</strong>
              <span>{preview.utcIso}</span>
            </div>
          </div>

          <div className="grid">
            {placements.map((placement) => (
              <div className="mini-card" key={placement.id}>
                <strong>{PLANET_LABELS_FA[placement.id] ?? placement.label}</strong>
                <span>
                  {SIGN_LABELS_FA[placement.signId] ?? placement.signId} —{" "}
                  {formatDegree(placement.degreeInSign)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatDegree(value: number) {
  return `${value.toFixed(2)}°`;
}
