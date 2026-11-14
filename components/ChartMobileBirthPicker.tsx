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
  const maxDays = dayLimit(mode, value.year, value.month);
  const dayWheelOptions = useMemo<readonly DateWheelOption[]>(() => [
    { value: "", label: "—" },
    ...Array.from({ length: maxDays }, (_, index) => ({
      value: twoDigits(index + 1),
      label: (index + 1).toLocaleString("fa-IR"),
    })),
  ], [maxDays]);
  const monthWheelOptions = useMemo<readonly DateWheelOption[]>(() => [
    { value: "", label: "—" },
    ...monthOptions.map((month) => ({ value: month.value, label: month.label })),
  ], [monthOptions]);
  const yearWheelOptions = useMemo<readonly DateWheelOption[]>(() => [
    { value: "", label: "—" },
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
      <div className={styles.wheelPicker + " " + styles.dateWheelPicker} dir="rtl">
        <DateWheel label="روز" value={value.day} options={dayWheelOptions}
          onChange={(day) => changeValue("day", day)} />
        <DateWheel label="ماه" value={value.month} options={monthWheelOptions}
          onChange={(month) => changeValue("month", month)} />
        <DateWheel key={mode} label="سال" value={value.year} options={yearWheelOptions}
          onChange={(year) => changeValue("year", year)} />
      </div>
    </div>
  );
}


const TIME_WHEEL_HOURS: readonly DateWheelOption[] = [
  { value: "", label: "—" },
  ...Array.from({ length: 24 }, (_, index) => ({
    value: twoDigits(index),
    label: index.toLocaleString("fa-IR", { minimumIntegerDigits: 2, useGrouping: false }),
  })),
];
const TIME_WHEEL_MINUTES: readonly DateWheelOption[] = [
  { value: "", label: "—" },
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
  return (
    <div className={styles.alwaysPicker} data-chart-time-wheels
      role="group" aria-label="ساعت تولد به‌صورت ۲۴ ساعته">
      <div className={styles.wheelPicker + " " + styles.timeWheelPicker} dir="rtl">
        <DateWheel label="ساعت" value={value.hour} options={TIME_WHEEL_HOURS}
          onChange={(hour) => onConfirm({ ...value, hour })} />
        <DateWheel label="دقیقه" value={value.minute} options={TIME_WHEEL_MINUTES}
          onChange={(minute) => onConfirm({ ...value, minute })} />
      </div>
    </div>
  );
}
