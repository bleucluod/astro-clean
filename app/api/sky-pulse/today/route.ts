import { NextResponse } from "next/server";
import { buildTehranMoonPulse } from "@/lib/sky-pulse/tehran-moon-pulse";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const pulse = buildTehranMoonPulse(new Date());

    return NextResponse.json(pulse, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "tehran_moon_pulse_failed",
        message: error instanceof Error ? error.message : "Moon pulse calculation failed.",
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
