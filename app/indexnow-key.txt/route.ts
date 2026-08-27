import { getHalleusRuntimeEnv } from "@/lib/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const key = getHalleusRuntimeEnv().indexNowKey;

  if (!key) {
    return new Response("IndexNow is not configured.", {
      status: 404,
      headers: {
        "cache-control": "private, no-store",
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response(`${key}\n`, {
    headers: {
      "cache-control": "public, max-age=300",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}