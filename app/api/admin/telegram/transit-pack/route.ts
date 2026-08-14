import {
  AdminAccessError,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import { adminErrorResponse } from "@/lib/admin/admin-http";
import { getTelegramAiContentConfig } from "@/lib/telegram/telegram-content-config";
import {
  TelegramContentPackValidationError,
  buildTelegramSmartTransitPack,
} from "@/lib/telegram/telegram-content-pack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SMART_FEATURES = [
  "moon_phase",
  "planetary_states",
  "motion",
  "aspects",
  "ingress",
  "station",
  "context",
] as const;
const SMART_BODIES = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
] as const;
const SMART_ASPECT_KINDS = [
  "conjunction",
  "sextile",
  "square",
  "trine",
  "opposition",
] as const;
const SMART_ASPECT_PHASES = [
  "applying",
  "exact",
  "separating",
] as const;

type SmartRecord = Record<string, unknown>;

function smartRecord(value: unknown): SmartRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as SmartRecord)
    : null;
}

function smartText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readSelection(
  url: URL,
  name: string,
  allowed: readonly string[],
) {
  if (!url.searchParams.has(name)) return new Set(allowed);
  return new Set(
    (url.searchParams.get(name) ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => allowed.includes(value)),
  );
}

function bodyAllowed(value: unknown, bodies: Set<string>) {
  const body = smartText(value);
  return !body || bodies.has(body);
}

function aspectAllowed(
  value: unknown,
  bodies: Set<string>,
  kinds: Set<string>,
  phases: Set<string>,
) {
  const aspect = smartRecord(value);
  if (!aspect) return false;
  return (
    bodies.has(smartText(aspect.leftBody)) &&
    bodies.has(smartText(aspect.rightBody)) &&
    kinds.has(smartText(aspect.kind)) &&
    phases.has(smartText(aspect.phase))
  );
}

function filterSmartTransitPack<T>(
  pack: T,
  input: {
    features: Set<string>;
    bodies: Set<string>;
    aspectKinds: Set<string>;
    aspectPhases: Set<string>;
    aspectLimit: 12 | "all";
  },
): T {
  const clone = JSON.parse(JSON.stringify(pack)) as T;
  const root = smartRecord(clone);
  if (!root) return clone;

  for (const rawDay of Array.isArray(root.days) ? root.days : []) {
    const day = smartRecord(rawDay);
    if (!day) continue;

    if (!input.features.has("moon_phase")) {
      day.moonPhase = null;
    }

    if (Array.isArray(day.planetaryStates)) {
      day.planetaryStates = day.planetaryStates.filter((rawState) => {
        const state = smartRecord(rawState);
        if (!state || !input.bodies.has(smartText(state.body))) return false;
        if (input.features.has("planetary_states")) return true;
        return (
          input.features.has("motion") &&
          (smartText(state.motion) !== "direct" || state.nearStation === true)
        );
      });
    }

    if (Array.isArray(day.aspects)) {
      day.aspects = day.aspects.filter((rawAspect) =>
        input.features.has("aspects")
          ? aspectAllowed(
              rawAspect,
              input.bodies,
              input.aspectKinds,
              input.aspectPhases,
            )
          : false,
      );
    }

    if (Array.isArray(day.timeline)) {
      day.timeline = day.timeline.filter((rawEvent) => {
        const event = smartRecord(rawEvent);
        if (!event) return false;
        const type = smartText(event.type);
        if (type === "ingress") {
          return (
            input.features.has("ingress") &&
            bodyAllowed(event.body, input.bodies)
          );
        }
        if (type === "station") {
          return (
            input.features.has("station") &&
            bodyAllowed(event.body, input.bodies)
          );
        }
        if (type === "aspect") {
          return (
            input.features.has("aspects") &&
            aspectAllowed(
              event.aspect,
              input.bodies,
              input.aspectKinds,
              input.aspectPhases,
            )
          );
        }
        return true;
      });
    }

    if (Array.isArray(day.contentFacts)) {
      day.contentFacts = day.contentFacts.filter((rawFact) => {
        const fact = smartRecord(rawFact);
        if (!fact) return false;
        const contentType = smartText(fact.suggestedContentType);
        const facts = smartRecord(fact.facts);
        const provenance = smartRecord(fact.sourceProvenance);
        const relatedBodies =
          provenance && Array.isArray(provenance.relatedBodies)
            ? provenance.relatedBodies.map(smartText).filter(Boolean)
            : [];

        if (contentType === "sky_moon_phase") {
          return input.features.has("moon_phase");
        }
        if (contentType === "sky_moon_position") {
          return (
            input.features.has("planetary_states") &&
            input.bodies.has("moon")
          );
        }
        if (contentType === "sky_planetary_state") {
          if (!input.features.has("planetary_states")) return false;
        } else if (contentType === "educational_retrograde") {
          if (!input.features.has("motion")) return false;
        } else if (contentType === "sky_ingress") {
          if (!input.features.has("ingress")) return false;
        } else if (contentType === "sky_station") {
          const stationWatch = smartText(facts?.type) === "station_watch";
          if (
            stationWatch
              ? !input.features.has("motion")
              : !input.features.has("station")
          ) {
            return false;
          }
        } else if (
          contentType === "sky_priority_aspect" ||
          contentType === "educational_aspect"
        ) {
          if (!input.features.has("aspects")) return false;
          const aspect =
            facts && smartText(facts.type) === "aspect"
              ? smartRecord(facts.aspect)
              : facts;
          if (
            !aspectAllowed(
              aspect,
              input.bodies,
              input.aspectKinds,
              input.aspectPhases,
            )
          ) {
            return false;
          }
        }

        return (
          relatedBodies.length === 0 ||
          relatedBodies.some((body) => input.bodies.has(body))
        );
      });
    }
  }

  const context = smartRecord(root.context);
  if (context) {
    if (!input.features.has("context")) {
      context.lookbackSummary = [];
      context.lookaheadSummary = [];
    } else {
      for (const key of ["lookbackSummary", "lookaheadSummary"]) {
        const days = Array.isArray(context[key]) ? context[key] : [];
        for (const rawDay of days) {
          const day = smartRecord(rawDay);
          if (!day || day.available !== true) continue;
          if (Array.isArray(day.motion)) {
            day.motion = day.motion.filter((rawMotion) => {
              const motion = smartRecord(rawMotion);
              return (
                input.features.has("motion") &&
                motion !== null &&
                input.bodies.has(smartText(motion.body))
              );
            });
          }
          if (Array.isArray(day.closeAspects)) {
            day.closeAspects = day.closeAspects.filter((rawAspect) =>
              input.features.has("aspects")
                ? aspectAllowed(
                    rawAspect,
                    input.bodies,
                    input.aspectKinds,
                    input.aspectPhases,
                  )
                : false,
            );
          }
          if (Array.isArray(day.timeline)) {
            day.timeline = day.timeline.filter((rawEvent) => {
              const event = smartRecord(rawEvent);
              if (!event) return false;
              const type = smartText(event.type);
              if (type === "ingress") {
                return (
                  input.features.has("ingress") &&
                  bodyAllowed(smartRecord(event.facts)?.body, input.bodies)
                );
              }
              if (type === "station") {
                return (
                  input.features.has("station") &&
                  bodyAllowed(smartRecord(event.facts)?.body, input.bodies)
                );
              }
              if (type === "aspect") {
                return (
                  input.features.has("aspects") &&
                  aspectAllowed(
                    smartRecord(event.facts)?.aspect,
                    input.bodies,
                    input.aspectKinds,
                    input.aspectPhases,
                  )
                );
              }
              return true;
            });
          }
        }
      }
    }
  }

  root.adminDataSelection = {
    scope: "public_sky_only",
    features: [...input.features],
    bodies: [...input.bodies],
    aspectKinds: [...input.aspectKinds],
    aspectPhases: [...input.aspectPhases],
    aspectLimit: input.aspectLimit,
  };

  return clone;
}

// HALLEUS_TELEGRAM_TRANSIT_PACK_CONTENT_CONFIG_R1
export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "telegram.read");
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate") ?? "";
    const endDate = url.searchParams.get("endDate") ?? "";
    const city = url.searchParams.get("city") ?? "تهران";
    const aspectLimit: 12 | "all" =
      url.searchParams.get("aspectLimit") === "all" ? "all" : 12;
    const selection = {
      features: readSelection(url, "features", SMART_FEATURES),
      bodies: readSelection(url, "bodies", SMART_BODIES),
      aspectKinds: readSelection(
        url,
        "aspectKinds",
        SMART_ASPECT_KINDS,
      ),
      aspectPhases: readSelection(
        url,
        "aspectPhases",
        SMART_ASPECT_PHASES,
      ),
      aspectLimit,
    };
    let pack;
    try {
      pack = buildTelegramSmartTransitPack({
        startDate,
        endDate,
        city,
        aspectLimit,
      });
    } catch (error) {
      if (error instanceof TelegramContentPackValidationError) {
        throw new AdminAccessError(400, error.message);
      }
      throw error;
    }

    const selectedPack = filterSmartTransitPack(pack, selection);
    const contentConfig = await getTelegramAiContentConfig();
    const packWithContentDirection = {
      ...selectedPack,
      aiContentConfigVersion: contentConfig.version,
      aiContentInstructions: {
        version: contentConfig.version,
        editableScope: "content_style_volume_and_mix_only",
        settings: contentConfig.settings,
        rawPrompt: contentConfig.rawPrompt,
        immutableEngineRules: [
          "Engine facts/contentFacts are read-only.",
          "Do not change sourceRef, sourceProvenance, event time, exactAt or calculated sky data.",
          "Existing safety, temporal consistency, CTA caps and output contract rules remain authoritative.",
        ],
        outputPackageRule:
          "Preserve aiContentConfigVersion on the generated content package root so Halleus can record which saved instruction version produced it.",
      },
    };

    const filename = `Halleus-Telegram-Transit-Pack-${pack.range.startDate}-to-${pack.range.endDate}.json`;
    return new Response(JSON.stringify(packWithContentDirection, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return adminErrorResponse(error, "ساخت بستهٔ هوشمند تلگرام ناموفق بود.");
    }
    const detail =
      error instanceof Error && error.message
        ? error.message.slice(0, 500)
        : "علت فنی نامشخص است.";
    return adminErrorResponse(
      new AdminAccessError(
        500,
        `ساخت بستهٔ هوشمند تلگرام ناموفق بود: ${detail} هیچ فایلی ساخته نشد. تاریخ شروع، پایان و شهر را بررسی کن؛ اگر دوباره رخ داد همین متن کامل خطا را بفرست.`,
      ),
      "ساخت بستهٔ هوشمند تلگرام ناموفق بود.",
    );
  }
}
