import * as Astronomy from "astronomy-engine";
import {
  LILITH_SELF_BUILT_OSCULATING_API_POLICY,
  LILITH_SELF_BUILT_OSCULATING_MODEL_ID,
  LILITH_SELF_BUILT_OSCULATING_PRODUCTION_OUTPUT_ALLOWED,
  LILITH_SELF_BUILT_OSCULATING_RUNTIME_DEPENDENCY_POLICY,
} from "./lilith-self-built-osculating-decision";

export const LILITH_OSCULATING_PROBE_VERSION = "v0.1.370" as const;
export const LILITH_OSCULATING_PROBE_STATUS = "validated-local-osculating-output" as const;
export const LILITH_OSCULATING_PROBE_SCOPE = "self-built-local-osculating-black-moon-lilith" as const;
export const LILITH_OSCULATING_PROBE_SOURCE = "astronomy-engine-geomoonstate-local-state-vector" as const;
export const LILITH_OSCULATING_PROBE_METHOD =
  "self-built-osculating-lunar-apogee-from-moon-position-velocity" as const;
export const LILITH_OSCULATING_PROBE_MODEL_ID = LILITH_SELF_BUILT_OSCULATING_MODEL_ID;
export const LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT = true as const;

export const LILITH_OSCULATING_PROBE_REQUIRED_APIS = [
  "GeoMoonState",
  "RotateState",
  "Rotation_EQJ_ECT",
] as const;

export const LILITH_OSCULATING_PROBE_REJECTED_RUNTIME_SHORTCUTS = [
  "SearchLunarApsis",
  "NextLunarApsis",
  "external-api-lilith",
  "swiss-runtime-lilith",
  "mean-lilith-formula",
  "dark-moon-lilith-waldemath",
  "asteroid-1181-lilith",
] as const;

export const LILITH_OSCULATING_PROBE_LIMITATIONS = [
  "Validated self-built osculating Black Moon Lilith calculation.",
  "Uses the existing local Astronomy Engine Moon state vector and no external API.",
  "Uses a two-body osculating orbit from geocentric Moon position and velocity state vectors.",
  "Passed fixed offline Swiss Ephemeris osculating-apogee reference fixtures within the approved tolerance.",
  "Approved for bounded natal-report interpretation only; transit, chart-wheel and public SEO expansion remain separate.",
] as const;

export const LILITH_OSCULATING_PROBE_EARTH_MOON_GM_KM3_S2 = 403503.241918 as const;
export const LILITH_OSCULATING_PROBE_AU_KM = 149597870.7 as const;
export const LILITH_OSCULATING_PROBE_SECONDS_PER_DAY = 86400 as const;
export const LILITH_OSCULATING_PROBE_MU_AU3_DAY2 =
  LILITH_OSCULATING_PROBE_EARTH_MOON_GM_KM3_S2 *
  LILITH_OSCULATING_PROBE_SECONDS_PER_DAY ** 2 /
  LILITH_OSCULATING_PROBE_AU_KM ** 3;

export type LilithOsculatingProbeStateVector = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

export type LilithOsculatingProbeFrame = "ecliptic-of-date";

export type LilithOsculatingProbeResult = {
  version: typeof LILITH_OSCULATING_PROBE_VERSION;
  status: typeof LILITH_OSCULATING_PROBE_STATUS;
  scope: typeof LILITH_OSCULATING_PROBE_SCOPE;
  source: typeof LILITH_OSCULATING_PROBE_SOURCE;
  method: typeof LILITH_OSCULATING_PROBE_METHOD;
  modelId: typeof LILITH_OSCULATING_PROBE_MODEL_ID;
  frame: LilithOsculatingProbeFrame;
  approvedForProductionOutput: typeof LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT;
  apiPolicy: typeof LILITH_SELF_BUILT_OSCULATING_API_POLICY;
  runtimeDependencyPolicy: typeof LILITH_SELF_BUILT_OSCULATING_RUNTIME_DEPENDENCY_POLICY;
  decisionProductionOutputAllowed: typeof LILITH_SELF_BUILT_OSCULATING_PRODUCTION_OUTPUT_ALLOWED;
  apogeeLongitude: number;
  perigeeLongitude: number;
  eccentricity: number;
  angularMomentumLength: number;
  muAu3Day2: number;
  limitations: readonly (typeof LILITH_OSCULATING_PROBE_LIMITATIONS)[number][];
};

const astronomyApi = Astronomy as unknown as Record<string, unknown>;

export function getMissingLilithOsculatingProbeApis(): string[] {
  return LILITH_OSCULATING_PROBE_REQUIRED_APIS.filter(
    (name) => typeof astronomyApi[name] === "undefined",
  );
}

export function assertLilithOsculatingProbeApis(): void {
  const missing = getMissingLilithOsculatingProbeApis();
  if (missing.length > 0) {
    throw new Error(`Missing Astronomy Engine APIs for Lilith osculating probe: ${missing.join(", ")}`);
  }
}

export function normalizeLilithOsculatingProbeLongitude(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function radToDeg(radians: number): number {
  return radians * 180 / Math.PI;
}

function cross(
  first: Pick<LilithOsculatingProbeStateVector, "x" | "y" | "z">,
  second: Pick<LilithOsculatingProbeStateVector, "x" | "y" | "z">,
): { x: number; y: number; z: number } {
  return {
    x: first.y * second.z - first.z * second.y,
    y: first.z * second.x - first.x * second.z,
    z: first.x * second.y - first.y * second.x,
  };
}

function vectorLength(vector: { x: number; y: number; z: number }): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid ${label} for Lilith osculating probe.`);
  }
}

export function calculateLilithOsculatingProbeFromState(
  state: LilithOsculatingProbeStateVector,
  frame: LilithOsculatingProbeFrame = "ecliptic-of-date",
): LilithOsculatingProbeResult {
  const position = { x: state.x, y: state.y, z: state.z };
  const velocity = { x: state.vx, y: state.vy, z: state.vz };
  const positionLength = vectorLength(position);
  const angularMomentum = cross(position, velocity);
  const angularMomentumLength = vectorLength(angularMomentum);

  assertFinitePositive(positionLength, "Moon position length");
  assertFinitePositive(angularMomentumLength, "Moon angular momentum length");
  assertFinitePositive(LILITH_OSCULATING_PROBE_MU_AU3_DAY2, "Earth-Moon gravitational parameter");

  const velocityCrossAngularMomentum = cross(velocity, angularMomentum);
  const eccentricityVector = {
    x: velocityCrossAngularMomentum.x / LILITH_OSCULATING_PROBE_MU_AU3_DAY2 - position.x / positionLength,
    y: velocityCrossAngularMomentum.y / LILITH_OSCULATING_PROBE_MU_AU3_DAY2 - position.y / positionLength,
    z: velocityCrossAngularMomentum.z / LILITH_OSCULATING_PROBE_MU_AU3_DAY2 - position.z / positionLength,
  };
  const eccentricity = vectorLength(eccentricityVector);

  assertFinitePositive(eccentricity, "Moon osculating eccentricity");

  const perigeeLongitude = normalizeLilithOsculatingProbeLongitude(
    radToDeg(Math.atan2(eccentricityVector.y, eccentricityVector.x)),
  );
  const apogeeLongitude = normalizeLilithOsculatingProbeLongitude(perigeeLongitude + 180);

  return {
    version: LILITH_OSCULATING_PROBE_VERSION,
    status: LILITH_OSCULATING_PROBE_STATUS,
    scope: LILITH_OSCULATING_PROBE_SCOPE,
    source: LILITH_OSCULATING_PROBE_SOURCE,
    method: LILITH_OSCULATING_PROBE_METHOD,
    modelId: LILITH_OSCULATING_PROBE_MODEL_ID,
    frame,
    approvedForProductionOutput: LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT,
    apiPolicy: LILITH_SELF_BUILT_OSCULATING_API_POLICY,
    runtimeDependencyPolicy: LILITH_SELF_BUILT_OSCULATING_RUNTIME_DEPENDENCY_POLICY,
    decisionProductionOutputAllowed: LILITH_SELF_BUILT_OSCULATING_PRODUCTION_OUTPUT_ALLOWED,
    apogeeLongitude,
    perigeeLongitude,
    eccentricity,
    angularMomentumLength,
    muAu3Day2: LILITH_OSCULATING_PROBE_MU_AU3_DAY2,
    limitations: LILITH_OSCULATING_PROBE_LIMITATIONS,
  };
}

export function calculateLilithOsculatingProbe(utcDate: Date): LilithOsculatingProbeResult {
  assertLilithOsculatingProbeApis();

  const eqjState = Astronomy.GeoMoonState(utcDate);
  const eclipticOfDateState = Astronomy.RotateState(Astronomy.Rotation_EQJ_ECT(utcDate), eqjState);

  return calculateLilithOsculatingProbeFromState(eclipticOfDateState, "ecliptic-of-date");
}

export function assertLilithOsculatingProbeResultIsSafe(result: LilithOsculatingProbeResult): void {
  if (result.approvedForProductionOutput !== true || result.decisionProductionOutputAllowed !== true) {
    throw new Error("Validated Lilith osculating output approval is missing.");
  }

  if (result.apiPolicy !== "no-external-api") {
    throw new Error("Lilith osculating probe must not use an external API.");
  }

  if (result.runtimeDependencyPolicy !== "no-new-lilith-runtime-dependency") {
    throw new Error("Lilith osculating probe must not add a new runtime dependency.");
  }

  if (!Number.isFinite(result.apogeeLongitude) || result.apogeeLongitude < 0 || result.apogeeLongitude >= 360) {
    throw new Error("Lilith osculating probe apogee longitude must be normalized.");
  }

  if (!Number.isFinite(result.perigeeLongitude) || result.perigeeLongitude < 0 || result.perigeeLongitude >= 360) {
    throw new Error("Lilith osculating probe perigee longitude must be normalized.");
  }

  const opposition = Math.abs(normalizeLilithOsculatingProbeLongitude(result.perigeeLongitude + 180) - result.apogeeLongitude);
  if (Math.min(opposition, 360 - opposition) > 1e-9) {
    throw new Error("Lilith osculating probe apogee must be exact opposition of perigee direction.");
  }

  if (!Number.isFinite(result.eccentricity) || result.eccentricity <= 0 || result.eccentricity >= 0.2) {
    throw new Error("Lilith osculating probe eccentricity sanity check failed.");
  }
}
