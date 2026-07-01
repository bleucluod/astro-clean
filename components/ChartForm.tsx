"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { SafetyDisclaimer } from "@/components/SafetyDisclaimer";
import { parseJalaliDateInput } from "@/lib/date/jalali";
import { createMockReport } from "@/lib/astrology/mock-engine";
import { enrichReportWithRealEngineCopy } from "@/lib/astrology/real-engine-report-writer";
import type {
  AstrologyReport,
  BirthInput,
  RealEngineReportSnapshot,
} from "@/types/astro";
import type { GeneratedReportContract } from "@/types/report-generation";
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

const JALALI_MONTH_OPTIONS = [
  { value: "01", label: "فروردین" },
  { value: "02", label: "اردیبهشت" },
  { value: "03", label: "خرداد" },
  { value: "04", label: "تیر" },
  { value: "05", label: "مرداد" },
  { value: "06", label: "شهریور" },
  { value: "07", label: "مهر" },
  { value: "08", label: "آبان" },
  { value: "09", label: "آذر" },
  { value: "10", label: "دی" },
  { value: "11", label: "بهمن" },
  { value: "12", label: "اسفند" },
];

const JALALI_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);

const JALALI_YEAR_OPTIONS = Array.from({ length: 101 }, (_, index) =>
  String(1405 - index),
);

type JalaliBirthDateParts = {
  year: string;
  month: string;
  day: string;
};

const initialJalaliBirthDateParts: JalaliBirthDateParts = {
  year: "",
  month: "",
  day: "",
};

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
  } | null;
  chartReportEnrichment?: unknown;
  copyBlocks?: unknown[];
  report?: AstrologyReport | null;
  reportGeneration?: GeneratedReportContract | null;
  fallback?: {
    used: boolean;
    reason: string | null;
    safeUserMessage: string | null;
  };
};

type ReportWithGenerationContext = AstrologyReport & {
  chartReportEnrichment?: unknown;
  normalizedChart?: unknown;
  copyBlocks?: unknown[];
  reportGenerationStatus?: string;
  engineMetadata?: Record<string, unknown>;
};

type RealEngineRequestState = {
  status: "idle" | "loading" | "ready" | "error";
  message: string;
};

const initialRealEngineRequest: RealEngineRequestState = {
  status: "idle",
  message:
    "Halleus هنگام ساخت گزارش، محاسبه دقیق‌تر چارت را در پس‌زمینه انجام می‌دهد.",
};

function getSelectedJalaliDateInput(parts: JalaliBirthDateParts) {
  if (!parts.year || !parts.month || !parts.day) {
    return "";
  }

  return `${parts.year}/${parts.month}/${parts.day}`;
}

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

export function ChartForm() {
  const router = useRouter();
  const [form, setForm] = useState<BirthInput>(initialForm);
  const [birthDateParts, setBirthDateParts] = useState<JalaliBirthDateParts>(
    initialJalaliBirthDateParts,
  );
  const [birthDateMessage, setBirthDateMessage] = useState(
    "تاریخ تولد شمسی را با انتخاب سال، ماه و روز کامل کن.",
  );
  const [saveMessage, setSaveMessage] = useState("");
  const [realEngineRequest, setRealEngineRequest] =
    useState<RealEngineRequestState>(initialRealEngineRequest);

  const isRealEngineLoading = realEngineRequest.status === "loading";

  function updateField(field: keyof BirthInput, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateBirthDatePart(field: keyof JalaliBirthDateParts, value: string) {
    const nextBirthDateParts = {
      ...birthDateParts,
      [field]: value,
    };
    const selectedJalaliBirthDate = getSelectedJalaliDateInput(nextBirthDateParts);

    setBirthDateParts(nextBirthDateParts);
    updateField("birthDate", "");

    if (!selectedJalaliBirthDate) {
      setBirthDateMessage(
        "تاریخ تولد شمسی را با انتخاب سال، ماه و روز کامل کن.",
      );
      return;
    }

    const parsedBirthDate = parseJalaliDateInput(selectedJalaliBirthDate);

    setBirthDateMessage(
      parsedBirthDate.ok
        ? `تاریخ شمسی ${parsedBirthDate.normalizedJalali} برای محاسبه به ${parsedBirthDate.gregorianIso} تبدیل می‌شود.`
        : parsedBirthDate.message,
    );
  }

  function normalizeBirthForm() {
    const selectedJalaliBirthDate = getSelectedJalaliDateInput(birthDateParts);

    if (!selectedJalaliBirthDate) {
      throw new Error("تاریخ تولد شمسی را با انتخاب سال، ماه و روز کامل کن.");
    }

    const parsedBirthDate = parseJalaliDateInput(selectedJalaliBirthDate);

    if (!parsedBirthDate.ok) {
      throw new Error(parsedBirthDate.message);
    }

    setBirthDateMessage(
      `تاریخ شمسی ${parsedBirthDate.normalizedJalali} برای محاسبه به ${parsedBirthDate.gregorianIso} تبدیل شد.`,
    );

    const normalizedCityName = form.birthCity.trim() || initialForm.birthCity;
    const selectedCity = findIranCityByName(normalizedCityName);
    const fallbackCity =
      findIranCityByName(initialForm.birthCity) ?? IRAN_CITY_OPTIONS[0];

    if (!fallbackCity) {
      throw new Error("لیست شهرها برای محاسبه چارت در دسترس نیست.");
    }

    const engineCity = selectedCity ?? fallbackCity;

    const normalizedForm: BirthInput = {
      ...form,
      name: (form.name ?? "").trim(),
      birthDate: parsedBirthDate.gregorianIso,
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

  async function requestRealEngineReportData(
    normalizedForm: BirthInput,
    engineCity: IranCityOption,
  ) {
    setRealEngineRequest({
      status: "loading",
      message: "در حال محاسبه چارت و آماده‌سازی متن گزارش...",
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

      if (!response.ok && !payload.report) {
        throw new Error(
          payload.error ?? "محاسبه دقیق چارت برای این ورودی کامل نشد.",
        );
      }

      if (!payload.report && !payload.realChart) {
        throw new Error(
          payload.error ?? "سرویس گزارش در این لحظه خروجی قابل ذخیره نداد.",
        );
      }

      setRealEngineRequest({
        status: "ready",
        message: payload.realChart
          ? "محاسبه چارت کامل شد و گزارش سرویس در حال ذخیره شدن است."
          : payload.fallback?.safeUserMessage ??
            "گزارش با مسیر امن fallback ساخته شد و در حال ذخیره شدن است.",
      });

      return payload;
    } catch (error) {
      setRealEngineRequest({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "محاسبه دقیق در این لحظه کامل نشد.",
      });

      throw error;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage("");

    let normalizedBirth: ReturnType<typeof normalizeBirthForm>;

    try {
      normalizedBirth = normalizeBirthForm();
    } catch (error) {
      setRealEngineRequest({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "تاریخ تولد شمسی برای ساخت گزارش کامل نشد.",
      });
      return;
    }

    const { normalizedForm, engineCity } = normalizedBirth;
    let realEngineResult: RealChartApiResponse | null = null;

    try {
      realEngineResult = await requestRealEngineReportData(
        normalizedForm,
        engineCity,
      );
    } catch {
      // Keep the safe report save flow alive if the deeper chart calculation is unavailable.
    }

    const nextReport = buildReportForSave(
      normalizedForm,
      realEngineResult,
      engineCity,
    );

    await saveGeneratedReport(nextReport);
    notifyLocalDataChanged();

    setSaveMessage(
      nextReport.realEngine
        ? "گزارش تولد با سرویس تولید گزارش ساخته و ذخیره شد. تا چند لحظه دیگر صفحه جزئیات باز می‌شود."
        : "گزارش تولد با مسیر امن fallback ساخته و ذخیره شد. تا چند لحظه دیگر صفحه جزئیات باز می‌شود.",
    );

    router.push(`/reports/${nextReport.id}`);
  }

  return (
    <div className="grid chart-page">
      <section className="card">
        <span className="badge">شروع گزارش تولد</span>

        <h1>گزارش تولد فارسی، از همین فرم ساده</h1>

        <p>
          اطلاعات تولد را مرحله‌به‌مرحله وارد کن تا Halleus چارت تولد را محاسبه کند، متن فارسی
          گزارش را بسازد و نتیجه را در صفحه جزئیات ذخیره‌شده نشان بدهد. این مسیر برای شروع
          ساده طراحی شده: تاریخ شمسی، ساعت تولد و شهر تولد کافی است.
        </p>

        <div className="grid grid-3">
          <div className="mini-card">
            <strong>تاریخ شمسی</strong>
            <span>سال، ماه و روز را از picker انتخاب کن.</span>
          </div>

          <div className="mini-card">
            <strong>بدون انتخاب کشور</strong>
            <span>در این نسخه، محاسبه برای ایران تنظیم شده است.</span>
          </div>

          <div className="mini-card">
            <strong>خروجی ذخیره‌شده</strong>
            <span>بعد از submit مستقیم به صفحه گزارش می‌روی.</span>
          </div>
        </div>
      </section>

      <form className="card form" onSubmit={handleSubmit}>
        <div>
          <span className="badge">فرم ساخت گزارش</span>

          <h2>اطلاعات تولد</h2>

          <p>
            فرم را کامل کن و دکمه ساخت گزارش را بزن. تاریخ تولد در UI شمسی است، اما برای
            engine داخلی به Gregorian ISO تبدیل می‌شود. کشور در UI پرسیده نمی‌شود و مقدار داخلی
            آن برای سازگاری فعلی روی ایران می‌ماند.
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
            <span>تاریخ تولد شمسی</span>
            <div
              className="grid grid-3"
              role="group"
              aria-label="انتخاب تاریخ تولد شمسی"
            >
              <select
                required
                value={birthDateParts.year}
                onChange={(event) =>
                  updateBirthDatePart("year", event.target.value)
                }
                aria-label="سال تولد شمسی"
              >
                <option value="">سال</option>
                {JALALI_YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <select
                required
                value={birthDateParts.month}
                onChange={(event) =>
                  updateBirthDatePart("month", event.target.value)
                }
                aria-label="ماه تولد شمسی"
              >
                <option value="">ماه</option>
                {JALALI_MONTH_OPTIONS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>

              <select
                required
                value={birthDateParts.day}
                onChange={(event) =>
                  updateBirthDatePart("day", event.target.value)
                }
                aria-label="روز تولد شمسی"
              >
                <option value="">روز</option>
                {JALALI_DAY_OPTIONS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
            <small className="field-hint">{birthDateMessage}</small>
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
            <small className="field-hint">
              فعلاً شهرهای ایران پشتیبانی می‌شوند و کشور به‌صورت داخلی ایران ثبت می‌شود.
            </small>
          </label>
          <datalist id="iran-city-options">
            {IRAN_CITY_OPTIONS.map((city) => (
              <option key={city.id} value={getIranCityDisplayName(city)} />
            ))}
          </datalist>
        </div>

        <div className="actions">
          <button className="button" type="submit" disabled={isRealEngineLoading}>
            {isRealEngineLoading
              ? "در حال ساخت گزارش..."
              : "ساخت گزارش و مشاهده جزئیات"}
          </button>

          <Link className="button secondary" href="/reports">
            دیدن گزارش‌های ذخیره‌شده
          </Link>
        </div>

        {realEngineRequest.status === "loading" ||
        realEngineRequest.status === "error" ? (
          <p
            className={
              realEngineRequest.status === "error"
                ? "form-error-message"
                : "success-message"
            }
          >
            {realEngineRequest.message}
          </p>
        ) : null}

        {saveMessage ? <p className="success-message">{saveMessage}</p> : null}
      </form>

      <section className="card">
        <span className="badge">چه چیزی می‌گیری؟</span>

        <h2>یک گزارش قابل خواندن، نه فقط داده خام</h2>

        <div className="grid grid-3">
          <div className="mini-card">
            <strong>چارت محاسبه‌شده</strong>
            <span>داده‌های پایه برای ساخت گزارش تولد.</span>
          </div>

          <div className="mini-card">
            <strong>متن فارسی گزارش</strong>
            <span>خروجی آماده خواندن در صفحه جزئیات.</span>
          </div>

          <div className="mini-card">
            <strong>ذخیره برای ادامه مسیر</strong>
            <span>گزارش ساخته‌شده در بخش گزارش‌ها می‌ماند.</span>
          </div>
        </div>
      </section>

      <section className="card chart-final-flow-card">
        <span className="badge">مسیر ساده ساخت گزارش</span>

        <h2>از فرم تا گزارش، در یک قدم</h2>

        <p>
          این صفحه دیگر پیش‌نمایش آزمایشگاهی نشان نمی‌دهد. گزارش اصلی بعد از ثبت فرم ساخته، ذخیره
          و در صفحه جزئیات باز می‌شود تا تجربه کاربر شبیه یک محصول نهایی باشد.
        </p>

        <div className="grid grid-3">
          <div className="mini-card">
            <strong>۱. ورود اطلاعات</strong>
            <span>تاریخ، ساعت، شهر</span>
          </div>

          <div className="mini-card">
            <strong>۲. محاسبه پشت صحنه</strong>
            <span>چارت و متن فارسی</span>
          </div>

          <div className="mini-card">
            <strong>۳. گزارش ذخیره‌شده</strong>
            <span>صفحه جزئیات</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function buildReportForSave(
  normalizedForm: BirthInput,
  payload: RealChartApiResponse | null,
  engineCity: IranCityOption,
): AstrologyReport {
  if (payload?.report) {
    return attachReportGenerationContext(payload.report, payload);
  }

  return buildLocalFallbackReport(normalizedForm, payload, engineCity);
}

function attachReportGenerationContext(
  report: AstrologyReport,
  payload: RealChartApiResponse,
): AstrologyReport {
  const generation = payload.reportGeneration;

  if (!generation) {
    return report;
  }

  const engineData = generation.engineData;
  const chartReportEnrichment =
    engineData.chartReportEnrichment ?? payload.chartReportEnrichment ?? null;
  const normalizedChart = engineData.normalizedChart ?? null;
  const copyBlocks = engineData.copyBlocks ?? payload.copyBlocks ?? [];

  return {
    ...report,
    chartReportEnrichment,
    normalizedChart,
    copyBlocks,
    reportGenerationStatus: generation.status,
    engineMetadata: {
      source: engineData.source,
      status: generation.status,
      generatedAt: generation.generatedAt,
      realEngineSnapshot: engineData.realEngineSnapshot ?? report.realEngine ?? null,
      chartReportEnrichment,
      normalizedChart,
      copyBlocks,
      limitations: engineData.limitations,
      warnings: engineData.warnings,
    },
  } as ReportWithGenerationContext;
}

function buildLocalFallbackReport(
  normalizedForm: BirthInput,
  payload: RealChartApiResponse | null,
  engineCity: IranCityOption,
): AstrologyReport {
  const baseReport = enhanceReportOutputV2(createMockReport(normalizedForm));

  return attachRealEngineSnapshotToReport(baseReport, payload, engineCity);
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
      "این داده محاسبه‌شده از همان تاریخ، ساعت و شهر تولد ساخته شده و برای خوانش فارسی گزارش ذخیره شده است.",
  };

  return enrichReportWithRealEngineCopy(
    {
      ...report,
      realEngine,
    },
    realEngine,
  );
}
