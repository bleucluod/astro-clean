import { GLOBAL_CITY_OPTIONS } from "@/lib/locations/global-cities";
import { IRAN_CITY_OPTIONS } from "@/lib/locations/iran-cities";

export type HalleusCity = {
  id: string;
  sourceId?: number;
  faName: string;
  regionFaName: string;
  countryFaName: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  aliases: readonly string[];
};

const IRAN_HALLEUS_CITY_OPTIONS: HalleusCity[] = IRAN_CITY_OPTIONS.map((city) => ({
  id: city.id,
  sourceId: city.sourceId,
  faName: city.faName,
  regionFaName: city.provinceFaName,
  countryFaName: "ایران",
  countryCode: "IR",
  latitude: city.latitude,
  longitude: city.longitude,
  timezone: city.timezone,
  aliases: [],
}));

export const HALLEUS_CITY_OPTIONS: readonly HalleusCity[] = [
  ...IRAN_HALLEUS_CITY_OPTIONS,
  ...GLOBAL_CITY_OPTIONS,
];

export function normalizeHalleusCitySearch(value: string) {
  return value
    .trim()
    .replaceAll("ي", "ی")
    .replaceAll("ك", "ک")
    .replace(/[‌\u200c]+/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("fa-IR");
}

export function getHalleusCityDisplayName(city: HalleusCity) {
  if (city.countryCode === "IR") {
    return city.faName === city.regionFaName
      ? city.faName
      : `${city.faName}، ${city.regionFaName}`;
  }
  return `${city.faName}، ${city.countryFaName}`;
}

function citySearchValues(city: HalleusCity) {
  return [
    city.faName,
    city.regionFaName,
    city.countryFaName,
    getHalleusCityDisplayName(city),
    ...city.aliases,
  ].map(normalizeHalleusCitySearch);
}

export function findHalleusCityById(cityId: string) {
  const normalized = cityId.trim();
  return HALLEUS_CITY_OPTIONS.find((city) => city.id === normalized) ?? null;
}

export function findHalleusCityByName(value: string) {
  const normalized = normalizeHalleusCitySearch(value);
  if (!normalized) return null;
  return (
    HALLEUS_CITY_OPTIONS.find((city) => {
      if (city.id === value.trim()) return true;
      if (city.sourceId !== undefined && String(city.sourceId) === normalized) return true;
      return citySearchValues(city).some((candidate) => candidate === normalized);
    }) ?? null
  );
}

export function filterHalleusCities(value: string) {
  const normalized = normalizeHalleusCitySearch(value);
  if (!normalized) return HALLEUS_CITY_OPTIONS;

  return HALLEUS_CITY_OPTIONS.flatMap((city) => {
    const values = citySearchValues(city);
    let score: number | null = null;
    if (normalizeHalleusCitySearch(city.faName) === normalized) score = 0;
    else if (normalizeHalleusCitySearch(getHalleusCityDisplayName(city)) === normalized) score = 1;
    else if (values.some((candidate) => candidate === normalized)) score = 2;
    else if (values.some((candidate) => candidate.startsWith(normalized))) score = 3;
    else if (values.some((candidate) => candidate.includes(normalized))) score = 4;
    if (score === null) return [];
    return [{ city, score }];
  })
    .sort((left, right) => left.score - right.score || left.city.faName.localeCompare(right.city.faName, "fa"))
    .map(({ city }) => city);
}