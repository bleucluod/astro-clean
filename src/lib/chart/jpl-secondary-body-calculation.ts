import fs from "node:fs";
import path from "node:path";

import {
  readJplSmallBodyGeocentricBatchSync,
} from "./jpl-spk-wasm-provider";
import {
  stateToTrueEclipticOfDateLongitude,
} from "./jpl-main-asteroid-calculation";

export const JPL_SECONDARY_BODY_CALCULATION_VERSION =
  "r19-independent-reference-validated-20260831" as const;

// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R19_SECONDARY_BODIES_20260831

export const R19_VALIDATED_SECONDARY_BODY_IDS = [
  "chiron",
  "juno",
  "eris",
  "pholus",
  "nessus",
] as const;

export type R19ValidatedSecondaryBodyId =
  (typeof R19_VALIDATED_SECONDARY_BODY_IDS)[number];

export const R19_SECONDARY_BODY_KERNEL_FILES = {
  leapSeconds: "naif0012.tls",
  planetary: "de440s.bsp",
  frame: "codes_300ast_20100725.tf",
  mainAsteroids: "codes_300ast_20100725.bsp",
  chiron: "20002060.bsp",
  eris: "20136199.bsp",
  pholus: "20005145.bsp",
  nessus: "20007066.bsp",
} as const;

const TARGET_IDS: Record<R19ValidatedSecondaryBodyId, number> = {
  chiron: 20002060,
  juno: 2000003,
  eris: 20136199,
  pholus: 20005145,
  nessus: 20007066,
};

const SAMPLE_WINDOW_HOURS = 12;
const STATIONARY_THRESHOLD_DEGREES_PER_DAY = 0.01;

export type R19CalculatedSecondaryBody = {
  status: "calculated";
  id: R19ValidatedSecondaryBodyId;
  longitude: number;
  motion: {
    status: "direct" | "retrograde" | "stationary";
    arcDegreesPerDay: number;
    sampleWindowHours: 12;
    method: "jpl-spk-geocentric-apparent-ecliptic-of-date-central-difference";
  };
};

export type R19SecondaryBodyCalculationResult =
  | {
      status: "ready";
      points: R19CalculatedSecondaryBody[];
      kernelDirectory: string;
    }
  | {
      status: "blocked";
      reason:
        | "missing-ephemeris-files"
        | "provider-unavailable"
        | "invalid-provider-output";
      detail: string;
    };

export function resolveR19KernelPaths(kernelDirectory: string): string[] {
  return [
    R19_SECONDARY_BODY_KERNEL_FILES.leapSeconds,
    R19_SECONDARY_BODY_KERNEL_FILES.planetary,
    R19_SECONDARY_BODY_KERNEL_FILES.frame,
    R19_SECONDARY_BODY_KERNEL_FILES.mainAsteroids,
    R19_SECONDARY_BODY_KERNEL_FILES.chiron,
    R19_SECONDARY_BODY_KERNEL_FILES.eris,
    R19_SECONDARY_BODY_KERNEL_FILES.pholus,
    R19_SECONDARY_BODY_KERNEL_FILES.nessus,
  ].map((fileName) => path.join(kernelDirectory, fileName));
}

export function calculateR19ValidatedSecondaryBodies(input: {
  utcDate: Date;
  kernelDirectory?: string | null;
}): R19SecondaryBodyCalculationResult {
  const kernelDirectory =
    input.kernelDirectory?.trim() ||
    process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR?.trim() ||
    "";

  if (!kernelDirectory) {
    return {
      status: "blocked",
      reason: "missing-ephemeris-files",
      detail: "HALLEUS_ADVANCED_EPHEMERIS_DIR is not configured.",
    };
  }

  const kernelPaths = resolveR19KernelPaths(kernelDirectory);
  if (kernelPaths.some((kernelPath) => !fs.existsSync(kernelPath))) {
    return {
      status: "blocked",
      reason: "missing-ephemeris-files",
      detail: "One or more R19 local kernel files are missing.",
    };
  }

  const requests = [];
  for (const id of R19_VALIDATED_SECONDARY_BODY_IDS) {
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
          input.utcDate.getTime() + offsetHours * 60 * 60 * 1000,
        ),
      });
    }
  }

  const batch = readJplSmallBodyGeocentricBatchSync({
    kernelPaths,
    requests,
  });
  if (batch.status !== "ready") return batch;

  const byKey = new Map(batch.results.map((result) => [result.key, result]));
  const points: R19CalculatedSecondaryBody[] = [];

  for (const id of R19_VALIDATED_SECONDARY_BODY_IDS) {
    const before = byKey.get(`${id}:before`);
    const current = byKey.get(`${id}:current`);
    const after = byKey.get(`${id}:after`);
    if (!before || !current || !after) {
      return {
        status: "blocked",
        reason: "invalid-provider-output",
        detail: `Missing R19 sampled state for ${id}.`,
      };
    }

    const beforeLongitude = stateToTrueEclipticOfDateLongitude(
      before.stateKmAndKmPerSecond,
      new Date(before.utcIso),
    );
    const longitude = stateToTrueEclipticOfDateLongitude(
      current.stateKmAndKmPerSecond,
      new Date(current.utcIso),
    );
    const afterLongitude = stateToTrueEclipticOfDateLongitude(
      after.stateKmAndKmPerSecond,
      new Date(after.utcIso),
    );
    const arcDegreesPerDay = signedAngularDifference(
      afterLongitude,
      beforeLongitude,
    );
    const motionStatus =
      Math.abs(arcDegreesPerDay) <= STATIONARY_THRESHOLD_DEGREES_PER_DAY
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
        sampleWindowHours: SAMPLE_WINDOW_HOURS,
        method:
          "jpl-spk-geocentric-apparent-ecliptic-of-date-central-difference",
      },
    });
  }

  return { status: "ready", points, kernelDirectory };
}

function signedAngularDifference(after: number, before: number): number {
  let difference = normalizeLongitude(after) - normalizeLongitude(before);
  if (difference > 180) difference -= 360;
  if (difference < -180) difference += 360;
  return difference;
}

function normalizeLongitude(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}
