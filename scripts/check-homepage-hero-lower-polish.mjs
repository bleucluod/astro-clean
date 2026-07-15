import { readFileSync } from "node:fs";

const home = readFileSync("app/page.tsx", "utf8");
const styles = readFileSync("app/home.module.css", "utf8");
const appShell = readFileSync("components/AppShell.tsx", "utf8");
const failures = [];

for (const marker of [
  "تو حاصل لحظه‌ای هستی که",
  "آسمان و زمین با هم داستانی نو نوشتند.",
  "styles.heroTitleLine",
  "ساخت چارت تولد",
]) {
  if (!home.includes(marker)) {
    failures.push(`Homepage hero polish marker missing: ${marker}`);
  }
}

for (const removedMarker of [
  "نقشهٔ واقعی زندگی تو، بر اساس آسمان لحظهٔ تولد",
  "const trustItems",
  "styles.trustSection",
  "دقت و اعتماد",
  "شروع ساخت گزارش",
  "SafetyDisclaimer",
  "styles.homeDisclaimer",
  "home-disclaimer-title",
  "پیش‌گویی",
  "پیشگویی",
  "پیش‌بینی",
  "پیش بینی",
]) {
  if (home.includes(removedMarker)) {
    failures.push(`Homepage still contains removed marker: ${removedMarker}`);
  }
}

const titleLineCount = (home.match(/styles\.heroTitleLine/g) ?? []).length;
if (titleLineCount !== 2) {
  failures.push(`Expected exactly two explicit hero title lines, found ${titleLineCount}`);
}

const primaryButtonCount = (home.match(/className=\{styles\.primaryButton\}/g) ?? []).length;
if (primaryButtonCount !== 1) {
  failures.push(`Expected only the hero primary button to remain, found ${primaryButtonCount}`);
}

for (const marker of [
  "padding: 10px 0 56px",
  "min-height: 560px",
  "font-size: clamp(1.2rem, 2vw, 1.75rem)",
  ".heroTitleLine",
  ".page .primaryButton:visited",
  "-webkit-text-fill-color: #fff",
]) {
  if (!styles.includes(marker)) {
    failures.push(`Homepage hero polish style missing: ${marker}`);
  }
}

if (!appShell.includes("برای خودشناسی نمادین")) {
  failures.push("AppShell must retain the shared footer disclaimer");
}

if (failures.length > 0) {
  console.error("Homepage hero and lower-page polish check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Homepage hero and lower-page polish check passed.");
console.log("- hero title is smaller, two-part, and uses the approved human copy");
console.log("- primary button text is explicitly white in all link states");
console.log("- homepage top spacing is reduced");
console.log("- test-like trust section and lower duplicate primary CTA are removed");
console.log("- reflection disclaimer stays in the shared footer instead of repeating in homepage body");
