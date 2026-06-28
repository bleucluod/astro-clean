"use client";

import { useEffect, useState } from "react";

type SkyPulseDateSnapshot = {
  jalaliDate: string;
  gregorianDate: string;
  jalaliYear: number | null;
  jalaliMonth: string;
  weekday: string;
  leapYearLabel: string;
};

const faNumberFormatter = new Intl.NumberFormat("fa-IR");

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function getDatePart(
  formatter: Intl.DateTimeFormat,
  date: Date,
  type: "year" | "month" | "weekday",
): string {
  return formatter.formatToParts(date).find((part) => part.type === type)?.value ?? "";
}

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - div(a, b) * b;
}

function getJalaaliLeapState(jalaliYear: number): boolean | null {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];

  const firstBreak = breaks[0];
  const lastBreak = breaks[breaks.length - 1];

  if (jalaliYear < firstBreak || jalaliYear >= lastBreak) {
    return null;
  }

  let leapJ = -14;
  let jp = firstBreak;
  let jump = 0;

  for (let i = 1; i < breaks.length; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;

    if (jalaliYear < jm) {
      break;
    }

    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jalaliYear - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);

  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }

  let leap = mod(mod(n + 1, 33) - 1, 4);

  if (leap === -1) {
    leap = 4;
  }

  return leap === 0;
}

function buildDateSnapshot(date: Date): SkyPulseDateSnapshot {
  const jalaliFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const gregorianFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const jalaliYearText = getDatePart(jalaliFormatter, date, "year");
  const jalaliYear = Number(normalizeDigits(jalaliYearText));
  const safeJalaliYear = Number.isFinite(jalaliYear) ? jalaliYear : null;
  const leapState = safeJalaliYear === null ? null : getJalaaliLeapState(safeJalaliYear);
  const formattedYear = safeJalaliYear === null ? "این" : faNumberFormatter.format(safeJalaliYear);

  return {
    jalaliDate: jalaliFormatter.format(date),
    gregorianDate: gregorianFormatter.format(date),
    jalaliYear: safeJalaliYear,
    jalaliMonth: getDatePart(jalaliFormatter, date, "month"),
    weekday: getDatePart(jalaliFormatter, date, "weekday"),
    leapYearLabel:
      leapState === null
        ? "برای تشخیص کبیسه بودن این سال به داده تقویمی دقیق‌تری نیاز داریم."
        : `سال ${formattedYear} در تقویم جلالی ${leapState ? "کبیسه است" : "کبیسه نیست"}.`,
  };
}

export function SkyPulseDateCard() {
  const [snapshot, setSnapshot] = useState<SkyPulseDateSnapshot | null>(null);

  useEffect(() => {
    setSnapshot(buildDateSnapshot(new Date()));
  }, []);

  return (
    <section className="card paid-section" aria-labelledby="sky-pulse-title">
      <div>
        <span className="section-label">نبض امروز Halleus</span>

        <h2 id="sky-pulse-title">امروز را از آسمان شروع کن، نه از پیش‌بینی قطعی</h2>

        <p>
          این کارت فعلاً تاریخ امروز و زمینه زمانی را زنده نشان می‌دهد. در قدم‌های بعدی،
          ترنزیت‌های واقعی به همین بخش اضافه می‌شوند و توضیح کامل‌ترشان داخل گزارش چارت
          شخصی می‌آید.
        </p>
      </div>

      <div className="grid grid-3">
        <article className="mini-card paid-value-card">
          <strong>تاریخ امروز</strong>
          <span>{snapshot?.weekday ?? "امروز"}</span>
          <p>{snapshot?.jalaliDate ?? "در حال خواندن تاریخ امروز..."}</p>
          <p>{snapshot?.gregorianDate ?? ""}</p>
        </article>

        <article className="mini-card paid-value-card">
          <strong>زمینه ماه</strong>
          <span>{snapshot?.jalaliMonth ?? "ماه جاری"}</span>
          <p>{snapshot?.leapYearLabel ?? "کبیسه بودن سال پس از خواندن تاریخ مشخص می‌شود."}</p>
        </article>

        <article className="mini-card paid-value-card">
          <strong>چطور از این انرژی استفاده کنی؟</strong>
          <p>
            امروز فقط یک برداشت کوتاه از خودت ثبت کن و بعد برای خوانش شخصی‌تر، گزارش تولدت
            را بساز.
          </p>
          <p>نکن: این کارت را فال قطعی یا جایگزین گزارش شخصی فرض نکن.</p>
        </article>
      </div>
    </section>
  );
}
