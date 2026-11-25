/** Development-only localhost D1 manuscript preview. Production is always 404. */
import * as Astronomy from 'astronomy-engine';
import { parseHalleusVedicD1Birth } from '@/lib/vedic/vedic-d1-birth-adapter';
import { calculateVedicD1Chart } from '@/lib/vedic/vedic-d1-server-reading';
import { buildVedicD1PrivateManuscriptDraft } from '@/lib/vedic/vedic-d1-premium-writer';
import type { VedicAstronomyEnginePort } from '@/lib/vedic/vedic-d1-astronomy-port';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
const HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Pragma': 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const;
const INPUTS = new Set(['calendar', 'birthDate', 'birthTime', 'cityId', 'occurrence', 'displayName']);
const isLoopback = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const host = (request.headers.get('host') ?? '').split(':')[0];
  if (process.env.NODE_ENV !== 'development' || !isLoopback(url.hostname) ||
      !(isLoopback(host) || request.headers.get('host')?.startsWith('[::1]:'))) {
    return Response.json({ok:false}, {status:404, headers:HEADERS});
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) {
    return Response.json({ok:false}, {status:403, headers:HEADERS});
  }
  if (!/^application\/json(?:\s*;.*)?$/i.test(request.headers.get('content-type') ?? '')) {
    return Response.json({ok:false}, {status:415, headers:HEADERS});
  }
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (!Number.isSafeInteger(declared) || declared < 0 || declared > 4096) {
    return Response.json({ok:false}, {status:413, headers:HEADERS});
  }
  let input: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 4096) {
      return Response.json({ok:false}, {status:413, headers:HEADERS});
    }
    input = JSON.parse(body);
  } catch {
    return Response.json({ok:false}, {status:400, headers:HEADERS});
  }
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !INPUTS.has(key))) {
    return Response.json({ok:false}, {status:400, headers:HEADERS});
  }
  const fields = input as Record<string, unknown>;
  if (fields.displayName !== undefined &&
      (typeof fields.displayName !== 'string' || fields.displayName.trim().length > 60)) {
    return Response.json({ok:false}, {status:400, headers:HEADERS});
  }
  try {
    const validated = parseHalleusVedicD1Birth(fields);
    if (!validated.ok) {
      return Response.json({ok:false, issue:validated.issue.code},
        {status:400, headers:HEADERS});
    }
    const chart = calculateVedicD1Chart(
      validated.value, Astronomy as unknown as VedicAstronomyEnginePort);
    const draft = buildVedicD1PrivateManuscriptDraft(chart, {
      displayName: typeof fields.displayName === 'string' ? fields.displayName.trim() : '',
    });
    return Response.json({ok:true, manuscript:{
      writerRulesVersion:draft.writerRulesVersion,
      chapters:draft.chapters.map(chapter => ({
        id:chapter.id, title:chapter.title, paragraphsFa:chapter.paragraphsFa,
      })),
    }}, {status:200, headers:HEADERS});
  } catch {
    return Response.json({ok:false}, {status:503, headers:HEADERS});
  }
}
