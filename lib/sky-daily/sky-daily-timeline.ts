import type { SkyDailyAspect, SkyDailyTimelineEvent } from "@/lib/sky-daily/sky-daily-contract";

export function buildSkyDailyTimeline(input: { ingresses: SkyDailyTimelineEvent[]; stations: SkyDailyTimelineEvent[]; aspects: SkyDailyAspect[] }): SkyDailyTimelineEvent[] {
  const events: SkyDailyTimelineEvent[] = [
    ...input.ingresses, ...input.stations,
    ...input.aspects.filter((aspect) => aspect.exactAt).map((aspect) => ({ type: "aspect" as const, aspect, occurredAt: aspect.exactAt, priority: 30 })),
  ];
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = event.type === "aspect" ? `${event.type}:${event.aspect.leftBody}:${event.aspect.kind}:${event.aspect.rightBody}:${event.occurredAt ?? ""}` : `${event.type}:${event.body}:${event.occurredAt}`;
    if (seen.has(key)) return false; seen.add(key); return true;
  }).sort((left, right) => (left.occurredAt ?? "").localeCompare(right.occurredAt ?? "") || right.priority - left.priority);
}
