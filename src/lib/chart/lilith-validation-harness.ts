import {
  LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT,
  LILITH_OSCULATING_PROBE_MODEL_ID,
  LILITH_OSCULATING_PROBE_STATUS,
  assertLilithOsculatingProbeResultIsSafe,
  calculateLilithOsculatingProbe,
  normalizeLilithOsculatingProbeLongitude,
  type LilithOsculatingProbeResult,
} from "./lilith-osculating-probe";
import {
  LILITH_REFERENCE_FIXTURES,
  LILITH_REFERENCE_FIXTURE_RUNTIME_POLICY,
  LILITH_REFERENCE_FIXTURE_SOURCE,
  LILITH_REFERENCE_MAX_ANGULAR_DELTA_DEGREES,
} from "./lilith-reference-fixtures";

export const LILITH_VALIDATION_HARNESS_VERSION = "v0.1.370" as const;
export const LILITH_VALIDATION_HARNESS_STATUS = "independent-reference-fixtures-passed" as const;
export const LILITH_VALIDATION_HARNESS_SCOPE = "validated-osculating-lilith-natal-report" as const;
export const LILITH_VALIDATION_HARNESS_MODEL_ID = LILITH_OSCULATING_PROBE_MODEL_ID;
export const LILITH_VALIDATION_HARNESS_APPROVED_FOR_PRODUCTION_OUTPUT = true as const;
export const LILITH_VALIDATION_DAILY_SWEEP_START = "2026-07-01T00:00:00.000Z" as const;
export const LILITH_VALIDATION_DAILY_SWEEP_DAYS = 32 as const;
export const LILITH_VALIDATION_MAX_DAILY_LONGITUDE_DELTA_DEGREES = 80 as const;
export const LILITH_VALIDATION_MIN_ECCENTRICITY = 0.001 as const;
export const LILITH_VALIDATION_MAX_ECCENTRICITY = 0.2 as const;

export type LilithValidationHarnessRow = {
  isoDate: string;
  apogeeLongitude: number;
  perigeeLongitude: number;
  eccentricity: number;
  angularMomentumLength: number;
};

export type LilithReferenceComparisonRow = LilithValidationHarnessRow & {
  referenceLongitude: number;
  angularDeltaDegrees: number;
};

export type LilithValidationHarnessSummary = {
  version: typeof LILITH_VALIDATION_HARNESS_VERSION;
  status: typeof LILITH_VALIDATION_HARNESS_STATUS;
  scope: typeof LILITH_VALIDATION_HARNESS_SCOPE;
  modelId: typeof LILITH_VALIDATION_HARNESS_MODEL_ID;
  approvedForProductionOutput: typeof LILITH_VALIDATION_HARNESS_APPROVED_FOR_PRODUCTION_OUTPUT;
  probeStatus: typeof LILITH_OSCULATING_PROBE_STATUS;
  probeApprovedForProductionOutput: typeof LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT;
  referenceSource: typeof LILITH_REFERENCE_FIXTURE_SOURCE;
  referenceRuntimePolicy: typeof LILITH_REFERENCE_FIXTURE_RUNTIME_POLICY;
  referenceToleranceDegrees: typeof LILITH_REFERENCE_MAX_ANGULAR_DELTA_DEGREES;
  fixtureCount: number;
  dailySweepCount: number;
  maxReferenceAngularDeltaDegrees: number;
  maxDailyLongitudeDelta: number;
  limitations: readonly string[];
};

function toRow(isoDate: string, result: LilithOsculatingProbeResult): LilithValidationHarnessRow {
  assertLilithOsculatingProbeResultIsSafe(result);
  return {
    isoDate,
    apogeeLongitude: result.apogeeLongitude,
    perigeeLongitude: result.perigeeLongitude,
    eccentricity: result.eccentricity,
    angularMomentumLength: result.angularMomentumLength,
  };
}

export function lilithValidationAngularDeltaDegrees(first: number, second: number): number {
  const delta = Math.abs(normalizeLilithOsculatingProbeLongitude(second - first));
  return Math.min(delta, 360 - delta);
}

export function buildLilithValidationReferenceRows(): LilithReferenceComparisonRow[] {
  return LILITH_REFERENCE_FIXTURES.map((fixture) => {
    const row = toRow(
      fixture.isoDate,
      calculateLilithOsculatingProbe(new Date(fixture.isoDate)),
    );
    return {
      ...row,
      referenceLongitude: fixture.referenceLongitude,
      angularDeltaDegrees: lilithValidationAngularDeltaDegrees(
        row.apogeeLongitude,
        fixture.referenceLongitude,
      ),
    };
  });
}

export function buildLilithValidationDailySweepRows(): LilithValidationHarnessRow[] {
  const startMs = Date.parse(LILITH_VALIDATION_DAILY_SWEEP_START);
  return Array.from({ length: LILITH_VALIDATION_DAILY_SWEEP_DAYS }, (_, index) => {
    const isoDate = new Date(startMs + index * 86400000).toISOString();
    return toRow(isoDate, calculateLilithOsculatingProbe(new Date(isoDate)));
  });
}

function assertValidationRow(row: LilithValidationHarnessRow): void {
  const expectedApogee = normalizeLilithOsculatingProbeLongitude(row.perigeeLongitude + 180);
  const oppositionDelta = lilithValidationAngularDeltaDegrees(expectedApogee, row.apogeeLongitude);
  if (!Number.isFinite(row.apogeeLongitude) || row.apogeeLongitude < 0 || row.apogeeLongitude >= 360) {
    throw new Error(`Lilith validation apogee longitude is not normalized for ${row.isoDate}.`);
  }
  if (!Number.isFinite(row.perigeeLongitude) || row.perigeeLongitude < 0 || row.perigeeLongitude >= 360) {
    throw new Error(`Lilith validation perigee longitude is not normalized for ${row.isoDate}.`);
  }
  if (oppositionDelta > 1e-9) {
    throw new Error(`Lilith validation apogee/perigee opposition failed for ${row.isoDate}.`);
  }
  if (
    !Number.isFinite(row.eccentricity) ||
    row.eccentricity <= LILITH_VALIDATION_MIN_ECCENTRICITY ||
    row.eccentricity >= LILITH_VALIDATION_MAX_ECCENTRICITY
  ) {
    throw new Error(`Lilith validation eccentricity failed for ${row.isoDate}.`);
  }
  if (!Number.isFinite(row.angularMomentumLength) || row.angularMomentumLength <= 0) {
    throw new Error(`Lilith validation angular momentum failed for ${row.isoDate}.`);
  }
}

export function validateLilithOsculatingProbeHarness(): LilithValidationHarnessSummary {
  const referenceRows = buildLilithValidationReferenceRows();
  const dailyRows = buildLilithValidationDailySweepRows();
  for (const row of [...referenceRows, ...dailyRows]) assertValidationRow(row);

  const maxReferenceAngularDeltaDegrees = Math.max(
    ...referenceRows.map((row) => row.angularDeltaDegrees),
  );
  if (maxReferenceAngularDeltaDegrees > LILITH_REFERENCE_MAX_ANGULAR_DELTA_DEGREES) {
    const worst = referenceRows
      .slice()
      .sort((a, b) => b.angularDeltaDegrees - a.angularDeltaDegrees)[0];
    throw new Error(
      `Lilith independent reference tolerance failed near ${worst?.isoDate}: ${worst?.angularDeltaDegrees.toFixed(6)} degrees.`,
    );
  }

  let maxDailyLongitudeDelta = 0;
  for (let index = 1; index < dailyRows.length; index += 1) {
    const delta = lilithValidationAngularDeltaDegrees(
      dailyRows[index - 1].apogeeLongitude,
      dailyRows[index].apogeeLongitude,
    );
    maxDailyLongitudeDelta = Math.max(maxDailyLongitudeDelta, delta);
    if (delta > LILITH_VALIDATION_MAX_DAILY_LONGITUDE_DELTA_DEGREES) {
      throw new Error(`Lilith validation daily longitude jump is too large near ${dailyRows[index].isoDate}.`);
    }
  }

  return {
    version: LILITH_VALIDATION_HARNESS_VERSION,
    status: LILITH_VALIDATION_HARNESS_STATUS,
    scope: LILITH_VALIDATION_HARNESS_SCOPE,
    modelId: LILITH_VALIDATION_HARNESS_MODEL_ID,
    approvedForProductionOutput: LILITH_VALIDATION_HARNESS_APPROVED_FOR_PRODUCTION_OUTPUT,
    probeStatus: LILITH_OSCULATING_PROBE_STATUS,
    probeApprovedForProductionOutput: LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT,
    referenceSource: LILITH_REFERENCE_FIXTURE_SOURCE,
    referenceRuntimePolicy: LILITH_REFERENCE_FIXTURE_RUNTIME_POLICY,
    referenceToleranceDegrees: LILITH_REFERENCE_MAX_ANGULAR_DELTA_DEGREES,
    fixtureCount: referenceRows.length,
    dailySweepCount: dailyRows.length,
    maxReferenceAngularDeltaDegrees,
    maxDailyLongitudeDelta,
    limitations: [
      "Approval is limited to bounded natal-report interpretation.",
      "Swiss Ephemeris is represented only by fixed offline reference values and is not a runtime dependency.",
      "Lilith transit, chart-wheel rendering and public SEO claims remain outside this approval.",
    ],
  };
}
