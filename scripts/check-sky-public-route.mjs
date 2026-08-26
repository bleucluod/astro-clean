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
const skyStyles = read("app/sky/sky.module.css");
const editorialPage = read("components/FinalEditorialPage.tsx");
const wheel = read("components/SkyPublicWheel.tsx");
const cityPicker = read("components/SkyCityPicker.tsx");
const cityRoute = read("app/api/sky/cities/route.ts");
const sitemap = read("app/sitemap.ts");

requireAll("Public Sky page", page, [
  'alternates: { canonical: "/sky" }',
  "deliverSkyPublicSnapshot",
  "searchParams",
  "آسمان امروز",
  'includeSections={["sky-hero"]}',
  "SkyHeroLive",
  '"sky-hero": <SkyHeroLive result={result} />',
  "showControls={false}",
  '"@type": "FAQPage"',
]);
forbidAll("Public Sky page", page, ['"use client"', "buildSkyDailySnapshot", "birthTime", 'slotOnlySections={["sky-controls"]}', '"sky-controls":']);
requireAll("Public Sky archive day", archivePage, ["deliverSkyPublicSnapshot", "robots: { index: false", "params"]);
requireAll("Public Sky experience", experience, ["planetaryStates.map", "moonPhase", "snapshot.aspects", "snapshot.timeline", "SkyPublicWheel", "SkyHeroLive", "markerStyle", "data-sky-live-hero=\"moon-sun-aspect\"", "formatGregorianDate", "buildDailySummary", "buildHumanDailyGuide", "buildSignGuide", "buildSkyPublicReportInterpretation", "reportInterpretation.planetReadings", "reportInterpretation.aspectReadings", "SKY_SIGN_ENGLISH_LABELS", "showControls = true", "data-interpretation-source", "heroOrbit", "INITIAL_ASPECT_COUNT = 3", "dailyBrief", "dailyReasons", "selectedDateNote", "signGuideTitle", "signGuideGrid", "skyDetailsPanel", "planetItem", "moonEvents", "data-state", "خواندن سریع امروز", "ترنزیت‌های امروز برای هر نشان", "وضعیت سیارات امروز", "فاز ماه امروز", "سیارات برگشتی امروز", "رویداد بعدی", "رویدادی برای این روز نداریم", "remainingAspects", "قرارداد، خرید بزرگ"]);
forbidAll("Public Sky experience", experience, ["dateHref(", "روز قبل", "روز بعد", "نمایش {remainingAspects.length"]);
requireAll("Final editorial slot isolation", editorialPage, ["includeSections", "slotOnlySections", "slotOnly"]);
requireAll("Public Sky dark theme", skyStyles, ["--sky-bg: #050609", "--sky-surface: #0b0d11", "--sky-text: #fafafa", "--sky-muted: #d6d9de", "data-final-editorial-page=\"sky\"] p", "appearance: none", ".liveHeroSky", ".liveHeroMarker", "skyLiveWheelBreathe", "skyLiveMoonPulse", "skyWheelGlow", ".dailyBrief", ".dailyReasons", ".selectedDateNote", ".signGuideTitle", ".signGuideGrid", ".remainingAspects", ".skyDetailsPanel", "data-final-editorial-section=\"sky-hero\"", ".planetItem", ".relatedList", ".skyPage .cta a"]);
forbidAll("Public Sky dark theme", skyStyles.toLowerCase(), ["#263f96", "#654db5", "#6657bd", "#8170d9", "#dceaf8", "#f5ddd8", "#f3e8ce", "#ddefe6"]);
requireAll("Public Sky report interpretation", reportInterpretation, [
  "buildPlainPublicPlacementReading",
  "buildPlainPublicAspectReading",
  '"sky-public-plain-language"',
  "برای قرارداد، خرید بزرگ",
  "سمت سختش هم این است",
]);
forbidAll("Public Sky report interpretation", reportInterpretation, [
  "PLANET_SEMANTICS",
  "ASPECT_FORM_SEMANTICS",
  "possibleFriction:",
  "healthyExpression:",
  "موضوع این جایگاه",
]);
requireAll("Public Sky city picker", cityPicker, ["role=\"combobox\"", "aria-autocomplete=\"list\"", "/api/sky/cities", "initialCity"]);
requireAll("Public Sky city search", cityRoute, ["filterIranCities", "MAX_RESULTS", "Response.json"]);
forbidAll("Public Sky city picker", cityPicker, ["IRAN_CITY_OPTIONS", "navigator.geolocation"]);
requireAll("Public Sky wheel", wheel, [
  'import("@astrodraw/astrochart")',
  'COLOR_BACKGROUND: "#0B0D11"',
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
