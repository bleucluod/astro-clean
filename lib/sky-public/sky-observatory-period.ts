import { unstable_cache } from "next/cache";
import { SKY_DAILY_CALCULATION_VERSION, type SkyDailySnapshot } from "@/lib/sky-daily/sky-daily-contract";
import { buildSkyDailySnapshot } from "@/lib/sky-daily/sky-daily-service";
import { findIranCityByName } from "@/lib/locations/iran-cities";

export type SkyObservatoryPeriod = "week" | "month";
export type SkyObservatoryPeriodData = {
  period: SkyObservatoryPeriod;
  startDate: string;
  endDate: string;
  snapshots: SkyDailySnapshot[];
};

function shiftDay(day: string, offset: number) {
  const date = new Date(day + "T12:00:00Z");
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid observatory date");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function persianMonthKey(date: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: timezone, calendar: "persian", year: "numeric", month: "numeric",
  }).formatToParts(new Date(date + "T12:00:00Z"));
  return ["year", "month"].map(part =>
    parts.find(item => item.type === part)?.value ?? "").join("-");
}

export function skyObservatoryDates(
  today: string, timezone: string, period: SkyObservatoryPeriod,
): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error("Invalid observatory date");
  const reference = new Date(today + "T12:00:00Z");
  if (!Number.isFinite(reference.getTime())) throw new Error("Invalid observatory date");
  if (period === "week") {
    // Iranian calendar week: Saturday through Friday.
    const back = (reference.getUTCDay() + 1) % 7;
    return Array.from({ length: 7 }, (_, index) => shiftDay(today, index - back));
  }
  const key = persianMonthKey(today, timezone);
  let first = today;
  for (let i = 0; i < 31; i++) {
    const previous = shiftDay(first, -1);
    if (persianMonthKey(previous, timezone) !== key) break;
    first = previous;
  }
  const dates: string[] = [];
  for (let i = 0; i < 31; i++) {
    const next = shiftDay(first, i);
    if (persianMonthKey(next, timezone) !== key) break;
    dates.push(next);
  }
  if (dates.length < 29 || dates.length > 31 || !dates.includes(today)) {
    throw new Error("Invalid Persian month interval");
  }
  return dates;
}

const cachedSkyPeriodSnapshots = unstable_cache(async (
  cityId: string, dates: string[],
): Promise<SkyDailySnapshot[]> => {
  const city = findIranCityByName(cityId);
  if (!city) throw new Error("Unknown sky observatory city");
  const location = {
    latitude: city.latitude, longitude: city.longitude, label: city.faName,
  };
  // Bound to seven or at most 31 distinct days. Sequential computation limits CPU peaks.
  if (!dates.length || dates.length > 31 ||
      new Set(dates).size !== dates.length) throw new Error("Invalid period dates");
  const snapshots: SkyDailySnapshot[] = [];
  for (const date of dates) {
    snapshots.push(buildSkyDailySnapshot({
      localDate: date, timezone: city.timezone, location,
    }));
  }
  return snapshots;
}, ["halleus-sky-observatory-preview", SKY_DAILY_CALCULATION_VERSION], {
  revalidate: 86_400,
});

export async function getSkyObservatoryPeriod(
  cityId: string, today: string, period: SkyObservatoryPeriod,
): Promise<SkyObservatoryPeriodData> {
  const city = findIranCityByName(cityId);
  if (!city) throw new Error("Unknown sky observatory city");
  const dates = skyObservatoryDates(today, city.timezone, period);
  const snapshots = await cachedSkyPeriodSnapshots(city.id, dates);
  return {
    period, startDate: dates[0], endDate: dates[dates.length - 1], snapshots,
  };
}
