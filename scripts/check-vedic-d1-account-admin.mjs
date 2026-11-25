import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const paths=['app/profile/page.tsx','components/SupabaseAuthPanel.tsx','components/vedic/VedicD1Screen.tsx','components/vedic/VedicD1PrivateSave.tsx','components/admin/AdminReportsWorkspace.tsx','lib/admin/admin-report-intelligence.ts','app/api/admin/reports/route.ts'];
for(const path of paths){
 const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,path+' syntax');
}
const profile=read(paths[0]),auth=read(paths[1]),screen=read(paths[2]),save=read(paths[3]),admin=read(paths[4]),route=read(paths[6]);
assert.ok(!profile.includes('getAccountRepository')&&!profile.includes('Boolean(session)'));
assert.ok(profile.includes('session?.isAuthenticated === true')&&profile.includes('client.auth.onAuthStateChange')&&profile.includes('revision === run'));
assert.ok(auth.includes('if (!mounted || eventSeen) return;')&&auth.includes('authClient.auth.onAuthStateChange'));
assert.ok(screen.includes('<LazySupabaseAuthPanel compact reconcileReports={false} />')&&screen.indexOf('<VedicD1GuestForm onComplete={openReport} storageEnabled={storageEnabled} />')<screen.indexOf('<LazySupabaseAuthPanel'));
assert.ok(screen.includes('reportStyles.reportAccountAuthDialog')&&save.includes('reportStyles.reportAccountAuthDialog'));
assert.ok(!admin.includes('AdminVedicReports')&&!admin.includes('view === "vedic"')&&admin.includes('vedicPaymentLabel(report.purchaseStatus)'));
const service=read(paths[5]);
assert.ok(route.includes('requireAdminCapability(request, "reports.read")')&&route.includes('noStoreJsonResponse')&&service.includes('halleus_private.vedic_d1_reports'));
assert.ok(service.includes('...rows.map(normalizeAdminReportRow),...vedicRows.map(normalizeAdminReportRow)')&&service.includes('Date.parse(right.createdAt)'));
const projection=service.slice(service.indexOf('const vedicRows='),service.indexOf('if(fullCount+'));
assert.ok(projection.includes("'vedic-d1' as metadata_report_type")&&projection.includes("'private' as visibility"));
for(const forbidden of ['select *','provider_transaction_id','proof_hash','r.private_manuscript as','r.free_reading as'])assert.ok(!projection.includes(forbidden),forbidden);
assert.ok(save.includes('action:"claim_guest"')&&save.includes('savedReportId')&&!save.includes('setConsent'));
assert.ok(save.includes('consent:true'));
console.log('VEDIC_ACCOUNT_ADMIN_SOURCE_PASS (static syntax and privacy boundary; browser/auth integration not run)');

const offer=read('components/vedic/VedicD1PurchaseOffer.tsx'),css=read('components/vedic/vedic-d1-guest.module.css'),direct=read('components/admin/AdminDirectGate.tsx');
assert.ok(save.includes('sessionState==="guest"&&<div')&&save.includes('sessionState==="account"&&owner&&<div')&&save.includes('sessionState==="checking"')&&save.includes('sessionState==="unavailable"'));
assert.ok(save.includes('if(error)unavailable()')&&save.includes('if(event==="INITIAL_SESSION"&&!session)return')&&save.includes('setSessionRetry(n=>n+1)'));
assert.ok(!save.includes('halleus.admini.direct-session')&&!save.includes('/api/admin/'));
assert.ok(direct.includes('halleus.admini.direct-session.v1'));
assert.ok(offer.includes('VEDIC_D1_PRICE_TOMAN.toLocaleString("fa-IR")')&&css.includes('.purchaseOffer button.purchasePrimary')&&css.includes('-webkit-text-fill-color: #f8fafc !important'));
console.log('VEDIC_CHECKOUT_SESSION_PRESENTATION_SOURCE_PASS');
