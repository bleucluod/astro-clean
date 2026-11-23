param(
  [Parameter(Mandatory = $true)] [string] $RepoPath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
# Read-only diagnostic. Nothing in the repo, GitHub, or VPS is modified.
$repo = (Resolve-Path -LiteralPath $RepoPath).Path
$origin = (& git -C $repo remote get-url origin | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -notin @('https://github.com/bleucluod/astro-clean','https://github.com/bleucluod/astro-clean.git','git@github.com:bleucluod/astro-clean.git')) { throw 'SAFETY_FATAL: WRONG_REPO_OR_ORIGIN' }
$branch = (& git -C $repo branch --show-current | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -cne 'main') { throw 'SAFETY_FATAL: EXPECTED_MAIN' }
$before = @(& git -C $repo -c core.quotepath=false status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: GIT_STATUS_FAILED' }
Write-Host '[1/3] READ-ONLY SAFETY' -ForegroundColor Cyan
if ($before.Count) { Write-Host 'DIRTY_WORKTREE_PRESERVED: no pull, stash, checkout, or tracked file writes.' -ForegroundColor Yellow }
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
$out = Join-Path (Join-Path $HOME 'Downloads') "HalleusCompareHeroDiag-results-$stamp"
$jsFile = Join-Path ([IO.Path]::GetTempPath()) "HalleusCompareHeroDiag-$stamp-$([guid]::NewGuid().ToString('N')).js"
New-Item -ItemType Directory -Path $out -Force | Out-Null
$script = @'
'use strict';
// Live compare mobile hero LCP diagnostics via native loading, not an A/B and not Lighthouse.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {setTimeout:pause}=require('node:timers/promises');
const cli=Object.fromEntries(process.argv.slice(2).map(s=>{let p=s.indexOf('=');return p<0? [s.slice(2),true]:[s.slice(2,p),s.slice(p+1)]}));
const OUT=cli.output,CHROME=cli.chrome;
const URL='https://halleus.ir/compare';
const HERO='/halleus-synastry-chart-comparison.webp';
const NETWORK={offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750};
const DEVICE={width:390,height:844,deviceScaleFactor:2.75,mobile:true};
const RUNS=5;
const data={schema:1,status:'STARTED',url:URL,hero:HERO,method:'native CDP navigation; no HTML interception',startUtc:new Date().toISOString(),trials:[],attempts:[],environment:{node:process.version,os:os.platform(),cpu:os.cpus()[0]?.model||null,viewport:DEVICE,network:NETWORK,cpuThrottlingRate:4},limitations:['Lab-like local CPU and network throttling, not Google PSI or Lighthouse.', 'This is a diagnostic baseline, not a controlled A/B or proof of improvement.', 'Remote server/ISP jitter and Chrome background conditions can affect each run.', 'No HTML, network response, source, GitHub or VPS mutations.']};
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
 const o=window.__halleusPerfDiag={lcps:[],shifts:[],cls:0,errors:[]};
 try{new PerformanceObserver(list=>{for(const e of list.getEntries())o.lcps.push({ms:e.startTime,renderMs:e.renderTime,loadMs:e.loadTime,url:e.url||'',size:e.size,element:e.element?.tagName?.toLowerCase()||null,classes:typeof e.element?.className==='string'?e.element.className.slice(0,160):null})}).observe({type:'largest-contentful-paint',buffered:true})}catch(e){o.errors.push('lcp: '+e.message)}
 try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput){o.cls+=e.value;o.shifts.push({ms:e.startTime,value:e.value})}}).observe({type:'layout-shift',buffered:true})}catch(e){o.errors.push('cls: '+e.message)}
 })();`;
async function openChrome(){
 profilePath=fs.mkdtempSync(path.join(os.tmpdir(),'halleus-compare-diag-chrome-'));
 const args=['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profilePath}`,'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-sync','about:blank'];
 if(process.platform==='linux'&&process.getuid?.()===0)args.unshift('--no-sandbox');
 chromeProcess=spawn(CHROME,args,{stdio:'ignore',windowsHide:true});chromeProcess.on('error',e=>launchError=e);
 let port;for(let i=0;i<100;i++){if(launchError)throw Error(`CHROME_LAUNCH_FAILED: ${launchError.message}`);if(chromeProcess.exitCode!==null)throw Error(`CHROME_EARLY_EXIT_${chromeProcess.exitCode}`);const p=path.join(profilePath,'DevToolsActivePort');if(fs.existsSync(p)){const line=fs.readFileSync(p,'utf8').split(/\r?\n/)[0];if(/^\d+$/.test(line)){port=Number(line);break}}await pause(200)}
 assert(port,'CHROME_DEVTOOLS_PORT_MISSING');const r=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(10000)});assert(r.ok,`CDP_HTTP_${r.status}`);const v=await r.json();data.environment.chrome=v.Browser;cdp=await CDP.connect(v.webSocketDebuggerUrl);log(`Chrome ${v.Browser}, DevTools localhost`)
}
async function runTrial(index){
 const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});
 let sid,cleanups=[],documentStarted,network=new Map(),mainStatus=null;
 try{
 ({sessionId:sid}=await cdp.send('Target.attachToTarget',{targetId,flatten:true}));
 const send=(m,p={},t)=>cdp.send(m,p,sid,t);
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Network.setBypassServiceWorker',{bypass:true});
 await send('Emulation.setDeviceMetricsOverride',DEVICE);await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await send('Emulation.setCPUThrottlingRate',{rate:4});await send('Network.emulateNetworkConditions',NETWORK);
 await send('Page.addScriptToEvaluateOnNewDocument',{source:PROBE});
 cleanups.push(cdp.on('Network.requestWillBeSent',p=>{
   if(p.type==='Document'&&p.request?.url?.replace(/\/$/,'')===URL)documentStarted=p.timestamp;
   if(p.request?.url?.includes(HERO))network.set(p.requestId,{id:p.requestId,url:p.request.url,start:p.timestamp,initiator:p.initiator?.type,initialPriority:p.request.initialPriority||null});
 },sid));
 cleanups.push(cdp.on('Network.requestWillBeSentExtraInfo',p=>{},sid));
 cleanups.push(cdp.on('Network.resourceChangedPriority',p=>{const x=network.get(p.requestId);if(x)x.priority=p.newPriority},sid));
 cleanups.push(cdp.on('Network.responseReceived',p=>{if(p.type==='Document'&&p.response?.url?.startsWith(URL))mainStatus=p.response.status;const x=network.get(p.requestId);if(x){x.status=p.response?.status;x.mime=p.response?.mimeType;x.protocol=p.response?.protocol;x.fromDiskCache=!!p.response?.fromDiskCache;x.fromServiceWorker=!!p.response?.fromServiceWorker;x.responseAt=p.timestamp}},sid));
 cleanups.push(cdp.on('Network.loadingFinished',p=>{const x=network.get(p.requestId);if(x){x.finishedAt=p.timestamp;x.encodedDataLength=p.encodedDataLength}},sid));
 cleanups.push(cdp.on('Network.loadingFailed',p=>{const x=network.get(p.requestId);if(x)x.error=p.errorText||'FAILED'},sid));
 log(`Trial ${index}/${RUNS}: native navigation ${URL}`);const wall=Date.now();
 const nav=await send('Page.navigate',{url:URL},35000);assert(!nav.errorText,`NAVIGATION_FAILED: ${nav.errorText}`);
 let ready=false;for(let i=0;i<150;i++){if(Date.now()-wall>90000)throw Error('PAGE_LOAD_TIMEOUT');await pause(400);let r;try{r=await send('Runtime.evaluate',{expression:'document.readyState',returnByValue:true},5000)}catch{continue}if(r.result?.value==='complete'){ready=true;break}}
 assert(ready,'DOCUMENT_DID_NOT_COMPLETE');await pause(2000);
 const expression=`JSON.stringify((()=>{const i=document.querySelector('img[src*="halleus-synastry-chart-comparison.webp"]');return {url:location.href,observer:window.__halleusPerfDiag,paints:performance.getEntriesByType('paint').map(x=>({name:x.name,ms:x.startTime})),nav:performance.getEntriesByType('navigation').map(x=>({responseStart:x.responseStart,responseEnd:x.responseEnd,domContentLoaded:x.domContentLoadedEventEnd,loadEnd:x.loadEventEnd})),images:performance.getEntriesByType('resource').filter(x=>x.name.includes('halleus-synastry-chart-comparison.webp')).map(x=>({startTime:x.startTime,responseStart:x.responseStart,responseEnd:x.responseEnd,duration:x.duration,transferSize:x.transferSize,encodedBodySize:x.encodedBodySize,decodedBodySize:x.decodedBodySize,initiatorType:x.initiatorType})),heroImg:i?{src:i.currentSrc,complete:i.complete,naturalWidth:i.naturalWidth,naturalHeight:i.naturalHeight,loading:i.loading,fetchPriority:i.fetchPriority,clientWidth:Math.round(i.getBoundingClientRect().width),clientHeight:Math.round(i.getBoundingClientRect().height)}:null,preloadLinks:[...document.querySelectorAll('link[rel=preload]')].filter(x=>x.href.includes('halleus-synastry-chart-comparison.webp')).length}})())`;
 const ev=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},15000);
 assert(!ev.exceptionDetails,'RUNTIME_EVALUATION_FAILED');const page=JSON.parse(ev.result?.value||'null');assert(page&&page.url.replace(/\/$/,'')===URL,'WRONG_PAGE_OR_REDIRECT');
 const lcps=page.observer?.lcps||[],lcp=lcps.at(-1),fcp=page.paints.find(x=>x.name==='first-contentful-paint');
 assert(lcp&&Number.isFinite(lcp.ms),'MISSING_LCP');assert(fcp&&Number.isFinite(fcp.ms),'MISSING_FCP');assert(page.heroImg?.src?.includes(HERO),'EXPECTED_HERO_IMAGE_MISSING');assert(page.heroImg.complete&&page.heroImg.naturalWidth>0,'HERO_IMAGE_INCOMPLETE');assert(mainStatus===200,`UNEXPECTED_MAIN_STATUS_${mainStatus}`);
 const requests=[...network.values()].map(r=>({...r,startAfterDocMs:round(documentStarted==null?NaN:(r.start-documentStarted)*1000),transferDurationMs:round(r.finishedAt==null?NaN:(r.finishedAt-r.start)*1000),completed:Number.isFinite(r.finishedAt)&&!r.error}));
 assert(requests.length>=1,'HERO_REQUEST_MISSING');assert(requests.some(x=>x.completed&&x.status===200),'HERO_DOWNLOAD_NOT_COMPLETE');
 const earliest=requests.reduce((a,b)=>a.start<b.start?a:b);
 const isHeroLcp=lcp.url.includes(HERO);
 const item={index,utc:new Date().toISOString(),lcpMs:round(lcp.ms),fcpMs:round(fcp.ms),cls:Math.round((page.observer.cls||0)*100000)/100000,isHeroLcp,lcp,hero:page.heroImg,heroRequests:requests,requestCount:requests.length,firstHeroStartMs:earliest.startAfterDocMs,firstHeroAfterResponseMs:round(earliest.startAfterDocMs-(page.nav[0]?.responseStart||0)),firstHeroTransferMs:earliest.transferDurationMs,firstHeroBytes:earliest.encodedDataLength||null,renderAfterImageLoadMs:isHeroLcp?round(lcp.renderMs-lcp.loadMs):null,mainStatus,preloadLinks:page.preloadLinks,nav:page.nav,resourceTiming:page.images,observerErrors:page.observer?.errors||[],elapsedWallMs:Date.now()-wall};
 log(`  LCP=${item.lcpMs}ms FCP=${item.fcpMs}ms heroLCP=${isHeroLcp} heroStart=${item.firstHeroStartMs}ms transfer=${item.firstHeroTransferMs}ms bytes=${item.firstHeroBytes} requests=${requests.length}`);
 return item;
 }finally{cleanups.forEach(fn=>fn());try{await cdp.send('Target.closeTarget',{targetId},undefined,7000)}catch(e){log('Target cleanup warning: '+e.message)}}
}
function report(){const xs=data.trials,med=f=>median(xs.map(f));const m={lcpMs:med(x=>x.lcpMs),fcpMs:med(x=>x.fcpMs),cls:med(x=>x.cls),heroStartMs:med(x=>x.firstHeroStartMs),heroAfterResponseMs:med(x=>x.firstHeroAfterResponseMs),heroTransferMs:med(x=>x.firstHeroTransferMs),heroBytes:med(x=>x.firstHeroBytes),renderDelayMs:med(x=>x.renderAfterImageLoadMs),heroLcpCount:xs.filter(x=>x.isHeroLcp).length,heroRequestCount:med(x=>x.requestCount)};data.summary=m;
 const lines=['# Halleus /compare – mobile hero diagnostics','','- Date UTC: '+new Date().toISOString(),'- URL: '+URL,'- Browser: '+data.environment.chrome,'- 390x844; 4x CPU; 1.6Mbps down; 150ms RTT; browser cache disabled; native page load, **no interception**.','- This is **not A/B**. The production page is measured unchanged. No PSI/Lighthouse score.','','## Median of 5 runs','',`- LCP: **${m.lcpMs} ms**; FCP: ${m.fcpMs} ms; CLS: ${m.cls}`,`- Hero begins: **${m.heroStartMs} ms after document request** (**${m.heroAfterResponseMs} ms after HTML response start**); image network transfer: **${m.heroTransferMs} ms**; encoded transfer: ${m.heroBytes} bytes`,`- Hero is LCP in **${m.heroLcpCount} / ${xs.length}** runs; render delay after image load (hero LCP only): ${m.renderDelayMs} ms`,'','## Trials','','| # | LCP | FCP | Hero LCP? | Hero starts | Transfer duration | Bytes | Requests |','|---:|---:|---:|:---:|---:|---:|---:|---:|',...xs.map(x=>`| ${x.index} | ${x.lcpMs} | ${x.fcpMs} | ${x.isHeroLcp?'Yes':'No'} | ${x.firstHeroStartMs} | ${x.firstHeroTransferMs} | ${x.firstHeroBytes} | ${x.requestCount} |`),'','## Interpretation boundary','', 'The hero may or may not be the actual LCP for this viewport. Compare the recorded LCP element and network timing before choosing a targeted A/B candidate. Do not infer a benefit from this diagnostic alone.','',...data.limitations.map(x=>'- '+x)];fs.writeFileSync(path.join(OUT,'report.md'),lines.join('\n')+'\n','utf8');log('REPORT_READY '+JSON.stringify(m));}
(async()=>{try{flush();await openChrome();for(let i=1;i<=RUNS;i++){let pass=false;for(let attempt=1;attempt<=2;attempt++){try{const x=await runTrial(i);data.attempts.push({index:i,attempt,status:'PASS'});data.trials.push(x);pass=true;break}catch(e){data.attempts.push({index:i,attempt,status:'FAIL',error:e.stack||e.message});log(`Trial ${i} attempt ${attempt} failed: ${e.message}`);if(attempt===1)await pause(1000)}}flush();if(!pass)log(`Trial ${i}: all attempts failed; continuing independent trials`)}
 assert(data.trials.length===RUNS,`INCOMPLETE_TRIALS: ${data.trials.length}/${RUNS}`);data.status='PASS';data.endUtc=new Date().toISOString();report();flush();
 }catch(e){data.status='FAIL';data.endUtc=new Date().toISOString();data.error=e.stack||e.message;flush();fs.writeFileSync(path.join(OUT,'FAILURE.txt'),data.error+'\n');console.error('COMPARE_DIAG_FAILED:',e.message);process.exitCode=1;
 }finally{cdp?.close();if(chromeProcess){try{chromeProcess.kill()}catch{}}if(profilePath){try{fs.rmSync(profilePath,{recursive:true,force:true,maxRetries:2,retryDelay:300})}catch{log('Chrome profile retained for manual cleanup: '+profilePath)}}}})();
'@
try {
  [IO.File]::WriteAllText($jsFile, $script, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host '[2/3] 5 NATIVE MOBILE LOADS /compare (LIVE, READ-ONLY)' -ForegroundColor Cyan
  & $node.Source $jsFile "--chrome=$chrome" "--output=$out"
  $exit = $LASTEXITCODE
  if ($exit -ne 0) { throw 'CANDIDATE_FAILURE: DIAGNOSTIC_TRIALS_FAILED' }
  Write-Host '[3/3] RESULTS' -ForegroundColor Cyan
  Get-Content -LiteralPath (Join-Path $out 'report.md')
  Write-Host "REPORT: $(Join-Path $out 'report.md')"
  Write-Host "RAW_JSON: $(Join-Path $out 'results.json')"
  Write-Host 'HALLEUS_COMPARE_DIAG_COMPLETE' -ForegroundColor Green
} catch {
  Write-Host "DIAGNOSTIC_FAILED: $($_.Exception.Message)" -ForegroundColor Red
  $logZip = Join-Path (Join-Path $HOME 'Downloads') "HalleusCompareHeroDiag-FailureLogs-$stamp.zip"
  try { Compress-Archive -Path (Join-Path $out '*') -DestinationPath $logZip -Force; Write-Host "FAILURE_LOGS: $logZip" } catch { Write-Warning "FailureLogs packaging failed: $($_.Exception.Message)" }
  throw
} finally {
  Remove-Item -LiteralPath $jsFile -Force -ErrorAction SilentlyContinue
  $after = @(& git -C $repo -c core.quotepath=false status --porcelain --untracked-files=all)
  if ($LASTEXITCODE -eq 0) {
    Write-Host "FINAL_GIT_STATUS: $($after.Count) entries"
    $changes = @($after | Where-Object { $_ -notin $before })
    if ($changes.Count) { Write-Warning "WORKTREE_CHANGED: $($changes -join ', ')" }
    else { Write-Host 'WORKTREE_UNCHANGED_BY_RUNNER' }
  }
}