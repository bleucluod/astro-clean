param(
    [Parameter(Mandatory=$true)] [string] $RepoPath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Read-only A/B: browser-only CSS content-visibility for offscreen comparison editorial sections.
# All application JavaScript is active in both arms; live source and production are untouched.
$expectedBase = 'd81202fede87224b124782b7ebdaf35e75b5214c'
$originAllowed = @('https://github.com/bleucluod/astro-clean','https://github.com/bleucluod/astro-clean.git','git@github.com:bleucluod/astro-clean.git')
Write-Host '[1/3] READ-ONLY REPOSITORY SAFETY' -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $RepoPath -PathType Container)) { throw 'SAFETY_FATAL: REPO_NOT_FOUND' }
if (-not (Test-Path -LiteralPath (Join-Path $RepoPath '.git'))) { throw 'SAFETY_FATAL: NOT_GIT_WORKTREE' }
$origin = (& git -C $RepoPath remote get-url origin | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -notin $originAllowed) { throw 'SAFETY_FATAL: WRONG_ORIGIN' }
$branch = (& git -C $RepoPath branch --show-current | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -cne 'main') { throw 'SAFETY_FATAL: WRONG_BRANCH' }
$remote = @(& git -C $RepoPath ls-remote origin refs/heads/main)
if ($LASTEXITCODE -ne 0 -or $remote.Count -ne 1) { throw 'EXTERNAL_BLOCK: REMOTE_HEAD_UNAVAILABLE' }
$remoteHead = ($remote[0] -split '\s+')[0]
$known = (& git -C $RepoPath rev-parse refs/remotes/origin/main | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $known -cne $remoteHead) { throw 'EXTERNAL_BLOCK: FETCH_ORIGIN_MAIN_FIRST' }
& git -C $RepoPath merge-base --is-ancestor $expectedBase $remoteHead
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: UNEXPECTED_REMOTE_HISTORY' }
$before = @(& git -C $RepoPath -c core.quotepath=false status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: STATUS_FAILED' }
Write-Host "VERIFIED_GITHUB_MAIN: $remoteHead"
if ($before.Count) { Write-Host 'DIRTY_WORKTREE_PRESERVED; no pull, checkout, stash or source changes.' -ForegroundColor Yellow }
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { throw 'EXTERNAL_BLOCK: NODE_22_PLUS_REQUIRED' }
$nodeV = (& $node.Source -p 'process.versions.node' | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [version]$nodeV -lt [version]'22.0.0') { throw 'EXTERNAL_BLOCK: NODE_22_PLUS_REQUIRED' }
$chrome = @(
 "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
 "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
 "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
if (-not $chrome) { throw 'EXTERNAL_BLOCK: CHROME_NOT_FOUND' }
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$out = Join-Path (Join-Path $HOME 'Downloads') "HalleusCompareBelowfoldAB-results-$stamp"
$jsFile = Join-Path ([IO.Path]::GetTempPath()) "HalleusCompareBelowfoldAB-$stamp-$([guid]::NewGuid().ToString('N')).js"
New-Item -ItemType Directory -Path $out -Force | Out-Null
$script = @'
'use strict';
// Read-only A/B: install the candidate CSS early inside a disposable Chrome tab only.
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {spawn}=require('node:child_process');const {setTimeout:sleep}=require('node:timers/promises');
const args=Object.fromEntries(process.argv.slice(2).map(x=>{const j=x.indexOf('=');return j>=3&&x.startsWith('--')?[x.slice(2,j),x.slice(j+1)]:null}).filter(Boolean));
const OUTPUT=args.output,CHROME=args.chrome,URL=args.fixtureUrl||'https://halleus.ir/compare';
const RUNS=Number(args.runs||5),ORDER=Array.from({length:RUNS*2},(_,i)=>Math.floor(i/2)%2===0?(['A','B'][i%2]):(['B','A'][i%2]));
const NETWORK={offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750};
const DEVICE={width:390,height:844,deviceScaleFactor:2.75,mobile:true};
const assert=(yes,msg)=>{if(!yes)throw Error(msg)};
const round=x=>Number.isFinite(x)?Math.round(x):null;
const median=a=>{const v=[...a].sort((x,y)=>x-y);return v.length%2?v[(v.length-1)/2]:(v[v.length/2-1]+v[v.length/2])/2};
const log=s=>console.log(`[${new Date().toISOString()}] ${s}`);
const CSS_RULE='#compare-public-landing > section:not(#compare-builder):not([aria-labelledby=\"compare-page-title\"]) {content-visibility:auto;contain-intrinsic-block-size:auto 680px;}';
const data={schema:2,status:'STARTED',startUtc:new Date().toISOString(),url:URL,method:'CDP native navigation 5+5: A original, B early browser-only offscreen editorial CSS; app JavaScript remains enabled',cssRule:CSS_RULE,order:ORDER,device:DEVICE,network:NETWORK,trials:[],attempts:[],limitations:['Experimental CSS only in disposable Chrome. No site CSS, GitHub source or VPS change.','This does not prove deployment or field CWV; confirm content-visibility, no CLS and functional scroll.','Layout/shape trace durations overlap; the hypothesis is offscreen layout costs, not a proven source fix.','Network and local Chrome CPU contention can affect results.','An FCP or LCP change smaller than noise is inconclusive.']};
let chrome,profile,cdp;
function save(){fs.writeFileSync(path.join(OUTPUT,'results.json'),JSON.stringify(data,null,2),'utf8')}
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.seq=0;this.pending=new Map();this.handlers=[];
 this.ws.addEventListener('message',e=>{let m;try{m=JSON.parse(String(e.data))}catch{return}
 if(m.id){const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);clearTimeout(p.t);m.error?p.reject(Error(p.method+': '+m.error.message)):p.resolve(m.result||{});return}
 if(m.method){for(const h of [...this.handlers])if(h.method===m.method&&h.sid===m.sessionId)try{h.cb(m.params||{})}catch(err){log('LISTENER_ERROR '+err.message)}}});
 this.ws.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.t);p.reject(Error('CDP_CLOSED'))}this.pending.clear()});
 }
 static async connect(url){const c=new CDP(url);await new Promise((ok,fail)=>{let t=setTimeout(()=>fail(Error('CDP_WS_TIMEOUT')),15000);c.ws.addEventListener('open',()=>{clearTimeout(t);ok()},{once:true});c.ws.addEventListener('error',()=>{clearTimeout(t);fail(Error('CDP_WS_ERROR'))},{once:true})});return c}
 send(method,params={},sid,timeout=30000){return new Promise((resolve,reject)=>{const id=++this.seq,t=setTimeout(()=>{this.pending.delete(id);reject(Error(method+'_TIMEOUT'))},timeout);this.pending.set(id,{resolve,reject,t,method});try{this.ws.send(JSON.stringify({id,method,params,...sid?{sessionId:sid}:{}}))}catch(e){clearTimeout(t);this.pending.delete(id);reject(e)}})}
 on(method,cb,sid){const h={method,cb,sid};this.handlers.push(h);return()=>{this.handlers=this.handlers.filter(x=>x!==h)}}
 close(){try{this.ws.close()}catch{}}
}
async function startChrome(){profile=fs.mkdtempSync(path.join(os.tmpdir(),'halleus-compare-js-ab-'));
 const flags=['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-sync','about:blank'];
 if(os.platform()==='linux'&&process.getuid?.()===0)flags.unshift('--no-sandbox');
 chrome=spawn(CHROME,flags,{stdio:'ignore',windowsHide:true});let launchError;chrome.on('error',e=>launchError=e);
 let port;for(let i=0;i<100;i++){if(launchError)throw Error('CHROME_LAUNCH_'+launchError.message);if(chrome.exitCode!==null)throw Error('CHROME_EXIT_'+chrome.exitCode);const p=path.join(profile,'DevToolsActivePort');if(fs.existsSync(p)){const n=fs.readFileSync(p,'utf8').split(/\r?\n/)[0];if(/^\d+$/.test(n)){port=Number(n);break}}await sleep(200)}
 assert(port,'CHROME_CDP_PORT_MISSING');const r=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(10000)});assert(r.ok,'CDP_HTTP_'+r.status);const ver=await r.json();data.browser=ver.Browser;cdp=await CDP.connect(ver.webSocketDebuggerUrl);log('Chrome '+ver.Browser)
}
function getLifecycle(events,loaderId,frameId,name){return events.filter(x=>x.name===name&&x.frameId===frameId&&x.loaderId===loaderId).sort((a,b)=>a.timestamp-b.timestamp).at(-1)}
const PROBE=(arm)=>`(()=>{
  const p=window.__compareBelowfoldAB={lcp:[],cls:0,errors:[],installed:false};
  try{new PerformanceObserver(list=>{for(const x of list.getEntries())p.lcp.push({ms:x.startTime,url:x.url||'',renderMs:x.renderTime,loadMs:x.loadTime})}).observe({type:'largest-contentful-paint',buffered:true})}catch(e){p.errors.push('lcp:'+e.message)}
  try{new PerformanceObserver(list=>{for(const x of list.getEntries())if(!x.hadRecentInput)p.cls+=x.value}).observe({type:'layout-shift',buffered:true})}catch(e){p.errors.push('cls:'+e.message)}
  const style=document.createElement('style');
  style.setAttribute('data-halleus-ab','${arm}');
  style.textContent=${JSON.stringify(arm==='B'?CSS_RULE:'')};
  const install=()=>{if(!document.documentElement)return false;document.documentElement.appendChild(style);p.installed=true;return true};
  if(!install()){const mo=new MutationObserver(()=>{if(install())mo.disconnect()});mo.observe(document,{childList:true,subtree:true})}
})();`;
async function trial(arm,index){
 const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});let sid,off=[],navStart=null,docResponse=null,docEnd=null,docStatus=null,events=[],requests=new Map();
 try{
 ({sessionId:sid}=await cdp.send('Target.attachToTarget',{targetId,flatten:true}));const cmd=(m,p={},t=30000)=>cdp.send(m,p,sid,t);
 await cmd('Page.enable');await cmd('Page.setLifecycleEventsEnabled',{enabled:true});await cmd('DOM.enable');await cmd('Network.enable');
 await cmd('Network.setCacheDisabled',{cacheDisabled:true});await cmd('Network.setBypassServiceWorker',{bypass:true});
 await cmd('Emulation.setDeviceMetricsOverride',DEVICE);await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await cmd('Emulation.setCPUThrottlingRate',{rate:4});await cmd('Network.emulateNetworkConditions',NETWORK);
 await cmd('Page.addScriptToEvaluateOnNewDocument',{source:PROBE(arm)});
 off.push(cdp.on('Page.lifecycleEvent',x=>{events.push(x)},sid));
 off.push(cdp.on('Network.requestWillBeSent',x=>{if(x.type==='Document'&&x.request?.url?.replace(/\/$/,'')===URL.replace(/\/$/,''))navStart=x.timestamp;requests.set(x.requestId,{url:x.request?.url||'',type:x.type||'other',start:x.timestamp,status:null,finished:false,bytes:0})},sid));
 off.push(cdp.on('Network.responseReceived',x=>{const t=requests.get(x.requestId);if(t){t.status=x.response?.status;t.mime=x.response?.mimeType;t.responseAt=x.timestamp;if(t.type==='Document'&&x.response?.url?.replace(/\/$/,'')===URL.replace(/\/$/,'')){docStatus=t.status;docResponse=x.timestamp}}},sid));
 off.push(cdp.on('Network.loadingFinished',x=>{const t=requests.get(x.requestId);if(t){t.finished=true;t.end=x.timestamp;t.bytes=x.encodedDataLength;if(t.type==='Document'&&t.url.replace(/\/$/,'')===URL.replace(/\/$/,''))docEnd=x.timestamp}},sid));
 off.push(cdp.on('Network.loadingFailed',x=>{const t=requests.get(x.requestId);if(t){t.failed=x.errorText||'FAILED'}},sid));
 log(`Trial ${index}/${ORDER.length} ${arm==='A'?'ORIGINAL':'BELOWFOLD_CSS'} native ${URL}`);
 const started=Date.now(),nav=await cmd('Page.navigate',{url:URL},40000);assert(!nav.errorText,'NAV_FAILED_'+nav.errorText);assert(nav.loaderId&&nav.frameId,'NAV_MISSING_LOADER');
 let fcp,load;for(let i=0;i<185;i++){
 if(Date.now()-started>90000)break;
 fcp=getLifecycle(events,nav.loaderId,nav.frameId,'firstContentfulPaint');load=getLifecycle(events,nav.loaderId,nav.frameId,'load');
 if(fcp&&load)break;await sleep(400);
 }
 assert(docStatus===200,'DOCUMENT_HTTP_'+docStatus);
 assert(navStart!=null,'DOCUMENT_START_MISSING');assert(fcp,'FCP_LIFECYCLE_EVENT_MISSING');assert(load,'PAGE_LOAD_EVENT_MISSING');
 await sleep(800);
 const probe=await cmd('Runtime.evaluate',{expression:`JSON.stringify((()=>{const root=document.querySelector('#compare-public-landing');const all=[...document.querySelectorAll('#compare-public-landing > section:not(#compare-builder):not([aria-labelledby=\"compare-page-title\"])')];const hero=document.querySelector('#compare-public-landing > section[aria-labelledby=\"compare-page-title\"]');const builder=document.querySelector('#compare-builder');return {installed:!!window.__compareBelowfoldAB?.installed,stylePresent:!!document.querySelector('style[data-halleus-ab=\"${arm}\"]'),sectionCount:all.length,autoCount:all.filter(x=>getComputedStyle(x).contentVisibility==='auto').length,heroVisibility:hero?getComputedStyle(hero).contentVisibility:null,builderVisibility:builder?getComputedStyle(builder).contentVisibility:null,lcp:window.__compareBelowfoldAB?.lcp||[],cls:window.__compareBelowfoldAB?.cls||0,errors:window.__compareBelowfoldAB?.errors||[],scrollHeight:document.documentElement.scrollHeight,bodyHasBuilder:!!root?.querySelector('#compare-builder')};})())`,returnByValue:true},15000);
 assert(!probe.exceptionDetails,'PROBE_EVALUATION_FAILED');const perf=JSON.parse(probe.result?.value||'null');
 assert(perf?.installed&&perf?.stylePresent,'EARLY_STYLE_NOT_INSTALLED');assert(perf.bodyHasBuilder&&perf.sectionCount>=7,'COMPARE_SECTIONS_NOT_FOUND');assert(perf.heroVisibility!=='auto'&&perf.builderVisibility!=='auto','HERO_OR_BUILDER_AFFECTED');
 assert(perf.autoCount===(arm==='B'?perf.sectionCount:0),'CANDIDATE_CSS_NOT_APPLIED_'+perf.autoCount+'_'+perf.sectionCount);
 assert(!perf.errors.length,'PERFORMANCE_OBSERVER_ERROR_'+perf.errors.join(','));
 const root=await cmd('DOM.getDocument',{depth:1,pierce:false},12000);assert(root.root?.nodeId,'DOM_ROOT_MISSING');
 const selectors=[['heading','h1#compare-page-title'],['hero','img[src*="halleus-synastry-chart-comparison.webp"]']];
 const boxes={};for(const [name,selector]of selectors){const n=await cmd('DOM.querySelector',{nodeId:root.root.nodeId,selector},10000);assert(n.nodeId>0,'SERVER_RENDERED_'+name.toUpperCase()+'_MISSING');const b=await cmd('DOM.getBoxModel',{nodeId:n.nodeId},10000);assert(b.model?.width>20&&b.model?.height>15,'SERVER_RENDERED_'+name.toUpperCase()+'_NOT_LAID_OUT');boxes[name]={width:round(b.model.width),height:round(b.model.height)}}
 const fcpMs=round((fcp.timestamp-navStart)*1000);assert(fcpMs>=0&&fcpMs<80000,'FCP_TIMESTAMP_INVALID_'+fcpMs);const lcp=perf.lcp.at(-1);assert(Number.isFinite(lcp?.ms),'LCP_MISSING');
 const res=[...requests.values()];const css=res.filter(x=>x.type==='Stylesheet'),fonts=res.filter(x=>x.type==='Font'),js=res.filter(x=>x.type==='Script');
 const ms=t=>t==null?null:round((t-navStart)*1000);
 const latest=a=>a.filter(x=>x.end!=null).length?Math.max(...a.filter(x=>x.end!=null).map(x=>ms(x.end))):null;
 const item={index,arm,utc:new Date().toISOString(),fcpMs,lcpMs:round(lcp.ms),cls:Math.round(perf.cls*10000)/10000,offscreenSections:perf.sectionCount,offscreenSectionsAuto:perf.autoCount,heroVisibility:perf.heroVisibility,builderVisibility:perf.builderVisibility,scrollHeight:perf.scrollHeight,htmlFirstByteMs:ms(docResponse),htmlEndMs:ms(docEnd),fcpAfterHtmlMs:docEnd!=null?round((fcp.timestamp-docEnd)*1000):null,loadMs:ms(load.timestamp),cssCount:css.length,cssLatestEndMs:latest(css),fontCount:fonts.length,fontLatestEndMs:latest(fonts),scriptCount:js.length,scriptBytes:js.reduce((a,x)=>a+x.bytes,0),cssBytes:css.reduce((a,x)=>a+x.bytes,0),heroCount:res.filter(x=>x.url.includes('halleus-synastry-chart-comparison.webp')).length,boxes,documentHttpStatus:docStatus,jsEnabled:true};
 log(`  FCP=${item.fcpMs}ms LCP=${item.lcpMs}ms CSS=${item.cssCount} JS=${item.scriptCount} offscreenAuto=${item.offscreenSectionsAuto}/${item.offscreenSections} CLS=${item.cls}`);
 return item;
 }finally{off.forEach(f=>f());try{await cdp.send('Target.closeTarget',{targetId},undefined,7000)}catch(e){log('TARGET_CLOSE_WARNING '+e.message)}}
}
function report(){
 const A=data.trials.filter(x=>x.arm==='A'),B=data.trials.filter(x=>x.arm==='B');
 const fields=['fcpMs','lcpMs','cls','htmlEndMs','fcpAfterHtmlMs','offscreenSectionsAuto','scrollHeight','cssCount','scriptCount'];
 const summary={};for(const k of fields)summary[k]={original:median(A.map(x=>x[k]).filter(Number.isFinite)),candidate:median(B.map(x=>x[k]).filter(Number.isFinite))};
 const delta=summary.fcpMs.original-summary.fcpMs.candidate;
 summary.fcpGainMs=delta;summary.fcpGainPercent=Number((delta/summary.fcpMs.original*100).toFixed(2));
 summary.lcpGainMs=summary.lcpMs.original-summary.lcpMs.candidate;
 const spread=xs=>Math.max(...xs.map(x=>x.fcpMs))-Math.min(...xs.map(x=>x.fcpMs));
 summary.spreadA=spread(A);summary.spreadB=spread(B);
 summary.conclusion=Math.max(summary.spreadA,summary.spreadB)>=Math.abs(delta)*2?'INCONCLUSIVE_NOISE_DOMINATES':delta>0?'PROMISING_REQUIRES_FUNCTIONAL_VERIFICATION':'NO_FCP_BENEFIT';
 data.summary=summary;
 const lines=['# Halleus /compare - belowfold layout CSS original vs candidate (browser-only A/B)','','- Native production HTML, JS and assets on both arms; B adds CSS only inside a disposable test browser.','- 390x844, 4x CPU, 1.6Mbps download, cache disabled. Not a deploy.','- Offscreen sections retain DOM content and are not hidden with display:none.','','| Median | Original | Browser-only CSS |','|---|---:|---:|',...fields.map(k=>`| ${k} | ${summary[k].original??'N/A'} | ${summary[k].candidate??'N/A'} |`),'',`- FCP difference (original minus CSS): ${delta}ms (${summary.fcpGainPercent}%)`,`- LCP difference (original minus CSS): ${summary.lcpGainMs}ms`,`- Verdict: ${summary.conclusion}`,'','| Trial | Arm | FCP | LCP | CLS | Auto sections | JS requests |','|---:|:---:|---:|---:|---:|---:|---:|',...data.trials.map(x=>`| ${x.index} | ${x.arm} | ${x.fcpMs} | ${x.lcpMs} | ${x.cls} | ${x.offscreenSectionsAuto} | ${x.scriptCount} |`),'','This does not authorize CSS release: check scroll anchor, after-scroll layout, accessibility and visual appearance before changing site CSS.'];
 fs.writeFileSync(path.join(OUTPUT,'report.md'),lines.join('\n')+'\n','utf8');log('BELOWFOLD_AB_REPORT '+JSON.stringify(summary));
}
async function main(){assert(OUTPUT&&CHROME,'MISSING_ARGUMENTS');assert(Number.isInteger(RUNS)&&RUNS>=1&&RUNS<=5,'BAD_RUN_COUNT');fs.mkdirSync(OUTPUT,{recursive:true});save();try{
 await startChrome();for(let i=0;i<ORDER.length;i++){let pass=false;for(let attempt=1;attempt<=2;attempt++){
 try{const x=await trial(ORDER[i],i+1);data.trials.push(x);data.attempts.push({index:i+1,arm:ORDER[i],attempt,status:'PASS'});pass=true;break}
 catch(e){log(`Trial ${i+1} ${ORDER[i]} attempt ${attempt}: ${e.message}`);data.attempts.push({index:i+1,arm:ORDER[i],attempt,status:'FAIL',error:e.stack||e.message});if(attempt===1)await sleep(750)}
 }save();if(!pass)log(`Trial ${i+1} failed twice; continuing safe independent trials`)}
 const countA=data.trials.filter(x=>x.arm==='A').length,countB=data.trials.filter(x=>x.arm==='B').length;
 assert(countA===RUNS&&countB===RUNS,`CANDIDATE_FAILURE: INCOMPLETE_TRIALS_A${countA}_B${countB}`);
 report();data.status='PASS';data.endUtc=new Date().toISOString();save();
 }catch(e){data.status='FAIL';data.error=e.stack||String(e);data.endUtc=new Date().toISOString();save();fs.writeFileSync(path.join(OUTPUT,'FAILURE.txt'),data.error+'\n','utf8');console.error('BELOWFOLD_AB_FAILED '+e.message);process.exitCode=1;}
 finally{cdp?.close();try{chrome?.kill()}catch{};if(profile){try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:400})}catch{log('CHROME_PROFILE_RETAINED '+profile)}}}
}
main();
'@
try {
    [IO.File]::WriteAllText($jsFile,$script,(New-Object System.Text.UTF8Encoding($false)))
    Write-Host '[2/3] 5+5 /COMPARE OFFSCREEN LAYOUT CSS A/B (BROWSER-ONLY)' -ForegroundColor Cyan
    & $node.Source $jsFile "--chrome=$chrome" "--output=$out"
    $result = $LASTEXITCODE
    if ($result -ne 0) {
        $zip = Join-Path (Join-Path $HOME 'Downloads') "HalleusCompareBelowfoldAB-FailureLogs-$stamp.zip"
        Compress-Archive -LiteralPath $out -DestinationPath $zip -Force
        Write-Host "FAILURE_LOGS: $zip" -ForegroundColor Yellow
    }
    Write-Host '[3/3] RESULTS / WORKTREE' -ForegroundColor Cyan
    if (Test-Path -LiteralPath (Join-Path $out 'report.md')) {
        Get-Content -LiteralPath (Join-Path $out 'report.md') -Encoding UTF8 | Select-Object -First 25
    }
    Write-Host "REPORT: $(Join-Path $out 'report.md')"
    Write-Host "RAW_JSON: $(Join-Path $out 'results.json')"
    $after = @(& git -C $RepoPath -c core.quotepath=false status --porcelain --untracked-files=all)
    if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: STATUS_AFTER_FAILED' }
    if (($before -join "`n") -cne ($after -join "`n")) { throw 'SAFETY_FATAL: WORKTREE_CHANGED' }
    Write-Host "WORKTREE_UNCHANGED_BY_RUNNER; GIT_STATUS_ENTRIES=$($after.Count)"
    & git -C $RepoPath --no-pager diff --check
    if ($LASTEXITCODE -ne 0) { throw 'CANDIDATE_FAILURE: DIFF_CHECK_FAILED' }
    Write-Host 'GIT_DIFF_CHECK_PASS'
    if ($result -ne 0) { throw 'COMPARE_BELOWFOLD_AB_FAILED' }
    Write-Host 'HALLEUS_COMPARE_BELOWFOLD_AB_COMPLETE' -ForegroundColor Green
}
finally {
    Remove-Item -LiteralPath $jsFile -Force -ErrorAction SilentlyContinue
}