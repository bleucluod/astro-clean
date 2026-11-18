"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type UIEvent as ReactUIEvent } from "react";
import { parseJalaliDateInput } from "@/lib/date/jalali";
import styles from "./chart-mobile-birth-picker.module.css";

export type MobileDateParts = { year: string; month: string; day: string };
export type MobileTimeParts = { hour: string; minute: string };
type DateMode = "jalali" | "gregorian";
type MonthOption = { value: string; label: string };

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

const DATE_WHEEL_ITEM_HEIGHT = 40;
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
  const [wheelTouched, setWheelTouched] = useState(false);
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
    setWheelTouched(true);
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
      <div className={styles.wheelFrame}>
        <div
          ref={scrollRef}
          className={styles.wheelViewport + (wheelTouched ? " " + styles.wheelTouched : "")}
          onPointerDown={() => setWheelTouched(true)}
          onTouchStart={() => setWheelTouched(true)}
          onWheel={() => setWheelTouched(true)}
          role="spinbutton"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={options.length - 1}
          aria-valuenow={selectedIndex}
          aria-valuetext={value ? options[selectedIndex]?.label : label + " انتخاب نشده"}
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



function digitsOnly(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[^0-9]/g, "");
}

type QuickField = {
  label: string;
  value: string;
  maxLength: number;
  placeholder: string;
  onChange: (value: string) => void;
};

function QuickEntryDialog({
  open, title, fields, valid, hint, confirmLabel, onConfirm, onClose,
}: {
  open: boolean;
  title: string;
  fields: readonly QuickField[];
  valid: boolean;
  hint: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      firstInputRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog ref={dialogRef} className={styles.quickDialog} aria-label={title} onClose={onClose}>
      <div className={styles.quickPanel} dir="rtl">
        <div className={styles.quickHeader}>
          <strong>{title}</strong>
          <button type="button" className={styles.quickClose} onClick={onClose} aria-label="بستن پنجره">×</button>
        </div>
        <div className={styles.quickInputs}>
          {fields.map((field, index) => (
            <label className={styles.quickField} key={field.label}>
              <span>{field.label}</span>
              <input
                ref={index === 0 ? firstInputRef : undefined}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={field.maxLength}
                value={field.value}
                placeholder={field.placeholder}
                onChange={(event) => field.onChange(digitsOnly(event.target.value).slice(0, field.maxLength))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (valid) {
                      onConfirm();
                      onClose();
                    }
                  }
                }}
              />
            </label>
          ))}
        </div>
        <p className={styles.quickHint} aria-live="polite">
          {valid ? "آمادهٔ تأیید" : hint}
        </p>
        <button type="button" className={styles.quickConfirm} disabled={!valid}
          onClick={() => { onConfirm(); onClose(); }}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

function paddedParts(parts: MobileDateParts): MobileDateParts {
  return {
    year: parts.year,
    month: parts.month ? parts.month.padStart(2, "0") : "",
    day: parts.day ? parts.day.padStart(2, "0") : "",
  };
}

/* HALLEUS_CHART_ALWAYS_VISIBLE_BIRTH_WHEELS_20261114 */
export function MobileBirthDatePicker({
  mode, value, yearOptions, monthOptions, onConfirm,
}: {
  mode: DateMode;
  value: MobileDateParts;
  yearOptions: readonly string[];
  monthOptions: readonly MonthOption[];
  onConfirm: (value: MobileDateParts) => void;
}) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickRevision, setQuickRevision] = useState(0);
  const [draft, setDraft] = useState<MobileDateParts>(value);
  const normalizedDraft = paddedParts(draft);
  const quickValid = validDate(mode, normalizedDraft, yearOptions);
  const changeDraft = (field: keyof MobileDateParts, nextValue: string) => {
    setDraft((current) => ({ ...current, [field]: nextValue }));
  };
  const maxDays = dayLimit(mode, value.year, value.month);
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

  function changeValue(field: keyof MobileDateParts, nextValue: string) {
    const next = { ...value, [field]: nextValue };
    if ((field === "month" || field === "year") &&
      Number(next.day) > dayLimit(mode, next.year, next.month)) {
      next.day = "";
    }
    onConfirm(next);
  }

  return (
    <div className={styles.alwaysPicker} data-chart-date-wheels
      role="group" aria-label={"تاریخ تولد " + (mode === "jalali" ? "شمسی" : "میلادی")}
      data-complete={validDate(mode, value, yearOptions)}>
      <div key={quickRevision} className={styles.wheelPicker + " " + styles.dateWheelPicker} dir="rtl">
        <DateWheel label="روز" value={value.day} options={dayWheelOptions}
          onChange={(day) => changeValue("day", day)} />
        <DateWheel label="ماه" value={value.month} options={monthWheelOptions}
          onChange={(month) => changeValue("month", month)} />
        <DateWheel key={mode} label="سال" value={value.year} options={yearWheelOptions}
          onChange={(year) => changeValue("year", year)} />
      </div>
      <button type="button" className={styles.quickTrigger}
        aria-haspopup="dialog"
        onClick={() => { setDraft({ ...value }); setQuickOpen(true); }}>
        ورود سریع تاریخ با کیبورد
      </button>
      <QuickEntryDialog
        open={quickOpen}
        title={"ورود تاریخ تولد " + (mode === "jalali" ? "شمسی" : "میلادی")}
        fields={[
          { label: "روز", value: draft.day, maxLength: 2, placeholder: "۰۱",
            onChange: (next) => changeDraft("day", next) },
          { label: "ماه", value: draft.month, maxLength: 2, placeholder: "۰۷",
            onChange: (next) => changeDraft("month", next) },
          { label: "سال", value: draft.year, maxLength: 4, placeholder: mode === "jalali" ? "۱۳۷۸" : "۱۹۹۹",
            onChange: (next) => changeDraft("year", next) },
        ]}
        valid={quickValid}
        hint="روز، ماه و سال معتبر را وارد کن."
        confirmLabel="تأیید تاریخ"
        onConfirm={() => { onConfirm(normalizedDraft); setQuickRevision((n) => n + 1); }}
        onClose={() => setQuickOpen(false)}
      />
    </div>
  );
}


const TIME_WHEEL_HOURS: readonly DateWheelOption[] = [
  { value: "", label: "ساعت" },
  ...Array.from({ length: 24 }, (_, index) => ({
    value: twoDigits(index),
    label: index.toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false }),
  })),
];
const TIME_WHEEL_MINUTES: readonly DateWheelOption[] = [
  { value: "", label: "دقیقه" },
  ...Array.from({ length: 60 }, (_, index) => ({
    value: twoDigits(index),
    label: index.toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false }),
  })),
];

export function MobileBirthTimePicker({
  value, onConfirm,
}: {
  value: MobileTimeParts;
  onConfirm: (value: MobileTimeParts) => void;
}) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickRevision, setQuickRevision] = useState(0);
  const [draft, setDraft] = useState<MobileTimeParts>(value);
  const normalizedDraft = {
    hour: draft.hour ? draft.hour.padStart(2, "0") : "",
    minute: draft.minute ? draft.minute.padStart(2, "0") : "",
  };
  const quickValid = normalizedDraft.hour.length === 2 &&
    normalizedDraft.minute.length === 2 &&
    Number(normalizedDraft.hour) <= 23 &&
    Number(normalizedDraft.minute) <= 59;
  return (
    <div className={styles.alwaysPicker} data-chart-time-wheels
      role="group" aria-label="ساعت تولد به‌صورت ۲۴ ساعته">
      <div key={quickRevision} className={styles.wheelPicker + " " + styles.timeWheelPicker} dir="rtl">
        <DateWheel label="ساعت" value={value.hour} options={TIME_WHEEL_HOURS}
          onChange={(hour) => onConfirm({ ...value, hour })} />
        <DateWheel label="دقیقه" value={value.minute} options={TIME_WHEEL_MINUTES}
          onChange={(minute) => onConfirm({ ...value, minute })} />
      </div>
      <button type="button" className={styles.quickTrigger}
        aria-haspopup="dialog"
        onClick={() => { setDraft({ ...value }); setQuickOpen(true); }}>
        ورود سریع ساعت با کیبورد
      </button>
      <QuickEntryDialog
        open={quickOpen}
        title="ورود ساعت تولد"
        fields={[
          { label: "ساعت", value: draft.hour, maxLength: 2, placeholder: "۱۴",
            onChange: (next) => setDraft((current) => ({ ...current, hour: next })) },
          { label: "دقیقه", value: draft.minute, maxLength: 2, placeholder: "۳۵",
            onChange: (next) => setDraft((current) => ({ ...current, minute: next })) },
        ]}
        valid={quickValid}
        hint="ساعت باید بین ۰ تا ۲۳ و دقیقه بین ۰ تا ۵۹ باشد."
        confirmLabel="تأیید ساعت"
        onConfirm={() => { onConfirm(normalizedDraft); setQuickRevision((n) => n + 1); }}
        onClose={() => setQuickOpen(false)}
      />
    </div>
  );
}
