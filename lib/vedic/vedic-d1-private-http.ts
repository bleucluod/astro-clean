import type { VedicD1InputResult, VedicD1ValidatedBirth } from './vedic-d1-contract.ts';
import type { VedicD1FreeReading } from './vedic-d1-reading-contract.ts';

export type SavedVedicD1 = {
  id: string; name: string; createdAt: string; reading: VedicD1FreeReading;
  payment?: {status:'locked'|'pending'|'paid'; amountToman:number|null; factor:string|null};
  manuscript?: {writerRulesVersion:string;chapters:readonly {id:string;title:string;paragraphsFa:readonly string[]}[]};
};
export type VedicD1PrivateDependencies = {
  ready: () => boolean;
  authenticate: (authorization: string | null) => Promise<{id: string} | null>;
  resolve: (input: unknown) => VedicD1InputResult;
  save: (owner: string, birth: VedicD1ValidatedBirth, name: string) => Promise<SavedVedicD1>;
  get: (owner: string, id: string) => Promise<SavedVedicD1 | null>;
  list: (owner: string, offset: number) => Promise<SavedVedicD1[]>;
};
const headers = {'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache',
  'Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'};
const reply = (status: number, body: unknown) => Response.json(body, {status, headers});
const failure = (status: number, code: string) => reply(status, {ok:false, code});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowed = new Set(['calendar','birthDate','birthTime','cityId','occurrence','displayName','consent']);
const LIMIT = 4096;

async function readBody(request: Request): Promise<unknown> {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > LIMIT)) throw new Error('SIZE');
  if (!request.body) throw new Error('JSON');
  const reader = request.body.getReader();
  const bytes = new Uint8Array(LIMIT);
  let length = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      if (length + chunk.value.byteLength > LIMIT) {
        void reader.cancel().catch(() => {});
        throw new Error('SIZE');
      }
      bytes.set(chunk.value,length);
      length += chunk.value.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,length)));
  } finally { reader.releaseLock(); }
}

/** Never include private manuscript, raw birth fields or caller-supplied owner in a response. */
function safe(report: SavedVedicD1, includeFull = false) {
  const r = report.reading;
  return {id:report.id,name:report.name,createdAt:report.createdAt,purchaseStatus:report.payment?.status ?? 'locked',
    amountToman:report.payment?.amountToman??null, factor:report.payment?.factor??null,
    ...(includeFull && report.payment?.status==='paid' && report.manuscript ? {manuscript:{writerRulesVersion:report.manuscript.writerRulesVersion,chapters:report.manuscript.chapters.map(({id,title,paragraphsFa})=>({id,title,paragraphsFa}))}} : {}),
    reading:{responseVersion:r.responseVersion,kind:r.kind,view:r.view,
      shortReading:r.shortReading,availablePremiumChapterTitles:r.availablePremiumChapterTitles,
      premiumPreview:r.premiumPreview,premiumStatus:'not-available'}};
}

export async function handleVedicD1Private(request: Request, deps: VedicD1PrivateDependencies): Promise<Response> {
  if (!deps.ready()) return failure(503,'STORAGE_DISABLED');
  if (!['GET','POST'].includes(request.method)) return failure(405,'METHOD_NOT_ALLOWED');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return failure(403,'ORIGIN');
  const auth = request.headers.get('authorization');
  if (!auth || !/^Bearer\s+\S+$/i.test(auth)) return failure(401,'AUTH_REQUIRED');
  let owner: string;
  try {
    const user = await deps.authenticate(auth);
    if (!user || !UUID.test(user.id)) return failure(401,'AUTH_REQUIRED');
    owner = user.id;
  } catch { return failure(401,'AUTH_REQUIRED'); }
  try {
    if (request.method === 'GET') {
      const params = new URL(request.url).searchParams;
      if ([...params.keys()].some(key => key !== 'id' && key !== 'page') ||
          params.getAll('id').length > 1 || params.getAll('page').length > 1 ||
          (params.has('id') && params.has('page'))) return failure(400,'INVALID_REQUEST');
      const id = params.get('id');
      if (id !== null) {
        if (!UUID.test(id)) return failure(400,'INVALID_REQUEST');
        const report = await deps.get(owner,id);
        return report ? reply(200,{ok:true,report:safe(report,true)}) : failure(404,'NOT_FOUND');
      }
      const page = params.get('page') ?? '1';
      if (!/^[1-9]\d{0,3}$/.test(page)) return failure(400,'INVALID_REQUEST');
      const reports = await deps.list(owner,(Number(page)-1)*20);
      return reply(200,{ok:true,reports:reports.slice(0,20).map(report=>safe(report)),hasMore:reports.length>20});
    }
    if (!/^application\/json(?:\s*;\s*charset\s*=\s*"?utf-8"?)?\s*$/i.test(request.headers.get('content-type') ?? ''))
      return failure(415,'INVALID_CONTENT_TYPE');
    let body: unknown;
    try { body = await readBody(request); }
    catch (e) { return e instanceof Error && e.message==='SIZE' ? failure(413,'TOO_LARGE') : failure(400,'INVALID_JSON'); }
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        Object.keys(body).some(key=>!allowed.has(key))) return failure(400,'INVALID_REQUEST');
    const {displayName,consent,...birthInput} = body as Record<string,unknown>;
    if (consent !== true || typeof displayName !== 'string' ||
        !displayName.trim() || displayName.trim().length>60) return failure(400,'CONSENT_OR_NAME_REQUIRED');
    const validated = deps.resolve(birthInput);
    if (!validated.ok) return failure(400,validated.issue.code);
    const report = await deps.save(owner,validated.value,displayName.trim());
    return reply(200,{ok:true,report:safe(report)});
  } catch { return failure(503,'STORAGE_UNAVAILABLE'); }
}
