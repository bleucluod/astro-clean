"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent, type UIEvent as ReactUIEvent } from "react";
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
        'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]), [role="spinbutton"][tabindex="0"]',
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
          <button className={styles.close} ref={closeRef} type="button" aria-label="بستن" onClick={onClose}>×</button>
        </header>
        <div className={styles.sheetScroll}>{children}</div>
      </section>
    </div>, document.body,
  );
}

// HALLEUS_IOS_DATE_WHEELS_20261114
const DATE_WHEEL_ITEM_HEIGHT = 48;
type DateWheelOption = { value: string; label: string };

function DateWheel({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: readonly DateWheelOption[];
  onChange: (value: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const settlingRef = useRef(true);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  useEffect(() => {
    settlingRef.current = true;
    let readyFrame = 0;
    const frame = window.requestAnimationFrame(() => {
      if (scrollRef.current) {
        const index = Math.max(0, options.findIndex((option) => option.value === value));
        scrollRef.current.scrollTop = index * DATE_WHEEL_ITEM_HEIGHT;
      }
      readyFrame = window.requestAnimationFrame(() => { settlingRef.current = false; });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(readyFrame);
    };
    // Only recenter when wheel options change; do not interrupt touch scrolling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);

  function choose(index: number) {
    const selected = options[index];
    if (!selected) return;
    onChange(selected.value);
    scrollRef.current?.scrollTo({
      top: index * DATE_WHEEL_ITEM_HEIGHT,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  function handleScroll(event: ReactUIEvent<HTMLDivElement>) {
    if (settlingRef.current) return;
    const index = Math.max(0, Math.min(
      options.length - 1,
      Math.round(event.currentTarget.scrollTop / DATE_WHEEL_ITEM_HEIGHT),
    ));
    const selected = options[index];
    if (selected && selected.value !== value) onChange(selected.value);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    let nextIndex = selectedIndex;
    if (event.key === "ArrowDown") nextIndex = Math.min(options.length - 1, selectedIndex + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, selectedIndex - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else return;
    event.preventDefault();
    choose(nextIndex);
  }

  return (
    <div className={styles.wheelColumn}>
      <span className={styles.wheelLabel}>{label}</span>
      <div className={styles.wheelFrame}>
        <div
          ref={scrollRef}
          className={styles.wheelViewport}
          role="spinbutton"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={options.length - 1}
          aria-valuenow={selectedIndex}
          aria-valuetext={options[selectedIndex]?.label ?? "انتخاب نشده"}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
        >
          {options.map((option, index) => (
            <button
              key={option.value || "empty"}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              className={styles.wheelRow + (option.value === value ? " " + styles.wheelActive : "")}
              onClick={() => choose(index)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className={styles.wheelSelection} aria-hidden="true" />
      </div>
    </div>
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

  const dayWheelOptions = useMemo<readonly DateWheelOption[]>(() => [
    { value: "", label: "روز" },
    ...Array.from({ length: maxDays }, (_, index) => ({
      value: twoDigits(index + 1),
      label: (index + 1).toLocaleString("fa-IR"),
    })),
  ], [maxDays]);
  const monthWheelOptions = useMemo<readonly DateWheelOption[]>(() => [
    { value: "", label: "ماه" },
    ...monthOptions.map((month) => ({ value: month.value, label: month.label })),
  ], [monthOptions]);
  const yearWheelOptions = useMemo<readonly DateWheelOption[]>(() => [
    { value: "", label: "سال" },
    ...yearOptions.map((year) => ({
      value: year,
      label: Number(year).toLocaleString("fa-IR", { useGrouping: false }),
    })),
  ], [yearOptions]);

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
      setError("روز، ماه و سال معتبر را انتخاب کن.");
      return;
    }
    onConfirm({ ...draft });
    close();
  }

  return (
    <>
      <button type="button" className={"chart-mobile-picker-trigger " + styles.trigger}
        onClick={openPicker} aria-label="انتخاب تاریخ تولد">
        <span className={styles.triggerText}>
          <small>تاریخ تولد {mode === "jalali" ? "شمسی" : "میلادی"}</small>
          <strong>{hasValue ? value.day + " " + displayMonth + " " +
            Number(value.year).toLocaleString("fa-IR", { useGrouping: false }) : "روز، ماه و سال را انتخاب کن"}</strong>
        </span>
        <span className={styles.triggerIcon} aria-hidden="true">▦</span>
      </button>
      {open ? (
        <PickerSheet title="انتخاب تاریخ تولد" onClose={close}>
          <p className={styles.intro}>روز، ماه و سال را مثل ساعت آیفون بالا و پایین بکش؛ هر سه باید انتخاب شوند.</p>
          <div className={styles.wheelPicker + " " + styles.dateWheelPicker}
            dir="rtl" role="group" aria-label="روز، ماه و سال تولد">
            <DateWheel label="روز" value={draft.day} options={dayWheelOptions}
              onChange={(day) => changeDraft("day", day)} />
            <DateWheel label="ماه" value={draft.month} options={monthWheelOptions}
              onChange={(month) => changeDraft("month", month)} />
            <DateWheel key={mode} label="سال" value={draft.year} options={yearWheelOptions}
              onChange={(year) => changeDraft("year", year)} />
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button type="button" className={styles.confirm} onClick={save}>تأیید تاریخ تولد</button>
        </PickerSheet>
      ) : null}
    </>
  );
}

const TIME_WHEEL_ITEM_HEIGHT = 48;
const TIME_WHEEL_HOURS = Array.from({ length: 24 }, (_, index) => twoDigits(index));
const TIME_WHEEL_MINUTES = Array.from({ length: 60 }, (_, index) => twoDigits(index));

function TimeWheel({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialValue = useRef(value);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop =
          Math.max(0, options.indexOf(initialValue.current)) * TIME_WHEEL_ITEM_HEIGHT;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [options]);

  function choose(next: string) {
    onChange(next);
    const index = options.indexOf(next);
    if (index < 0) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollRef.current?.scrollTo({
      top: index * TIME_WHEEL_ITEM_HEIGHT,
      behavior: reduceMotion ? "instant" : "smooth",
    });
  }

  function handleScroll(event: ReactUIEvent<HTMLDivElement>) {
    const index = Math.max(0, Math.min(
      options.length - 1,
      Math.round(event.currentTarget.scrollTop / TIME_WHEEL_ITEM_HEIGHT),
    ));
    if (options[index] !== value) onChange(options[index]);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const index = Math.max(0, options.indexOf(value));
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = Math.min(options.length - 1, index + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, index - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = options.length - 1;
    else return;
    event.preventDefault();
    choose(options[nextIndex]);
  }

  return (
    <div className={styles.wheelColumn}>
      <span className={styles.wheelLabel}>{label}</span>
      <div className={styles.wheelFrame}>
        <div
          ref={scrollRef}
          className={styles.wheelViewport}
          role="spinbutton"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={options.length - 1}
          aria-valuenow={Number(value)}
          aria-valuetext={Number(value).toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false })}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
        >
          {options.map((option) => (
            <button
              type="button"
              key={option}
              tabIndex={-1}
              aria-hidden="true"
              className={styles.wheelRow + (option === value ? " " + styles.wheelActive : "")}
              onClick={() => choose(option)}
            >
              {Number(option).toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false })}
            </button>
          ))}
        </div>
        <span className={styles.wheelSelection} aria-hidden="true" />
      </div>
    </div>
  );
}

export function MobileBirthTimePicker({
  value, onConfirm,
}: {
  value: MobileTimeParts;
  onConfirm: (value: MobileTimeParts) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MobileTimeParts>({ hour: "12", minute: "00" });
  const [error, setError] = useState("");
  const close = useCallback(() => setOpen(false), []);
  const openPicker = () => {
    setDraft({
      hour: value.hour || "12",
      minute: value.minute || "00",
    });
    setError("");
    setOpen(true);
  };
  const hasValue = Boolean(value.hour && value.minute);

  function save() {
    const chosen = parseTime(draft.hour + ":" + draft.minute);
    if (!chosen) {
      setError("ساعت انتخاب‌شده معتبر نیست.");
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
          <p className={styles.intro}>مثل ساعت آیفون، چرخ ساعت و دقیقه را بالا یا پایین بکش؛ انتخاب روی عدد وسط می‌ایستد.</p>
          <div className={styles.wheelPicker} dir="ltr" role="group" aria-label="انتخاب ساعت تولد به‌صورت ۲۴ ساعته">
            <TimeWheel label="ساعت" options={TIME_WHEEL_HOURS} value={draft.hour}
              onChange={(hour) => { setDraft((current) => ({ ...current, hour })); setError(""); }} />
            <span className={styles.wheelColon} aria-hidden="true">:</span>
            <TimeWheel label="دقیقه" options={TIME_WHEEL_MINUTES} value={draft.minute}
              onChange={(minute) => { setDraft((current) => ({ ...current, minute })); setError(""); }} />
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <button type="button" className={styles.confirm} onClick={save}>تأیید ساعت تولد</button>
        </PickerSheet>
      ) : null}
    </>
  );
}
