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

if (errors.length > 0) {
  console.error("Chart mobile journey check failed:");
  for (const error of errors) console.error("- " + error);
  process.exitCode = 1;
} else {
  console.log("CHART_MOBILE_JOURNEY_CHECK=PASS");
  console.log("Four validated steps, editable summaries, sticky portal, and real submit preserved.");
}
