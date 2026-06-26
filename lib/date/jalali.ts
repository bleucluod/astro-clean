export type JalaliDateParseResult =
  | {
      ok: true;
      jalaliYear: number;
      jalaliMonth: number;
      jalaliDay: number;
      normalizedJalali: string;
      gregorianIso: string;
    }
  | {
      ok: false;
      message: string;
    };

const persianDigitMap: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

const jalaliBreaks = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
  2192, 2262, 2324, 2394, 2456, 3178,
];

export function normalizePersianDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => persianDigitMap[digit] ?? digit);
}

function div(value: number, divisor: number) {
  return Math.trunc(value / divisor);
}

function mod(value: number, divisor: number) {
  return value - Math.trunc(value / divisor) * divisor;
}

function jalCal(jalaliYear: number) {
  const breaks = jalaliBreaks;
  const breakCount = breaks.length;
  const gregorianYear = jalaliYear + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jm = 0;
  let jump = 0;

  if (jalaliYear < jp || jalaliYear >= breaks[breakCount - 1]) {
    throw new Error("سال شمسی بیرون از محدوده قابل محاسبه است.");
  }

  for (let index = 1; index < breakCount; index += 1) {
    jm = breaks[index];
    jump = jm - jp;

    if (jalaliYear < jm) {
      break;
    }

    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let yearsFromBreak = jalaliYear - jp;
  leapJ += div(yearsFromBreak, 33) * 8 + div(mod(yearsFromBreak, 33) + 3, 4);

  if (mod(jump, 33) === 4 && jump - yearsFromBreak === 4) {
    leapJ += 1;
  }

  const leapG = div(gregorianYear, 4) - div((div(gregorianYear, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - yearsFromBreak < 6) {
    yearsFromBreak = yearsFromBreak - jump + div(jump + 4, 33) * 33;
  }

  let leap = mod(mod(yearsFromBreak + 1, 33) - 1, 4);

  if (leap === -1) {
    leap = 4;
  }

  return { leap, gregorianYear, march };
}

function gregorianToDayNumber(gregorianYear: number, gregorianMonth: number, gregorianDay: number) {
  let dayNumber =
    div((gregorianYear + div(gregorianMonth - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gregorianMonth + 9, 12) + 2, 5) +
    gregorianDay -
    34840408;

  dayNumber =
    dayNumber -
    div(div(gregorianYear + 100100 + div(gregorianMonth - 8, 6), 100) * 3, 4) +
    752;

  return dayNumber;
}

function dayNumberToGregorian(dayNumber: number) {
  let j = 4 * dayNumber + 139361631;
  j = j + div(div(4 * dayNumber + 183187720, 146097) * 3, 4) * 4 - 3908;

  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gregorianDay = div(mod(i, 153), 5) + 1;
  const gregorianMonth = mod(div(i, 153), 12) + 1;
  const gregorianYear = div(j, 1461) - 100100 + div(8 - gregorianMonth, 6);

  return { gregorianYear, gregorianMonth, gregorianDay };
}

function jalaliToDayNumber(jalaliYear: number, jalaliMonth: number, jalaliDay: number) {
  const calculation = jalCal(jalaliYear);

  return (
    gregorianToDayNumber(calculation.gregorianYear, 3, calculation.march) +
    (jalaliMonth - 1) * 31 -
    div(jalaliMonth, 7) * (jalaliMonth - 7) +
    jalaliDay -
    1
  );
}

function isLeapJalaliYear(jalaliYear: number) {
  return jalCal(jalaliYear).leap === 0;
}

function getJalaliMonthLength(jalaliYear: number, jalaliMonth: number) {
  if (jalaliMonth <= 6) return 31;
  if (jalaliMonth <= 11) return 30;
  return isLeapJalaliYear(jalaliYear) ? 30 : 29;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatIsoDate(year: number, month: number, day: number) {
  return `${year}-${padDatePart(month)}-${padDatePart(day)}`;
}

function formatJalaliDate(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}/${padDatePart(month)}/${padDatePart(day)}`;
}

export function parseJalaliDateInput(value: string): JalaliDateParseResult {
  const normalizedInput = normalizePersianDigits(value)
    .trim()
    .replace(/[\\.\-\s]+/g, "/");

  const match = normalizedInput.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);

  if (!match) {
    return { ok: false, message: "تاریخ تولد را به شمسی و با قالب ۱۳۷۸/۰۵/۲۱ وارد کن." };
  }

  const jalaliYear = Number(match[1]);
  const jalaliMonth = Number(match[2]);
  const jalaliDay = Number(match[3]);

  if (jalaliYear < 1200 || jalaliYear > 1600) {
    return { ok: false, message: "سال تولد شمسی باید بین ۱۲۰۰ تا ۱۶۰۰ باشد." };
  }

  if (jalaliMonth < 1 || jalaliMonth > 12) {
    return { ok: false, message: "ماه تولد شمسی باید بین ۱ تا ۱۲ باشد." };
  }

  const maxDay = getJalaliMonthLength(jalaliYear, jalaliMonth);

  if (jalaliDay < 1 || jalaliDay > maxDay) {
    return { ok: false, message: "روز تولد با ماه شمسی واردشده سازگار نیست." };
  }

  try {
    const gregorian = dayNumberToGregorian(
      jalaliToDayNumber(jalaliYear, jalaliMonth, jalaliDay),
    );

    return {
      ok: true,
      jalaliYear,
      jalaliMonth,
      jalaliDay,
      normalizedJalali: formatJalaliDate(jalaliYear, jalaliMonth, jalaliDay),
      gregorianIso: formatIsoDate(
        gregorian.gregorianYear,
        gregorian.gregorianMonth,
        gregorian.gregorianDay,
      ),
    };
  } catch {
    return { ok: false, message: "تبدیل تاریخ شمسی برای این مقدار کامل نشد." };
  }
}
