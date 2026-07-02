import * as Astronomy from "astronomy-engine";
import {
  buildNormalizedChart,
  type NormalizedChart,
  type NormalizedChartPointInput,
} from "./normalized-chart";

export const REAL_CHART_WORKBENCH_VERSION = "0.1.137a" as const;

export type RealChartBirthInput = {
  name?: string;
  birthDate: string;
  birthTime: string;
  timezone: string;
  placeName: string;
  latitude: number;
  longitude: number;
};

export type RealChartCalculatedPlacement = {
  id: string;
  label: string;
  pointType: NormalizedChartPointInput["pointType"];
  longitude: number;
  signId: string;
  degreeInSign: number;
  method: "astronomy-engine-geocentric";
};

export type RealChartWorkbenchResult = {
  version: typeof REAL_CHART_WORKBENCH_VERSION;
  input: RealChartBirthInput;
  utcIso: string;
  ascendantLongitude: number;
  ascendantMethod: "astronomy-engine-local-sidereal-time";
  calculationNotes: string[];
  placements: RealChartCalculatedPlacement[];
  normalizedChart: NormalizedChart;
};

const REAL_CHART_BODY_CONFIGS: Array<{
  id: string;
  label: string;
  body: Astronomy.Body;
  pointType: NormalizedChartPointInput["pointType"];
}> = [
  { id: "sun", label: "Sun", body: Astronomy.Body.Sun, pointType: "luminary" },
  { id: "moon", label: "Moon", body: Astronomy.Body.Moon, pointType: "luminary" },
  { id: "mercury", label: "Mercury", body: Astronomy.Body.Mercury, pointType: "personal-planet" },
  { id: "venus", label: "Venus", body: Astronomy.Body.Venus, pointType: "personal-planet" },
  { id: "mars", label: "Mars", body: Astronomy.Body.Mars, pointType: "personal-planet" },
  { id: "jupiter", label: "Jupiter", body: Astronomy.Body.Jupiter, pointType: "social-planet" },
  { id: "saturn", label: "Saturn", body: Astronomy.Body.Saturn, pointType: "social-planet" },
  { id: "uranus", label: "Uranus", body: Astronomy.Body.Uranus, pointType: "outer-planet" },
  { id: "neptune", label: "Neptune", body: Astronomy.Body.Neptune, pointType: "outer-planet" },
  { id: "pluto", label: "Pluto", body: Astronomy.Body.Pluto, pointType: "outer-planet" },
];

const ZODIAC_SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export function buildRealChartWorkbenchResult(
  rawInput: Partial<RealChartBirthInput>,
): RealChartWorkbenchResult {
  const input = normalizeRealChartBirthInput(rawInput);
  const utcDate = zonedDateTimeToUtc(input.birthDate, input.birthTime, input.timezone);
  const astroTime = makeAstronomyTime(utcDate);
  const ascendantLongitude = calculateAscendantLongitude(
    astroTime,
    utcDate,
    input.latitude,
    input.longitude,
  );
  const placements = calculateRealChartPlacements(astroTime);
  const normalizedChart = buildNormalizedChart({
    source: "astronomy-engine-prototype",
    time: {
      date: input.birthDate,
      time: input.birthTime,
      timezone: input.timezone,
      placeName: input.placeName,
    },
    house: {
      system: "equal-house",
      firstHouseCuspLongitude: ascendantLongitude,
    },
    placements: placements.map((placement) => ({
      id: placement.id,
      label: placement.label,
      pointType: placement.pointType,
      longitude: placement.longitude,
    })),
  });

  return {
    version: REAL_CHART_WORKBENCH_VERSION,
    input,
    utcIso: utcDate.toISOString(),
    ascendantLongitude,
    ascendantMethod: "astronomy-engine-local-sidereal-time",
    placements,
    normalizedChart,
    calculationNotes: [
      "Planetary positions are calculated from an Earth-centered vector and converted to the ecliptic plane with astronomy-engine.",
      "Timezone conversion uses the JavaScript Intl timezone database.",
      "Ascendant is calculated from astronomy-engine SiderealTime, birth latitude/longitude, and tropical obliquity.",
      "Houses remain equal-house scaffolding until the dedicated house-system foundation batch.",
      "This is the first user-visible real chart workbench, not the final paid report engine.",
    ],
  };
}

export function normalizeRealChartBirthInput(
  rawInput: Partial<RealChartBirthInput>,
): RealChartBirthInput {
  return {
    name: normalizeOptionalText(rawInput.name) ?? "Halleus Demo",
    birthDate: normalizeRequiredText(rawInput.birthDate, "1994-02-20"),
    birthTime: normalizeRequiredText(rawInput.birthTime, "22:10"),
    timezone: normalizeRequiredText(rawInput.timezone, "Asia/Baku"),
    placeName: normalizeRequiredText(rawInput.placeName, "Baku"),
    latitude: normalizeNumber(rawInput.latitude, 40.4093),
    longitude: normalizeNumber(rawInput.longitude, 49.8671),
  };
}

export function calculateRealChartPlacements(
  astroTime: Astronomy.AstroTime,
): RealChartCalculatedPlacement[] {
  return REAL_CHART_BODY_CONFIGS.map((bodyConfig) => {
    const longitude = calculateBodyGeocentricLongitude(bodyConfig.body, astroTime);
    const sign = getZodiacSignForLongitude(longitude);

    return {
      id: bodyConfig.id,
      label: bodyConfig.label,
      pointType: bodyConfig.pointType,
      longitude,
      signId: sign.signId,
      degreeInSign: sign.degreeInSign,
      method: "astronomy-engine-geocentric",
    };
  });
}

export function calculateBodyGeocentricLongitude(
  body: Astronomy.Body,
  astroTime: Astronomy.AstroTime,
): number {
  const vector = Astronomy.GeoVector(body, astroTime, true);
  const ecliptic = Astronomy.Ecliptic(vector);
  const longitude = Number(ecliptic.elon);

  if (!Number.isFinite(longitude)) {
    throw new Error(`Could not calculate Earth-centered longitude for ${String(body)}.`);
  }

  return normalizeLongitude(longitude);
}

export function makeAstronomyTime(utcDate: Date): Astronomy.AstroTime {
  return new Astronomy.AstroTime(utcDate);
}

export function getAstronomyBody(bodyId: string): Astronomy.Body {
  const match = REAL_CHART_BODY_CONFIGS.find((bodyConfig) => bodyConfig.id === bodyId);

  if (!match) {
    throw new Error(`Unsupported astronomy body id: ${bodyId}`);
  }

  return match.body;
}

export function zonedDateTimeToUtc(
  birthDate: string,
  birthTime: string,
  timezone: string,
): Date {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = birthTime.split(":").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    throw new Error("Birth date/time must be valid YYYY-MM-DD and HH:mm values.");
  }

  const desiredUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let guessUtc = desiredUtc;

  for (let index = 0; index < 4; index += 1) {
    const parts = getZonedParts(new Date(guessUtc), timezone);
    const renderedUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      0,
    );
    const delta = renderedUtc - desiredUtc;
    guessUtc -= delta;

    if (Math.abs(delta) < 1000) {
      break;
    }
  }

  return new Date(guessUtc);
}

export function calculateAscendantLongitude(
  astroTime: Astronomy.AstroTime,
  utcDate: Date,
  latitude: number,
  longitude: number,
): number {
  const siderealHours = Number(Astronomy.SiderealTime(astroTime));

  if (!Number.isFinite(siderealHours)) {
    throw new Error("astronomy-engine did not return a finite sidereal time.");
  }

  const localSiderealDegrees = normalizeLongitude(siderealHours * 15 + longitude);
  const obliquity = calculateMeanObliquityDegrees(utcDate);
  const theta = degreesToRadians(localSiderealDegrees);
  const epsilon = degreesToRadians(obliquity);
  const phi = degreesToRadians(latitude);
  const ascendant = radiansToDegrees(
    Math.atan2(
      -Math.cos(theta),
      Math.sin(theta) * Math.cos(epsilon) + Math.tan(phi) * Math.sin(epsilon),
    ),
  );

  return normalizeLongitude(ascendant);
}

export function calculateApproximateAscendantLongitude(
  utcDate: Date,
  latitude: number,
  longitude: number,
): number {
  return calculateAscendantLongitude(makeAstronomyTime(utcDate), utcDate, latitude, longitude);
}

export function calculateMeanObliquityDegrees(utcDate: Date): number {
  const julianDay = utcDate.getTime() / 86400000 + 2440587.5;
  const daysSinceJ2000 = julianDay - 2451545.0;
  const centuriesSinceJ2000 = daysSinceJ2000 / 36525;

  return (
    23.439291 -
    0.0130042 * centuriesSinceJ2000 -
    1.64e-7 * centuriesSinceJ2000 ** 2 +
    5.04e-7 * centuriesSinceJ2000 ** 3
  );
}

export function getZodiacSignForLongitude(longitude: number): {
  signId: string;
  degreeInSign: number;
} {
  const normalized = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);
  const signId = ZODIAC_SIGNS[signIndex] ?? "unknown";

  return {
    signId,
    degreeInSign: normalized - signIndex * 30,
  };
}

export function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

export function formatChartDegree(value: number): string {
  return `${value.toFixed(2)}°`;
}

function getZonedParts(date: Date, timezone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function normalizeRequiredText(value: string | undefined, fallback: string): string {
  return normalizeOptionalText(value) ?? fallback;
}

function normalizeOptionalText(value?: string): string | null {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}
