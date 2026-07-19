import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

function requireAll(label, source, markers) {
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${label} is missing: ${marker}`);
  }
}

function forbidAll(label, source, markers) {
  for (const marker of markers) {
    if (source.includes(marker)) throw new Error(`${label} contains forbidden scope: ${marker}`);
  }
}

const page = read("app/sky/page.tsx");
const archivePage = read("app/sky/[date]/page.tsx");
const delivery = read("lib/sky-public/sky-public-delivery.ts");
const reportInterpretation = read("lib/sky-public/sky-public-report-interpretation.ts");
const experience = read("components/SkyPublicExperience.tsx");
const wheel = read("components/SkyPublicWheel.tsx");
const cityPicker = read("components/SkyCityPicker.tsx");
const cityRoute = read("app/api/sky/cities/route.ts");
const sitemap = read("app/sitemap.ts");

requireAll("Public Sky page", page, [
  'alternates: { canonical: "/sky" }',
  "deliverSkyPublicSnapshot",
  "searchParams",
  "آسمان امروز",
]);
forbidAll("Public Sky page", page, ['"use client"', "buildSkyDailySnapshot", "birthTime"]);
requireAll("Public Sky archive day", archivePage, ["deliverSkyPublicSnapshot", "robots: { index: false", "params"]);
requireAll("Public Sky experience", experience, ["planetaryStates.map", "moonPhase", "snapshot.aspects", "snapshot.timeline", "SkyPublicWheel", "formatGregorianDate", "buildDailySummary", "buildSkyPublicReportInterpretation", "reportInterpretation.planetReadings", "reportInterpretation.aspectReadings", "data-interpretation-source", "heroOrbit", "INITIAL_ASPECT_COUNT", "moonEvents", "data-state"]);
requireAll("Public Sky report interpretation", reportInterpretation, [
  "buildPlainDailyPlacementInterpretation",
  "buildPlainDailyAspectInterpretation",
  '"report-behavioral-interpretation"',
]);
forbidAll("Public Sky report interpretation", reportInterpretation, [
  "PLANET_SEMANTICS",
  "ASPECT_FORM_SEMANTICS",
  "possibleFriction:",
  "healthyExpression:",
]);
requireAll("Public Sky city picker", cityPicker, ["role=\"combobox\"", "aria-autocomplete=\"list\"", "/api/sky/cities", "initialCity"]);
requireAll("Public Sky city search", cityRoute, ["filterIranCities", "MAX_RESULTS", "Response.json"]);
forbidAll("Public Sky city picker", cityPicker, ["IRAN_CITY_OPTIONS", "navigator.geolocation"]);
requireAll("Public Sky wheel", wheel, [
  'import("@astrodraw/astrochart")',
  "planetaryStates",
  "snapshot.aspects",
  "removeNatalOnlyLayers",
  "حرکت برگشتی:",
]);
forbidAll("Public Sky wheel", wheel, ["ascendant", "midheaven", "birthTime"]);

requireAll("Public Sky delivery", delivery, [
  "unstable_cache",
  "findIranCityByName",
  "buildSkyDailySnapshot",
  'cachePolicy: "daily-data-cache"',
  "revalidate: 86_400",
  "requestedDate !== currentLocalDate",
]);
forbidAll("Public Sky delivery", delivery, ["report-generation", "natal", "personalTransit", "fallbackSnapshot"]);

if (sitemap.includes('"/sky"')) {
  throw new Error("Public Sky must not enter the sitemap before the discovery batch.");
}

console.log("Public Sky route and snapshot delivery check passed.");
