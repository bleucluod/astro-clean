"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
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
import { saveGeneratedReportWithAccountFallback } from "@/lib/storage/account-report-save-client";
import { enhanceReportOutputV2 } from "@/lib/report-output/report-v2";

const initialForm: BirthInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  birthCity: "",
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

const UNKNOWN_BIRTH_TIME = "12:00";
const MAX_CITY_SUGGESTIONS = 5;

type BirthDateMode = "jalali" | "gregorian";
type BirthTimeMode = "known" | "unknown";

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
  message: "فرم آماده است.",
};

function getSelectedJalaliDateInput(parts: JalaliBirthDateParts) {
  if (!parts.year || !parts.month || !parts.day) {
    return "";
  }

  return `${parts.year}/${parts.month}/${parts.day}`;
}

function isGregorianDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeCitySearch(value: string) {
  return value.trim().toLocaleLowerCase("fa-IR");
}

function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

export function ChartForm() {
  const router = useRouter();
  const [form, setForm] = useState<BirthInput>(initialForm);
  const [dateMode, setDateMode] = useState<BirthDateMode>("jalali");
  const [birthDateParts, setBirthDateParts] = useState<JalaliBirthDateParts>(
    initialJalaliBirthDateParts,
  );
  const [gregorianBirthDate, setGregorianBirthDate] = useState("");
  const [birthTimeMode, setBirthTimeMode] = useState<BirthTimeMode>("known");
  const [saveMessage, setSaveMessage] = useState("");
  const [realEngineRequest, setRealEngineRequest] =
    useState<RealEngineRequestState>(initialRealEngineRequest);

  const isRealEngineLoading = realEngineRequest.status === "loading";

  const citySuggestions = useMemo(() => {
    const query = normalizeCitySearch(form.birthCity);

    if (!query) {
      return [];
    }

    return IRAN_CITY_OPTIONS.filter((city) => {
      const cityName = normalizeCitySearch(city.faName);
      const cityDisplayName = normalizeCitySearch(getIranCityDisplayName(city));

      return cityName.includes(query) || cityDisplayName.includes(query);
    }).slice(0, MAX_CITY_SUGGESTIONS);
  }, [form.birthCity]);

  function updateField(field: keyof BirthInput, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateDateMode(nextMode: BirthDateMode) {
    setDateMode(nextMode);
    setSaveMessage("");
  }

  function updateBirthDatePart(field: keyof JalaliBirthDateParts, value: string) {
    const nextBirthDateParts = {
      ...birthDateParts,
      [field]: value,
    };

    setBirthDateParts(nextBirthDateParts);
    updateField("birthDate", "");
  }

  function updateGregorianBirthDate(value: string) {
    setGregorianBirthDate(value);
    updateField("birthDate", value);
  }

  function updateBirthTimeMode(nextMode: BirthTimeMode) {
    setBirthTimeMode(nextMode);

    if (nextMode === "unknown") {
      updateField("birthTime", "");
    }
  }

  function normalizeBirthForm() {
    let normalizedBirthDate = "";

    if (dateMode === "jalali") {
      const selectedJalaliBirthDate = getSelectedJalaliDateInput(birthDateParts);

      if (!selectedJalaliBirthDate) {
        throw new Error("تاریخ تولد را کامل کن.");
      }

      const parsedBirthDate = parseJalaliDateInput(selectedJalaliBirthDate);

      if (!parsedBirthDate.ok) {
        throw new Error(parsedBirthDate.message);
      }

      normalizedBirthDate = parsedBirthDate.gregorianIso;
    } else {
      const selectedGregorianBirthDate = gregorianBirthDate.trim();

      if (!selectedGregorianBirthDate) {
        throw new Error("تاریخ میلادی تولد را وارد کن.");
      }

      if (!isGregorianDateInput(selectedGregorianBirthDate)) {
        throw new Error("تاریخ میلادی باید کامل باشد.");
      }

      normalizedBirthDate = selectedGregorianBirthDate;
    }

    const normalizedCityName = form.birthCity.trim();

    if (!normalizedCityName) {
      throw new Error("شهر تولد را بنویس یا از پیشنهادها انتخاب کن.");
    }

    const selectedCity = findIranCityByName(normalizedCityName);

    if (!selectedCity) {
      throw new Error("فعلاً این شهر در فهرست ایران پیدا نشد. یکی از پیشنهادهای کوتاه را انتخاب کن.");
    }

    const normalizedBirthTime =
      birthTimeMode === "unknown" ? UNKNOWN_BIRTH_TIME : form.birthTime.trim();

    if (!normalizedBirthTime) {
      throw new Error("ساعت تولد را وارد کن یا گزینه «نمی‌دانم» را بزن.");
    }

    const normalizedForm: BirthInput = {
      ...form,
      name: (form.name ?? "").trim(),
      birthDate: normalizedBirthDate,
      birthTime: normalizedBirthTime,
      birthCity: selectedCity.faName,
      birthCountry: initialForm.birthCountry,
      birthCityId: selectedCity.id,
      birthLatitude: selectedCity.latitude,
      birthLongitude: selectedCity.longitude,
      birthTimezone: selectedCity.timezone,
    };

    return {
      normalizedForm,
      engineCity: selectedCity,
    };
  }

  async function requestRealEngineReportData(
    normalizedForm: BirthInput,
    engineCity: IranCityOption,
  ) {
    setRealEngineRequest({
      status: "loading",
      message: "چارت تولد در حال محاسبه است؛ گزارش بعد از ذخیره باز می‌شود.",
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
          payload.error ?? "محاسبه چارت برای این ورودی کامل نشد.",
        );
      }

      if (!payload.report && !payload.realChart) {
        throw new Error(
          payload.error ?? "سرویس گزارش در این لحظه خروجی قابل ذخیره نداد.",
        );
      }

      setRealEngineRequest({
        status: "ready",
        message: "چارت آماده شد؛ گزارش در حال ذخیره و باز شدن است.",
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
            : "اطلاعات تولد برای ساخت گزارش کامل نیست.",
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

    const saveResult = await saveGeneratedReportWithAccountFallback(nextReport);
    notifyLocalDataChanged();

    if (saveResult.accountStatus === "account-saved") {
      setSaveMessage(
        "گزارش خصوصی در حساب ذخیره شد؛ نسخه local-preview هم برای fallback باقی ماند.",
      );
    } else if (saveResult.accountStatus === "not-authenticated") {
      setSaveMessage(
        "گزارش روی همین دستگاه ذخیره شد؛ برای ذخیره حساب، اول وارد شو.",
      );
    } else {
      setSaveMessage(
        "گزارش روی همین دستگاه ذخیره شد؛ ذخیره حساب فعلاً guard شده یا کامل نیست.",
      );
    }

    router.push(`/reports/${saveResult.localRecord.id}`);
  }

  return (
    <div className="grid chart-page chart-app-flow-page">
      <section className="card chart-app-hero">
        <span className="badge">ساخت گزارش تولد</span>

        <div className="chart-app-hero-content">
          <h1>اطلاعات تولد</h1>
          <p>
            چند داده اصلی کافی است؛ هالیوس چارت را می‌خواند و گزارش فارسی را
            همان‌جا برایت باز می‌کند.
          </p>
        </div>

        <div className="chart-app-chip-row" aria-label="ویژگی‌های مسیر ساخت گزارش">
          <span>چارت واقعی</span>
          <span>شمسی یا میلادی</span>
          <span>ساعت نامعلوم</span>
          <span>ذخیره خصوصی</span>
        </div>
      </section>

      <section className="card" aria-labelledby="beta-readiness-smoke-title">
        <span className="badge">Beta readiness smoke</span>
        <h2 id="beta-readiness-smoke-title">مسیر تست بتا قبل از ساخت گزارش</h2>
        <p>
          این نسخه برای تست محدود آماده می‌شود: گزارش بساز، صفحه جزئیات را
          بخوان، اگر وارد حساب هستی ذخیره account را چک کن و در پایان از
          dashboard یا reports دوباره برگرد.
        </p>

        <div className="home-step-list" data-check="BETA_READINESS_SMOKE">
          <div>
            <strong>۱. ساخت</strong>
            <span>از همین فرم گزارش را بساز؛ اگر محاسبه real chart کامل نشد، fallback امن هنوز گزارش را باز می‌کند.</span>
          </div>

          <div>
            <strong>۲. خواندن</strong>
            <span>صفحه جزئیات باید نقشه سریع خواندن، سه چراغ اعتماد و یادداشت قابل برگشت را نشان بدهد.</span>
          </div>

          <div>
            <strong>۳. برگشت</strong>
            <span>بعد از خواندن، برگشت به dashboard، local reports و account reports باید واضح باشد.</span>
          </div>
        </div>
      </section>
      <form className="card form chart-form-card" onSubmit={handleSubmit}>
        <div className="chart-form-header">
          <div>
            <span className="section-label">اطلاعات تولد</span>
            <h2>ورودی‌های اصلی</h2>
          </div>

          <SafetyDisclaimer compact />
        </div>

        <div className="form-grid chart-form-grid">
          <label className="field">
            <span>نام</span>
            <input
              autoComplete="name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="نامت را بنویس — اختیاری"
            />
          </label>

          <div className="field field-wide">
            <div className="field-title-row">
              <span>تاریخ تولد</span>

              <div className="date-mode-switch" aria-label="نوع تاریخ تولد">
                <button
                  type="button"
                  className={
                    dateMode === "jalali"
                      ? "date-mode-button is-active"
                      : "date-mode-button"
                  }
                  aria-pressed={dateMode === "jalali"}
                  onClick={() => updateDateMode("jalali")}
                >
                  شمسی
                </button>

                <button
                  type="button"
                  className={
                    dateMode === "gregorian"
                      ? "date-mode-button is-active"
                      : "date-mode-button"
                  }
                  aria-pressed={dateMode === "gregorian"}
                  onClick={() => updateDateMode("gregorian")}
                >
                  میلادی
                </button>
              </div>
            </div>

            {dateMode === "jalali" ? (
              <div
                className="birth-date-picker-grid"
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
            ) : (
              <input
                required
                type="date"
                value={gregorianBirthDate}
                onChange={(event) => updateGregorianBirthDate(event.target.value)}
                aria-label="تاریخ تولد میلادی"
              />
            )}
          </div>

          <label className="field">
            <span>ساعت تولد</span>
            <div className="time-choice-row time-choice-row-mobile">
              <input
                className="birth-time-input"
                required={birthTimeMode === "known"}
                type="time"
                value={birthTimeMode === "known" ? form.birthTime : ""}
                disabled={birthTimeMode === "unknown"}
                onChange={(event) => updateField("birthTime", event.target.value)}
                aria-label="ساعت تولد"
              />

              <button
                type="button"
                className={
                  birthTimeMode === "unknown"
                    ? "time-unknown-button is-active"
                    : "time-unknown-button"
                }
                aria-pressed={birthTimeMode === "unknown"}
                onClick={() =>
                  updateBirthTimeMode(
                    birthTimeMode === "unknown" ? "known" : "unknown",
                  )
                }
              >
                نمی‌دانم
              </button>
            </div>

            {birthTimeMode === "unknown" ? (
              <small className="field-hint">
                اگر ساعت دقیق را نمی‌دانی، با ساعت میانی روز شروع می‌کنیم.
              </small>
            ) : null}
          </label>

          <label className="field">
            <span>شهر تولد</span>
            <input
              required
              autoComplete="address-level2"
              value={form.birthCity}
              onChange={(event) => updateField("birthCity", event.target.value)}
              placeholder="شهر تولد را بنویس"
            />
          </label>

          {citySuggestions.length > 0 ? (
            <div
              className="city-suggestion-chips"
              aria-label="پیشنهادهای شهر تولد"
            >
              {citySuggestions.map((city) => (
                <button
                  key={city.id}
                  type="button"
                  className="city-suggestion-chip"
                  onClick={() => updateField("birthCity", city.faName)}
                >
                  {getIranCityDisplayName(city)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="actions chart-form-actions">
          <button className="button" type="submit" disabled={isRealEngineLoading}>
            {isRealEngineLoading ? "در حال ساخت گزارش..." : "ساخت، ذخیره و باز کردن گزارش"}
          </button>

          <Link className="button secondary" href="/reports">
            گزارش‌ها
          </Link>
        </div>

        {realEngineRequest.status !== "idle" ? (
          <div
            className={
              realEngineRequest.status === "error"
                ? "chart-form-status is-error"
                : "chart-form-status is-progress"
            }
            role="status"
          >
            <strong>
              {realEngineRequest.status === "error" ? "نیاز به اصلاح ورودی" : "در حال انجام"}
            </strong>
            <span>{realEngineRequest.message}</span>
          </div>
        ) : null}

        {saveMessage ? (
          <div className="chart-form-status is-success" role="status">
            <strong>گزارش آماده شد</strong>
            <span>{saveMessage}</span>
          </div>
        ) : null}
      </form>
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
