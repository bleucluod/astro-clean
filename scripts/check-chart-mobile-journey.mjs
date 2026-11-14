import { readFileSync } from "node:fs";

const form = readFileSync("components/ChartForm.tsx", "utf8");
const style = readFileSync("components/chart-form-journey.module.css", "utf8");
const page = readFileSync("app/chart/page.tsx", "utf8");
const picker = readFileSync("components/ChartMobileBirthPicker.tsx", "utf8");
const pickerCss = readFileSync("components/chart-mobile-birth-picker.module.css", "utf8");
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
  routeCss.includes("HALLEUS_CHART_MOBILE_CUSTOM_PICKERS_20261114") &&
  routeCss.includes(".formPanel :global(.birth-date-picker-grid),") &&
  routeCss.includes(".formPanel :global(.birth-time-picker-grid) {") &&
  routeCss.includes("display: none !important;"),
  "Legacy birth dropdown grids must be hidden only on /chart mobile",
);
for (const marker of [
  "MobileBirthDatePicker",
  "MobileBirthTimePicker",
  "onConfirm={applyMobileBirthDate}",
  "onConfirm={applyMobileBirthTime}",
  "type MobileDateParts",
  "type MobileTimeParts",
  ".wheelViewport, .chart-native-select, .chart-select-trigger",
  '!comparisonMode && birthTimeMode === "known"',
]) {
  expect(form.includes(marker), "New chart-only picker bridge missing: " + marker);
}
for (const marker of [
  "HALLEUS_CHART_ALWAYS_VISIBLE_BIRTH_WHEELS_20261114",
  "export function MobileBirthDatePicker",
  "export function MobileBirthTimePicker",
  "data-chart-date-wheels",
  "data-chart-time-wheels",
  'role="spinbutton"',
  "DATE_WHEEL_ITEM_HEIGHT",
  "dayWheelOptions",
  "TIME_WHEEL_HOURS",
  "TIME_WHEEL_MINUTES",
  "validDate(mode, value, yearOptions)",
  'Number(next.day) > dayLimit(mode, next.year, next.month)',
  'onConfirm(next)',
  'onConfirm({ ...value, hour })',
  'onConfirm({ ...value, minute })',
  "parseJalaliDateInput(",
  "validGregorian(",
  "years.includes(parts.year)",
]) {
  expect(picker.includes(marker), "Always visible wheel behavior missing: " + marker);
}
for (const marker of [
  ".alwaysPicker { display: none; }",
  "@media (max-width: 760px)",
  ".wheelPicker",
  ".dateWheelPicker",
  ".timeWheelPicker",
  ".wheelViewport",
  ".wheelSelection",
  ".wheelRow",
  "scroll-snap-type: y mandatory;",
  "touch-action: pan-y;",
  "chartWheelScrollHint",
  "@media (prefers-reduced-motion: reduce)",
]) {
  expect(pickerCss.includes(marker), "Always visible wheel styling missing: " + marker);
}
expect(
  !picker.includes('<span className={styles.wheelLabel}>') &&
  !pickerCss.includes(".wheelLabel") &&
  (picker.match(/<DateWheel /g) ?? []).length === 5,
  "Date and time number wheels must have no heading row");
expect(
  picker.includes('onPointerDown={() => setWheelTouched(true)}') &&
  picker.includes('setWheelTouched(true);') &&
  picker.includes('wheelTouched ? " " + styles.wheelTouched') &&
  pickerCss.includes("animation: chartWheelScrollHint 4.6s ease-in-out infinite;") &&
  pickerCss.includes(".wheelTouched,") &&
  pickerCss.includes("@media (prefers-reduced-motion: reduce)"),
  "Wheel hint must animate subtly but stop after touch/keyboard and honor reduced motion");
expect(
  !picker.includes("createPortal(") &&
  !picker.includes("InlinePicker") &&
  !picker.includes("PickerSheet") &&
  !picker.includes("setOpen(") &&
  !picker.includes("onClick={openPicker}") &&
  !picker.includes("تأیید ساعت تولد") &&
  !picker.includes("تأیید تاریخ تولد") &&
  !picker.includes("type ReactNode"),
  "Date and time must render as permanently visible wheels without trigger, sheet or confirm");
expect(
  (picker.match(/<DateWheel /g) ?? []).length === 5 &&
  picker.includes('label="روز"') &&
  picker.includes('label="ماه"') &&
  picker.includes('label="سال"') &&
  picker.includes('label="ساعت"') &&
  picker.includes('label="دقیقه"'),
  "Three date wheels and two time wheels must be directly mounted");
expect(
  form.includes('if (!comparisonMode && (stepId === "date" || stepId === "time")) return false;') &&
  form.includes('parts.hour && parts.minute ? parts.hour + ":" + parts.minute : ""') &&
  form.includes('onConfirm={applyMobileBirthDate}') &&
  form.includes('onConfirm={applyMobileBirthTime}') &&
  form.includes('".wheelViewport, .chart-native-select, .chart-select-trigger"'),
  "Keep date/time always visible in /chart and prevent partial time submissions");
expect(
  !pickerCss.includes("position: fixed;") && !pickerCss.includes(".portal") &&
  !pickerCss.includes(".inlinePanel"),
  "Wheel layout must remain in document flow without overlays");

expect(style.includes("padding: 0 0 7px;") && style.includes("display: none;"), "Mobile progress spacing not tightened");
expect(picker.includes('role="spinbutton"') && picker.includes("onScroll={handleScroll}") &&
  picker.includes("TIME_WHEEL_HOURS") && picker.includes("TIME_WHEEL_MINUTES") &&
  !picker.includes("chooseMinute("), "iPhone-like time wheels must support touch scrolling and minute precision");
expect(form.includes("chart-residence-location") &&
  form.includes("journeyStyles.residenceOptional") &&
  form.indexOf('chart-residence-location " + journeyStyles.residenceField') > form.indexOf('id="chart-journey-city"') &&
  form.indexOf('chart-residence-location " + journeyStyles.residenceField') < form.indexOf('className="chart-optional-details"') &&
  form.includes("if (includeTransitReading)"), "Optional current-residence city must be visible after birth city and transit behavior preserved");
expect(style.includes(".residenceField") && style.includes(".residenceOptional"), "Residence layout styles missing");
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
  console.log("Four validated steps, always visible date/time wheels, safe partial time, sticky action, and real submit preserved.");
}
