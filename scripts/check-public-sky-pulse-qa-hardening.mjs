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
const component = read("components/HomepageLiveSky.tsx");
const page = read("app/page.tsx");
const transitSource = read("src/lib/chart/sky-only-transit-probe.ts");
const interpretation = read("lib/sky-pulse/sky-pulse-persian-interpretation.ts");
const packageJson = read("package.json");
const context = read("docs/HALLEUS_PROJECT_CONTEXT.md");
const ideaGarden = read("docs/HALLEUS_IDEA_GARDEN.md");

// Route/API hardening: public, request-time, no-store, real bridge, no personal transit.
assertIncludes(
  route,
  'export const dynamic = "force-dynamic"',
  "Public Sky Pulse route must stay dynamic instead of a stale static page.",
);
assertIncludes(
  route,
  "const now = new Date();",
  "Public Sky Pulse route must use request time and must not hardcode a daily claim.",
);
assertIncludes(
  route,
  "getTehranTransitLocalDate(now)",
  "Public Sky Pulse route must resolve the current Asia/Tehran local date.",
);
assertIncludes(
  route,
  "calculateSkyPulseHomepageTransit(localDate)",
  "Public Sky Pulse route must stay wired to the real sky-only transit bridge.",
);
assertIncludes(
  route,
  "buildSkyPulsePersianInterpretation(transit)",
  "Public Sky Pulse route must build Persian copy from the real transit result.",
);
assertIncludes(
  route,
  '"Cache-Control": "no-store, max-age=0"',
  "Public Sky Pulse route must not cache a fake/stale daily result.",
);
assertNotIncludes(route, "2026-07-09", "Public Sky Pulse route must not use the old fixed probe date.");
assertNotIncludes(route, "birth", "v0.1.251 must not start birth/natal route inputs.");
assertNotIncludes(route, "natal", "v0.1.251 must not start natal-to-transit route inputs.");
assertNotIncludes(route, "auth", "Public Sky Pulse route must remain no-login/free.");
assertNotIncludes(route, "account", "Public Sky Pulse route must not depend on accounts.");
assertNotIncludes(route, "payment", "Public Sky Pulse route must not start payment/premium work.");

// Transit source hardening: Tehran-only, public sky-only, approved route bridge, deferred personal scope.
assertIncludes(
  transitSource,
  'SKY_PULSE_HOMEPAGE_API_BRIDGE_MODE = "public-sky-only-daily-pulse-homepage"',
  "Transit bridge mode must remain public sky-only daily pulse for the homepage.",
);
assertIncludes(
  transitSource,
  "TRANSIT_RULES_TIME_POLICY.homepagePulseTimeZone",
  "Transit bridge must keep the approved Asia/Tehran timezone policy.",
);
assertIncludes(transitSource, "routeApproval: true", "Transit source must keep explicit route approval.");
assertIncludes(
  transitSource,
  "reportNarrativeApproval: TRANSIT_RULES_APPROVAL.reportTransitNarrative",
  "Sky-only public pulse must not silently approve report narrative transit.",
);
assertIncludes(
  transitSource,
  "Lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred special points.",
  "Public Sky Pulse hardening must keep deferred special points out of the public route.",
);

// Persian interpretation hardening: source-linked, SEO-aware, no fake/no scary/no deterministic copy.
assertIncludes(
  interpretation,
  'SKY_PULSE_PERSIAN_INTERPRETATION_MODE =\n  "public-sky-only-tehran-daily-interpretation"',
  "Persian interpretation must remain public sky-only Tehran daily copy.",
);
assertIncludes(
  interpretation,
  'source: "real-sky-only-transit-aspects"',
  "Persian interpretation must identify the real aspect source.",
);
assertIncludes(
  interpretation,
  "transit.aspects",
  "Persian interpretation must be generated from calculated aspects.",
);
assertIncludes(
  interpretation,
  "transit.bodies",
  "Persian interpretation must keep technical trust from calculated bodies.",
);
for (const phrase of [
  "آسمان امروز",
  "ترنزیت امروز",
  "ترنزیت روزانه",
  "وضعیت آسمان امروز",
  "حال و هوای آسمان امروز",
]) {
  assertIncludes(interpretation, phrase, `Persian SEO phrase must remain present: ${phrase}`);
}
assertIncludes(
  interpretation,
  "بدون متن ساختگی وقتی aspect معتبر وجود ندارد",
  "Persian interpretation must explicitly forbid fake copy when no valid aspect exists.",
);
assertIncludes(
  interpretation,
  "هنوز به چارت تولد شخصی وصل نشده است",
  "Public interpretation must not pretend to be personal natal-to-transit.",
);
assertNotIncludes(interpretation, "2026-07-09", "Persian copy must not hardcode the probe sample date.");
assertNotIncludes(interpretation, "نحس", "Persian copy must avoid scary/fatalistic wording.");
assertNotIncludes(interpretation, "شوم", "Persian copy must avoid scary/fatalistic wording.");
assertNotIncludes(interpretation, "سرنوشت", "Persian copy must avoid deterministic fate wording.");

// Homepage live-sky UI hardening: source-backed state, no fake daily claim, no account/payment drift.
assertIncludes(
  component,
  "resolveHomepageSkyState",
  "Homepage live-sky card must resolve the bounded public sky state.",
);
assertIncludes(
  component,
  "snapshot.planetaryStates",
  "Homepage live-sky card must render calculated planetary state.",
);
assertIncludes(
  component,
  "snapshot.moonPhase",
  "Homepage live-sky card must render calculated moon phase data.",
);
assertIncludes(
  component,
  "snapshot.timeline",
  "Homepage live-sky card must render source-backed timeline events.",
);
assertIncludes(
  component,
  'data-sky-state={state.status}',
  "Homepage live-sky card must expose its bounded delivery state.",
);
assertIncludes(
  component,
  "دادهٔ امروز آماده است",
  "Homepage live-sky card must distinguish current data from stale/unavailable data.",
);
assertIncludes(
  component,
  "هالیوس برای پرکردن این بخش دادهٔ ساختگی یا دادهٔ روز",
  "Homepage live-sky fallback must refuse fabricated replacement data.",
);
assertIncludes(
  component,
  "این داده با برچسب امروز نمایش داده نمی‌شود",
  "Homepage stale state must not masquerade as current-day data.",
);
assertIncludes(
  page,
  'import { HomepageLiveSky } from "@/components/HomepageLiveSky";',
  "Homepage must render through the current server-fed live-sky component.",
);
assertIncludes(
  page,
  "deliverSkyPublicSnapshot",
  "Homepage must keep its source-backed public sky delivery.",
);
assertIncludes(page, "آسمان امروز", "Homepage metadata/body must keep آسمان امروز wording.");
assertNotIncludes(component, "birthTime", "Homepage public sky UI must not add birth-time/personal transit inputs.");
assertNotIncludes(component, "payment", "Homepage public sky UI must not add payment/premium coupling.");
assertNotIncludes(component, "account", "Homepage public sky UI must not become account-gated.");

// Guard and roadmap sync.
assertIncludes(
  packageJson,
  '"check:public-sky-pulse-qa-hardening"',
  "package.json must expose the public Sky Pulse QA hardening guard.",
);
assertIncludes(
  packageJson,
  "check:public-sky-pulse-qa-hardening",
  "Engine check chain must include the public Sky Pulse QA hardening guard.",
);
assertIncludes(
  context,
  "Sky Pulse only when its transit source is verified and its claims remain bounded.",
  "Project context must keep the bounded verified-source Sky Pulse direction.",
);
assertIncludes(
  context,
  "Sky Pulse must not expand beyond verified transit/calculation sources.",
  "Project context must keep the verified-source expansion boundary.",
);
assertIncludes(
  ideaGarden,
  "Sky Pulse or personal timing may expand only with a verified calculation/source layer.",
  "Idea Garden must keep the verified calculation/source requirement.",
);
assertIncludes(
  ideaGarden,
  "retain only source-backed behavior",
  "Idea Garden must keep Sky Pulse source-backed behavior bounded.",
);

console.log("Public Sky Pulse QA hardening guard passed.");
