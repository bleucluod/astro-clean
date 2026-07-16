import type {
  WikiArticleSnapshot,
  WikiScheduleSettings,
} from "@/lib/wiki/wiki-cms-types";

function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

function dateKey(parts: { year: number; month: number; day: number }) {
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function zonedDateTimeToUtc(key: string, time: string, timezone: string) {
  const [year, month, day] = key.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desired;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const actual = zonedParts(new Date(guess), timezone);
    const actualAsUtc = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    guess += desired - actualAsUtc;
  }
  return new Date(guess);
}

function addCalendarDays(key: string, amount: number) {
  const [year, month, day] = key.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return dateKey({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() });
}

function weekdayForKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function weekKey(key: string) {
  const weekday = weekdayForKey(key);
  const daysSinceSaturday = (weekday + 1) % 7;
  return addCalendarDays(key, -daysSinceSaturday);
}

export function sortWikiArticlesForPublishing(
  articles: WikiArticleSnapshot[],
  pillarBeforeSupport: boolean,
) {
  const byId = new Map(articles.map((article) => [article.stableId, article]));
  const remaining = new Map(articles.map((article) => [article.stableId, article]));
  const output: WikiArticleSnapshot[] = [];
  while (remaining.size) {
    const ready = [...remaining.values()].filter((article) =>
      article.relatedArticleIds.every((dependency) => !byId.has(dependency) || !remaining.has(dependency)),
    );
    if (!ready.length) {
      throw new Error("Wiki package dependency graph contains a cycle.");
    }
    ready.sort((left, right) => {
      if (pillarBeforeSupport && left.articleRole !== right.articleRole) {
        return left.articleRole === "pillar" ? -1 : 1;
      }
      if (left.contentCluster !== right.contentCluster) {
        return left.contentCluster.localeCompare(right.contentCluster, "en");
      }
      return right.publicationPriority - left.publicationPriority || left.stableId.localeCompare(right.stableId, "en");
    });
    for (const article of ready) {
      remaining.delete(article.stableId);
      output.push(article);
    }
  }
  return output;
}

export function computeWikiScheduleSlots(input: {
  settings: WikiScheduleSettings;
  existingRunAt: string[];
  count: number;
  now?: Date;
}) {
  const { settings } = input;
  if (settings.publishingPaused) {
    throw new Error("Automatic Wiki publishing is paused.");
  }
  const now = input.now ?? new Date();
  const used = input.existingRunAt.map((value) => new Date(value));
  const dailyCounts = new Map<string, number>();
  const weeklyCounts = new Map<string, number>();
  for (const date of used) {
    const day = dateKey(zonedParts(date, settings.timezone));
    const week = weekKey(day);
    dailyCounts.set(day, (dailyCounts.get(day) ?? 0) + 1);
    weeklyCounts.set(week, (weeklyCounts.get(week) ?? 0) + 1);
  }
  const blackout = new Set(settings.blackoutDates);
  const result: Date[] = [];
  const startingDay = dateKey(zonedParts(now, settings.timezone));
  const occupied = [...used];

  for (let offset = 0; offset <= settings.maxHorizonDays && result.length < input.count; offset += 1) {
    const day = addCalendarDays(startingDay, offset);
    if (!settings.allowedWeekdays.includes(weekdayForKey(day)) || blackout.has(day)) {
      continue;
    }
    const week = weekKey(day);
    if ((weeklyCounts.get(week) ?? 0) >= settings.articlesPerWeek) {
      continue;
    }
    const firstSlot = zonedDateTimeToUtc(day, settings.publishTime, settings.timezone);
    let scheduledToday = dailyCounts.get(day) ?? 0;
    for (
      let dailyIndex = 0;
      scheduledToday < settings.maxArticlesPerDay && result.length < input.count;
      dailyIndex += 1
    ) {
      if ((weeklyCounts.get(week) ?? 0) >= settings.articlesPerWeek) break;
      const slot = new Date(
        firstSlot.getTime() + dailyIndex * settings.minimumIntervalHours * 3_600_000,
      );
      if (dateKey(zonedParts(slot, settings.timezone)) !== day) break;
      if (slot.getTime() <= now.getTime()) continue;
      if (occupied.some((date) =>
        Math.abs(slot.getTime() - date.getTime()) < settings.minimumIntervalHours * 3_600_000,
      )) {
        continue;
      }
      result.push(slot);
      occupied.push(slot);
      scheduledToday += 1;
      dailyCounts.set(day, scheduledToday);
      weeklyCounts.set(week, (weeklyCounts.get(week) ?? 0) + 1);
    }
  }
  if (result.length !== input.count) {
    throw new Error("Schedule settings cannot fit all articles inside the configured horizon.");
  }
  return result;
}
