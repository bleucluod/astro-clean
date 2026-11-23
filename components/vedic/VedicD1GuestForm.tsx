"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type ChangeEvent, type KeyboardEvent, type CSSProperties } from "react";
import journeyStyles from "@/components/chart-form-journey.module.css";
import type { HalleusCity } from "@/lib/locations/cities";
import type { VedicD1FreeReading } from "@/lib/vedic/vedic-d1-reading-contract";
import { VedicD1NorthChart } from "./VedicD1NorthChart";
import styles from "./vedic-d1-guest.module.css";

type CityDirectory = typeof import("@/lib/locations/cities");
type Calendar = "jalali" | "gregorian";
type Occurrence = "earlier" | "later";
type FormFeedback = { kind: "error" | "unavailable"; message: string; issue?: string };
type JourneyStep = "name" | "date" | "time" | "city";

const CITY_LIMIT = 7;
const API_PATH = "/api/vedic/d1";

// Disable native form controls until React has attached the city/submit handlers.
const subscribeToHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;

/** Never treat a premium/manuscript-shaped or malformed response as a free chart. */
function isVedicD1FreeReading(value: unknown): value is VedicD1FreeReading {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  const view = r.view as Record<string, unknown> | null;
  const short = r.shortReading as Record<string, unknown> | null;
  return r.kind === "free-d1" && r.responseVersion === "vedic-d1-reading/1" &&
    r.premiumStatus === "not-available" &&
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


/** Guest-only form. The only successful payload is the public FREE D1 reading. */
export function VedicD1GuestForm() {
  const hydrated = useSyncExternalStore(subscribeToHydration, clientHydrated, serverHydrated);
  const [name, setName] = useState("");
  const [editingStep, setEditingStep] = useState<JourneyStep>("name");
  const [calendar, setCalendar] = useState<Calendar>("jalali");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [cityId, setCityId] = useState("");
  const [cityDirectory, setCityDirectory] = useState<CityDirectory | null>(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [occurrence, setOccurrence] = useState<Occurrence | "">("");
  const [needsOccurrence, setNeedsOccurrence] = useState(false);
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [reading, setReading] = useState<VedicD1FreeReading | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const directoryRef = useRef<CityDirectory | null>(null);
  const cityLoadRef = useRef<Promise<CityDirectory> | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const aliveRef = useRef(true);
  const cityQueryRef = useRef("");

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      activeRequestRef.current?.abort();
    };
  }, []);

  function invalidateResponse() {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setSubmitting(false);
    setFeedback(null);
    setReading(null);
  }

  async function loadCityDirectory() {
    if (!cityLoadRef.current) {
      setCityLoading(true);
      cityLoadRef.current = import("@/lib/locations/cities");
    }
    try {
      const directory = await cityLoadRef.current;
      directoryRef.current = directory;
      if (aliveRef.current) {
        setCityLoading(false);
        setCityDirectory(directory);
      }
    } catch {
      cityLoadRef.current = null;
      if (aliveRef.current) {
        setCityLoading(false);
        setFeedback({ kind: "error", message: "فهرست شهرها در دسترس نیست؛ دوباره تلاش کن." });
      }
    }
  }

  function updateCity(value: string) {
    invalidateResponse();
    setNeedsOccurrence(false);
    setOccurrence("");
    setCityQuery(value);
    cityQueryRef.current = value;
    setCityId("");
    setCityOpen(true);
    if (!directoryRef.current) void loadCityDirectory();
  }

  function chooseCity(city: HalleusCity) {
    invalidateResponse();
    setNeedsOccurrence(false);
    setOccurrence("");
    const label = directoryRef.current?.getHalleusCityDisplayName(city) ?? city.faName;
    setCityQuery(label);
    cityQueryRef.current = label;
    setCityId(city.id);
    setCityOpen(false);
  }

  const suggestions = useMemo(() =>
    cityDirectory && cityOpen && !cityId && cityQuery.trim()
      ? cityDirectory.filterHalleusCities(cityQuery).slice(0, CITY_LIMIT)
      : [], [cityDirectory, cityOpen, cityId, cityQuery]);

  const steps: { id: JourneyStep; label: string; complete: boolean }[] = [
    { id: "name", label: "نام", complete: Boolean(name.trim()) },
    { id: "date", label: "تاریخ", complete: Boolean(birthDate.trim()) },
    { id: "time", label: "ساعت", complete: Boolean(birthTime.trim()) },
    { id: "city", label: "شهر", complete: Boolean(cityId) },
  ];
  const completed = steps.filter(step => step.complete).length;
  const collapsed = (step: JourneyStep) =>
    steps.some(item => item.id === step && item.complete) && editingStep !== step;

  function selectCityOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault(); // Never submit or navigate while editing the city search.
    const exact = directoryRef.current?.findHalleusCityByName(cityQuery.trim());
    const next = exact ?? suggestions[0];
    if (next) chooseCity(next);
    else {
      setCityOpen(true);
      setFeedback({ kind: "error", message: "برای ادامه، شهر را از پیشنهادها انتخاب کن." });
      if (!directoryRef.current) void loadCityDirectory();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      setFeedback({ kind: "error", message: "نام را وارد کن." });
      setEditingStep("name");
      return;
    }
    if (!cityId) {
      setFeedback({ kind: "error", message: "شهر تولد را از فهرست پیشنهادها انتخاب کن." });
      setCityOpen(true);
      return;
    }
    invalidateResponse();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setSubmitting(true);
    try {
      const response = await fetch(API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
        body: JSON.stringify({
          calendar, birthDate: birthDate.trim(), birthTime: birthTime.trim(), cityId,
          ...(occurrence ? { occurrence } : {}),
        }),
      });
      if (!aliveRef.current || activeRequestRef.current !== controller) return;
      const payload: unknown = await response.json().catch(() => null);
      const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      if (response.status === 400 && data.code === "INPUT_INVALID") {
        const issue = typeof data.issue === "string" ? data.issue : undefined;
        if (issue === "TIME_AMBIGUOUS") setNeedsOccurrence(true);
        setFeedback({ kind: "error", issue, message: typeof data.message === "string"
          ? data.message : "اطلاعات تولد را بررسی کن." });
      } else if (response.status === 200 && data.ok === true &&
          isVedicD1FreeReading(data.reading)) {
        setReading(data.reading);
        setFeedback(null);
      } else {
        setFeedback({ kind: "unavailable", message: "نتیجهٔ معتبر ودیک دریافت نشد. اطلاعات واردشده در فرم باقی می‌ماند." });
      }
    } catch {
      if (controller.signal.aborted || !aliveRef.current) return;
      setFeedback({ kind: "unavailable", message: "فعلاً امکان بررسی چارت ودیک وجود ندارد. اطلاعات واردشده در فرم باقی می‌ماند." });
    } finally {
      if (activeRequestRef.current === controller && aliveRef.current) {
        activeRequestRef.current = null;
        setSubmitting(false);
      }
    }
  }

  return (
    <div className={styles.formRoot}>
      <section className={"chart-reference-page " + journeyStyles.journeyRoot} aria-label="فرم چارت تولد ودیک">
        <div className="chart-reference-shell">
          <div className="chart-reference-content">
            <p className={styles.hint} id="vedic-form-help">برای محاسبهٔ طالع و خانه‌های ودیک، ساعت دقیق و شهر تولد لازم است. نام فقط در همین صفحه نمایش داده می‌شود.</p>
            {!hydrated && <p className={styles.loadingHint} role="status">در حال آماده‌سازی فرم…</p>}
            <form className="chart-reference-form" id="vedic-guest-form"
              onSubmit={submit} aria-label="اطلاعات تولد ودیک" aria-describedby="vedic-form-help">
              <fieldset className={styles.fieldsLock} disabled={!hydrated}>
                <legend className={styles.visuallyHidden}>اطلاعات تولد</legend>
              <div className={journeyStyles.journeyProgress} aria-live="polite">
                <div className={journeyStyles.progressHeading}>
                  <span>آسمان ودیک تو در حال شکل‌گرفتنه</span>
                  <strong>{completed.toLocaleString("fa-IR")} از ۴</strong>
                </div>
                <div className={journeyStyles.orbitTrack}>
                  {steps.map((step, i) => (
                    <span key={step.id} className={journeyStyles.orbitStep + (step.complete ? " " + journeyStyles.orbitComplete : "")}>
                      <span className={journeyStyles.orbitDot} aria-hidden="true">{step.complete ? "✓" : (i + 1).toLocaleString("fa-IR")}</span>
                      <span>{step.label}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="chart-form-progress" aria-live="polite">
                <div className="chart-form-progress-header">
                  <span>پیشرفت اطلاعات ضروری</span>
                  <strong>{completed.toLocaleString("fa-IR")} از ۴</strong>
                </div>
                <div className="chart-form-progress-bar"
                  style={{ "--chart-progress": `${completed * 25}%` } as CSSProperties} aria-hidden="true" />
                <div className="chart-form-progress-steps">
                  {steps.map(step => <span key={step.id} className={"chart-form-progress-step" + (step.complete ? " is-complete" : "")}>{step.label}</span>)}
                </div>
              </div>
              <div className="chart-form-fields">
                <div className={journeyStyles.journeyStep + (collapsed("name") ? " " + journeyStyles.stepCollapsed : "")} data-chart-step="name">
                  <button type="button" className={journeyStyles.stepSummary} aria-controls="vedic-journey-name"
                    aria-expanded={!collapsed("name")} onClick={() => setEditingStep("name")}>
                    <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                    <span className={journeyStyles.summaryTitle}>نام</span>
                    <strong className={journeyStyles.summaryValue}>{name.trim()}</strong>
                    <span className={journeyStyles.summaryEdit}>ویرایش</span>
                  </button>
                  <div className={journeyStyles.stepBody} id="vedic-journey-name" onFocusCapture={() => setEditingStep("name")}>
                    <label className="chart-field chart-field-full" htmlFor="vedic-name">
                      <span className="chart-field-label"><span aria-hidden="true">♙</span>نام</span>
                      <input id="vedic-name" name="displayName" type="text" dir="rtl" lang="fa"
                        autoComplete="name" required maxLength={60} placeholder="نام خود را به فارسی وارد کن"
                        value={name} onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          invalidateResponse(); setName(event.target.value);
                        }} />
                      <small className="field-hint">نام فقط روی دستگاهت نمایش داده می‌شود و همراه اطلاعات تولد ارسال نمی‌شود.</small>
                    </label>
                  </div>
                </div>
                <div className={journeyStyles.journeyStep + (collapsed("date") ? " " + journeyStyles.stepCollapsed : "")} data-chart-step="date">
                  <button type="button" className={journeyStyles.stepSummary} aria-controls="vedic-journey-date"
                    aria-expanded={!collapsed("date")} onClick={() => setEditingStep("date")}>
                    <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                    <span className={journeyStyles.summaryTitle}>تاریخ تولد</span>
                    <strong className={journeyStyles.summaryValue}>{birthDate}</strong>
                    <span className={journeyStyles.summaryEdit}>ویرایش</span>
                  </button>
                  <div className={journeyStyles.stepBody} id="vedic-journey-date" onFocusCapture={() => setEditingStep("date")}>
                    <div className="chart-field chart-field-full">
                      <div className="chart-field-title-row chart-date-title-row">
                        <label className="chart-field-label" htmlFor="vedic-birth-date"><span aria-hidden="true">▣</span>تاریخ تولد</label>
                        <div className="date-mode-switch" role="group" aria-label="نوع تقویم تولد">
                          <button type="button" className={"date-mode-button" + (calendar === "jalali" ? " is-active" : "")}
                            aria-pressed={calendar === "jalali"} onClick={() => {
                              invalidateResponse(); setNeedsOccurrence(false); setOccurrence(""); setCalendar("jalali"); setBirthDate("");
                            }}>شمسی</button>
                          <button type="button" className={"date-mode-button" + (calendar === "gregorian" ? " is-active" : "")}
                            aria-pressed={calendar === "gregorian"} onClick={() => {
                              invalidateResponse(); setNeedsOccurrence(false); setOccurrence(""); setCalendar("gregorian"); setBirthDate("");
                            }}>میلادی</button>
                        </div>
                      </div>
                      <input id="vedic-birth-date" name="birthDate" type="text" autoComplete="off"
                        inputMode="numeric" dir="ltr" required maxLength={16}
                        placeholder={calendar === "jalali" ? "۱۳۷۸/۰۵/۲۱" : "1999-08-12"}
                        value={birthDate} onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          invalidateResponse(); setNeedsOccurrence(false); setOccurrence(""); setBirthDate(event.target.value);
                        }} />
                      <small className="field-hint">{calendar === "jalali" ? "مثال: ۱۳۷۸/۰۵/۲۱" : "مثال: 1999-08-12"}</small>
                    </div>
                  </div>
                </div>
                <div className={journeyStyles.journeyStep + (collapsed("time") ? " " + journeyStyles.stepCollapsed : "")} data-chart-step="time">
                  <button type="button" className={journeyStyles.stepSummary} aria-controls="vedic-journey-time"
                    aria-expanded={!collapsed("time")} onClick={() => setEditingStep("time")}>
                    <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                    <span className={journeyStyles.summaryTitle}>ساعت تولد</span>
                    <strong className={journeyStyles.summaryValue}>{birthTime}</strong>
                    <span className={journeyStyles.summaryEdit}>ویرایش</span>
                  </button>
                  <div className={journeyStyles.stepBody} id="vedic-journey-time" onFocusCapture={() => setEditingStep("time")}>
                    <label className="chart-field chart-field-full" htmlFor="vedic-birth-time">
                      <span className="chart-field-label"><span aria-hidden="true">◷</span>ساعت دقیق تولد</span>
                      <input id="vedic-birth-time" name="birthTime" type="text" autoComplete="off"
                        inputMode="numeric" dir="ltr" required maxLength={5} placeholder="۰۹:۳۰"
                        value={birthTime} onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          invalidateResponse(); setNeedsOccurrence(false); setOccurrence(""); setBirthTime(event.target.value);
                        }} />
                      <small className="field-hint">مثال: ۰۹:۳۰؛ برای محاسبهٔ خانه‌های ودیک ساعت دقیق لازم است.</small>
                    </label>
                  </div>
                </div>
                <div className={journeyStyles.journeyStep + (collapsed("city") ? " " + journeyStyles.stepCollapsed : "")} data-chart-step="city">
                  <button type="button" className={journeyStyles.stepSummary} aria-controls="vedic-journey-city"
                    aria-expanded={!collapsed("city")} onClick={() => setEditingStep("city")}>
                    <span className={journeyStyles.summaryCheck} aria-hidden="true">✓</span>
                    <span className={journeyStyles.summaryTitle}>شهر تولد</span>
                    <strong className={journeyStyles.summaryValue}>{cityQuery}</strong>
                    <span className={journeyStyles.summaryEdit}>ویرایش</span>
                  </button>
                  <div className={journeyStyles.stepBody} id="vedic-journey-city" onFocusCapture={() => setEditingStep("city")}>
                    <div className="chart-field chart-city-field chart-city-card">
                      <label className="chart-city-label" htmlFor="vedic-city-search">
                        <span className="chart-field-label"><span aria-hidden="true">⌖</span>شهر تولد</span>
                        <input id="vedic-city-search" name="birthCitySearch" type="search"
                          autoComplete="off" required placeholder="نام شهر تولد را وارد کن"
                          value={cityQuery} aria-describedby="vedic-city-help"
                          aria-invalid={feedback?.kind === "error" && !cityId}
                          aria-controls="vedic-city-options"
                          onFocus={() => { setCityOpen(true); void loadCityDirectory(); }}
                          onChange={(event: ChangeEvent<HTMLInputElement>) => updateCity(event.target.value)}
                          onKeyDown={selectCityOnEnter} />
                      </label>
                      <div id="vedic-city-options" className="city-suggestion-chips has-suggestions" role="group" aria-label="پیشنهادهای شهر تولد">
                        {suggestions.map(city => (
                          <button key={city.id} type="button" className="city-suggestion-chip"
                            onClick={() => chooseCity(city)}>
                            {directoryRef.current?.getHalleusCityDisplayName(city) ?? city.faName}
                          </button>
                        ))}
                      </div>
                      {cityLoading && <small className="field-hint" role="status">در حال دریافت فهرست شهرها…</small>}
                      {!cityLoading && cityOpen && cityQuery.trim() && !cityId && suggestions.length === 0 &&
                        <small className="field-hint">شهری پیدا نشد؛ عبارت دیگری امتحان کن.</small>}
                      <small className="field-hint" id="vedic-city-help">
                        {cityId ? "شهر از فهرست معتبر انتخاب شده است." : "یکی از پیشنهادها را بزن؛ Enter اولین پیشنهاد را انتخاب می‌کند."}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
              {needsOccurrence && <fieldset className={styles.occurrence}>
                <legend>این ساعت در تاریخ انتخابی دوبار رخ داده است</legend>
                <label><input type="radio" name="vedic-occurrence" checked={occurrence === "earlier"}
                  onChange={() => { invalidateResponse(); setOccurrence("earlier"); }} /> بار اول</label>
                <label><input type="radio" name="vedic-occurrence" checked={occurrence === "later"}
                  onChange={() => { invalidateResponse(); setOccurrence("later"); }} /> بار دوم</label>
              </fieldset>}
              </fieldset>
            </form>
            <div className="chart-form-actions">
              <button className="button chart-submit-button" type="submit" form="vedic-guest-form" disabled={!hydrated || submitting}>
                {submitting ? "در حال محاسبهٔ چارت ودیک…" : "ساخت چارت تولد ودیک"}
              </button>
            </div>
            <p className={styles.privacy}>محاسبهٔ پایه رایگان است؛ برای آن نیازی به حساب کاربری نیست.</p>
            <div className={styles.status} role="status" aria-live="polite" aria-atomic="true">
              {feedback && <p className={feedback.kind === "error" ? styles.error : styles.unavailable}>{feedback.message}</p>}
              {reading && <p className={styles.success}>چارت رایگان محاسبه شد. نتیجه زیر فرم نمایش داده می‌شود.</p>}
            </div>
          </div>
        </div>
      </section>
      {reading && <section className={styles.freeResult} aria-label="نتیجهٔ رایگان چارت ودیک">
        <p className={styles.resultGreeting}>{name.trim()}، چارت رایگان ودیک تو آماده است.</p>
        <p className={styles.freeReading}>{reading.shortReading.textFa}</p>
        <VedicD1NorthChart view={reading.view} />
        <p className={styles.resultPrivacy}>فصل‌های پرمیوم هنوز فعال نیستند. این نتیجه فقط خوانش رایگان است.</p>
      </section>}
      <p className={styles.afterword}>نامت فقط روی همین صفحه نمایش داده می‌شود؛ اطلاعات تولد در نشانی صفحه یا کش مشترک ذخیره نمی‌شود.</p>
    </div>
  );
}
