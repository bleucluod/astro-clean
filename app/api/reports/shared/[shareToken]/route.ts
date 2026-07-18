import { NextResponse } from "next/server";
import { getSharedReport } from "@/lib/reports/report-access-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ shareToken: string }> }) {
  const { shareToken } = await context.params;
  if (!/^[A-Za-z0-9_-]{40,100}$/u.test(shareToken)) return NextResponse.json({ ok: false, error: "Shared report was not found." }, { status: 404, headers: { "cache-control": "private, no-store" } });
  try {
    const report = await getSharedReport(shareToken);
    if (!report) return NextResponse.json({ ok: false, error: "Shared report was not found." }, { status: 404, headers: { "cache-control": "private, no-store" } });
    return NextResponse.json({ ok: true, report }, { headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Shared report could not be loaded." }, { status: 500, headers: { "cache-control": "private, no-store" } });
  }
}
