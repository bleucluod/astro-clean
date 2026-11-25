// Read-only focused release gate. Never applies a production migration, creates a charge or deploys.
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const records=[];
const env={...process.env,HALLEUS_ENABLE_VEDIC_D1_PRIVATE_STORAGE:'false',HALLEUS_VEDIC_BITPAY_PAYMENTS_ENABLED:'false',HALLEUS_VEDIC_BITPAY_LEDGER_READY:'false',HALLEUS_VEDIC_BITPAY_CONTRACT_APPROVED:'false'};
const run=(name,cmd,args,options={})=>{
 console.log('\n=== '+name+' ===');
 const result=spawnSync(cmd,args,{cwd:root,env,stdio:'inherit',...options});
 const status=result.error?'EXTERNAL_BLOCK':result.status===0?'PASS':'FAIL';
 records.push({name,status,exit:result.status});
 return status;
};
const node=process.execPath;
const guard=name=>run(name,node,['--experimental-strip-types','scripts/'+name+'.mjs']);
const base='b71a4e05d3a2b274028dc572cbcb1eaf3453375b';
const git=(args)=>spawnSync('git',args,{cwd:root,encoding:'utf8'});
const origin=git(['remote','get-url','origin']);
if(origin.status!==0||!/^https:\/\/github\.com\/bleucluod\/astro-clean(?:\.git)?$|^git@github\.com:bleucluod\/astro-clean(?:\.git)?$/.test(origin.stdout.trim()))throw Error('SAFETY_FATAL: unexpected origin');
const ancestor=git(['merge-base','--is-ancestor',base,'HEAD']);
if(ancestor.status!==0)throw Error('SAFETY_FATAL: candidate base not in HEAD history');
const dirty=git(['status','--porcelain','--untracked-files=all']);
if(dirty.status!==0||dirty.stdout.trim())throw Error('SAFETY_FATAL: expected clean reviewed checkout');
run('git-diff-check','git',['diff','--check',base,'HEAD']);
for(const name of ['check-vedic-d1-private-http','check-vedic-d1-payment-flow','check-vedic-d1-http','check-vedic-d1-live-free-post','check-vedic-d1-route','check-vedic-d1-chapter-preview','check-vedic-d1-premium-writer','check-vedic-d1-local-preview','check-vedic-d1-guest-ui','check-vedic-d1-north-ui','check-shop-bitpay-ir-client'])guard(name);
if(env.HALLEUS_VEDIC_TEST_DATABASE_URL&&env.HALLEUS_VEDIC_TEST_DISPOSABLE==='yes'){
 guard('check-vedic-d1-private-postgres');
}else records.push({name:'isolated-postgres',status:'EXTERNAL_BLOCK'});
const tsc=resolve(root,'node_modules/typescript/bin/tsc');
const next=resolve(root,'node_modules/next/dist/bin/next');
if(existsSync(tsc))run('typecheck',node,[tsc,'--noEmit','--incremental','false']);else records.push({name:'typecheck',status:'EXTERNAL_BLOCK'});
if(existsSync(next))run('production-build',node,[next,'build']);else records.push({name:'production-build',status:'EXTERNAL_BLOCK'});
console.log('\n=== CONSOLIDATED RELEASE CHECK ===');
for(const result of records)console.log(result.status+' '+result.name);
console.log('NOT RUN: browser two-account end-to-end, actual merchant verification, production migration and deployment.');
if(records.some(r=>r.status!=='PASS'))process.exitCode=1;
