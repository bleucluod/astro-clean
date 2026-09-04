import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import type {
  AdvancedEphemerisBodyId,
} from "./advanced-body-provider-contract";

export const JPL_SPK_WASM_PROVIDER_VERSION =
  "jpl-horizons-spk-spiceql-wasm-r6" as const;

// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R6_SPICEQL_WASM_NAIF_GATE_20260831

export const JPL_SMALL_BODY_DESIGNATIONS: Record<
  AdvancedEphemerisBodyId,
  string
> = {
  chiron: "2060",
  ceres: "1",
  pallas: "2",
  juno: "3",
  vesta: "4",
  eris: "136199",
  pholus: "5145",
  nessus: "7066",
};

export type JplSpkWasmStateReady = {
  status: "ready";
  targetId: AdvancedEphemerisBodyId;
  spkFileId: number;
  epochEt: number;
  referenceFrame: "J2000";
  observerNaifId: 10;
  stateKmAndKmPerSecond: [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  lightTimeSeconds: number;
  source: "local-jpl-horizons-spk";
  reader: "doi-usgs-spiceql-wasm-1.7.0";
  toolkitVersion: string;
};

export type JplSpkWasmStateBlocked = {
  status: "blocked";
  targetId: AdvancedEphemerisBodyId;
  reason:
    | "missing-ephemeris-files"
    | "provider-unavailable"
    | "invalid-provider-output";
  detail: string;
};

export type JplSpkWasmStateResult =
  | JplSpkWasmStateReady
  | JplSpkWasmStateBlocked;

export function readJplSmallBodyHeliocentricStateSync(
  input: {
    targetId: AdvancedEphemerisBodyId;
    spkFileId: number;
    utcDate: Date;
    leapSecondsKernelPath: string;
    smallBodyKernelPath: string;
  },
): JplSpkWasmStateResult {
  if (
    !fs.existsSync(input.leapSecondsKernelPath) ||
    !fs.existsSync(input.smallBodyKernelPath)
  ) {
    return {
      status: "blocked",
      targetId: input.targetId,
      reason: "missing-ephemeris-files",
      detail:
        "Local JPL SPK/LSK files are required; report generation never downloads kernels.",
    };
  }

  if (
    !(input.utcDate instanceof Date) ||
    !Number.isFinite(input.utcDate.getTime()) ||
    !Number.isInteger(input.spkFileId)
  ) {
    return {
      status: "blocked",
      targetId: input.targetId,
      reason: "invalid-provider-output",
      detail: "Invalid date or SPK target id.",
    };
  }

  const workerPath = path.resolve(
    process.cwd(),
    "src",
    "lib",
    "chart",
    "jpl-spk-wasm-worker.mjs",
  );

  const vendorMarker = path.resolve(
    process.cwd(),
    "vendor",
    "spiceql-wasm",
    "spiceql_wasm.wasm",
  );

  if (
    !fs.existsSync(workerPath) ||
    !fs.existsSync(vendorMarker)
  ) {
    return {
      status: "blocked",
      targetId: input.targetId,
      reason: "provider-unavailable",
      detail:
        "Vendored SpiceQL WASM runtime files are missing.",
    };
  }

  try {
    const stdout = execFileSync(
      process.execPath,
      [workerPath],
      {
        cwd: process.cwd(),
        input: JSON.stringify({
          targetId: input.targetId,
          spkFileId: input.spkFileId,
          utcIso: input.utcDate.toISOString(),
          leapSecondsKernelPath:
            input.leapSecondsKernelPath,
          smallBodyKernelPath:
            input.smallBodyKernelPath,
        }),
        encoding: "utf8",
        maxBuffer: 2 * 1024 * 1024,
        windowsHide: true,
        timeout: 30000,
      },
    ).trim();

    const parsed = JSON.parse(
      stdout,
    ) as JplSpkWasmStateReady;

    if (
      parsed.status !== "ready" ||
      parsed.targetId !== input.targetId ||
      !/^CSPICE_N\d+$/u.test(
        parsed.toolkitVersion,
      ) ||
      Number(
        parsed.toolkitVersion.match(/\d+/u)?.[0] ?? 0,
      ) < 65 ||
      !Array.isArray(
        parsed.stateKmAndKmPerSecond,
      ) ||
      parsed.stateKmAndKmPerSecond.length !== 6 ||
      !parsed.stateKmAndKmPerSecond.every(
        Number.isFinite,
      )
    ) {
      throw new Error(
        "Subprocess returned an invalid SPK state payload.",
      );
    }

    return parsed;
  } catch (error) {
    return {
      status: "blocked",
      targetId: input.targetId,
      reason: "invalid-provider-output",
      detail:
        error instanceof Error
          ? error.message
          : "Unknown SpiceQL WASM subprocess failure.",
    };
  }
}

// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R9_MAIN_ASTEROIDS_20260831
export type JplSpkGeocentricBatchRequest = {
  key: string;
  targetId:
    | "ceres"
    | "pallas"
    | "juno"
    | "vesta"
    | "chiron"
    | "eris"
    | "pholus"
    | "nessus"
    | `asteroid-${number}`;
  spkFileId: number;
  utcDate: Date;
};

export type JplSpkGeocentricBatchReady = {
  status: "ready";
  referenceFrame: "J2000";
  observerNaifId: 399;
  aberrationCorrection: "LT+S";
  results: Array<{
    key: string;
    targetId: string;
    spkFileId: number;
    utcIso: string;
    stateKmAndKmPerSecond: [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    lightTimeSeconds: number;
  }>;
};

export type JplSpkGeocentricBatchBlocked = {
  status: "blocked";
  reason:
    | "missing-ephemeris-files"
    | "provider-unavailable"
    | "invalid-provider-output";
  detail: string;
};

export function readJplSmallBodyGeocentricBatchSync(input: {
  kernelPaths: string[];
  requests: JplSpkGeocentricBatchRequest[];
}): JplSpkGeocentricBatchReady | JplSpkGeocentricBatchBlocked {
  if (
    input.kernelPaths.length < 4 ||
    input.kernelPaths.some((kernelPath) => !fs.existsSync(kernelPath))
  ) {
    return {
      status: "blocked",
      reason: "missing-ephemeris-files",
      detail:
        "R9 requires local LSK, DE440s planetary SPK, CODES asteroid SPK, and CODES frame kernel files.",
    };
  }

  if (
    input.requests.length === 0 ||
    input.requests.some(
      (request) =>
        !(request.utcDate instanceof Date) ||
        !Number.isFinite(request.utcDate.getTime()) ||
        !Number.isInteger(request.spkFileId),
    )
  ) {
    return {
      status: "blocked",
      reason: "invalid-provider-output",
      detail: "R9 batch request is invalid.",
    };
  }

  const workerPath = path.resolve(
    process.cwd(),
    "src",
    "lib",
    "chart",
    "jpl-spk-wasm-worker.mjs",
  );

  const vendorMarker = path.resolve(
    process.cwd(),
    "vendor",
    "spiceql-wasm",
    "spiceql_wasm.wasm",
  );

  if (
    !fs.existsSync(workerPath) ||
    !fs.existsSync(vendorMarker)
  ) {
    return {
      status: "blocked",
      reason: "provider-unavailable",
      detail: "Vendored SpiceQL WASM runtime is unavailable.",
    };
  }

  try {
    const stdout = execFileSync(
      process.execPath,
      [workerPath],
      {
        cwd: process.cwd(),
        input: JSON.stringify({
          mode: "r9-geocentric-batch",
          kernelPaths: input.kernelPaths,
          requests: input.requests.map((request) => ({
            key: request.key,
            targetId: request.targetId,
            spkFileId: request.spkFileId,
            utcIso: request.utcDate.toISOString(),
          })),
        }),
        encoding: "utf8",
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
        timeout: 60000,
      },
    ).trim();

    const parsed = JSON.parse(stdout) as JplSpkGeocentricBatchReady;

    if (
      parsed.status !== "ready" ||
      parsed.referenceFrame !== "J2000" ||
      parsed.observerNaifId !== 399 ||
      parsed.aberrationCorrection !== "LT+S" ||
      parsed.results.length !== input.requests.length ||
      parsed.results.some(
        (result) =>
          !Array.isArray(result.stateKmAndKmPerSecond) ||
          result.stateKmAndKmPerSecond.length !== 6 ||
          !result.stateKmAndKmPerSecond.every(Number.isFinite),
      )
    ) {
      throw new Error("Invalid R9 batch state payload.");
    }

    return parsed;
  } catch (error) {
    return {
      status: "blocked",
      reason: "invalid-provider-output",
      detail:
        error instanceof Error
          ? error.message
          : "Unknown R9 SpiceQL batch failure.",
    };
  }
}
