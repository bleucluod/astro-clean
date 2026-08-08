const ENGLISH_INTERNAL_TERMS: Array<[RegExp, string]> = [
  [/beta[-_\s]?db/giu, "ذخیره‌شده"],
  [/\bbeta\b/giu, ""],
  [/\bdemo\b/giu, ""],
  [/\bpreview\b/giu, "این خوانش"],
  [/\bworkbench\b/giu, ""],
  [/\bfixture(?:s)?\b/giu, ""],
  [/\bsnapshot\b/giu, "اطلاعات ثبت‌شده"],
  [/\bfallback\b/giu, ""],
  [/\blegacy\b/giu, "این گزارش"],
  [/\bscaffold(?:ing)?\b/giu, ""],
  [/\bplaceholder\b/giu, ""],
  [/\bruntime\b/giu, ""],
  [/\bcontract(?: version)?\b/giu, ""],
  [/\bengine version\b/giu, ""],
  [/\bwriter version\b/giu, ""],
  [/\breal engine\b/giu, "محاسبه نجومی"],
];

const EXACT_VISIBLE_REPLACEMENTS: Array<[string, string]> = [
  ["در نسخهٔ فعلی", "در این خوانش"],
  ["در نسخه فعلی", "در این خوانش"],
  ["این نسخهٔ فعلی", "این خوانش"],
  ["این نسخهٔ قدیمی", "این گزارش"],
  ["نسخهٔ قدیمی", "این گزارش"],
  ["نسخه قدیمی", "این گزارش"],
  ["این نسخه", "این گزارش"],
  ["این قابلیت هنوز پیاده‌سازی نشده است.", "این بخش برای این گزارش در دسترس نیست."],
  ["داده کافی در این نسخه وجود ندارد.", "اطلاعات لازم برای این بخش ثبت نشده است."],
  ["دادهٔ کافی", "اطلاعات کافی"],
  ["این گزارش از مسیر داخلی خوانده شده است.", "این گزارش از فضای ذخیره‌سازی هالیوس خوانده شده است."],
  ["گزارش داخلی", "گزارش ذخیره‌شده"],
];

export function sanitizeVisibleReportText(value: string): string {
  let output = value;

  for (const [before, after] of EXACT_VISIBLE_REPLACEMENTS) {
    output = output.replaceAll(before, after);
  }

  for (const [pattern, replacement] of ENGLISH_INTERNAL_TERMS) {
    output = output.replace(pattern, replacement);
  }

  return output
    .replace(/[\s\u00a0]+/gu, " ")
    .replace(/\s+([،؛.!؟])/gu, "$1")
    .replace(/([.!؟])\s*\1+/gu, "$1")
    .trim();
}

export function sanitizeVisibleReportValue<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeVisibleReportText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      sanitizeVisibleReportValue(item),
    ) as unknown as T;
  }

  if (value instanceof Date) {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        sanitizeVisibleReportValue(item),
      ]),
    ) as T;
  }

  return value;
}
