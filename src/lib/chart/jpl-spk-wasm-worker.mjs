import fs from "node:fs";
import path from "node:path";

// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R6_SPICEQL_WASM_NAIF_GATE_20260831
import { pathToFileURL } from "node:url";

const payloadText = fs.readFileSync(0, "utf8");
const payload = JSON.parse(payloadText);

if (payload?.mode === "r9-geocentric-batch") {
  const batch = await runR9GeocentricBatch(payload);
  process.stdout.write(JSON.stringify(batch));
  process.exit(0);
}

const vendorDir = path.resolve(
  process.cwd(),
  "vendor",
  "spiceql-wasm",
);

const { loadSpiceQL } = await import(
  pathToFileURL(
    path.join(vendorDir, "spiceql.js"),
  ).href
);
const { loadNaifspice } = await import(
  pathToFileURL(
    path.join(vendorDir, "naifspice.js"),
  ).href
);

const spiceql = await loadSpiceQL({
  moduleOverrides: {
    locateFile(fileName) {
      return path.join(vendorDir, fileName);
    },
  },
});

spiceql.mountKernel(
  "/kernels/naif0012.tls",
  new Uint8Array(
    fs.readFileSync(payload.leapSecondsKernelPath),
  ),
);
spiceql.mountKernel(
  "/kernels/body.bsp",
  new Uint8Array(
    fs.readFileSync(payload.smallBodyKernelPath),
  ),
);

const naif = loadNaifspice(spiceql);
const toolkitVersion = naif.tkvrsn("TOOLKIT");
const toolkitNumber = Number(
  String(toolkitVersion).match(/\d+/u)?.[0] ?? 0,
);

if (
  !/^CSPICE_N\d+$/u.test(
    String(toolkitVersion),
  ) ||
  toolkitNumber < 65
) {
  throw new Error(
    "SpiceQL embedded toolkit is not Type-21 capable: " + String(toolkitVersion),
  );
}

let geo;
let et;

try {
  naif.furnsh("/kernels/naif0012.tls");
  naif.furnsh("/kernels/body.bsp");

  et = naif.str2et(
    new Date(payload.utcIso)
      .toISOString()
      .replace("T", " ")
      .replace("Z", " UTC"),
  );

  geo = naif.spkgeo(
    Number(payload.spkFileId),
    et,
    "J2000",
    10,
  );
} finally {
  try {
    naif.kclear();
  } catch {}
}

const state = geo?.state;

if (
  !Array.isArray(state) ||
  state.length !== 6 ||
  !state.every(Number.isFinite)
) {
  throw new Error(
    "SpiceQL/CSPICE returned an invalid SPK state vector.",
  );
}

process.stdout.write(
  JSON.stringify({
    status: "ready",
    targetId: payload.targetId,
    spkFileId: Number(payload.spkFileId),
    epochEt: Number(et),
    referenceFrame: "J2000",
    observerNaifId: 10,
    stateKmAndKmPerSecond: state,
    lightTimeSeconds: Number(geo?.lt ?? 0),
    source: "local-jpl-horizons-spk",
    reader: "doi-usgs-spiceql-wasm-1.7.0",
    toolkitVersion: String(toolkitVersion),
  }),
);

// HALLEUS_ADVANCED_ASTROLOGY_SLICE2_R9_MAIN_ASTEROIDS_20260831
// R9 batch mode is intentionally isolated from the original R8 payload path.
export async function runR9GeocentricBatch(payload) {
  const vendorDir = path.resolve(
    process.cwd(),
    "vendor",
    "spiceql-wasm",
  );

  const { loadSpiceQL } = await import(
    pathToFileURL(path.join(vendorDir, "spiceql.js")).href
  );
  const { loadNaifspice } = await import(
    pathToFileURL(path.join(vendorDir, "naifspice.js")).href
  );

  const spiceql = await loadSpiceQL({
    moduleOverrides: {
      locateFile(fileName) {
        return path.join(vendorDir, fileName);
      },
    },
  });

  const mounted = [];

  for (let index = 0; index < payload.kernelPaths.length; index += 1) {
    const localPath = payload.kernelPaths[index];
    const virtualPath = `/r9runtime/kernel-${index}${path.extname(localPath)}`;

    spiceql.mountKernel(
      virtualPath,
      new Uint8Array(fs.readFileSync(localPath)),
    );
    mounted.push(virtualPath);
  }

  const naif = loadNaifspice(spiceql);

  try {
    for (const kernel of mounted) {
      naif.furnsh(kernel);
    }

    const results = [];

    for (const request of payload.requests) {
      const et = naif.str2et(
        new Date(request.utcIso)
          .toISOString()
          .replace("T", " ")
          .replace("Z", " UTC"),
      );

      const geo = naif.spkez(
        Number(request.spkFileId),
        et,
        "J2000",
        "LT+S",
        399,
      );

      results.push({
        key: request.key,
        targetId: request.targetId,
        spkFileId: Number(request.spkFileId),
        utcIso: request.utcIso,
        stateKmAndKmPerSecond: geo.state,
        lightTimeSeconds: Number(geo.lt),
      });
    }

    return {
      status: "ready",
      referenceFrame: "J2000",
      observerNaifId: 399,
      aberrationCorrection: "LT+S",
      results,
    };
  } finally {
    try {
      naif.kclear();
    } catch {}
  }
}
