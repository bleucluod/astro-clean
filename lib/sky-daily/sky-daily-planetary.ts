import {
  calculateBodyApparentMotion,
  calculateBodyGeocentricLongitude,
  getAstronomyBody,
  getZodiacSignForLongitude,
  makeAstronomyTime,
  normalizeLongitude,
} from "@/src/lib/chart/real-chart-engine";
import {
  SKY_DAILY_BODY_IDS,
  SKY_DAILY_NEAR_STATION_SPEED_DEGREES_PER_DAY,
  type SkyDailyPlanetaryState,
} from "@/lib/sky-daily/sky-daily-contract";

function rounded(value: number, digits = 6) {
  return Number(value.toFixed(digits));
}

export function calculateSkyDailyPlanetaryStates(timestamp: Date): SkyDailyPlanetaryState[] {
  if (!Number.isFinite(timestamp.getTime())) throw new Error("Sky daily timestamp is invalid.");
  const astroTime = makeAstronomyTime(timestamp);
  return SKY_DAILY_BODY_IDS.map((body) => {
    const longitude = normalizeLongitude(calculateBodyGeocentricLongitude(getAstronomyBody(body), astroTime));
    const zodiac = getZodiacSignForLongitude(longitude);
    const motion = calculateBodyApparentMotion(getAstronomyBody(body), timestamp);
    const nearStation = body !== "sun" && body !== "moon" && Math.abs(motion.arcDegreesPerDay) <= SKY_DAILY_NEAR_STATION_SPEED_DEGREES_PER_DAY;
    return {
      body,
      longitude: rounded(longitude),
      sign: zodiac.signId as SkyDailyPlanetaryState["sign"],
      degreeInSign: rounded(zodiac.degreeInSign),
      apparentSpeedDegreesPerDay: rounded(motion.arcDegreesPerDay),
      motion: nearStation ? "stationing" : motion.status === "retrograde" ? "retrograde" : "direct",
      nearStation,
    };
  });
}
