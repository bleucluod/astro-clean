import { unstable_cache } from "next/cache";

import {
  findIranCityByName,
  type IranCity,
} from "@/lib/locations/iran-cities";
import {
  SKY_DAILY_CALCULATION_VERSION,
  type SkyDailySnapshot,
} from "@/lib/sky-daily/sky-daily-contract";
import { buildSkyDailySnapshot } from "@/lib/sky-daily/sky-daily-service";

const DEFAULT_SKY_CITY = "تهران";
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export type SkyPublicDeliveryResult =
  | {
      status: "ready";
      city: IranCity;
      currentLocalDate: string;
      requestedDate: string;
      viewedAt: string;
      snapshot: SkyDailySnapshot;
      cachePolicy: "daily-data-cache";
    }
  | {
      status: "invalid-city" | "invalid-date" | "day-unavailable";
      city: IranCity | null;
      currentLocalDate: string | null;
      requestedDate: string | null;
      message: string;
    };

function localDateInTimezone(now: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isRealIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const buildCachedSnapshot = unstable_cache(async (localDate: string, cityId: string) => {
  const city = findIranCityByName(cityId);
  if (!city) throw new Error("Sky public city resolution failed.");

  return buildSkyDailySnapshot({
    localDate,
    timezone: city.timezone,
    location: {
      latitude: city.latitude,
      longitude: city.longitude,
      label: city.faName,
    },
  });
}, ["halleus-sky-public-snapshot", SKY_DAILY_CALCULATION_VERSION], {
  revalidate: 86_400,
});

export async function deliverSkyPublicSnapshot(input: {
  city?: string;
  date?: string;
  now?: Date;
}): Promise<SkyPublicDeliveryResult> {
  const city = findIranCityByName(input.city?.trim() || DEFAULT_SKY_CITY);
  if (!city) {
    return {
      status: "invalid-city",
      city: null,
      currentLocalDate: null,
      requestedDate: input.date?.trim() || null,
      message: "شهر انتخاب‌شده در فهرست معتبر هالیوس وجود ندارد.",
    };
  }

  const deliveryNow = input.now ?? new Date();
  const currentLocalDate = localDateInTimezone(deliveryNow, city.timezone);
  const requestedDate = input.date?.trim() || currentLocalDate;
  if (!isRealIsoDate(requestedDate)) {
    return {
      status: "invalid-date",
      city,
      currentLocalDate,
      requestedDate,
      message: "تاریخ باید یک روز واقعی با قالب سال، ماه و روز باشد.",
    };
  }

  if (requestedDate !== currentLocalDate) {
    return {
      status: "day-unavailable",
      city,
      currentLocalDate,
      requestedDate,
      message: "دادهٔ ذخیره‌شده‌ای برای این روز وجود ندارد؛ هالیوس دادهٔ روز دیگری را جایگزین نمی‌کند.",
    };
  }

  return {
    status: "ready",
    city,
    currentLocalDate,
    requestedDate,
    viewedAt: deliveryNow.toISOString(),
    snapshot: await buildCachedSnapshot(requestedDate, city.id),
    cachePolicy: "daily-data-cache",
  };
}
