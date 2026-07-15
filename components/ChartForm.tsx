"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { SupabaseAuthPanel } from "@/components/SupabaseAuthPanel";
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

const GREGORIAN_MONTH_OPTIONS = [
  { value: "01", label: "ژانویه" },
  { value: "02", label: "فوریه" },
  { value: "03", label: "مارس" },
  { value: "04", label: "آوریل" },
  { value: "05", label: "مه" },
  { value: "06", label: "ژوئن" },
  { value: "07", label: "ژوئیه" },
  { value: "08", label: "اوت" },
  { value: "09", label: "سپتامبر" },
  { value: "10", label: "اکتبر" },
  { value: "11", label: "نوامبر" },
  { value: "12", label: "دسامبر" },
];

const GREGORIAN_YEAR_OPTIONS = Array.from({ length: 121 }, (_, index) =>
  String(2026 - index),
);

const TIME_HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);

const TIME_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
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

type BirthTimeParts = {
  hour: string;
  minute: string;
};

const initialJalaliBirthDateParts: JalaliBirthDateParts = {
  year: "",
  month: "",
  day: "",
};

const initialBirthTimeParts: BirthTimeParts = {
  hour: "",
  minute: "",
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
  engineData?: {
    personalTransitReportData?: GeneratedReportContract["engineData"]["personalTransitReportData"] | null;
  };
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

function makeFaLabel(codes: number[]) {
  return String.fromCharCode(...codes);
}

const CURRENT_RESIDENCE_LABEL = makeFaLabel([1605,1581,1604,32,1586,1606,1583,1711,1740,32,1601,1593,1604,1740]);
const CURRENT_RESIDENCE_PLACEHOLDER = makeFaLabel([1606,1575,1605,32,1588,1607,1585,32,1605,1581,1604,32,1586,1606,1583,1711,1740,32,1601,1593,1604,1740,32,1585,1575,32,1608,1575,1585,1583,32,1705,1606,1740,1583]);
const CURRENT_RESIDENCE_SUGGESTIONS_LABEL = makeFaLabel([1662,1740,1588,1606,1607,1575,1583,1607,1575,1740,32,1605,1581,1604,32,1586,1606,1583,1711,1740,32,1601,1593,1604,1740]);
const CURRENT_RESIDENCE_NOT_FOUND_MESSAGE = makeFaLabel([1601,1593,1604,1575,1611,32,1575,1740,1606,32,1588,1607,1585,32,1605,1581,1604,32,1586,1606,1583,1711,1740,32,1583,1585,32,1601,1607,1585,1587,1578,32,1575,1740,1585,1575,1606,32,1662,1740,1583,1575,32,1606,1588,1583,46]);
const CURRENT_RESIDENCE_REQUIRED_MESSAGE = makeFaLabel([1576,1585,1575,1740,32,1570,1587,1605,1575,1606,32,1575,1605,1585,1608,1586,1548,32,1605,1581,1604,32,1586,1606,1583,1711,1740,32,1601,1593,1604,1740,32,1585,1575,32,1607,1605,32,1575,1606,1578,1582,1575,1576,32,1705,1606,46]);

function getSelectedJalaliDateInput(parts: JalaliBirthDateParts) {
  if (!parts.year || !parts.month || !parts.day) {
    return "";
  }

  return `${parts.year}/${parts.month}/${parts.day}`;
}

function isGregorianDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getSelectedGregorianDateInput(parts: JalaliBirthDateParts) {
  if (!parts.year || !parts.month || !parts.day) {
    return "";
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getGregorianDayCount(year: string, month: string) {
  if (!year || !month) {
    return 31;
  }

  return new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
}

function normalizeCitySearch(value: string) {
  return value.trim().toLocaleLowerCase("fa-IR");
}
function notifyLocalDataChanged() {
  window.dispatchEvent(new Event("astro-clean-data-changed"));
}

function buildReportSaveFallbackMessage(message: string) {
  const normalizedMessage = message.trim();
  const lowerMessage = normalizedMessage.toLowerCase();
  const looksLikeNetworkTimeout =
    lowerMessage.includes("connect_timeout") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("pooler") ||
    lowerMessage.includes("supabase") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("network");

  if (looksLikeNetworkTimeout) {
    return "گزارش ساخته شد، اما ذخیره حساب یا لینک noindex موقتاً پاسخ نداد. نسخه private همین دستگاه باز می‌شود.";
  }

  if (!normalizedMessage) {
    return "گزارش ساخته شد، اما ذخیره حساب یا لینک noindex کامل نشد. نسخه private همین دستگاه باز می‌شود.";
  }

    return "گزارش ساخته شد، اما ذخیره حساب یا لینک noindex کامل نشد. نسخه private همین دستگاه باز می‌شود.";
}

export function ChartForm() {
  const router = useRouter();
  const [form, setForm] = useState<BirthInput>(initialForm);
  const [dateMode, setDateMode] = useState<BirthDateMode>("jalali");
  const [birthDateParts, setBirthDateParts] = useState<JalaliBirthDateParts>(
    initialJalaliBirthDateParts,
  );
  const [gregorianBirthDateParts, setGregorianBirthDateParts] =
    useState<JalaliBirthDateParts>(initialJalaliBirthDateParts);
  const [birthTimeMode, setBirthTimeMode] = useState<BirthTimeMode>("known");
  const [birthTimeParts, setBirthTimeParts] =
    useState<BirthTimeParts>(initialBirthTimeParts);
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [realEngineRequest, setRealEngineRequest] =
    useState<RealEngineRequestState>(initialRealEngineRequest);

  const [currentResidenceCity, setCurrentResidenceCity] = useState("");
  const [selectedBirthCityId, setSelectedBirthCityId] = useState("");
  const [selectedCurrentResidenceCityId, setSelectedCurrentResidenceCityId] =
    useState("");

  const isRealEngineLoading = realEngineRequest.status === "loading";

  const citySuggestions = useMemo(() => {
    if (selectedBirthCityId) {
      return [];
    }

    const query = normalizeCitySearch(form.birthCity);

    if (!query) {
      return [];
    }

    return IRAN_CITY_OPTIONS.filter((city) => {
      const cityName = normalizeCitySearch(city.faName);
      const cityDisplayName = normalizeCitySearch(getIranCityDisplayName(city));

      return cityName.includes(query) || cityDisplayName.includes(query);
    }).slice(0, MAX_CITY_SUGGESTIONS);
  }, [form.birthCity, selectedBirthCityId]);

  const currentResidenceSuggestions = useMemo(() => {
    if (selectedCurrentResidenceCityId) {
      return [];
    }

    const query = normalizeCitySearch(currentResidenceCity);

    if (!query) {
      return [];
    }

    return IRAN_CITY_OPTIONS.filter((city) => {
      const cityName = normalizeCitySearch(city.faName);
      const cityDisplayName = normalizeCitySearch(getIranCityDisplayName(city));

      return cityName.includes(query) || cityDisplayName.includes(query);
    }).slice(0, MAX_CITY_SUGGESTIONS);
  }, [currentResidenceCity, selectedCurrentResidenceCityId]);

  const gregorianDayOptions = useMemo(
    () =>
      Array.from(
        {
          length: getGregorianDayCount(
            gregorianBirthDateParts.year,
            gregorianBirthDateParts.month,
          ),
        },
        (_, index) => String(index + 1).padStart(2, "0"),
      ),
    [gregorianBirthDateParts.month, gregorianBirthDateParts.year],
  );

  function updateCurrentResidenceCity(value: string) {
    setSelectedCurrentResidenceCityId("");
    setCurrentResidenceCity(value);
  }

  function selectCurrentResidenceCity(city: IranCityOption) {
    setSelectedCurrentResidenceCityId(city.id);
    setCurrentResidenceCity(getIranCityDisplayName(city));
  }

  function updateBirthCity(value: string) {
    setSelectedBirthCityId("");
    updateField("birthCity", value);
  }

  function selectBirthCity(city: IranCityOption) {
    setSelectedBirthCityId(city.id);
    updateField("birthCity", getIranCityDisplayName(city));
  }

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

  function updateGregorianBirthDatePart(
    field: keyof JalaliBirthDateParts,
    value: string,
  ) {
    setGregorianBirthDateParts((current) => {
      const next = { ...current, [field]: value };
      const dayCount = getGregorianDayCount(next.year, next.month);

      if (next.day && Number(next.day) > dayCount) {
        next.day = "";
      }

      return next;
    });
    updateField("birthDate", "");
  }

  function updateBirthTimePart(field: keyof BirthTimeParts, value: string) {
    const next = { ...birthTimeParts, [field]: value };
    setBirthTimeParts(next);
    updateField(
      "birthTime",
      next.hour && next.minute ? `${next.hour}:${next.minute}` : "",
    );
  }

  function updateBirthTimeMode(nextMode: BirthTimeMode) {
    setBirthTimeMode(nextMode);

    if (nextMode === "unknown") {
      setBirthTimeParts(initialBirthTimeParts);
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
      const selectedGregorianBirthDate = getSelectedGregorianDateInput(
        gregorianBirthDateParts,
      );

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
      throw new Error("نام شهر تولد را وارد کن و از پیشنهادها انتخاب کن.");
    }

    const selectedCity =
      IRAN_CITY_OPTIONS.find((city) => city.id === selectedBirthCityId) ??
      findIranCityByName(normalizedCityName);

    if (!selectedCity) {
      throw new Error("فعلاً این شهر در فهرست ایران پیدا نشد. نزدیک‌ترین شهر پیشنهادی را انتخاب کن.");
    }

    const normalizedCurrentResidenceCityName = currentResidenceCity.trim();

    if (!normalizedCurrentResidenceCityName) {
      throw new Error(CURRENT_RESIDENCE_REQUIRED_MESSAGE);
    }

    const selectedCurrentResidenceCity =
      IRAN_CITY_OPTIONS.find(
        (city) => city.id === selectedCurrentResidenceCityId,
      ) ?? findIranCityByName(normalizedCurrentResidenceCityName);

    if (!selectedCurrentResidenceCity) {
      throw new Error(CURRENT_RESIDENCE_NOT_FOUND_MESSAGE);
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
      currentResidenceCity: selectedCurrentResidenceCity.faName,
      currentResidenceCountry: initialForm.birthCountry,
      currentResidenceCityId: selectedCurrentResidenceCity.id,
      currentResidenceLatitude: selectedCurrentResidenceCity.latitude,
      currentResidenceLongitude: selectedCurrentResidenceCity.longitude,
      currentResidenceTimezone: selectedCurrentResidenceCity.timezone,
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
      message: "چارت تولد در حال محاسبه است؛ گزارش مستقیم بعد از آماده شدن باز می‌شود.",
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
          currentResidencePlaceName: normalizedForm.currentResidenceCity,
          currentResidenceCountry: normalizedForm.currentResidenceCountry,
          currentResidenceCityId: normalizedForm.currentResidenceCityId,
          currentResidenceLatitude: normalizedForm.currentResidenceLatitude,
          currentResidenceLongitude: normalizedForm.currentResidenceLongitude,
          currentResidenceTimezone: normalizedForm.currentResidenceTimezone,
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
        message: "چارت آماده شد؛ گزارش مستقیم باز می‌شود.",
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
            : "چند ورودی لازم برای ساخت گزارش کامل نیست.",
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
        "گزارش در حساب ذخیره شد؛ نسخه حساب private/noindex است و نسخه دستگاه هم برای اطمینان باقی ماند.",
      );
      router.push(`/reports/${saveResult.accountRecord?.id ?? saveResult.localRecord.id}`);
      return;
    }

    if (saveResult.accountStatus === "public-saved" && saveResult.accountRecord) {
      setSaveMessage(
        "گزارش با لینک public/noindex ذخیره شد؛ هرکس لینک مستقیم را داشته باشد می‌تواند آن را ببیند و نسخه دستگاه هم باقی ماند.",
      );
      router.push(`/reports/${saveResult.accountRecord.id}`);
      return;
    }

    const fallbackMessage = buildReportSaveFallbackMessage(saveResult.accountMessage);

    setRealEngineRequest({
      status: "ready",
      message: fallbackMessage,
    });
    setSaveMessage(
      "گزارش روی همین دستگاه آماده شد؛ این نسخه local/private است و اگر ذخیره حساب یا لینک noindex دیر پاسخ داد، همین نسخه را می‌بینی.",
    );
    router.push(`/reports/${saveResult.localRecord.id}`);
  }

  return (
    <section className="chart-reference-page" aria-label="فرم ساخت چارت تولد">
      <div className="chart-reference-shell">
        <div className="chart-reference-content">
          <form
            className="chart-reference-form"
            id="chart-birth-data-form"
            onSubmit={handleSubmit}
          >
            <div className="chart-form-fields">
              <label className="chart-field chart-field-full">
                <span className="chart-field-label">
                  <span aria-hidden="true">♙</span>
                  نام
                </span>
                <input
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="نام خود را وارد کنید"
                />
              </label>

              <div className="chart-field chart-field-full">
                <div className="chart-field-title-row">
                  <span className="chart-field-label">
                    <span aria-hidden="true">▣</span>
                    تاریخ تولد
                  </span>

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
                    <label>
                      <span>سال</span>
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
                    </label>

                    <label>
                      <span>ماه</span>
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
                    </label>

                    <label>
                      <span>روز</span>
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
                            {Number(day).toLocaleString("fa-IR")}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                ) : (
                  <div
                    className="birth-date-picker-grid"
                    role="group"
                    aria-label="انتخاب تاریخ تولد میلادی"
                  >
                    <label>
                      <span>سال</span>
                      <select
                        required
                        value={gregorianBirthDateParts.year}
                        onChange={(event) =>
                          updateGregorianBirthDatePart("year", event.target.value)
                        }
                        aria-label="سال تولد میلادی"
                      >
                        <option value="">سال</option>
                        {GREGORIAN_YEAR_OPTIONS.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>ماه</span>
                      <select
                        required
                        value={gregorianBirthDateParts.month}
                        onChange={(event) =>
                          updateGregorianBirthDatePart("month", event.target.value)
                        }
                        aria-label="ماه تولد میلادی"
                      >
                        <option value="">ماه</option>
                        {GREGORIAN_MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>روز</span>
                      <select
                        required
                        value={gregorianBirthDateParts.day}
                        onChange={(event) =>
                          updateGregorianBirthDatePart("day", event.target.value)
                        }
                        aria-label="روز تولد میلادی"
                      >
                        <option value="">روز</option>
                        {gregorianDayOptions.map((day) => (
                          <option key={day} value={day}>
                            {Number(day).toLocaleString("fa-IR")}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>

              <div className="chart-field chart-field-full">
                <div className="chart-field-title-row chart-time-title-row">
                  <span className="chart-field-label">
                    <span aria-hidden="true">◷</span>
                    ساعت تولد
                  </span>

                  <label className="time-unknown-choice">
                    <input
                      type="checkbox"
                      checked={birthTimeMode === "unknown"}
                      onChange={(event) =>
                        updateBirthTimeMode(
                          event.target.checked ? "unknown" : "known",
                        )
                      }
                    />
                    <span>ساعت تولدم را نمی‌دانم</span>
                  </label>
                </div>

                <div
                  className="birth-time-picker-grid"
                  role="group"
                  aria-label="انتخاب ساعت تولد به‌صورت ۲۴ ساعته"
                >
                  <label>
                    <span>ساعت</span>
                    <select
                      required={birthTimeMode === "known"}
                      disabled={birthTimeMode === "unknown"}
                      value={birthTimeParts.hour}
                      onChange={(event) =>
                        updateBirthTimePart("hour", event.target.value)
                      }
                      aria-label="ساعت تولد از صفر تا بیست‌وسه"
                    >
                      <option value="">ساعت</option>
                      {TIME_HOUR_OPTIONS.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>دقیقه</span>
                    <select
                      required={birthTimeMode === "known"}
                      disabled={birthTimeMode === "unknown"}
                      value={birthTimeParts.minute}
                      onChange={(event) =>
                        updateBirthTimePart("minute", event.target.value)
                      }
                      aria-label="دقیقه تولد"
                    >
                      <option value="">دقیقه</option>
                      {TIME_MINUTE_OPTIONS.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {birthTimeMode === "unknown" ? (
                  <small className="field-hint">
                    اگر ساعت دقیق را نمی‌دانی، با ساعت میانی روز شروع می‌کنیم.
                  </small>
                ) : null}
              </div>

              <div className="chart-field chart-city-field chart-city-card">
                <label className="chart-city-label">
                  <span className="chart-field-label">
                    <span aria-hidden="true">⌖</span>
                    شهر تولد
                  </span>
                  <input
                    required
                    autoComplete="address-level2"
                    value={form.birthCity}
                    onChange={(event) => updateBirthCity(event.target.value)}
                    placeholder="نام شهر تولد را وارد کنید"
                  />
                </label>

                {citySuggestions.length > 0 ? (
                  <div
                    className="city-suggestion-chips has-suggestions"
                    aria-label="پیشنهادهای شهر تولد"
                  >
                    {citySuggestions.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        className="city-suggestion-chip"
                        onClick={() => selectBirthCity(city)}
                      >
                        {getIranCityDisplayName(city)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="chart-field chart-city-field chart-city-card">
                <label className="chart-city-label">
                  <span className="chart-field-label">
                    <span aria-hidden="true">⌖</span>
                    {CURRENT_RESIDENCE_LABEL}
                  </span>
                  <input
                    value={currentResidenceCity}
                    onChange={(event) =>
                      updateCurrentResidenceCity(event.target.value)
                    }
                    placeholder={CURRENT_RESIDENCE_PLACEHOLDER}
                  />
                </label>

                {currentResidenceSuggestions.length > 0 ? (
                  <div
                    className="city-suggestion-chips has-suggestions"
                    aria-label={CURRENT_RESIDENCE_SUGGESTIONS_LABEL}
                  >
                    {currentResidenceSuggestions.map((city) => (
                      <button
                        key={city.id}
                        type="button"
                        onClick={() => selectCurrentResidenceCity(city)}
                        className="city-suggestion-chip"
                      >
                        {getIranCityDisplayName(city)}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </form>

          <div className="chart-account-option">
            <label className="chart-account-option-toggle">
              <input
                type="checkbox"
                checked={showAccountPanel}
                onChange={(event) => setShowAccountPanel(event.target.checked)}
              />
              <span className="chart-account-option-copy">
                <strong>گزارشم را در حساب هالیوس نگه دار</strong>
              </span>
            </label>

            {showAccountPanel ? <SupabaseAuthPanel compact /> : null}
          </div>

          <div className="chart-form-actions">
            <button
              className="button chart-submit-button"
              type="submit"
              form="chart-birth-data-form"
              disabled={isRealEngineLoading}
            >
              <span aria-hidden="true">✦</span>
              {isRealEngineLoading ? "در حال ساخت گزارش..." : "ساخت گزارش"}
            </button>
          </div>

          {realEngineRequest.status !== "idle" ? (
              <div
                className={
                  realEngineRequest.status === "error"
                    ? "chart-form-status is-error"
                    : "chart-form-status is-progress"
                }
                role="status"
                aria-live="polite"
              >
                <strong>
                  {realEngineRequest.status === "error" ? "نیاز به اصلاح ورودی" : "در حال انجام"}
                </strong>
                <span>{realEngineRequest.message}</span>
              </div>
          ) : null}

          {saveMessage ? (
            <div className="chart-form-status is-success" role="status" aria-live="polite">
              <strong>گزارش آماده شد</strong>
              <span>{saveMessage}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
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
    engineData: {
      personalTransitReportData: engineData.personalTransitReportData ?? null,
    },
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
