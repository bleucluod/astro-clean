import {
  NATAL_TO_TRANSIT_ASPECT_POLICY,
  NATAL_TO_TRANSIT_BODY_POLICY,
  NATAL_TO_TRANSIT_TIME_POLICY,
  type NatalToTransitAspectId,
  type NatalToTransitBodyId,
} from "./natal-to-transit-contract";
import {
  calculateBodyApparentMotion,
  calculateBodyGeocentricLongitude,
  getAstronomyBody,
  getZodiacSignForLongitude,
  makeAstronomyTime,
  zonedDateTimeToUtc,
  buildRealChartWorkbenchResult,
  type RealChartBirthInput,
  type RealChartCalculatedMotion,
} from "./real-chart-engine";
import {
  getSkyOnlyTransitOrbLimit,
  getSkyOnlyTransitSeparation,
} from "./sky-only-transit-probe";

export const NATAL_TO_TRANSIT_CALCULATION_PROBE_VERSION =
  "v0.1.253-natal-to-transit-calculation-probe" as const;

export const NATAL_TO_TRANSIT_CALCULATION_PROBE_STATUS =
  "calculation-probe-not-report-runtime" as const;

export const NATAL_TO_TRANSIT_MISSING_CURRENT_RESIDENCE_STATUS =
  "missing-current-residence" as const;

export const NATAL_TO_TRANSIT_CALCULATION_PROBE_METHOD =
  "astronomy-engine-geocentric-current-residence-local-day-to-real-natal-chart" as const;

export const NATAL_TO_TRANSIT_PROBE_MODE =
  "personal-report-daily-natal-to-transit-probe" as const;

const DEFAULT_SAMPLE_LOCAL_TIME = "12:00" as const;

const ASPECT_ANGLES: Record<NatalToTransitAspectId, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

const BODY_LABELS: Record<NatalToTransitBodyId, string> = {
  "sun": "Sun",
  "moon": "Moon",
  "mercury": "Mercury",
  "venus": "Venus",
  "mars": "Mars",
  "jupiter": "Jupiter",
  "saturn": "Saturn",
  "uranus": "Uranus",
  "neptune": "Neptune",
  "pluto": "Pluto",
};

export type NatalToTransitCurrentResidenceInput = {
  placeName: string;
  countryCode: "IR";
  timezone: string;
  latitude: number;
  longitude: number;
};

export type NatalToTransitProbeInput = {
  birthInput: RealChartBirthInput;
  currentResidence?: NatalToTransitCurrentResidenceInput | null;
  currentLocalDate: string;
  sampleLocalTime?: string;
};

export type NatalToTransitProbeBody = {
  id: NatalToTransitBodyId;
  label: string;
  longitude: number;
  signId: string;
  degreeInSign: number;
  motion: RealChartCalculatedMotion;
};

export type NatalToTransitProbeAspect = {
  id: string;
  aspect: NatalToTransitAspectId;
  transitBody: NatalToTransitBodyId;
  natalBody: NatalToTransitBodyId;
  exactAngle: number;
  separation: number;
  orb: number;
  orbLimit: number;
  involvesMoon: boolean;
};

export type NatalToTransitLocationContext = {
  birthPlaceName: string;
  birthTimezone: string;
  birthLatitude: number;
  birthLongitude: number;
  currentResidencePlaceName: string;
  currentResidenceTimezone: string;
  currentResidenceLatitude: number;
  currentResidenceLongitude: number;
  policy: typeof NATAL_TO_TRANSIT_TIME_POLICY.personalTransitLocationPolicy;
  noSilentTehranDefaultForPersonalTransit: true;
};

export type NatalToTransitMissingCurrentResidenceResult = {
  version: typeof NATAL_TO_TRANSIT_CALCULATION_PROBE_VERSION;
  status: typeof NATAL_TO_TRANSIT_MISSING_CURRENT_RESIDENCE_STATUS;
  mode: typeof NATAL_TO_TRANSIT_PROBE_MODE;
  method: typeof NATAL_TO_TRANSIT_CALCULATION_PROBE_METHOD;
  currentResidenceRequired: true;
  noSilentTehranDefaultForPersonalTransit: true;
  missingCurrentResidencePolicy: typeof NATAL_TO_TRANSIT_TIME_POLICY.missingCurrentResidencePolicy;
  aspects: [];
  notes: string[];
};

export type NatalToTransitCalculationProbeResult = {
  version: typeof NATAL_TO_TRANSIT_CALCULATION_PROBE_VERSION;
  status: typeof NATAL_TO_TRANSIT_CALCULATION_PROBE_STATUS;
  mode: typeof NATAL_TO_TRANSIT_PROBE_MODE;
  method: typeof NATAL_TO_TRANSIT_CALCULATION_PROBE_METHOD;
  stage: "calculation-probe";
  localDate: string;
  sampleLocalTime: string;
  currentResidenceUtcIso: string;
  natalUtcIso: string;
  locationContext: NatalToTransitLocationContext;
  runtimeApproval: false;
  reportDataBridgeApproval: false;
  visibleReportSectionApproval: false;
  bodies: {
    natal: NatalToTransitProbeBody[];
    transit: NatalToTransitProbeBody[];
  };
  aspects: NatalToTransitProbeAspect[];
  notes: string[];
};

export type NatalToTransitProbeResult =
  | NatalToTransitCalculationProbeResult
  | NatalToTransitMissingCurrentResidenceResult;

export function calculateNatalToTransitProbe(
  input: NatalToTransitProbeInput,
): NatalToTransitProbeResult {
  assertCompleteBirthInput(input.birthInput);

  if (!input.currentResidence) {
    return buildMissingCurrentResidenceResult();
  }

  assertCurrentResidence(input.currentResidence);

  const sampleLocalTime = input.sampleLocalTime ?? DEFAULT_SAMPLE_LOCAL_TIME;
  const natalChart = buildRealChartWorkbenchResult(input.birthInput);
  const natalBodies = natalChart.placements
    .filter((placement): placement is typeof placement & { id: NatalToTransitBodyId } =>
      NATAL_TO_TRANSIT_BODY_POLICY.natalBodies.includes(placement.id as NatalToTransitBodyId),
    )
    .map((placement) => ({
      id: placement.id,
      label: placement.label,
      longitude: placement.longitude,
      signId: placement.signId,
      degreeInSign: placement.degreeInSign,
      motion: placement.motion,
    } satisfies NatalToTransitProbeBody));

  const currentResidenceUtcDate = zonedDateTimeToUtc(
    input.currentLocalDate,
    sampleLocalTime,
    input.currentResidence.timezone,
  );
  const transitBodies = calculateCurrentResidenceTransitBodies(currentResidenceUtcDate);

  return {
    version: NATAL_TO_TRANSIT_CALCULATION_PROBE_VERSION,
    status: NATAL_TO_TRANSIT_CALCULATION_PROBE_STATUS,
    mode: NATAL_TO_TRANSIT_PROBE_MODE,
    method: NATAL_TO_TRANSIT_CALCULATION_PROBE_METHOD,
    stage: "calculation-probe",
    localDate: input.currentLocalDate,
    sampleLocalTime,
    currentResidenceUtcIso: currentResidenceUtcDate.toISOString(),
    natalUtcIso: natalChart.utcIso,
    locationContext: {
      birthPlaceName: input.birthInput.placeName,
      birthTimezone: input.birthInput.timezone,
      birthLatitude: input.birthInput.latitude,
      birthLongitude: input.birthInput.longitude,
      currentResidencePlaceName: input.currentResidence.placeName,
      currentResidenceTimezone: input.currentResidence.timezone,
      currentResidenceLatitude: input.currentResidence.latitude,
      currentResidenceLongitude: input.currentResidence.longitude,
      policy: NATAL_TO_TRANSIT_TIME_POLICY.personalTransitLocationPolicy,
      noSilentTehranDefaultForPersonalTransit: true,
    },
    runtimeApproval: false,
    reportDataBridgeApproval: false,
    visibleReportSectionApproval: false,
    bodies: {
      natal: natalBodies,
      transit: transitBodies,
    },
    aspects: calculateNatalToTransitAspects(transitBodies, natalBodies),
    notes: [
      "Probe-only personal transit calculation; this is not yet wired to report data or visible UI.",
      "Natal placements use the user birth place, birth time, timezone, and coordinates.",
      "Current transit context uses the user current residence/local living place; Tehran is not a silent default for personal reports.",
      "Phase one compares geocentric transit bodies to geocentric natal bodies; houses, angles, lunar nodes, and Lilith transits remain deferred.",
      "If current residence is missing, Halleus returns a missing-location state instead of inventing personal precision.",
    ],
  };
}

export function getNatalToTransitProbeFixture(): NatalToTransitCalculationProbeResult {
  const result = calculateNatalToTransitProbe({
    birthInput: {
      name: "Halleus Probe Fixture",
      birthDate: "1994-02-20",
      birthTime: "22:10",
      timezone: "Asia/Tehran",
      placeName: "Shiraz",
      latitude: 29.5918,
      longitude: 52.5837,
    },
    currentResidence: {
      placeName: "Tehran",
      countryCode: "IR",
      timezone: "Asia/Tehran",
      latitude: 35.6892,
      longitude: 51.389,
    },
    currentLocalDate: "2026-07-09",
    sampleLocalTime: DEFAULT_SAMPLE_LOCAL_TIME,
  });

  if (result.status !== NATAL_TO_TRANSIT_CALCULATION_PROBE_STATUS) {
    throw new Error("Natal-to-transit probe fixture unexpectedly missed current residence.");
  }

  return result;
}

function calculateCurrentResidenceTransitBodies(utcDate: Date): NatalToTransitProbeBody[] {
  const astroTime = makeAstronomyTime(utcDate);

  return NATAL_TO_TRANSIT_BODY_POLICY.transitBodies.map((bodyId) => {
    const body = getAstronomyBody(bodyId);
    const longitude = calculateBodyGeocentricLongitude(body, astroTime);
    const sign = getZodiacSignForLongitude(longitude);

    return {
      id: bodyId,
      label: BODY_LABELS[bodyId],
      longitude,
      signId: sign.signId,
      degreeInSign: sign.degreeInSign,
      motion: calculateBodyApparentMotion(body, utcDate),
    } satisfies NatalToTransitProbeBody;
  });
}

export function calculateNatalToTransitAspects(
  transitBodies: NatalToTransitProbeBody[],
  natalBodies: NatalToTransitProbeBody[],
): NatalToTransitProbeAspect[] {
  const aspects: NatalToTransitProbeAspect[] = [];

  for (const transitBody of transitBodies) {
    for (const natalBody of natalBodies) {
      const separation = getSkyOnlyTransitSeparation(
        transitBody.longitude,
        natalBody.longitude,
      );

      for (const aspect of NATAL_TO_TRANSIT_ASPECT_POLICY.aspects) {
        const exactAngle = ASPECT_ANGLES[aspect];
        const orb = Math.abs(separation - exactAngle);
        const involvesMoon = transitBody.id === "moon" || natalBody.id === "moon";
        const orbLimit = getSkyOnlyTransitOrbLimit(aspect, involvesMoon);

        if (orb <= orbLimit) {
          aspects.push({
            id: `${transitBody.id}-${aspect}-natal-${natalBody.id}`,
            aspect,
            transitBody: transitBody.id,
            natalBody: natalBody.id,
            exactAngle,
            separation,
            orb,
            orbLimit,
            involvesMoon,
          });
        }
      }
    }
  }

  return aspects.sort((left, right) => left.orb - right.orb);
}

function buildMissingCurrentResidenceResult(): NatalToTransitMissingCurrentResidenceResult {
  return {
    version: NATAL_TO_TRANSIT_CALCULATION_PROBE_VERSION,
    status: NATAL_TO_TRANSIT_MISSING_CURRENT_RESIDENCE_STATUS,
    mode: NATAL_TO_TRANSIT_PROBE_MODE,
    method: NATAL_TO_TRANSIT_CALCULATION_PROBE_METHOD,
    currentResidenceRequired: true,
    noSilentTehranDefaultForPersonalTransit: true,
    missingCurrentResidencePolicy: NATAL_TO_TRANSIT_TIME_POLICY.missingCurrentResidencePolicy,
    aspects: [],
    notes: [
      "Current residence is required for personal transit; Halleus must not silently use Tehran for every report.",
      "The homepage public Sky Pulse can remain Tehran-only, but report personal transit needs the user current living location.",
    ],
  };
}

function assertCompleteBirthInput(input: RealChartBirthInput): void {
  const requiredText = [input.birthDate, input.birthTime, input.timezone, input.placeName];
  const requiredNumbers = [input.latitude, input.longitude];

  if (requiredText.some((value) => !value || !value.trim())) {
    throw new Error("Natal-to-transit probe requires explicit birth date, time, timezone, and place.");
  }

  if (requiredNumbers.some((value) => !Number.isFinite(value))) {
    throw new Error("Natal-to-transit probe requires finite birth coordinates.");
  }
}

function assertCurrentResidence(input: NatalToTransitCurrentResidenceInput): void {
  if (!input.placeName.trim()) {
    throw new Error("Current residence place name is required for personal transit.");
  }

  if (input.countryCode !== "IR") {
    throw new Error("Phase-one personal transit is limited to current residences in Iran.");
  }

  if (!input.timezone.trim()) {
    throw new Error("Current residence timezone is required for personal transit.");
  }

  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new Error("Current residence coordinates are required for personal transit.");
  }
}
