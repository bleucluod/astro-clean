import type { SkyDailyInput, SkyDailyUtcWindow } from "@/lib/sky-daily/sky-daily-contract";

function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function localMidnightUtc(localDate: string, timezone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) throw new Error("Sky daily localDate must use YYYY-MM-DD.");
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  let guess = desired;
  for (let index = 0; index < 4; index += 1) {
    const actual = zonedParts(new Date(guess), timezone);
    guess += desired - Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
  }
  return new Date(guess);
}

function nextDate(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

export function createSkyDailyUtcWindow(input: Pick<SkyDailyInput, "localDate" | "timezone">): SkyDailyUtcWindow {
  try { new Intl.DateTimeFormat("en", { timeZone: input.timezone }); } catch { throw new Error("Sky daily timezone is invalid."); }
  const start = localMidnightUtc(input.localDate, input.timezone);
  const end = localMidnightUtc(nextDate(input.localDate), input.timezone);
  if (end.getTime() <= start.getTime()) throw new Error("Sky daily timezone window is invalid.");
  return { localDate: input.localDate, timezone: input.timezone, startUtc: start.toISOString(), endUtc: end.toISOString() };
}
