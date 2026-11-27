"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import journeyStyles from "./chart-form-journey.module.css";
import {
  type MobileDateParts,
  type MobileTimeParts,
} from "./ChartMobileBirthPicker";
import pickerStyles from "./chart-mobile-birth-picker.module.css";
import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type Ref,
  useImperativeHandle,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { parseJalaliDateInput } from "@/lib/date/jalali";
import { HALLEUS_ANALYTICS_ACTION } from "@/lib/analytics/first-party";
import type {
  AstrologyReport,
  BirthInput,
  RealEngineReportSnapshot,
} from "@/types/astro";
import type { GeneratedReportContract } from "@/types/report-generation";
import {
  loadLastStudyLocation,
  saveLastStudyLocation,
} from "@/lib/storage/report-journey-client";

// Keep mobile wheels in a separate chunk; reserve space until loaded to avoid CLS.
const mobileWheelPlaceholder = () => (
  <div className={pickerStyles.alwaysPicker} style={{ minHeight: 54 }} aria-hidden="true" />
);
const MobileBirthDatePicker = dynamic(
  () => import("./ChartMobileBirthPicker").then((module) => module.MobileBirthDatePicker),
  { ssr: false, loading: mobileWheelPlaceholder },
);
const MobileBirthTimePicker = dynamic(
  () => import("./ChartMobileBirthPicker").then((module) => module.MobileBirthTimePicker),
  { ssr: false, loading: mobileWheelPlaceholder },
);

/**
 * Keep the standalone mobile time wheels out of the initial React tree until
 * the field approaches the viewport. Their 54px placeholder matches the wheel.
 * Direct focus/touch and browsers without IntersectionObserver still work.
 */
function DeferredMobileBirthTimePicker({
  value,
  onConfirm,
}: {
  value: MobileTimeParts;
  onConfirm: (value: MobileTimeParts) => void;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);

  useEffect(() => {
    if (nearby) return;
    const anchor = anchorRef.current;
    if (!anchor) return;

    const mobile = window.matchMedia("(max-width: 760px)");
    let observer: IntersectionObserver | null = null;
    let fallbackFrame: number | null = null;
    const watch = () => {
      observer?.disconnect();
      if (fallbackFrame !== null) window.cancelAnimationFrame(fallbackFrame);
      fallbackFrame = null;
      if (!mobile.matches) return;
      if (typeof IntersectionObserver === "undefined") {
        fallbackFrame = window.requestAnimationFrame(() => setNearby(true));
        return;
      }
      observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) {
          observer?.disconnect();
          setNearby(true);
        }
      }, { rootMargin: "0px 0px 120px 0px" });
      observer.observe(anchor);
    };
    watch();
    mobile.addEventListener("change", watch);
    return () => {
      observer?.disconnect();
      if (fallbackFrame !== null) window.cancelAnimationFrame(fallbackFrame);
      mobile.removeEventListener("change", watch);
    };
  }, [nearby]);

  return (
    <div
      ref={anchorRef}
      onFocusCapture={() => setNearby(true)}
      onPointerDownCapture={() => setNearby(true)}
    >
      {nearby ? (
        <MobileBirthTimePicker value={value} onConfirm={onConfirm} />
      ) : mobileWheelPlaceholder()}
    </div>
  );
}

// HALLEUS_CHART_DEFERRED_RUNTIME_BATCH5_R1
const LazySupabaseAuthPanel = dynamic(
  () =>
    import("@/components/SupabaseAuthPanel").then(
      (module) => module.SupabaseAuthPanel,
    ),
  { ssr: false },
);

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
type ChartJourneyStepId = "name" | "date" | "time" | "city";
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

// Keep the 8,000-line city directory out of the initial /chart JavaScript.
type HalleusCityOption = import("@/lib/locations/cities").HalleusCity;
type CityDirectory = typeof import("@/lib/locations/cities");

// Mirrors the directory's display contract without importing its entire dataset.
function getHalleusCityDisplayName(city: HalleusCityOption) {
  if (city.countryCode === "IR") {
    return city.faName === city.regionFaName
      ? city.faName
      : `${city.faName}، ${city.regionFaName}`;
  }
  return `${city.faName}، ${city.countryFaName}`;
}

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

const CURRENT_RESIDENCE_LABEL = "شهر سکونت فعلی";
const CURRENT_RESIDENCE_PLACEHOLDER = "نام شهر سکونت فعلی را وارد کنید";
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


function buildReportSaveFallbackMessage(message: string) {
  void message;
  return "ذخیرهٔ گزارش روی هالیوس تأیید نشد؛ گزارشی باز نمی‌شود. اتصال را بررسی کن و دوباره تلاش کن.";
}

type ChartSelectOption = {
  value: string;
  label: string;
};

// Equivalent to fa-IR digit formatting for our fixed numeric option strings,
// without constructing hundreds of Intl formatters at module initialization.
const PERSIAN_OPTION_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function formatPersianOptionDigits(value: string): string {
  return value.replace(/[0-9]/g, (digit) =>
    PERSIAN_OPTION_DIGITS.charAt(digit.charCodeAt(0) - 48),
  );
}

// Reuse preformatted labels instead of rebuilding hundreds of options on every field change.
const JALALI_YEAR_SELECT_OPTIONS: readonly ChartSelectOption[] = JALALI_YEAR_OPTIONS.map((year) => ({
  value: year,
  label: formatPersianOptionDigits(year),
}));
const GREGORIAN_YEAR_SELECT_OPTIONS: readonly ChartSelectOption[] = GREGORIAN_YEAR_OPTIONS.map((year) => ({
  value: year,
  label: formatPersianOptionDigits(year),
}));
const JALALI_DAY_SELECT_OPTIONS: readonly ChartSelectOption[] = JALALI_DAY_OPTIONS.map((day) => ({
  value: day,
  label: formatPersianOptionDigits(String(Number(day))),
}));
const TIME_HOUR_SELECT_OPTIONS: readonly ChartSelectOption[] = TIME_HOUR_OPTIONS.map((hour) => ({
  value: hour,
  label: formatPersianOptionDigits(hour),
}));
const TIME_MINUTE_SELECT_OPTIONS: readonly ChartSelectOption[] = TIME_MINUTE_OPTIONS.map((minute) => ({
  value: minute,
  label: formatPersianOptionDigits(minute),
}));

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
      <select
        className="chart-native-select"
        style={{ display: "none" }}
        aria-label={ariaLabel}
        dir="rtl"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>{placeholder}</option>
        {isOpen ? options.map((option) => (
          <option value={option.value} key={option.value}>{option.label}</option>
        )) : selectedOption ? (
          <option value={selectedOption.value}>{selectedOption.label}</option>
        ) : null}
      </select>
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

// Mount the floating control after hydration without re-rendering the whole form.
function ChartStickyPortal({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  return ready ? createPortal(children, document.body) : null;
}

export type ChartFormMode = "standalone" | "comparison";

export type PreparedComparisonBirth = {
  birthInput: BirthInput;
  calculate: () => Promise<AstrologyReport>;
};

export type ComparisonFormHandle = {
  prepare: () => Promise<PreparedComparisonBirth>;
};

export function ChartForm({
  mode = "standalone",
  comparisonFormRef,
  onComparisonReadyChange,
  comparisonBusy = false,
  comparisonHeadingId,
  initialComparisonInput,
}: {
  mode?: ChartFormMode;
  comparisonFormRef?: Ref<ComparisonFormHandle>;
  onComparisonReadyChange?: (ready: boolean) => void;
  comparisonBusy?: boolean;
  comparisonHeadingId?: string;
  initialComparisonInput?: BirthInput;
} = {}) {
  const router = useRouter();
  const comparisonMode = mode === "comparison";
  const comparisonCalculationRef = useRef<{ key: string; report: AstrologyReport } | null>(null);
  // Only the selected natal fields are restored when editing a comparison slot.
  // Do not carry residence, transit or previous engine fields into a fresh chart.
  const savedInput = comparisonMode ? initialComparisonInput : undefined;
  const savedDate = savedInput?.birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  const savedTime = savedInput?.birthTimeAccuracy === "known"
    ? savedInput.birthTime.match(/^([01]\d|2[0-3]):([0-5]\d)$/u) : null;
  const [form, setForm] = useState<BirthInput>(() => savedInput ? {
    ...initialForm,
    name: sanitizePersianName(savedInput.name ?? ""),
    birthCity: savedInput.birthCity,
    birthCountry: savedInput.birthCountry,
    birthTime: savedTime ? savedTime[0] : "",
  } : initialForm);
  const [dateMode, setDateMode] = useState<BirthDateMode>(savedDate ? "gregorian" : "jalali");
  const [birthDateParts, setBirthDateParts] = useState<JalaliBirthDateParts>(
    initialJalaliBirthDateParts,
  );
  const [gregorianBirthDateParts, setGregorianBirthDateParts] =
    useState<JalaliBirthDateParts>(savedDate ? { year: savedDate[1], month: savedDate[2], day: savedDate[3] } : initialJalaliBirthDateParts);
  const [birthTimeMode, setBirthTimeMode] = useState<BirthTimeMode>(savedInput && !savedTime ? "unknown" : "known");
  const [birthTimeParts, setBirthTimeParts] =
    useState<BirthTimeParts>(savedTime ? { hour: savedTime[1], minute: savedTime[2] } : initialBirthTimeParts);
  const [showAccountPanel, setShowAccountPanel] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [realEngineRequest, setRealEngineRequest] =
    useState<RealEngineRequestState>(initialRealEngineRequest);
  const formRef = useRef<HTMLFormElement>(null);
  const submissionInFlightRef = useRef(false);
  const openReportTimerRef = useRef<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStep, setEditingStep] = useState<ChartJourneyStepId>("name");
  const [showStickyAction, setShowStickyAction] = useState(false);
  const mainSubmitRef = useRef<HTMLButtonElement>(null);
  const [fieldErrors, setFieldErrors] = useState<ChartFieldErrors>({});
  const [generatedReportPath, setGeneratedReportPath] = useState("");
  const [showOpenReportButton, setShowOpenReportButton] = useState(false);

  const [currentResidenceCity, setCurrentResidenceCity] = useState("");
  // Current residence is optional, but when supplied it enables a personal transit reading.
  const includeTransitReading = !comparisonMode && Boolean(currentResidenceCity.trim());
  const [selectedBirthCityId, setSelectedBirthCityId] = useState(savedInput?.birthCityId ?? "");
  const [selectedCurrentResidenceCityId, setSelectedCurrentResidenceCityId] =
    useState("");

  const [cityDirectory, setCityDirectory] = useState<CityDirectory | null>(null);
  const cityDirectoryPromiseRef = useRef<Promise<CityDirectory> | null>(null);

  function ensureCityDirectory(): Promise<CityDirectory> {
    if (!cityDirectoryPromiseRef.current) {
      cityDirectoryPromiseRef.current = import("@/lib/locations/cities")
        .then((directory) => {
          setCityDirectory(directory);
          return directory;
        })
        .catch((error: unknown) => {
          cityDirectoryPromiseRef.current = null; // Allow retry on focus or submit.
          throw error;
        });
    }
    return cityDirectoryPromiseRef.current;
  }

  function prefetchCityDirectory() {
    void ensureCityDirectory().catch(() => {
      // A later field interaction or submit retries; no speculative network loop.
    });
  }

  useEffect(() => {
    const restoreFrame = window.requestAnimationFrame(() => {
      const savedLocation = comparisonMode ? null : loadLastStudyLocation();

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
  }, [comparisonMode]);

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
    if (!cityDirectory || selectedBirthCityId || !form.birthCity.trim()) {
      return [];
    }

    return cityDirectory.filterHalleusCities(form.birthCity).slice(
      0,
      MAX_CITY_SUGGESTIONS,
    );
  }, [cityDirectory, form.birthCity, selectedBirthCityId]);

  const currentResidenceSuggestions = useMemo(() => {
    if (
      !cityDirectory ||
      selectedCurrentResidenceCityId ||
      !currentResidenceCity.trim()
    ) {
      return [];
    }

    return cityDirectory.filterHalleusCities(currentResidenceCity).slice(
      0,
      MAX_CITY_SUGGESTIONS,
    );
  }, [cityDirectory, currentResidenceCity, selectedCurrentResidenceCityId]);

  const gregorianDaySelectOptions = useMemo<readonly ChartSelectOption[]>(
    () =>
      Array.from(
        {
          length: getGregorianDayCount(
            gregorianBirthDateParts.year,
            gregorianBirthDateParts.month,
          ),
        },
        (_, index) => {
          const day = String(index + 1).padStart(2, "0");
          return { value: day, label: Number(day).toLocaleString("fa-IR") };
        },
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
        (selectedBirthCityId || cityDirectory?.findHalleusCityByName(form.birthCity)),
    );
    const steps = [
      { id: "name", label: "نام", complete: Boolean(sanitizePersianName(form.name ?? "").trim()) },
      {
        id: "date",
        label: "تاریخ تولد",
        complete: Boolean(
          dateParts.year && dateParts.month && dateParts.day &&
            (dateMode === "jalali"
              ? parseJalaliDateInput(getSelectedJalaliDateInput(dateParts)).ok
              : Number(dateParts.day) <= getGregorianDayCount(dateParts.year, dateParts.month)),
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
      percentage: (completed / steps.length) * 100,
      steps,
    };
  }, [
    birthDateParts,
    birthTimeMode,
    birthTimeParts,
    dateMode,
    cityDirectory,
    form.birthCity,
    form.name,
    gregorianBirthDateParts,
    selectedBirthCityId,
  ]);

  useEffect(() => {
    if (comparisonMode) onComparisonReadyChange?.(chartProgress.completed === 4);
  }, [comparisonMode, chartProgress.completed, onComparisonReadyChange]);

  function isCollapsedStep(stepId: ChartJourneyStepId) {
    // Keep date/time wheels visible in both mobile form modes.
    if (stepId === "date" || stepId === "time") return false;
    const step = chartProgress.steps.find((entry) => entry.id === stepId);
    const errorKey: ChartFieldId = stepId === "date" ? "birthDate"
      : stepId === "time" ? "birthTime"
      : stepId === "city" ? "birthCity" : "name";
    return Boolean(step?.complete && editingStep !== stepId && !fieldErrors[errorKey]);
  }

  function openJourneyStep(stepId: ChartJourneyStepId) {
    setEditingStep(stepId);
    window.requestAnimationFrame(() => {
      const container = formRef.current?.querySelector<HTMLElement>(
        '[data-chart-step="' + stepId + '"]',
      );
      const selector = stepId === "date" || stepId === "time"
        ? ".wheelViewport, .chart-native-select, .chart-select-trigger"
        : "input:not([type=checkbox])";
      const targets = container?.querySelectorAll<HTMLElement>(selector);
      const target = Array.from(targets ?? []).find((item) => item.getClientRects().length > 0);
      container?.scrollIntoView({
        block: "center",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      target?.focus({ preventScroll: true });
    });
  }

  function submitFromSticky() {
    if (isSubmitting) return;
    const firstIncomplete = chartProgress.steps.find((step) => !step.complete);
    if (firstIncomplete) {
      openJourneyStep(firstIncomplete.id as ChartJourneyStepId);
      return;
    }
    if (includeTransitReading &&
      !(selectedCurrentResidenceCityId || cityDirectory?.findHalleusCityByName(currentResidenceCity.trim()))) {
      const input = formRef.current?.querySelector<HTMLElement>(".chart-residence-location input");
      input?.scrollIntoView({ block: "center", behavior: "smooth" });
      input?.focus({ preventScroll: true });
      return;
    }
    formRef.current?.requestSubmit();
  }

  useEffect(() => {
    if (comparisonMode) return;
    const update = () => {
      const button = mainSubmitRef.current;
      if (!button) return;
      const bounds = button.getBoundingClientRect();
      const keyboardOpen = Boolean(
        window.visualViewport && window.visualViewport.height < window.innerHeight * 0.72,
      );
      setShowStickyAction(!keyboardOpen && bounds.bottom <= 0);
    };
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [comparisonMode, chartProgress.completed, editingStep, includeTransitReading]);

  function clearFieldError(field: ChartFieldId) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateCurrentResidenceCity(value: string) {
    prefetchCityDirectory();
    clearFieldError("currentResidence");
    setSelectedCurrentResidenceCityId("");
    setCurrentResidenceCity(value);
  }

  function selectCurrentResidenceCity(city: HalleusCityOption) {
    const cityName = getHalleusCityDisplayName(city);
    clearFieldError("currentResidence");
    setSelectedCurrentResidenceCityId(city.id);
    setCurrentResidenceCity(cityName);
    saveLastStudyLocation({ cityId: city.id, cityName });
  }

  function updateBirthCity(value: string) {
    prefetchCityDirectory();
    clearFieldError("birthCity");
    setSelectedBirthCityId("");
    updateField("birthCity", value);
  }

  function selectBirthCity(city: HalleusCityOption) {
    clearFieldError("birthCity");
    setSelectedBirthCityId(city.id);
    updateField("birthCity", getHalleusCityDisplayName(city));
  }

  function updateField(field: keyof BirthInput, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyMobileBirthDate(parts: MobileDateParts) {
    clearFieldError("birthDate");
    if (dateMode === "jalali") {
      setBirthDateParts({ ...parts });
    } else {
      setGregorianBirthDateParts({ ...parts });
    }
    updateField("birthDate", "");
  }

  function applyMobileBirthTime(parts: MobileTimeParts) {
    clearFieldError("birthTime");
    setBirthTimeParts({ ...parts });
    updateField("birthTime", parts.hour && parts.minute ? parts.hour + ":" + parts.minute : "");
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

  function normalizeBirthForm(cities: CityDirectory) {
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
      cities.HALLEUS_CITY_OPTIONS.find((city) => city.id === selectedBirthCityId) ??
      cities.findHalleusCityByName(normalizedCityName);

    if (!selectedCity) {
      throw new ChartFormValidationError("birthCity", "فعلاً این شهر در فهرست ایران پیدا نشد. نزدیک‌ترین شهر پیشنهادی را انتخاب کن.");
    }

    let selectedCurrentResidenceCity: HalleusCityOption | null = null;

    if (includeTransitReading) {
      const normalizedCurrentResidenceCityName = currentResidenceCity.trim();

      if (!normalizedCurrentResidenceCityName) {
        throw new ChartFormValidationError(
          "currentResidence",
          CURRENT_RESIDENCE_REQUIRED_MESSAGE,
        );
      }

      selectedCurrentResidenceCity =
        cities.HALLEUS_CITY_OPTIONS.find(
          (city) => city.id === selectedCurrentResidenceCityId,
        ) ?? cities.findHalleusCityByName(normalizedCurrentResidenceCityName) ?? null;

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
      birthTimeAccuracy: birthTimeMode,
      birthCity: selectedCity.faName,
      birthCountry: selectedCity.countryFaName,
      birthCityId: selectedCity.id,
      birthLatitude: selectedCity.latitude,
      birthLongitude: selectedCity.longitude,
      birthTimezone: selectedCity.timezone,
      ...(selectedCurrentResidenceCity
        ? {
            currentResidenceCity: selectedCurrentResidenceCity.faName,
            currentResidenceCountry: selectedCurrentResidenceCity.countryFaName,
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
    engineCity: HalleusCityOption,
  ) {
    if (!comparisonMode) setRealEngineRequest({
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
          birthTimeAccuracy: normalizedForm.birthTimeAccuracy,
          timezone: engineCity.timezone,
          placeName: getHalleusCityDisplayName(engineCity),
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

      const payload = (await response.json().catch(() => null)) as RealChartApiResponse | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error ?? "محاسبه چارت برای این ورودی کامل نشد.",
        );
      }

      if (!payload.report || !payload.realChart || payload.fallback?.used
          || payload.reportGeneration?.status === "fallback-preview") {
        throw new Error(
          "محاسبهٔ معتبر چارت کامل نشد؛ لطفاً دوباره تلاش کن.",
        );
      }

      if (!comparisonMode) setRealEngineRequest({
        status: "loading",
        message: "چارت آماده شد؛ گزارش در حال آماده‌سازی نهایی است…",
      });

      return payload;
    } catch (error) {
      if (!comparisonMode) setRealEngineRequest({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "محاسبه دقیق در این لحظه کامل نشد.",
      });

      throw error;
    }
  }

  // Validate both natal inputs before either calculation. New comparison
  // inputs never enter the standalone personal-report save/navigation path.
  useImperativeHandle(comparisonFormRef, () => ({
    async prepare() {
      setFieldErrors({});
      let normalizedBirth: ReturnType<typeof normalizeBirthForm>;
      try {
        normalizedBirth = normalizeBirthForm(await ensureCityDirectory());
      } catch (error) {
        if (error instanceof ChartFormValidationError) {
          setFieldErrors({ [error.field]: error.message });
        }
        throw error;
      }

      const { normalizedForm, engineCity } = normalizedBirth;
      const key = JSON.stringify(normalizedForm);
      return {
        birthInput: normalizedForm,
        async calculate() {
          const cached = comparisonCalculationRef.current;
          if (cached?.key === key) return cached.report;
          const payload = await requestRealEngineReportData(normalizedForm, engineCity);
          const report = attachReportGenerationContext(payload.report!, payload);
          const randomPart = globalThis.crypto?.randomUUID?.() ??
            `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
          const directReport = { ...report, id: `compare-natal-${randomPart}` };
          comparisonCalculationRef.current = { key, report: directReport };
          return directReport;
        },
      };
    },
  }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (comparisonMode) return;

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
      normalizedBirth = normalizeBirthForm(await ensureCityDirectory());
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
    if (!comparisonMode) {
      window.dispatchEvent(new CustomEvent(HALLEUS_ANALYTICS_ACTION, { detail: "chart_start" }));
    }
    try {
      const realEngineResult = await requestRealEngineReportData(normalizedForm, engineCity);

      if (
        normalizedForm.currentResidenceCityId &&
        normalizedForm.currentResidenceCity
      ) {
        saveLastStudyLocation({
          cityId: normalizedForm.currentResidenceCityId,
          cityName: normalizedForm.currentResidenceCity,
        });
      }

      const nextReport = attachReportGenerationContext(realEngineResult.report!, realEngineResult);

      const { saveGeneratedReportWithAccountFallback } =
        await import("@/lib/storage/account-report-save-client");
      const saveResult = await saveGeneratedReportWithAccountFallback(
        nextReport,
        { navigationGraceMs: 0 },
      );
      if (!saveResult.accountRecord) {
        throw new Error(
          buildReportSaveFallbackMessage(
            saveResult.accountMessage ||
              "ذخیره گزارش روی هالیوس کامل نشد. دوباره تلاش کن.",
          ),
        );
      }

      if (!comparisonMode) {
        window.dispatchEvent(new CustomEvent(HALLEUS_ANALYTICS_ACTION, { detail: "chart_complete" }));
      }
      const nextPath = `/reports/${saveResult.accountRecord.id}?source=account`;
      const nextMessage =
        saveResult.accountStatus === "account-saved"
          ? "گزارش در حساب هالیوس ذخیره شد."
          : "گزارش روی هالیوس ذخیره شد؛ بعد از خواندن می‌توانی آن را به حسابت وصل کنی.";
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
    <section className={"chart-reference-page " + journeyStyles.journeyRoot} aria-label={comparisonMode ? "مشخصات تولد" : "فرم ساخت چارت تولد"} inert={comparisonMode && comparisonBusy}>
      <div className="chart-reference-shell">
        <div className="chart-reference-content">
          <form
            className="chart-reference-form"
            id={comparisonMode ? `${comparisonHeadingId}-form` : "chart-birth-data-form"}
            aria-labelledby={comparisonMode ? comparisonHeadingId : "birth-data-heading"}
            onSubmit={handleSubmit}
            ref={formRef}
          >
            {!comparisonMode ? <>
              <div className={journeyStyles.journeyProgress} aria-live="polite">
                <div className={journeyStyles.progressHeading}>
                  <span>{comparisonMode ? "مشخصات تولد" : "آسمان تو در حال شکل‌گرفتنه"}</span>
                  <strong>{chartProgress.completed.toLocaleString("fa-IR")} از ۴</strong>
                </div>
                <div className={journeyStyles.orbitTrack}>
                  {chartProgress.steps.map((step, index) => (
                    <span
                      key={step.id}
                      className={journeyStyles.orbitStep + (step.complete ? " " + journeyStyles.orbitComplete : "")}
                      aria-label={step.label + ": " + (step.complete ? "تکمیل شده" : "تکمیل نشده")}
                    >
                      <span className={journeyStyles.orbitDot} aria-hidden="true">
                        {step.complete ? "✓" : (index + 1).toLocaleString("fa-IR")}
                      </span>
                      <span>{step.label}</span>
                    </span>
                  ))}
                </div>
                <p className={journeyStyles.progressHint}>
                  {chartProgress.completed === 4
                    ? "اطلاعات اصلی آماده است؛ می‌تونی آسمان تولدت رو بسازی."
                    : "هر اطلاعاتی که تکمیل کنی، یک نقطه از آسمانت روشن می‌شه."}
                </p>
              </div>
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

            </> : null}

            <div className="chart-form-fields">
              <div className={journeyStyles.journeyStep + (isCollapsedStep("name") ? " " + journeyStyles.stepCollapsed : "")}
                data-chart-step="name">
                <button type="button" className={journeyStyles.stepSummary}
                  aria-controls={comparisonMode ? `${comparisonHeadingId}-name` : "chart-journey-name"}
                  aria-label="ویرایش نام"
                  aria-expanded={!isCollapsedStep("name")}
                  onClick={() => openJourneyStep("name")}>
                  <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                  <span className={journeyStyles.summaryTitle}>نام</span>
                  <strong className={journeyStyles.summaryValue}>{(form.name ?? "").trim()}</strong>
                  <span className={journeyStyles.summaryEdit}>ویرایش</span>
                </button>
                <div className={journeyStyles.stepBody} id={comparisonMode ? `${comparisonHeadingId}-name` : "chart-journey-name"} onFocusCapture={() => setEditingStep("name")}>
              <label className="chart-field chart-field-full">
                <span className="chart-field-label">
                  <span aria-hidden="true">♙</span>
                  نام
                </span>
                <input
                  required
                  aria-required="true"
                  autoComplete={comparisonMode ? "off" : "name"}
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
                  placeholder={comparisonMode ? "نام را به فارسی وارد کنید" : "نام خود را به فارسی وارد کنید"}
                />
                <FieldError message={fieldErrors.name} />
              </label>
                </div>
              </div>

              <div className={journeyStyles.journeyStep + (isCollapsedStep("date") ? " " + journeyStyles.stepCollapsed : "")}
                data-chart-step="date">
                <button type="button" className={journeyStyles.stepSummary}
                  aria-controls={comparisonMode ? `${comparisonHeadingId}-date` : "chart-journey-date"}
                  aria-label="ویرایش تاریخ تولد"
                  aria-expanded={!isCollapsedStep("date")}
                  onClick={() => openJourneyStep("date")}>
                  <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                  <span className={journeyStyles.summaryTitle}>تاریخ تولد</span>
                  <strong className={journeyStyles.summaryValue}>{dateMode === "jalali" ? [birthDateParts.day, birthDateParts.month, birthDateParts.year].join("/") : [gregorianBirthDateParts.day, gregorianBirthDateParts.month, gregorianBirthDateParts.year].join("/")}</strong>
                  <span className={journeyStyles.summaryEdit}>ویرایش</span>
                </button>
                <div className={journeyStyles.stepBody} id={comparisonMode ? `${comparisonHeadingId}-date` : "chart-journey-date"} onFocusCapture={() => setEditingStep("date")}>
              <div className="chart-field chart-field-full">
                <div className="chart-field-title-row chart-date-title-row">
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

                  <MobileBirthDatePicker
                    mode={dateMode}
                    value={dateMode === "jalali" ? birthDateParts : gregorianBirthDateParts}
                    yearOptions={dateMode === "jalali" ? JALALI_YEAR_OPTIONS : GREGORIAN_YEAR_OPTIONS}
                    monthOptions={dateMode === "jalali" ? JALALI_MONTH_OPTIONS : GREGORIAN_MONTH_OPTIONS}
                    onConfirm={applyMobileBirthDate}
                  />

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
                        options={JALALI_YEAR_SELECT_OPTIONS}
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
                        options={JALALI_DAY_SELECT_OPTIONS}
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
                        options={GREGORIAN_YEAR_SELECT_OPTIONS}
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
                        options={gregorianDaySelectOptions}
                      />
                    </div>
                  </div>
                )}
                <FieldError message={fieldErrors.birthDate} />
              </div>
                </div>
              </div>

              <div className={journeyStyles.journeyStep + (isCollapsedStep("time") ? " " + journeyStyles.stepCollapsed : "")}
                data-chart-step="time">
                <button type="button" className={journeyStyles.stepSummary}
                  aria-controls={comparisonMode ? `${comparisonHeadingId}-time` : "chart-journey-time"}
                  aria-label="ویرایش ساعت تولد"
                  aria-expanded={!isCollapsedStep("time")}
                  onClick={() => openJourneyStep("time")}>
                  <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                  <span className={journeyStyles.summaryTitle}>ساعت تولد</span>
                  <strong className={journeyStyles.summaryValue}>{birthTimeMode === "unknown" ? "ساعت نامشخص" : [birthTimeParts.hour, birthTimeParts.minute].join(":")}</strong>
                  <span className={journeyStyles.summaryEdit}>ویرایش</span>
                </button>
                <div className={journeyStyles.stepBody} id={comparisonMode ? `${comparisonHeadingId}-time` : "chart-journey-time"} onFocusCapture={() => setEditingStep("time")}>
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

                {birthTimeMode === "known" ? (
                  <DeferredMobileBirthTimePicker value={birthTimeParts} onConfirm={applyMobileBirthTime} />
                ) : null}

                {birthTimeMode === "known" ? (
                  <div
                  className="birth-time-picker-grid"
                  dir="ltr"
                  role="group"
                  aria-label="انتخاب ساعت تولد به‌صورت ۲۴ ساعته"
                >
                  <div className="chart-select-segment" dir="rtl">
                    <span>ساعت تولد</span>
                    <ChartSelect
                      key={`hour-${birthTimeMode}`}
                      ariaLabel="ساعت تولد از صفر تا بیست‌وسه"
                      placeholder="انتخاب"
                      value={birthTimeParts.hour}
                      onChange={(value) =>
                        updateBirthTimePart("hour", value)
                      }
                      options={TIME_HOUR_SELECT_OPTIONS}
                    />
                  </div>

                  <div className="chart-select-segment" dir="rtl">
                    <span>دقیقه</span>
                    <ChartSelect
                      key={`minute-${birthTimeMode}`}
                      ariaLabel="دقیقه تولد"
                      placeholder="انتخاب"
                      value={birthTimeParts.minute}
                      onChange={(value) =>
                        updateBirthTimePart("minute", value)
                      }
                      options={TIME_MINUTE_SELECT_OPTIONS}
                    />
                  </div>
                </div>
                ) : null}

                {!comparisonMode && birthTimeMode === "unknown" ? (
                  <small className="field-hint">
                    اگر ساعت دقیق را نمی‌دانی، می‌توانی ادامه بدهی؛ در گزارش مشخص می‌کنیم کدام بخش‌ها به ساعت دقیق وابسته‌اند.
                  </small>
                ) : null}
                <FieldError message={fieldErrors.birthTime} />
              </div>
                </div>
              </div>

              <div className={journeyStyles.journeyStep + (isCollapsedStep("city") ? " " + journeyStyles.stepCollapsed : "")}
                data-chart-step="city">
                <button type="button" className={journeyStyles.stepSummary}
                  aria-controls={comparisonMode ? `${comparisonHeadingId}-city` : "chart-journey-city"}
                  aria-label="ویرایش شهر تولد"
                  aria-expanded={!isCollapsedStep("city")}
                  onClick={() => openJourneyStep("city")}>
                  <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                  <span className={journeyStyles.summaryTitle}>شهر تولد</span>
                  <strong className={journeyStyles.summaryValue}>{form.birthCity.trim()}</strong>
                  <span className={journeyStyles.summaryEdit}>ویرایش</span>
                </button>
                <div className={journeyStyles.stepBody} id={comparisonMode ? `${comparisonHeadingId}-city` : "chart-journey-city"} onFocusCapture={() => setEditingStep("city")}>
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
                    onFocus={prefetchCityDirectory}
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
                        {getHalleusCityDisplayName(city)}
                      </button>
                    ))}
                  </div>
                ) : null}
                <FieldError message={fieldErrors.birthCity} />
              </div>
                </div>
              </div>

              {!comparisonMode ? (
                <div className={"chart-field chart-city-field chart-city-card chart-transit-location chart-residence-location " + journeyStyles.residenceField}>
                  <label className="chart-city-label">
                    <span className="chart-field-label">
                      <span aria-hidden="true">⌖</span>
                      {CURRENT_RESIDENCE_LABEL}
                      <small className={journeyStyles.residenceOptional}>اختیاری</small>
                    </span>
                    <input
                      autoComplete="address-level2"
                      value={currentResidenceCity}
                      onFocus={prefetchCityDirectory}
                      onChange={(event) => updateCurrentResidenceCity(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && currentResidenceSuggestions[0]) {
                          event.preventDefault();
                          selectCurrentResidenceCity(currentResidenceSuggestions[0]);
                        }
                      }}
                      placeholder={CURRENT_RESIDENCE_PLACEHOLDER}
                    />
                  </label>
                  {currentResidenceSuggestions.length > 0 ? (
                    <div className="city-suggestion-chips has-suggestions"
                      aria-label={CURRENT_RESIDENCE_SUGGESTIONS_LABEL}>
                      {currentResidenceSuggestions.map((city) => (
                        <button key={city.id} type="button" className="city-suggestion-chip"
                          onClick={() => selectCurrentResidenceCity(city)}>
                          {getHalleusCityDisplayName(city)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <FieldError message={fieldErrors.currentResidence} />
                </div>
              ) : null}

            </div>
          </form>


          {!comparisonMode ? <div className="chart-form-actions">
            <button
              className="button chart-submit-button"
              ref={mainSubmitRef}
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
          </div> : null}

          {!comparisonMode ? (
            <p className="chart-form-reassurance">
              گزارش پایه رایگان است و برای ساختش به ثبت‌نام نیاز نداری.
            </p>
          ) : null}

          {!comparisonMode ? (
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

              {showAccountPanel ? <LazySupabaseAuthPanel compact /> : null}
            </div>
          ) : null}
          {!comparisonMode ? (
            <ChartStickyPortal>
              <div className={journeyStyles.stickyBar + (showStickyAction && !isSubmitting && realEngineRequest.status === "idle" ? " " + journeyStyles.stickyVisible : "")}
              aria-hidden={!(showStickyAction && !isSubmitting && realEngineRequest.status === "idle")} data-chart-sticky-action="mobile">
              <div className={journeyStyles.stickyCopy}>
                <strong>{chartProgress.completed === 4 ? "آسمان تو آماده‌ست" : "آسمان تو شکل می‌گیره"}</strong>
                <small>{chartProgress.completed === 4
                  ? "آمادهٔ ساخت چارت شخصی"
                  : (4 - chartProgress.completed).toLocaleString("fa-IR") + " اطلاعات باقی‌ مونده"}</small>
              </div>
              <button type="button" className={journeyStyles.stickyButton}
                tabIndex={showStickyAction && !isSubmitting && realEngineRequest.status === "idle" ? 0 : -1}
                disabled={isSubmitting}
                onClick={submitFromSticky}>
                {isSubmitting ? "در حال ساخت…" : "ساخت چارت تولد"}
                <span aria-hidden="true">←</span>
              </button>
              </div>
            </ChartStickyPortal>
          ) : null}
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
