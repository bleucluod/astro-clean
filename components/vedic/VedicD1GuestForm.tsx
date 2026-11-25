"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  useEffect, useMemo, useRef, useState, useSyncExternalStore,
  type FormEvent, type ChangeEvent, type KeyboardEvent,
} from "react";
import journeyStyles from "@/components/chart-form-journey.module.css";
import pickerStyles from "@/components/chart-mobile-birth-picker.module.css";
import type { MobileDateParts, MobileTimeParts } from "@/components/ChartMobileBirthPicker";
import type { HalleusCity } from "@/lib/locations/cities";
import { isVedicD1PremiumPreview, type VedicD1FreeReading } from "@/lib/vedic/vedic-d1-reading-contract";
import { useVedicD1GuestSession } from "./VedicD1GuestSession";
import { VedicChartSelect } from "./VedicChartSelect";
import styles from "./vedic-d1-guest.module.css";

type CityDirectory = typeof import("@/lib/locations/cities");
type Calendar = "jalali" | "gregorian";
type Occurrence = "earlier" | "later";
type Step = "name" | "date" | "time" | "city";
type Feedback = { kind: "error" | "unavailable"; message: string };
type Option = { value: string; label: string };

const CITY_LIMIT = 7;
const API_PATH = "/api/vedic/d1";
const EMPTY_DATE: MobileDateParts = { year: "", month: "", day: "" };
const EMPTY_TIME: MobileTimeParts = { hour: "", minute: "" };
const JALALI_MONTHS: readonly Option[] = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
].map((label, index) => ({ value: String(index + 1).padStart(2, "0"), label }));
const GREGORIAN_MONTHS: readonly Option[] = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
].map((label, index) => ({ value: String(index + 1).padStart(2, "0"), label }));
const fa = (n: number) => n.toLocaleString("fa-IR", { useGrouping: false });
const JALALI_YEARS = Array.from({ length: 101 }, (_, i) => String(1405 - i));
const GREGORIAN_YEARS = Array.from({ length: 121 }, (_, i) => String(2026 - i));
const DAY_OPTIONS: readonly Option[] = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"), label: fa(i + 1),
}));
const HOUR_OPTIONS: readonly Option[] = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, "0"), label: fa(i).padStart(2, "۰"),
}));
const MINUTE_OPTIONS: readonly Option[] = Array.from({ length: 60 }, (_, i) => ({
  value: String(i).padStart(2, "0"), label: fa(i).padStart(2, "۰"),
}));
const toYears = (years: readonly string[]): readonly Option[] =>
  years.map(value => ({ value, label: fa(Number(value)) }));
const JALALI_YEAR_OPTIONS = toYears(JALALI_YEARS);
const GREGORIAN_YEAR_OPTIONS = toYears(GREGORIAN_YEARS);
const subscribeHydration = () => () => {};
const hydratedClient = () => true;
const hydratedServer = () => false;

const mobilePlaceholder = () => (
  <div className={pickerStyles.alwaysPicker} style={{ minHeight: 54 }} aria-hidden="true" />
);
const MobileDatePicker = dynamic(
  () => import("@/components/ChartMobileBirthPicker").then(m => m.MobileBirthDatePicker),
  { ssr: false, loading: mobilePlaceholder },
);
const MobileTimePicker = dynamic(
  () => import("@/components/ChartMobileBirthPicker").then(m => m.MobileBirthTimePicker),
  { ssr: false, loading: mobilePlaceholder },
);

/** Mirrors the lazy time-wheel entry of /chart without a second runtime bundle. */
function DeferredTimePicker({
  value, onConfirm,
}: {
  value: MobileTimeParts;
  onConfirm: (value: MobileTimeParts) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
  useEffect(() => {
    if (nearby || !ref.current) return;
    const mobile = window.matchMedia("(max-width: 760px)");
    if (!mobile.matches) return;
    if (!("IntersectionObserver" in window)) {
      setNearby(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) {
        setNearby(true);
        observer.disconnect();
      }
    }, { rootMargin: "0px 0px 120px 0px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [nearby]);
  return <div ref={ref} onFocusCapture={() => setNearby(true)}
    onPointerDownCapture={() => setNearby(true)}>
    {nearby ? <MobileTimePicker value={value} onConfirm={onConfirm} /> : mobilePlaceholder()}
  </div>;
}

function parseDate(date: string): MobileDateParts {
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(date);
  return match ? {
    year: match[1], month: match[2].padStart(2, "0"), day: match[3].padStart(2, "0"),
  } : EMPTY_DATE;
}

function parseTime(time: string): MobileTimeParts {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  return match ? { hour: match[1], minute: match[2] } : EMPTY_TIME;
}

function validGregorian(date: MobileDateParts): boolean {
  const year = Number(date.year), month = Number(date.month), day = Number(date.day);
  if (!/^\d{4}$/.test(date.year) || !date.month || !date.day) return false;
  const actual = new Date(Date.UTC(year, month - 1, day));
  return actual.getUTCFullYear() === year && actual.getUTCMonth() + 1 === month &&
    actual.getUTCDate() === day;
}

function validTime(time: MobileTimeParts): boolean {
  return /^(0\d|1\d|2[0-3])$/.test(time.hour) &&
    /^[0-5]\d$/.test(time.minute);
}

function isVedicD1FreeReading(value: unknown): value is VedicD1FreeReading {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  const view = r.view as Record<string, unknown> | null;
  const short = r.shortReading as Record<string, unknown> | null;
  return r.kind === "free-d1" && r.responseVersion === "vedic-d1-reading/1" &&
    r.premiumStatus === "not-available" &&
    (r.premiumPreview === null || isVedicD1PremiumPreview(r.premiumPreview)) &&
    Array.isArray(r.availablePremiumChapterTitles) &&
    r.availablePremiumChapterTitles.length === 4 &&
    Boolean(view) && view?.version === "vedic-d1-north-layout/1" &&
    Array.isArray(view.rows) && view.rows.length === 9 &&
    typeof view.canDrawHouses === "boolean" && Array.isArray(view.houses) &&
    Array.isArray(view.boundaryRows) && Boolean(view.moonNakshatra) &&
    typeof short?.textFa === "string" &&
    Array.isArray(short.evidence) && short.evidence.length === 2 &&
    !("chapters" in r) && !("chart" in r) && !("utcIso" in r) && !("ownerId" in r);
}

export function VedicD1GuestForm() {
  const router = useRouter();
  const { result, setResult } = useVedicD1GuestSession();
  const hydrated = useSyncExternalStore(subscribeHydration, hydratedClient, hydratedServer);
  const [name, setName] = useState(result?.draft.name ?? "");
  const [calendar, setCalendar] = useState<Calendar>(result?.draft.calendar ?? "jalali");
  const [date, setDate] = useState<MobileDateParts>(() => parseDate(result?.draft.birthDate ?? ""));
  const [time, setTime] = useState<MobileTimeParts>(() => parseTime(result?.draft.birthTime ?? ""));
  const [unknownTime, setUnknownTime] = useState(result?.draft.unknownTime ?? false);
  const [editing, setEditing] = useState<Step>("name");
  const [cityQuery, setCityQuery] = useState(result?.draft.cityQuery ?? "");
  const [cityId, setCityId] = useState(result?.draft.cityId ?? "");
  const [cityDirectory, setCityDirectory] = useState<CityDirectory | null>(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [occurrence, setOccurrence] = useState<Occurrence | "">(result?.draft.occurrence ?? "");
  const [needsOccurrence, setNeedsOccurrence] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const cityLoadRef = useRef<Promise<CityDirectory> | null>(null);
  const directoryRef = useRef<CityDirectory | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; requestRef.current?.abort(); };
  }, []);

  function invalidate() {
    requestRef.current?.abort();
    requestRef.current = null;
    setSubmitting(false);
    setFeedback(null);
    setResult(null);
  }

  async function loadCities() {
    if (!cityLoadRef.current) {
      setCityLoading(true);
      cityLoadRef.current = import("@/lib/locations/cities");
    }
    try {
      const directory = await cityLoadRef.current;
      directoryRef.current = directory;
      if (aliveRef.current) { setCityLoading(false); setCityDirectory(directory); }
    } catch {
      cityLoadRef.current = null;
      if (aliveRef.current) {
        setCityLoading(false);
        setFeedback({ kind: "error", message: "فهرست شهرها در دسترس نیست." });
      }
    }
  }

  function updateCity(value: string) {
    invalidate();
    setNeedsOccurrence(false);
    setOccurrence("");
    setCityQuery(value);
    setCityId("");
    setCityOpen(true);
    if (!directoryRef.current) void loadCities();
  }

  function chooseCity(city: HalleusCity) {
    invalidate();
    setNeedsOccurrence(false);
    setOccurrence("");
    setCityQuery(directoryRef.current?.getHalleusCityDisplayName(city) ?? city.faName);
    setCityId(city.id);
    setCityOpen(false);
  }

  const suggestions = useMemo(() =>
    cityDirectory && cityOpen && cityQuery.trim() && !cityId
      ? cityDirectory.filterHalleusCities(cityQuery).slice(0, CITY_LIMIT)
      : [], [cityDirectory, cityOpen, cityId, cityQuery]);

  function selectCityOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const exact = directoryRef.current?.findHalleusCityByName(cityQuery.trim());
    const match = exact ?? suggestions[0];
    if (match) chooseCity(match);
    else {
      setFeedback({ kind: "error", message: "شهر تولد را از پیشنهادها انتخاب کن." });
      setCityOpen(true);
      if (!directoryRef.current) void loadCities();
    }
  }

  const birthDate = date.year && date.month && date.day
    ? date.year + (calendar === "jalali" ? "/" : "-") + date.month +
      (calendar === "jalali" ? "/" : "-") + date.day : "";
  const birthTime = validTime(time) ? time.hour + ":" + time.minute : "";
  const steps: { id: Step; label: string; complete: boolean }[] = [
    { id: "name", label: "نام", complete: Boolean(name.trim()) },
    { id: "date", label: "تاریخ", complete: Boolean(birthDate) },
    { id: "time", label: "ساعت", complete: unknownTime || Boolean(birthTime) },
    { id: "city", label: "شهر", complete: Boolean(cityId) },
  ];
  const collapsed = (id: Step) => steps.some(s => s.id === id && s.complete) && editing !== id;
  const draft = {
    name, calendar, birthDate, birthTime: unknownTime ? "" : birthTime,
    unknownTime, cityQuery, cityId, occurrence,
  };

  function updateDatePart(part: keyof MobileDateParts, value: string) {
    invalidate();
    setNeedsOccurrence(false);
    setOccurrence("");
    setDate(current => {
      const next = { ...current, [part]: value };
      if (part !== "day") next.day = "";
      return next;
    });
  }

  function updateTimePart(next: MobileTimeParts) {
    invalidate();
    setNeedsOccurrence(false);
    setOccurrence("");
    setTime(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!name.trim()) { setFeedback({ kind: "error", message: "نام را وارد کن." }); setEditing("name"); return; }
    if (!birthDate) { setFeedback({ kind: "error", message: "تاریخ تولد را کامل انتخاب کن." }); setEditing("date"); return; }
    if (!unknownTime && !birthTime) {
      setFeedback({ kind: "error", message: "ساعت را انتخاب کن یا «نمی‌دانم» را بزن." });
      setEditing("time"); return;
    }
    if (!cityId) {
      setFeedback({ kind: "error", message: "شهر تولد را از فهرست انتخاب کن." });
      setEditing("city"); setCityOpen(true); return;
    }
    if (unknownTime) {
      // Never calculate Lagna or houses using a guessed birth time.
      let valid = calendar === "gregorian" ? validGregorian(date) : false;
      if (calendar === "jalali") {
        const { parseJalaliDateInput } = await import("@/lib/date/jalali");
        valid = parseJalaliDateInput(birthDate).ok;
      }
      if (!valid) { setFeedback({ kind: "error", message: "تاریخ تولد معتبر نیست." }); setEditing("date"); return; }
      setResult({ kind: "untimed", name: name.trim(), reading: null, localPreview: null, draft });
      router.push("/chart/vedic/result");
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setSubmitting(true);
    setFeedback(null);
    try {
      const birthPayload = {
        calendar, birthDate, birthTime, cityId,
        ...(occurrence ? { occurrence } : {}),
      };
      const response = await fetch(API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
        body: JSON.stringify(birthPayload),
      });
      if (!aliveRef.current || requestRef.current !== controller) return;
      const payload: unknown = await response.json().catch(() => null);
      const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      if (response.status === 400 && data.code === "INPUT_INVALID") {
        if (data.issue === "TIME_AMBIGUOUS") setNeedsOccurrence(true);
        setFeedback({ kind: "error", message: typeof data.message === "string"
          ? data.message : "اطلاعات تولد را بررسی کن." });
        return;
      }
      if (response.status !== 200 || data.ok !== true ||
          !isVedicD1FreeReading(data.reading)) {
        setFeedback({ kind: "unavailable", message: "نتیجهٔ معتبر دریافت نشد؛ دوباره تلاش کن." });
        return;
      }
      if (!aliveRef.current || requestRef.current !== controller) return;
      setResult({ kind: "timed", name: name.trim(), reading: data.reading,
        localPreview: null, draft });
      router.push("/chart/vedic/result");
    } catch {
      if (!controller.signal.aborted && aliveRef.current) {
        setFeedback({ kind: "unavailable", message: "محاسبه فعلاً در دسترس نیست." });
      }
    } finally {
      if (requestRef.current === controller && aliveRef.current) {
        requestRef.current = null;
        setSubmitting(false);
      }
    }
  }

  const years = calendar === "jalali" ? JALALI_YEARS : GREGORIAN_YEARS;
  const months = calendar === "jalali" ? JALALI_MONTHS : GREGORIAN_MONTHS;
  const yearOptions = calendar === "jalali" ? JALALI_YEAR_OPTIONS : GREGORIAN_YEAR_OPTIONS;

  return (
    <div className={styles.formRoot}>
      <section className={"chart-reference-page " + journeyStyles.journeyRoot} aria-label="فرم چارت تولد ودیک">
        <div className="chart-reference-shell">
          <div className="chart-reference-content">
            <form className="chart-reference-form" id="vedic-guest-form"
              onSubmit={submit} aria-label="اطلاعات تولد ودیک">
              <div className={journeyStyles.journeyProgress} aria-live="polite">
                <div className={journeyStyles.orbitTrack}>
                  {steps.map((step,i) => (
                    <span key={step.id}
                      aria-label={step.label + ": " + (step.complete ? "تکمیل شده" : "تکمیل نشده")}
                      className={journeyStyles.orbitStep + (step.complete ? " " + journeyStyles.orbitComplete : "")}>
                      <span className={journeyStyles.orbitDot} aria-hidden="true">
                        {step.complete ? "✓" : (i+1).toLocaleString("fa-IR")}
                      </span>
                      <span>{step.label}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="chart-form-fields">
                <div className={journeyStyles.journeyStep + (collapsed("name") ? " " + journeyStyles.stepCollapsed : "")}
                  data-chart-step="name">
                  <button type="button" className={journeyStyles.stepSummary} aria-controls="vedic-journey-name"
                    aria-expanded={!collapsed("name")} onClick={() => setEditing("name")}>
                    <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                    <span className={journeyStyles.summaryTitle}>نام</span>
                    <strong className={journeyStyles.summaryValue}>{name.trim()}</strong>
                    <span className={journeyStyles.summaryEdit}>ویرایش</span>
                  </button>
                  <div className={journeyStyles.stepBody} id="vedic-journey-name"
                    onFocusCapture={() => setEditing("name")}>
                    <label className="chart-field chart-field-full">
                      <span className="chart-field-label"><span aria-hidden="true">♙</span>نام</span>
                      <input id="vedic-name" type="text" name="displayName" lang="fa" dir="rtl"
                        autoComplete="name" maxLength={40} required placeholder="نام خود را به فارسی وارد کنید"
                        value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          invalidate(); setName(e.target.value.replaceAll("ي","ی").replaceAll("ك","ک")
                            .replace(/[^ء-غف-یپچژکگ‌\s]/g, "").replace(/\s{2,}/g," ").replace(/^\s+/g,""));
                        }} />
                    </label>
                  </div>
                </div>
                <div className={journeyStyles.journeyStep + (collapsed("date") ? " " + journeyStyles.stepCollapsed : "")}
                  data-chart-step="date">
                  <button type="button" className={journeyStyles.stepSummary} aria-controls="vedic-journey-date"
                    aria-expanded={!collapsed("date")} onClick={() => setEditing("date")}>
                    <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                    <span className={journeyStyles.summaryTitle}>تاریخ تولد</span>
                    <strong className={journeyStyles.summaryValue}>
                      {[date.day, date.month, date.year].filter(Boolean).join("/")}
                    </strong>
                    <span className={journeyStyles.summaryEdit}>ویرایش</span>
                  </button>
                  <div className={journeyStyles.stepBody} id="vedic-journey-date"
                    onFocusCapture={() => setEditing("date")}>
                    <div className="chart-field chart-field-full">
                      <div className="chart-field-title-row chart-date-title-row">
                        <span className="chart-field-label"><span aria-hidden="true">▣</span>تاریخ تولد</span>
                        <div className="date-mode-switch" role="group" aria-label="نوع تقویم">
                          <button type="button"
                            className={"date-mode-button" + (calendar === "jalali" ? " is-active" : "")}
                            aria-pressed={calendar === "jalali"}
                            onClick={() => { invalidate(); setNeedsOccurrence(false); setOccurrence("");
                              setCalendar("jalali"); setDate(EMPTY_DATE); }}>شمسی</button>
                          <button type="button"
                            className={"date-mode-button" + (calendar === "gregorian" ? " is-active" : "")}
                            aria-pressed={calendar === "gregorian"}
                            onClick={() => { invalidate(); setNeedsOccurrence(false); setOccurrence("");
                              setCalendar("gregorian"); setDate(EMPTY_DATE); }}>میلادی</button>
                        </div>
                      </div>
                      {hydrated ? <MobileDatePicker mode={calendar} value={date}
                        yearOptions={years} monthOptions={months}
                        onConfirm={next => { invalidate(); setNeedsOccurrence(false);
                          setOccurrence(""); setDate(next); }} /> : mobilePlaceholder()}
                      <div className="birth-date-picker-grid" role="group" aria-label="انتخاب تاریخ تولد">
                        <div className="chart-select-segment">
                          <span>سال</span>
                          <VedicChartSelect ariaLabel="سال تولد" placeholder="انتخاب" value={date.year}
                            options={yearOptions} onChange={value => updateDatePart("year",value)} />
                        </div>
                        <div className="chart-select-segment">
                          <span>ماه</span>
                          <VedicChartSelect ariaLabel="ماه تولد" placeholder="انتخاب" value={date.month}
                            options={months} onChange={value => updateDatePart("month",value)} />
                        </div>
                        <div className="chart-select-segment">
                          <span>روز</span>
                          <VedicChartSelect ariaLabel="روز تولد" placeholder="انتخاب" value={date.day}
                            options={DAY_OPTIONS} onChange={value => updateDatePart("day",value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className={journeyStyles.journeyStep + (collapsed("time") ? " " + journeyStyles.stepCollapsed : "")}
                  data-chart-step="time">
                  <button type="button" className={journeyStyles.stepSummary} aria-controls="vedic-journey-time"
                    aria-expanded={!collapsed("time")} onClick={() => setEditing("time")}>
                    <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                    <span className={journeyStyles.summaryTitle}>ساعت تولد</span>
                    <strong className={journeyStyles.summaryValue}>
                      {unknownTime ? "ساعت نامشخص" : [time.hour,time.minute].filter(Boolean).join(":")}
                    </strong>
                    <span className={journeyStyles.summaryEdit}>ویرایش</span>
                  </button>
                  <div className={journeyStyles.stepBody} id="vedic-journey-time"
                    onFocusCapture={() => setEditing("time")}>
                    <div className="chart-field chart-field-full">
                      <div className="chart-field-title-row chart-time-title-row">
                        <span className="chart-field-label"><span aria-hidden="true">◷</span>ساعت تولد</span>
                        <label className="time-unknown-choice">
                          <input type="checkbox" checked={unknownTime}
                            onChange={e => { invalidate(); setNeedsOccurrence(false);
                              setOccurrence(""); setUnknownTime(e.target.checked); }} />
                          <span>ساعت تولدم را نمی‌دانم</span>
                        </label>
                      </div>
                      {!unknownTime && (hydrated ? <DeferredTimePicker value={time}
                        onConfirm={updateTimePart} /> : mobilePlaceholder())}
                      {!unknownTime && <div className="birth-time-picker-grid" dir="ltr"
                        role="group" aria-label="انتخاب ساعت تولد">
                        <div className="chart-select-segment" dir="rtl">
                          <span>ساعت تولد</span>
                          <VedicChartSelect ariaLabel="ساعت تولد" placeholder="انتخاب"
                            value={time.hour} options={HOUR_OPTIONS}
                            onChange={hour => updateTimePart({ ...time, hour })} />
                        </div>
                        <div className="chart-select-segment" dir="rtl">
                          <span>دقیقه</span>
                          <VedicChartSelect ariaLabel="دقیقه تولد" placeholder="انتخاب"
                            value={time.minute} options={MINUTE_OPTIONS}
                            onChange={minute => updateTimePart({ ...time, minute })} />
                        </div>
                      </div>}
                    </div>
                  </div>
                </div>
                <div className={journeyStyles.journeyStep + (collapsed("city") ? " " + journeyStyles.stepCollapsed : "")}
                  data-chart-step="city">
                  <button type="button" className={journeyStyles.stepSummary} aria-controls="vedic-journey-city"
                    aria-expanded={!collapsed("city")} onClick={() => setEditing("city")}>
                    <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                    <span className={journeyStyles.summaryTitle}>شهر تولد</span>
                    <strong className={journeyStyles.summaryValue}>{cityQuery}</strong>
                    <span className={journeyStyles.summaryEdit}>ویرایش</span>
                  </button>
                  <div className={journeyStyles.stepBody} id="vedic-journey-city"
                    onFocusCapture={() => setEditing("city")}>
                    <div className="chart-field chart-city-field chart-city-card">
                      <label className="chart-city-label">
                        <span className="chart-field-label"><span aria-hidden="true">⌖</span>شهر تولد</span>
                        <input id="vedic-city-search" type="text" name="birthCitySearch"
                          autoComplete="address-level2" required placeholder="نام شهر تولد را وارد کنید"
                          value={cityQuery} aria-controls="vedic-city-options"
                          onFocus={() => { setCityOpen(true); void loadCities(); }}
                          onChange={e => updateCity(e.target.value)} onKeyDown={selectCityOnEnter} />
                      </label>
                      {suggestions.length > 0 && (
                        <div id="vedic-city-options" className="city-suggestion-chips has-suggestions"
                          aria-label="پیشنهادهای شهر تولد">
                          {suggestions.map(city => (
                            <button key={city.id} type="button" className="city-suggestion-chip"
                              onClick={() => chooseCity(city)}>
                              {cityDirectory?.getHalleusCityDisplayName(city) ?? city.faName}
                            </button>
                          ))}
                        </div>
                      )}
                      {cityLoading && <small role="status" className={styles.cityLoading}>در حال دریافت شهرها…</small>}
                    </div>
                  </div>
                </div>
              </div>
              {needsOccurrence && !unknownTime && <fieldset className={styles.occurrence}>
                <legend>این ساعت در تاریخ انتخابی دوبار رخ داده است</legend>
                <label><input type="radio" name="vedic-occurrence"
                  checked={occurrence === "earlier"} onChange={() => { invalidate(); setOccurrence("earlier"); }} />
                  بار اول</label>
                <label><input type="radio" name="vedic-occurrence"
                  checked={occurrence === "later"} onChange={() => { invalidate(); setOccurrence("later"); }} />
                  بار دوم</label>
              </fieldset>}
              <div className="chart-form-actions">
                <button className="button chart-submit-button" type="submit"
                  disabled={!hydrated || submitting}>
                  {submitting ? "در حال محاسبه…" : "ساخت چارت تولد ودیک"}
                </button>
              </div>
              <div className={styles.status} role="status" aria-live="polite" aria-atomic="true">
                {feedback && <p className={feedback.kind === "error" ? styles.error : styles.unavailable}>
                  {feedback.message}</p>}
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
