/**
 * Vedic D1 privacy-preserving POST boundary.
 * The caller must supply a server-side certified calculator explicitly;
 * without one the route still fails closed with 503.
 */
import type { VedicD1InputResult, VedicD1ValidatedBirth } from './vedic-d1-contract.ts';
import { VEDIC_D1_READING_VERSION, VEDIC_D1_PREMIUM_CHAPTERS, isVedicD1PremiumPreview, type VedicD1FreeReading } from './vedic-d1-reading-contract.ts';

export const VEDIC_D1_HTTP_VERSION = 'vedic-d1-http/v1' as const;
export const VEDIC_D1_MAX_BODY_BYTES = 4096;
const ALLOWED_FIELDS = new Set(['calendar', 'birthDate', 'birthTime', 'cityId', 'occurrence']);

export type VedicD1BirthResolver = (input: unknown) => VedicD1InputResult;
/** Kept server-only: never accept a calculation or a chart from browser input. */
export type VedicD1FreeCalculator = (birth: VedicD1ValidatedBirth) =>
  VedicD1FreeReading | Promise<VedicD1FreeReading>;

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Pragma': 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
} as const;

type ErrorCode =
  | 'UNSUPPORTED_MEDIA_TYPE' | 'PAYLOAD_TOO_LARGE' | 'INVALID_JSON'
  | 'INVALID_REQUEST' | 'INPUT_INVALID' | 'CALCULATION_NOT_READY';

function reply(status: number, code: ErrorCode, message: string, issue?: string): Response {
  return Response.json(
    { ok: false, code, message, ...(issue ? { issue } : {}) },
    { status, headers: PRIVATE_HEADERS },
  );
}

async function readLimitedJson(request: Request): Promise<{ ok: true; body: unknown } | { ok: false; status: number; code: ErrorCode; message: string }> {
  if (!/^application\/json(?:\s*;\s*charset\s*=\s*"?utf-8"?)?\s*$/i.test(request.headers.get('content-type') ?? '')) {
    return { ok: false, status: 415, code: 'UNSUPPORTED_MEDIA_TYPE', message: 'فرمت درخواست باید JSON باشد.' };
  }
  const statedLength = request.headers.get('content-length');
  if (statedLength !== null) {
    const length = Number(statedLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      return { ok: false, status: 400, code: 'INVALID_REQUEST', message: 'طول درخواست معتبر نیست.' };
    }
    if (length > VEDIC_D1_MAX_BODY_BYTES) {
      return { ok: false, status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'حجم درخواست بیش از حد مجاز است.' };
    }
  }
  if (!request.body) {
    return { ok: false, status: 400, code: 'INVALID_JSON', message: 'اطلاعات تولد وارد نشده است.' };
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      received += next.value.byteLength;
      if (received > VEDIC_D1_MAX_BODY_BYTES) {
        // Best-effort cancellation only; never log/echo the incoming body.
        void reader.cancel().catch(() => {});
        return { ok: false, status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'حجم درخواست بیش از حد مجاز است.' };
      }
      chunks.push(next.value);
    }
  } catch {
    return { ok: false, status: 400, code: 'INVALID_REQUEST', message: 'خواندن درخواست ممکن نشد.' };
  } finally {
    reader.releaseLock();
  }
  try {
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { ok: true, body: JSON.parse(decoded) as unknown };
  } catch {
    return { ok: false, status: 400, code: 'INVALID_JSON', message: 'قالب JSON معتبر نیست.' };
  }
}

/**
 * Successful response has only the free reading; raw birth, UTC, city,
 * premium draft and owner data are never serialized or cached.
 */
export async function handleVedicD1Post(
  request: Request,
  resolveBirth: VedicD1BirthResolver,
  calculateFree?: VedicD1FreeCalculator,
  saveNamed?: (birth:VedicD1ValidatedBirth,name:string)=>Promise<{reading:VedicD1FreeReading;cookie?:string;reportId?:string}>,
): Promise<Response> {
  const parsed = await readLimitedJson(request);
  if (!parsed.ok) return reply(parsed.status, parsed.code, parsed.message);
  if (!parsed.body || typeof parsed.body !== 'object' || Array.isArray(parsed.body) ||
      Object.keys(parsed.body).some(key => !ALLOWED_FIELDS.has(key) && !(key==='displayName'&&saveNamed))) {
    return reply(400, 'INVALID_REQUEST', 'فقط اطلاعات ضروری تولد را ارسال کن.');
  }
  const {displayName,...birthInput}=parsed.body as Record<string,unknown>;
  if(displayName!==undefined&&(typeof displayName!=='string'||!displayName.trim()||displayName.trim().length>60))
    return reply(400,'INVALID_REQUEST','نام معتبر وارد کن.');
  let validated: VedicD1InputResult;
  try {
    validated = resolveBirth(birthInput);
  } catch {
    // Do not echo internal errors or input data from date/city resolution.
    return reply(503, 'CALCULATION_NOT_READY', 'محاسبهٔ چارت ودیک فعلاً در دسترس نیست.');
  }
  if (!validated.ok) {
    return reply(400, 'INPUT_INVALID', validated.issue.message, validated.issue.code);
  }
  if (!calculateFree) {
    return reply(503, 'CALCULATION_NOT_READY', 'محاسبهٔ دقیق چارت ودیک هنوز فعال نشده است.');
  }
  try {
    const saved=typeof displayName==='string'&&saveNamed?await saveNamed(validated.value,displayName.trim()):null;
    const reading = saved?.reading ?? await calculateFree(validated.value);
    if (!reading || reading.kind !== 'free-d1' ||
        reading.responseVersion !== VEDIC_D1_READING_VERSION ||
        reading.premiumStatus !== 'not-available' ||
        !reading.view || !Array.isArray(reading.view.rows) ||
        reading.view.rows.length !== 9 ||
        !reading.shortReading || typeof reading.shortReading.textFa !== 'string') {
      throw new Error('VEDIC_D1_INVALID_FREE_RESULT');
    }
    // Strict top-level allowlist. Do not serialize whole chart objects,
    // caller birth fields, hidden chapters or any extra calculator keys.
    const safeReading: VedicD1FreeReading = {
      responseVersion: reading.responseVersion,
      kind: 'free-d1',
      view: reading.view,
      shortReading: reading.shortReading,
      availablePremiumChapterTitles: VEDIC_D1_PREMIUM_CHAPTERS.map(chapter => chapter.title),
      premiumPreview: isVedicD1PremiumPreview(reading.premiumPreview)
        ? reading.premiumPreview.map(({ id, title, excerptFa }) => ({ id, title, excerptFa }))
        : null,
      premiumStatus: 'not-available',
    };
    const reportId=saved?.reportId;
    if(reportId!==undefined&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId))throw Error('INVALID_REPORT_ID');
    const response=Response.json({ ok: true, reading: safeReading,...(reportId?{reportId}:{}) }, { status: 200, headers: PRIVATE_HEADERS });
    if(saved?.cookie)response.headers.append('Set-Cookie',saved.cookie);
    return response;
  } catch {
    // Input/owner/provider details and internal errors never enter the payload.
    return reply(503, 'CALCULATION_NOT_READY', 'محاسبهٔ چارت ودیک فعلاً در دسترس نیست.');
  }
}
