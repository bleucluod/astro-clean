import * as Astronomy from "astronomy-engine";
import {
  buildNormalizedChart,
  type NormalizedChart,
  type NormalizedChartPointInput,
} from "./normalized-chart";
import type { ChartHouse } from "./houses";
import {
  calculatePlacidusHouseCuspsFromUtc,
  type PlacidusHouseCalculatorResult,
} from "./placidus-house-calculator";
import {
  LOCAL_TRUE_NODE_CANDIDATE_METHOD,
  calculateLocalTrueNodeCandidate,
} from "./local-true-node-candidate";
import {
  LILITH_INTERNAL_ADAPTER_METHOD,
  LILITH_INTERNAL_ADAPTER_MODEL_ID,
  LILITH_INTERNAL_ADAPTER_SOURCE,
  calculateLocalOsculatingBlackMoonLilith,
  type LilithInternalAdapterResult,
} from "./lilith-internal-adapter";

export const REAL_CHART_WORKBENCH_VERSION = "0.1.284c" as const;

export type RealChartBirthInput = {
  name?: string;
  birthDate: string;
  birthTime: string;
  timezone: string;
  placeName: string;
  latitude: number;
  longitude: number;
};

export type RealChartPlanetMotionStatus = "direct" | "retrograde" | "stationary";

export type RealChartCalculatedMotion = {
  status: RealChartPlanetMotionStatus;
  arcDegreesPerDay: number;
  sampleWindowHours: number;
  method: "astronomy-engine-geocentric-ecliptic-daily-motion";
};

export type RealChartCalculatedPlacement = {
  id: string;
  label: string;
  pointType: NormalizedChartPointInput["pointType"];
  longitude: number;
  signId: string;
  degreeInSign: number;
  method: "astronomy-engine-geocentric";
  motion: RealChartCalculatedMotion;
};

export type RealChartCalculatedLunarNodeId = "north-node" | "south-node";

export type RealChartCalculatedLunarNode = {
  id: RealChartCalculatedLunarNodeId;
  label: string;
  longitude: number;
  signId: string;
  degreeInSign: number;
  method: "mean-lunar-node-j2000-meeus-formula" | typeof LOCAL_TRUE_NODE_CANDIDATE_METHOD;
  nodeType: "mean" | "local-true-osculating";
  source: "calculated" | "derived-opposition";
  limitation: string | null;
};

export type RealChartCalculatedLunarNodes = {
  status: "calculated";
  method: "mean-lunar-node-j2000-meeus-formula" | typeof LOCAL_TRUE_NODE_CANDIDATE_METHOD;
  nodeType: "mean" | "local-true-osculating";
  northNode: RealChartCalculatedLunarNode;
  southNode: RealChartCalculatedLunarNode;
  limitation: string | null;
};

export type RealChartCalculatedLilith = {
  status: "calculated";
  id: "black-moon-lilith";
  label: "Local True/Osculating Black Moon Lilith";
  longitude: number;
  signId: string;
  degreeInSign: number;
  method: typeof LILITH_INTERNAL_ADAPTER_METHOD;
  modelId: typeof LILITH_INTERNAL_ADAPTER_MODEL_ID;
  lilithType: "local-true-osculating-black-moon-lilith";
  source: typeof LILITH_INTERNAL_ADAPTER_SOURCE;
  frame: LilithInternalAdapterResult["frame"];
  reliability: "validated-report-output";
  approvedForReportOutput: true;
  validationStatus: LilithInternalAdapterResult["validationStatus"];
  validationReference: LilithInternalAdapterResult["validationReference"];
  validationToleranceDegrees: number;
  limitation: string | null;
};

export type RealChartAngleId = "asc" | "dsc" | "mc" | "ic";

export type RealChartCalculatedAngle = {
  id: RealChartAngleId;
  label: string;
  longitude: number;
  signId: string;
  degreeInSign: number;
  method:
    | "astronomy-engine-local-sidereal-time-ascendant"
    | "astronomy-engine-local-sidereal-time-midheaven"
    | "derived-opposition-from-ascendant"
    | "derived-opposition-from-midheaven";
  source: "calculated" | "derived-opposition";
  reliability: "calculated" | "derived";
  limitation: string | null;
};

export type RealChartCalculatedAngles = {
  asc: RealChartCalculatedAngle;
  dsc: RealChartCalculatedAngle;
  mc: RealChartCalculatedAngle;
  ic: RealChartCalculatedAngle;
};

export type RealChartWorkbenchResult = {
  version: typeof REAL_CHART_WORKBENCH_VERSION;
  input: RealChartBirthInput;
  utcIso: string;
  ascendantLongitude: number;
  ascendantMethod: "astronomy-engine-local-sidereal-time";
  midheavenLongitude: number;
  angles: RealChartCalculatedAngles;
  houses: ChartHouse[];
  houseCalculation: PlacidusHouseCalculatorResult;
  calculationNotes: string[];
  placements: RealChartCalculatedPlacement[];
  retrogradePlanetIds: string[];
  lunarNodes: RealChartCalculatedLunarNodes;
  lilith: RealChartCalculatedLilith;
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
  const midheavenLongitude = calculateMidheavenLongitude(
    astroTime,
    utcDate,
    input.longitude,
  );
  const angles = buildRealChartAngles({
    ascendantLongitude,
    midheavenLongitude,
  });
  const placements = calculateRealChartPlacements(astroTime, utcDate);
  const lunarNodes = calculateLocalTrueLunarNodes(utcDate);
  const lilith = calculateRealChartLilith(utcDate);
  const houseCalculation = calculatePlacidusHouseCuspsFromUtc({
    utcDate,
    latitudeDegrees: input.latitude,
    longitudeDegrees: input.longitude,
  });
  const normalizedChart = buildNormalizedChart({
    source: "astronomy-engine-prototype",
    time: {
      date: input.birthDate,
      time: input.birthTime,
      timezone: input.timezone,
      placeName: input.placeName,
    },
    house:
      houseCalculation.status === "calculated"
        ? {
            system: "placidus",
            ascendantLongitude,
            ascendantMethod: "astronomy-engine-local-sidereal-time",
            cuspLongitudes: houseCalculation.cuspLongitudes,
            cuspSource: "local-placidus-calculator",
            calculationMethod: houseCalculation.method,
          }
        : {
            system: "placidus",
            ascendantLongitude,
            ascendantMethod: "astronomy-engine-local-sidereal-time",
            unavailableReason: houseCalculation.reason,
            calculationMethod: houseCalculation.method,
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
    midheavenLongitude,
    angles,
    houses: normalizedChart.houseContext.housesReady
      ? normalizedChart.houses
      : [],
    houseCalculation,
    placements,
    retrogradePlanetIds: placements
      .filter((placement) => placement.motion.status === "retrograde")
      .map((placement) => placement.id),
    lunarNodes,
    lilith,
    normalizedChart,
    calculationNotes: [
      "Planetary positions are calculated from an Earth-centered vector and converted to the ecliptic plane with astronomy-engine.",
      "Timezone conversion uses the JavaScript Intl timezone database.",
      "Ascendant is calculated from astronomy-engine SiderealTime, birth latitude/longitude, and tropical obliquity.",
      "Midheaven is calculated independently from local sidereal time and tropical obliquity; it is not treated as the 10th house cusp.",
      "Descendant and IC are derived as exact oppositions from Ascendant and Midheaven.",
      houseCalculation.status === "calculated"
        ? "خانه‌ها با محاسبه‌گر محلی پلاسیدوس و دوازده سرخانهٔ نامساوی اعتبارسنجی‌شده محاسبه می‌شوند."
        : houseCalculation.reason === "polar-circle"
          ? "خانه‌های پلاسیدوس در محدودهٔ قطبی محاسبه‌گر در دسترس نیستند و هیچ روش خانهٔ جایگزینی اعمال نشده است."
          : "حل‌گر محلی پلاسیدوس همگرا نشد و هیچ روش خانهٔ جایگزینی اعمال نشده است.",
      "Retrograde motion is calculated from apparent geocentric ecliptic longitude sampled around the birth time.",
      "Local True/Osculating lunar nodes are calculated from Astronomy Engine GeoMoonState and the instantaneous lunar orbital plane; no external API or Swiss runtime dependency is used.",
      "Local True/Osculating Black Moon Lilith is calculated from the validated local Moon state-vector adapter; bounded natal-report interpretation is enabled after independent offline reference fixtures passed.",
      "Natal accuracy depends on exact civil birth time, timezone id, and city coordinates; uncertain birth time must be disclosed before paid/private reports.",
      "Timezone and midnight-boundary behavior is guarded by natal accuracy hardening checks before the report claims production-grade precision.",
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
  utcDate: Date = new Date(),
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
      motion: calculateBodyApparentMotion(bodyConfig.body, utcDate),
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

export function calculateLocalTrueLunarNodes(utcDate: Date): RealChartCalculatedLunarNodes {
  const candidate = calculateLocalTrueNodeCandidate(utcDate, "ecliptic-of-date");

  return {
    status: "calculated",
    method: LOCAL_TRUE_NODE_CANDIDATE_METHOD,
    nodeType: "local-true-osculating",
    northNode: buildLocalTrueLunarNode({
      id: "north-node",
      label: "Local True/Osculating North Lunar Node",
      longitude: candidate.northLongitude,
      source: "calculated",
      limitation:
        "Calculated locally from Astronomy Engine GeoMoonState as an instantaneous lunar orbital plane node; no external API or Swiss runtime dependency is used.",
    }),
    southNode: buildLocalTrueLunarNode({
      id: "south-node",
      label: "Local True/Osculating South Lunar Node",
      longitude: candidate.southLongitude,
      source: "derived-opposition",
      limitation:
        "Derived as the exact opposition of the selected local True/Osculating North Lunar Node.",
    }),
    limitation:
      "Halleus production lunar nodes use the local True/Osculating model from Astronomy Engine GeoMoonState. Mean Lunar Node remains available as a fallback helper.",
  };
}

export function calculateRealChartLilith(utcDate: Date): RealChartCalculatedLilith {
  const adapterResult = calculateLocalOsculatingBlackMoonLilith(utcDate);
  const normalizedLongitude = normalizeLongitude(adapterResult.longitude);
  const sign = getZodiacSignForLongitude(normalizedLongitude);

  return {
    status: "calculated",
    id: "black-moon-lilith",
    label: "Local True/Osculating Black Moon Lilith",
    longitude: normalizedLongitude,
    signId: sign.signId,
    degreeInSign: sign.degreeInSign,
    method: LILITH_INTERNAL_ADAPTER_METHOD,
    modelId: LILITH_INTERNAL_ADAPTER_MODEL_ID,
    lilithType: "local-true-osculating-black-moon-lilith",
    source: LILITH_INTERNAL_ADAPTER_SOURCE,
    frame: adapterResult.frame,
    reliability: "validated-report-output",
    approvedForReportOutput: true,
    validationStatus: adapterResult.validationStatus,
    validationReference: adapterResult.validationReference,
    validationToleranceDegrees: adapterResult.validationToleranceDegrees,
    limitation:
      "Calculated locally from the validated True/Osculating Black Moon Lilith adapter. Natal-report interpretation is enabled; transit, chart-wheel and public SEO expansion remain separately gated.",
  };
}

export function calculateMeanLunarNodes(utcDate: Date): RealChartCalculatedLunarNodes {
  const northLongitude = calculateMeanNorthLunarNodeLongitude(utcDate);
  const southLongitude = calculateOppositeAngleLongitude(northLongitude);

  return {
    status: "calculated",
    method: "mean-lunar-node-j2000-meeus-formula",
    nodeType: "mean",
    northNode: buildMeanLunarNode({
      id: "north-node",
      label: "Mean North Lunar Node",
      longitude: northLongitude,
      source: "calculated",
      limitation:
        "Calculated as the mean lunar node from a J2000 polynomial; this is not the True/Osculating Node.",
    }),
    southNode: buildMeanLunarNode({
      id: "south-node",
      label: "Mean South Lunar Node",
      longitude: southLongitude,
      source: "derived-opposition",
      limitation:
        "Derived as the exact opposition of the calculated Mean North Lunar Node.",
    }),
    limitation:
      "Halleus MVP stores Mean Lunar Nodes first. True/Osculating Node remains deferred until a hardened source is approved.",
  };
}

export function calculateMeanNorthLunarNodeLongitude(utcDate: Date): number {
  const julianDay = utcDate.getTime() / 86400000 + 2440587.5;
  const centuriesSinceJ2000 = (julianDay - 2451545.0) / 36525;
  const meanNodeLongitude =
    125.04455501 -
    1934.1361849 * centuriesSinceJ2000 +
    0.0020762 * centuriesSinceJ2000 ** 2 +
    centuriesSinceJ2000 ** 3 / 467410 -
    centuriesSinceJ2000 ** 4 / 60616000;

  return normalizeLongitude(meanNodeLongitude);
}

function buildLocalTrueLunarNode({
  id,
  label,
  longitude,
  source,
  limitation,
}: {
  id: RealChartCalculatedLunarNodeId;
  label: string;
  longitude: number;
  source: RealChartCalculatedLunarNode["source"];
  limitation: string | null;
}): RealChartCalculatedLunarNode {
  const normalizedLongitude = normalizeLongitude(longitude);
  const sign = getZodiacSignForLongitude(normalizedLongitude);

  return {
    id,
    label,
    longitude: normalizedLongitude,
    signId: sign.signId,
    degreeInSign: sign.degreeInSign,
    method: LOCAL_TRUE_NODE_CANDIDATE_METHOD,
    nodeType: "local-true-osculating",
    source,
    limitation,
  };
}

function buildMeanLunarNode({
  id,
  label,
  longitude,
  source,
  limitation,
}: {
  id: RealChartCalculatedLunarNodeId;
  label: string;
  longitude: number;
  source: RealChartCalculatedLunarNode["source"];
  limitation: string | null;
}): RealChartCalculatedLunarNode {
  const normalizedLongitude = normalizeLongitude(longitude);
  const sign = getZodiacSignForLongitude(normalizedLongitude);

  return {
    id,
    label,
    longitude: normalizedLongitude,
    signId: sign.signId,
    degreeInSign: sign.degreeInSign,
    method: "mean-lunar-node-j2000-meeus-formula",
    nodeType: "mean",
    source,
    limitation,
  };
}

export function calculateBodyApparentMotion(
  body: Astronomy.Body,
  utcDate: Date,
): RealChartCalculatedMotion {
  const sampleWindowHours = 24;
  const beforeTime = makeAstronomyTime(
    new Date(utcDate.getTime() - sampleWindowHours * 60 * 60 * 1000),
  );
  const afterTime = makeAstronomyTime(
    new Date(utcDate.getTime() + sampleWindowHours * 60 * 60 * 1000),
  );
  const beforeLongitude = calculateBodyGeocentricLongitude(body, beforeTime);
  const afterLongitude = calculateBodyGeocentricLongitude(body, afterTime);
  const sampledArc = getSignedLongitudeDelta(beforeLongitude, afterLongitude);
  const sampleDays = (sampleWindowHours * 2) / 24;
  const arcDegreesPerDay = sampledArc / sampleDays;
  const stationaryThreshold = 0.0001;
  const status: RealChartPlanetMotionStatus =
    Math.abs(arcDegreesPerDay) <= stationaryThreshold
      ? "stationary"
      : arcDegreesPerDay < 0
        ? "retrograde"
        : "direct";

  return {
    status,
    arcDegreesPerDay,
    sampleWindowHours,
    method: "astronomy-engine-geocentric-ecliptic-daily-motion",
  };
}

export function getSignedLongitudeDelta(
  fromLongitude: number,
  toLongitude: number,
): number {
  const rawDelta = normalizeLongitude(toLongitude) - normalizeLongitude(fromLongitude);

  if (rawDelta > 180) {
    return rawDelta - 360;
  }

  if (rawDelta < -180) {
    return rawDelta + 360;
  }

  return rawDelta;
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

  return normalizeLongitude(ascendant + 180);
}

export function calculateMidheavenLongitude(
  astroTime: Astronomy.AstroTime,
  utcDate: Date,
  longitude: number,
): number {
  const siderealHours = Number(Astronomy.SiderealTime(astroTime));

  if (!Number.isFinite(siderealHours)) {
    throw new Error("astronomy-engine did not return a finite sidereal time for Midheaven.");
  }

  const localSiderealDegrees = normalizeLongitude(siderealHours * 15 + longitude);
  const obliquity = calculateMeanObliquityDegrees(utcDate);
  const theta = degreesToRadians(localSiderealDegrees);
  const epsilon = degreesToRadians(obliquity);
  const midheaven = radiansToDegrees(
    Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(epsilon)),
  );

  return normalizeLongitude(midheaven);
}

export function calculateOppositeAngleLongitude(longitude: number): number {
  return normalizeLongitude(longitude + 180);
}

export function buildRealChartAngles({
  ascendantLongitude,
  midheavenLongitude,
}: {
  ascendantLongitude: number;
  midheavenLongitude: number;
}): RealChartCalculatedAngles {
  return {
    asc: buildRealChartAngle({
      id: "asc",
      label: "Ascendant",
      longitude: ascendantLongitude,
      method: "astronomy-engine-local-sidereal-time-ascendant",
      source: "calculated",
      reliability: "calculated",
      limitation: null,
    }),
    dsc: buildRealChartAngle({
      id: "dsc",
      label: "Descendant",
      longitude: calculateOppositeAngleLongitude(ascendantLongitude),
      method: "derived-opposition-from-ascendant",
      source: "derived-opposition",
      reliability: "derived",
      limitation: "Derived as the exact opposition of the calculated Ascendant.",
    }),
    mc: buildRealChartAngle({
      id: "mc",
      label: "Midheaven",
      longitude: midheavenLongitude,
      method: "astronomy-engine-local-sidereal-time-midheaven",
      source: "calculated",
      reliability: "calculated",
      limitation: "Calculated as an independent Midheaven angle, not as the 10th house cusp.",
    }),
    ic: buildRealChartAngle({
      id: "ic",
      label: "Imum Coeli",
      longitude: calculateOppositeAngleLongitude(midheavenLongitude),
      method: "derived-opposition-from-midheaven",
      source: "derived-opposition",
      reliability: "derived",
      limitation: "Derived as the exact opposition of the calculated Midheaven.",
    }),
  };
}

function buildRealChartAngle({
  id,
  label,
  longitude,
  method,
  source,
  reliability,
  limitation,
}: {
  id: RealChartAngleId;
  label: string;
  longitude: number;
  method: RealChartCalculatedAngle["method"];
  source: RealChartCalculatedAngle["source"];
  reliability: RealChartCalculatedAngle["reliability"];
  limitation: string | null;
}): RealChartCalculatedAngle {
  const normalizedLongitude = normalizeLongitude(longitude);
  const sign = getZodiacSignForLongitude(normalizedLongitude);

  return {
    id,
    label,
    longitude: normalizedLongitude,
    signId: sign.signId,
    degreeInSign: sign.degreeInSign,
    method,
    source,
    reliability,
    limitation,
  };
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
