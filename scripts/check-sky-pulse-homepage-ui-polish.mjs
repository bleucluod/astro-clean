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

const component = read("components/SkyPulseDateCard.tsx");
const page = read("app/page.tsx");
const route = read("app/api/sky-pulse/today/route.ts");
const packageJson = read("package.json");
const context = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

assertIncludes(
  component,
  "SkyPulsePersianInterpretationLayer",
  "Homepage Sky Pulse card must type the v0.1.249 Persian interpretation payload.",
);
assertIncludes(
  component,
  "data?.transit?.interpretation",
  "Homepage Sky Pulse card must read interpretation from the existing API transit payload.",
);
assertIncludes(
  component,
  "interpretation.summary",
  "Homepage UI must expose the Persian interpretation summary.",
);
assertIncludes(
  component,
  "interpretation.skyMood",
  "Homepage UI must expose حال و هوای آسمان امروز.",
);
assertIncludes(
  component,
  "interpretation?.primaryAspects",
  "Homepage UI must render calculated primary aspects when available.",
);
assertIncludes(
  component,
  "interpretation.technicalTrustNote",
  "Homepage UI must keep technical trust copy visible.",
);
assertIncludes(
  component,
  "interpretation.publicScopeNote",
  "Homepage UI must keep public/free/no-login sky-only scope visible.",
);
assertIncludes(
  component,
  "بدون جنبه اصلی نزدیک",
  "Homepage UI must show a no-fake-copy state when no aspect is available.",
);
assertIncludes(
  component,
  "رایگان و بدون لاگین",
  "Homepage UI must keep the free/no-login Sky Pulse scope visible.",
);
assertIncludes(
  component,
  "تهران / ایران",
  "Homepage UI must keep Tehran/Iran-only scope visible.",
);
assertIncludes(
  page,
  "آسمان امروز",
  "Homepage copy must align with public Sky Pulse SEO wording.",
);
assertIncludes(
  page,
  "ترنزیت روزانه تهران",
  "Homepage copy must present the visible public daily transit layer.",
);
assertIncludes(
  route,
  "interpretation,",
  "v0.1.250 must preserve the existing API interpretation shape.",
);
assertNotIncludes(
  component,
  'new Date(\"2026-07-09\")',
  "Homepage UI must not hardcode an old daily date.",
);
assertNotIncludes(
  component,
  "birthTime",
  "v0.1.250 must not start personal natal-to-transit UI.",
);
assertNotIncludes(
  component,
  "payment",
  "v0.1.250 must not start payment/premium UI.",
);
assertIncludes(
  packageJson,
  '"check:sky-pulse-homepage-ui-polish"',
  "package.json must expose the Homepage Sky Pulse UI polish guard.",
);
assertIncludes(
  packageJson,
  "check:sky-pulse-homepage-ui-polish",
  "Engine check chain must include the Homepage Sky Pulse UI polish guard.",
);
assertIncludes(
  context,
  "v0.1.250 Homepage Sky Pulse UI polish",
  "Project context must record v0.1.250.",
);
assertIncludes(
  ideaGarden,
  "v0.1.250 Homepage Sky Pulse UI polish",
  "Idea Garden must stay synced for v0.1.250.",
);

console.log("Homepage Sky Pulse UI polish guard passed.");
