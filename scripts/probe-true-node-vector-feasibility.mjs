import { pathToFileURL } from "node:url";
import * as Astronomy from "astronomy-engine";

export const requiredApis = [
  "GeoMoonState",
  "Rotation_EQJ_ECL",
  "Rotation_EQJ_ECT",
  "RotateState",
  "EclipticGeoMoon",
  "SearchMoonNode",
  "NodeEventKind",
];

export const fixtures = [
  "1992-08-12T07:30:00.000Z",
  "1994-02-20T18:10:00.000Z",
  "2000-01-01T12:00:00.000Z",
  "2026-07-04T00:00:00.000Z",
  "2026-07-08T00:00:00.000Z",
];

export const nodeSearchStarts = [
  "1992-08-01T00:00:00.000Z",
  "2000-01-01T00:00:00.000Z",
  "2026-07-01T00:00:00.000Z",
];

export function getMissingApis() {
  return requiredApis.filter((name) => typeof Astronomy[name] === "undefined");
}

export function assertRequiredApis() {
  const missingApis = getMissingApis();
  if (missingApis.length > 0) {
    throw new Error(`Missing Astronomy Engine APIs for true-node vector probe: ${missingApis.join(", ")}`);
  }
}

export function normalizeLongitude(value) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function shortestDelta(from, to) {
  const raw = normalizeLongitude(to) - normalizeLongitude(from);
  if (raw > 180) return raw - 360;
  if (raw < -180) return raw + 360;
  return raw;
}

export function absDelta(first, second) {
  return Math.abs(shortestDelta(first, second));
}

export function radToDeg(radians) {
  return radians * 180 / Math.PI;
}

export function formatDegrees(value) {
  return Number(value).toFixed(6);
}

export function calculateMeanNorthLunarNodeLongitude(utcDate) {
  const julianDay = utcDate.getTime() / 86400000 + 2440587.5;
  const centuriesSinceJ2000 = (julianDay - 2451545.0) / 36525;
  const meanNodeLongitude =
    125.04455501 -
    1934.1361849 * centuriesSinceJ2000 +
    0.0020762 * centuriesSinceJ2000 ** 2 +
    centuriesSinceJ2000 ** 3 / 467410 -
    centuriesSinceJ2000 ** 4 / 60616000;

  return normalizeLongitude(meanNodeLongitude);
}

export function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function vectorLength(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

export function calculateCandidateFromState(state) {
  const position = { x: state.x, y: state.y, z: state.z };
  const velocity = { x: state.vx, y: state.vy, z: state.vz };
  const angularMomentum = cross(position, velocity);
  const angularMomentumLength = vectorLength(angularMomentum);
  if (!Number.isFinite(angularMomentumLength) || angularMomentumLength <= 0) {
    throw new Error("Invalid lunar angular momentum vector");
  }

  const ascendingNodeVector = {
    x: -angularMomentum.y,
    y: angularMomentum.x,
    z: 0,
  };
  const ascendingNodeLength = Math.hypot(ascendingNodeVector.x, ascendingNodeVector.y);
  if (!Number.isFinite(ascendingNodeLength) || ascendingNodeLength <= 0) {
    throw new Error("Invalid lunar node vector");
  }

  const ascendingLongitude = normalizeLongitude(radToDeg(Math.atan2(ascendingNodeVector.y, ascendingNodeVector.x)));
  const descendingLongitude = normalizeLongitude(ascendingLongitude + 180);
  const inclination = radToDeg(Math.acos(Math.max(-1, Math.min(1, angularMomentum.z / angularMomentumLength))));

  return {
    ascendingLongitude,
    descendingLongitude,
    inclination,
    angularMomentumLength,
  };
}

export function calculateCandidates(date) {
  assertRequiredApis();

  const eqjState = Astronomy.GeoMoonState(date);
  const eclState = Astronomy.RotateState(Astronomy.Rotation_EQJ_ECL(), eqjState);
  const ectState = Astronomy.RotateState(Astronomy.Rotation_EQJ_ECT(date), eqjState);

  return {
    eclJ2000: calculateCandidateFromState(eclState),
    ectOfDate: calculateCandidateFromState(ectState),
  };
}

export function assertFiniteCandidate(label, candidate) {
  for (const [key, value] of Object.entries(candidate)) {
    if (!Number.isFinite(value)) {
      throw new Error(`${label}.${key} is not finite: ${value}`);
    }
  }
}

export function buildFixtureRows() {
  return fixtures.map((iso) => {
    const date = new Date(iso);
    const meanNorth = calculateMeanNorthLunarNodeLongitude(date);
    const candidates = calculateCandidates(date);
    assertFiniteCandidate("eclJ2000", candidates.eclJ2000);
    assertFiniteCandidate("ectOfDate", candidates.ectOfDate);

    const moon = Astronomy.EclipticGeoMoon(date);
    return {
      iso,
      date,
      meanNorth,
      eclJ2000: candidates.eclJ2000,
      ectOfDate: candidates.ectOfDate,
      moonEctLongitude: moon.lon,
      moonEctLatitude: moon.lat,
      ectDeltaVsMean: shortestDelta(meanNorth, candidates.ectOfDate.ascendingLongitude),
      eclDeltaVsMean: shortestDelta(meanNorth, candidates.eclJ2000.ascendingLongitude),
      eclVsEctDelta: shortestDelta(candidates.eclJ2000.ascendingLongitude, candidates.ectOfDate.ascendingLongitude),
    };
  });
}

export function getNodeEventKindName(kind) {
  if (kind === Astronomy.NodeEventKind.Ascending) return "ascending";
  if (kind === Astronomy.NodeEventKind.Descending) return "descending";
  return "unknown";
}

export function buildNodeEventRows() {
  assertRequiredApis();

  return nodeSearchStarts.map((iso) => {
    const event = Astronomy.SearchMoonNode(new Date(iso));
    const eventDate = event.time.date;
    const candidates = calculateCandidates(eventDate);
    const moon = Astronomy.EclipticGeoMoon(eventDate);
    const expectedLongitude = event.kind === Astronomy.NodeEventKind.Descending
      ? candidates.ectOfDate.descendingLongitude
      : candidates.ectOfDate.ascendingLongitude;
    const eventDelta = absDelta(moon.lon, expectedLongitude);

    return {
      searchStartIso: iso,
      event,
      eventDate,
      eventKind: getNodeEventKindName(event.kind),
      moonEctLongitude: moon.lon,
      moonEctLatitude: moon.lat,
      expectedLongitude,
      eventDelta,
      ectOfDate: candidates.ectOfDate,
    };
  });
}

export function printProbeReport() {
  console.log("True/Osculating Lunar Node vector feasibility probe");
  console.log("Mode: diagnostic only; no Halleus engine/type/UI/report output is changed.");
  console.log("Source: Astronomy.GeoMoonState position+velocity, rotated into ecliptic frames.");
  console.log("Important: this is a candidate osculating node, not an approved product value.");
  console.log("");

  for (const row of buildFixtureRows()) {
    console.log(`Fixture ${row.iso}`);
    console.log(`  Mean North Node ............ ${formatDegrees(row.meanNorth)}`);
    console.log(`  Candidate ECL J2000 asc .... ${formatDegrees(row.eclJ2000.ascendingLongitude)}  delta_vs_mean=${formatDegrees(row.eclDeltaVsMean)}`);
    console.log(`  Candidate ECT of-date asc .. ${formatDegrees(row.ectOfDate.ascendingLongitude)}  delta_vs_mean=${formatDegrees(row.ectDeltaVsMean)}`);
    console.log(`  Candidate ECT south ........ ${formatDegrees(row.ectOfDate.descendingLongitude)}`);
    console.log(`  Candidate ECT inclination .. ${formatDegrees(row.ectOfDate.inclination)}`);
    console.log(`  Moon ECT lon/lat context ... ${formatDegrees(row.moonEctLongitude)} / ${formatDegrees(row.moonEctLatitude)}`);
    console.log("");
  }

  console.log("Node-event sanity checks using SearchMoonNode only as event-time context:");
  for (const row of buildNodeEventRows()) {
    console.log(`  Search from ${row.searchStartIso}`);
    console.log(`    event=${row.eventKind} at ${row.event.time.toString()}`);
    console.log(`    moon ECT lon/lat=${formatDegrees(row.moonEctLongitude)} / ${formatDegrees(row.moonEctLatitude)}`);
    console.log(`    candidate event node lon=${formatDegrees(row.expectedLongitude)} delta=${formatDegrees(row.eventDelta)}`);
    if (row.eventDelta > 1) {
      console.log("    caution: event longitude delta is above 1 degree; do not promote this candidate without external fixtures.");
    }
  }

  console.log("");
  console.log("Probe result: vector-based candidate calculation is executable.");
  console.log("Validation gate: pnpm run check:true-node-vector-validation.");
  console.log("Next gate: compare against independent True/Osculating Node reference fixtures before any engine/type/UI/report integration.");
}

const executedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === executedPath) {
  try {
    printProbeReport();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
