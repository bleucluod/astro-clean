import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R6_SPICEQL_WASM_NAIF_GATE_20260831

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(
  request,
  parent,
  isMain,
  options,
) {
  if (
    typeof request === "string" &&
    request.startsWith("@/")
  ) {
    request = path.join(repoRoot, request.slice(2));
  }

  return originalResolveFilename.call(
    this,
    request,
    parent,
    isMain,
    options,
  );
};

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] =
    function compileTypeScript(
      module,
      filename,
    ) {
      const source = fs.readFileSync(
        filename,
        "utf8",
      );
      const result = ts.transpileModule(
        source,
        {
          compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            moduleResolution:
              ts.ModuleResolutionKind.NodeJs,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true,
            jsx: ts.JsxEmit.ReactJSX,
            strict: true,
          },
          reportDiagnostics: true,
          fileName: filename,
        },
      );

      const diagnostics = (
        result.diagnostics ?? []
      ).filter(
        (diagnostic) =>
          diagnostic.category ===
          ts.DiagnosticCategory.Error,
      );

      if (diagnostics.length > 0) {
        throw new Error(
          `${path.relative(
            repoRoot,
            filename,
          )} transpile errors: ${diagnostics
            .map((diagnostic) =>
              ts.flattenDiagnosticMessageText(
                diagnostic.messageText,
                "\n",
              ),
            )
            .join(" | ")}`,
        );
      }

      module._compile(
        result.outputText,
        filename,
      );
    };
}

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs
    .readFileSync(
      path.join(repoRoot, relativePath),
      "utf8",
    )
    .replace(/\r\n/g, "\n");
}

const provider = require(
  path.join(
    repoRoot,
    "src/lib/chart/advanced-body-provider-contract.ts",
  ),
);
const adapter = require(
  path.join(
    repoRoot,
    "src/lib/chart/jpl-spk-wasm-provider.ts",
  ),
);

const adapterSource = read(
  "src/lib/chart/jpl-spk-wasm-provider.ts",
);
const workerSource = read(
  "src/lib/chart/jpl-spk-wasm-worker.mjs",
);
const provenance = read(
  "vendor/spiceql-wasm/PROVENANCE.md",
);
const astroTypes = read("types/astro.ts");
const unified = read(
  "src/lib/chart/unified-special-points.ts",
);

assert(
  provider.ADVANCED_BODY_PROVIDER_DECISION
    .approvedRuntimeProvider ===
    "jpl-horizons-spk-spiceql-wasm-1.7.0",
  "JPL/SPK + SpiceQL WASM provider decision is not active",
);

assert(
  provider.ADVANCED_BODY_PROVIDER_DECISION
    .networkPerReportRuntimeAllowed === false,
  "Per-report network access must remain forbidden",
);

assert(
  provider.ADVANCED_BODY_PROVIDER_DECISION
    .nativeCompilerRequired === false,
  "Selected reader must not require a native compiler",
);

const expectedBodies = [
  "chiron",
  "ceres",
  "pallas",
  "juno",
  "vesta",
  "eris",
  "pholus",
  "nessus",
];

assert(
  JSON.stringify(
    Object.keys(
      adapter.JPL_SMALL_BODY_DESIGNATIONS,
    ),
  ) === JSON.stringify(expectedBodies),
  "Provider designation registry must cover all 8 approved bodies",
);

for (const source of [
  adapterSource,
  workerSource,
]) {
  assert(
    !/fetch\s*\(/u.test(source) &&
      !source.includes("http://") &&
      !source.includes("https://"),
    "Runtime provider path must contain no network request",
  );
}

for (const fileName of [
  "spiceql.js",
  "naifspice.js",
  "spiceql_wasm.js",
  "spiceql_wasm.wasm",
  "spiceql_wasm.data",
  "package.json",
  "PROVENANCE.md",
]) {
  assert(
    fs.existsSync(
      path.join(
        repoRoot,
        "vendor",
        "spiceql-wasm",
        fileName,
      ),
    ),
    `Vendored SpiceQL file missing: ${fileName}`,
  );
}

assert(
  provenance.includes(
    "5517ed41ed9b512991642f0afd34634e7cfc0cbe4a6401d595484b35aede3859",
  ) &&
    provenance.includes(
      "CC0-1.0",
    ) &&
    provenance.includes(
      "NAIF Rules Regarding Use of SPICE",
    ) &&
    provenance.includes(
      "no fees or paid license required",
    ),
  "Vendored runtime provenance/hash/license record is incomplete",
);

assert(
  astroTypes.includes(
    '"existing-formula-preserved"',
  ) &&
    astroTypes.includes(
      '"local-regression-fixture-passed"',
    ),
  "Validation contract must distinguish preserved/regression data from independent validation",
);

assert(
  unified.includes(
    'validationStatus: "existing-formula-preserved"',
  ),
  "Fortune must use the preserved-formula validation status",
);

assert(
  unified.includes(
    'validationStatus: "local-regression-fixture-passed"',
  ) &&
    unified.includes(
      "independent external Vertex acceptance validation remains pending",
    ),
  "Vertex validation provenance still overclaims external acceptance",
);

const defaultReadiness =
  provider.evaluateAdvancedBodyProviderAvailability();

assert(
  defaultReadiness.status === "blocked" &&
    defaultReadiness.reason ===
      "provider-unavailable",
  "Selected provider must fail closed until the local reader is available",
);

const missingKernelReadiness =
  provider.evaluateAdvancedBodyProviderAvailability(
    {
      runtimeAvailable: true,
      ephemerisFilesAvailable: false,
    },
  );

assert(
  missingKernelReadiness.status === "blocked" &&
    missingKernelReadiness.reason ===
      "missing-ephemeris-files",
  "Missing production kernels must fail closed",
);

const lskPath =
  process.env.HALLEUS_R6_PROBE_LSK;
const spkPath =
  process.env.HALLEUS_R6_PROBE_SPK;
const spkId = Number(
  process.env.HALLEUS_R6_PROBE_SPK_ID,
);

assert(
  typeof lskPath === "string" &&
    fs.existsSync(lskPath),
  "Focused guard did not receive the real probe LSK",
);
assert(
  typeof spkPath === "string" &&
    fs.existsSync(spkPath),
  "Focused guard did not receive the real probe SPK",
);
assert(
  Number.isInteger(spkId),
  "Focused guard did not receive the real SPK id",
);

if (
  typeof lskPath === "string" &&
  typeof spkPath === "string" &&
  fs.existsSync(lskPath) &&
  fs.existsSync(spkPath) &&
  Number.isInteger(spkId)
) {
  const state =
    adapter.readJplSmallBodyHeliocentricStateSync(
      {
        targetId: "ceres",
        spkFileId: spkId,
        utcDate: new Date(
          "1997-02-13T17:00:00.000Z",
        ),
        leapSecondsKernelPath: lskPath,
        smallBodyKernelPath: spkPath,
      },
    );

  assert(
    state.status === "ready",
    `Vendored synchronous adapter failed real Ceres SPK: ${JSON.stringify(
      state,
    )}`,
  );

  if (state.status === "ready") {
    const toolkitNumber = Number(
      state.toolkitVersion.match(/\d+/u)?.[0] ?? 0,
    );

    assert(
      /^CSPICE_N\d+$/u.test(
        state.toolkitVersion,
      ) &&
        toolkitNumber >= 65,
      "Vendored adapter toolkit is not Type-21 capable: " + state.toolkitVersion,
    );

    const distanceAu =
      Math.hypot(
        state.stateKmAndKmPerSecond[0],
        state.stateKmAndKmPerSecond[1],
        state.stateKmAndKmPerSecond[2],
      ) / 149597870.7;

    assert(
      distanceAu > 2.0 &&
        distanceAu < 3.5,
      `Vendored adapter returned implausible Ceres distance: ${distanceAu}`,
    );
  }
}

const missing =
  adapter.readJplSmallBodyHeliocentricStateSync(
    {
      targetId: "ceres",
      spkFileId: 2000001,
      utcDate: new Date(
        "1997-02-13T17:00:00.000Z",
      ),
      leapSecondsKernelPath:
        path.join(
          repoRoot,
          "__missing_lsk__.tls",
        ),
      smallBodyKernelPath:
        path.join(
          repoRoot,
          "__missing_spk__.bsp",
        ),
    },
  );

assert(
  missing.status === "blocked" &&
    missing.reason ===
      "missing-ephemeris-files",
  "Vendored adapter must fail closed with missing kernels",
);

if (failures.length > 0) {
  console.error(
    "JPL/SPK SpiceQL WASM R6 guard failed:",
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  "JPL/SPK SpiceQL WASM R6 guard passed.",
);
console.log(
  "- official SpiceQL 1.7.0 WASM vendored with release provenance",
);
console.log(
  "- synchronous Node subprocess adapter read the official NAIF-hosted Horizons Ceres SPK",
);
console.log(
  "- embedded CSPICE is N65+ Type-21 capable; no native compiler and no per-report network path",
);
console.log(
  "- Fortune/Vertex validation provenance is honest",
);
console.log(
  "- production 8-body kernel set remains the next gate",
);
