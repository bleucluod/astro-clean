"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  filterIranCities,
  findIranCityByName,
  getIranCityDisplayName,
} from "@/lib/locations/iran-cities";
import { saveGeneratedReportWithAccountFallback } from "@/lib/storage/account-report-save-client";
import { enhanceReportOutputV2 } from "@/lib/report-output/report-v2";
import {
  loadLastStudyLocation,
  saveLastStudyLocation,
} from "@/lib/storage/report-journey-client";

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
const MAX_CITY_SUGGESTIONS = 7;

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

type ChartFieldId =
  | "name"
  | "birthDate"
  | "birthTime"
  | "birthCity"
  | "currentResidence";

type ChartFieldErrors = Partial<Record<ChartFieldId, string>>;

class ChartFormValidationError extends Error {
  readonly field: ChartFieldId;

  constructor(field: ChartFieldId, message: string) {
    super(message);
    this.name = "ChartFormValidationError";
    this.field = field;
  }
}

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
    return "گزارش ساخته شد، اما ذخیره در حساب یا ساخت لینک موقتاً پاسخ نداد. نسخهٔ همین دستگاه باز می‌شود.";
  }

  if (!normalizedMessage) {
    return "گزارش ساخته شد، اما ذخیره در حساب یا ساخت لینک کامل نشد. نسخهٔ همین دستگاه باز می‌شود.";
  }

    return "گزارش ساخته شد، اما ذخیره در حساب یا ساخت لینک کامل نشد. نسخهٔ همین دستگاه باز می‌شود.";
}

type ChartSelectOption = {
  value: string;
  label: string;
};

function sanitizePersianName(value: string) {
  return value
    .replaceAll("ي", "ی")
    .replaceAll("ك", "ک")
    .replace(
      /[^ء-غف-یپچژکگ‌\s]/g,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "");
}
function ChartSelect({
  ariaLabel,
  disabled = false,
  onChange,
  options,
  placeholder,
  value,
}: {
  ariaLabel: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  options: readonly ChartSelectOption[];
  placeholder: string;
  value: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      className={isOpen ? "chart-select is-open" : "chart-select"}
      ref={rootRef}
    >
      <button
        type="button"
        className="chart-select-trigger"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <span>{selectedOption?.label ?? placeholder}</span>
        <span className="chart-select-chevron" aria-hidden="true">
         ⌄
        </span>
      </button>

      {isOpen ? (
        <div
          className="chart-select-options"
          role="listbox"
          aria-label={ariaLabel}
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                type="button"
                className={
                  isSelected
                    ? "chart-select-option is-selected"
                    : "chart-select-option"
                }
                role="option"
                aria-selected={isSelected}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected ? (
                  <span
                    className="chart-select-option-check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
  const formRef = useRef<HTMLFormElement>(null);
  const submissionInFlightRef = useRef(false);
  const openReportTimerRef = useRef<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ChartFieldErrors>({});
  const [includeTransitReading, setIncludeTransitReading] = useState(false);
  const [generatedReportPath, setGeneratedReportPath] = useState("");
  const [showOpenReportButton, setShowOpenReportButton] = useState(false);

  const [currentResidenceCity, setCurrentResidenceCity] = useState("");
  const [selectedBirthCityId, setSelectedBirthCityId] = useState("");
  const [selectedCurrentResidenceCityId, setSelectedCurrentResidenceCityId] =
    useState("");

  useEffect(() => {
    const restoreFrame = window.requestAnimationFrame(() => {
      const savedLocation = loadLastStudyLocation();

      if (savedLocation) {
        setSelectedCurrentResidenceCityId(savedLocation.cityId);
        setCurrentResidenceCity(savedLocation.cityName);
      }
    });

    return () => {
      window.cancelAnimationFrame(restoreFrame);
      if (openReportTimerRef.current !== null) {
        window.clearTimeout(openReportTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (realEngineRequest.status === "idle") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [realEngineRequest.status]);

  const citySuggestions = useMemo(() => {
    if (selectedBirthCityId || !form.birthCity.trim()) {
      return [];
    }

    return filterIranCities(form.birthCity).slice(
      0,
      MAX_CITY_SUGGESTIONS,
    );
  }, [form.birthCity, selectedBirthCityId]);

  const currentResidenceSuggestions = useMemo(() => {
    if (
      selectedCurrentResidenceCityId ||
      !currentResidenceCity.trim()
    ) {
      return [];
    }

    return filterIranCities(currentResidenceCity).slice(
      0,
      MAX_CITY_SUGGESTIONS,
    );
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

  const chartProgress = useMemo(() => {
    const dateParts =
      dateMode === "jalali"
        ? birthDateParts
        : gregorianBirthDateParts;
    const hasSelectedCity = Boolean(
      form.birthCity.trim() &&
        (selectedBirthCityId || findIranCityByName(form.birthCity)),
    );
    const steps = [
      { id: "name", label: "نام", complete: Boolean((form.name ?? "").trim()) },
      {
        id: "date",
        label: "تاریخ تولد",
        complete: Boolean(
          dateParts.year && dateParts.month && dateParts.day,
        ),
      },
      {
        id: "time",
        label: "ساعت تولد",
        complete:
          birthTimeMode === "unknown" ||
          Boolean(birthTimeParts.hour && birthTimeParts.minute),
      },
      { id: "city", label: "شهر تولد", complete: hasSelectedCity },
    ];
    const completed = steps.filter((step) => step.complete).length;

    return {
      completed,
      percentage: (Math.max(completed - 1, 0) / (steps.length - 1)) * 100,
      steps,
    };
  }, [
    birthDateParts,
    birthTimeMode,
    birthTimeParts,
    dateMode,
    form.birthCity,
    form.name,
    gregorianBirthDateParts,
    selectedBirthCityId,
  ]);

  function clearFieldError(field: ChartFieldId) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateCurrentResidenceCity(value: string) {
    clearFieldError("currentResidence");
    setSelectedCurrentResidenceCityId("");
    setCurrentResidenceCity(value);
  }

  function selectCurrentResidenceCity(city: IranCityOption) {
    const cityName = getIranCityDisplayName(city);
    clearFieldError("currentResidence");
    setSelectedCurrentResidenceCityId(city.id);
    setCurrentResidenceCity(cityName);
    saveLastStudyLocation({ cityId: city.id, cityName });
  }

  function updateBirthCity(value: string) {
    clearFieldError("birthCity");
    setSelectedBirthCityId("");
    updateField("birthCity", value);
  }

  function selectBirthCity(city: IranCityOption) {
    clearFieldError("birthCity");
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
    clearFieldError("birthDate");
    setDateMode(nextMode);
    setSaveMessage("");
  }

  function updateBirthDatePart(field: keyof JalaliBirthDateParts, value: string) {
    const nextBirthDateParts = {
      ...birthDateParts,
      [field]: value,
    };

    clearFieldError("birthDate");
    setBirthDateParts(nextBirthDateParts);
    updateField("birthDate", "");
  }

  function updateGregorianBirthDatePart(
    field: keyof JalaliBirthDateParts,
    value: string,
  ) {
    clearFieldError("birthDate");
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
    clearFieldError("birthTime");
    const next = { ...birthTimeParts, [field]: value };
    setBirthTimeParts(next);
    updateField(
      "birthTime",
      next.hour && next.minute ? `${next.hour}:${next.minute}` : "",
    );
  }

  function updateBirthTimeMode(nextMode: BirthTimeMode) {
    clearFieldError("birthTime");
    setBirthTimeMode(nextMode);

    if (nextMode === "unknown") {
      setBirthTimeParts(initialBirthTimeParts);
      updateField("birthTime", "");
    }
  }

  function normalizeBirthForm() {
    const normalizedName = sanitizePersianName(form.name ?? "").trim();

    if (!normalizedName) {
      throw new ChartFormValidationError(
        "name",
        "نام فارسی‌ات را برای شخصی‌سازی گزارش وارد کن.",
      );
    }

    let normalizedBirthDate = "";

    if (dateMode === "jalali") {
      const selectedJalaliBirthDate = getSelectedJalaliDateInput(birthDateParts);

      if (!selectedJalaliBirthDate) {
        throw new ChartFormValidationError("birthDate", "تاریخ تولد را کامل کن.");
      }

      const parsedBirthDate = parseJalaliDateInput(selectedJalaliBirthDate);

      if (!parsedBirthDate.ok) {
        throw new ChartFormValidationError("birthDate", parsedBirthDate.message);
      }

      normalizedBirthDate = parsedBirthDate.gregorianIso;
    } else {
      const selectedGregorianBirthDate = getSelectedGregorianDateInput(
        gregorianBirthDateParts,
      );

      if (!selectedGregorianBirthDate) {
        throw new ChartFormValidationError("birthDate", "تاریخ میلادی تولد را وارد کن.");
      }

      if (!isGregorianDateInput(selectedGregorianBirthDate)) {
        throw new ChartFormValidationError("birthDate", "تاریخ میلادی باید کامل باشد.");
      }

      normalizedBirthDate = selectedGregorianBirthDate;
    }

    const normalizedCityName = form.birthCity.trim();

    if (!normalizedCityName) {
      throw new ChartFormValidationError("birthCity", "نام شهر تولد را وارد کن و از پیشنهادها انتخاب کن.");
    }

    const selectedCity =
      IRAN_CITY_OPTIONS.find((city) => city.id === selectedBirthCityId) ??
      findIranCityByName(normalizedCityName);

    if (!selectedCity) {
      throw new ChartFormValidationError("birthCity", "فعلاً این شهر در فهرست ایران پیدا نشد. نزدیک‌ترین شهر پیشنهادی را انتخاب کن.");
    }

    let selectedCurrentResidenceCity: IranCityOption | null = null;

    if (includeTransitReading) {
      const normalizedCurrentResidenceCityName = currentResidenceCity.trim();

      if (!normalizedCurrentResidenceCityName) {
        throw new ChartFormValidationError(
          "currentResidence",
          CURRENT_RESIDENCE_REQUIRED_MESSAGE,
        );
      }

      selectedCurrentResidenceCity =
        IRAN_CITY_OPTIONS.find(
          (city) => city.id === selectedCurrentResidenceCityId,
        ) ?? findIranCityByName(normalizedCurrentResidenceCityName) ?? null;

      if (!selectedCurrentResidenceCity) {
        throw new ChartFormValidationError(
          "currentResidence",
          CURRENT_RESIDENCE_NOT_FOUND_MESSAGE,
        );
      }
    }

    const normalizedBirthTime =
      birthTimeMode === "unknown" ? UNKNOWN_BIRTH_TIME : form.birthTime.trim();

    if (!normalizedBirthTime) {
      throw new ChartFormValidationError("birthTime", "ساعت تولد را وارد کن یا گزینه «نمی‌دانم» را بزن.");
    }

    const normalizedForm: BirthInput = {
      ...form,
      name: normalizedName,
      birthDate: normalizedBirthDate,
      birthTime: normalizedBirthTime,
      birthCity: selectedCity.faName,
      birthCountry: initialForm.birthCountry,
      birthCityId: selectedCity.id,
      birthLatitude: selectedCity.latitude,
      birthLongitude: selectedCity.longitude,
      birthTimezone: selectedCity.timezone,
      ...(selectedCurrentResidenceCity
        ? {
            currentResidenceCity: selectedCurrentResidenceCity.faName,
            currentResidenceCountry: initialForm.birthCountry,
            currentResidenceCityId: selectedCurrentResidenceCity.id,
            currentResidenceLatitude: selectedCurrentResidenceCity.latitude,
            currentResidenceLongitude: selectedCurrentResidenceCity.longitude,
            currentResidenceTimezone: selectedCurrentResidenceCity.timezone,
          }
        : {}),
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
        status: "loading",
        message: "چارت آماده شد؛ گزارش در حال آماده‌سازی نهایی است…",
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

    if (submissionInFlightRef.current || generatedReportPath) {
      return;
    }

    submissionInFlightRef.current = true;
    setIsSubmitting(true);
    setShowOpenReportButton(false);
    setSaveMessage("");
    setFieldErrors({});
    setRealEngineRequest({
      status: "loading",
      message: "در حال ساخت گزارش…",
    });

    let normalizedBirth: ReturnType<typeof normalizeBirthForm>;

    try {
      normalizedBirth = normalizeBirthForm();
    } catch (error) {
      submissionInFlightRef.current = false;
      setIsSubmitting(false);

      if (error instanceof ChartFormValidationError) {
        setFieldErrors({ [error.field]: error.message });
      }

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
      try {
        realEngineResult = await requestRealEngineReportData(
          normalizedForm,
          engineCity,
        );
      } catch {
        setRealEngineRequest({
          status: "loading",
          message:
            "محاسبه دقیق کامل نشد؛ نسخه امن گزارش در حال آماده‌سازی است…",
        });
      }

      if (
        normalizedForm.currentResidenceCityId &&
        normalizedForm.currentResidenceCity
      ) {
        saveLastStudyLocation({
          cityId: normalizedForm.currentResidenceCityId,
          cityName: normalizedForm.currentResidenceCity,
        });
      }

      const nextReport = buildReportForSave(
        normalizedForm,
        realEngineResult,
        engineCity,
      );

      const saveResult = await saveGeneratedReportWithAccountFallback(
        nextReport,
        { navigationGraceMs: 2200 },
      );
      notifyLocalDataChanged();

      let nextPath = `/reports/${saveResult.localRecord.id}`;
      let nextMessage =
        "گزارش روی همین دستگاه آماده شد. ذخیره آنلاین در صورت امکان بدون متوقف‌کردن بازشدن گزارش ادامه پیدا می‌کند.";

      if (saveResult.accountStatus === "account-saved") {
        nextPath = `/reports/${saveResult.accountRecord?.id ?? saveResult.localRecord.id}?source=account`;
        nextMessage =
          "گزارش در حساب ذخیره شد؛ نسخه عمومی بدون جزئیات تولد فعال است و نسخه دستگاه هم باقی ماند.";
      } else if (
        saveResult.accountStatus === "public-saved" &&
        saveResult.accountRecord
      ) {
        nextPath = `/reports/${saveResult.accountRecord.id}?source=public`;
        nextMessage =
          "گزارش عمومی ذخیره شد؛ نام فقط با رضایت جداگانه نمایش داده می‌شود و جزئیات تولد در نسخه عمومی پنهان است.";
      } else if (saveResult.accountMessage) {
        nextMessage = buildReportSaveFallbackMessage(saveResult.accountMessage);
      }

      setGeneratedReportPath(nextPath);
      setSaveMessage(nextMessage);
      setRealEngineRequest({
        status: "ready",
        message: "گزارش آماده شد؛ در حال باز کردن…",
      });

      openReportTimerRef.current = window.setTimeout(() => {
        setShowOpenReportButton(true);
      }, 1400);

      router.push(nextPath);
    } catch (error) {
      submissionInFlightRef.current = false;
      setIsSubmitting(false);
      setRealEngineRequest({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ساخت گزارش کامل نشد. دوباره تلاش کن.",
      });
    }
  }

  return (
    <section className="chart-reference-page" aria-label="فرم ساخت چارت تولد">
      <div className="chart-reference-shell">
        <div className="chart-reference-content">
          <form
            className="chart-reference-form"
            id="chart-birth-data-form"
            onSubmit={handleSubmit}
            ref={formRef}
          >
            <div className="chart-form-progress" aria-live="polite">
              <div className="chart-form-progress-header">
                <span>پیشرفت اطلاعات ضروری</span>
                <strong>{chartProgress.completed.toLocaleString("fa-IR")} از ۴</strong>
              </div>

              <div
                className="chart-form-progress-bar"
                style={
                  {
                    "--chart-progress": `${chartProgress.percentage}%`,
                  } as CSSProperties
                }
                aria-hidden="true"
              />

              <div className="chart-form-progress-steps">
                {chartProgress.steps.map((step) => (
                  <span
                    className={
                      step.complete
                        ? "chart-form-progress-step is-complete"
                        : "chart-form-progress-step"
                    }
                    key={step.id}
                  >
                    {step.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="chart-form-fields">
              <label className="chart-field chart-field-full">
                <span className="chart-field-label">
                  <span aria-hidden="true">♙</span>
                  نام
                </span>
                <input
                  required
                  aria-required="true"
                  autoComplete="name"
                  dir="rtl"
                  lang="fa"
                  value={form.name}
                  onChange={(event) => {
                    clearFieldError("name");
                    updateField(
                      "name",
                      sanitizePersianName(event.target.value),
                    );
                  }}
                  placeholder="نام فارسی خود را وارد کنید"
                />
                <FieldError message={fieldErrors.name} />
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
                    <div className="chart-select-segment">
                      <span>سال</span>
                      <ChartSelect
                        ariaLabel="سال تولد شمسی"
                        placeholder="انتخاب"
                        value={birthDateParts.year}
                        onChange={(value) =>
                          updateBirthDatePart("year", value)
                        }
                        options={JALALI_YEAR_OPTIONS.map((year) => ({
                          value: year,
                          label: Number(year).toLocaleString("fa-IR", { useGrouping: false }),
                        }))}
                      />
                    </div>

                    <div className="chart-select-segment">
                      <span>ماه</span>
                      <ChartSelect
                        ariaLabel="ماه تولد شمسی"
                        placeholder="انتخاب"
                        value={birthDateParts.month}
                        onChange={(value) =>
                          updateBirthDatePart("month", value)
                        }
                        options={JALALI_MONTH_OPTIONS}
                      />
                    </div>

                    <div className="chart-select-segment">
                      <span>روز</span>
                      <ChartSelect
                        ariaLabel="روز تولد شمسی"
                        placeholder="انتخاب"
                        value={birthDateParts.day}
                        onChange={(value) =>
                          updateBirthDatePart("day", value)
                        }
                        options={JALALI_DAY_OPTIONS.map((day) => ({
                          value: day,
                          label: Number(day).toLocaleString("fa-IR"),
                        }))}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className="birth-date-picker-grid"
                    role="group"
                    aria-label="انتخاب تاریخ تولد میلادی"
                  >
                    <div className="chart-select-segment">
                      <span>سال</span>
                      <ChartSelect
                        ariaLabel="سال تولد میلادی"
                        placeholder="انتخاب"
                        value={gregorianBirthDateParts.year}
                        onChange={(value) =>
                          updateGregorianBirthDatePart("year", value)
                        }
                        options={GREGORIAN_YEAR_OPTIONS.map((year) => ({
                          value: year,
                          label: Number(year).toLocaleString("fa-IR", { useGrouping: false }),
                        }))}
                      />
                    </div>

                    <div className="chart-select-segment">
                      <span>ماه</span>
                      <ChartSelect
                        ariaLabel="ماه تولد میلادی"
                        placeholder="انتخاب"
                        value={gregorianBirthDateParts.month}
                        onChange={(value) =>
                          updateGregorianBirthDatePart("month", value)
                        }
                        options={GREGORIAN_MONTH_OPTIONS}
                      />
                    </div>

                    <div className="chart-select-segment">
                      <span>روز</span>
                      <ChartSelect
                        ariaLabel="روز تولد میلادی"
                        placeholder="انتخاب"
                        value={gregorianBirthDateParts.day}
                        onChange={(value) =>
                          updateGregorianBirthDatePart("day", value)
                        }
                        options={gregorianDayOptions.map((day) => ({
                          value: day,
                          label: Number(day).toLocaleString("fa-IR"),
                        }))}
                      />
                    </div>
                  </div>
                )}
                <FieldError message={fieldErrors.birthDate} />
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
                  <div className="chart-select-segment">
                    <span>ساعت تولد</span>
                    <ChartSelect
                      key={`hour-${birthTimeMode}`}
                      ariaLabel="ساعت تولد از صفر تا بیست‌وسه"
                      disabled={birthTimeMode === "unknown"}
                      placeholder="انتخاب"
                      value={birthTimeParts.hour}
                      onChange={(value) =>
                        updateBirthTimePart("hour", value)
                      }
                      options={TIME_HOUR_OPTIONS.map((hour) => ({
                        value: hour,
                        label: Number(hour).toLocaleString("fa-IR", {
                          minimumIntegerDigits: 2,
                        }),
                      }))}
                    />
                  </div>

                  <div className="chart-select-segment">
                    <span>دقیقه</span>
                    <ChartSelect
                      key={`minute-${birthTimeMode}`}
                      ariaLabel="دقیقه تولد"
                      disabled={birthTimeMode === "unknown"}
                      placeholder="انتخاب"
                      value={birthTimeParts.minute}
                      onChange={(value) =>
                        updateBirthTimePart("minute", value)
                      }
                      options={TIME_MINUTE_OPTIONS.map((minute) => ({
                        value: minute,
                        label: Number(minute).toLocaleString("fa-IR", {
                          minimumIntegerDigits: 2,
                        }),
                      }))}
                    />
                  </div>
                </div>

                {birthTimeMode === "unknown" ? (
                  <small className="field-hint">
                    اگر ساعت دقیق را نمی‌دانی، با ساعت میانی روز شروع می‌کنیم و محدودیت خانه‌ها و طالع را در گزارش روشن نگه می‌داریم.
                  </small>
                ) : null}
                <FieldError message={fieldErrors.birthTime} />
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
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && citySuggestions[0]) {
                        event.preventDefault();
                        selectBirthCity(citySuggestions[0]);
                      }
                    }}
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
                <FieldError message={fieldErrors.birthCity} />
              </div>

              <label className="chart-transit-choice chart-field-full">
                <input
                  type="checkbox"
                  checked={includeTransitReading}
                  onChange={(event) => {
                    setIncludeTransitReading(event.target.checked);
                    clearFieldError("currentResidence");
                  }}
                />
                <span>
                  <strong>ببین آسمان امروز کجای چارت تو را روشن می‌کند</strong>
                  <small>
                    جایگاه آسمان امروز را کنار چارت تولدت می‌گذاریم تا ببینی این روزها کدام بخش‌های تو پررنگ‌تر شده‌اند. محل زندگی فعلی فقط برای همین خوانش لازم است و نتیجه جدا از گزارش تولد می‌ماند.
                  </small>
                </span>
              </label>

              {includeTransitReading ? (
                <div className="chart-field chart-city-field chart-city-card chart-transit-location">
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
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          currentResidenceSuggestions[0]
                        ) {
                          event.preventDefault();
                          selectCurrentResidenceCity(
                            currentResidenceSuggestions[0],
                          );
                        }
                      }}
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
                  <FieldError message={fieldErrors.currentResidence} />
                </div>
              ) : null}
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
              disabled={isSubmitting}
            >
              <span className="chart-submit-icon" aria-hidden="true">
                <Image
                  alt=""
                  height={1400}
                  src="/halleus-logo/symbol-transparent-black.png"
                  width={1400}
                />
              </span>
              {isSubmitting ? "در حال ساخت گزارش…" : "ساخت گزارش"}
            </button>
          </div>

          {realEngineRequest.status !== "idle" ? (
            <div className="chart-generation-overlay">
              <section
                className={`chart-generation-dialog is-${realEngineRequest.status}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="chart-generation-title"
                aria-describedby="chart-generation-description"
              >
                <div
                  className={
                    realEngineRequest.status === "error"
                      ? "chart-generation-symbol is-error"
                      : realEngineRequest.status === "ready"
                        ? "chart-generation-symbol is-ready"
                        : "chart-generation-symbol is-progress"
                  }
                  aria-hidden="true"
                >
                  <Image
                    alt=""
                    height={1400}
                    priority
                    src="/halleus-logo/symbol-transparent-white.png"
                    width={1400}
                  />
                </div>

                <div className="chart-generation-copy" aria-live="assertive">
                  <strong id="chart-generation-title">
                    {realEngineRequest.status === "error"
                      ? "ساخت گزارش کامل نشد"
                      : realEngineRequest.status === "ready"
                        ? "گزارشت آماده شد"
                        : "گزارشت در حال ساخته‌شدن است"}
                  </strong>

                  <p id="chart-generation-description">
                    {realEngineRequest.status === "error"
                      ? "اطلاعات واردشده را بررسی کن و دوباره تلاش کن."
                      : realEngineRequest.status === "ready"
                        ? "در حال بازکردن گزارش هستیم."
                        : "اطلاعات تولدت در حال محاسبه و آماده‌شدن برای گزارش فارسی است. این مرحله ممکن است چند لحظه طول بکشد."}
                  </p>

                  {realEngineRequest.status === "ready" && saveMessage ? (
                    <small>{saveMessage}</small>
                  ) : null}
                </div>

                <div className="chart-generation-actions">
                  {realEngineRequest.status === "error" &&
                  !generatedReportPath ? (
                    <>
                      <button
                        className="button"
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => formRef.current?.requestSubmit()}
                      >
                        تلاش دوباره
                      </button>

                      <button
                        className="button secondary"
                        type="button"
                        onClick={() => {
                          setRealEngineRequest(initialRealEngineRequest);
                          setSaveMessage("");
                          setGeneratedReportPath("");
                          setShowOpenReportButton(false);
                          window.requestAnimationFrame(() => {
                            formRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          });
                        }}
                      >
                        برگشت به فرم
                      </button>
                    </>
                  ) : null}

                  {generatedReportPath && showOpenReportButton ? (
                    <button
                      className="button"
                      type="button"
                      onClick={() => router.push(generatedReportPath)}
                    >
                      باز کردن گزارش
                    </button>
                  ) : null}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? (
    <small className="chart-field-error" role="alert">
      {message}
    </small>
  ) : null;
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
