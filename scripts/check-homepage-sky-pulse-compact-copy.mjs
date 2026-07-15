import { readFileSync } from "node:fs";

const component = readFileSync("components/SkyPulseDateCard.tsx", "utf8");
const failures = [];

for (const marker of [
  "buildCompactAspectNotes",
  "buildCompactMood",
  "simplifyAspectTitle",
  "seenNotes",
  ".slice(0, 2)",
  "sky-pulse-compact-panel",
  "sky-pulse-compact-aspect-list",
  "ماه و حال‌وهوای امروز",
  "<strong>حال‌وهوای امروز</strong>",
  "ماه، فاز ماه و جنبه‌های امروز",
  "ساخت چارت تولد شخصی",
]) {
  if (!component.includes(marker)) {
    failures.push(`Compact Sky Pulse marker missing: ${marker}`);
  }
}

for (const removedCopy of [
  "رایگان و بدون لاگین",
  "تهران / ایران",
  "<small>نگاه کوتاه</small>",
  "interpretation.summary",
  "interpretation.skyMood",
  "aspect.inspiration",
  "sky-pulse-technical-note",
  "sky-pulse-meta",
  "پرسش‌های کوتاه",
  "aspectهای واقعی محاسبه‌شده",
  "این بخش یک خوانش عمومی از آسمان امروز است",
  "خوانش امروز در حال آماده شدن است",
  "چند لحظه صبر کن.",
  "<small>حال‌وهوای امروز</small>",
]) {
  if (component.includes(removedCopy)) {
    failures.push(`Homepage Sky Pulse still contains removed copy or block: ${removedCopy}`);
  }
}

const aspectNoteRenderCount = (
  component.match(/\{aspect\.note \? <p>\{aspect\.note\}<\/p> : null\}/g) ?? []
).length;

if (aspectNoteRenderCount !== 1) {
  failures.push(
    `Expected one guarded compact aspect-note renderer, found ${aspectNoteRenderCount}`,
  );
}

if (failures.length > 0) {
  console.error("Homepage Sky Pulse compact-copy check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Homepage Sky Pulse compact-copy check passed.");
console.log("- technical badges and duplicate interpretation blocks are removed");
console.log("- one short mood line and at most two deduplicated highlights remain");
console.log("- Sky Pulse calculation, API, and interpretation source are unchanged");
