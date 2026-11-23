param(
  [Parameter(Mandatory=$true)] [string] $RepoPath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# LEVEL 1 read-only live experiment. Only Windows temp and Downloads are written.
# No app source edits, git commits, pushes, pull, tag, deploy, stash or reset.
$authority = 'efcbe5a29e1a6d30e05a33cd4364caf23470dfdf'
$expectedBlob = 'c5391ff04a984b34a637c4d834ffdd2e34575cdf'
$rel = 'components/comparison/comparison-landing.module.css'
$repo = (Resolve-Path -LiteralPath $RepoPath -ErrorAction Stop).Path
$download = Join-Path $HOME 'Downloads'
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$out = Join-Path $download "HalleusCompareStaticCandidate-results-$stamp"
$work = Join-Path ([IO.Path]::GetTempPath()) "HalleusCompareStaticCandidate-$stamp-$([guid]::NewGuid().ToString('N'))"
$cssPath = Join-Path $work 'scoped.css'
$jsPath = Join-Path $work 'benchmark.js'
$failures = New-Object 'System.Collections.Generic.List[string]'
Write-Host '[1/4] READ-ONLY SAFETY' -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath (Join-Path $repo '.git'))) { throw 'SAFETY_FATAL_NOT_REPO' }
$origin = (& git -C $repo remote get-url origin | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -notin @('https://github.com/bleucluod/astro-clean','https://github.com/bleucluod/astro-clean.git','git@github.com:bleucluod/astro-clean.git')) { throw 'SAFETY_FATAL_WRONG_ORIGIN' }
$branch = (& git -C $repo branch --show-current | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -cne 'main') { throw 'SAFETY_FATAL_WRONG_BRANCH' }
$headSha = (& git -C $repo rev-parse HEAD | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL_LOCAL_HEAD_UNAVAILABLE' }
& git -C $repo merge-base --is-ancestor $authority $headSha
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL_UNREVIEWED_LOCAL_HISTORY' }
$blob = (& git -C $repo rev-parse "HEAD:$rel" | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $blob -cne $expectedBlob) { throw 'SAFETY_FATAL_CSS_CHANGED_FROM_REVIEWED_VERSION' }
$before = @(& git -C $repo -c core.quotepath=false status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL_WORKTREE_STATUS_FAILED' }
if (@($before | Where-Object { $_ -notmatch '^\?\? ' }).Count -gt 0) { throw 'SAFETY_FATAL_UNRELATED_TRACKED_CHANGES' }
$pagePath = Join-Path $repo 'components/comparison/ComparisonLanding.tsx'
if (-not (Test-Path -LiteralPath $pagePath -PathType Leaf)) { throw 'SAFETY_FATAL_LANDING_MISSING' }
$pageText = [IO.File]::ReadAllText($pagePath)
foreach ($id in @('compare-technical-title','compare-time-title','compare-name-title','compare-faq-title','compare-final-title')) {
 if (-not $pageText.Contains('aria-labelledby="' + $id + '"')) { throw "SAFETY_FATAL_LANDING_STRUCTURE_CHANGED_$id" }
}
& git -C $repo diff --quiet -- $rel
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL_LOCAL_CSS_MODIFIED' }
Write-Host "LOCAL_HEAD_VALIDATED: $headSha; UNTRACKED_ENTRIES_PRESERVED=$($before.Count)"
New-Item -ItemType Directory -Path $work -Force | Out-Null
New-Item -ItemType Directory -Path $out -Force | Out-Null
$css = @'
/* HALLEUS_COMPARE_SCOPED_VISIBILITY_CANDIDATE_R1 */
/* Intentionally limited to measured viewport bands; keep hero, builder and other widths untouched. */
@media (min-width: 375px) and (max-width: 420px) {
  .page > section[aria-labelledby="compare-technical-title"] { content-visibility: auto; contain-intrinsic-block-size: auto 1162px; }
  .page > section[aria-labelledby="compare-time-title"] { content-visibility: auto; contain-intrinsic-block-size: auto 525px; }
  .page > section[aria-labelledby="compare-name-title"] { content-visibility: auto; contain-intrinsic-block-size: auto 678px; }
  .page > section[aria-labelledby="compare-faq-title"] { content-visibility: auto; contain-intrinsic-block-size: auto 541px; }
  .page > section[aria-labelledby="compare-final-title"] { content-visibility: auto; contain-intrinsic-block-size: auto 400px; }
}
@media (min-width: 1200px) and (max-width: 1360px) {
  .page > section[aria-labelledby="compare-technical-title"] { content-visibility: auto; contain-intrinsic-block-size: auto 624px; }
  .page > section[aria-labelledby="compare-time-title"] { content-visibility: auto; contain-intrinsic-block-size: auto 372px; }
  .page > section[aria-labelledby="compare-name-title"] { content-visibility: auto; contain-intrinsic-block-size: auto 372px; }
  .page > section[aria-labelledby="compare-faq-title"] { content-visibility: auto; contain-intrinsic-block-size: auto 525px; }
  .page > section[aria-labelledby="compare-final-title"] { content-visibility: auto; contain-intrinsic-block-size: auto 210px; }
}

'@
$script = @'
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),zlib=require('node:zlib');
const {spawn}=require('node:child_process');const {setTimeout:sleep}=require('node:timers/promises');
const args=Object.fromEntries(process.argv.slice(2).map(s=>{let i=s.indexOf('=');return [s.slice(2,i),s.slice(i+1)]}));
const OUT=args.out,CHROME=args.chrome,CSSFILE=args.cssfile;
const PAGE=args.fixture?'about:blank':'https://halleus.ir/compare';const FIXTURE=!!args.fixture;
const EXPECTED=['compare-what-title','compare-output-title','compare-method-title','compare-compatibility-title','compare-technical-title','compare-time-title','compare-name-title','compare-faq-title','compare-final-title'];
const SCOPED=EXPECTED.slice(4);const VIEWS=[{id:'mobile390',w:390,h:844,arms:['A','B','B','A','A','B']},{id:'desktop1280',w:1280,h:900,arms:['A','B']},{id:'tablet768',w:768,h:900,arms:['B']},{id:'tablet1024',w:1024,h:900,arms:['B']}];
const NETWORK={offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750};
const note='Not Lighthouse or production release. Browser-only CSS variant corresponds to appended module source. Real user experience may differ.';
const output={schema:1,status:'STARTED',url:PAGE,createdUtc:new Date().toISOString(),network:NETWORK,runPlan:VIEWS,trialResults:[],attempts:[],checks:[],limits:[note,'Browser timing jitter can dominate small improvements.','Static height hints are only enabled at sampled width bands; other widths must remain unchanged.','No source, GitHub or VPS mutation from Chrome; local CSS candidate is written by PowerShell.']};
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};const median=a=>{let x=a.filter(Number.isFinite).sort((a,b)=>a-b);return x.length?(x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2):null};
const round=n=>Number.isFinite(n)?Math.round(n):null;
const log=s=>console.log(`[${new Date().toISOString()}] ${s}`);
let profile,chrome,cdp;
function flush(){fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(output,null,2),'utf8')}
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.n=0;this.pending=new Map();this.listeners=[];this.ws.addEventListener('message',e=>{let m;try{m=JSON.parse(String(e.data))}catch{return}if(m.id){let p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(p.name+':'+m.error.message)):p.resolve(m.result||{});}else if(m.method){for(let h of [...this.listeners])if(h.method===m.method&&h.sid===m.sessionId)try{h.cb(m.params||{})}catch(e){log('EVENT_ERROR '+e.message)}}});this.ws.addEventListener('close',()=>{for(let p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('CDP_CLOSED'))}this.pending.clear()});}
 static async open(url){let c=new CDP(url);await new Promise((ok,bad)=>{let t=setTimeout(()=>bad(Error('CDP_CONNECT_TIMEOUT')),15000);c.ws.addEventListener('open',()=>{clearTimeout(t);ok()},{once:true});c.ws.addEventListener('error',()=>{clearTimeout(t);bad(Error('CDP_CONNECT_FAILED'))},{once:true})});return c;}
 send(name,params={},sid,ms=30000){return new Promise((resolve,reject)=>{let id=++this.n,timer=setTimeout(()=>{this.pending.delete(id);reject(Error(name+'_TIMEOUT'))},ms);this.pending.set(id,{resolve,reject,timer,name});this.ws.send(JSON.stringify({id,method:name,params,...sid?{sessionId:sid}:{}}))})}
 on(method,cb,sid){let h={method,cb,sid};this.listeners.push(h);return ()=>this.listeners=this.listeners.filter(x=>x!==h)}
 close(){try{this.ws.close()}catch{}}
}
const MARK='/* HALLEUS_COMPARE_SCOPED_VISIBILITY_CANDIDATE_R1 */';
let source=fs.readFileSync(CSSFILE,'utf8');let idx=source.indexOf(MARK);
assert(idx>=0,'CANDIDATE_MARKER_MISSING');
let CSS=source.slice(idx+MARK.length).trim().replaceAll('.page > section[','#compare-public-landing > section[');
assert((CSS.match(/content-visibility\s*:\s*auto/g)||[]).length===10,'RULE_COUNT_MISMATCH');
assert(CSS.includes('@media (min-width: 375px) and (max-width: 420px)')&&CSS.includes('@media (min-width: 1200px)'),'CANDIDATE_MEDIA_MISMATCH');
const PROBE=(arm)=>`(()=>{let p=window.__halleusCompareSafe={lcp:[],shifts:[],cls:0,installed:false};
 try{new PerformanceObserver(l=>{for(let e of l.getEntries())p.lcp.push({ms:e.startTime,url:e.url||''})}).observe({type:'largest-contentful-paint',buffered:true})}catch(e){p.error='lcp:'+e.message}
 try{new PerformanceObserver(l=>{for(let e of l.getEntries()){p.shifts.push({ms:e.startTime,value:e.value,recent:e.hadRecentInput});if(!e.hadRecentInput)p.cls+=e.value}}).observe({type:'layout-shift',buffered:true})}catch(e){p.error='cls:'+e.message}
 const s=document.createElement('style');s.setAttribute('data-halleus-perf-candidate','${arm}');s.textContent=${JSON.stringify(arm==='B'?CSS:'')};const install=()=>{if(!document.documentElement)return false;document.documentElement.appendChild(s);p.installed=true;return true};if(!install()){const m=new MutationObserver(()=>{if(install())m.disconnect()});m.observe(document,{subtree:true,childList:true})}
})();`;
const SNAP=`JSON.stringify((()=>{const root=document.querySelector('#compare-public-landing');const els=[...document.querySelectorAll('#compare-public-landing > section[aria-labelledby]')];const sections=els.map(x=>({id:x.getAttribute('aria-labelledby'),visibility:getComputedStyle(x).contentVisibility,height:Math.round(x.getBoundingClientRect().height),top:Math.round(x.getBoundingClientRect().top+scrollY),textLength:x.textContent.length}));const hero=document.querySelector('#compare-public-landing > section[aria-labelledby="compare-page-title"]');const builder=document.querySelector('#compare-builder');return {url:location.href,sections,documentHeight:document.documentElement.scrollHeight,cls:window.__halleusCompareSafe?.cls||0,shifts:window.__halleusCompareSafe?.shifts||[],lcp:window.__halleusCompareSafe?.lcp||[],paint:performance.getEntriesByType('paint').map(x=>({name:x.name,ms:x.startTime})),navigation:performance.getEntriesByType('navigation').map(x=>({responseEnd:x.responseEnd})),hero:!!hero,heroLink:!!hero?.querySelector('a[href="#compare-builder"]'),builder:!!builder,heroVisibility:hero?getComputedStyle(hero).contentVisibility:null,builderVisibility:builder?getComputedStyle(builder).contentVisibility:null,faq:!!document.querySelector('#compare-faq-title'),probeInstalled:!!window.__halleusCompareSafe?.installed,probeError:window.__halleusCompareSafe?.error||null}})())`;
async function boot(){profile=fs.mkdtempSync(path.join(os.tmpdir(),'halleus-compare-scoped-r1-'));let flags=['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--disable-extensions','--disable-background-networking','--disable-sync','--no-first-run','--no-default-browser-check','about:blank'];if(process.platform==='linux'&&process.getuid?.()===0)flags.unshift('--no-sandbox');let launchErr;chrome=spawn(CHROME,flags,{stdio:'ignore',windowsHide:true});chrome.on('error',e=>launchErr=e);let port;for(let i=0;i<90;i++){if(launchErr)throw Error('CHROME_LAUNCH '+launchErr.message);if(chrome.exitCode!==null)throw Error('CHROME_EXIT '+chrome.exitCode);let p=path.join(profile,'DevToolsActivePort');if(fs.existsSync(p)){port=+fs.readFileSync(p,'utf8').split(/\r?\n/)[0];if(port)break}await sleep(200)}assert(port,'CHROME_PORT_MISSING');let r=await fetch('http://127.0.0.1:'+port+'/json/version',{signal:AbortSignal.timeout(12000)});assert(r.ok,'CHROME_HTTP_'+r.status);let ver=await r.json();output.chrome=ver.Browser;cdp=await CDP.open(ver.webSocketDebuggerUrl);log('Chrome '+ver.Browser)}
async function trial(view,arm,index){let {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'}),sid;let cleanup=[];try{
 sid=(await cdp.send('Target.attachToTarget',{targetId,flatten:true})).sessionId;const cmd=(m,p={},t=30000)=>cdp.send(m,p,sid,t);
 await cmd('Runtime.enable');await cmd('Page.enable');await cmd('Network.enable');await cmd('Network.setCacheDisabled',{cacheDisabled:true});await cmd('Network.setBypassServiceWorker',{bypass:true});
 await cmd('Emulation.setDeviceMetricsOverride',{width:view.w,height:view.h,deviceScaleFactor:view.w<800?2.75:1,mobile:view.w<800});await cmd('Emulation.setTouchEmulationEnabled',view.w<800?{enabled:true,maxTouchPoints:1}:{enabled:false});
 if(!FIXTURE){await cmd('Emulation.setCPUThrottlingRate',{rate:4});await cmd('Network.emulateNetworkConditions',NETWORK)}
 await cmd('Page.addScriptToEvaluateOnNewDocument',{source:PROBE(arm)});
 log(view.id+' '+arm+' trial '+index+': '+PAGE);let nav=await cmd('Page.navigate',{url:PAGE},40000);assert(!nav.errorText,'PAGE_NAV_ERROR_'+nav.errorText);if(FIXTURE){let html=fs.readFileSync(args.fixture,'utf8');let result=await cmd('Runtime.evaluate',{expression:'document.open();document.write('+JSON.stringify(html)+');document.close();true',returnByValue:true},15000);assert(!result.exceptionDetails,'FIXTURE_INJECTION_FAILED');await cmd('Runtime.evaluate',{expression:PROBE(arm),returnByValue:true},10000);}
 let ready=false,start=Date.now();for(let i=0;i<200;i++){if(Date.now()-start>90000)break;await sleep(FIXTURE?50:350);try{let ev=await cmd('Runtime.evaluate',{expression:'document.readyState',returnByValue:true},6000);if(ev.result?.value==='complete'){ready=true;break}}catch{}}
 assert(ready,'PAGE_NOT_COMPLETE');await sleep(FIXTURE?150:800);
 const evaluate=async(js)=>{const r=await cmd('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true},15000);assert(!r.exceptionDetails,'EVAL_FAILED_'+r.exceptionDetails?.text);return r.result?.value};
 const first=JSON.parse(await evaluate(SNAP));assert(first.probeInstalled&&!first.probeError,'EARLY_PROBE_ERROR');
 assert(FIXTURE||first.url.replace(/\/$/,'')===PAGE.replace(/\/$/,''),'WRONG_URL');
 assert(first.hero&&first.builder&&first.heroLink&&first.faq,'LANDING_NOT_READY');
 assert(first.heroVisibility==='visible'&&first.builderVisibility==='visible','HERO_OR_BUILDER_COLLAPSED');
 assert(EXPECTED.every(id=>first.sections.some(s=>s.id===id)),'EDITORIAL_STRUCTURE_MISMATCH');
 let applying=arm==='B'&&['mobile390','desktop1280'].includes(view.id);
 for(let s of first.sections){let expected=applying&&SCOPED.includes(s.id)?'auto':'visible';assert(s.visibility===expected,'WRONG_VISIBILITY_'+view.id+'_'+arm+'_'+s.id+'_'+s.visibility)}
 const fcp=first.paint.find(x=>x.name==='first-contentful-paint')?.ms,lcp=first.lcp.at(-1)?.ms;
 assert(FIXTURE||(Number.isFinite(fcp)&&Number.isFinite(lcp)),'PAINT_TIMING_MISSING');
 let steps=[];for(let id of EXPECTED){await evaluate(`(()=>{document.getElementById('${id}').scrollIntoView({behavior:'instant',block:'start'});return true})()`);await sleep(FIXTURE?25:80);let a=JSON.parse(await evaluate(`JSON.stringify((()=>{const h=document.getElementById('${id}'),s=h.closest('section');return {headingTop:Math.round(h.getBoundingClientRect().top),height:Math.round(s.getBoundingClientRect().height),docHeight:document.documentElement.scrollHeight,textLength:s.textContent.length,scrollY:Math.round(scrollY)}})())`));await sleep(FIXTURE?25:80);let b=JSON.parse(await evaluate(`JSON.stringify((()=>{const h=document.getElementById('${id}'),s=h.closest('section');return {headingTop:Math.round(h.getBoundingClientRect().top),height:Math.round(s.getBoundingClientRect().height),docHeight:document.documentElement.scrollHeight,textLength:s.textContent.length,scrollY:Math.round(scrollY)}})())`));assert(b.height>55,'SECTION_ZERO_HEIGHT_'+id);assert(b.headingTop<view.h+100&&b.headingTop>-view.h,'SCROLL_TARGET_LOST_'+id);steps.push({id,initial:first.sections.find(x=>x.id===id),before:a,after:b,movement:Math.abs(a.headingTop-b.headingTop)})}
 await evaluate('scrollTo({top:0,behavior:"instant"});true');await sleep(FIXTURE?50:150);
 await evaluate('document.querySelector("#compare-public-landing > section[aria-labelledby=\\"compare-page-title\\"] a[href=\\"#compare-builder\\"]").click();true');await sleep(FIXTURE?30:250);
 let anchor=JSON.parse(await evaluate('JSON.stringify((()=>{const b=document.getElementById("compare-builder");return {hash:location.hash,top:Math.round(b.getBoundingClientRect().top),focused:document.activeElement===b}})())'));
 assert(anchor.hash==='#compare-builder'&&anchor.top<view.h,'BUILDER_ANCHOR_BROKEN');
 await evaluate('document.getElementById("compare-faq-title").scrollIntoView({behavior:"instant",block:"start"});true');await sleep(FIXTURE?50:250);
 let faq=JSON.parse(await evaluate('JSON.stringify((()=>{const d=document.getElementById("compare-faq-title").closest("section").querySelector("details");d.querySelector("summary").click();return {opened:d.open,questionLength:d.querySelector("summary").textContent.length,answerLength:d.querySelector("p")?.textContent.length||0}})())'));
 assert(faq.opened&&faq.questionLength>5&&faq.answerLength>10,'FAQ_BROKEN');
 await sleep(FIXTURE?50:150);
 let last=JSON.parse(await evaluate(SNAP));
 if(arm==='B'&&['mobile390','desktop1280'].includes(view.id)){try{let png=await cmd('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},30000);fs.writeFileSync(path.join(OUT,view.id+'-candidate-faq.png'),Buffer.from(png.data,'base64'))}catch(e){log('SCREENSHOT_WARNING '+e.message)}}
 let item={view:view.id,index,arm,fcpMs:FIXTURE?0:round(fcp),lcpMs:FIXTURE?0:round(lcp),htmlEndMs:round(first.navigation[0]?.responseEnd),initialHeight:first.documentHeight,afterScrollHeight:last.documentHeight,cls:last.cls,initialCls:first.cls,scopedCount:first.sections.filter(x=>SCOPED.includes(x.id)&&x.visibility==='auto').length,anchor,faq,steps,wallClock:new Date().toISOString()};
 log('  FCP='+item.fcpMs+' LCP='+item.lcpMs+' auto='+item.scopedCount+' cls='+item.cls.toFixed(5)+' document='+item.initialHeight+'->'+item.afterScrollHeight);
 return item;
 }finally{cleanup.forEach(fn=>fn());try{await cdp.send('Target.closeTarget',{targetId},undefined,6500)}catch(e){log('TARGET_CLEANUP '+e.message)}}}
function evaluateGroups(){let verdict='PASS_GEOMETRY_ONLY';for(let view of VIEWS){let samples=output.trialResults.filter(x=>x.view===view.id),A=samples.filter(x=>x.arm==='A'),B=samples.filter(x=>x.arm==='B');let expectedB=view.id==='mobile390'||view.id==='desktop1280'?5:0;
 if(B.length!==view.arms.filter(a=>a==='B').length||A.length!==view.arms.filter(a=>a==='A').length){output.checks.push({view:view.id,verdict:'HOLD',reason:'MISSING_TRIALS'});verdict='HOLD';continue}
 if(B.some(x=>x.scopedCount!==expectedB)){output.checks.push({view:view.id,verdict:'HOLD',reason:'SCOPE_MISMATCH'});verdict='HOLD';continue}
 const b=B[0],a=A[0];let problems=[];if(a){const heights=Object.fromEntries(a.steps.map(s=>[s.id,s.after.height]));let maxHeight=Math.max(...b.steps.map(s=>Math.abs(s.after.height-heights[s.id]))),finalPageDiff=Math.abs(b.afterScrollHeight-a.afterScrollHeight),initialDiff=Math.abs(b.initialHeight-a.initialHeight),clsDiff=b.cls-a.cls;
 if(maxHeight>15)problems.push('SECTION_REAL_HEIGHT_DELTA_'+maxHeight);if(finalPageDiff>160)problems.push('FINAL_DOCUMENT_DELTA_'+finalPageDiff);if(initialDiff>220)problems.push('INITIAL_DOCUMENT_DELTA_'+initialDiff);if(clsDiff>0.05||b.cls>0.10)problems.push('CLS_GATE_'+clsDiff);if(b.steps.some(s=>s.movement>80))problems.push('HEADING_SETTLE_GT80');
 output.checks.push({view:view.id,verdict:problems.length?'HOLD':'PASS',maxRealHeightDiff:maxHeight,initialPageHeightDiff:initialDiff,finalPageHeightDiff:finalPageDiff,clsBaseline:a.cls,clsCandidate:b.cls,problems});
 }else output.checks.push({view:view.id,verdict:'PASS_NO_CSS_EXPECTED',candidateCount:B.length});if(problems.length)verdict='HOLD';}
 const a=output.trialResults.filter(x=>x.view==='mobile390'&&x.arm==='A'),b=output.trialResults.filter(x=>x.view==='mobile390'&&x.arm==='B');
 const complete=a.length===3&&b.length===3;const gain=complete?median(a.map(x=>x.fcpMs))-median(b.map(x=>x.fcpMs)):null,lcpGain=complete?median(a.map(x=>x.lcpMs))-median(b.map(x=>x.lcpMs)):null;const spreads=complete?[a,b].map(xs=>Math.max(...xs.map(x=>x.fcpMs))-Math.min(...xs.map(x=>x.fcpMs))):[null,null];
 let perfVerdict=!complete?'NOT_EVALUATED_INCOMPLETE_RUNS':FIXTURE?'FIXTURE_NO_PERFORMANCE':Math.max(...spreads)>Math.abs(gain)*2?'INCONCLUSIVE_NOISE_DOMINATES':gain>0?'PROMISING':'NO_PERFORMANCE_BENEFIT';
 output.summary={mobileFcpOriginal:median(a.map(x=>x.fcpMs)),mobileFcpCandidate:median(b.map(x=>x.fcpMs)),mobileLcpOriginal:median(a.map(x=>x.lcpMs)),mobileLcpCandidate:median(b.map(x=>x.lcpMs)),fcpGainMs:gain,lcpGainMs:lcpGain,spreads,performanceVerdict:perfVerdict,geometryVerdict:verdict};
 return verdict;
}
function report(){let d=output.summary;let lines=['# /compare – scoped static CSS performance and scroll check','',`- UTC: ${new Date().toISOString()}`,'- CSS source: embedded static candidate in read-only PowerShell runner (not live deployment)','- Source and production are unchanged on VPS; CSS injected only inside B tabs.','- Mobile A/B 3+3 under 4x CPU and 1.6 Mbps; desktop 1+1; tablet excluded-band checks.','','## Medians and classification','',`- Mobile FCP A: ${d.mobileFcpOriginal}ms; candidate B: ${d.mobileFcpCandidate}ms; gain: ${d.fcpGainMs}ms`,`- Mobile LCP A: ${d.mobileLcpOriginal}ms; candidate B: ${d.mobileLcpCandidate}ms; gain: ${d.lcpGainMs}ms`,`- FCP spreads: ${d.spreads[0]}ms A; ${d.spreads[1]}ms B`,`- Performance conclusion: **${d.performanceVerdict}**`,`- Geometry conclusion: **${d.geometryVerdict}**`,'','## Scroll and geometry',...output.checks.map(c=>`- ${c.view}: ${c.verdict} ${c.problems?.join(',')||''} heightDiff=${c.maxRealHeightDiff??'n/a'} initialDocDiff=${c.initialPageHeightDiff??'n/a'} finalDocDiff=${c.finalPageHeightDiff??'n/a'}`),'','## Individual trials','','| View | Arm | # | FCP | LCP | Initial height | Final height | CLS | Scoped |','|---|:---:|---:|---:|---:|---:|---:|---:|---:|',...output.trialResults.map(x=>`| ${x.view} | ${x.arm} | ${x.index} | ${x.fcpMs} | ${x.lcpMs} | ${x.initialHeight} | ${x.afterScrollHeight} | ${x.cls} | ${x.scopedCount} |`),'','## Limits','',...output.limits.map(s=>'- '+s)];fs.writeFileSync(path.join(OUT,'report.md'),lines.join('\n')+'\n','utf8')}
async function main(){try{assert(OUT&&CHROME&&CSSFILE,'BAD_ARGUMENTS');fs.mkdirSync(OUT,{recursive:true});flush();await boot();for(let view of VIEWS){let index=0;for(let arm of view.arms){index++;let ok=false;for(let attempt=1;attempt<=2;attempt++){try{let result=await trial(view,arm,index);output.trialResults.push(result);output.attempts.push({view:view.id,arm,index,attempt,status:'PASS'});ok=true;break}catch(e){log('TRIAL_FAILED '+view.id+' '+arm+' '+e.message);output.attempts.push({view:view.id,arm,index,attempt,status:'FAIL',message:e.stack||e.message});if(attempt===1)await sleep(600)}}flush();if(!ok)log('CONTINUING_OTHER_INDEPENDENT_TRIALS');}}
 const status=evaluateGroups();report();output.status=status==='HOLD'?'HOLD':'PASS';flush();log('SCOPED_CANDIDATE_REPORT '+JSON.stringify(output.summary));if(status==='HOLD')process.exitCode=2;
 }catch(e){output.status='FAIL';output.error=e.stack||String(e);flush();fs.writeFileSync(path.join(OUT,'FAILURE.txt'),output.error+'\n','utf8');console.error('SCOPED_CANDIDATE_FAILED '+e.message);process.exitCode=1}finally{cdp?.close();try{chrome?.kill()}catch{};if(profile){try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:2,retryDelay:250})}catch{log('CHROME_PROFILE_RETAINED '+profile)}}}}
main();

'@
try {
  [IO.File]::WriteAllText($cssPath,$css,(New-Object System.Text.UTF8Encoding($false)))
  [IO.File]::WriteAllText($jsPath,$script,(New-Object System.Text.UTF8Encoding($false)))
  Write-Host '[2/4] STATIC CANDIDATE AND JS CHECKS' -ForegroundColor Cyan
  try {
    if ([regex]::Matches($css,'content-visibility\s*:\s*auto').Count -ne 10) { throw 'EXACTLY_TEN_MEDIA_SCOPED_RULES_REQUIRED' }
    if ($css -match 'display\s*:\s*none|#compare-builder|compare-page-title') { throw 'HERO_OR_BUILDER_SCOPE_VIOLATION' }
    if ([regex]::Matches($css,'aria-labelledby="compare-').Count -ne 10) { throw 'EXPECTED_SELECTOR_COUNT_10' }
    if (-not $css.Contains('@media (min-width: 375px) and (max-width: 420px)') -or -not $css.Contains('@media (min-width: 1200px) and (max-width: 1360px)')) { throw 'MISSING_SAFETY_BREAKPOINTS' }
    Write-Host 'CANDIDATE_CSS_STRUCTURE_PASS' -ForegroundColor Green
  } catch { $failures.Add('CANDIDATE_FAILURE_STATIC: ' + $_.Exception.Message); Write-Host $_ -ForegroundColor Red }
  $node = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $node) { $node = Get-Command node -ErrorAction SilentlyContinue }
  if (-not $node) { $failures.Add('EXTERNAL_BLOCK_NODE_NOT_FOUND') }
  else {
    & $node.Source --check $jsPath
    if ($LASTEXITCODE -ne 0) { $failures.Add('CANDIDATE_FAILURE_JAVASCRIPT_SYNTAX') }
    else { Write-Host 'JAVASCRIPT_SYNTAX_PASS' -ForegroundColor Green }
  }
  Write-Host '[3/4] MOBILE A/B + FOUR-VIEWPORT SCROLL SAFETY' -ForegroundColor Cyan
  $chrome = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
  if (-not $node -or -not $chrome) { $failures.Add('EXTERNAL_BLOCK_CHROME_OR_NODE_NOT_FOUND') }
  else {
    & $node.Source $jsPath "--chrome=$chrome" "--out=$out" "--cssfile=$cssPath"
    $browserExit = $LASTEXITCODE
    if ($browserExit -eq 2) { $failures.Add('CANDIDATE_FAILURE_GEOMETRY_HOLD') }
    elseif ($browserExit -ne 0) { $failures.Add('CANDIDATE_FAILURE_BROWSER_RUNTIME') }
    else { Write-Host 'BROWSER_DIAGNOSTICS_COMPLETE' -ForegroundColor Green }
  }
} catch { $failures.Add('CANDIDATE_FAILURE_RUNNER: ' + $_.Exception.Message) }
finally { Remove-Item -LiteralPath $work -Recurse -Force -ErrorAction SilentlyContinue }

Write-Host '[4/4] VERIFY UNCHANGED REPOSITORY / RESULTS' -ForegroundColor Cyan
try {
  $after = @(& git -C $repo -c core.quotepath=false status --porcelain --untracked-files=all)
  if ($LASTEXITCODE -ne 0) { throw 'GIT_STATUS_FAILED' }
  if (($before -join "`n") -cne ($after -join "`n")) { throw 'SAFETY_FATAL_WORKTREE_CHANGED' }
  & git -C $repo --no-pager diff --check
  if ($LASTEXITCODE -ne 0) { $failures.Add('UNRELATED_BASELINE_FAILURE_DIFF_CHECK') }
  else { Write-Host 'GIT_DIFF_CHECK_PASS' -ForegroundColor Green }
  Write-Host "REPOSITORY_UNCHANGED; GIT_STATUS_ENTRIES=$($after.Count)"
  & git -C $repo --no-pager status --short
  & git -C $repo --no-pager diff --stat
} catch { $failures.Add('SAFETY_FATAL_POSTRUN: ' + $_.Exception.Message) }
$report = Join-Path $out 'report.md'
if (Test-Path -LiteralPath $report) {
 Get-Content -LiteralPath $report -Encoding UTF8 | Select-Object -First 32
}
Write-Host "REPORT: $report"
Write-Host "RAW_JSON: $(Join-Path $out 'results.json')"
if ($failures.Count -gt 0) {
 [IO.File]::WriteAllLines((Join-Path $out 'FAILURE-LEDGER.txt'),$failures.ToArray())
 $failureZip = Join-Path $download "HalleusCompareStaticCandidate-FailureLogs-$stamp.zip"
 Compress-Archive -Path (Join-Path $out '*') -DestinationPath $failureZip -Force
 Write-Host "FAILURE_LOGS: $failureZip" -ForegroundColor Yellow
 Write-Host ('FAILURES: ' + ($failures -join '; ')) -ForegroundColor Yellow
 throw 'COMPARE_STATIC_CANDIDATE_HOLD'
}
Write-Host 'HALLEUS_COMPARE_STATIC_CANDIDATE_READ_ONLY_COMPLETE' -ForegroundColor Green