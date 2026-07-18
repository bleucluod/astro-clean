import { SKY_DAILY_BODY_IDS, type SkyDailyAspect, type SkyDailyAspectKind, type SkyDailyPlanetaryState, type SkyDailyUtcWindow } from "@/lib/sky-daily/sky-daily-contract";
import { calculateSkyDailyPlanetaryStates } from "@/lib/sky-daily/sky-daily-planetary";

export const SKY_DAILY_ASPECT_POLICY: ReadonlyArray<{ kind: SkyDailyAspectKind; angle: number; orb: number }> = [
  { kind: "conjunction", angle: 0, orb: 6 }, { kind: "sextile", angle: 60, orb: 4 },
  { kind: "square", angle: 90, orb: 5 }, { kind: "trine", angle: 120, orb: 5 }, { kind: "opposition", angle: 180, orb: 6 },
];

function separation(left: number, right: number) {
  const delta = Math.abs(left - right) % 360;
  return delta > 180 ? 360 - delta : delta;
}

function phase(currentOrb: number, futureOrb: number) {
  if (currentOrb <= 0.01) return "exact" as const;
  return futureOrb < currentOrb ? "applying" as const : "separating" as const;
}

function orbFor(states: SkyDailyPlanetaryState[], leftBody: SkyDailyAspect["leftBody"], rightBody: SkyDailyAspect["rightBody"], angle: number) {
  const left = states.find((state) => state.body === leftBody);
  const right = states.find((state) => state.body === rightBody);
  if (!left || !right) throw new Error("Sky daily aspect bodies are unavailable.");
  return Math.abs(separation(left.longitude, right.longitude) - angle);
}

function refineExactAt(window: SkyDailyUtcWindow, aspect: SkyDailyAspect) {
  const start = Date.parse(window.startUtc);
  const end = Date.parse(window.endUtc);
  const interval = 60 * 60 * 1000;
  let bestAt = start;
  let bestOrb = Number.POSITIVE_INFINITY;
  for (let timestamp = start; timestamp <= end; timestamp += interval) {
    const orb = orbFor(calculateSkyDailyPlanetaryStates(new Date(Math.min(timestamp, end))), aspect.leftBody, aspect.rightBody, SKY_DAILY_ASPECT_POLICY.find((policy) => policy.kind === aspect.kind)!.angle);
    if (orb < bestOrb) { bestOrb = orb; bestAt = Math.min(timestamp, end); }
  }
  let low = Math.max(start, bestAt - interval);
  let high = Math.min(end, bestAt + interval);
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const first = low + (high - low) / 3;
    const second = high - (high - low) / 3;
    const angle = SKY_DAILY_ASPECT_POLICY.find((policy) => policy.kind === aspect.kind)!.angle;
    if (orbFor(calculateSkyDailyPlanetaryStates(new Date(first)), aspect.leftBody, aspect.rightBody, angle) <= orbFor(calculateSkyDailyPlanetaryStates(new Date(second)), aspect.leftBody, aspect.rightBody, angle)) high = second;
    else low = first;
  }
  const occurredAt = new Date(Math.round((low + high) / 2));
  const angle = SKY_DAILY_ASPECT_POLICY.find((policy) => policy.kind === aspect.kind)!.angle;
  return orbFor(calculateSkyDailyPlanetaryStates(occurredAt), aspect.leftBody, aspect.rightBody, angle) <= 0.01 ? occurredAt.toISOString() : undefined;
}

function stateAt(cache: Map<number, SkyDailyPlanetaryState[]>, timestamp: number) {
  const cached = cache.get(timestamp);
  if (cached) return cached;
  const calculated = calculateSkyDailyPlanetaryStates(new Date(timestamp));
  cache.set(timestamp, calculated);
  return calculated;
}

export function detectSkyDailyExactAspects(window: SkyDailyUtcWindow): SkyDailyAspect[] {
  const start = Date.parse(window.startUtc);
  const end = Date.parse(window.endUtc);
  const interval = 60 * 60 * 1000;
  const cache = new Map<number, SkyDailyPlanetaryState[]>();
  const timestamps: number[] = [];
  for (let timestamp = start; timestamp < end; timestamp += interval) timestamps.push(timestamp);
  timestamps.push(end);
  const events: SkyDailyAspect[] = [];
  for (let leftIndex = 0; leftIndex < SKY_DAILY_BODY_IDS.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < SKY_DAILY_BODY_IDS.length; rightIndex += 1) {
      const leftBody = SKY_DAILY_BODY_IDS[leftIndex];
      const rightBody = SKY_DAILY_BODY_IDS[rightIndex];
      for (const policy of SKY_DAILY_ASPECT_POLICY) {
        let bestIndex = 0;
        let bestOrb = Number.POSITIVE_INFINITY;
        for (let index = 0; index < timestamps.length; index += 1) {
          const orb = orbFor(stateAt(cache, timestamps[index]), leftBody, rightBody, policy.angle);
          if (orb < bestOrb) { bestOrb = orb; bestIndex = index; }
        }
        if (bestIndex === 0 || bestIndex === timestamps.length - 1 || bestOrb > policy.orb) continue;
        let low = timestamps[bestIndex - 1];
        let high = timestamps[bestIndex + 1];
        for (let iteration = 0; iteration < 12; iteration += 1) {
          const first = low + (high - low) / 3;
          const second = high - (high - low) / 3;
          if (orbFor(stateAt(cache, Math.round(first)), leftBody, rightBody, policy.angle) <= orbFor(stateAt(cache, Math.round(second)), leftBody, rightBody, policy.angle)) high = first;
          else low = second;
        }
        const occurredAt = Math.round((low + high) / 2);
        const exactOrb = orbFor(stateAt(cache, occurredAt), leftBody, rightBody, policy.angle);
        if (exactOrb <= 0.01) events.push({ kind: policy.kind, leftBody, rightBody, separation: Number((policy.angle + exactOrb).toFixed(6)), orb: Number(exactOrb.toFixed(6)), phase: "exact", exactAt: new Date(occurredAt).toISOString() });
      }
    }
  }
  return events.sort((left, right) => left.exactAt!.localeCompare(right.exactAt!) || left.leftBody.localeCompare(right.leftBody) || left.rightBody.localeCompare(right.rightBody));
}

export function calculateSkyDailyAspects(current: SkyDailyPlanetaryState[], future: SkyDailyPlanetaryState[]): SkyDailyAspect[] {
  const futureByBody = new Map(future.map((state) => [state.body, state]));
  const aspects: SkyDailyAspect[] = [];
  for (let leftIndex = 0; leftIndex < current.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < current.length; rightIndex += 1) {
      const left = current[leftIndex]; const right = current[rightIndex];
      const nextLeft = futureByBody.get(left.body); const nextRight = futureByBody.get(right.body);
      if (!nextLeft || !nextRight) continue;
      const currentSeparation = separation(left.longitude, right.longitude);
      const futureSeparation = separation(nextLeft.longitude, nextRight.longitude);
      for (const policy of SKY_DAILY_ASPECT_POLICY) {
        const orb = Math.abs(currentSeparation - policy.angle);
        if (orb > policy.orb) continue;
        aspects.push({ kind: policy.kind, leftBody: left.body, rightBody: right.body, separation: Number(currentSeparation.toFixed(6)), orb: Number(orb.toFixed(6)), phase: phase(orb, Math.abs(futureSeparation - policy.angle)) });
      }
    }
  }
  return aspects.sort((left, right) => left.orb - right.orb || left.leftBody.localeCompare(right.leftBody) || left.rightBody.localeCompare(right.rightBody));
}

export function estimateSkyDailyAspectExactTimes(window: SkyDailyUtcWindow, aspects: SkyDailyAspect[]) {
  return aspects.map((aspect) => ({ ...aspect, exactAt: refineExactAt(window, aspect) }));
}
