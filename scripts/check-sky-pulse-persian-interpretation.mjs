import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotIncludes(haystack, needle, message) {
  if (haystack.includes(needle)) {
    throw new Error(message);
  }
}

const route = read("app/api/sky-pulse/today/route.ts");
const interpretation = read("lib/sky-pulse/sky-pulse-persian-interpretation.ts");
const packageJson = read("package.json");
const context = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

assertIncludes(
  route,
  "buildSkyPulsePersianInterpretation(transit)",
  "Sky Pulse route must build Persian interpretation from the real transit result.",
);
assertIncludes(
  route,
  "interpretation,",
  "Sky Pulse route must expose interpretation inside the existing transit payload.",
);
assertIncludes(
  route,
  "calculateSkyPulseHomepageTransit(localDate)",
  "Sky Pulse interpretation must stay downstream of the real homepage transit bridge.",
);
assertNotIncludes(
  route,
  "birth",
  "v0.1.249 must not start birth/natal route handling.",
);
assertNotIncludes(
  route,
  "natal",
  "v0.1.249 must not start natal-to-transit route handling.",
);

assertIncludes(
  interpretation,
  'SKY_PULSE_PERSIAN_INTERPRETATION_VERSION =\n  "v0.1.249-sky-pulse-persian-interpretation"',
  "Persian interpretation version must be recorded.",
);
assertIncludes(
  interpretation,
  'source: "real-sky-only-transit-aspects"',
  "Interpretation must identify the real sky-only transit aspect source.",
);
assertIncludes(
  interpretation,
  "transit.aspects",
  "Interpretation must be generated from calculated transit aspects, not static daily copy.",
);
assertIncludes(
  interpretation,
  "transit.bodies",
  "Interpretation must use calculated body positions for technical trust copy.",
);
assertIncludes(
  interpretation,
  "آسمان امروز",
  "SEO phrase آسمان امروز must be present in the Persian layer.",
);
assertIncludes(
  interpretation,
  "ترنزیت امروز",
  "SEO phrase ترنزیت امروز must be present in the Persian layer.",
);
assertIncludes(
  interpretation,
  "ترنزیت روزانه",
  "SEO phrase ترنزیت روزانه must be present in the Persian layer.",
);
assertIncludes(
  interpretation,
  "حال و هوای آسمان امروز",
  "SEO phrase حال و هوای آسمان امروز must be present in the Persian layer.",
);
assertIncludes(
  interpretation,
  "بدون متن ساختگی وقتی aspect معتبر وجود ندارد",
  "Interpretation policy must forbid fake copy when no valid aspect exists.",
);
assertIncludes(
  interpretation,
  "هنوز به چارت تولد شخصی وصل نشده است",
  "Public interpretation must clearly avoid personal natal-to-transit claims.",
);
assertNotIncludes(
  interpretation,
  "2026-07-09",
  "Persian interpretation must not hardcode the old probe sample date.",
);
assertNotIncludes(
  interpretation,
  "user-location",
  "v0.1.249 must not add user-location behavior.",
);
assertNotIncludes(
  interpretation,
  "paid",
  "v0.1.249 must not start paid/private segmentation.",
);
assertNotIncludes(
  interpretation,
  "نحس",
  "Persian interpretation must avoid scary/fatalistic wording.",
);
assertNotIncludes(
  interpretation,
  "شوم",
  "Persian interpretation must avoid scary/fatalistic wording.",
);
assertNotIncludes(
  interpretation,
  "سرنوشت",
  "Persian interpretation must avoid deterministic fate wording.",
);

assertIncludes(
  packageJson,
  '"check:sky-pulse-persian-interpretation"',
  "package.json must expose the Sky Pulse Persian interpretation guard.",
);
assertIncludes(
  packageJson,
  "check:sky-pulse-persian-interpretation",
  "Engine check chain must include the Persian interpretation guard.",
);
assertIncludes(
  context,
  "v0.1.249 Sky Pulse Persian interpretation layer",
  "Project context must record v0.1.249.",
);
assertIncludes(
  ideaGarden,
  "v0.1.249 Sky Pulse Persian interpretation layer",
  "Idea Garden must stay synced for v0.1.249.",
);

console.log("Sky Pulse Persian interpretation guard passed.");
