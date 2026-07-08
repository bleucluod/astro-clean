import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotIncludes(haystack, needle, message) {
  if (haystack.includes(needle)) {
    throw new Error(message);
  }
}

const route = read("app/api/sky-pulse/today/route.ts");
const probe = read("src/lib/chart/sky-only-transit-probe.ts");
const packageJson = read("package.json");

assertIncludes(
  route,
  "calculateSkyPulseHomepageTransit",
  "Sky Pulse today route must call the real homepage transit bridge.",
);
assertIncludes(
  route,
  "getTehranTransitLocalDate",
  "Sky Pulse today route must resolve the Asia/Tehran local date explicitly.",
);
assertIncludes(
  route,
  "@/src/lib/chart/sky-only-transit-probe",
  "Sky Pulse today route must be wired to the sky-only transit probe source.",
);
assertIncludes(
  route,
  "const now = new Date();",
  "Sky Pulse today route must use the request-time date instead of a hardcoded day.",
);
assertIncludes(
  route,
  "transit",
  "Sky Pulse today route must expose transit data while preserving the existing UI shape.",
);
assertNotIncludes(
  route,
  'calculateSkyOnlyTransitProbe("2026-07-09")',
  "Sky Pulse today route must not use the v0.1.247 fixed probe sample date.",
);
assertNotIncludes(
  route,
  "birth",
  "Sky Pulse public route must not start natal-to-transit work in v0.1.248.",
);
assertNotIncludes(
  route,
  "natal",
  "Sky Pulse public route must not start natal-to-transit work in v0.1.248.",
);

assertIncludes(
  probe,
  'SKY_PULSE_HOMEPAGE_API_BRIDGE_VERSION = "v0.1.248-sky-pulse-homepage-api-bridge"',
  "Homepage API bridge version must be recorded in the transit source file.",
);
assertIncludes(
  probe,
  'SKY_PULSE_HOMEPAGE_API_BRIDGE_MODE = "public-sky-only-daily-pulse-homepage"',
  "Homepage API bridge mode must stay public sky-only, not personal natal-to-transit.",
);
assertIncludes(
  probe,
  "export function calculateSkyPulseHomepageTransit",
  "Transit source must export the homepage bridge function.",
);
assertIncludes(
  probe,
  "export function getTehranTransitLocalDate",
  "Transit source must export the Tehran local-date helper.",
);
assertIncludes(
  probe,
  "TRANSIT_RULES_TIME_POLICY.homepagePulseTimeZone",
  "Homepage bridge must keep the contract timezone instead of inventing a location default.",
);
assertIncludes(
  probe,
  "routeApproval: true",
  "Homepage bridge must explicitly mark the route bridge approval for v0.1.248.",
);
assertIncludes(
  packageJson,
  '"check:sky-pulse-homepage-api-bridge"',
  "package.json must expose the Sky Pulse homepage API bridge guard.",
);

console.log("Sky Pulse homepage API bridge guard passed.");
