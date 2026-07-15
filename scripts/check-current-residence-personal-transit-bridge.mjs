import fs from "node:fs";

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoMojibake(text, label) {
  for (const marker of [
    String.fromCharCode(0x00d8),
    String.fromCharCode(0x00d9),
    String.fromCharCode(0x00db),
    String.fromCharCode(0x00da),
    String.fromCharCode(0x00e2),
  ]) {
    assert(!text.includes(marker), `${label} contains mojibake marker ${marker.charCodeAt(0)}`);
  }
}

function assertNoForbiddenInference(text, label) {
  for (const marker of ["navigator.geolocation", "localStorage.getItem", "window.location"]) {
    assert(!text.includes(marker), `${label} must not infer current residence with ${marker}.`);
  }

  for (const marker of [
    "currentResidenceCity: form.birthCity",
    "currentResidencePlaceName: form.birthCity",
    "currentResidenceCity: normalizedForm.birthCity",
    "currentResidencePlaceName: normalizedForm.birthCity",
  ]) {
    assert(!text.includes(marker), `${label} must not use birth city as current residence fallback: ${marker}`);
  }
}

const chartForm = read("components/ChartForm.tsx");
const route = read("app/api/engine/real-chart/route.ts");
const service = read("lib/report-generation/report-generation-service.ts");
const astro = read("types/astro.ts");
const reportDetail = read("components/ReportDetail.tsx");
const packageJson = JSON.parse(read("package.json"));

for (const [label, text] of Object.entries({ chartForm, route, service, astro, reportDetail })) {
  assertNoMojibake(text, label);
  assert(!text.includes("data-report-app-shell-redesign"), `${label} must not reintroduce failed app-shell marker.`);
}

for (const [label, text] of Object.entries({ chartForm, route, service, astro })) {
  assertNoForbiddenInference(text, label);
}

for (const marker of [
  "currentResidenceCity?: string;",
  "currentResidenceCountry?: string;",
  "currentResidenceCityId?: string;",
  "currentResidenceLatitude?: number;",
  "currentResidenceLongitude?: number;",
  "currentResidenceTimezone?: string;",
]) {
  assert(astro.includes(marker), `BirthInput missing currentResidence field: ${marker}`);
}

for (const marker of [
  "CURRENT_RESIDENCE_LABEL",
  'const [currentResidenceCity, setCurrentResidenceCity] = useState("")',
  "const currentResidenceSuggestions = useMemo",
  "selectedCurrentResidenceCity",
  "currentResidencePlaceName: normalizedForm.currentResidenceCity",
  "currentResidenceLatitude: normalizedForm.currentResidenceLatitude",
  "currentResidenceLongitude: normalizedForm.currentResidenceLongitude",
  "currentResidenceTimezone: normalizedForm.currentResidenceTimezone",
  "selectCurrentResidenceCity(city)",
  "personalTransitReportData: engineData.personalTransitReportData ?? null",
]) {
  assert(chartForm.includes(marker), `ChartForm missing currentResidence bridge marker: ${marker}`);
}

for (const marker of [
  "currentResidenceCity:",
  "currentResidenceCountry:",
  "currentResidenceLatitude:",
  "currentResidenceLongitude:",
  "currentResidenceTimezone:",
  "contract.engineData.personalTransitReportData ?? null",
]) {
  assert(route.includes(marker), `real-chart route missing currentResidence/report marker: ${marker}`);
}

for (const marker of [
  "calculateNatalToTransitProbe",
  "buildPersonalTransitReportDataBridge",
  "const personalTransitReportData = buildPersonalTransitReportData",
  "personalTransitReportData,",
  "function buildCurrentResidenceInput",
  "countryCode: \"IR\"",
]) {
  assert(service.includes(marker), `report-generation service missing personal transit marker: ${marker}`);
}

assert(reportDetail.includes("engineData?.personalTransitReportData"), "ReportDetail must keep reading stored personalTransitReportData.");
assert(
  packageJson.scripts?.["check:current-residence-personal-transit-bridge"] ===
    "node scripts/check-current-residence-personal-transit-bridge.mjs",
  "package.json missing check:current-residence-personal-transit-bridge.",
);

console.log("Current residence personal transit bridge guard passed.");
