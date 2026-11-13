/** Tehran-day analytics range with an equally long preceding comparison window. */
export type AnalyticsPreset = 1 | 7 | 30 | 90;
export type AnalyticsWindow = {
  from: string; through: string;
  previousFrom: string; previousThrough: string;
  days: number; selectedDay: string;
  preset: AnalyticsPreset | null;
};

function tehranToday(): string {
  const tokens = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => tokens.find((item) => item.type === type)?.value ?? "";
  return [part("year"), part("month"), part("day")].join("-");
}
function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00.000Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
export function shiftAnalyticsDay(day: string, delta: number): string {
  const date = new Date(day + "T12:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
export function parseAnalyticsWindow(params: URLSearchParams): AnalyticsWindow | null {
  const keys = [...params.keys()];
  if (keys.some(key => !["days", "from", "through", "day"].includes(key)) ||
    new Set(keys).size !== keys.length) return null;
  const hasPreset = params.has("days");
  const hasCustom = params.has("from") || params.has("through");
  if (hasPreset && hasCustom) return null;

  let from: string;
  let through: string;
  let preset: AnalyticsPreset | null;
  const today = tehranToday();
  if (hasCustom) {
    from = params.get("from") ?? "";
    through = params.get("through") ?? "";
    preset = null;
    if (!validDay(from) || !validDay(through)) return null;
  } else {
    const days = params.get("days") ?? "7";
    if (!["1", "7", "30", "90"].includes(days)) return null;
    preset = Number(days) as AnalyticsPreset;
    through = today;
    from = shiftAnalyticsDay(today, 1 - preset);
  }
  const length = Math.round(
    (Date.parse(through + "T12:00:00Z") - Date.parse(from + "T12:00:00Z")) / 86400_000,
  ) + 1;
  if (!Number.isInteger(length) || length < 1 || length > 90 ||
    through > today || from < "2026-01-01") return null;
  const selectedDay = params.get("day") ?? through;
  if (!validDay(selectedDay) || selectedDay < from || selectedDay > through) return null;
  return {
    from, through, previousThrough: shiftAnalyticsDay(from, -1),
    previousFrom: shiftAnalyticsDay(from, -length),
    days: length, selectedDay, preset,
  };
}
