export const DEFAULT_CHART_TIMEZONE = "UTC" as const;

export const CORE_CHART_TIMEZONES = [
  "UTC",
  "Asia/Tehran",
  "Asia/Baku",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
] as const;

export type TimeZoneReadinessLevel = "ready" | "fallback" | "invalid";

export type TimeZoneSource = "explicit" | "fallback";

export type TimeInputPrecision = "date" | "minute";

export type ChartTimeInput = {
  date: string;
  time?: string | null;
  timezone?: string | null;
  placeName?: string | null;
};

export type ChartTimeContext = {
  date: string;
  time: string;
  localDateTime: string;
  timezone: string;
  timezoneSource: TimeZoneSource;
  readiness: TimeZoneReadinessLevel;
  precision: TimeInputPrecision;
  placeName: string | null;
  offsetLabel: string;
  warning: string | null;
};

export function isValidIanaTimeZone(timezone: string): boolean {
  if (timezone.length === 0 || timezone.trim() !== timezone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(
      new Date("2000-01-01T00:00:00.000Z"),
    );
    return true;
  } catch {
    return false;
  }
}

export function normalizeChartTimezone(
  timezone?: string | null,
  fallback: string = DEFAULT_CHART_TIMEZONE,
): string {
  const candidate = timezone?.trim();

  if (candidate && isValidIanaTimeZone(candidate)) {
    return candidate;
  }

  if (isValidIanaTimeZone(fallback)) {
    return fallback;
  }

  return DEFAULT_CHART_TIMEZONE;
}

export function getTimeInputPrecision(input: ChartTimeInput): TimeInputPrecision {
  return input.time?.trim() ? "minute" : "date";
}

export function buildLocalDateTime(input: ChartTimeInput): string {
  const date = normalizeIsoDate(input.date);
  const time = normalizeClockTime(input.time);

  return `${date}T${time}:00`;
}

export function getTimeZoneOffsetLabel(
  timezone: string,
  instant: Date = new Date("2000-01-01T00:00:00.000Z"),
): string {
  const safeTimezone = normalizeChartTimezone(timezone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimezone,
    timeZoneName: "shortOffset",
  }).formatToParts(instant);

  return parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT";
}

export function buildChartTimeContext(
  input: ChartTimeInput,
  fallbackTimezone: string = DEFAULT_CHART_TIMEZONE,
): ChartTimeContext {
  const date = normalizeIsoDate(input.date);
  const time = normalizeClockTime(input.time);
  const localDateTime = `${date}T${time}:00`;
  const requestedTimezone = input.timezone?.trim() ?? "";
  const hasExplicitTimezone = requestedTimezone.length > 0;
  const hasValidExplicitTimezone =
    hasExplicitTimezone && isValidIanaTimeZone(requestedTimezone);
  const timezone = hasValidExplicitTimezone
    ? requestedTimezone
    : normalizeChartTimezone(fallbackTimezone);
  const readiness = hasValidExplicitTimezone
    ? "ready"
    : hasExplicitTimezone
      ? "invalid"
      : "fallback";

  return {
    date,
    time,
    localDateTime,
    timezone,
    timezoneSource: hasValidExplicitTimezone ? "explicit" : "fallback",
    readiness,
    precision: getTimeInputPrecision(input),
    placeName: input.placeName?.trim() || null,
    offsetLabel: getTimeZoneOffsetLabel(timezone),
    warning: buildTimeZoneWarning(readiness, requestedTimezone, timezone),
  };
}

function buildTimeZoneWarning(
  readiness: TimeZoneReadinessLevel,
  requestedTimezone: string,
  fallbackTimezone: string,
): string | null {
  if (readiness === "ready") {
    return null;
  }

  if (readiness === "invalid") {
    return `Invalid timezone "${requestedTimezone}". Falling back to ${fallbackTimezone}.`;
  }

  return `No timezone provided. Falling back to ${fallbackTimezone}.`;
}

function normalizeIsoDate(date: string): string {
  const candidate = date.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    throw new TypeError(`Expected date in YYYY-MM-DD format. Received: ${date}`);
  }

  const parsed = new Date(`${candidate}T00:00:00.000Z`);
  const [year, month, day] = candidate.split("-").map(Number);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new TypeError(`Invalid calendar date. Received: ${date}`);
  }

  return candidate;
}

function normalizeClockTime(time?: string | null): string {
  const candidate = time?.trim() || "12:00";

  if (!/^\d{2}:\d{2}$/.test(candidate)) {
    throw new TypeError(`Expected time in HH:mm format. Received: ${time}`);
  }

  const [hour, minute] = candidate.split(":").map(Number);

  if (hour > 23 || minute > 59) {
    throw new TypeError(`Invalid clock time. Received: ${time}`);
  }

  return candidate;
}
