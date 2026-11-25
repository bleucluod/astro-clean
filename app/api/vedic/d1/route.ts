/** Dedicated Vedic D1 endpoint; isolated from /api/engine/real-chart. */
import * as Astronomy from 'astronomy-engine';
import { isTrustedAdminRequestOrigin } from '@/lib/admin/admin-origin';
import { getHalleusRuntimeEnv } from '@/lib/config/env';
import { handleVedicD1Post } from '@/lib/vedic/vedic-d1-http';
import { parseHalleusVedicD1Birth } from '@/lib/vedic/vedic-d1-birth-adapter';
import { calculateVedicD1GuestReading } from '@/lib/vedic/vedic-d1-server-reading';
import type { VedicAstronomyEnginePort } from '@/lib/vedic/vedic-d1-astronomy-port';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function POST(request: Request): Promise<Response> {
  if (!isTrustedAdminRequestOrigin(request,getHalleusRuntimeEnv().siteUrl)) {
    return Promise.resolve(Response.json({ok:false,code:'ORIGIN'},{status:403,headers:{'Cache-Control':'private, no-store, max-age=0'}}));
  }
  return handleVedicD1Post(
    request,
    parseHalleusVedicD1Birth,
    birth => calculateVedicD1GuestReading(birth, Astronomy as unknown as VedicAstronomyEnginePort),
    async (birth,name)=>(await import('@/lib/vedic/vedic-d1-auto-save')).autoSaveVedicD1(request,birth,name),
  );
}
