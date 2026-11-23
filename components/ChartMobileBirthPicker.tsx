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
  label, value, options, onChange, onTap,
}: {
  label: string;
  value: string;
  options: readonly DateWheelOption[];
  onChange: (value: string) => void;
  onTap: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ id: number; x: number; y: number; scrollTop: number; moved: boolean } | null>(null);
  const [wheelTouched, setWheelTouched] = useState(false);
  const settlingRef = useRef(true);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  // Virtualize untouched wheels without changing native scroll distance or snap positions.
  // Mount every option on the first interaction so dragging and keyboard controls stay native.
  const firstRenderedIndex = !wheelTouched && options.length > 9
    ? Math.max(0, selectedIndex - 3)
    : 0;
  const lastRenderedIndex = !wheelTouched && options.length > 9
    ? Math.min(options.length, selectedIndex + 4)
    : options.length;

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
    if (pointerRef.current &&
      Math.abs(event.currentTarget.scrollTop - pointerRef.current.scrollTop) > 2) {
      pointerRef.current.moved = true;
    }
    if (settlingRef.current) return;
    if (!wheelTouched) setWheelTouched(true);
    const index = Math.max(0, Math.min(
      options.length - 1,
      Math.round(event.currentTarget.scrollTop / DATE_WHEEL_ITEM_HEIGHT),
    ));
    const selected = options[index];
    if (selected && selected.value !== value) onChange(selected.value);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    setWheelTouched(true);
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onTap();
      return;
    }
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
          onPointerDown={(event) => {
            setWheelTouched(true);
            if (!event.isPrimary || event.button !== 0) return;
            pointerRef.current = {
              id: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              scrollTop: event.currentTarget.scrollTop,
              moved: false,
            };
          }}
          onPointerMove={(event) => {
            const pointer = pointerRef.current;
            if (!pointer || pointer.id !== event.pointerId) return;
            if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 8) {
              pointer.moved = true;
            }
          }}
          onPointerUp={(event) => {
            const pointer = pointerRef.current;
            if (!pointer || pointer.id !== event.pointerId) return;
            pointerRef.current = null;
            if (!pointer.moved &&
              Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) <= 8 &&
              Math.abs(event.currentTarget.scrollTop - pointer.scrollTop) <= 2) {
              onTap();
            }
          }}
          onPointerCancel={() => { pointerRef.current = null; }}
          onWheel={() => setWheelTouched(true)}
          role="spinbutton"
          tabIndex={0}
          onFocus={() => setWheelTouched(true)}
          aria-label={label + "؛ لمس برای ورود دستی، کشیدن برای انتخاب"}
          aria-valuemin={0}
          aria-valuemax={options.length - 1}
          aria-valuenow={selectedIndex}
          aria-valuetext={value ? options[selectedIndex]?.label : label + " انتخاب نشده"}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
        >
          {firstRenderedIndex > 0 ? (
            <span aria-hidden="true" style={{ display: "block", height: firstRenderedIndex * DATE_WHEEL_ITEM_HEIGHT }} />
          ) : null}
          {options.slice(firstRenderedIndex, lastRenderedIndex).map((option) => (
            <span
              key={option.value || "empty"}
              aria-hidden="true"
              className={styles.wheelRow + (option.value === value ? " " + styles.wheelActive : "")}
            >
              {option.label}
            </span>
          ))}
          {lastRenderedIndex < options.length ? (
            <span aria-hidden="true" style={{ display: "block", height: (options.length - lastRenderedIndex) * DATE_WHEEL_ITEM_HEIGHT }} />
          ) : null}
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

type QuickValidation = { fieldIndex: number; message: string } | null;

function dateQuickValidation(mode: DateMode, parts: MobileDateParts, years: readonly string[]): QuickValidation {
  if (!parts.day) return { fieldIndex: 0, message: "روز تولد را وارد کن." };
  if (!parts.month) return { fieldIndex: 1, message: "ماه تولد را وارد کن." };
  if (!parts.year) return { fieldIndex: 2, message: "سال تولد را وارد کن." };
  if (!years.includes(parts.year)) return { fieldIndex: 2, message: "سال تولد در بازهٔ مجاز نیست." };
  if (!/^(0[1-9]|1[0-2])$/.test(parts.month)) {
    return { fieldIndex: 1, message: "ماه باید بین ۱ تا ۱۲ باشد." };
  }
  if (!/^(0[1-9]|[12][0-9]|3[01])$/.test(parts.day)) {
    return { fieldIndex: 0, message: "روز باید بین ۱ تا ۳۱ باشد." };
  }
  if (!validDate(mode, parts, years)) {
    return { fieldIndex: 0, message: "این روز برای ماه و سال انتخاب‌شده معتبر نیست." };
  }
  return null;
}

function timeQuickValidation(parts: MobileTimeParts): QuickValidation {
  if (!parts.hour) return { fieldIndex: 0, message: "ساعت تولد را وارد کن." };
  if (!parts.minute) return { fieldIndex: 1, message: "دقیقهٔ تولد را وارد کن." };
  if (!/^(0[0-9]|1[0-9]|2[0-3])$/.test(parts.hour)) {
    return { fieldIndex: 0, message: "ساعت باید بین ۰ تا ۲۳ باشد." };
  }
  if (!/^[0-5][0-9]$/.test(parts.minute)) {
    return { fieldIndex: 1, message: "دقیقه باید بین ۰ تا ۵۹ باشد." };
  }
  return null;
}

function QuickEntryDialog({
  open, title, fields, focusIndex, validation, confirmLabel, onConfirm, onClose,
}: {
  open: boolean;
  title: string;
  fields: readonly QuickField[];
  focusIndex: number;
  validation: QuickValidation;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [attempted, setAttempted] = useState(false);

  function closeQuick() {
    setAttempted(false);
    onClose();
  }

  function handleConfirm() {
    if (validation) {
      setAttempted(true);
      inputRefs.current[validation.fieldIndex]?.focus();
      return;
    }
    onConfirm();
    closeQuick();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      inputRefs.current[focusIndex]?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, focusIndex]);

  return (
    <dialog ref={dialogRef} className={styles.quickDialog} aria-label={title} onClose={closeQuick}>
      <div className={styles.quickPanel} dir="rtl">
        <div className={styles.quickHeader}>
          <strong>{title}</strong>
          <button type="button" className={styles.quickClose} onClick={closeQuick} aria-label="بستن پنجره">×</button>
        </div>
        <div className={styles.quickInputs} dir={fields.length === 2 ? "ltr" : "rtl"}>
          {fields.map((field, index) => (
            <label className={styles.quickField} key={field.label} dir="rtl">
              <span>{field.label}</span>
              <input
                ref={(element) => { inputRefs.current[index] = element; }}
                aria-invalid={attempted && validation?.fieldIndex === index}
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
                    handleConfirm();
                  }
                }}
              />
            </label>
          ))}
        </div>
        <p className={attempted && validation ? styles.quickError : styles.quickHint}
          role={attempted && validation ? "alert" : undefined} aria-live="polite">
          {attempted && validation ? validation.message : "عددهای فارسی و انگلیسی هر دو پذیرفته می‌شوند."}
        </p>
        <button type="button" className={styles.quickConfirm}
          onClick={handleConfirm}>
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
  const [quickFocusIndex, setQuickFocusIndex] = useState(0);
  const [draft, setDraft] = useState<MobileDateParts>(value);

  const openQuick = (index: number) => {
    setDraft({ ...value });
    setQuickFocusIndex(index);
    setQuickOpen(true);
  };
  const normalizedDraft = paddedParts(draft);
  const quickValidation = dateQuickValidation(mode, normalizedDraft, yearOptions);
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
          onChange={(day) => changeValue("day", day)} onTap={() => openQuick(0)} />
        <DateWheel label="ماه" value={value.month} options={monthWheelOptions}
          onChange={(month) => changeValue("month", month)} onTap={() => openQuick(1)} />
        <DateWheel key={mode} label="سال" value={value.year} options={yearWheelOptions}
          onChange={(year) => changeValue("year", year)} onTap={() => openQuick(2)} />
      </div>
      {quickOpen ? (
        <QuickEntryDialog
        open={quickOpen}
        focusIndex={quickFocusIndex}
        title={"ورود تاریخ تولد " + (mode === "jalali" ? "شمسی" : "میلادی")}
        fields={[
          { label: "روز", value: draft.day, maxLength: 2, placeholder: "۰۱",
            onChange: (next) => changeDraft("day", next) },
          { label: "ماه", value: draft.month, maxLength: 2, placeholder: "۰۷",
            onChange: (next) => changeDraft("month", next) },
          { label: "سال", value: draft.year, maxLength: 4, placeholder: mode === "jalali" ? "۱۳۷۸" : "۱۹۹۹",
            onChange: (next) => changeDraft("year", next) },
        ]}
        validation={quickValidation}
        confirmLabel="تأیید تاریخ"
        onConfirm={() => { onConfirm(normalizedDraft); setQuickRevision((n) => n + 1); }}
        onClose={() => setQuickOpen(false)}
        />
      ) : null}
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
  const [quickFocusIndex, setQuickFocusIndex] = useState(0);
  const [draft, setDraft] = useState<MobileTimeParts>(value);

  const openQuick = (index: number) => {
    setDraft({ ...value });
    setQuickFocusIndex(index);
    setQuickOpen(true);
  };
  const normalizedDraft = {
    hour: draft.hour ? draft.hour.padStart(2, "0") : "",
    minute: draft.minute ? draft.minute.padStart(2, "0") : "",
  };
  const quickValidation = timeQuickValidation(normalizedDraft);
  return (
    <div className={styles.alwaysPicker} data-chart-time-wheels
      role="group" aria-label="ساعت تولد به‌صورت ۲۴ ساعته">
      <div key={quickRevision} className={styles.wheelPicker + " " + styles.timeWheelPicker} dir="rtl">
        <DateWheel label="ساعت" value={value.hour} options={TIME_WHEEL_HOURS}
          onChange={(hour) => onConfirm({ ...value, hour })} onTap={() => openQuick(0)} />
        <DateWheel label="دقیقه" value={value.minute} options={TIME_WHEEL_MINUTES}
          onChange={(minute) => onConfirm({ ...value, minute })} onTap={() => openQuick(1)} />
      </div>
      {quickOpen ? (
        <QuickEntryDialog
        open={quickOpen}
        focusIndex={quickFocusIndex}
        title="ورود ساعت تولد"
        fields={[
          { label: "ساعت", value: draft.hour, maxLength: 2, placeholder: "۱۴",
            onChange: (next) => setDraft((current) => ({ ...current, hour: next })) },
          { label: "دقیقه", value: draft.minute, maxLength: 2, placeholder: "۳۵",
            onChange: (next) => setDraft((current) => ({ ...current, minute: next })) },
        ]}
        validation={quickValidation}
        confirmLabel="تأیید ساعت"
        onConfirm={() => { onConfirm(normalizedDraft); setQuickRevision((n) => n + 1); }}
        onClose={() => setQuickOpen(false)}
        />
      ) : null}
    </div>
  );
}
