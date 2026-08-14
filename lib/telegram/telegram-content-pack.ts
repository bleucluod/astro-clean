import { wikiArticles as telegramTrustedWikiArticles } from "@/lib/wiki/wiki-content";
import { createHash } from "node:crypto";

import { findIranCityByName } from "@/lib/locations/iran-cities";
import {
  SKY_DAILY_BODY_IDS,
  type SkyDailyBodyId,
  type SkyDailySnapshot,
} from "@/lib/sky-daily/sky-daily-contract";
import { buildSkyDailySnapshot } from "@/lib/sky-daily/sky-daily-service";
import {
  TELEGRAM_CONTENT_CONTRACT_VERSION,
  TELEGRAM_PARSE_MODE,
  type TelegramContentClass,
  type TelegramContentType,
  type TelegramCta,
  type TelegramEngineProvenance,
  type TelegramPlannedContent,
} from "@/lib/telegram/telegram-content";

export const TELEGRAM_TRANSIT_PACK_CONTRACT_VERSION =
  "halleus-telegram-transit-pack-v1" as const;
export const TELEGRAM_CONTENT_PACK_CONTRACT_VERSION =
  "halleus-telegram-content-pack-v1" as const;

export const TELEGRAM_CONTENT_PACK_MAX_DAYS = 21;
export const TELEGRAM_CONTENT_PACK_MAX_ITEMS = 2_000;
export const TELEGRAM_CONTENT_PACK_MAX_TEXT_LENGTH = 3_700;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const PACK_ID_PATTERN = /^[a-zA-Z0-9._:-]{3,120}$/u;
const ITEM_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,160}$/u;
const ISO_TIMESTAMP_WITH_ZONE_PATTERN = /T.*(?:Z|[+-]\d{2}:\d{2})$/u;

const CONTENT_CLASSES = [
  "engine_backed",
  "evergreen",
  "shareable",
] as const satisfies readonly TelegramContentClass[];

const CONTENT_TYPES = [
  "sky_moon_position",
  "sky_moon_phase",
  "sky_planetary_state",
  "sky_priority_aspect",
  "sky_ingress",
  "sky_station",
  "evergreen_taurus_boundary",
  "evergreen_sign_boundary",
  "evergreen_relationship_pattern",
  "evergreen_planet_sign_lesson",
  "shareable_virgo_start",
  "shareable_sign_prompt",
  "shareable_relationship_prompt",
  "shareable_micro_reflection",
  "educational_retrograde",
  "educational_aspect",
] as const satisfies readonly TelegramContentType[];

const PROVENANCE_FACT_TYPES = [
  "planetary_state",
  "moon_phase",
  "aspect",
] as const;

const CTA_TARGETS = ["sky", "chart", "compare", "wiki"] as const;
const CONTENT_TIMING_MODES = ["same_day", "pre_event", "at_or_after_event"] as const;
const ASPECT_KINDS = ["conjunction", "sextile", "square", "trine", "opposition"] as const;
const ASPECT_PHASES = ["applying", "separating", "exact"] as const;

export class TelegramContentPackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramContentPackValidationError";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TelegramContentPackValidationError("Expected an object.");
  }
  return value as Record<string, unknown>;
}

function asTrimmedString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TelegramContentPackValidationError(`${label} is required.`);
  }
  return value.trim();
}

function isRealIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseIsoDate(value: unknown, label: string) {
  const text = asTrimmedString(value, label);
  if (!isRealIsoDate(text)) {
    throw new TelegramContentPackValidationError(
      `${label} must use a real YYYY-MM-DD date.`,
    );
  }
  return text;
}

function isoDateToUtcMidnight(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addUtcDays(value: string, days: number) {
  const date = isoDateToUtcMidnight(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function inclusiveDayCount(startDate: string, endDate: string) {
  return (
    Math.floor(
      (isoDateToUtcMidnight(endDate).getTime() -
        isoDateToUtcMidnight(startDate).getTime()) /
        86_400_000,
    ) + 1
  );
}

function localDateInTimezone(timestamp: string, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function validateRange(startDate: string, endDate: string) {
  const days = inclusiveDayCount(startDate, endDate);
  if (days < 1) {
    throw new TelegramContentPackValidationError(
      "Range end must not be before range start.",
    );
  }
  if (days > TELEGRAM_CONTENT_PACK_MAX_DAYS) {
    throw new TelegramContentPackValidationError(
      `Transit packs are limited to ${TELEGRAM_CONTENT_PACK_MAX_DAYS} days.`,
    );
  }
  return days;
}

function escapeTelegramHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeHashtag(value: unknown) {
  const hashtag = asTrimmedString(value, "hashtag");
  if (!/^#[\p{L}\p{N}_]+$/u.test(hashtag)) {
    throw new TelegramContentPackValidationError(
      `Invalid Telegram hashtag: ${hashtag}`,
    );
  }
  return hashtag;
}

function parseCta(value: unknown): TelegramCta | null {
  if (value === null || value === undefined) return null;
  const record = asRecord(value);
  const label = asTrimmedString(record.label, "CTA label");
  const target = asTrimmedString(record.target, "CTA target");
  if (!CTA_TARGETS.includes(target as (typeof CTA_TARGETS)[number])) {
    throw new TelegramContentPackValidationError(
      "CTA target must be chart, sky, compare, or wiki.",
    );
  }
  if (label.length > 80) {
    throw new TelegramContentPackValidationError("CTA label is too long.");
  }

  const wikiSlug =
    typeof record.wikiSlug === "string" && record.wikiSlug.trim()
      ? record.wikiSlug.trim()
      : undefined;
  if (target === "wiki") {
    if (!wikiSlug) {
      throw new TelegramContentPackValidationError(
        "CTA target=wiki requires wikiSlug.",
      );
    }
    const trusted = telegramTrustedWikiArticles.some(
      (article) => article.slug === wikiSlug,
    );
    if (!trusted) {
      throw new TelegramContentPackValidationError(
        `CTA wikiSlug is not in trustedWikiLinks: ${wikiSlug}`,
      );
    }
  } else if (wikiSlug) {
    throw new TelegramContentPackValidationError(
      "wikiSlug is allowed only when CTA target=wiki.",
    );
  }

  return {
    label,
    target: target as TelegramCta["target"],
    ...(wikiSlug ? { wikiSlug } : {}),
  };
}

function resolveCtaUrl(siteUrl: string, cta: TelegramCta) {
  if (cta.target === "sky") return new URL("/sky", siteUrl).toString();
  if (cta.target === "chart") return new URL("/chart", siteUrl).toString();
  if (cta.target === "compare") return new URL("/compare", siteUrl).toString();
  const wikiSlug = cta.wikiSlug?.trim();
  if (!wikiSlug) {
    throw new TelegramContentPackValidationError(
      "Wiki CTA is missing its trusted wikiSlug.",
    );
  }
  return new URL(`/wiki/${wikiSlug}`, siteUrl).toString();
}

function parseProvenance(value: unknown): TelegramEngineProvenance {
  const record = asRecord(value);
  if (record.sourceType !== "sky_daily_snapshot") {
    throw new TelegramContentPackValidationError(
      "Engine-backed content must preserve sky_daily_snapshot provenance.",
    );
  }
  const snapshotId = asTrimmedString(record.snapshotId, "snapshotId");
  const snapshotLocalDate = parseIsoDate(
    record.snapshotLocalDate,
    "snapshotLocalDate",
  );
  const calculationSource = asTrimmedString(
    record.calculationSource,
    "calculationSource",
  );
  const calculationVersion = asTrimmedString(
    record.calculationVersion,
    "calculationVersion",
  );
  const factType = asTrimmedString(record.factType, "factType");
  if (
    !PROVENANCE_FACT_TYPES.includes(
      factType as (typeof PROVENANCE_FACT_TYPES)[number],
    )
  ) {
    throw new TelegramContentPackValidationError(
      "Unsupported engine-backed provenance fact type.",
    );
  }
  if (!Array.isArray(record.relatedBodies) || record.relatedBodies.length === 0) {
    throw new TelegramContentPackValidationError(
      "Engine-backed provenance must include relatedBodies.",
    );
  }
  const relatedBodies = record.relatedBodies.map((body) => {
    const value = asTrimmedString(body, "related body");
    if (!SKY_DAILY_BODY_IDS.includes(value as SkyDailyBodyId)) {
      throw new TelegramContentPackValidationError(
        `Unknown engine body in provenance: ${value}`,
      );
    }
    return value as SkyDailyBodyId;
  });
  const generatedAt = asTrimmedString(record.generatedAt, "provenance generatedAt");
  if (!Number.isFinite(Date.parse(generatedAt))) {
    throw new TelegramContentPackValidationError(
      "Provenance generatedAt must be an ISO timestamp.",
    );
  }
  const aspectKind =
    typeof record.aspectKind === "string" ? record.aspectKind : undefined;
  if (aspectKind && !ASPECT_KINDS.includes(aspectKind as (typeof ASPECT_KINDS)[number])) {
    throw new TelegramContentPackValidationError("Invalid provenance aspectKind.");
  }
  const aspectPhase =
    typeof record.aspectPhase === "string" ? record.aspectPhase : undefined;
  if (aspectPhase && !ASPECT_PHASES.includes(aspectPhase as (typeof ASPECT_PHASES)[number])) {
    throw new TelegramContentPackValidationError("Invalid provenance aspectPhase.");
  }
  const exactAt =
    typeof record.exactAt === "string"
      ? record.exactAt
      : record.exactAt === null
        ? null
        : undefined;
  if (typeof exactAt === "string" && !Number.isFinite(Date.parse(exactAt))) {
    throw new TelegramContentPackValidationError("Invalid provenance exactAt timestamp.");
  }

  return {
    sourceType: "sky_daily_snapshot",
    snapshotId,
    snapshotLocalDate,
    calculationSource,
    calculationVersion,
    factType: factType as TelegramEngineProvenance["factType"],
    relatedBodies,
    aspectKind: aspectKind as TelegramEngineProvenance["aspectKind"],
    aspectPhase: aspectPhase as TelegramEngineProvenance["aspectPhase"],
    exactAt,
    generatedAt,
  };
}

function renderImportedPayload(input: {
  text: string;
  hashtags: string[];
  cta: TelegramCta | null;
  siteUrl: string;
}) {
  const parts = [escapeTelegramHtml(input.text)];
  if (input.cta) {
    const href = escapeTelegramHtml(resolveCtaUrl(input.siteUrl, input.cta));
    parts.push(`<a href="${href}">${escapeTelegramHtml(input.cta.label)}</a>`);
  }
  if (input.hashtags.length) parts.push(input.hashtags.join(" "));
  const text = parts.join("\n\n");
  if (text.length > 4096) {
    throw new TelegramContentPackValidationError(
      "Rendered Telegram message exceeds 4096 characters.",
    );
  }
  return {
    text,
    parseMode: TELEGRAM_PARSE_MODE,
    disableWebPagePreview: true as const,
  };
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

function buildContentKey(packId: string, itemId: string) {
  return `pack:${createHash("sha256")
    .update(`${packId}:${itemId}`, "utf8")
    .digest("hex")}`;
}

export type ParsedTelegramContentPack = {
  packId: string;
  rangeStart: string;
  rangeEnd: string;
  timezone: string;
  aiContentConfigVersion: number | null;
  items: TelegramPlannedContent[];
};

export function parseTelegramContentPack(
  input: unknown,
  siteUrl: string,
): ParsedTelegramContentPack {
  const root = asRecord(input);
  if (root.contractVersion !== TELEGRAM_CONTENT_PACK_CONTRACT_VERSION) {
    throw new TelegramContentPackValidationError(
      `Content pack contractVersion must be ${TELEGRAM_CONTENT_PACK_CONTRACT_VERSION}.`,
    );
  }
  const packId = asTrimmedString(root.packId, "packId");
  if (!PACK_ID_PATTERN.test(packId)) {
    throw new TelegramContentPackValidationError(
      "packId may contain only letters, numbers, dot, underscore, colon, and hyphen.",
    );
  }
  const timezone = asTrimmedString(root.timezone, "timezone");
  if (timezone !== "Asia/Tehran") {
    throw new TelegramContentPackValidationError(
      "Telegram content packs must use Asia/Tehran.",
    );
  }
  let aiContentConfigVersion: number | null = null;
  if (
    root.aiContentConfigVersion !== null &&
    root.aiContentConfigVersion !== undefined
  ) {
    if (
      typeof root.aiContentConfigVersion !== "number" ||
      !Number.isInteger(root.aiContentConfigVersion) ||
      root.aiContentConfigVersion < 1
    ) {
      throw new TelegramContentPackValidationError(
        "aiContentConfigVersion must be a positive integer when provided.",
      );
    }
    aiContentConfigVersion = root.aiContentConfigVersion;
  }
  const range = asRecord(root.range);
  const rangeStart = parseIsoDate(range.startDate, "range.startDate");
  const rangeEnd = parseIsoDate(range.endDate, "range.endDate");
  validateRange(rangeStart, rangeEnd);

  if (!Array.isArray(root.items) || root.items.length === 0) {
    throw new TelegramContentPackValidationError("Content pack items are required.");
  }
  if (root.items.length > TELEGRAM_CONTENT_PACK_MAX_ITEMS) {
    throw new TelegramContentPackValidationError(
      `Content pack cannot exceed ${TELEGRAM_CONTENT_PACK_MAX_ITEMS} items.`,
    );
  }

  const seenItemIds = new Set<string>();
  const generatedAt = new Date().toISOString();
  const items = root.items.map((raw, index): TelegramPlannedContent => {
    const item = asRecord(raw);
    const itemId = asTrimmedString(item.itemId, `items[${index}].itemId`);
    if (!ITEM_ID_PATTERN.test(itemId)) {
      throw new TelegramContentPackValidationError(
        `items[${index}].itemId contains unsupported characters.`,
      );
    }
    if (seenItemIds.has(itemId)) {
      throw new TelegramContentPackValidationError(`Duplicate itemId: ${itemId}`);
    }
    seenItemIds.add(itemId);

    const contentClass = asTrimmedString(
      item.contentClass,
      `items[${index}].contentClass`,
    );
    if (!CONTENT_CLASSES.includes(contentClass as TelegramContentClass)) {
      throw new TelegramContentPackValidationError(
        `Unsupported contentClass at items[${index}].`,
      );
    }
    const contentType = asTrimmedString(
      item.contentType,
      `items[${index}].contentType`,
    );
    if (!CONTENT_TYPES.includes(contentType as TelegramContentType)) {
      throw new TelegramContentPackValidationError(
        `Unsupported contentType at items[${index}].`,
      );
    }

    const scheduledAt = asTrimmedString(
      item.scheduledAt,
      `items[${index}].scheduledAt`,
    );
    if (
      !ISO_TIMESTAMP_WITH_ZONE_PATTERN.test(scheduledAt) ||
      !Number.isFinite(Date.parse(scheduledAt))
    ) {
      throw new TelegramContentPackValidationError(
        `items[${index}].scheduledAt must be an ISO timestamp with timezone.`,
      );
    }
    const scheduledLocalDate = localDateInTimezone(scheduledAt, timezone);
    if (scheduledLocalDate < rangeStart || scheduledLocalDate > rangeEnd) {
      throw new TelegramContentPackValidationError(
        `items[${index}] is scheduled outside the declared pack range.`,
      );
    }

    const text = asTrimmedString(item.text, `items[${index}].text`);
    if (text.length > TELEGRAM_CONTENT_PACK_MAX_TEXT_LENGTH) {
      throw new TelegramContentPackValidationError(
        `items[${index}].text is too long.`,
      );
    }
    if (/https?:\/\//iu.test(text)) {
      throw new TelegramContentPackValidationError(
        `items[${index}].text contains a raw URL; use the CTA field instead.`,
      );
    }

    const hashtags = Array.isArray(item.hashtags)
      ? item.hashtags.map(normalizeHashtag)
      : [];
    if (hashtags.length > 4) {
      throw new TelegramContentPackValidationError(
        `items[${index}] has too many hashtags.`,
      );
    }
    const cta = parseCta(item.cta);
    const isSkyType = contentType.startsWith("sky_");
    if (contentClass !== "engine_backed" && isSkyType) {
      throw new TelegramContentPackValidationError(
        `items[${index}] sky_* contentType requires engine_backed contentClass.`,
      );
    }

    const provenance =
      item.sourceProvenance != null
        ? parseProvenance(item.sourceProvenance)
        : null;
    if (contentClass === "engine_backed" && !provenance) {
      throw new TelegramContentPackValidationError(
        `items[${index}] engine-backed content requires Sky provenance.`,
      );
    }

    const sourceRef =
      typeof item.sourceRef === "string" ? item.sourceRef.trim() : null;
    if (contentClass === "engine_backed" && !sourceRef) {
      throw new TelegramContentPackValidationError(
        `items[${index}] engine-backed content requires sourceRef from the transit pack.`,
      );
    }
    if (provenance && !sourceRef) {
      throw new TelegramContentPackValidationError(
        `items[${index}] Sky provenance requires sourceRef from the transit pack.`,
      );
    }
    if (provenance && sourceRef && !sourceRef.startsWith(`${provenance.snapshotLocalDate}:`)) {
      throw new TelegramContentPackValidationError(
        `items[${index}] sourceRef does not match its engine provenance date.`,
      );
    }

    const timingModeRaw =
      typeof item.timingMode === "string" ? item.timingMode.trim() : "same_day";
    if (
      !CONTENT_TIMING_MODES.includes(
        timingModeRaw as (typeof CONTENT_TIMING_MODES)[number],
      )
    ) {
      throw new TelegramContentPackValidationError(
        `items[${index}].timingMode must be same_day, pre_event, or at_or_after_event.`,
      );
    }
    let timingMode = timingModeRaw as (typeof CONTENT_TIMING_MODES)[number];
    let eventAt =
      typeof item.eventAt === "string" && item.eventAt.trim()
        ? item.eventAt.trim()
        : null;
    if (
      eventAt &&
      (!ISO_TIMESTAMP_WITH_ZONE_PATTERN.test(eventAt) ||
        !Number.isFinite(Date.parse(eventAt)))
    ) {
      throw new TelegramContentPackValidationError(
        `items[${index}].eventAt must be an ISO timestamp with timezone.`,
      );
    }

    const hasNatalSpotlightMetadata =
      typeof item.bridgeSourceRef === "string" &&
      Boolean(item.bridgeSourceRef.trim()) &&
      typeof item.interpretationBasis === "string" &&
      Boolean(item.interpretationBasis.trim());

    if (
      provenance?.exactAt &&
      sourceRef?.includes(":timeline:") &&
      timingMode === "same_day" &&
      !eventAt &&
      !hasNatalSpotlightMetadata
    ) {
      eventAt = provenance.exactAt;
      timingMode =
        Date.parse(scheduledAt) < Date.parse(eventAt)
          ? "pre_event"
          : "at_or_after_event";
    }

    const eventLocalDate = eventAt
      ? localDateInTimezone(eventAt, timezone)
      : null;
    if (provenance) {
      if (
        timingMode === "same_day" &&
        provenance.snapshotLocalDate !== scheduledLocalDate
      ) {
        throw new TelegramContentPackValidationError(
          `items[${index}] same-day Sky provenance must match its scheduled Tehran date.`,
        );
      }
      if (
        timingMode !== "same_day" &&
        eventLocalDate &&
        provenance.snapshotLocalDate !== eventLocalDate
      ) {
        throw new TelegramContentPackValidationError(
          `items[${index}] event provenance date must match the event Tehran date.`,
        );
      }
      if (
        timingMode === "pre_event" &&
        provenance.snapshotLocalDate !== scheduledLocalDate
      ) {
        const lookaheadDays =
          inclusiveDayCount(scheduledLocalDate, provenance.snapshotLocalDate) - 1;
        if (lookaheadDays < 1 || lookaheadDays > 3) {
          throw new TelegramContentPackValidationError(
            `items[${index}] future teaser provenance must be 1 to 3 Tehran calendar days ahead.`,
          );
        }
      }
      if (
        timingMode === "at_or_after_event" &&
        provenance.snapshotLocalDate !== scheduledLocalDate
      ) {
        throw new TelegramContentPackValidationError(
          `items[${index}] post-event provenance must match its scheduled Tehran date.`,
        );
      }
    }
    if (eventAt && timingMode === "same_day") {
      throw new TelegramContentPackValidationError(
        `items[${index}] has eventAt but timingMode is same_day. Use pre_event or at_or_after_event.`,
      );
    }
    if (!eventAt && timingMode !== "same_day") {
      throw new TelegramContentPackValidationError(
        `items[${index}] timingMode=${timingMode} requires eventAt.`,
      );
    }
    if (eventAt) {
      const scheduledMs = Date.parse(scheduledAt);
      const eventMs = Date.parse(eventAt);
      if (timingMode === "pre_event" && scheduledMs >= eventMs) {
        throw new TelegramContentPackValidationError(
          `items[${index}] is marked pre_event but is scheduled at or after the event time.`,
        );
      }
      if (
        timingMode === "pre_event" &&
        /(وارد شد|دقیق شد|از این لحظه|انجام شد|رسید به نقطه‌ی دقیق)/u.test(text)
      ) {
        throw new TelegramContentPackValidationError(
          `items[${index}] is pre_event but its Persian copy claims the event already happened.`,
        );
      }
      if (timingMode === "at_or_after_event" && scheduledMs < eventMs) {
        throw new TelegramContentPackValidationError(
          `items[${index}] is scheduled before its event time. Use pre_event with future-tense copy, or move scheduledAt to the event time or later.`,
        );
      }
      if (
        provenance?.exactAt &&
        Math.abs(Date.parse(provenance.exactAt) - eventMs) > 1_000
      ) {
        throw new TelegramContentPackValidationError(
          `items[${index}].eventAt does not match sourceProvenance.exactAt.`,
        );
      }
    }
    const bridgeSourceRef =
      typeof item.bridgeSourceRef === "string" && item.bridgeSourceRef.trim()
        ? item.bridgeSourceRef.trim()
        : null;
    const interpretationBasis =
      typeof item.interpretationBasis === "string" && item.interpretationBasis.trim()
        ? item.interpretationBasis.trim()
        : null;
    if (Boolean(bridgeSourceRef) !== Boolean(interpretationBasis)) {
      throw new TelegramContentPackValidationError(
        `items[${index}] Natal Spotlight provenance requires both bridgeSourceRef and interpretationBasis.`,
      );
    }
    if (
      contentClass !== "engine_backed" &&
      provenance &&
      !(bridgeSourceRef && interpretationBasis)
    ) {
      throw new TelegramContentPackValidationError(
        `items[${index}] non-engine Sky provenance is allowed only for Natal Placement Spotlight.`,
      );
    }
    if (
      bridgeSourceRef &&
      !bridgeSourceRef.startsWith(`${scheduledLocalDate}:`)
    ) {
      throw new TelegramContentPackValidationError(
        `items[${index}].bridgeSourceRef must belong to the scheduled Tehran date.`,
      );
    }
    if (interpretationBasis && interpretationBasis.length > 180) {
      throw new TelegramContentPackValidationError(
        `items[${index}].interpretationBasis is too long.`,
      );
    }

    return {
      contractVersion: TELEGRAM_CONTENT_CONTRACT_VERSION,
      contentKey: buildContentKey(packId, itemId),
      contentClass: contentClass as TelegramContentClass,
      contentType: contentType as TelegramContentType,
      writerInput: {
        contentType: contentType as TelegramContentType,
        sourceFacts: {
          packId,
          itemId,
          aiContentConfigVersion,
          sourceRef,
          timingMode,
          eventAt,
          bridgeSourceRef,
          interpretationBasis,
        },
        allowedClaims: [sourceRef, bridgeSourceRef, interpretationBasis].filter(
          (value): value is string => Boolean(value),
        ),
        signTargets: [],
        tone: "young_conversational",
        length: text.length <= 180 ? "short" : "medium",
        cta,
        hashtags,
        scheduledWindow: {
          startAt: new Date(scheduledAt).toISOString(),
          endAt: addMinutes(scheduledAt, 10),
        },
      },
      provenance,
      cta,
      scheduledFor: new Date(scheduledAt).toISOString(),
      generatedAt,
      payload: renderImportedPayload({ text, hashtags, cta, siteUrl }),
    };
  });

  return { packId, rangeStart, rangeEnd, timezone, aiContentConfigVersion, items };
}

function buildProvenance(
  snapshot: SkyDailySnapshot,
  input: Pick<TelegramEngineProvenance, "factType" | "relatedBodies"> &
    Partial<
      Pick<
        TelegramEngineProvenance,
        "aspectKind" | "aspectPhase" | "exactAt"
      >
    >,
): TelegramEngineProvenance {
  return {
    sourceType: "sky_daily_snapshot",
    snapshotId: snapshot.id,
    snapshotLocalDate: snapshot.input.localDate,
    calculationSource: snapshot.source,
    calculationVersion: snapshot.calculationVersion,
    factType: input.factType,
    relatedBodies: input.relatedBodies,
    aspectKind: input.aspectKind,
    aspectPhase: input.aspectPhase,
    exactAt: input.exactAt,
    generatedAt: snapshot.generatedAt,
  };
}

function contentFactsForSnapshot(snapshot: SkyDailySnapshot) {
  const facts: Array<Record<string, unknown>> = [];
  const moon = snapshot.planetaryStates.find((state) => state.body === "moon");
  if (moon) {
    facts.push({
      sourceRef: `${snapshot.input.localDate}:moon-position`,
      suggestedContentType: "sky_moon_position",
      suggestedScheduleAt: null,
      facts: moon,
      sourceProvenance: buildProvenance(snapshot, {
        factType: "planetary_state",
        relatedBodies: ["moon"],
      }),
    });
  }
  if (snapshot.moonPhase) {
    facts.push({
      sourceRef: `${snapshot.input.localDate}:moon-phase`,
      suggestedContentType: "sky_moon_phase",
      suggestedScheduleAt: null,
      facts: snapshot.moonPhase,
      sourceProvenance: buildProvenance(snapshot, {
        factType: "moon_phase",
        relatedBodies: ["moon", "sun"],
      }),
    });
  }

  snapshot.timeline.forEach((event, index) => {
    if (event.type === "aspect") {
      const exactAt = event.occurredAt ?? event.aspect.exactAt ?? null;
      facts.push({
        sourceRef: `${snapshot.input.localDate}:timeline:${index}`,
        suggestedContentType: "sky_priority_aspect",
        suggestedScheduleAt: exactAt,
        priority: event.priority,
        facts: event,
        sourceProvenance: buildProvenance(snapshot, {
          factType: "aspect",
          relatedBodies: [event.aspect.leftBody, event.aspect.rightBody],
          aspectKind: event.aspect.kind,
          aspectPhase: event.aspect.phase,
          exactAt,
        }),
      });
      return;
    }
    facts.push({
      sourceRef: `${snapshot.input.localDate}:timeline:${index}`,
      suggestedContentType: event.type === "ingress" ? "sky_ingress" : "sky_station",
      suggestedScheduleAt: event.occurredAt,
      priority: event.priority,
      facts: event,
      sourceProvenance: buildProvenance(snapshot, {
        factType: "planetary_state",
        relatedBodies: [event.body],
        exactAt: event.occurredAt,
      }),
    });
  });

  return facts;
}

export function __halleusSmartDailyBase_buildTelegramSmartTransitPack(input: {
  startDate: string;
  endDate: string;
  city?: string;
  aspectLimit?: number | "all";
}) {
  const startDate = parseIsoDate(input.startDate, "startDate");
  const endDate = parseIsoDate(input.endDate, "endDate");
  const dayCount = validateRange(startDate, endDate);
  const city = findIranCityByName(input.city?.trim() || "تهران");
  if (!city) {
    throw new TelegramContentPackValidationError(
      "Selected city is not in the Halleus Iran city list.",
    );
  }

  const buildCompactContextDay = (localDate: string) => {
    try {
      const snapshot = buildSkyDailySnapshot({
        localDate,
        timezone: city.timezone,
        location: {
          latitude: city.latitude,
          longitude: city.longitude,
          label: city.faName,
        },
      });
      const timeline = snapshot.timeline.map((event, index) => ({
        sourceRef: `${localDate}:timeline:${index}`,
        type: event.type,
        occurredAt: event.occurredAt ?? null,
        priority: event.priority ?? null,
        facts: event,
      }));
      const motion = snapshot.planetaryStates
        .filter((state) => state.motion !== "direct" || state.nearStation)
        .map((state) => ({
          sourceRef: `${localDate}:motion:${state.body}`,
          body: state.body,
          sign: state.sign,
          motion: state.motion,
          nearStation: state.nearStation,
        }));
      const closeAspects = [...snapshot.aspects]
        .sort((left, right) => left.orb - right.orb)
        .slice(0, 4)
        .map((aspect, index) => ({
          sourceRef: `${localDate}:context-aspect:${index}`,
          leftBody: aspect.leftBody,
          rightBody: aspect.rightBody,
          kind: aspect.kind,
          orb: aspect.orb,
          phase: aspect.phase,
          exactAt: aspect.exactAt ?? null,
        }));
      return {
        localDate,
        available: true as const,
        timeline,
        motion,
        closeAspects,
      };
    } catch (error) {
      const reason =
        error instanceof Error && error.message
          ? error.message.slice(0, 240)
          : "Sky context snapshot failed.";
      return {
        localDate,
        available: false as const,
        errorCode: "CONTEXT_SNAPSHOT_FAILED" as const,
        reason,
        timeline: [],
        motion: [],
        closeAspects: [],
      };
    }
  };

  const lookbackSummary = [3, 2, 1].map((daysBack) =>
    buildCompactContextDay(addUtcDays(startDate, -daysBack)),
  );
  const lookaheadSummary = [1, 2, 3].map((daysAhead) =>
    buildCompactContextDay(addUtcDays(endDate, daysAhead)),
  );

  const days = Array.from({ length: dayCount }, (_, index) => {
    const localDate = addUtcDays(startDate, index);
    let snapshot: SkyDailySnapshot;
    try {
      snapshot = buildSkyDailySnapshot({
        localDate,
        timezone: city.timezone,
        location: {
          latitude: city.latitude,
          longitude: city.longitude,
          label: city.faName,
        },
      });
    } catch (error) {
      const reason =
        error instanceof Error && error.message
          ? error.message.slice(0, 300)
          : "خطای ناشناخته در موتور آسمان روزانه";
      throw new TelegramContentPackValidationError(
        `ساخت دادهٔ نجومی روز ${localDate} ناموفق بود: ${reason}`,
      );
    }
    return {
      localDate,
      snapshot: {
        id: snapshot.id,
        source: snapshot.source,
        calculationVersion: snapshot.calculationVersion,
        generatedAt: snapshot.generatedAt,
        qualityFlags: snapshot.qualityFlags,
        errors: snapshot.errors,
      },
      moonPhase: snapshot.moonPhase ?? null,
      planetaryStates: snapshot.planetaryStates,
      aspects: [...snapshot.aspects]
        .sort((left, right) => left.orb - right.orb)
        .slice(
          0,
          input.aspectLimit === "all"
            ? snapshot.aspects.length
            : Math.min(Math.max(input.aspectLimit ?? 12, 1), 100),
        ),
      timeline: snapshot.timeline,
      contentFacts: contentFactsForSnapshot(snapshot),
    };
  });

  const packId = `transits:${city.id}:${startDate}:${endDate}:${days[0]?.snapshot.calculationVersion ?? "unknown"}`;
  return {
    contractVersion: TELEGRAM_TRANSIT_PACK_CONTRACT_VERSION,
    packId,
    generatedAt: new Date().toISOString(),
    city: {
      id: city.id,
      label: city.faName,
      timezone: city.timezone,
      latitude: city.latitude,
      longitude: city.longitude,
    },
    range: { startDate, endDate, dayCount },
    generationWorkflow: {
      batchSizeDays: 3,
      commandNext: "next | بعدی | نکست",
      cumulativeBuffer: true,
      resetMeaning:
        "وقتی کاربر می‌گوید بسته تا اینجا به هالیوس داده شد، فایل تجمیعی فعلی را نهایی کن و فقط delivery buffer را خالی کن؛ cursor و creative history را نگه دار.",
      duplicateRule:
        "روز ساخته‌شده را دوباره نساز. itemIdهای قبلی را در cumulative pack ثابت نگه دار. بازنویسی فقط با دستور صریح rewrite/replace مجاز است.",
      cursorRule:
        "هر next دقیقاً از اولین روز ساخته‌نشده ادامه می‌دهد و حداکثر ۳ روز می‌نویسد. در انتهای بازه فقط روزهای باقی‌مانده را بساز و هرگز loop نکن.",
    },
    context: {
      lookbackSummary,
      lookbackRule:
        "این ۳ روز فقط context هستند و از آن‌ها پیام تازه نساز.",
      lookaheadSummary,
      lookaheadRule:
        "این ۳ روز فقط برای continuity/teaser بعد از انتهای generation range هستند؛ event آینده را امروز جا نزن.",
    },
    contentBrief: {
      purpose:
        "این فایل منبع حقیقت نجومی برای چت محتوای تلگرام هالیوس است. متن را بنویس، محاسبه نجومی تازه انجام نده.",
      targetDailyVolume: "40-65",
      voice:
        "فارسی محاوره‌ای، جوان، زنده، سَسی و کمی شیطون؛ کوتاه و قابل فوروارد، بدون لحن شرکتی یا AI-generic.",
      engineRule:
        "برای هر ادعای نجومی فقط از contentFacts همان روز استفاده کن. sourceRef و sourceProvenance را عیناً در خروجی نگه دار.",
      schedulingRule:
        "اگر suggestedScheduleAt وجود دارد و متن درباره همان event است، scheduledAt را همان زمان نگه دار. بقیه محتوا را با ریتم طبیعی و burstهای کوتاه در طول روز پخش کن.",
      safetyRule:
        "برای پست‌های سرگرمی ادعای قطعی درباره آینده، پیام دادن اکس، ذهن یا رفتار شخص مشخص را به‌عنوان fact نجومی جا نزن.",
      outputContract: TELEGRAM_CONTENT_PACK_CONTRACT_VERSION,
      contentTypes: CONTENT_TYPES,
      outputShape: {
        contractVersion: TELEGRAM_CONTENT_PACK_CONTRACT_VERSION,
        packId: "telegram-YYYY-MM-DD-to-YYYY-MM-DD-v1",
        timezone: "Asia/Tehran",
        range: { startDate: "YYYY-MM-DD", endDate: "YYYY-MM-DD" },
        items: [
          {
            itemId: "unique-item-id",
            contentClass: "shareable | evergreen | engine_backed",
            contentType: "one of contentBrief.contentTypes",
            scheduledAt: "ISO-8601 timestamp with +03:30 or Z",
            text: "plain Persian Telegram text; no raw URL",
            hashtags: ["#optional"],
            cta: null,
            sourceRef: null,
            sourceProvenance: null,
            timingMode: "same_day | pre_event | at_or_after_event",
            eventAt: null,
            bridgeSourceRef: null,
            interpretationBasis: null,
          },
        ],
      },
    },
    days,
  };
}


/* HALLEUS_SMART_DAILY_AI_BRIEF_V2 */
type HalleusLooseRecord = Record<string, unknown>;

function asHalleusRecord(value: unknown): HalleusLooseRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as HalleusLooseRecord)
    : null;
}

function asHalleusArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function localDateForIso(iso: string, timezone: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const year = byType.get("year");
  const month = byType.get("month");
  const day = byType.get("day");
  return year && month && day ? year + "-" + month + "-" + day : null;
}

function enhanceHalleusSmartDailyPack<T>(pack: T): T {
  const root = asHalleusRecord(pack);
  if (!root) return pack;
  const city = asHalleusRecord(root.city);
  const timezone = typeof city?.timezone === "string" && city.timezone ? city.timezone : "Asia/Tehran";
  const brief = asHalleusRecord(root.contentBrief);
  if (brief) {
    brief.purpose = "این بسته برنامه‌ی روزانه‌ی تلگرام هالیوس است. تمام ۵۰ تا ۱۰۰ پیام هر روز باید دلیل مشخصی برای انتشار در همان روز داشته باشند و به contentFacts همان localDate وصل باشند؛ filler عمومی، رابطه‌ای یا انگیزشیِ بی‌ربط ممنوع است.";
    brief.targetDailyVolume = "50-100";
    brief.voice = "فارسی محاوره‌ای و تینیجری، زنده، سَسی، فان و گاهی کمی تاکسیک ولی نه آزاردهنده؛ کوتاه و قابل فوروارد. از :) :( :(( :)) xd و اموجی‌ها طبیعی و متنوع استفاده کن، نه در همه‌ی پیام‌ها و نه با یک الگوی تکراری.";
    brief.engineRule = "هر fact نجومی، زمان، ساین، فاز، حرکت، ingress، station یا aspect فقط باید از contentFacts همان روز بیاید. محاسبه یا event تازه اختراع نکن. sourceRef و sourceProvenanceِ anchor را عیناً نگه دار.";
    brief.dailyAnchorRule = "هر پیام باید anchor واقعی داشته باشد. پیش‌فرض sourceRef همان localDate است؛ فقط ۲ تا ۵ teaser صریحِ آینده می‌توانند sourceRef رویداد ۱ تا ۳ روز بعد را داشته باشند. تست حذف تاریخ: اگر متن بدون تغییر در یک روز تصادفی دیگر هم قابل انتشار است، ردش کن.";
    brief.primaryEventRule = "برای roast ساین‌ها و تفسیرهای روزانه اولویت با eventهای exact_today، ingress و station است. planetary_stateهای supporting_state برای توضیح همان eventها هستند و به‌تنهایی نباید filler عمومی تولید کنند.";
    brief.interpretationRule = "تفسیر نمادین آسترولوژیک از factهای واقعی مجاز است، اما آن را با واژه‌هایی مثل «ممکنه»، «شاید»، «اگه»، «احتمالاً» و لحن فان بنویس. اثر دقیق شخصی، خانه، اتفاق قطعی، ذهن‌خوانی، برگشت اکس، دعوا یا پیشگویی قطعی نساز؛ بدون چارت تولد این‌ها fact نیستند.";
    brief.signImpactRule = "برای هر رویداد اصلی روز، مخصوصاً ingress، station و aspect دقیق، یک سری ۱۲تایی برای همه‌ی ساین‌ها بساز. این‌ها broad Sun-sign fun هستند، نه گزارش شخصی. roast و toxic-lite مجاز است، ولی با «ممکنه/شاید/اگه» و بدون ترساندن یا قطعیت.";
    brief.signVocabularyRule = "در متن کاربرپسند فقط این نام‌ها را بنویس: آریز، تارس، جمینای، کنسر، لئو، ویرگو، لیبرا، اسکروپیو، ساگ، کپریکورن، آکواریوس، پایسیز. نام انگلیسی مثل Leo/Cancer و نام‌های سنتی فارسی مثل اسد/سرطان/حمل/ثور را در متن پیام ننویس.";
    brief.languageRule = "وسط متن فارسی واژه‌ی انگلیسی نریز. اسم سیاره‌ها را فارسی بنویس: خورشید، ماه، عطارد، ونوس، مارس، ژوپیتر، سترن، اورانوس، نپتون، پلوتو. برای aspectها از مقارنه، سکستایل، اسکوئر، ترین و اپوزیسیون استفاده کن. واژه‌ی «ساین» در لحن محاوره‌ای مجاز است.";
    brief.varietyRule = "از یک fact ده بار با جمله‌ی مشابه استفاده نکن. فرمت‌ها را بچرخان: خبر کوتاه، قبل/بعد رویداد، توضیح یک‌خطی، کوئیز، سؤال، میم، roast ساین، فرق دو مفهوم، myth-bust، recap، «الان کجای آسمونیم؟». هیچ قالبی پشت‌سرهم غالب نشود.";
    brief.volumeRule = "اگر رویداد اصلی کافی هست، بخش مهم حجم را از سری ۱۲ ساین بساز. برای ۱ رویداد اصلی حداقل ۱۲ پیام ساین‌محور، برای ۲ رویداد ۲۴ پیام و برای ۳ رویداد مهم تا ۳۶ پیام ساین‌محور مجاز است؛ بقیه از خبر/آموزش/میم/کوئیز/recap همان factها پر شود. برای رسیدن به عدد، filler نامرتبط نساز.";
    brief.schedulingRule = "پیام اعلام event دقیق را روی suggestedScheduleAt نگه دار. teaser یا «داره می‌رسه» فقط قبل از event آینده و بر اساس همان زمان مجاز است. sign-impactها و توضیح‌ها را اطراف event و بقیه‌ی روز پخش کن؛ درباره event گذشته طوری ننویس که هنوز آینده است.";
    brief.safetyRule = "روست و toxic-lite باید شوخی واضح بماند. ادعای قطعی درباره آینده، سلامت، پول، خیانت، جدایی، پیام دادن شخص مشخص یا تصمیم خطرناک نساز. محتوای ساین‌محور را broad و سرگرمی نگه دار.";
    brief.disallowedGenericExamples = [
      "سؤال رابطه‌ای که هیچ anchor نجومی امروز ندارد",
      "نصیحت انگیزشی یا micro-reflection عمومی",
      "Seen بدون جواب، Notes، خستگی، مرزبندی یا پارتنر بدون اتصال مستقیم به fact امروز",
      "پست «برجت چیه؟» بدون اتصال به event یا وضعیت همان روز",
    ];
    brief.requiredDailyMix = {
      eventNewsAndRecaps: "10-20",
      sameDayEducationQuizzesMemes: "15-30",
      signImpactAndRoast: "12-36 بر اساس تعداد رویدادهای اصلی",
      natalPlacementSpotlight: "5-10 وقتی planet همان روز headline واقعی دارد؛ بین روز پخش شود نه یک بلوک پشت‌سرهم",
      futureTeasers: "2-5 فقط برای 1-3 روز آینده و event شاخص",
      total: "50-100",
    };
    brief.signLabels = {
      aries: "آریز", taurus: "تارس", gemini: "جمینای", cancer: "کنسر",
      leo: "لئو", virgo: "ویرگو", libra: "لیبرا", scorpio: "اسکروپیو",
      sagittarius: "ساگ", capricorn: "کپریکورن", aquarius: "آکواریوس", pisces: "پایسیز",
    };
    brief.bodyLabels = {
      sun: "خورشید", moon: "ماه", mercury: "عطارد", venus: "ونوس", mars: "مارس",
      jupiter: "ژوپیتر", saturn: "سترن", uranus: "اورانوس", neptune: "نپتون", pluto: "پلوتو",
    };
    // HALLEUS_TELEGRAM_LINK_POLICY_V1
    brief.lookaheadRule =
      "روزانه فقط ۲ تا ۵ پیام می‌تواند preview رویداد شاخص ۱ تا ۳ روز آینده باشد. هر preview باید sourceRef همان تاریخ آینده را نگه دارد، تاریخ آینده را صریح بگوید و با واژه‌هایی مثل «فردا»، «پس‌فردا» یا تاریخ روشن معرفی شود. فقط ingress، station یا aspect واقعاً شاخص را teaser کن؛ filler آینده‌نما نساز.";
    brief.linkPolicy =
      "متن پیام باید فارسی و بدون URL خام باشد. اگر لینک لازم است، فقط cta ساختاری بده؛ هالیوس label فارسی را به لینک مخفی تلگرام تبدیل می‌کند. هیچ https://، http:// یا دامنه‌ای را داخل text ننویس. اکثریت پیام‌ها باید بدون cta باشند.";
    brief.chartLinkRule =
      "target=chart در هر localDate حداکثر ۱ بار. فقط وقتی پیام صریحاً تفاوت تفسیر عمومی با چارت شخصی را توضیح می‌دهد یا کاربر را طبیعی به ساخت چارت خودش می‌رساند.";
    brief.skyLinkRule =
      "target=sky در هر localDate حداکثر ۲ بار و فقط برای recap آسمان امروز، وضعیت زنده ماه/سیاره‌ها یا جمع‌بندی چند رویداد همان روز.";
    brief.compareLinkRule =
      "target=compare در هر localDate حداکثر ۱ بار و فقط وقتی خود پیام واقعاً درباره رابطه، مقایسه دو نفر یا تفاوت دو چارت است. صرف حضور ونوس یا یک aspect اجازه لینک compare نیست.";
    brief.wikiLinkRule =
      "برای پست آموزشی فقط وقتی cta با target=wiki بده که موضوع دقیق آن پست در trustedWikiLinks موجود باشد. wikiSlug را دقیقاً از همان فهرست بردار و هیچ slug تازه‌ای حدس نزن. یک wikiSlug را در یک روز بیش از یک بار تکرار نکن.";
    brief.ctaStyleRule =
      "label همیشه یک عبارت فارسی طبیعی و قابل‌کلیک باشد؛ مثل «چارت تولدت رو ببین»، «آسمان امروز رو ببین» یا عنوان طبیعی همان آموزش. CTA تبلیغاتی، رسمی یا تکراری نساز.";
    brief.trustedSiteLinks = {
      chart: {
        target: "chart",
        defaultLabel: "چارت تولدت رو ببین",
        maxPerDay: 1,
      },
      sky: {
        target: "sky",
        defaultLabel: "آسمان امروز رو ببین",
        maxPerDay: 2,
      },
      compare: {
        target: "compare",
        defaultLabel: "تحلیل رابطه‌تون رو ببین",
        maxPerDay: 1,
      },
    };
    brief.trustedWikiLinks = telegramTrustedWikiArticles.map((article) => ({
      target: "wiki",
      wikiSlug: article.slug,
      label: article.shortTitle,
      title: article.title,
      categoryId: article.categoryId,
    }));

    const outputShape = asHalleusRecord(brief.outputShape);
    const outputItems = outputShape ? asHalleusArray(outputShape.items) : [];
    const outputItem = asHalleusRecord(outputItems[0]);
    if (outputItem) {
      outputItem.text =
        "plain Persian Telegram text with no URL and no HTML; use cta metadata for hidden linked Persian labels";
      outputItem.cta = {
        label: "Persian clickable phrase",
        target: "chart | sky | compare | wiki",
        wikiSlug: "required only for target=wiki and must exist in contentBrief.trustedWikiLinks",
      };
      outputItem.timingMode = "same_day | pre_event | at_or_after_event";
      outputItem.eventAt =
        "null unless the message is anchored to a specific exact/ingress/station time";
      outputItem.bridgeSourceRef =
        "required together with interpretationBasis for Natal Placement Spotlight";
      outputItem.interpretationBasis =
        "trusted interpretation reference or standard-symbolic:planet+sign";
    }

    // HALLEUS_TELEGRAM_3DAY_CUMULATIVE_FLOW_R8
    brief.productionBatchRule =
      "در هر نوبت فقط ۳ روز متوالی از اولین روز ساخته‌نشده بنویس. اگر کمتر از ۳ روز تا پایان بازه مانده فقط همان‌ها را بنویس. دستور next/بعدی/نکست cursor را جلو می‌برد؛ هیچ روزی را خودکار دوباره نساز.";
    brief.cumulativeDeliveryRule =
      "بعد از هر نوبت، JSON تجمیعیِ delivery buffer را با همان packId و itemIdهای ثابت به‌روز کن. اگر کاربر گفت «تا اینجا دادم به هالیوس» یا reset، فایل تجمیعی فعلی را نهایی کن، delivery buffer را خالی کن و از روز بعد buffer تازه بساز؛ creative history و cursor پاک نشوند.";
    brief.creativeHistoryRule =
      "تا پایان کل generation range تاریخچه‌ی Spotlightها، joke/openingها، CTAها، wikiSlugها و سناریوهای مصرف‌شده را نگه دار؛ reset تحویل این تاریخچه را پاک نمی‌کند.";
    brief.temporalConsistencyRule =
      "برای ingress/station/aspect دقیق، eventAt را از suggestedScheduleAt/exactAt کپی کن. قبل از event فقط timingMode=pre_event و متن صریحاً آینده‌نگر مجاز است. هر متن «وارد شد/دقیق شد/از این لحظه» باید timingMode=at_or_after_event و scheduledAt برابر یا بعد از eventAt باشد.";
    brief.signRelativeForecastRule =
      "Daily Sign Forecast باید از خود event ساخته شود، نه از کلیشهٔ شخصیت ساین. sign واقعی جرم‌های event را از pack بخوان، برای هر target sign جای نسبی آن signها را به حوزهٔ زندگی تبدیل کن و interaction همان حوزه‌ها را بنویس. شمارهٔ خانه را به کاربر نگو؛ حوزه را طبیعی مثل رابطه، پول، خانه، کار یا دوست‌ها ترجمه کن. کلیشهٔ زودیاکی فقط flavor فرعی و حداکثر حدود ۲۰٪ متن باشد.";
    brief.relativeDomainOrder = [
      "خود، هویت، بدن، نیاز شخصی و حضور",
      "پول، منابع شخصی، ارزش شخصی و امنیت",
      "حرف، پیام، تماس، یادگیری و رفت‌وآمد",
      "خانه، خانواده، ریشه و فضای خصوصی",
      "عشق، قرار، لذت، خلاقیت و سرگرمی",
      "کار روزانه، روتین، سلامت و وظایف کوچک",
      "رابطه، پارتنر، همکاری، قرارداد و تعهد",
      "صمیمیت، اعتماد، وابستگی و پول مشترک",
      "سفر، تحصیل، باور، جهان‌بینی و تجربهٔ بزرگ‌تر",
      "کار، اعتبار، موقعیت و مسئولیت بیرونی",
      "دوست‌ها، گروه، شبکه، اجتماع و برنامهٔ آینده",
      "خلوت، خواب، استراحت، چیزهای پنهان و تخلیهٔ ذهنی",
    ];
    brief.forecastQaRule =
      "برای هر پیام ساین‌محور Swap Test، Transit Removal Test و Domain Test را اجرا کن: اگر با عوض‌کردن اسم ساین هنوز همان متن کار می‌کند، اگر بدون event تبدیل به horoscope عمومی می‌شود، یا اگر domain واقعی مشخص ندارد، پیام را بازنویسی کن.";
    brief.antiTemplateRule =
      "Daily Sign Forecast را از چند قالب ثابت بازنویسی نکن. opening، ریتم جمله، سناریو و پایان را بین ساین‌ها و روزها بچرخان. اگر فقط اسم ساین و domainها عوض شده، بازنویسی کن.";
    brief.domainRenderingRule =
      "منطق relative-domain برای QA داخلی است. در متن کاربر domain را طبیعی فقط یک بار به سناریو تبدیل کن؛ پاراگراف دومِ مکانیکی که دوباره می‌گوید سیاره X در حوزه A و سیاره Y در حوزه B است نساز.";
    brief.natalSpotlightRule =
      "Natal Placement Spotlight پیش‌بینی روز نیست. برای هر Spotlight هر دو metadata را بده: bridgeSourceRef برای دلیل انتشار همان روز و interpretationBasis برای پایه‌ی character read. bridgeSourceRef مدرک تفسیر natal نیست. متن باید رفتاری، ملموس، shareable، احتمالی و دارای ۱ تا ۲ جمله‌ی memorable باشد.";
    brief.wikiCooldownRule =
      "یک wikiSlug را در بازه‌ی ۳ روزه بیش از یک بار استفاده نکن مگر یک رویداد استثنائاً همان آموزش را ضروری کند. CTA سهمیه‌ای نساز؛ اکثریت پیام‌ها بدون CTA باشند.";
    brief.batchQaRule =
      "قبل از تحویل هر batch سه‌روزه: Temporal Consistency، duplicate-date/itemId، Swap Test، Transit Removal Test، anti-template، Spotlight cooldown، CTA caps و wiki cooldown را چک کن. روزهای lookback قابل تولید نیستند.";
    brief.errorRecoveryRule =
      "اگر تولید یک روز ناقص شد cursor را از آن روز عبور نده. در retry از همان روز ناقص ادامه بده و روزهای کامل قبلی را دوباره نساز.";
    brief.outputPackageRule =
      "packId در طول یک delivery buffer ثابت بماند و itemId هر پیام پس از اولین تولید immutable باشد. این ثبات برای import idempotent هالیوس لازم است.";

    brief.contentTypes = [
      "sky_moon_position", "sky_moon_phase", "sky_planetary_state", "sky_priority_aspect",
      "sky_ingress", "sky_station", "shareable_sign_prompt", "educational_retrograde", "educational_aspect",
    ];
  }

  for (const rawDay of asHalleusArray(root.days)) {
    const day = asHalleusRecord(rawDay);
    if (!day || typeof day.localDate !== "string") continue;
    const localDate = day.localDate;
    const snapshot = asHalleusRecord(day.snapshot);
    const contentFacts = asHalleusArray(day.contentFacts).map(asHalleusRecord).filter((item): item is HalleusLooseRecord => item !== null);
    const existingRefs = new Set(contentFacts.map((item) => item.sourceRef).filter((value): value is string => typeof value === "string"));
    const snapshotId = typeof snapshot?.id === "string" ? snapshot.id : "unknown";
    const calculationSource = typeof snapshot?.source === "string" ? snapshot.source : "astronomy-engine";
    const calculationVersion = typeof snapshot?.calculationVersion === "string" ? snapshot.calculationVersion : "sky-daily-v1";
    const generatedAt = typeof snapshot?.generatedAt === "string" ? snapshot.generatedAt : typeof root.generatedAt === "string" ? root.generatedAt : new Date().toISOString();
    const provenance = (factType: string, relatedBodies: string[], extra: HalleusLooseRecord = {}) => ({
      sourceType: "sky_daily_snapshot", snapshotId, snapshotLocalDate: localDate,
      calculationSource, calculationVersion, factType, relatedBodies, generatedAt, ...extra,
    });
    const pushFact = (fact: HalleusLooseRecord) => {
      const sourceRef = typeof fact.sourceRef === "string" ? fact.sourceRef : null;
      if (!sourceRef || existingRefs.has(sourceRef)) return;
      existingRefs.add(sourceRef);
      contentFacts.push(fact);
    };

    asHalleusArray(day.planetaryStates).forEach((rawState) => {
      const state = asHalleusRecord(rawState);
      if (!state || typeof state.body !== "string") return;
      if (state.body === "moon" && existingRefs.has(localDate + ":moon-position")) return;
      pushFact({
        sourceRef: localDate + ":planetary-state:" + state.body,
        suggestedContentType: "sky_planetary_state",
        suggestedScheduleAt: null,
        priority: 10,
        facts: { type: "planetary_state", eventRole: "supporting_state", ...state },
        sourceProvenance: provenance("planetary_state", [state.body]),
      });
    });

    asHalleusArray(day.timeline).forEach((rawEvent, index) => {
      const event = asHalleusRecord(rawEvent);
      if (!event || typeof event.type !== "string") return;
      const sourceRef = localDate + ":timeline:" + index;
      if (existingRefs.has(sourceRef)) return;
      if (event.type === "ingress" || event.type === "station") {
        const body = typeof event.body === "string" ? event.body : null;
        if (!body) return;
        pushFact({
          sourceRef,
          suggestedContentType: event.type === "ingress" ? "sky_ingress" : "sky_station",
          suggestedScheduleAt: typeof event.occurredAt === "string" ? event.occurredAt : null,
          priority: typeof event.priority === "number" ? event.priority : event.type === "ingress" ? 50 : 40,
          facts: { ...event, eventRole: "exact_today" },
          sourceProvenance: provenance("planetary_state", [body]),
        });
        return;
      }
      if (event.type === "aspect") {
        const aspect = asHalleusRecord(event.aspect);
        const left = typeof aspect?.leftBody === "string" ? aspect.leftBody : null;
        const right = typeof aspect?.rightBody === "string" ? aspect.rightBody : null;
        if (!aspect || !left || !right) return;
        pushFact({
          sourceRef,
          suggestedContentType: "sky_priority_aspect",
          suggestedScheduleAt: typeof event.occurredAt === "string" ? event.occurredAt : typeof aspect.exactAt === "string" ? aspect.exactAt : null,
          priority: typeof event.priority === "number" ? event.priority : 30,
          facts: { type: "aspect", eventRole: "exact_today", aspect: { ...aspect }, occurredAt: event.occurredAt ?? aspect.exactAt ?? null, priority: event.priority ?? 30 },
          sourceProvenance: provenance("aspect", [left, right], { aspectKind: aspect.kind ?? null, aspectPhase: aspect.phase ?? null, exactAt: aspect.exactAt ?? null }),
        });
      }
    });

    const aspectEventKeys = new Set(contentFacts.map((item) => asHalleusRecord(item.facts)).map((facts) => {
      if (!facts) return null;
      const aspect = facts.type === "aspect" ? asHalleusRecord(facts.aspect) : facts.kind && facts.leftBody && facts.rightBody ? facts : null;
      if (!aspect) return null;
      const left = typeof aspect.leftBody === "string" ? aspect.leftBody : "";
      const right = typeof aspect.rightBody === "string" ? aspect.rightBody : "";
      const kind = typeof aspect.kind === "string" ? aspect.kind : "";
      const exactAt = typeof aspect.exactAt === "string" ? aspect.exactAt : "";
      return left + "|" + kind + "|" + right + "|" + exactAt;
    }).filter((value): value is string => Boolean(value)));

    asHalleusArray(day.aspects).forEach((rawAspect, index) => {
      const aspect = asHalleusRecord(rawAspect);
      if (!aspect) return;
      const left = typeof aspect.leftBody === "string" ? aspect.leftBody : null;
      const right = typeof aspect.rightBody === "string" ? aspect.rightBody : null;
      const kind = typeof aspect.kind === "string" ? aspect.kind : null;
      if (!left || !right || !kind) return;
      const exactAt = typeof aspect.exactAt === "string" ? aspect.exactAt : null;
      const exactToday = exactAt !== null && localDateForIso(exactAt, timezone) === localDate;
      const eventKey = left + "|" + kind + "|" + right + "|" + (exactAt ?? "");
      if (aspectEventKeys.has(eventKey)) return;
      aspectEventKeys.add(eventKey);
      pushFact({
        sourceRef: localDate + ":aspect:" + index + ":" + left + ":" + kind + ":" + right,
        suggestedContentType: exactToday ? "sky_priority_aspect" : "educational_aspect",
        suggestedScheduleAt: exactToday ? exactAt : null,
        priority: exactToday ? 30 : 20,
        facts: { type: "aspect", eventRole: exactToday ? "exact_today" : "active_today", exactToday, aspect: { ...aspect }, occurredAt: exactToday ? exactAt : null, priority: exactToday ? 30 : 20 },
        sourceProvenance: provenance("aspect", [left, right], { aspectKind: kind, aspectPhase: aspect.phase ?? null, exactAt }),
      });
    });

    asHalleusArray(day.planetaryStates).forEach((rawState) => {
      const state = asHalleusRecord(rawState);
      if (!state || typeof state.body !== "string") return;
      const motion = typeof state.motion === "string" ? state.motion : "direct";
      const nearStation = state.nearStation === true;
      if (motion === "direct" && !nearStation) return;
      pushFact({
        sourceRef: localDate + ":motion:" + state.body,
        suggestedContentType: nearStation ? "sky_station" : "educational_retrograde",
        suggestedScheduleAt: null,
        priority: nearStation ? 25 : 15,
        facts: { type: nearStation ? "station_watch" : "motion_state", eventRole: nearStation ? "active_today" : "supporting_state", ...state },
        sourceProvenance: provenance("planetary_state", [state.body]),
      });
    });
    day.contentFacts = contentFacts;
  }
  root.smartDailyAiBriefVersion = "halleus-smart-daily-ai-brief-v3";
  return pack;
}


export function buildTelegramSmartTransitPack(
  ...args: Parameters<typeof __halleusSmartDailyBase_buildTelegramSmartTransitPack>
): ReturnType<typeof __halleusSmartDailyBase_buildTelegramSmartTransitPack> {
  return enhanceHalleusSmartDailyPack(
    __halleusSmartDailyBase_buildTelegramSmartTransitPack(...args),
  ) as ReturnType<typeof __halleusSmartDailyBase_buildTelegramSmartTransitPack>;
}
