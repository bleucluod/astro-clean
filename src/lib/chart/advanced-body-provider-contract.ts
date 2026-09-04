export const ADVANCED_BODY_PROVIDER_CONTRACT_VERSION =
  "slice2-provider-contract-r6-jpl-spk-spiceql-wasm-20260831" as const;

// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R1_20260830
// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R6_SPICEQL_WASM_NAIF_GATE_20260831

export const ADVANCED_EPHEMERIS_BODY_IDS = [
  "chiron",
  "ceres",
  "pallas",
  "juno",
  "vesta",
  "eris",
  "pholus",
  "nessus",
] as const;

export type AdvancedEphemerisBodyId =
  (typeof ADVANCED_EPHEMERIS_BODY_IDS)[number];

export type AdvancedBodyProviderBlockReason =
  | "no-approved-runtime-provider"
  | "provider-unavailable"
  | "missing-ephemeris-files"
  | "unsupported-body"
  | "invalid-provider-output";

export type AdvancedBodyProviderReadiness =
  | {
      status: "ready";
      reason: null;
    }
  | {
      status: "blocked";
      reason: AdvancedBodyProviderBlockReason;
    };

export const ADVANCED_BODY_PROVIDER_DECISION = {
  status: "selected-jpl-horizons-spk-spiceql-wasm",
  approvedRuntimeProvider:
    "jpl-horizons-spk-spiceql-wasm-1.7.0",
  offlineRuntimeRequired: true,
  networkPerReportRuntimeAllowed: false,
  kernelSource:
    "NASA/JPL Horizons generated small-body SPK",
  kernelFormat: "SPK Type 21",
  reader:
    "DOI-USGS SpiceQL 1.7.0 WebAssembly / CSPICE",
  nativeCompilerRequired: false,
  r9ValidatedMainAsteroids: [
    "ceres",
    "pallas",
    "vesta",
  ],
  r9DeferredPendingDedicatedReference: [
    "chiron",
    "juno",
    "eris",
    "pholus",
    "nessus",
  ],
  r19ValidatedSecondaryBodies: [
    "chiron",
    "juno",
    "eris",
    "pholus",
    "nessus",
  ],
  r19DedicatedHorizonsKernelBodies: [
    "chiron",
    "eris",
    "pholus",
    "nessus",
  ],
  r19JunoKernelSource: "codes_300ast_20100725.bsp",
  swissEphemerisQaOnly: true,
  licensing: {
    spiceQlWrapper: "CC0-1.0",
    embeddedSpiceToolkit:
      "NAIF Rules Regarding Use of SPICE",
    commercialUseAllowed: true,
    paidCommercialLicenseRequired: false,
    redistributionMode:
      "embedded-in-customer-built-spice-based-tool",
  },
  validation: {
    officialReaderArtifactPinned: true,
    officialNaifSpkReaderGateRequired: true,
    liveHorizonsType21ProbeRequiredBeforeProductionKernelAcceptance: true,
  },
  candidates: {
    astronomyEngine: {
      disposition: "keep-for-existing-core-planets",
      reason:
        "Current Halleus dependency remains approved for Sun through Pluto and chart geometry.",
    },
    jplHorizons: {
      disposition: "selected-offline-kernel-source",
      reason:
        "Generate/download small-body SPKs ahead of runtime; no Horizons request is allowed in the per-report calculation path.",
    },
    spiceQlWasm: {
      disposition: "selected-cspice-wasm-reader",
      reason:
        "Official DOI-USGS SpiceQL 1.7.0 WebAssembly release reads local SPK kernels without a native compiler dependency.",
    },
    jsSpice: {
      disposition: "rejected-native-toolchain-dependency",
      reason:
        "The inspected Node wrapper had no usable Node 24 Windows prebuilt binary and fell back to node-gyp/Visual Studio compilation.",
    },
    swissEphemeris: {
      disposition: "not-adopted",
      reason:
        "Not selected because Halleus is using the JPL/SPK path with no paid commercial license requirement.",
    },
  },
} as const;

export function evaluateAdvancedBodyProviderAvailability(
  input: {
    providerApproved?: boolean;
    runtimeAvailable?: boolean;
    ephemerisFilesAvailable?: boolean;
  } = {},
): AdvancedBodyProviderReadiness {
  const providerApproved =
    input.providerApproved ??
    (ADVANCED_BODY_PROVIDER_DECISION
      .approvedRuntimeProvider !== null);

  if (providerApproved !== true) {
    return {
      status: "blocked",
      reason: "no-approved-runtime-provider",
    };
  }

  if (input.runtimeAvailable !== true) {
    return {
      status: "blocked",
      reason: "provider-unavailable",
    };
  }

  if (input.ephemerisFilesAvailable !== true) {
    return {
      status: "blocked",
      reason: "missing-ephemeris-files",
    };
  }

  return {
    status: "ready",
    reason: null,
  };
}
