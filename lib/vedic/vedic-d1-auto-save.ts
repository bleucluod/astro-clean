import * as Astronomy from 'astronomy-engine';
import {getSupabaseUserFromAuthorizationHeader} from '@/lib/auth/supabase-server-user';
import {createGuestReportSession,readGuestReportSession,GUEST_REPORT_COOKIE_NAME,GUEST_REPORT_COOKIE_OPTIONS} from '@/lib/auth/guest-report-session';
import {getHalleusRuntimeEnv} from '@/lib/config/env';
import {ensureAccountPersistenceUser} from '@/lib/database/account-persistence-user';
import {isVedicD1StorageReady} from './vedic-d1-payment-config';
import {calculateVedicD1Chart,calculateVedicD1GuestReading} from './vedic-d1-server-reading';
import {buildVedicD1FreeReading} from './vedic-d1-free-reading';
import {buildVedicD1PrivateManuscriptDraft} from './vedic-d1-premium-writer';
import {buildVedicD1ServerPreview} from './vedic-d1-server-preview';
import {storeVedicD1,claimVedicD1GuestReports} from './vedic-d1-private-store';
import type {VedicD1ValidatedBirth} from './vedic-d1-contract';
import type {VedicAstronomyEnginePort} from './vedic-d1-astronomy-port';
const astronomy=Astronomy as unknown as VedicAstronomyEnginePort;

export async function autoSaveVedicD1(request:Request,birth:VedicD1ValidatedBirth,name:string){
  if(!isVedicD1StorageReady())return {reading:calculateVedicD1GuestReading(birth,astronomy)};
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw Error('ORIGIN');
  const authorization=request.headers.get('authorization');
  const account=authorization?await getSupabaseUserFromAuthorizationHeader(authorization):null;
  if(authorization&&!account)throw Error('AUTH_REQUIRED');
  const existingGuest=readGuestReportSession(request);
  const guest=account?null:(existingGuest??createGuestReportSession());
  if(account&&existingGuest)await claimVedicD1GuestReports(account.id,existingGuest.userId);
  if(guest&&!existingGuest){
    const databaseUrl=getHalleusRuntimeEnv().databaseUrl;
    if(!databaseUrl)throw Error('DATABASE_REQUIRED');
    // The existing natal/comparison routes expect this signed guest ID to exist in halleus_users.
    await ensureAccountPersistenceUser({databaseUrl,userId:guest.userId,displayName:'Halleus Guest',provider:'email'});
  }
  const chart=calculateVedicD1Chart(birth,astronomy);
  const manuscript=buildVedicD1PrivateManuscriptDraft(chart,{displayName:name});
  const reading={...buildVedicD1FreeReading(chart),premiumPreview:buildVedicD1ServerPreview(chart)};
  const saved=await storeVedicD1(account?.id??guest!.userId,birth,name,reading,manuscript,account?'account':'guest');
  const opts=GUEST_REPORT_COOKIE_OPTIONS;
  const cookie=guest&&!existingGuest?`${GUEST_REPORT_COOKIE_NAME}=${encodeURIComponent(guest.token)}; Path=${opts.path}; Max-Age=${opts.maxAge}; HttpOnly; SameSite=Lax${opts.secure?'; Secure':''}`:undefined;
  return {reading:saved.reading,cookie,reportId:saved.id};
}
