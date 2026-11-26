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
  "bounds.bottom <= 0",
  "setShowStickyAction(!keyboardOpen",
  "createPortal(",
  "createPortal(children, document.body)",
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
  form.includes('className={"chart-reference-page " + journeyStyles.journeyRoot}') &&
    /\{!comparisonMode\s*\?\s*\(\s*<ChartStickyPortal>/.test(form) &&
    form.includes("return ready ? createPortal(children, document.body) : null;"),
  "Both modes share the journey; comparison must not mount the standalone sticky action",
);
expect(
  form.includes('const [showStickyAction, setShowStickyAction] = useState(false);') &&
  form.includes("setShowStickyAction(!keyboardOpen && bounds.bottom <= 0);") &&
  !form.includes("bounds.top > window.innerHeight - 96") &&
  form.includes('window.addEventListener("scroll", update, { passive: true });') &&
  form.includes('window.addEventListener("resize", update);') &&
  form.includes('aria-hidden={!(showStickyAction && !isSubmitting && realEngineRequest.status === "idle")}'),
  "Mobile sticky action must start hidden and appear only after scrolling past the submit button");
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
  "Legacy birth dropdown grids must be hidden in shared mobile form styling",
);
for (const marker of [
  "MobileBirthDatePicker",
  "MobileBirthTimePicker",
  "onConfirm={applyMobileBirthDate}",
  "onConfirm={applyMobileBirthTime}",
  "type MobileDateParts",
  "type MobileTimeParts",
  ".wheelViewport, .chart-native-select, .chart-select-trigger",
  'birthTimeMode === "known" ? (',
]) {
  expect(form.includes(marker), "Shared picker bridge missing: " + marker);
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
  "chartDayWheelHint",
  "chartMonthWheelHint",
  "chartYearWheelHint",
  "chartHourWheelHint",
  "chartMinuteWheelHint",
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
  picker.includes('onPointerDown={(event) => {') &&
  picker.includes('onPointerMove={(event) => {') &&
  picker.includes('onPointerUp={(event) => {') &&
  picker.includes('onWheel={() => setWheelTouched(true)}') &&
  picker.includes('setWheelTouched(true);') &&
  picker.includes('wheelTouched ? " " + styles.wheelTouched') &&
  (pickerCss.match(/\.wheelViewport:not\(\.wheelTouched\)/g) ?? []).length === 5 &&
  pickerCss.includes("height: 52px;") &&
  pickerCss.includes("padding: 6px 0;") &&
  pickerCss.includes("height: 40px;") &&
  pickerCss.includes("background: var(--chart-bg, #050609);") &&
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
  form.includes('if (stepId === "date" || stepId === "time") return false;') &&
  form.includes('parts.hour && parts.minute ? parts.hour + ":" + parts.minute : ""') &&
  form.includes('onConfirm={applyMobileBirthDate}') &&
  form.includes('onConfirm={applyMobileBirthTime}') &&
  form.includes('".wheelViewport, .chart-native-select, .chart-select-trigger"'),
  "Keep date/time always visible in /chart and prevent partial time submissions");
expect(
  !/\.alwaysPicker\s*\{[^}]*position:\s*fixed/.test(pickerCss) &&
  !/\.wheelPicker\s*\{[^}]*position:\s*fixed/.test(pickerCss) &&
  !pickerCss.includes(".portal") && !pickerCss.includes(".inlinePanel") &&
  pickerCss.includes(".quickDialog {"),
  "Wheel layout must remain in document flow without overlays");

expect(
  !form.includes("chartDefaultJalaliBirthDateParts") &&
  !form.includes("chartDefaultBirthTimeParts") &&
  form.includes("} : initialForm);") &&
  form.includes("useState<JalaliBirthDateParts>(") &&
  form.includes("initialJalaliBirthDateParts,") &&
  form.includes(" : initialBirthTimeParts);") &&
  ["روز", "ماه", "سال", "ساعت", "دقیقه"].every((label) =>
    picker.includes('value: "", label: "' + label + '"')) &&
  !picker.includes('value: "", label: "—"'),
  "Birth date and time must start unselected with labeled first wheel items");
expect(
  pickerCss.includes("background: var(--chart-bg, #050609);") &&
  !pickerCss.includes("#111315") &&
  !pickerCss.includes("#191b1e") &&
  pickerCss.includes("rgba(5,6,9,.75)") &&
  routeCss.includes("--chart-bg: #050609;"),
  "Wheel backgrounds must use the existing Halleus chart background token");
expect(
  form.includes('className="chart-field-title-row chart-date-title-row"') &&
  routeCss.includes("HALLEUS_CHART_MOBILE_DATE_SWITCH_INLINE_20261114") &&
  routeCss.includes(".formPanel :global(.chart-date-title-row > .date-mode-switch)") &&
  routeCss.includes("width: auto !important;") &&
  routeCss.includes("grid-template-columns: repeat(2, minmax(53px, 1fr)) !important;") &&
  routeCss.includes("font-size: .68rem !important;"),
  "Calendar toggle must fit left of the birth-date title on mobile");
expect(
  pickerCss.includes("height: 52px;") &&
  pickerCss.includes("padding: 6px 0;") &&
  pickerCss.includes("top: calc(50% - 20px);") &&
  pickerCss.includes("height: 40px;") &&
  pickerCss.includes("box-shadow: none;"),
  "Only the selected 40px wheel row should be prominent inside the 52px viewport");
expect(style.includes("padding: 0 0 7px;") && style.includes("display: none;"), "Mobile progress spacing not tightened");
expect(picker.includes('role="spinbutton"') && picker.includes("onScroll={handleScroll}") &&
  picker.includes("TIME_WHEEL_HOURS") && picker.includes("TIME_WHEEL_MINUTES") &&
  !picker.includes("chooseMinute("), "iPhone-like time wheels must support touch scrolling and minute precision");
expect(form.includes("chart-residence-location") &&
  form.includes("journeyStyles.residenceOptional") &&
  form.indexOf('chart-residence-location " + journeyStyles.residenceField') > form.indexOf('id="chart-journey-city"') &&
  form.indexOf('chart-residence-location " + journeyStyles.residenceField') < form.indexOf('className="chart-form-actions"') &&
  form.includes("if (includeTransitReading)"), "Optional current-residence city must be visible after birth city and transit behavior preserved");
expect(
  form.includes(' : "نام خود را به فارسی وارد کنید"}') &&
  !form.includes('placeholder="نام فارسی خود را وارد کنید"') &&
  form.includes('const includeTransitReading = !comparisonMode && Boolean(currentResidenceCity.trim());') &&
  form.includes("if (includeTransitReading)") &&
  form.includes("CURRENT_RESIDENCE_NOT_FOUND_MESSAGE") &&
  form.includes("currentResidenceCityId: selectedCurrentResidenceCity.id") &&
  !form.includes("setIncludeTransitReading(") &&
  !form.includes("chart-optional-details") &&
  !form.includes("chart-transit-choice"),
  "Name placeholder and automatic current-city transit must replace the old toggle");
expect(
  routeCss.includes("HALLEUS_CHART_RESIDENCE_FIELD_MATCH_20261115") &&
  routeCss.includes(".formPanel :global(.chart-reference-page .chart-residence-location)") &&
  routeCss.includes(".formPanel :global(.chart-reference-page .chart-residence-location input)") &&
  routeCss.includes("height: 47px !important;") &&
  routeCss.includes("padding: 0 14px !important;") &&
  routeCss.includes("border-radius: 13px !important;"),
  "Residence input must match the birth-city dimensions without changing comparison");
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
