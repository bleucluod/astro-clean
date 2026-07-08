import {
  LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT,
  LILITH_OSCULATING_PROBE_MODEL_ID,
  LILITH_OSCULATING_PROBE_STATUS,
  assertLilithOsculatingProbeResultIsSafe,
  calculateLilithOsculatingProbe,
  normalizeLilithOsculatingProbeLongitude,
  type LilithOsculatingProbeResult,
} from "./lilith-osculating-probe";

export const LILITH_VALIDATION_HARNESS_VERSION = "v0.1.239" as const;
export const LILITH_VALIDATION_HARNESS_STATUS = "validation-harness-not-approved-for-output" as const;
export const LILITH_VALIDATION_HARNESS_SCOPE = "self-built-osculating-lilith-validation-only" as const;
export const LILITH_VALIDATION_HARNESS_MODEL_ID = LILITH_OSCULATING_PROBE_MODEL_ID;
export const LILITH_VALIDATION_HARNESS_APPROVED_FOR_PRODUCTION_OUTPUT = false as const;

export const LILITH_VALIDATION_FIXTURE_DATES = [
  "1988-01-01T00:00:00.000Z",
  "1990-01-01T00:00:00.000Z",
  "1992-02-29T12:00:00.000Z",
  "1995-06-15T12:00:00.000Z",
  "1999-08-11T11:03:00.000Z",
  "2000-01-01T00:00:00.000Z",
  "2001-09-11T12:00:00.000Z",
  "2005-03-20T18:30:00.000Z",
  "2010-07-11T09:15:00.000Z",
  "2012-12-21T11:11:00.000Z",
  "2016-02-29T06:00:00.000Z",
  "2020-12-21T10:00:00.000Z",
  "2024-04-08T18:18:00.000Z",
  "2026-07-08T00:00:00.000Z",
  "2030-01-01T00:00:00.000Z",
  "2035-06-01T00:00:00.000Z",
] as const;

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

export type LilithValidationHarnessSummary = {
  version: typeof LILITH_VALIDATION_HARNESS_VERSION;
  status: typeof LILITH_VALIDATION_HARNESS_STATUS;
  scope: typeof LILITH_VALIDATION_HARNESS_SCOPE;
  modelId: typeof LILITH_VALIDATION_HARNESS_MODEL_ID;
  approvedForProductionOutput: typeof LILITH_VALIDATION_HARNESS_APPROVED_FOR_PRODUCTION_OUTPUT;
  probeStatus: typeof LILITH_OSCULATING_PROBE_STATUS;
  probeApprovedForProductionOutput: typeof LILITH_OSCULATING_PROBE_APPROVED_FOR_PRODUCTION_OUTPUT;
  fixtureCount: number;
  dailySweepCount: number;
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

export function buildLilithValidationFixtureRows(): LilithValidationHarnessRow[] {
  return LILITH_VALIDATION_FIXTURE_DATES.map((isoDate) => toRow(isoDate, calculateLilithOsculatingProbe(new Date(isoDate))));
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
  const fixtureRows = buildLilithValidationFixtureRows();
  const dailyRows = buildLilithValidationDailySweepRows();

  for (const row of [...fixtureRows, ...dailyRows]) {
    assertValidationRow(row);
  }

  const roundedFixtureLongitudes = new Set(fixtureRows.map((row) => row.apogeeLongitude.toFixed(3)));
  if (roundedFixtureLongitudes.size < 12) {
    throw new Error("Lilith validation fixture longitudes are unexpectedly repetitive.");
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
    fixtureCount: fixtureRows.length,
    dailySweepCount: dailyRows.length,
    maxDailyLongitudeDelta,
    limitations: [
      "Validation harness supports guarded realChart engine output only; report generation, chart wheel display, transit, and public SEO claims remain disabled.",
      "Checks local osculating Lilith probe normalization, opposition geometry, eccentricity range, fixture diversity, and daily continuity.",
      "External/offline reference fixtures are still required before report output, chart wheel display, transit, or public SEO claims.",
    ],
  };
}
