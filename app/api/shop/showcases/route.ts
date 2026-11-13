import { NextResponse } from "next/server";
import { isShowcaseSurface, listPublicSurfaceOffers } from "@/lib/shop/shop-showcase-surfaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const surface = params.get("surface");
  if (params.size !== 1 || !isShowcaseSurface(surface)) {
    return new Response(null, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ ok: true, offers: await listPublicSurfaceOffers(surface) },
    { headers: { "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff" } });
}
