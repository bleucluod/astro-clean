import {
  buildPlainDailyAspectInterpretation,
  buildPlainDailyPlacementInterpretation,
} from "@/lib/astrology/report-behavioral-interpretation";
import type {
  SkyDailyAspect,
  SkyDailyBodyId,
  SkyDailySnapshot,
} from "@/lib/sky-daily/sky-daily-contract";

export const SKY_PUBLIC_REPORT_INTERPRETATION_SOURCE =
  "report-behavioral-interpretation" as const;

export type SkyPublicReportInterpretation = {
  source: typeof SKY_PUBLIC_REPORT_INTERPRETATION_SOURCE;
  summary: string;
  planetReadings: Record<SkyDailyBodyId, string>;
  aspectReadings: Record<string, string>;
};

export function buildSkyPublicReportInterpretation(
  snapshot: SkyDailySnapshot,
): SkyPublicReportInterpretation {
  const retrogradePlanetIds = snapshot.planetaryStates
    .filter((state) => state.motion === "retrograde")
    .map((state) => state.body);
  const stateByBody = new Map(
    snapshot.planetaryStates.map((state) => [state.body, state]),
  );
  const planetReadings = Object.fromEntries(
    snapshot.planetaryStates.map((state) => {
      const reading = buildPlainDailyPlacementInterpretation({
        planetId: state.body,
        signId: state.sign,
        retrograde: state.motion === "retrograde",
        audienceMode: "adult",
      });

      return [state.body, reading];
    }),
  ) as Record<SkyDailyBodyId, string>;
  const aspectReadings = Object.fromEntries(
    snapshot.aspects.map((aspect) => {
      const firstState = stateByBody.get(aspect.leftBody);
      const secondState = stateByBody.get(aspect.rightBody);
      const reading = buildPlainDailyAspectInterpretation({
        firstPlanetId: aspect.leftBody,
        secondPlanetId: aspect.rightBody,
        firstSignId: firstState?.sign,
        secondSignId: secondState?.sign,
        aspectId: aspect.kind,
        orb: aspect.orb,
        retrogradePlanetIds,
        audienceMode: "adult",
      });

      return [aspectKey(aspect), reading];
    }),
  );
  const moonReading = planetReadings.moon;
  const leadAspectReading = snapshot.aspects[0]
    ? aspectReadings[aspectKey(snapshot.aspects[0])]
    : undefined;

  return {
    source: SKY_PUBLIC_REPORT_INTERPRETATION_SOURCE,
    summary: [leadAspectReading, moonReading].filter(Boolean).join(" "),
    planetReadings,
    aspectReadings,
  };
}

export function skyPublicAspectKey(aspect: SkyDailyAspect) {
  return aspectKey(aspect);
}

function aspectKey(aspect: SkyDailyAspect) {
  return `${aspect.leftBody}:${aspect.kind}:${aspect.rightBody}`;
}
