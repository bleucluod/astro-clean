param(
  [Parameter(Mandatory=$true)] [string] $RepoPath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = (Resolve-Path -LiteralPath $RepoPath -ErrorAction Stop).Path
if (-not (Test-Path -LiteralPath (Join-Path $repo '.git'))) { throw 'SAFETY_FATAL: NOT_GIT_REPO' }
$origin = (& git -C $repo remote get-url origin | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -notin @('https://github.com/bleucluod/astro-clean','https://github.com/bleucluod/astro-clean.git','git@github.com:bleucluod/astro-clean.git')) { throw 'SAFETY_FATAL: WRONG_REPOSITORY' }
$branch = (& git -C $repo branch --show-current | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -cne 'main') { throw 'SAFETY_FATAL: EXPECTED_MAIN' }
$ref = @(& git -C $repo ls-remote origin refs/heads/main)
if ($LASTEXITCODE -ne 0 -or $ref.Count -ne 1) { throw 'EXTERNAL_BLOCK: REMOTE_REF_UNAVAILABLE' }
$remoteHead=($ref[0] -split '\s+')[0]
$expectedBase = '1b04d72dbb2692b35e1608542005571fefe2f5a1'
& git -C $repo merge-base --is-ancestor $expectedBase $remoteHead
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: UNEXPECTED_GITHUB_HISTORY' }
$before = @(& git -C $repo -c core.quotepath=false status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: GIT_STATUS_FAILED' }
Write-Host '[1/3] READ-ONLY SAFETY' -ForegroundColor Cyan
Write-Host "VERIFIED_REMOTE_MAIN: $remoteHead"
if ($before.Count) { Write-Host 'DIRTY_WORKTREE_PRESERVED; no checkout, stash, pull or source edits.' -ForegroundColor Yellow }
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { throw 'EXTERNAL_BLOCK: NODE_22_REQUIRED' }
$nodeV = (& $node.Source -p 'process.versions.node' | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [version]$nodeV -lt [version]'22.0.0') { throw 'EXTERNAL_BLOCK: NODE_22_REQUIRED' }
$chrome = @(
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
if (-not $chrome) { throw 'EXTERNAL_BLOCK: GOOGLE_CHROME_NOT_INSTALLED' }
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$out = Join-Path (Join-Path $HOME 'Downloads') "HalleusCompareRenderDiag-results-$stamp"
$jsFile = Join-Path ([IO.Path]::GetTempPath()) "HalleusCompareRenderDiag-$stamp-$([guid]::NewGuid().ToString('N')).js"
New-Item -ItemType Directory -Path $out -Force | Out-Null
$script = @'
'use strict';
// Live /compare first-paint diagnostic; native navigation, no content or request interception.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {setTimeout:pause}=require('node:timers/promises');
const cli=Object.fromEntries(process.argv.slice(2).map(s=>{let p=s.indexOf('=');return p<0? [s.slice(2),true]:[s.slice(2,p),s.slice(p+1)]}));
const OUT=cli.output,CHROME=cli.chrome;
const URL=cli.fixtureUrl||'https://halleus.ir/compare';
const HERO='/halleus-synastry-chart-comparison.webp';
const NETWORK={offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750};
const DEVICE={width:390,height:844,deviceScaleFactor:2.75,mobile:true};
const RUNS=Number(cli.runs||5);
const data={schema:1,status:'STARTED',url:URL,method:'native CDP page loads, no interception, CSS/font/script and paint diagnostics',startUtc:new Date().toISOString(),trials:[],attempts:[],environment:{node:process.version,os:os.platform(),cpu:os.cpus()[0]?.model||null,viewport:DEVICE,network:NETWORK,cpuThrottlingRate:4},limitations:['Not Lighthouse, Google PSI or field performance; the emulator and ISP can introduce variability.','Long Task API only includes tasks >=50ms; missing tasks do not prove an idle main thread.','Network timing correlations alone cannot establish which resource blocked FCP.','Performance.getMetrics counters cover the trial, not exclusively time before FCP.','Read-only: no request interception, app source changes, VPS or GitHub writes.']};
let chromeProcess,cdp,profilePath,launchError;
function log(s){console.log(`[${new Date().toISOString()}] ${s}`)}
function assert(ok,message){if(!ok)throw Error(message)}
const round=n=>Number.isFinite(n)?Math.round(n):null;
const median=a=>{const s=[...a].filter(Number.isFinite).sort((x,y)=>x-y);return s.length?s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2:null};
function flush(){fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(data,null,2),'utf8')}
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.id=0;this.pending=new Map();this.listeners=[];
   this.ws.addEventListener('message',e=>{let m;try{m=JSON.parse(String(e.data))}catch{return}
     if(m.id){const p=this.pending.get(m.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(m.id);m.error?p.reject(Error(`${p.method}: ${m.error.message}`)):p.resolve(m.result||{})}
     else if(m.method)for(const h of [...this.listeners])if(h.method===m.method&&h.session===m.sessionId)try{h.cb(m.params||{})}catch(err){console.error('CDP_LISTENER_ERROR:',err.message)};
   });
   this.ws.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('CDP_WS_CLOSED'))}this.pending.clear()});
 }
 static async connect(url){const c=new CDP(url);await new Promise((yes,no)=>{const t=setTimeout(()=>no(Error('CDP_OPEN_TIMEOUT')),15000);c.ws.addEventListener('open',()=>{clearTimeout(t);yes()},{once:true});c.ws.addEventListener('error',()=>{clearTimeout(t);no(Error('CDP_CONNECT_FAILED'))},{once:true})});return c}
 send(method,params={},sid,timeout=30000){return new Promise((yes,no)=>{const id=++this.id;const timer=setTimeout(()=>{this.pending.delete(id);no(Error(`${method}: TIMEOUT`))},timeout);this.pending.set(id,{resolve:yes,reject:no,timer,method});try{this.ws.send(JSON.stringify({id,method,params,...sid?{sessionId:sid}:{}}))}catch(e){clearTimeout(timer);this.pending.delete(id);no(e)}})}
 on(method,cb,session){const h={method,cb,session};this.listeners.push(h);return ()=>{this.listeners=this.listeners.filter(x=>x!==h)}}
 close(){try{this.ws.close()}catch{}}
}
const PROBE=`(()=>{
  const p=window.__halleusPaintProbe={lcps:[],shifts:[],cls:0,longTasks:[],errors:[],supported:PerformanceObserver.supportedEntryTypes||[]};
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())p.lcps.push({ms:e.startTime,renderMs:e.renderTime,loadMs:e.loadTime,url:e.url||'',size:e.size,element:e.element?.tagName?.toLowerCase()||null,classes:typeof e.element?.className==='string'?e.element.className.slice(0,120):null})}).observe({type:'largest-contentful-paint',buffered:true})}catch(e){p.errors.push('lcp:'+e.message)}
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput){p.cls+=e.value;p.shifts.push({ms:e.startTime,value:e.value})}}).observe({type:'layout-shift',buffered:true})}catch(e){p.errors.push('cls:'+e.message)}
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())p.longTasks.push({startMs:e.startTime,durationMs:e.duration})}).observe({type:'longtask',buffered:true})}catch(e){p.errors.push('longtask:'+e.message)}
})();`;
async function openChrome(){
 profilePath=fs.mkdtempSync(path.join(os.tmpdir(),'halleus-compare-render-chrome-'));
 const args=['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profilePath}`,'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-sync','about:blank'];
 if(process.platform==='linux'&&process.getuid?.()===0)args.unshift('--no-sandbox');
 chromeProcess=spawn(CHROME,args,{stdio:'ignore',windowsHide:true});chromeProcess.on('error',e=>launchError=e);
 let port;for(let i=0;i<100;i++){if(launchError)throw Error(`CHROME_LAUNCH_FAILED: ${launchError.message}`);if(chromeProcess.exitCode!==null)throw Error(`CHROME_EARLY_EXIT_${chromeProcess.exitCode}`);const p=path.join(profilePath,'DevToolsActivePort');if(fs.existsSync(p)){const line=fs.readFileSync(p,'utf8').split(/\r?\n/)[0];if(/^\d+$/.test(line)){port=Number(line);break}}await pause(200)}
 assert(port,'CHROME_DEVTOOLS_PORT_MISSING');const r=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(10000)});assert(r.ok,`CDP_HTTP_${r.status}`);const v=await r.json();data.environment.chrome=v.Browser;cdp=await CDP.connect(v.webSocketDebuggerUrl);log(`Chrome ${v.Browser}, DevTools localhost`)
}

const BROWSER_SNAPSHOT=`JSON.stringify((()=>{
  const n=performance.getEntriesByType('navigation')[0];
  const res=performance.getEntriesByType('resource');
  const safeName=(url)=>{try{const u=new URL(url);return u.origin===location.origin?u.pathname:u.hostname}catch{return 'unknown'}};
  const items=res.map(e=>({name:safeName(e.name),initiator:e.initiatorType||'',startMs:Math.round(e.startTime),responseStartMs:Math.round(e.responseStart),endMs:Math.round(e.responseEnd),durationMs:Math.round(e.duration),transferBytes:e.transferSize||0,decodedBytes:e.decodedBodySize||0,renderBlockingStatus:e.renderBlockingStatus||'unknown'}));
  const styles=[...document.querySelectorAll('link[rel~=stylesheet]')].map(e=>({path:safeName(e.href),media:e.media||'all',disabled:!!e.disabled}));
  const hero=document.querySelector('img[src*="halleus-synastry-chart-comparison.webp"]');
  return {url:location.href,ready:document.readyState,paint:performance.getEntriesByType('paint').map(e=>({name:e.name,ms:Math.round(e.startTime)})),nav:n?{responseStartMs:Math.round(n.responseStart),responseEndMs:Math.round(n.responseEnd),domContentLoadedMs:Math.round(n.domContentLoadedEventEnd),loadEndMs:Math.round(n.loadEventEnd),durationMs:Math.round(n.duration),transferBytes:n.transferSize}:null,probe:window.__halleusPaintProbe,resources:items,styles,computedFont:document.querySelector('h1')?getComputedStyle(document.querySelector('h1')).fontFamily:null,fontStatus:document.fonts.status,hero:hero?{complete:hero.complete,src:safeName(hero.currentSrc||hero.src),naturalWidth:hero.naturalWidth,naturalHeight:hero.naturalHeight}:null};
})())`;
function chooseResourceGroup(items,pattern){return items.filter(pattern).sort((a,b)=>a.endMs-b.endMs)}
function summarizePage(p){
 const lcp=p.probe?.lcps?.at(-1),fcp=p.paint.find(x=>x.name==='first-contentful-paint');
 assert(fcp&&Number.isFinite(fcp.ms),'MISSING_FCP');assert(lcp&&Number.isFinite(lcp.ms),'MISSING_LCP');
 assert(p.nav&&Number.isFinite(p.nav.responseEndMs),'NAVIGATION_TIMING_MISSING');
 const css=chooseResourceGroup(p.resources,r=>r.initiator==='link'&&r.name.endsWith('.css')||r.name.endsWith('.css'));
 const fonts=chooseResourceGroup(p.resources,r=>/\.(?:woff2?|ttf|otf)$/i.test(r.name));
 const js=chooseResourceGroup(p.resources,r=>r.name.endsWith('.js'));
 const blockingCss=css.filter(r=>r.renderBlockingStatus==='blocking');
 const beforeFcp=group=>group.filter(r=>r.endMs>0&&r.endMs<=fcp.ms);
 const longtasks=p.probe.longTasks||[];
 const tasksBeforeFcp=longtasks.filter(t=>t.startMs<fcp.ms);
 const overlap=tasksBeforeFcp.reduce((acc,t)=>acc+Math.max(0,Math.min(fcp.ms,t.startMs+t.durationMs)-Math.max(0,t.startMs)),0);
 const latest=(items)=>items.length?Math.max(...items.map(x=>x.endMs)):null;
 const totals=(items)=>items.reduce((a,r)=>a+(r.transferBytes||0),0);
 const lastRelevant=beforeFcp(p.resources).sort((a,b)=>b.endMs-a.endMs).slice(0,12);
 return {fcpMs:fcp.ms,lcpMs:round(lcp.ms),cls:round(p.probe.cls),isHeroLcp:!!lcp.url.includes(HERO.slice(1)),htmlFirstByteMs:p.nav.responseStartMs,htmlEndMs:p.nav.responseEndMs,domContentLoadedMs:p.nav.domContentLoadedMs,loadEndMs:p.nav.loadEndMs,htmlEndToFcpMs:round(fcp.ms-p.nav.responseEndMs),cssCount:css.length,cssLastEndMs:latest(css),cssBeforeFcpLastEndMs:latest(beforeFcp(css)),cssBlockingCount:blockingCss.length,cssBlockingLastEndMs:latest(blockingCss),cssTransferBytes:totals(css),fontCount:fonts.length,fontLastEndMs:latest(fonts),fontBeforeFcpLastEndMs:latest(beforeFcp(fonts)),fontTransferBytes:totals(fonts),jsCount:js.length,jsLastEndMs:latest(js),jsTransferBytes:totals(js),longTaskCountBeforeFcp:tasksBeforeFcp.length,longTaskOverlapBeforeFcpMs:round(overlap),longestTaskBeforeFcpMs:round(Math.max(0,...tasksBeforeFcp.map(x=>x.durationMs))),longTaskCountTotal:longtasks.length,fontStatus:p.fontStatus,computedFont:p.computedFont,resourceCount:p.resources.length,resourcesLastBeforeFcp:lastRelevant,css,fonts,js:js.slice(0,35),styles:p.styles,observerErrors:p.probe.errors||[],longTasks:longtasks.slice(0,100),nav:p.nav,lcp};
}
async function runTrial(index){
 const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});
 let sid,offs=[],mainStatus=null,metricSummary=null;
 try{
 ({sessionId:sid}=await cdp.send('Target.attachToTarget',{targetId,flatten:true}));
 const cmd=(m,p={},t=30000)=>cdp.send(m,p,sid,t);
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');await cmd('Performance.enable');
 await cmd('Network.setCacheDisabled',{cacheDisabled:true});await cmd('Network.setBypassServiceWorker',{bypass:true});
 await cmd('Emulation.setDeviceMetricsOverride',DEVICE);await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await cmd('Emulation.setCPUThrottlingRate',{rate:4});await cmd('Network.emulateNetworkConditions',NETWORK);
 await cmd('Page.addScriptToEvaluateOnNewDocument',{source:PROBE});
 offs.push(cdp.on('Network.responseReceived',e=>{if(e.type==='Document'&&e.response?.url?.replace(/\/$/,'')===URL.replace(/\/$/,''))mainStatus=e.response.status},sid));
 log(`Trial ${index}/${RUNS}: native navigation ${URL}`);
 const started=Date.now(),nav=await cmd('Page.navigate',{url:URL},40000);
 assert(!nav.errorText,'NAVIGATION_FAILED_'+nav.errorText);
 let ready=false;
 for(let i=0;i<175;i++){
  if(Date.now()-started>90000)break;
  await pause(400);
  try{const r=await cmd('Runtime.evaluate',{expression:'document.readyState',returnByValue:true},5500);if(r.result?.value==='complete'){ready=true;break}}catch{}
 }
 assert(ready,'PAGE_DID_NOT_COMPLETE');await pause(1800);
 const ev=await cmd('Runtime.evaluate',{expression:BROWSER_SNAPSHOT,returnByValue:true,awaitPromise:true},18000);
 assert(!ev.exceptionDetails,'SNAPSHOT_EVALUATION_FAILED');
 const p=JSON.parse(ev.result?.value||'null');
 assert(p&&p.url.replace(/\/$/,'')===URL.replace(/\/$/,''),'WRONG_PAGE_OR_REDIRECT');
 assert(mainStatus===200,'UNEXPECTED_HTML_HTTP_'+mainStatus);
 assert(p.hero&&p.hero.complete&&p.hero.naturalWidth>0,'EXPECTED_HERO_IMAGE_MISSING');
 assert(p.probe,'EARLY_PERFORMANCE_PROBE_NOT_INSTALLED');
 const m=await cmd('Performance.getMetrics');
 metricSummary=Object.fromEntries((m.metrics||[]).filter(x=>['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','JSHeapUsedSize','Nodes'].includes(x.name)).map(x=>[x.name,x.value]));
 const x={index,utc:new Date().toISOString(),...summarizePage(p),performanceMetrics:metricSummary,scriptDurationMs:round((metricSummary.ScriptDuration||0)*1000),taskDurationMs:round((metricSummary.TaskDuration||0)*1000),layoutDurationMs:round((metricSummary.LayoutDuration||0)*1000),recalcStyleDurationMs:round((metricSummary.RecalcStyleDuration||0)*1000),hero:p.hero,elapsedWallMs:Date.now()-started};
 log(`  FCP=${x.fcpMs}ms LCP=${x.lcpMs}ms HTMLend=${x.htmlEndMs}ms gap=${x.htmlEndToFcpMs}ms CSS=${x.cssCount} fonts=${x.fontCount} longTaskOverlap=${x.longTaskOverlapBeforeFcpMs}ms`);
 return x;
 }finally{offs.forEach(f=>f());try{await cdp.send('Target.closeTarget',{targetId},undefined,7000)}catch(e){log('CLOSE_TARGET_WARNING '+e.message)}}
}
const med=(xs,key)=>median(xs.map(x=>x[key]));
function report(){
 const xs=data.trials;
 const keys=['fcpMs','lcpMs','htmlFirstByteMs','htmlEndMs','htmlEndToFcpMs','domContentLoadedMs','cssCount','cssBeforeFcpLastEndMs','cssBlockingCount','cssBlockingLastEndMs','cssTransferBytes','fontCount','fontBeforeFcpLastEndMs','fontTransferBytes','jsCount','jsTransferBytes','longTaskCountBeforeFcp','longTaskOverlapBeforeFcpMs','longestTaskBeforeFcpMs','scriptDurationMs','taskDurationMs','layoutDurationMs','recalcStyleDurationMs'];
 data.summary=Object.fromEntries(keys.map(k=>[k,med(xs,k)]));
 const m=data.summary;
 const lines=['# Halleus /compare - initial paint diagnostic','',`- UTC: ${new Date().toISOString()}`,'- Native, unmodified https://halleus.ir/compare; 390x844; 4x CPU; 1.6 Mbps; cache disabled.','- Correlation and timing only. No AB, no Lighthouse score.','','## 5-trial medians','',...keys.map(k=>`- ${k}: ${m[k]===null?'N/A':m[k]}`),'',`- Hero image was LCP in ${xs.filter(x=>x.isHeroLcp).length}/${xs.length} runs`,'','## Trials','','| # | FCP | LCP | HTML end | HTML→FCP | CSS count | Last CSS before FCP | Font count | Long task overlap before FCP |','|---:|---:|---:|---:|---:|---:|---:|---:|---:|',...xs.map(x=>`| ${x.index} | ${x.fcpMs} | ${x.lcpMs} | ${x.htmlEndMs} | ${x.htmlEndToFcpMs} | ${x.cssCount} | ${x.cssBeforeFcpLastEndMs??'N/A'} | ${x.fontCount} | ${x.longTaskOverlapBeforeFcpMs} |`),'','## Interpretation','', 'Timings suggest what to investigate next. They do not prove that CSS, fonts or JS caused a specific delay.', 'The long-task total is observer coverage, not the whole main-thread workload.', 'For exact render-blocking attribution a tracing follow-up may be required.', '', '## Largest late-finishing resources before FCP (one representative median-FCP run)'];
 const pivot=[...xs].sort((a,b)=>a.fcpMs-b.fcpMs)[xs.length>>1];
 lines.push(...pivot.resourcesLastBeforeFcp.map(x=>`- ${x.name} [${x.initiator} / ${x.renderBlockingStatus}] ${x.endMs}ms; transfer=${x.transferBytes} bytes`));
 fs.writeFileSync(path.join(OUT,'report.md'),lines.join('\n')+'\n','utf8');
 log('RENDER_DIAG_READY '+JSON.stringify(data.summary));
}
(async()=>{
 try{assert(OUT&&CHROME,'BAD_ARGUMENTS');assert(Number.isInteger(RUNS)&&RUNS>=1&&RUNS<=10,'BAD_RUN_COUNT');fs.mkdirSync(OUT,{recursive:true});flush();await openChrome();
 for(let i=1;i<=RUNS;i++){
  let pass=false;
  for(let attempt=1;attempt<=2;attempt++){
   try{const x=await runTrial(i);data.trials.push(x);data.attempts.push({index:i,attempt,status:'PASS'});pass=true;break}
   catch(e){data.attempts.push({index:i,attempt,status:'FAIL',error:e.stack||e.message});log(`Trial ${i} attempt ${attempt} failed: ${e.message}`);if(attempt===1)await pause(700)}
  }
  flush();if(!pass)log(`Trial ${i}: failed, continuing other independent trials`);
 }
 assert(data.trials.length===RUNS,`INCOMPLETE_TRIALS_${data.trials.length}_${RUNS}`);
 data.status='PASS';data.endUtc=new Date().toISOString();report();flush();
 }catch(e){data.status='FAIL';data.endUtc=new Date().toISOString();data.error=e.stack||String(e);flush();fs.writeFileSync(path.join(OUT,'FAILURE.txt'),data.error+'\n','utf8');console.error('RENDER_DIAG_FAILED '+e.message);process.exitCode=1;}
 finally{cdp?.close();try{chromeProcess?.kill()}catch{};if(profilePath){try{fs.rmSync(profilePath,{recursive:true,force:true,maxRetries:2,retryDelay:300})}catch{log('PROFILE_RETAINED '+profilePath)}}}
})();

'@
try {
  [IO.File]::WriteAllText($jsFile,$script,(New-Object System.Text.UTF8Encoding($false)))
  Write-Host '[2/3] 5 NATIVE /compare MOBILE RENDER TIMELINES' -ForegroundColor Cyan
  & $node.Source $jsFile "--chrome=$chrome" "--output=$out"
  $runExit = $LASTEXITCODE
  Write-Host '[3/3] RESULTS / GIT STATUS' -ForegroundColor Cyan
  if (Test-Path -LiteralPath (Join-Path $out 'report.md')) {
    Get-Content -LiteralPath (Join-Path $out 'report.md') -Encoding UTF8 | Select-Object -First 38
  }
  Write-Host "REPORT: $(Join-Path $out 'report.md')"
  Write-Host "RAW_JSON: $(Join-Path $out 'results.json')"
  if ($runExit -ne 0) {
    $zip = Join-Path (Join-Path $HOME 'Downloads') "HalleusCompareRenderDiag-FailureLogs-$stamp.zip"
    Compress-Archive -Path (Join-Path $out '*') -DestinationPath $zip -Force
    Write-Host "FAILURE_LOGS: $zip" -ForegroundColor Yellow
  }
  $after = @(& git -C $repo -c core.quotepath=false status --porcelain --untracked-files=all)
  if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: FINAL_GIT_STATUS_FAILED' }
  if (($before -join "`n") -cne ($after -join "`n")) { throw 'SAFETY_FATAL: WORKTREE_CHANGED' }
  Write-Host "WORKTREE_UNCHANGED_BY_RUNNER; GIT_STATUS_ENTRIES=$($after.Count)"
  & git -C $repo --no-pager diff --check
  if ($LASTEXITCODE -ne 0) { throw 'UNRELATED_BASELINE_FAILURE: GIT_DIFF_CHECK' }
  Write-Host 'GIT_DIFF_CHECK_PASS'
  if ($runExit -ne 0) { throw 'COMPARE_RENDER_DIAG_FAILED' }
  Write-Host 'HALLEUS_COMPARE_RENDER_DIAG_COMPLETE' -ForegroundColor Green
}
finally { Remove-Item -LiteralPath $jsFile -Force -ErrorAction SilentlyContinue }