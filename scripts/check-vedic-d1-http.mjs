/** Portable privacy and fail-closed boundary checks; no app/Next dependency. */
import assert from 'node:assert/strict';
import { handleVedicD1Post, VEDIC_D1_MAX_BODY_BYTES } from '../lib/vedic/vedic-d1-http.ts';
import { validateVedicD1BirthRequest } from '../lib/vedic/vedic-d1-contract.ts';

const deps = {
  findCityById(id) {
    return id === 'af-kabul' ? { id, name: 'کابل', latitude: 34.5553, longitude: 69.2075, timezone: 'Asia/Kabul' } : null;
  },
  parseJalali(date) {
    return date === '1375/05/22' ? { ok: true, gregorianIso: '1996-08-12' } : { ok: false, message: 'تاریخ شمسی معتبر نیست.' };
  },
};
let invoked = 0;
const resolveBirth = input => { invoked++; return validateVedicD1BirthRequest(input, deps); };
const good = { calendar: 'gregorian', birthDate: '1996-08-12', birthTime: '11:30', cityId: 'af-kabul' };
function request(content, contentType = 'application/json') {
  return new Request('https://halleus.invalid/api/vedic/d1', {
    method: 'POST', headers: { 'Content-Type': contentType }, body: content,
  });
}
async function verify(content, expectedStatus, expectedCode, contentType) {
  const response = await handleVedicD1Post(request(content, contentType), resolveBirth);
  assert.equal(response.status, expectedStatus, `${expectedCode}: status`);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0');
  assert.equal(response.headers.get('Pragma'), 'no-cache');
  assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  const text = await response.text();
  const body = JSON.parse(text);
  assert.equal(body.ok, false);
  assert.equal(body.code, expectedCode);
  assert.equal('chart' in body, false);
  assert.equal('utcIso' in body, false);
  assert.equal('city' in body, false);
  assert.equal('report' in body, false);
  assert.equal(text.includes('1996-08-12'), false);
  assert.equal(text.includes('af-kabul'), false);
  return body;
}
await verify(JSON.stringify(good), 503, 'CALCULATION_NOT_READY');
const firstCount = invoked;
assert.equal(firstCount, 1);
await verify(JSON.stringify({...good,calendar:'jalali',birthDate:'۱۳۷۵/۰۵/۲۲',birthTime:'۱۱:۳۰'}),503,'CALCULATION_NOT_READY');
await verify(JSON.stringify({...good,cityId:'wrong-id'}),400,'INPUT_INVALID');
await verify(JSON.stringify({...good,birthTime:''}),400,'INPUT_INVALID');
await verify(JSON.stringify({...good,birthDate:'1996-02-30'}),400,'INPUT_INVALID');
await verify(JSON.stringify({...good,latitude:0,longitude:0,timezone:'UTC'}),400,'INVALID_REQUEST');
await verify(JSON.stringify({...good,name:'Person A'}),400,'INVALID_REQUEST');
await verify(JSON.stringify({...good,occurrence:'invalid'}),400,'INPUT_INVALID');
await verify('{}',400,'INPUT_INVALID');
await verify('null',400,'INVALID_REQUEST');
await verify('[1]',400,'INVALID_REQUEST');
await verify('{bad json}',400,'INVALID_JSON');
const invalidUtf8 = new Request('https://halleus.invalid/api/vedic/d1', { method:'POST',
  headers: { 'content-type':'application/json' }, body: new Uint8Array([0xff, 0xfe]) });
const invalidEncoding = await handleVedicD1Post(invalidUtf8, resolveBirth);
assert.equal(invalidEncoding.status, 400);
assert.equal((await invalidEncoding.json()).code, 'INVALID_JSON');
await verify(JSON.stringify(good),415,'UNSUPPORTED_MEDIA_TYPE','text/plain');
await verify('x'.repeat(VEDIC_D1_MAX_BODY_BYTES+1),413,'PAYLOAD_TOO_LARGE');
let thrown = 0;
const response = await handleVedicD1Post(request(JSON.stringify(good)), () => { thrown++; throw Error('SECRET_VALUE'); });
assert.equal(response.status,503);
assert.equal((await response.text()).includes('SECRET_VALUE'),false);
assert.equal(thrown,1);
const wrapped = await handleVedicD1Post(new Request('https://halleus.invalid/api/vedic/d1',{
  method:'POST',headers:{'content-type':'application/json','content-length':'5000'},body:'{}',
}),resolveBirth);
assert.equal(wrapped.status,413);
const headers = new Headers({'content-type':'application/json'});
const bytes = new Uint8Array(VEDIC_D1_MAX_BODY_BYTES+200).fill(65);
const streamed = new Request('https://halleus.invalid/api/vedic/d1',{
  method:'POST',headers,body:new ReadableStream({start(controller){controller.enqueue(bytes);controller.close();}}),duplex:'half',
});
const overrun = await handleVedicD1Post(streamed,resolveBirth);
assert.equal(overrun.status,413);
assert.ok(invoked > firstCount);
console.log('PASS Vedic D1 privacy-preserving POST boundary: valid gated, malformed/oversized/extra data refused, no echo/cache/CORS, backend exception sanitized');
console.log('NOT RUN: Next route integration or full certified D1 engine (Step 07 acceptance remains partial)');

const fixture={kind:'free-d1',responseVersion:'vedic-d1-reading/1',premiumStatus:'not-available',view:{rows:Array(9).fill({})},shortReading:{textFa:'free',evidence:[]},availablePremiumChapterTitles:[],premiumPreview:null};
let saved=0;
const saveNamed=async(birth,name)=>{assert.equal(name,'Fixture');assert.equal(birth.city.id,'af-kabul');saved++;return {reading:fixture,reportId:'33333333-3333-4333-8333-333333333333',cookie:'fixture=opaque; HttpOnly; SameSite=Lax'};};
const named=(body,save=saveNamed)=>handleVedicD1Post(request(JSON.stringify(body)),resolveBirth,()=>fixture,save);
const namedBody={...good,displayName:'Fixture'};
const accepted=await named(namedBody);
assert.equal(accepted.status,200);assert.match(accepted.headers.get('set-cookie'),/HttpOnly/);
assert.equal((await accepted.json()).reportId,'33333333-3333-4333-8333-333333333333');
assert.equal(saved,1);
for(const invalid of [{...namedBody,displayName:' '},{...namedBody,displayName:'x'.repeat(61)},{...namedBody,ownerId:'forged'},{...namedBody,cityId:'bad'}])assert.equal((await named(invalid)).status,400);
assert.equal(saved,1);
const failed=await named(namedBody,async()=>{throw Error('DB_SECRET')});
assert.equal(failed.status,503);assert.equal(failed.headers.get('set-cookie'),null);assert.ok(!(await failed.text()).includes('DB_SECRET'));
assert.equal((await named(good)).status,200);assert.equal(saved,1);
console.log('VEDIC_D1_AUTO_SAVE_HTTP_PASS (named save, safe response, failed storage and legacy input)');
