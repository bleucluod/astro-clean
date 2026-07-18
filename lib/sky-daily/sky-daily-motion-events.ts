import {
  calculateBodyApparentMotion,
  calculateBodyGeocentricLongitude,
  getAstronomyBody,
  getZodiacSignForLongitude,
  makeAstronomyTime,
} from "@/src/lib/chart/real-chart-engine";
import {
  SKY_DAILY_BODY_IDS,
  type SkyDailyIngressEvent,
  type SkyDailyStationEvent,
  type SkyDailyUtcWindow,
} from "@/lib/sky-daily/sky-daily-contract";

const SAMPLE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const REFINE_PRECISION_MS = 60 * 1000;

function longitudeAt(bodyId: (typeof SKY_DAILY_BODY_IDS)[number], date: Date) {
  return calculateBodyGeocentricLongitude(getAstronomyBody(bodyId), makeAstronomyTime(date));
}

function signAt(bodyId: (typeof SKY_DAILY_BODY_IDS)[number], date: Date) {
  return getZodiacSignForLongitude(longitudeAt(bodyId, date)).signId;
}

function speedAt(bodyId: (typeof SKY_DAILY_BODY_IDS)[number], date: Date) {
  return calculateBodyApparentMotion(getAstronomyBody(bodyId), date).arcDegreesPerDay;
}

function refineBoundary(left: Date, right: Date, differs: (date: Date) => boolean) {
  let low = left.getTime();
  let high = right.getTime();
  while (high - low > REFINE_PRECISION_MS) {
    const middle = Math.floor((low + high) / 2);
    if (differs(new Date(middle))) high = middle;
    else low = middle;
  }
  return new Date(high).toISOString();
}

export function detectSkyDailyMotionEvents(window: SkyDailyUtcWindow): {
  ingresses: SkyDailyIngressEvent[];
  stations: SkyDailyStationEvent[];
} {
  const start = new Date(window.startUtc);
  const end = new Date(window.endUtc);
  const ingresses: SkyDailyIngressEvent[] = [];
  const stations: SkyDailyStationEvent[] = [];
  for (const body of SKY_DAILY_BODY_IDS) {
    let left = start;
    let leftSign = signAt(body, left);
    let leftSpeed = speedAt(body, left);
    for (let timestamp = start.getTime() + SAMPLE_INTERVAL_MS; ; timestamp += SAMPLE_INTERVAL_MS) {
      const right = new Date(Math.min(timestamp, end.getTime()));
      const rightSign = signAt(body, right);
      if (leftSign !== rightSign) {
        const occurredAt = refineBoundary(left, right, (date) => signAt(body, date) !== leftSign);
        ingresses.push({ type: "ingress", body, fromSign: leftSign as SkyDailyIngressEvent["fromSign"], toSign: rightSign as SkyDailyIngressEvent["toSign"], occurredAt });
      }
      const rightSpeed = speedAt(body, right);
      if (body !== "sun" && body !== "moon" && leftSpeed * rightSpeed < 0) {
        const occurredAt = refineBoundary(left, right, (date) => Math.sign(speedAt(body, date)) !== Math.sign(leftSpeed));
        stations.push({ type: "station", body, fromMotion: leftSpeed < 0 ? "retrograde" : "direct", toMotion: rightSpeed < 0 ? "retrograde" : "direct", occurredAt, approximate: true });
      }
      left = right; leftSign = rightSign; leftSpeed = rightSpeed;
      if (right.getTime() === end.getTime()) break;
    }
  }
  return { ingresses: ingresses.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.body.localeCompare(right.body)), stations: stations.sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.body.localeCompare(right.body)) };
}
