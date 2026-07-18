export const SKY_DAILY_CALCULATION_VERSION = "sky-daily-v1" as const;
export const SKY_DAILY_SOURCE = "astronomy-engine" as const;
export const SKY_DAILY_NEAR_STATION_SPEED_DEGREES_PER_DAY = 0.02;

export const SKY_DAILY_BODY_IDS = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
] as const;

export type SkyDailyBodyId = (typeof SKY_DAILY_BODY_IDS)[number];
export type SkyDailyZodiacSign =
  | "aries" | "taurus" | "gemini" | "cancer" | "leo" | "virgo"
  | "libra" | "scorpio" | "sagittarius" | "capricorn" | "aquarius" | "pisces";
export type SkyDailyMotionState = "direct" | "retrograde" | "stationing";
export type SkyDailyAspectKind = "conjunction" | "sextile" | "square" | "trine" | "opposition";
export type SkyDailyAspectPhase = "applying" | "separating" | "exact";
export type SkyDailyQualityFlag = "calculation_unavailable" | "partial_result" | "near_day_boundary" | "approximate_event_time";
export type SkyDailyErrorCode = "INVALID_INPUT" | "INVALID_TIMEZONE" | "SOURCE_UNAVAILABLE" | "CALCULATION_FAILED";

export type SkyDailyLocation = { latitude: number; longitude: number; elevationMeters?: number; label?: string };
export type SkyDailyInput = { localDate: string; timezone: string; location: SkyDailyLocation; calculationTimestamp?: string };
export type SkyDailyUtcWindow = { localDate: string; timezone: string; startUtc: string; endUtc: string };
export type SkyDailyPlanetaryState = {
  body: SkyDailyBodyId; longitude: number; sign: SkyDailyZodiacSign; degreeInSign: number;
  apparentSpeedDegreesPerDay: number; motion: SkyDailyMotionState; nearStation: boolean;
};
export type SkyDailyAspect = {
  kind: SkyDailyAspectKind; leftBody: SkyDailyBodyId; rightBody: SkyDailyBodyId;
  separation: number; orb: number; phase: SkyDailyAspectPhase; exactAt?: string;
};
export type SkyDailyIngressEvent = { type: "ingress"; body: SkyDailyBodyId; fromSign: SkyDailyZodiacSign; toSign: SkyDailyZodiacSign; occurredAt: string };
export type SkyDailyStationEvent = { type: "station"; body: SkyDailyBodyId; fromMotion: "direct" | "retrograde"; toMotion: "direct" | "retrograde"; occurredAt: string; approximate: boolean };
export type SkyDailyMoonPhase = { phaseAngle: number; illuminationFraction: number; phase: "new" | "waxing" | "full" | "waning" };
export type SkyDailyTimelineEvent = (SkyDailyIngressEvent | SkyDailyStationEvent | { type: "aspect"; aspect: SkyDailyAspect; occurredAt?: string }) & { priority: number };
export type SkyDailySnapshot = {
  id: string; input: SkyDailyInput; window: SkyDailyUtcWindow; generatedAt: string;
  source: typeof SKY_DAILY_SOURCE; calculationVersion: typeof SKY_DAILY_CALCULATION_VERSION;
  planetaryStates: SkyDailyPlanetaryState[]; moonPhase?: SkyDailyMoonPhase;
  aspects: SkyDailyAspect[]; timeline: SkyDailyTimelineEvent[]; qualityFlags: SkyDailyQualityFlag[];
  errors: Array<{ code: SkyDailyErrorCode; message: string }>;
};
