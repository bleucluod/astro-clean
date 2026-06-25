import {
  DEFAULT_CHART_TIMEZONE,
  type ChartTimeInput,
  type TimeZoneReadinessLevel,
  buildChartTimeContext,
  isValidIanaTimeZone,
} from "./timezone-readiness";

export type TimeZoneReadinessFixture = {
  id: string;
  input: ChartTimeInput;
  expectedTimezone: string;
  expectedReadiness: TimeZoneReadinessLevel;
  expectedPrecision: "date" | "minute";
};

export const timezoneReadinessFixtures: TimeZoneReadinessFixture[] = [
  {
    id: "explicit-asia-tehran",
    input: {
      date: "1991-08-12",
      time: "09:30",
      timezone: "Asia/Tehran",
      placeName: "Tehran",
    },
    expectedTimezone: "Asia/Tehran",
    expectedReadiness: "ready",
    expectedPrecision: "minute",
  },
  {
    id: "explicit-asia-baku",
    input: {
      date: "1994-02-20",
      time: "22:10",
      timezone: "Asia/Baku",
      placeName: "Baku",
    },
    expectedTimezone: "Asia/Baku",
    expectedReadiness: "ready",
    expectedPrecision: "minute",
  },
  {
    id: "missing-timezone-fallback",
    input: {
      date: "2000-01-01",
      time: "00:00",
      placeName: "Unknown",
    },
    expectedTimezone: DEFAULT_CHART_TIMEZONE,
    expectedReadiness: "fallback",
    expectedPrecision: "minute",
  },
  {
    id: "missing-birth-time",
    input: {
      date: "2001-05-09",
      timezone: "Europe/London",
      placeName: "London",
    },
    expectedTimezone: "Europe/London",
    expectedReadiness: "ready",
    expectedPrecision: "date",
  },
  {
    id: "invalid-timezone",
    input: {
      date: "1988-11-30",
      time: "14:45",
      timezone: "Mars/Olympus",
      placeName: "Test place",
    },
    expectedTimezone: DEFAULT_CHART_TIMEZONE,
    expectedReadiness: "invalid",
    expectedPrecision: "minute",
  },
];

export function runTimezoneReadinessFixtures(): string[] {
  const failures: string[] = [];

  for (const fixture of timezoneReadinessFixtures) {
    const context = buildChartTimeContext(fixture.input);

    if (context.timezone !== fixture.expectedTimezone) {
      failures.push(
        `${fixture.id}: timezone ${context.timezone} !== ${fixture.expectedTimezone}`,
      );
    }

    if (context.readiness !== fixture.expectedReadiness) {
      failures.push(
        `${fixture.id}: readiness ${context.readiness} !== ${fixture.expectedReadiness}`,
      );
    }

    if (context.precision !== fixture.expectedPrecision) {
      failures.push(
        `${fixture.id}: precision ${context.precision} !== ${fixture.expectedPrecision}`,
      );
    }

    if (!isValidIanaTimeZone(context.timezone)) {
      failures.push(`${fixture.id}: normalized timezone is not valid`);
    }
  }

  return failures;
}
