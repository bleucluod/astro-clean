import { readFileSync } from "node:fs";
function read(path) { return readFileSync(path, "utf8").replace(/\r\n/g, "\n"); }
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function includesAll(label, text, markers) { for (const marker of markers) assert(text.includes(marker), label + " missing marker: " + marker); }
function excludesAll(label, text, markers) { for (const marker of markers) assert(!text.includes(marker), label + " must not include marker: " + marker); }
const probe = read("src/lib/chart/natal-to-transit-calculation-probe.ts");
const contract = read("src/lib/chart/natal-to-transit-contract.ts");
const skyPulseRoute = read("app/api/sky-pulse/today/route.ts");
const packageJson = JSON.parse(read("package.json"));
includesAll("natal-to-transit calculation probe", probe, ["NATAL_TO_TRANSIT_CALCULATION_PROBE_VERSION", "v0.1.253-natal-to-transit-calculation-probe", "NATAL_TO_TRANSIT_MISSING_CURRENT_RESIDENCE_STATUS", "missing-current-residence", "calculateNatalToTransitProbe", "currentResidence", "currentResidencePlaceName", "birthPlaceName", "noSilentTehranDefaultForPersonalTransit: true", "Current residence is required for personal transit", "Shiraz", "Tehran", "runtimeApproval: false", "reportDataBridgeApproval: false", "visibleReportSectionApproval: false", "stage: \"calculation-probe\"", "conjunction: 0", "sextile: 60", "square: 90", "trine: 120", "opposition: 180"]);
excludesAll("natal-to-transit calculation probe", probe, ["fetch(", "axios", "swisseph", "sweph", "Swiss", "process.env", "calculateSkyPulseHomepageTransit", "buildPersonalTransitReportSection", "reportDataBridgeApproval: true", "visibleReportSectionApproval: true", "runtimeApproval: true", "countryCode?:"]);
includesAll("contract must preserve probe policy after v0.1.255", contract, ["personalTransitStage: \"user-visible\"", "currentResidenceCorrectionDone: true", "calculationProbeDone: true", "transitLocationSource: \"user-current-residence\"", "birth-place-for-natal-current-residence-for-transit", "noSilentTehranDefaultForPersonalTransit: true", "completedMilestone: \"v0.1.253-natal-to-transit-calculation-probe\"", "completedMilestone: \"v0.1.255-personal-transit-first-visible-report-section\""]);
excludesAll("Sky Pulse route must remain unchanged by personal transit", skyPulseRoute, ["natal-to-transit-calculation-probe", "calculateNatalToTransitProbe", "currentResidence", "birth-place-for-natal-current-residence-for-transit"]);
assert(packageJson.scripts?.["check:natal-to-transit-calculation-probe"] === "node scripts/check-natal-to-transit-calculation-probe.mjs", "package.json must expose check:natal-to-transit-calculation-probe.");
assert(packageJson.scripts?.["check:engine"]?.includes("pnpm run check:natal-to-transit-calculation-probe"), "check:engine must include the natal-to-transit calculation probe guard.");
if (failures.length > 0) { console.error("Natal-to-transit calculation probe guard failed:"); for (const failure of failures) console.error("- " + failure); process.exit(1); }
console.log("Natal-to-transit calculation probe guard passed.");
