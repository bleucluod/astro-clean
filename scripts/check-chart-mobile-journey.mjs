import { readFileSync } from "node:fs";

const form = readFileSync("components/ChartForm.tsx", "utf8");
const style = readFileSync("components/chart-form-journey.module.css", "utf8");
const page = readFileSync("app/chart/page.tsx", "utf8");
const errors = [];
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};

for (const step of ["name", "date", "time", "city"]) {
  expect(form.includes('data-chart-step="' + step + '"'), "Missing interactive step " + step);
  expect(form.includes('id="chart-journey-' + step + '"'), "Missing edit target for " + step);
  expect(form.includes('aria-controls="chart-journey-' + step + '"'), "Missing edit link for " + step);
  expect(form.includes('isCollapsedStep("' + step + '")'), "Missing validated collapse state " + step);
}

for (const marker of [
  "parseJalaliDateInput(getSelectedJalaliDateInput(dateParts)).ok",
  'birthTimeMode === "unknown"',
  "findHalleusCityByName(form.birthCity)",
  "chartProgress.steps.find((step) => !step.complete)",
  "openJourneyStep(firstIncomplete.id as ChartJourneyStepId)",
  "formRef.current?.requestSubmit()",
  "ref={mainSubmitRef}",
  "bounds.top > window.innerHeight - 96",
  "setShowStickyAction(!keyboardOpen",
  "createPortal(",
  "document.body,",
  'data-chart-sticky-action="mobile"',
  "window.visualViewport?.addEventListener",
  'window.matchMedia("(prefers-reduced-motion: reduce)")',
]) {
  expect(form.includes(marker), "Missing journey behavior: " + marker);
}

for (const marker of [
  "journeyRoot",
  "orbitTrack",
  "orbitComplete",
  "stepCollapsed",
  "stepSummary",
  "stickyBar",
  "stickyVisible",
  "position: fixed;",
  "transition: opacity 220ms ease",
  "@media (prefers-reduced-motion: reduce)",
]) {
  expect(style.includes(marker), "Missing journey presentation: " + marker);
}

expect(
  form.includes('comparisonMode ? "chart-reference-page"') &&
    form.includes("!comparisonMode && stickyPortalReady ? createPortal("),
  "Comparison mode must not mount the standalone journey",
);
expect((form.match(/<ChartSelect\b/g) ?? []).length === 8, "Date/time selects changed");
expect(form.includes('onSubmit={handleSubmit}'), "Birth form submit contract missing");
expect(form.includes("requestRealEngineReportData(normalizedForm, engineCity)"), "Engine bridge changed");
expect(form.includes("saveGeneratedReportWithAccountFallback("), "Persistence changed");
expect(form.includes('detail: "chart_complete"'), "Analytics completion changed");
expect(page.includes('data-chart-seo-landing="transactional-birth-chart"'), "Chart landing removed");
expect(page.includes('id="chart-report-details"'), "Editorial and report sample removed");
expect(!page.includes("تاریخ، ساعت و شهر تولدت را وارد کن و چارت شخصی خودت را با تفسیر فارسی ببین."), "Redundant hero instruction must be removed");
expect(page.includes("تاریخ، ساعت و شهر تولدت را وارد کن تا چارت تولد شخصی تو محاسبه شود."), "Existing SEO explanation below form missing");
const routeCss = readFileSync("app/chart/chart-shell.module.css", "utf8");
expect(routeCss.includes("HALLEUS_CHART_MOBILE_COMPACT_READABLE_20261114"), "Mobile spacing/contrast fix missing");
expect(routeCss.includes(".formPanel :global(.chart-time-title-row)"), "Time unknown control must remain inline");
expect(routeCss.includes("flex-direction: row !important;"), "Mobile time row must not stack");
expect(
  routeCss.includes("HALLEUS_CHART_COMPACT_DATE_TIME_20261114") &&
  routeCss.includes(".birth-date-picker-grid .chart-select-segment") &&
  routeCss.includes(".birth-time-picker-grid .chart-select-segment") &&
  routeCss.includes("grid-template-rows: auto 44px;") &&
  routeCss.includes("height: 44px !important;") &&
  routeCss.includes("font-size: 16px !important;"),
  "Mobile date/time must be compact with usable 44px touch targets and 16px text",
);
expect(style.includes("padding: 0 0 7px;") && style.includes("display: none;"), "Mobile progress spacing not tightened");
expect(
  style.includes(".journeyRoot.journeyRoot :global(.chart-form-progress)") &&
  /\.journeyRoot\.journeyRoot\s+:global\(\.chart-form-progress\)\s*\{[^}]*display:\s*none\s*!important;/.test(style),
  "Legacy progress must be hidden by a higher-specificity mobile rule",
);

if (errors.length > 0) {
  console.error("Chart mobile journey check failed:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("CHART_MOBILE_JOURNEY_CHECK=PASS");
  console.log("Four validated steps, editable summaries, sticky portal, and real submit preserved.");
}
