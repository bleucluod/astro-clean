import { NextResponse } from "next/server";
import { buildTehranMoonPulse } from "@/lib/sky-pulse/tehran-moon-pulse";
import { buildSkyPulsePersianInterpretation } from "@/lib/sky-pulse/sky-pulse-persian-interpretation";
import {
  calculateSkyPulseHomepageTransit,
  getTehranTransitLocalDate,
} from "@/src/lib/chart/sky-only-transit-probe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const now = new Date();
    const localDate = getTehranTransitLocalDate(now);
    const pulse = buildTehranMoonPulse(now);
    const transit = calculateSkyPulseHomepageTransit(localDate);
    const interpretation = buildSkyPulsePersianInterpretation(transit);

    return NextResponse.json(
      {
        ...pulse,
        transit: {
          ...transit,
          interpretation,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "sky_pulse_today_failed",
        message: error instanceof Error ? error.message : "Sky Pulse calculation failed.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
