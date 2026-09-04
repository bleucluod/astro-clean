import fs from "node:fs";
import path from "node:path";

import * as Astronomy from "astronomy-engine";

import {
  readJplSmallBodyGeocentricBatchSync,
} from "./jpl-spk-wasm-provider";

export const JPL_MAIN_ASTEROID_CALCULATION_VERSION =
  "r9-codes300ast-cross-validated-20260831" as const;

// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R9_MAIN_ASTEROIDS_20260831

export const R9_PROMOTED_MAIN_ASTEROID_IDS = [
  "ceres",
  "pallas",
  "vesta",
] as const;

export type R9PromotedMainAsteroidId =
  (typeof R9_PROMOTED_MAIN_ASTEROID_IDS)[number];

export const R9_MAIN_ASTEROID_KERNEL_FILES = {
  leapSeconds: "naif0012.tls",
  planetary: "de440s.bsp",
  body: "codes_300ast_20100725.bsp",
  frame: "codes_300ast_20100725.tf",
} as const;

const TARGET_IDS: Record<
  R9PromotedMainAsteroidId,
  number
> = {
  ceres: 2000001,
  pallas: 2000002,
  vesta: 2000004,
};

const AU_KM = 149597870.7;
const SAMPLE_WINDOW_HOURS = 12;
const STATIONARY_THRESHOLD_DEGREES_PER_DAY = 0.01;

export type R9CalculatedMainAsteroid = {
  status: "calculated";
  id: R9PromotedMainAsteroidId;
  longitude: number;
  motion: {
    status: "direct" | "retrograde" | "stationary";
    arcDegreesPerDay: number;
    sampleWindowHours: 12;
    method:
      "jpl-spk-geocentric-apparent-ecliptic-of-date-central-difference";
  };
};

export type R9MainAsteroidCalculationBlocked = {
  status: "blocked";
  reason:
    | "missing-ephemeris-files"
    | "provider-unavailable"
    | "invalid-provider-output";
  detail: string;
};

export type R9MainAsteroidCalculationResult =
  | {
      status: "ready";
      points: R9CalculatedMainAsteroid[];
      kernelDirectory: string;
    }
  | R9MainAsteroidCalculationBlocked;

export function resolveR9KernelPaths(
  kernelDirectory: string,
): string[] {
  return [
    R9_MAIN_ASTEROID_KERNEL_FILES.leapSeconds,
    R9_MAIN_ASTEROID_KERNEL_FILES.planetary,
    R9_MAIN_ASTEROID_KERNEL_FILES.frame,
    R9_MAIN_ASTEROID_KERNEL_FILES.body,
  ].map((fileName) =>
    path.join(kernelDirectory, fileName),
  );
}

export function calculateR9ValidatedMainAsteroids(input: {
  utcDate: Date;
  kernelDirectory?: string | null;
}): R9MainAsteroidCalculationResult {
  const kernelDirectory =
    input.kernelDirectory?.trim() ||
    process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR?.trim() ||
    "";

  if (!kernelDirectory) {
    return {
      status: "blocked",
      reason: "missing-ephemeris-files",
      detail:
        "HALLEUS_ADVANCED_EPHEMERIS_DIR is not configured.",
    };
  }

  const kernelPaths = resolveR9KernelPaths(kernelDirectory);

  if (
    kernelPaths.some(
      (kernelPath) => !fs.existsSync(kernelPath),
    )
  ) {
    return {
      status: "blocked",
      reason: "missing-ephemeris-files",
      detail:
        "One or more R9 local kernel files are missing.",
    };
  }

  const requests = [];

  for (const id of R9_PROMOTED_MAIN_ASTEROID_IDS) {
    const targetId = TARGET_IDS[id];

    for (const [label, offsetHours] of [
      ["before", -SAMPLE_WINDOW_HOURS],
      ["current", 0],
      ["after", SAMPLE_WINDOW_HOURS],
    ] as const) {
      requests.push({
        key: `${id}:${label}`,
        targetId: id,
        spkFileId: targetId,
        utcDate: new Date(
          input.utcDate.getTime() +
            offsetHours * 60 * 60 * 1000,
        ),
      });
    }
  }

  const batch = readJplSmallBodyGeocentricBatchSync({
    kernelPaths,
    requests,
  });

  if (batch.status !== "ready") {
    return batch;
  }

  const byKey = new Map(
    batch.results.map((result) => [
      result.key,
      result,
    ]),
  );

  const points: R9CalculatedMainAsteroid[] = [];

  for (const id of R9_PROMOTED_MAIN_ASTEROID_IDS) {
    const before = byKey.get(`${id}:before`);
    const current = byKey.get(`${id}:current`);
    const after = byKey.get(`${id}:after`);

    if (!before || !current || !after) {
      return {
        status: "blocked",
        reason: "invalid-provider-output",
        detail: `Missing R9 sampled state for ${id}.`,
      };
    }

    const beforeLongitude =
      stateToTrueEclipticOfDateLongitude(
        before.stateKmAndKmPerSecond,
        new Date(before.utcIso),
      );
    const longitude =
      stateToTrueEclipticOfDateLongitude(
        current.stateKmAndKmPerSecond,
        new Date(current.utcIso),
      );
    const afterLongitude =
      stateToTrueEclipticOfDateLongitude(
        after.stateKmAndKmPerSecond,
        new Date(after.utcIso),
      );

    const arcDegreesPerDay =
      signedAngularDifference(
        afterLongitude,
        beforeLongitude,
      );

    const motionStatus =
      Math.abs(arcDegreesPerDay) <=
      STATIONARY_THRESHOLD_DEGREES_PER_DAY
        ? "stationary"
        : arcDegreesPerDay < 0
          ? "retrograde"
          : "direct";

    points.push({
      status: "calculated",
      id,
      longitude,
      motion: {
        status: motionStatus,
        arcDegreesPerDay,
        sampleWindowHours:
          SAMPLE_WINDOW_HOURS,
        method:
          "jpl-spk-geocentric-apparent-ecliptic-of-date-central-difference",
      },
    });
  }

  return {
    status: "ready",
    points,
    kernelDirectory,
  };
}

export function stateToTrueEclipticOfDateLongitude(
  stateKmAndKmPerSecond: readonly number[],
  utcDate: Date,
): number {
  if (
    stateKmAndKmPerSecond.length < 3 ||
    !stateKmAndKmPerSecond
      .slice(0, 3)
      .every(Number.isFinite)
  ) {
    throw new Error(
      "R9 JPL state vector must contain three finite position components.",
    );
  }

  const astroTime = new Astronomy.AstroTime(utcDate);
  const vector = new Astronomy.Vector(
    stateKmAndKmPerSecond[0] / AU_KM,
    stateKmAndKmPerSecond[1] / AU_KM,
    stateKmAndKmPerSecond[2] / AU_KM,
    astroTime,
  );
  const rotation =
    Astronomy.Rotation_EQJ_ECT(astroTime);
  const ecliptic =
    Astronomy.RotateVector(rotation, vector);

  return normalizeLongitude(
    (Math.atan2(ecliptic.y, ecliptic.x) *
      180) /
      Math.PI,
  );
}

function signedAngularDifference(
  after: number,
  before: number,
): number {
  let difference =
    normalizeLongitude(after) -
    normalizeLongitude(before);

  if (difference > 180) difference -= 360;
  if (difference < -180) difference += 360;

  return difference;
}

function normalizeLongitude(value: number): number {
  const normalized = value % 360;
  return normalized < 0
    ? normalized + 360
    : normalized;
}
