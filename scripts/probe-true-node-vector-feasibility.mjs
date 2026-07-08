import * as Astronomy from "astronomy-engine";

const requiredApis = [
  "GeoMoonState",
  "Rotation_EQJ_ECL",
  "Rotation_EQJ_ECT",
  "RotateState",
  "EclipticGeoMoon",
  "SearchMoonNode",
  "NodeEventKind",
];

const missingApis = requiredApis.filter((name) => typeof Astronomy[name] === "undefined");
if (missingApis.length > 0) {
  console.error("Missing Astronomy Engine APIs for true-node vector probe:");
  for (const name of missingApis) console.error("- " + name);
  process.exit(1);
}

const fixtures = [
  "1992-08-12T07:30:00.000Z",
  "1994-02-20T18:10:00.000Z",
  "2000-01-01T12:00:00.000Z",
  "2026-07-04T00:00:00.000Z",
  "2026-07-08T00:00:00.000Z",
];

const nodeSearchStarts = [
  "1992-08-01T00:00:00.000Z",
  "2000-01-01T00:00:00.000Z",
  "2026-07-01T00:00:00.000Z",
];

function normalizeLongitude(value) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function shortestDelta(from, to) {
  const raw = normalizeLongitude(to) - normalizeLongitude(from);
  if (raw > 180) return raw - 360;
  if (raw < -180) return raw + 360;
  return raw;
}

function absDelta(first, second) {
  return Math.abs(shortestDelta(first, second));
}

function radToDeg(radians) {
  return radians * 180 / Math.PI;
}

function formatDegrees(value) {
  return Number(value).toFixed(6);
}

function calculateMeanNorthLunarNodeLongitude(utcDate) {
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

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function length(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

function calculateCandidateFromState(state) {
  const position = { x: state.x, y: state.y, z: state.z };
  const velocity = { x: state.vx, y: state.vy, z: state.vz };
  const angularMomentum = cross(position, velocity);
  const angularMomentumLength = length(angularMomentum);
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

function calculateCandidates(date) {
  const eqjState = Astronomy.GeoMoonState(date);
  const eclState = Astronomy.RotateState(Astronomy.Rotation_EQJ_ECL(), eqjState);
  const ectState = Astronomy.RotateState(Astronomy.Rotation_EQJ_ECT(date), eqjState);

  return {
    eclJ2000: calculateCandidateFromState(eclState),
    ectOfDate: calculateCandidateFromState(ectState),
  };
}

function assertFiniteCandidate(label, candidate) {
  for (const [key, value] of Object.entries(candidate)) {
    if (!Number.isFinite(value)) {
      throw new Error(`${label}.${key} is not finite: ${value}`);
    }
  }
}

console.log("True/Osculating Lunar Node vector feasibility probe");
console.log("Mode: diagnostic only; no Halleus engine/type/UI/report output is changed.");
console.log("Source: Astronomy.GeoMoonState position+velocity, rotated into ecliptic frames.");
console.log("Important: this is a candidate osculating node, not an approved product value.");
console.log("");

for (const iso of fixtures) {
  const date = new Date(iso);
  const meanNorth = calculateMeanNorthLunarNodeLongitude(date);
  const candidates = calculateCandidates(date);
  assertFiniteCandidate("eclJ2000", candidates.eclJ2000);
  assertFiniteCandidate("ectOfDate", candidates.ectOfDate);

  const moon = Astronomy.EclipticGeoMoon(date);
  console.log(`Fixture ${iso}`);
  console.log(`  Mean North Node ............ ${formatDegrees(meanNorth)}`);
  console.log(`  Candidate ECL J2000 asc .... ${formatDegrees(candidates.eclJ2000.ascendingLongitude)}  delta_vs_mean=${formatDegrees(shortestDelta(meanNorth, candidates.eclJ2000.ascendingLongitude))}`);
  console.log(`  Candidate ECT of-date asc .. ${formatDegrees(candidates.ectOfDate.ascendingLongitude)}  delta_vs_mean=${formatDegrees(shortestDelta(meanNorth, candidates.ectOfDate.ascendingLongitude))}`);
  console.log(`  Candidate ECT south ........ ${formatDegrees(candidates.ectOfDate.descendingLongitude)}`);
  console.log(`  Candidate ECT inclination .. ${formatDegrees(candidates.ectOfDate.inclination)}`);
  console.log(`  Moon ECT lon/lat context ... ${formatDegrees(moon.lon)} / ${formatDegrees(moon.lat)}`);
  console.log("");
}

console.log("Node-event sanity checks using SearchMoonNode only as event-time context:");
for (const iso of nodeSearchStarts) {
  const event = Astronomy.SearchMoonNode(new Date(iso));
  const eventDate = event.time.date;
  const eventKind = event.kind === Astronomy.NodeEventKind.Ascending ? "ascending" : event.kind === Astronomy.NodeEventKind.Descending ? "descending" : "unknown";
  const candidates = calculateCandidates(eventDate);
  const moon = Astronomy.EclipticGeoMoon(eventDate);
  const expectedLongitude = event.kind === Astronomy.NodeEventKind.Descending
    ? candidates.ectOfDate.descendingLongitude
    : candidates.ectOfDate.ascendingLongitude;
  const eventDelta = absDelta(moon.lon, expectedLongitude);
  console.log(`  Search from ${iso}`);
  console.log(`    event=${eventKind} at ${event.time.toString()}`);
  console.log(`    moon ECT lon/lat=${formatDegrees(moon.lon)} / ${formatDegrees(moon.lat)}`);
  console.log(`    candidate event node lon=${formatDegrees(expectedLongitude)} delta=${formatDegrees(eventDelta)}`);
  if (eventDelta > 1) {
    console.log("    caution: event longitude delta is above 1 degree; do not promote this candidate without external fixtures.");
  }
}

console.log("");
console.log("Probe result: vector-based candidate calculation is executable.");
console.log("Next gate: compare against independent True/Osculating Node reference fixtures before any engine/type/UI/report integration.");
