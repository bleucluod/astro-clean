import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const paths=['app/profile/page.tsx','components/SupabaseAuthPanel.tsx','components/vedic/VedicD1Screen.tsx','components/vedic/VedicD1PrivateSave.tsx','components/admin/AdminReportsWorkspace.tsx','components/admin/AdminVedicReports.tsx','app/api/admin/reports/vedic/route.ts'];
for(const path of paths){
 const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(source.parseDiagnostics.length,0,path+' syntax');
}
const profile=read(paths[0]),auth=read(paths[1]),screen=read(paths[2]),save=read(paths[3]),admin=read(paths[4]),route=read(paths[6]);
assert.ok(!profile.includes('getAccountRepository')&&!profile.includes('Boolean(session)'));
assert.ok(profile.includes('session?.isAuthenticated === true')&&profile.includes('client.auth.onAuthStateChange')&&profile.includes('revision === run'));
assert.ok(auth.includes('if (!mounted || eventSeen) return;')&&auth.includes('authClient.auth.onAuthStateChange'));
assert.ok(screen.includes('<LazySupabaseAuthPanel compact reconcileReports={false} />')&&screen.indexOf('<VedicD1GuestForm onComplete={openReport} />')<screen.indexOf('<LazySupabaseAuthPanel'));
assert.ok(screen.includes('reportStyles.reportAccountAuthDialog')&&save.includes('reportStyles.reportAccountAuthDialog'));
assert.ok(admin.includes('<AdminVedicReports key={accessToken} accessToken={accessToken} />'));
assert.ok(route.includes('requireAdminCapability(request, "reports.read")')&&route.includes('noStoreJsonResponse')&&route.includes('halleus_private.vedic_d1_reports'));
for(const forbidden of ['private_manuscript','free_reading','display_name','owner_id','provider_transaction_id','proof_hash','select *'])assert.ok(!route.includes(forbidden),forbidden);
assert.ok(save.includes('consent:true'));
console.log('VEDIC_ACCOUNT_ADMIN_SOURCE_PASS (static syntax and privacy boundary; browser/auth integration not run)');
