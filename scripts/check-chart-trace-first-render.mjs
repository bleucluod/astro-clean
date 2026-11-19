import { readFileSync } from "node:fs";

const form = readFileSync("components/ChartForm.tsx", "utf8");
const picker = readFileSync("components/ChartMobileBirthPicker.tsx", "utf8");
const css = readFileSync("app/chart/chart-shell.module.css", "utf8");
const page = readFileSync("app/chart/page.tsx", "utf8");

const failures = [];
const requireMarker = (source, marker, label) => {
  if (!source.includes(marker)) failures.push(label);
};
const occurrences = (source, marker) => source.split(marker).length - 1;

for (const key of [
  "JALALI_YEAR_SELECT_OPTIONS",
  "GREGORIAN_YEAR_SELECT_OPTIONS",
  "JALALI_DAY_SELECT_OPTIONS",
  "TIME_HOUR_SELECT_OPTIONS",
  "TIME_MINUTE_SELECT_OPTIONS",
  "gregorianDaySelectOptions",
]) {
  requireMarker(form, "options={" + key + "}", "Cached dropdown missing: " + key);
}
requireMarker(form, "{isOpen ? options.map((option) => (", "Native select still mounts every hidden option at first paint");
requireMarker(form, "selectedOption ? (", "Hidden select lost selected-value fallback");
requireMarker(form, 'normalizeBirthForm(await ensureCityDirectory())', "Lazy city lookup was lost");
requireMarker(form, 'const realEngineResult = await requestRealEngineReportData(normalizedForm, engineCity)', "Chart submit path changed");
requireMarker(form, 'detail: "chart_start"', "Chart-start analytics path changed");
requireMarker(form, 'detail: "chart_complete"', "Chart-complete analytics path changed");
if (occurrences(picker, "{quickOpen ? (") !== 2) {
  failures.push("Birth date and time dialogs must mount only when opened");
}
requireMarker(picker, "dialog.showModal()", "Birth picker dialog interaction removed");
requireMarker(css, "HALLEUS_CHART_TRACE_OFFSCREEN_RENDER_V1", "Scoped offscreen rule missing");
requireMarker(css, ".page > .education[data-chart-section]", "Offscreen rule must target chart informational sections only");
requireMarker(css, "content-visibility: auto;", "Offscreen rendering not enabled");
requireMarker(css, "@media print", "Print fallback missing");
requireMarker(css, "content-visibility: visible;", "Print content no longer guaranteed");
for (const marker of ['data-chart-section="calculation"', 'data-chart-section="unknown-time"', 'data-chart-section="personal-report"', 'data-chart-section="faq"']) {
  requireMarker(page, marker, "Required editorial section missing: " + marker);
}
if (css.includes(".page > .workspace[data-chart-section]") || css.includes(".page > .formPanel[data-chart-section]")) {
  failures.push("Interactive form must never receive content-visibility containment");
}
if (failures.length) {
  console.error("Chart first-render performance guard failed:");
  for (const message of failures) console.error("- " + message);
  process.exitCode = 1;
} else {
  console.log("Chart first-render performance guard passed.");
  console.log("CHART_TRACE_FIRST_RENDER=PASS");
}
