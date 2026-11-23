param(
    [Parameter(Mandatory=$true)] [string] $RepoPath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Read-only JS execution ablation. B disables JavaScript ONLY inside a disposable Chrome tab.
# B is not a deployable page variant; this experiment isolates first-paint blocking.
$expectedBase = 'fe1ca28b6dfa7fb45ef436e84e45883e79200191'
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
$out = Join-Path (Join-Path $HOME 'Downloads') "HalleusCompareJSAblationAB-results-$stamp"
$jsFile = Join-Path ([IO.Path]::GetTempPath()) "HalleusCompareJSAblationAB-$stamp-$([guid]::NewGuid().ToString('N')).js"
New-Item -ItemType Directory -Path $out -Force | Out-Null
$script = @'
'use strict';
// Diagnosis, NOT a deployable fix: disable site JavaScript only in disposable Chrome arm B.
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
const data={schema:1,status:'STARTED',startUtc:new Date().toISOString(),url:URL,method:'CDP native navigation 5+5: A normal JS, B script execution disabled before navigation; no HTML or network interception',order:ORDER,device:DEVICE,network:NETWORK,trials:[],attempts:[],limitations:['Diagnostic only. Disabling JS breaks application interactions and is not a deployable optimization.','This measures FCP, not LCP or user interactions, and is not PSI or Lighthouse.','The browser in both variants loads unmodified production HTML and CSS.','Network and local Chrome CPU contention can affect results.','Use a targeted, functional implementation A/B before recommending a site change.']};
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
async function trial(arm,index){
 const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});let sid,off=[],navStart=null,docResponse=null,docEnd=null,docStatus=null,events=[],requests=new Map();
 try{
 ({sessionId:sid}=await cdp.send('Target.attachToTarget',{targetId,flatten:true}));const cmd=(m,p={},t=30000)=>cdp.send(m,p,sid,t);
 await cmd('Page.enable');await cmd('Page.setLifecycleEventsEnabled',{enabled:true});await cmd('DOM.enable');await cmd('Network.enable');
 await cmd('Network.setCacheDisabled',{cacheDisabled:true});await cmd('Network.setBypassServiceWorker',{bypass:true});
 await cmd('Emulation.setDeviceMetricsOverride',DEVICE);await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await cmd('Emulation.setCPUThrottlingRate',{rate:4});await cmd('Network.emulateNetworkConditions',NETWORK);
 await cmd('Emulation.setScriptExecutionDisabled',{value:arm==='B'});
 off.push(cdp.on('Page.lifecycleEvent',x=>{events.push(x)},sid));
 off.push(cdp.on('Network.requestWillBeSent',x=>{if(x.type==='Document'&&x.request?.url?.replace(/\/$/,'')===URL.replace(/\/$/,''))navStart=x.timestamp;requests.set(x.requestId,{url:x.request?.url||'',type:x.type||'other',start:x.timestamp,status:null,finished:false,bytes:0})},sid));
 off.push(cdp.on('Network.responseReceived',x=>{const t=requests.get(x.requestId);if(t){t.status=x.response?.status;t.mime=x.response?.mimeType;t.responseAt=x.timestamp;if(t.type==='Document'&&x.response?.url?.replace(/\/$/,'')===URL.replace(/\/$/,'')){docStatus=t.status;docResponse=x.timestamp}}},sid));
 off.push(cdp.on('Network.loadingFinished',x=>{const t=requests.get(x.requestId);if(t){t.finished=true;t.end=x.timestamp;t.bytes=x.encodedDataLength;if(t.type==='Document'&&t.url.replace(/\/$/,'')===URL.replace(/\/$/,''))docEnd=x.timestamp}},sid));
 off.push(cdp.on('Network.loadingFailed',x=>{const t=requests.get(x.requestId);if(t){t.failed=x.errorText||'FAILED'}},sid));
 log(`Trial ${index}/${ORDER.length} ${arm==='A'?'JS_ON':'JS_OFF'} native ${URL}`);
 const started=Date.now(),nav=await cmd('Page.navigate',{url:URL},40000);assert(!nav.errorText,'NAV_FAILED_'+nav.errorText);assert(nav.loaderId&&nav.frameId,'NAV_MISSING_LOADER');
 let fcp,load;for(let i=0;i<185;i++){
 if(Date.now()-started>90000)break;
 fcp=getLifecycle(events,nav.loaderId,nav.frameId,'firstContentfulPaint');load=getLifecycle(events,nav.loaderId,nav.frameId,'load');
 if(fcp&&load)break;await sleep(400);
 }
 assert(docStatus===200,'DOCUMENT_HTTP_'+docStatus);
 assert(navStart!=null,'DOCUMENT_START_MISSING');assert(fcp,'FCP_LIFECYCLE_EVENT_MISSING');assert(load,'PAGE_LOAD_EVENT_MISSING');
 await sleep(800);
 const root=await cmd('DOM.getDocument',{depth:1,pierce:false},12000);assert(root.root?.nodeId,'DOM_ROOT_MISSING');
 const selectors=[['heading','h1#compare-page-title'],['hero','img[src*="halleus-synastry-chart-comparison.webp"]']];
 const boxes={};for(const [name,selector]of selectors){const n=await cmd('DOM.querySelector',{nodeId:root.root.nodeId,selector},10000);assert(n.nodeId>0,'SERVER_RENDERED_'+name.toUpperCase()+'_MISSING');const b=await cmd('DOM.getBoxModel',{nodeId:n.nodeId},10000);assert(b.model?.width>20&&b.model?.height>15,'SERVER_RENDERED_'+name.toUpperCase()+'_NOT_LAID_OUT');boxes[name]={width:round(b.model.width),height:round(b.model.height)}}
 const fcpMs=round((fcp.timestamp-navStart)*1000);assert(fcpMs>=0&&fcpMs<80000,'FCP_TIMESTAMP_INVALID_'+fcpMs);
 const res=[...requests.values()];const css=res.filter(x=>x.type==='Stylesheet'),fonts=res.filter(x=>x.type==='Font'),js=res.filter(x=>x.type==='Script');
 const ms=t=>t==null?null:round((t-navStart)*1000);
 const latest=a=>a.filter(x=>x.end!=null).length?Math.max(...a.filter(x=>x.end!=null).map(x=>ms(x.end))):null;
 const item={index,arm,utc:new Date().toISOString(),fcpMs,htmlFirstByteMs:ms(docResponse),htmlEndMs:ms(docEnd),fcpAfterHtmlMs:docEnd!=null?round((fcp.timestamp-docEnd)*1000):null,loadMs:ms(load.timestamp),cssCount:css.length,cssLatestEndMs:latest(css),fontCount:fonts.length,fontLatestEndMs:latest(fonts),scriptCount:js.length,scriptBytes:js.reduce((a,x)=>a+x.bytes,0),cssBytes:css.reduce((a,x)=>a+x.bytes,0),heroCount:res.filter(x=>x.url.includes('halleus-synastry-chart-comparison.webp')).length,boxes,documentHttpStatus:docStatus,jsEnabled:arm==='A'};
 log(`  FCP=${item.fcpMs}ms HTMLend=${item.htmlEndMs}ms CSS=${item.cssCount} font=${item.fontCount} JSRequests=${item.scriptCount} H1=${item.boxes.heading.width}x${item.boxes.heading.height}`);
 return item;
 }finally{off.forEach(f=>f());try{await cdp.send('Target.closeTarget',{targetId},undefined,7000)}catch(e){log('TARGET_CLOSE_WARNING '+e.message)}}
}
function report(){const A=data.trials.filter(x=>x.arm==='A'),B=data.trials.filter(x=>x.arm==='B');const fields=['fcpMs','htmlEndMs','fcpAfterHtmlMs','cssCount','cssLatestEndMs','fontCount','fontLatestEndMs','scriptCount','scriptBytes'];const summary={};for(const k of fields)summary[k]={jsOn:median(A.map(x=>x[k]).filter(Number.isFinite)),jsOff:median(B.map(x=>x[k]).filter(Number.isFinite))};summary.fcpEarlierWithJsOffMs=summary.fcpMs.jsOn-summary.fcpMs.jsOff;summary.fcpEarlierWithJsOffPercent=Number((summary.fcpEarlierWithJsOffMs/summary.fcpMs.jsOn*100).toFixed(2));summary.jsOnSpreadMs=Math.max(...A.map(x=>x.fcpMs))-Math.min(...A.map(x=>x.fcpMs));summary.jsOffSpreadMs=Math.max(...B.map(x=>x.fcpMs))-Math.min(...B.map(x=>x.fcpMs));summary.conclusion=Math.abs(summary.fcpEarlierWithJsOffMs)*2<=Math.max(summary.jsOnSpreadMs,summary.jsOffSpreadMs)?'INCONCLUSIVE_NOISE_DOMINATES':summary.fcpEarlierWithJsOffMs>0?'JS_INVOLVEMENT_SUGGESTED':'NO_SUPPORT_FOR_JS_BLOCKING';data.summary=summary;
 const lines=['# Halleus /compare - JavaScript execution ablation (NOT deployable A/B)','','- Browser: '+data.browser,'- Page: '+URL,'- Native HTML and CSS; JavaScript execution ON in A, OFF in B (test tab only).','- Viewport 390x844, 4x CPU, 1.6Mbps download, 150ms RTT, cache disabled.','- Important: this diagnoses first-paint sensitivity only. It does NOT mean we should disable JavaScript on the real site.','','| Median | JS on | JS off |','|---|---:|---:|',...fields.map(k=>`| ${k} | ${summary[k].jsOn??'N/A'} | ${summary[k].jsOff??'N/A'} |`),'',`- FCP difference (JS ON minus OFF): **${summary.fcpEarlierWithJsOffMs}ms (${summary.fcpEarlierWithJsOffPercent}%)**`,`- Verdict: **${summary.conclusion}** (small sample; timing noise possible)`,'','| Trial | Arm | FCP | HTML end | CSS | JS requests | H1 width |','|---:|:---:|---:|---:|---:|---:|---:|',...data.trials.map(x=>`| ${x.index} | ${x.arm} | ${x.fcpMs} | ${x.htmlEndMs} | ${x.cssCount} | ${x.scriptCount} | ${x.boxes.heading.width} |`),'','Do not deploy an all-JS-off variant. Follow up with targeted functional A/B only if diagnostic warrants.'];fs.writeFileSync(path.join(OUTPUT,'report.md'),lines.join('\n')+'\n','utf8');log('JS_AB_REPORT '+JSON.stringify(summary));}
async function main(){assert(OUTPUT&&CHROME,'MISSING_ARGUMENTS');assert(Number.isInteger(RUNS)&&RUNS>=1&&RUNS<=5,'BAD_RUN_COUNT');fs.mkdirSync(OUTPUT,{recursive:true});save();try{
 await startChrome();for(let i=0;i<ORDER.length;i++){let pass=false;for(let attempt=1;attempt<=2;attempt++){
 try{const x=await trial(ORDER[i],i+1);data.trials.push(x);data.attempts.push({index:i+1,arm:ORDER[i],attempt,status:'PASS'});pass=true;break}
 catch(e){log(`Trial ${i+1} ${ORDER[i]} attempt ${attempt}: ${e.message}`);data.attempts.push({index:i+1,arm:ORDER[i],attempt,status:'FAIL',error:e.stack||e.message});if(attempt===1)await sleep(750)}
 }save();if(!pass)log(`Trial ${i+1} failed twice; continuing safe independent trials`)}
 const countA=data.trials.filter(x=>x.arm==='A').length,countB=data.trials.filter(x=>x.arm==='B').length;
 assert(countA===RUNS&&countB===RUNS,`CANDIDATE_FAILURE: INCOMPLETE_TRIALS_A${countA}_B${countB}`);
 report();data.status='PASS';data.endUtc=new Date().toISOString();save();
 }catch(e){data.status='FAIL';data.error=e.stack||String(e);data.endUtc=new Date().toISOString();save();fs.writeFileSync(path.join(OUTPUT,'FAILURE.txt'),data.error+'\n','utf8');console.error('JS_AB_FAILED '+e.message);process.exitCode=1;}
 finally{cdp?.close();try{chrome?.kill()}catch{};if(profile){try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:400})}catch{log('CHROME_PROFILE_RETAINED '+profile)}}}
}
main();
'@
try {
    [IO.File]::WriteAllText($jsFile,$script,(New-Object System.Text.UTF8Encoding($false)))
    Write-Host '[2/3] 5+5 /COMPARE FIRST PAINT JS ON/OFF DIAGNOSTIC' -ForegroundColor Cyan
    & $node.Source $jsFile "--chrome=$chrome" "--output=$out"
    $result = $LASTEXITCODE
    if ($result -ne 0) {
        $zip = Join-Path (Join-Path $HOME 'Downloads') "HalleusCompareJSAblationAB-FailureLogs-$stamp.zip"
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
    if ($result -ne 0) { throw 'COMPARE_JS_AB_FAILED' }
    Write-Host 'HALLEUS_COMPARE_JS_AB_COMPLETE' -ForegroundColor Green
}
finally {
    Remove-Item -LiteralPath $jsFile -Force -ErrorAction SilentlyContinue
}