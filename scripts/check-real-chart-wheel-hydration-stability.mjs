import fs from "node:fs";

const wheel = fs.readFileSync("components/RealChartWheel.tsx", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const projectContext = fs.readFileSync("docs/HALLEUS_PROJECT_CONTEXT.md", "utf8");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  wheel.includes("v0.1.264a-real-chart-wheel-hydration-stability"),
  "RealChartWheel must include the v0.1.264a hydration stability marker.",
);

assert(
  wheel.includes("function toHydrationStableWheelCoordinate(value: number): number"),
  "RealChartWheel must expose a hydration-stable coordinate helper.",
);

assert(
  wheel.includes("return Number(value.toFixed(4));"),
  "RealChartWheel coordinate helper must round SVG numbers to a stable fixed precision.",
);

assert(
  wheel.includes("x: toHydrationStableWheelCoordinate(200 + radius * Math.cos(angle))") &&
    wheel.includes("y: toHydrationStableWheelCoordinate(200 + radius * Math.sin(angle))"),
  "polarPoint must route both x and y through the hydration-stable coordinate helper.",
);

assert(
  !wheel.includes("x: 200 + radius * Math.cos(angle)") &&
    !wheel.includes("y: 200 + radius * Math.sin(angle)"),
  "polarPoint must not emit raw unrounded SVG coordinates.",
);

assert(
  pkg.scripts?.["check:real-chart-wheel-hydration-stability"] ===
    "node scripts/check-real-chart-wheel-hydration-stability.mjs",
  "package.json must expose check:real-chart-wheel-hydration-stability.",
);

assert(
  (pkg.scripts?.["check:project"] ?? "").includes("pnpm run check:real-chart-wheel-hydration-stability"),
  "check:project must include the RealChartWheel hydration stability guard.",
);

assert(
  (pkg.scripts?.["check:reports"] ?? "").includes("pnpm run check:real-chart-wheel-hydration-stability"),
  "check:reports must include the RealChartWheel hydration stability guard.",
);

assert(
  projectContext.includes("real chart wheel hydration stability"),
  "Project context must record the RealChartWheel hydration stability fix.",
);

console.log("RealChartWheel hydration stability guard passed.");
