import { getHalleusRuntimeEnv } from '@/lib/config/env';
import * as Astronomy from 'astronomy-engine';
import { getSupabaseUserFromAuthorizationHeader } from '@/lib/auth/supabase-server-user';
import { isVedicD1StorageReady } from '@/lib/vedic/vedic-d1-payment-config';
import { parseHalleusVedicD1Birth } from '@/lib/vedic/vedic-d1-birth-adapter';
import { calculateVedicD1Chart } from '@/lib/vedic/vedic-d1-server-reading';
import { buildVedicD1FreeReading } from '@/lib/vedic/vedic-d1-free-reading';
import { buildVedicD1PrivateManuscriptDraft } from '@/lib/vedic/vedic-d1-premium-writer';
import { projectVedicD1ChapterPreview } from '@/lib/vedic/vedic-d1-server-preview';
import { handleVedicD1Private, type VedicD1PrivateDependencies } from '@/lib/vedic/vedic-d1-private-http';
import {readGuestReportSession} from '@/lib/auth/guest-report-session';
import { claimVedicD1GuestReports, getGuestVedicD1, listGuestVedicD1, storeVedicD1, getPrivateVedicD1, listPrivateVedicD1 } from '@/lib/vedic/vedic-d1-private-store';
import type { VedicAstronomyEnginePort } from '@/lib/vedic/vedic-d1-astronomy-port';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const revalidate=0;

const dependencies: VedicD1PrivateDependencies={
  ready:isVedicD1StorageReady,
  authenticate:getSupabaseUserFromAuthorizationHeader,
  resolve:parseHalleusVedicD1Birth,
  async save(owner,birth,name){
    const chart=calculateVedicD1Chart(birth,Astronomy as unknown as VedicAstronomyEnginePort);
    const manuscript=buildVedicD1PrivateManuscriptDraft(chart,{displayName:name});
    // Keep the same anonymous preview semantics as the guest route.
    const reading={...buildVedicD1FreeReading(chart),
      premiumPreview:projectVedicD1ChapterPreview(buildVedicD1PrivateManuscriptDraft(chart))};
    return storeVedicD1(owner,birth,name,reading,manuscript);
  },
  get:getPrivateVedicD1,
  list:listPrivateVedicD1,
};
export const GET=(request:Request)=>handleVedicD1Private(request,{
 ...dependencies,
 canonicalSiteUrl:getHalleusRuntimeEnv().siteUrl,
 guest:()=>readGuestReportSession(request)?.userId??null,
 getGuest:getGuestVedicD1,listGuest:listGuestVedicD1,
});
export const POST=(request:Request)=>handleVedicD1Private(request,{
 ...dependencies,
 canonicalSiteUrl:getHalleusRuntimeEnv().siteUrl,
 async claimGuest(owner){const guest=readGuestReportSession(request);return guest?claimVedicD1GuestReports(owner,guest.userId):0;},
 async save(owner,birth,name){
  const guest=readGuestReportSession(request);
  if(guest)await claimVedicD1GuestReports(owner,guest.userId);
  return dependencies.save(owner,birth,name);
 },
});
