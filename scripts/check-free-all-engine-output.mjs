import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const assert = (condition, message) => {
  if (!condition) {
    console.error("FREE_ALL_ENGINE_OUTPUT_FAIL " + message);
    process.exitCode = 1;
  }
};

const reader = read("components/report/ReportProductReader.tsx");
const technical = read("components/report/ReportTechnicalAppendix.tsx");
const planner = read("lib/astrology/adaptive-report-planner.ts");
const generation = read("lib/report-generation/report-generation-service.ts");
const transit = read("src/lib/report-output/personal-transit-report-data-bridge.ts");
const astro = read("types/astro.ts");

assert(
  reader.includes("HALLEUS_FREE_ALL_SERVER_SEED_STICKY_20260815") &&
    reader.includes('productAccess.status === "unavailable"'),
  "server-seeded FREE_ALL must survive client entitlement unavailability",
);
assert(
  reader.includes("<HumanTransitReading data={transitData} exhaustive={freeAllAccess} />") &&
    reader.includes("getVisibleTransitAspects(data, exhaustive)"),
  "FREE_ALL must render the complete stored transit-aspect inventory",
);
assert(
  reader.includes("HALLEUS_FREE_ALL_TECHNICAL_APPENDIX_EXHAUSTIVE_R4_20260815") &&
    /<ReportTechnicalAppendix[\s\S]*?exhaustive=\{freeAllAccess\}[\s\S]*?report=\{report\}[\s\S]*?\/>/.test(reader) &&
    technical.includes('data-free-all-engine-output={exhaustive ? "all" : "configured"}') &&
    technical.includes('data-engine-output-completeness="free-all"'),
  "FREE_ALL must explicitly wire exhaustive mode into the complete engine-output technical surface",
);
assert(
  technical.includes("placement.motion.arcDegreesPerDay") &&
    astro.includes("arcDegreesPerDay: number") &&
    generation.includes("motion: placement.motion"),
  "per-planet motion calculations must persist and render",
);
assert(
  planner.includes("HALLEUS_FREE_ALL_ALL_OCCUPIED_HOUSES_20260815") &&
    planner.includes("HALLEUS_FREE_ALL_ALL_NARRATIVE_ASPECTS_20260815") &&
    planner.includes("HALLEUS_FREE_ALL_ALL_PLANET_STORIES_20260815"),
  "premium/FREE_ALL narrative must no longer truncate occupied houses, narrative aspects, or planet stories",
);
assert(
  !transit.includes("probeResult.aspects.slice(0, 8)") &&
    transit.includes("HALLEUS_FREE_ALL_TRANSIT_FULL_INVENTORY_20260815"),
  "transit bridge must persist every calculated probe aspect",
);
assert(
  transit.includes("HALLEUS_FREE_ALL_TRANSIT_BODY_INVENTORY_20260815") &&
    transit.includes("probeResult.bodies.transit.map") &&
    transit.includes("separation: roundToTwo(aspect.separation)"),
  "transit bridge must persist every calculated transit/natal body and full aspect geometry",
);
assert(
  reader.includes('data-personal-transit-engine-inventory="all"') &&
    technical.includes('data-technical-table="engine-output"') &&
    technical.includes("chartData.placements.map") &&
    technical.includes("Object.values(chartData.angles).map") &&
    technical.includes("chartData.houses.map") &&
    technical.includes("chartData.aspects.map"),
  "FREE_ALL must render exhaustive natal and transit engine inventories",
);
assert(
  technical.includes("chartData.lunarNodes") &&
    technical.includes("chartData.lilith") &&
    technical.includes("chartData.retrogrades") &&
    technical.includes("chartData.chartSignature") &&
    technical.includes("chartData.calculationQuality") &&
    technical.includes("chartData.houseContext"),
  "engine output surface must include nodes, Lilith, retrogrades, signature, quality, and house context",
);

if (!process.exitCode) {
  console.log("HALLEUS_FREE_ALL_ENGINE_OUTPUT=PASS");
}
