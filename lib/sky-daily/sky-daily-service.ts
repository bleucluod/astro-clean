import { createHash } from "node:crypto";
import {
  SKY_DAILY_CALCULATION_VERSION, SKY_DAILY_SOURCE,
  type SkyDailyInput, type SkyDailySnapshot,
} from "@/lib/sky-daily/sky-daily-contract";
import { calculateSkyDailyAspects, detectSkyDailyExactAspects, estimateSkyDailyAspectExactTimes } from "@/lib/sky-daily/sky-daily-aspects";
import { detectSkyDailyMotionEvents } from "@/lib/sky-daily/sky-daily-motion-events";
import { calculateSkyDailyPlanetaryStates } from "@/lib/sky-daily/sky-daily-planetary";
import { buildSkyDailyTimeline } from "@/lib/sky-daily/sky-daily-timeline";
import { createSkyDailyUtcWindow } from "@/lib/sky-daily/sky-daily-time";

function validateInput(input: SkyDailyInput) {
  if (!Number.isFinite(input.location.latitude) || Math.abs(input.location.latitude) > 90 || !Number.isFinite(input.location.longitude) || Math.abs(input.location.longitude) > 180) throw new Error("Sky daily location is invalid.");
}

export function buildSkyDailySnapshot(input: SkyDailyInput): SkyDailySnapshot {
  validateInput(input);
  const window = createSkyDailyUtcWindow(input);
  const start = new Date(window.startUtc); const end = new Date(window.endUtc);
  const calculationDate = input.calculationTimestamp ? new Date(input.calculationTimestamp) : new Date((start.getTime() + end.getTime()) / 2);
  if (!Number.isFinite(calculationDate.getTime())) throw new Error("Sky daily calculation timestamp is invalid.");
  if (calculationDate < start || calculationDate >= end) throw new Error("Sky daily calculation timestamp is outside the requested day.");
  const planetaryStates = calculateSkyDailyPlanetaryStates(calculationDate);
  const aspects = estimateSkyDailyAspectExactTimes(window, calculateSkyDailyAspects(planetaryStates, calculateSkyDailyPlanetaryStates(new Date(calculationDate.getTime() + 6 * 60 * 60 * 1000))));
  const dailyExactAspects = detectSkyDailyExactAspects(window);
  const motionEvents = detectSkyDailyMotionEvents(window);
  const sun = planetaryStates.find((state) => state.body === "sun"); const moon = planetaryStates.find((state) => state.body === "moon");
  if (!sun || !moon) throw new Error("Sky daily luminary calculation failed.");
  const phaseAngle = ((moon.longitude - sun.longitude) % 360 + 360) % 360;
  const moonPhase = { phaseAngle: Number(phaseAngle.toFixed(6)), illuminationFraction: Number(((1 - Math.cos(phaseAngle * Math.PI / 180)) / 2).toFixed(6)), phase: phaseAngle < 45 || phaseAngle >= 315 ? "new" as const : phaseAngle < 135 ? "waxing" as const : phaseAngle < 225 ? "full" as const : "waning" as const };
  const timeline = buildSkyDailyTimeline({ ingresses: motionEvents.ingresses.map((event) => ({ ...event, priority: 50 })), stations: motionEvents.stations.map((event) => ({ ...event, priority: 40 })), aspects: dailyExactAspects });
  const id = createHash("sha256").update(JSON.stringify({ input, window, calculationVersion: SKY_DAILY_CALCULATION_VERSION }), "utf8").digest("hex");
  return { id, input, window, generatedAt: calculationDate.toISOString(), source: SKY_DAILY_SOURCE, calculationVersion: SKY_DAILY_CALCULATION_VERSION, planetaryStates, moonPhase, aspects, timeline, qualityFlags: motionEvents.stations.length ? ["approximate_event_time"] : [], errors: [] };
}
