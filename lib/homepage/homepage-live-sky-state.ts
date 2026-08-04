import type { SkyPublicDeliveryResult } from "@/lib/sky-public/sky-public-delivery";

export type HomepageSkyState =
  | { status: "ready" | "partial" | "stale"; result: Extract<SkyPublicDeliveryResult, { status: "ready" }> }
  | { status: "unavailable"; result: null; message: string };

export function resolveHomepageSkyState(
  result: SkyPublicDeliveryResult | null,
): HomepageSkyState {
  if (!result || result.status !== "ready") {
    return {
      status: "unavailable",
      result: null,
      message:
        result && "message" in result
          ? result.message
          : "دادهٔ معتبر آسمان در این لحظه در دسترس نیست.",
    };
  }

  const { snapshot } = result;
  if (
    result.requestedDate !== result.currentLocalDate ||
    snapshot.input.localDate !== result.currentLocalDate
  ) {
    return { status: "stale", result };
  }

  if (
    snapshot.qualityFlags.includes("calculation_unavailable") ||
    snapshot.errors.some((error) => error.code === "CALCULATION_FAILED" || error.code === "SOURCE_UNAVAILABLE")
  ) {
    return {
      status: "unavailable",
      result: null,
      message: "محاسبهٔ معتبر آسمان در این لحظه کامل نشده است.",
    };
  }

  if (
    snapshot.qualityFlags.includes("partial_result") ||
    snapshot.errors.length > 0 ||
    !snapshot.moonPhase ||
    !snapshot.planetaryStates.some((state) => state.body === "moon")
  ) {
    return { status: "partial", result };
  }

  return { status: "ready", result };
}
