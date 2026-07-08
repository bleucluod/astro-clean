import {
  TRANSIT_RULES_APPROVAL,
  TRANSIT_RULES_ASPECT_POLICY,
  TRANSIT_RULES_PLANET_POLICY,
  TRANSIT_RULES_TIME_POLICY,
} from "./transit-rules-contract";
import {
  calculateBodyApparentMotion,
  calculateBodyGeocentricLongitude,
  getAstronomyBody,
  getSignedLongitudeDelta,
  getZodiacSignForLongitude,
  makeAstronomyTime,
  normalizeLongitude,
  zonedDateTimeToUtc,
  type RealChartCalculatedMotion,
} from "./real-chart-engine";

export const SKY_ONLY_TRANSIT_PROBE_VERSION = "v0.1.247-sky-only-transit-calculation-probe" as const;

export const SKY_ONLY_TRANSIT_PROBE_STATUS = "probe-only-not-runtime" as const;

export const SKY_ONLY_TRANSIT_PROBE_METHOD =
  "astronomy-engine-geocentric-ecliptic-tehran-local-noon" as const;

const TRANSIT_RULES_SCOPE_FOR_PROBE = "public-sky-only-daily-pulse-probe" as const;

export type SkyOnlyTransitBodyId =
  (typeof TRANSIT_RULES_PLANET_POLICY.phaseOneBodies)[number];

export type SkyOnlyTransitAspectId =
  (typeof TRANSIT_RULES_ASPECT_POLICY.phaseOneAspects)[number];

export type SkyOnlyTransitBody = {
  id: SkyOnlyTransitBodyId;
  label: string;
  longitude: number;
  signId: string;
  degreeInSign: number;
  motion: RealChartCalculatedMotion;
};

export type SkyOnlyTransitAspect = {
  id: string;
  aspect: SkyOnlyTransitAspectId;
  bodyA: SkyOnlyTransitBodyId;
  bodyB: SkyOnlyTransitBodyId;
  exactAngle: number;
  separation: number;
  orb: number;
  orbLimit: number;
  involvesMoon: boolean;
};

export type SkyOnlyTransitProbeResult = {
  version: typeof SKY_ONLY_TRANSIT_PROBE_VERSION;
  status: typeof SKY_ONLY_TRANSIT_PROBE_STATUS;
  method: typeof SKY_ONLY_TRANSIT_PROBE_METHOD;
  mode: typeof TRANSIT_RULES_SCOPE_FOR_PROBE;
  timezone: typeof TRANSIT_RULES_TIME_POLICY.homepagePulseTimeZone;
  localDate: string;
  sampleLocalTime: typeof TRANSIT_RULES_TIME_POLICY.canonicalSampleTime;
  utcIso: string;
  runtimeApproval: false;
  routeApproval: false;
  reportNarrativeApproval: false;
  bodies: SkyOnlyTransitBody[];
  aspects: SkyOnlyTransitAspect[];
  notes: string[];
};

const BODY_LABELS: Record<SkyOnlyTransitBodyId, string> = {
  sun: "Sun",
  moon: "Moon",
  mercury: "Mercury",
  venus: "Venus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturn",
  uranus: "Uranus",
  neptune: "Neptune",
  pluto: "Pluto",
};

const ASPECT_ANGLES: Record<SkyOnlyTransitAspectId, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

export function calculateSkyOnlyTransitProbe(
  localDate = "2026-07-09",
): SkyOnlyTransitProbeResult {
  const utcDate = buildTehranTransitSampleUtcDate(localDate);
  const astroTime = makeAstronomyTime(utcDate);
  const bodies = TRANSIT_RULES_PLANET_POLICY.phaseOneBodies.map((bodyId) => {
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
    } satisfies SkyOnlyTransitBody;
  });

  return {
    version: SKY_ONLY_TRANSIT_PROBE_VERSION,
    status: SKY_ONLY_TRANSIT_PROBE_STATUS,
    method: SKY_ONLY_TRANSIT_PROBE_METHOD,
    mode: TRANSIT_RULES_SCOPE_FOR_PROBE,
    timezone: TRANSIT_RULES_TIME_POLICY.homepagePulseTimeZone,
    localDate,
    sampleLocalTime: TRANSIT_RULES_TIME_POLICY.canonicalSampleTime,
    utcIso: utcDate.toISOString(),
    runtimeApproval: TRANSIT_RULES_APPROVAL.skyPulseRealTransitRuntime,
    routeApproval: false,
    reportNarrativeApproval: TRANSIT_RULES_APPROVAL.reportTransitNarrative,
    bodies,
    aspects: calculateSkyOnlyTransitAspects(bodies),
    notes: [
      "Probe-only sky transit calculation for Iran launch using Asia/Tehran daily boundaries.",
      "Planetary positions are calculated locally with astronomy-engine geocentric ecliptic longitudes.",
      "This probe is not wired to the Sky Pulse route, report narrative, chart wheel, API, dependency, account, payment, or paid/private runtime.",
      "Lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred special points.",
    ],
  };
}

export function buildTehranTransitSampleUtcDate(localDate: string): Date {
  return zonedDateTimeToUtc(
    localDate,
    TRANSIT_RULES_TIME_POLICY.canonicalSampleTime.slice(0, 5),
    TRANSIT_RULES_TIME_POLICY.homepagePulseTimeZone,
  );
}

export function calculateSkyOnlyTransitAspects(
  bodies: SkyOnlyTransitBody[],
): SkyOnlyTransitAspect[] {
  const aspects: SkyOnlyTransitAspect[] = [];

  for (let outerIndex = 0; outerIndex < bodies.length; outerIndex += 1) {
    for (let innerIndex = outerIndex + 1; innerIndex < bodies.length; innerIndex += 1) {
      const bodyA = bodies[outerIndex];
      const bodyB = bodies[innerIndex];
      const separation = getSkyOnlyTransitSeparation(bodyA.longitude, bodyB.longitude);

      for (const aspect of TRANSIT_RULES_ASPECT_POLICY.phaseOneAspects) {
        const exactAngle = ASPECT_ANGLES[aspect];
        const orb = Math.abs(separation - exactAngle);
        const involvesMoon = bodyA.id === "moon" || bodyB.id === "moon";
        const orbLimit = getSkyOnlyTransitOrbLimit(aspect, involvesMoon);

        if (orb <= orbLimit) {
          aspects.push({
            id: `${bodyA.id}-${aspect}-${bodyB.id}`,
            aspect,
            bodyA: bodyA.id,
            bodyB: bodyB.id,
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

export function getSkyOnlyTransitSeparation(
  longitudeA: number,
  longitudeB: number,
): number {
  return Math.abs(getSignedLongitudeDelta(normalizeLongitude(longitudeA), normalizeLongitude(longitudeB)));
}

export function getSkyOnlyTransitOrbLimit(
  aspect: SkyOnlyTransitAspectId,
  involvesMoon: boolean,
): number {
  const baseOrb = TRANSIT_RULES_ASPECT_POLICY.phaseOneOrbDegrees[aspect];

  if (!involvesMoon) {
    return baseOrb;
  }

  return baseOrb + TRANSIT_RULES_ASPECT_POLICY.moonOrbAdjustmentDegrees;
}
