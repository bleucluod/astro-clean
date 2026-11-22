"use client";

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import type { HalleusCity } from "@/lib/locations/cities";
import type { VedicD1FreeReading } from "@/lib/vedic/vedic-d1-reading-contract";
import { VedicD1NorthChart } from "./VedicD1NorthChart";
import styles from "./vedic-d1-guest.module.css";

type CityDirectory = typeof import("@/lib/locations/cities");
type Calendar = "jalali" | "gregorian";
type Occurrence = "earlier" | "later";
type FormFeedback = { kind: "error" | "unavailable"; message: string; issue?: string };

const CITY_LIMIT = 7;
const API_PATH = "/api/vedic/d1";

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
  const [calendar, setCalendar] = useState<Calendar>("jalali");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [cityId, setCityId] = useState("");
  const [suggestions, setSuggestions] = useState<readonly HalleusCity[]>([]);
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
        setSuggestions(directory.filterHalleusCities(cityQueryRef.current).slice(0, CITY_LIMIT));
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
    setSuggestions(directoryRef.current?.filterHalleusCities(value).slice(0, CITY_LIMIT) ?? []);
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
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
    } catch (error) {
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
    <div className={styles.formPanel}>
      <h2 className={styles.formTitle} id="vedic-guest-form-title">اطلاعات تولد</h2>
      <p className={styles.hint} id="vedic-form-help">برای طالع و خانه‌های ودیک، ساعت دقیق و شهر تولد لازم است. نام و ساخت حساب لازم نیست.</p>
      <form className={styles.form} onSubmit={submit} aria-labelledby="vedic-guest-form-title" aria-describedby="vedic-form-help">
        <fieldset className={styles.calendar}>
          <legend>تقویم تاریخ تولد</legend>
          <label className={styles.radio}>
            <input type="radio" name="vedic-calendar" value="jalali" checked={calendar === "jalali"} onChange={() => { invalidateResponse(); setNeedsOccurrence(false); setOccurrence(""); setCalendar("jalali"); setBirthDate(""); }} />
            شمسی
          </label>
          <label className={styles.radio}>
            <input type="radio" name="vedic-calendar" value="gregorian" checked={calendar === "gregorian"} onChange={() => { invalidateResponse(); setNeedsOccurrence(false); setOccurrence(""); setCalendar("gregorian"); setBirthDate(""); }} />
            میلادی
          </label>
        </fieldset>
        <div className={styles.fieldGrid}>
          <label className={styles.field} htmlFor="vedic-birth-date">
            <span>تاریخ تولد</span>
            <input id="vedic-birth-date" name="birthDate" type="text" autoComplete="off" inputMode="numeric" dir="ltr" required maxLength={16}
              placeholder={calendar === "jalali" ? "۱۳۷۸/۰۵/۲۱" : "1999-08-12"}
              value={birthDate} onChange={(event: ChangeEvent<HTMLInputElement>) => { invalidateResponse(); setNeedsOccurrence(false); setOccurrence(""); setBirthDate(event.target.value); }} />
            <span className={styles.fieldHelp}>{calendar === "jalali" ? "مثال: ۱۳۷۸/۰۵/۲۱" : "مثال: 1999-08-12"}</span>
          </label>
          <label className={styles.field} htmlFor="vedic-birth-time">
            <span>ساعت دقیق تولد</span>
            <input id="vedic-birth-time" name="birthTime" type="text" autoComplete="off" inputMode="numeric" dir="ltr" required maxLength={5}
              placeholder="۰۹:۳۰" value={birthTime}
              onChange={(event: ChangeEvent<HTMLInputElement>) => { invalidateResponse(); setNeedsOccurrence(false); setOccurrence(""); setBirthTime(event.target.value); }} />
            <span className={styles.fieldHelp}>با قالب ساعت:دقیقه؛ ساعت نامعلوم قابل محاسبه نیست.</span>
          </label>
        </div>
        <div className={styles.field}>
          <label htmlFor="vedic-city-search">شهر تولد</label>
          <input id="vedic-city-search" name="birthCitySearch" type="search" autoComplete="off" required
            placeholder="نام شهر را جست‌وجو کن" value={cityQuery}
            aria-describedby="vedic-city-help" aria-invalid={feedback?.kind === "error" && !cityId}
            aria-controls="vedic-city-options"
            onFocus={() => { setCityOpen(true); void loadCityDirectory(); }}
            onChange={(event: ChangeEvent<HTMLInputElement>) => updateCity(event.target.value)} />
          <span className={styles.fieldHelp} id="vedic-city-help">{cityId ? "شهر از فهرست معتبر انتخاب شده است." : "شهر را از پیشنهادهای زیر انتخاب کن؛ فقط تایپ نام کافی نیست."}</span>
          {cityOpen && <ul id="vedic-city-options" className={styles.cityOptions} aria-label="پیشنهادهای شهر تولد">
            {suggestions.map((city) => <li key={city.id}>
              <button className={styles.cityOption} type="button" onClick={() => chooseCity(city)}>
                {directoryRef.current?.getHalleusCityDisplayName(city) ?? city.faName}
              </button>
            </li>)}
            {cityLoading && <li className={styles.cityHint}>در حال دریافت فهرست شهرها…</li>}
            {!cityLoading && !suggestions.length && <li className={styles.cityHint}>شهری پیدا نشد. نام دیگری امتحان کن.</li>}
          </ul>}
        </div>
        {needsOccurrence && <fieldset className={styles.calendar}>
          <legend>این ساعت در تاریخ انتخابی دوبار رخ داده است</legend>
          <label className={styles.radio}><input type="radio" name="vedic-occurrence" checked={occurrence === "earlier"} onChange={() => { invalidateResponse(); setOccurrence("earlier"); }} /> بار اول</label>
          <label className={styles.radio}><input type="radio" name="vedic-occurrence" checked={occurrence === "later"} onChange={() => { invalidateResponse(); setOccurrence("later"); }} /> بار دوم</label>
        </fieldset>}
        <button className={styles.submit} type="submit" disabled={submitting}>
          {submitting ? "در حال بررسی…" : "بررسی اطلاعات تولد"}
        </button>
        <div className={styles.status} role="status" aria-live="polite" aria-atomic="true">
          {feedback && <p className={feedback.kind === "error" ? styles.error : styles.unavailable}>{feedback.message}</p>}
          {reading && <p className={styles.success}>چارت رایگان محاسبه شد. نمودار و جدول پس از فرم قرار دارند.</p>}
        </div>
      </form>
      {reading && <section className={styles.freeResult} aria-label="نتیجهٔ رایگان چارت ودیک">
        <p className={styles.freeReading}>{reading.shortReading.textFa}</p>
        <VedicD1NorthChart view={reading.view} />
        <p className={styles.privacy}>فصل‌های پرمیوم هنوز فعال نیستند. این نتیجه فقط خوانش رایگان است.</p>
      </section>}
      <p className={styles.privacy}>اطلاعات تولدت در نشانی صفحه، کش مشترک یا تاریخچهٔ عمومی ذخیره نمی‌شود. نتیجهٔ رایگان فقط در همین صفحه نمایش داده می‌شود.</p>
    </div>
  );
}
