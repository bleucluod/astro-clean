// HALLEUS_R39_STAGE2_R9_R19_OWNERSHIP_RECONCILIATION_R2_20260902
// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R9_MAIN_ASTEROIDS_20260831
import fs from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const repoRoot = process.cwd();
const require = createRequire(import.meta.url);
const originalResolveFilename =
  Module._resolveFilename;

Module._resolveFilename =
  function resolveAlias(
    request,
    parent,
    isMain,
    options,
  ) {
    if (
      typeof request === "string" &&
      request.startsWith("@/")
    ) {
      request = path.join(
        repoRoot,
        request.slice(2),
      );
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

const kernelDir =
  process.env.HALLEUS_R9_KERNEL_DIR;
const probeResultPath =
  process.env.HALLEUS_R9_PROBE_RESULT;

assert(
  typeof kernelDir === "string" &&
    fs.existsSync(kernelDir),
  "R9 guard kernel directory is missing",
);
assert(
  typeof probeResultPath === "string" &&
    fs.existsSync(probeResultPath),
  "R9 guard probe result is missing",
);

const probe =
  typeof probeResultPath === "string"
    ? JSON.parse(
        fs.readFileSync(
          probeResultPath,
          "utf8",
        ),
      )
    : null;

assert(
  probe?.ok === true &&
    probe.maxDifferenceDegrees <= 0.1,
  "R9 pre-mutation cross-validation did not pass",
);

const normalized = require(
  path.join(
    repoRoot,
    "src/lib/chart/normalized-chart.ts",
  ),
);
const calculation = require(
  path.join(
    repoRoot,
    "src/lib/chart/jpl-main-asteroid-calculation.ts",
  ),
);
const unified = require(
  path.join(
    repoRoot,
    "src/lib/chart/unified-special-points.ts",
  ),
);
const provider = require(
  path.join(
    repoRoot,
    "src/lib/chart/advanced-body-provider-contract.ts",
  ),
);

const primaryUtc =
  new Date("1997-02-13T17:00:00.000Z");

const primary =
  calculation.calculateR9ValidatedMainAsteroids({
    utcDate: primaryUtc,
    kernelDirectory: kernelDir,
  });

assert(
  primary.status === "ready",
  `R9 primary asteroid calculation blocked: ${JSON.stringify(
    primary,
  )}`,
);

if (primary.status === "ready") {
  assert(
    primary.points.length === 3,
    "R9 must promote exactly Ceres/Pallas/Vesta",
  );

  for (const point of primary.points) {
    const expected =
      probe.fixtureLongitudes?.[point.id]?.[
        primaryUtc.toISOString()
      ];

    assert(
      typeof expected === "number" &&
        angularDifference(
          point.longitude,
          expected,
        ) <= 0.000001,
      `R9 runtime longitude mismatch for ${point.id}`,
    );

    assert(
      Number.isFinite(
        point.motion.arcDegreesPerDay,
      ) &&
        point.motion.sampleWindowHours === 12,
      `R9 motion missing for ${point.id}`,
    );
  }
}

const fixtureChart =
  normalized.buildNormalizedChart({
    source: "slice2-r9-fixture",
    time: {
      date: "1997-02-13",
      time: "17:00",
      timezone: "UTC",
      placeName: "Mianeh R9 fixture",
    },
    house: {
      system: "placidus",
      ascendantLongitude: 0,
      cuspLongitudes: Array.from(
        { length: 12 },
        (_, index) => index * 30,
      ),
      cuspSource: "provided",
      ascendantMethod: "provided",
    },
    placements: [
      {
        id: "sun",
        label: "Sun",
        pointType: "luminary",
        longitude: 10,
      },
      {
        id: "moon",
        label: "Moon",
        pointType: "luminary",
        longitude: 50,
      },
    ],
  });

const oldDir =
  process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR;

process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR =
  kernelDir;

const points =
  unified.buildUnifiedSpecialPoints({
    utcDate: primaryUtc,
    latitude: 37.42,
    longitude: 47.72,
    ascendantLongitude: 0,
    normalizedChart: fixtureChart,
  });

if (oldDir === undefined) {
  delete process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR;
} else {
  process.env.HALLEUS_ADVANCED_EPHEMERIS_DIR =
    oldDir;
}

for (const id of [
  "ceres",
  "pallas",
  "vesta",
]) {
  const point = points.find(
    (candidate) => candidate.id === id,
  );

  assert(
    point?.status === "calculated",
    `${id} was not promoted by unified special points`,
  );

  if (point?.status === "calculated") {
    assert(
      point.validationStatus ===
        "cross-ephemeris-reference-fixtures-passed",
      `${id} validation status is incorrect`,
    );
    assert(
      typeof point.house === "number",
      `${id} did not reuse canonical house normalization`,
    );
    assert(
      point.motion?.method ===
        "jpl-spk-geocentric-apparent-ecliptic-of-date-central-difference",
      `${id} motion provenance missing`,
    );
  }
}

const missing =
  calculation.calculateR9ValidatedMainAsteroids({
    utcDate: primaryUtc,
    kernelDirectory: path.join(
      repoRoot,
      "__missing_r9_ephemeris__",
    ),
  });

assert(
  missing.status === "blocked" &&
    missing.reason ===
      "missing-ephemeris-files",
  "R9 missing-kernel behavior must fail closed",
);

assert(
  JSON.stringify(
    provider.ADVANCED_BODY_PROVIDER_DECISION
      .r9ValidatedMainAsteroids,
  ) ===
    JSON.stringify([
      "ceres",
      "pallas",
      "vesta",
    ]),
  "Provider R9 promoted inventory is incorrect",
);

function angularDifference(left, right) {
  let difference =
    Math.abs(left - right) % 360;

  if (difference > 180) {
    difference = 360 - difference;
  }

  return difference;
}

if (failures.length > 0) {
  console.error(
    "JPL main asteroids R9 guard failed:",
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  "JPL main asteroids R9 guard passed.",
);
console.log(
  "- Ceres/Pallas/Vesta calculated from local NAIF/JPL CODES SPK",
);
console.log(
  "- geocentric apparent J2000 state converted to true ecliptic of date",
);
console.log(
  "- motion sampled at +/-12 hours",
);
console.log(
  "- houses reuse canonical normalized-chart Placidus assignment",
);
console.log(
  "- secondary-body final promotion is owned by the later R19 independent-validation guard",
);
