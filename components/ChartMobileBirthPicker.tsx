"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { parseJalaliDateInput } from "@/lib/date/jalali";
import styles from "./chart-mobile-birth-picker.module.css";

export type MobileDateParts = { year: string; month: string; day: string };
export type MobileTimeParts = { hour: string; minute: string };
type DateMode = "jalali" | "gregorian";
type MonthOption = { value: string; label: string };

function englishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632));
}

function twoDigits(value: number) {
  return String(value).padStart(2, "0");
}

function validGregorian(year: string, month: string, day: string) {
  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) return false;
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y &&
    parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
}

function validDate(mode: DateMode, parts: MobileDateParts, years: readonly string[]) {
  if (!years.includes(parts.year)) return false;
  return mode === "jalali"
    ? parseJalaliDateInput(parts.year + "/" + parts.month + "/" + parts.day).ok
    : validGregorian(parts.year, parts.month, parts.day);
}

function dayLimit(mode: DateMode, year: string, month: string) {
  const m = Number(month);
  if (!month || m < 1 || m > 12) return 31;
  if (mode === "jalali") {
    if (m <= 6) return 31;
    if (m < 12) return 30;
    return /^\d{4}$/.test(year) && parseJalaliDateInput(year + "/12/30").ok ? 30 : 29;
  }
  return /^\d{4}$/.test(year)
    ? new Date(Date.UTC(Number(year), m, 0)).getUTCDate()
    : 31;
}

function parseTime(value: string): MobileTimeParts | null {
  const normalized = englishDigits(value.trim()).replace(/[٫：]/g, ":");
  const match = normalized.match(/^(\d{1,2}):(\d{1,2})$/) ??
    normalized.match(/^(\d{1,2})(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour: twoDigits(hour), minute: twoDigits(minute) };
}

function PickerSheet({
  title, onClose, children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const focused = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), input:not([disabled])',
      ));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = oldOverflow;
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.portal} dir="rtl">
      <button type="button" className={styles.backdrop} aria-label="بستن انتخابگر" tabIndex={-1} onClick={onClose} />
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-label={title} ref={panelRef}>
        <header className={styles.sheetHeader}>
          <div className={styles.sheetHeading}>
            <span className={styles.eyebrow}>هالیوس · اطلاعات تولد</span>
            <h3>{title}</h3>
          </div>
          <button className={styles.close} type="button" aria-label="بستن" onClick={onClose}>×</button>
        </header>
        <div className={styles.sheetScroll}>{children}</div>
      </section>
    </div>, document.body,
  );
}

export function MobileBirthDatePicker({
  mode, value, yearOptions, monthOptions, onConfirm,
}: {
  mode: DateMode;
  value: MobileDateParts;
  yearOptions: readonly string[];
  monthOptions: readonly MonthOption[];
  onConfirm: (value: MobileDateParts) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MobileDateParts>({ year: "", month: "", day: "" });
  const [error, setError] = useState("");
  const close = useCallback(() => setOpen(false), []);
  const openPicker = () => {
    setDraft({ ...value });
    setError("");
    setOpen(true);
  };
  const displayMonth = monthOptions.find((item) => item.value === value.month)?.label;
  const hasValue = Boolean(value.year && value.month && value.day);
  const maxDays = dayLimit(mode, draft.year, draft.month);
  const valid = validDate(mode, draft, yearOptions);

  function changeDraft(field: keyof MobileDateParts, nextValue: string) {
    setError("");
    setDraft((previous) => {
      const next = { ...previous, [field]: nextValue };
      if ((field === "month" || field === "year") &&
        Number(next.day) > dayLimit(mode, next.year, next.month)) next.day = "";
      return next;
    });
  }

  function save() {
    if (!valid) {
      setError("سال، ماه و روز معتبر را انتخاب کن.");
      return;
    }
    onConfirm({ ...draft });
    close();
  }

  return (
    <>
      <button
        type="button"
        className={"chart-mobile-picker-trigger " + styles.trigger}
        onClick={openPicker}
        aria-label="انتخاب تاریخ تولد"
      >
        <span className={styles.triggerText}>
          <small>تاریخ تولد {mode === "jalali" ? "شمسی" : "میلادی"}</small>
          <strong>{hasValue ? value.day + " " + displayMonth + " " +
            Number(value.year).toLocaleString("fa-IR", { useGrouping: false }) : "روز، ماه و سال را انتخاب کن"}</strong>
        </span>
        <span className={styles.triggerIcon} aria-hidden="true">▦</span>
      </button>
      {open ? (
        <PickerSheet title="انتخاب تاریخ تولد" onClose={close}>
          <p className={styles.intro}>سال را تایپ کن و ماه و روز را از گزینه‌های زیر انتخاب کن.</p>
          <label className={styles.yearLabel}>
            <span>سال تولد {mode === "jalali" ? "شمسی" : "میلادی"}</span>
            <input
              className={styles.yearInput}
              value={draft.year}
              inputMode="numeric"
              autoComplete="bday-year"
              maxLength={4}
              dir="ltr"
              placeholder={mode === "jalali" ? "۱۳۷۸" : "۱۹۹۹"}
              onChange={(event) => changeDraft("year", englishDigits(event.target.value).replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          <div className={styles.sectionLabel}>ماه تولد</div>
          <div className={styles.monthGrid}>
            {monthOptions.map((month) => (
              <button
                type="button" key={month.value}
                className={styles.choice + (draft.month === month.value ? " " + styles.selected : "")}
                aria-pressed={draft.month === month.value}
                onClick={() => changeDraft("month", month.value)}
              >{month.label}</button>
            ))}
          </div>
          <div className={styles.sectionLabel}>روز تولد</div>
          <div className={styles.dayGrid}>
            {Array.from({ length: maxDays }, (_, index) => {
              const day = twoDigits(index + 1);
              return (
                <button type="button" key={day}
                  className={styles.dayChoice + (draft.day === day ? " " + styles.selected : "")}
                  aria-pressed={draft.day === day}
                  onClick={() => changeDraft("day", day)}
                >{(index + 1).toLocaleString("fa-IR")}</button>
              );
            })}
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button type="button" className={styles.confirm} onClick={save}>تأیید تاریخ تولد</button>
        </PickerSheet>
      ) : null}
    </>
  );
}

export function MobileBirthTimePicker({
  value, onConfirm,
}: {
  value: MobileTimeParts;
  onConfirm: (value: MobileTimeParts) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const close = useCallback(() => setOpen(false), []);
  const openPicker = () => {
    setDraft(value.hour && value.minute ? value.hour + ":" + value.minute : "");
    setError("");
    setOpen(true);
  };
  const parsed = parseTime(draft);
  const hasValue = Boolean(value.hour && value.minute);
  function updateDraft(value: string) {
    setDraft(englishDigits(value).replace(/[^\d:]/g, "").slice(0, 5));
    setError("");
  }
  function chooseHour(hour: string) {
    setDraft(hour + ":" + (parsed?.minute ?? "00"));
    setError("");
  }
  function chooseMinute(minute: string) {
    if (!parsed) {
      setError("اول ساعت را انتخاب یا تایپ کن.");
      return;
    }
    setDraft(parsed.hour + ":" + minute);
    setError("");
  }
  function save() {
    const chosen = parseTime(draft);
    if (!chosen) {
      setError("ساعت معتبر بین ۰۰:۰۰ تا ۲۳:۵۹ وارد کن.");
      return;
    }
    onConfirm(chosen);
    close();
  }
  return (
    <>
      <button type="button" className={"chart-mobile-picker-trigger " + styles.trigger}
        onClick={openPicker} aria-label="انتخاب ساعت تولد">
        <span className={styles.triggerText}>
          <small>ساعت تولد</small>
          <strong>{hasValue ? value.hour + ":" + value.minute : "ساعت و دقیقه را انتخاب کن"}</strong>
        </span>
        <span className={styles.triggerIcon} aria-hidden="true">◷</span>
      </button>
      {open ? (
        <PickerSheet title="انتخاب ساعت تولد" onClose={close}>
          <p className={styles.intro}>مثلاً ۱۴۳۰ یا ۱۴:۳۰ تایپ کن، یا ساعت و دقیقه را انتخاب کن. دقیقه می‌تواند هر عددی از ۰۰ تا ۵۹ باشد.</p>
          <label className={styles.timeLabel}>
            <span>ساعت تولد (۲۴ ساعته)</span>
            <input
              className={styles.timeInput}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              dir="ltr"
              placeholder="14:30"
              value={draft}
              onChange={(event) => updateDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); save(); } }}
            />
          </label>
          <div className={styles.sectionLabel}>ساعت را انتخاب کن</div>
          <div className={styles.hourGrid}>
            {Array.from({ length: 24 }, (_, index) => {
              const hour = twoDigits(index);
              return <button key={hour} type="button"
                className={styles.dayChoice + (parsed?.hour === hour ? " " + styles.selected : "")}
                aria-pressed={parsed?.hour === hour}
                onClick={() => chooseHour(hour)}>{index.toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}</button>;
            })}
          </div>
          <div className={styles.sectionLabel}>دقیقه‌های پرکاربرد یا تایپ دقیقهٔ دقیق</div>
          <div className={styles.minuteGrid}>
            {["00", "15", "30", "45"].map((minute) => (
              <button key={minute} type="button"
                className={styles.choice + (parsed?.minute === minute ? " " + styles.selected : "")}
                aria-pressed={parsed?.minute === minute}
                onClick={() => chooseMinute(minute)}>{Number(minute).toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}</button>
            ))}
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button type="button" className={styles.confirm} onClick={save}>تأیید ساعت تولد</button>
        </PickerSheet>
      ) : null}
    </>
  );
}
