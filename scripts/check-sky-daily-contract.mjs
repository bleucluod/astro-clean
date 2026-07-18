import { readFileSync } from "node:fs";
import * as ts from "typescript";

async function load(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output, "utf8").toString("base64")}`);
}

const { createSkyDailyUtcWindow } = await load("../lib/sky-daily/sky-daily-time.ts");
const { SKY_DAILY_BODY_IDS, SKY_DAILY_NEAR_STATION_SPEED_DEGREES_PER_DAY } = await load("../lib/sky-daily/sky-daily-contract.ts");
const motionEvents = readFileSync(new URL("../lib/sky-daily/sky-daily-motion-events.ts", import.meta.url), "utf8");
const aspects = readFileSync(new URL("../lib/sky-daily/sky-daily-aspects.ts", import.meta.url), "utf8");
const service = readFileSync(new URL("../lib/sky-daily/sky-daily-service.ts", import.meta.url), "utf8");

const tehran = createSkyDailyUtcWindow({ localDate: "2026-03-21", timezone: "Asia/Tehran" });
const newYork = createSkyDailyUtcWindow({ localDate: "2026-11-01", timezone: "America/New_York" });
if (SKY_DAILY_BODY_IDS.length !== 10 || !SKY_DAILY_BODY_IDS.includes("pluto")) throw new Error("Sky daily body contract is incomplete.");
if (!Number.isFinite(SKY_DAILY_NEAR_STATION_SPEED_DEGREES_PER_DAY) || SKY_DAILY_NEAR_STATION_SPEED_DEGREES_PER_DAY <= 0) throw new Error("Near-station threshold is invalid.");
if (Date.parse(tehran.endUtc) <= Date.parse(tehran.startUtc) || Date.parse(newYork.endUtc) <= Date.parse(newYork.startUtc)) throw new Error("Sky daily UTC window is invalid.");
if (JSON.stringify(tehran) !== JSON.stringify(createSkyDailyUtcWindow({ localDate: "2026-03-21", timezone: "Asia/Tehran" }))) throw new Error("Sky daily UTC window is not deterministic.");
for (const marker of ["SAMPLE_INTERVAL_MS", "REFINE_PRECISION_MS", "calculateBodyApparentMotion", "refineBoundary", "detectSkyDailyMotionEvents"]) {
  if (!motionEvents.includes(marker)) throw new Error(`Sky daily motion event contract is incomplete: ${marker}`);
}
for (const marker of ["conjunction", "sextile", "square", "trine", "opposition", "estimateSkyDailyAspectExactTimes", "detectSkyDailyExactAspects", "stateAt"] ) {
  if (!aspects.includes(marker)) throw new Error(`Sky daily aspect contract is incomplete: ${marker}`);
}
for (const marker of ["createSkyDailyUtcWindow", "detectSkyDailyMotionEvents", "estimateSkyDailyAspectExactTimes", "createHash"]) {
  if (!service.includes(marker)) throw new Error(`Sky daily snapshot contract is incomplete: ${marker}`);
}
console.log("Sky daily contract check passed.");
