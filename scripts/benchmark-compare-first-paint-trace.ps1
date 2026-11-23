param(
    [Parameter(Mandatory = $true)]
    [string] $RepoPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Chrome trace diagnostics only. No edits to source, GitHub, VPS or live page.
$expectedBase = '24499ffd389d2e1de5d2704e0ab667e6ddb77ee5'
$allowedOrigins = @(
    'https://github.com/bleucluod/astro-clean',
    'https://github.com/bleucluod/astro-clean.git',
    'git@github.com:bleucluod/astro-clean.git'
)
Write-Host '[1/3] READ-ONLY SAFETY / EXPECTED PULLED HEAD' -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $RepoPath -PathType Container)) { throw 'SAFETY_FATAL: REPO_NOT_FOUND' }
$repo = (Resolve-Path -LiteralPath $RepoPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $repo '.git'))) { throw 'SAFETY_FATAL: NOT_REPOSITORY' }
$origin = (& git -C $repo remote get-url origin | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -notin $allowedOrigins) { throw 'SAFETY_FATAL: WRONG_ORIGIN' }
$branch = (& git -C $repo branch --show-current | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -cne 'main') { throw 'SAFETY_FATAL: WRONG_BRANCH' }
$head = (& git -C $repo rev-parse HEAD | Out-String).Trim()
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: HEAD_READ_FAILED' }
& git -C $repo merge-base --is-ancestor $expectedBase $head
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: UNEXPECTED_HEAD_HISTORY' }
$remote = @(& git -C $repo ls-remote origin refs/heads/main)
if ($LASTEXITCODE -ne 0 -or $remote.Count -ne 1) { throw 'EXTERNAL_BLOCK: REMOTE_HEAD_UNAVAILABLE' }
$remoteHead = ($remote[0] -split '\s+')[0]
if ($remoteHead -cne $head) { throw 'SAFETY_FATAL: REPO_NOT_PULLED_TO_REMOTE_MAIN' }
if (-not (Test-Path -LiteralPath (Join-Path $repo 'scripts/benchmark-compare-first-paint-trace.ps1'))) { throw 'SAFETY_FATAL: RUNNER_MISSING_AFTER_PULL' }
$before = @(& git -C $repo -c core.quotepath=false status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: GIT_STATUS_FAILED' }
# Preserve pre-existing unrelated untracked files; reject modified tracked source.
$trackedChanges = @($before | Where-Object { $_ -notmatch '^\?\? ' })
if ($trackedChanges.Count -gt 0) { throw 'SAFETY_FATAL: TRACKED_WORKTREE_DIRTY' }
if ($before.Count) { Write-Host "PRESERVED_UNTRACKED_FILES=$($before.Count)" -ForegroundColor Yellow }
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { throw 'EXTERNAL_BLOCK: NODE_NOT_FOUND' }
$nodeVersion = (& $node.Source -p 'process.versions.node' | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [version]$nodeVersion -lt [version]'22.0.0') { throw 'EXTERNAL_BLOCK: NODE_22_REQUIRED' }
$chrome = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
if (-not $chrome) { throw 'EXTERNAL_BLOCK: CHROME_NOT_FOUND' }

$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$download = Join-Path $HOME 'Downloads'
$out = Join-Path $download "HalleusCompareFirstPaintTrace-results-$stamp"
$jsPath = Join-Path ([IO.Path]::GetTempPath()) "HalleusCompareFirstPaintTrace-$stamp-$([guid]::NewGuid().ToString('N')).js"
New-Item -ItemType Directory -Path $out -Force | Out-Null

$script = @'
'use strict';
// Controlled mobile Chrome Performance Trace for live /compare; no response interception.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const zlib = require('node:zlib');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');
const opts = Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>[x.slice(2,x.indexOf('=')),x.slice(x.indexOf('=')+1)]));
const TARGET = opts.url || 'https://halleus.ir/compare';
const OUTPUT = opts.output;
const BROWSER = opts.chrome;
const RUNS = Number(opts.runs || 3);
const NETWORK = { offline:false, latency:150, downloadThroughput:200000, uploadThroughput:93750 };
const DEVICE = { width:390,height:844,deviceScaleFactor:2.75,mobile:true };
const TRACE_CATS = 'devtools.timeline,disabled-by-default-devtools.timeline,blink.user_timing,loading,blink,cc,renderer.scheduler';
const HERO = 'halleus-synastry-chart-comparison.webp';
const assert = (v,m) => { if(!v) throw Error(m); };
const ms = x => Number.isFinite(x) ? Math.round(x) : null;
const median = a => { const s=a.filter(Number.isFinite).sort((x,y)=>x-y);return s.length ? s.length%2 ? s[s.length>>1] : (s[s.length/2-1]+s[s.length/2])/2 : null; };
const data = { schema:1,status:'STARTED',target:TARGET,utcStarted:new Date().toISOString(),runs:RUNS,method:'Native CDP Tracing ReturnAsStream; 390x844; 4x CPU; 1.6Mbps; no interception',categories:TRACE_CATS,viewport:DEVICE,network:NETWORK,trials:[],attempts:[],limits:['Trace events on different threads are not additive.','Task coverage depends on Chrome tracing categories.','FCP trace events are compared with browser Performance entries.','Not Google Lighthouse or real-user CrUX data.','Timing and remote network jitter may dominate changes; trace is diagnosis, not proof of a fix.'] };
let chrome,cdp,profile;
function log(s){console.log(`[${new Date().toISOString()}] ${s}`)}
function save(){fs.writeFileSync(path.join(OUTPUT,'results.json'),JSON.stringify(data,null,2),'utf8')}
class CDP {
  constructor(url){this.ws=new WebSocket(url);this.seq=0;this.pending=new Map();this.handlers=[];
    this.ws.addEventListener('message',e=>{let m;try{m=JSON.parse(String(e.data))}catch{return}
      if(m.id){const p=this.pending.get(m.id);if(!p)return;this.pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(p.name+': '+m.error.message)):p.resolve(m.result||{});}
      else if(m.method)for(const h of [...this.handlers])if(h.name===m.method && (h.sid===undefined || h.sid===m.sessionId))try{h.callback(m.params||{})}catch(err){log('CDP_HANDLER_ERROR '+err.message)};
    });
    this.ws.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('CDP_CLOSED'))}this.pending.clear()});
  }
  static async connect(url){const c=new CDP(url);await new Promise((ok,no)=>{const t=setTimeout(()=>no(Error('CDP_CONNECT_TIMEOUT')),15000);c.ws.addEventListener('open',()=>{clearTimeout(t);ok()},{once:true});c.ws.addEventListener('error',()=>{clearTimeout(t);no(Error('CDP_WS_ERROR'))},{once:true});});return c;}
  on(name,callback,sid){const h={name,callback,sid};this.handlers.push(h);return()=>{this.handlers=this.handlers.filter(x=>x!==h)}}
  send(name,params={},sid,timeout=35000){return new Promise((ok,no)=>{const id=++this.seq;const timer=setTimeout(()=>{this.pending.delete(id);no(Error(name+': TIMEOUT'))},timeout);this.pending.set(id,{resolve:ok,reject:no,name,timer});try{this.ws.send(JSON.stringify({id,method:name,params,...(sid?{sessionId:sid}:{})}))}catch(e){clearTimeout(timer);this.pending.delete(id);no(e)}})}
  close(){try{this.ws.close()}catch{}}
}
const PROBE=`(()=>{const p=window.__halleusTrace={lcp:[],cls:0,longTasks:[],errors:[]};try{new PerformanceObserver(l=>{for(const x of l.getEntries())p.lcp.push({ms:x.startTime,url:x.url||'',renderMs:x.renderTime,loadMs:x.loadTime,element:x.element?.tagName||'',className:String(x.element?.className||'').slice(0,140)})}).observe({type:'largest-contentful-paint',buffered:true})}catch(e){p.errors.push('LCP: '+e.message)}try{new PerformanceObserver(l=>{for(const x of l.getEntries())p.longTasks.push({startMs:x.startTime,durationMs:x.duration})}).observe({type:'longtask',buffered:true})}catch(e){p.errors.push('LONGTASK: '+e.message)}try{new PerformanceObserver(l=>{for(const x of l.getEntries())if(!x.hadRecentInput)p.cls+=x.value}).observe({type:'layout-shift',buffered:true})}catch(e){p.errors.push('CLS: '+e.message)}})();`;
const SNAPSHOT=`JSON.stringify((()=>{const n=performance.getEntriesByType('navigation')[0];const h=document.querySelector('h1');const im=document.querySelector('img[src*="halleus-synastry-chart-comparison.webp"]');return {url:location.href,ready:document.readyState,paint:performance.getEntriesByType('paint').map(x=>({name:x.name,ms:x.startTime})),nav:n?{responseStartMs:n.responseStart,responseEndMs:n.responseEnd,domContentLoadedMs:n.domContentLoadedEventEnd,loadEndMs:n.loadEventEnd}:null,probe:window.__halleusTrace,styles:[...document.querySelectorAll('link[rel~=stylesheet]')].map(x=>({href:x.href,media:x.media||'all'})),resources:performance.getEntriesByType('resource').filter(x=>/\\.(css|js|woff2?|webp)(?:$|\\?)/.test(x.name)).map(x=>({url:x.name.split('?')[0].split('/').slice(-2).join('/'),initiator:x.initiatorType,startMs:x.startTime,responseStartMs:x.responseStart,endMs:x.responseEnd,transferBytes:x.transferSize,renderBlockingStatus:x.renderBlockingStatus||'unknown'})),fontStatus:document.fonts.status,h1:h?{textLength:h.textContent?.length||0,width:h.getBoundingClientRect().width,height:h.getBoundingClientRect().height}:null,hero:im?{naturalWidth:im.naturalWidth,complete:im.complete}:null};})())`;
async function startChrome(){profile=fs.mkdtempSync(path.join(os.tmpdir(),'halleus-compare-fcp-trace-'));const flags=['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-sync','--disable-background-networking','about:blank'];if(process.platform==='linux'&&process.getuid?.()===0)flags.unshift('--no-sandbox');chrome=spawn(BROWSER,flags,{stdio:'ignore',windowsHide:true});let startupError;chrome.on('error',e=>startupError=e);let port;
 for(let i=0;i<120;i++){if(startupError)throw Error('CHROME_START_FAILED '+startupError.message);if(chrome.exitCode!==null)throw Error('CHROME_EXIT_'+chrome.exitCode);const f=path.join(profile,'DevToolsActivePort');if(fs.existsSync(f)){const n=fs.readFileSync(f,'utf8').trim().split(/\r?\n/)[0];if(/^\d+$/.test(n)){port=Number(n);break}}await sleep(200)}assert(port,'CHROME_DEBUG_PORT_MISSING');const r=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(10000)});assert(r.ok,'CHROME_DEBUG_HTTP_'+r.status);const v=await r.json();data.browser=v.Browser;cdp=await CDP.connect(v.webSocketDebuggerUrl);log('Chrome '+v.Browser)}
async function readTraceStream(handle,sid){const buffers=[];let bytes=0;try{for(let i=0;i<12000;i++){const r=await cdp.send('IO.read',{handle,size:262144},sid,60000);const b=r.base64Encoded?Buffer.from(r.data||'','base64'):Buffer.from(r.data||'','utf8');bytes+=b.length;assert(bytes<120*1024*1024,'TRACE_TOO_LARGE_120MB');buffers.push(b);if(r.eof)break;if(i===11999)throw Error('TRACE_STREAM_TOO_LONG')}return Buffer.concat(buffers)}finally{try{await cdp.send('IO.close',{handle},sid,7000)}catch{}}}
function overlaps(a,b,c,d){return Math.max(0,Math.min(b,d)-Math.max(a,c))}
function traceSummary(events,docStartSec,fcpMs){
 const threadNames=new Map();for(const e of events)if(e.ph==='M'&&e.name==='thread_name')threadNames.set(e.pid+':'+e.tid,e.args?.name||'');
 const rendererThreads=[...threadNames.entries()].filter(([,n])=>/CrRendererMain|RendererMain/i.test(n));
 const fcpMarkers=events.filter(e=>/^(?:firstContentfulPaint|first-contentful-paint)$/i.test(e.name)&&Number.isFinite(e.ts)).sort((a,b)=>a.ts-b.ts);
 const startUs=Number.isFinite(docStartSec)?docStartSec*1e6:null;
 const expectedFcpUs=Number.isFinite(startUs)?startUs+fcpMs*1000:null;
 const nearMarker=fcpMarkers.filter(e=>Number.isFinite(expectedFcpUs)&&Math.abs(e.ts-expectedFcpUs)<2000000).sort((a,b)=>Math.abs(a.ts-expectedFcpUs)-Math.abs(b.ts-expectedFcpUs))[0]||null;
 const endUs=nearMarker?.ts??expectedFcpUs;
 assert(Number.isFinite(startUs)&&Number.isFinite(endUs),'TRACE_ALIGNMENT_MISSING');
 const mainSet=new Set(rendererThreads.map(([key])=>key));
 const xevents=events.filter(e=>e.ph==='X'&&Number.isFinite(e.ts)&&Number.isFinite(e.dur)&&e.dur>0&&mainSet.has(e.pid+':'+e.tid)&&overlaps(e.ts,e.ts+e.dur,startUs,endUs)>0);
 const groups=new Map();for(const e of xevents){const overlap=overlaps(e.ts,e.ts+e.dur,startUs,endUs)/1000;const name=e.name||'unnamed';const g=groups.get(name)||{name,count:0,overlapMs:0,maxMs:0};g.count++;g.overlapMs+=overlap;g.maxMs=Math.max(g.maxMs,overlap);groups.set(name,g)}
 const rank=[...groups.values()].sort((a,b)=>b.overlapMs-a.overlapMs).slice(0,25).map(x=>({...x,overlapMs:ms(x.overlapMs),maxMs:ms(x.maxMs)}));
 const tasks=xevents.filter(e=>/^(?:RunTask|ThreadControllerImpl::RunTask|ThreadControllerImpl::DoWork|TaskQueueManager::ProcessTaskFromWorkQueue|ThreadControllerImpl::RunTask)$/.test(e.name));
 const taskIntervals=tasks.map(e=>[Math.max(e.ts,startUs),Math.min(e.ts+e.dur,endUs)]).filter(x=>x[1]>x[0]).sort((a,b)=>a[0]-b[0]);const merged=[];for(const [a,b] of taskIntervals){if(merged.length&&a<=merged[merged.length-1][1])merged[merged.length-1][1]=Math.max(merged[merged.length-1][1],b);else merged.push([a,b])}
 const busyMs=merged.length?ms(merged.reduce((s,[a,b])=>s+(b-a)/1000,0)):null;
 const largestTasks=tasks.map(e=>({name:e.name,startMs:ms((e.ts-startUs)/1000),durationInWindowMs:ms(overlaps(e.ts,e.ts+e.dur,startUs,endUs)/1000)})).filter(x=>x.durationInWindowMs>=50).sort((a,b)=>b.durationInWindowMs-a.durationInWindowMs).slice(0,15);
 return {eventCount:events.length,rendererThreadNames:rendererThreads.map(([key,name])=>({key,name})),fcpTraceMarkerFound:!!nearMarker,markerDeltaFromExpectedMs:nearMarker?ms((nearMarker.ts-expectedFcpUs)/1000):null,fcpWindowAlignment:nearMarker?'trace FCP marker near performance observer':'document request timestamp + FCP (approximate)',windowLengthMs:ms((endUs-startUs)/1000),mainThreadXEvents:xevents.length,busyRunTaskMs:busyMs,busyCoverageKnown:!!tasks.length,largestTasks,topOverlappingEvents:rank,note:'Nested trace events overlap and totals must NOT be added; RunTask union measures only tasks with the named categories.'};
}
async function runTrial(index){const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});let sid,off=[],tracing=false,traceDone=null,traceWaitResolve,traceWaitReject,net=new Map(),docStart=null,docStatus=null,traceRaw=null;
 try{
  ({sessionId:sid}=await cdp.send('Target.attachToTarget',{targetId,flatten:true}));const cmd=(method,params={},timeout=35000)=>cdp.send(method,params,sid,timeout);
  await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');
  await cmd('Network.setCacheDisabled',{cacheDisabled:true});await cmd('Network.setBypassServiceWorker',{bypass:true});
  await cmd('Emulation.setDeviceMetricsOverride',DEVICE);await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await cmd('Emulation.setCPUThrottlingRate',{rate:4});await cmd('Network.emulateNetworkConditions',NETWORK);
  await cmd('Page.addScriptToEvaluateOnNewDocument',{source:PROBE});
  off.push(cdp.on('Network.requestWillBeSent',p=>{if(p.type==='Document'&&p.request?.url?.replace(/\/$/,'')===TARGET.replace(/\/$/,''))docStart=p.timestamp;net.set(p.requestId,{id:p.requestId,url:p.request?.url||'',type:p.type||'',start:p.timestamp,initiator:p.initiator?.type||'',priority:p.request?.initialPriority||''});},sid));
  off.push(cdp.on('Network.responseReceived',p=>{if(p.type==='Document'&&p.response?.url?.replace(/\/$/,'')===TARGET.replace(/\/$/,''))docStatus=p.response?.status;const x=net.get(p.requestId);if(x){x.responseAt=p.timestamp;x.status=p.response?.status;x.mime=p.response?.mimeType;x.fromCache=!!p.response?.fromDiskCache;x.fromServiceWorker=!!p.response?.fromServiceWorker}},sid));
  off.push(cdp.on('Network.loadingFinished',p=>{const x=net.get(p.requestId);if(x){x.end=p.timestamp;x.encodedBytes=p.encodedDataLength}},sid));
  off.push(cdp.on('Network.loadingFailed',p=>{const x=net.get(p.requestId);if(x)x.error=p.errorText||'FAILED'},sid));
  let traceCompleteResolver;traceDone=new Promise((resolve,reject)=>{traceWaitResolve=resolve;traceWaitReject=reject});
  off.push(cdp.on('Tracing.tracingComplete',p=>traceWaitResolve(p),sid));
  await cmd('Tracing.start',{categories:TRACE_CATS,transferMode:'ReturnAsStream',streamFormat:'json'},40000);tracing=true;
  log(`Trial ${index}/${RUNS}: tracing native ${TARGET}`);
  const wall=Date.now(),nav=await cmd('Page.navigate',{url:TARGET},40000);assert(!nav.errorText,'NAVIGATION_FAILED_'+nav.errorText);
  let ready=false;for(let i=0;i<220;i++){if(Date.now()-wall>105000)break;await sleep(400);let r;try{r=await cmd('Runtime.evaluate',{expression:'document.readyState',returnByValue:true},5000)}catch{continue}if(r.result?.value==='complete'){ready=true;break}}
  assert(ready,'PAGE_NOT_COMPLETE');await sleep(1200);
  const ev=await cmd('Runtime.evaluate',{expression:SNAPSHOT,returnByValue:true},18000);assert(!ev.exceptionDetails,'PAGE_SNAPSHOT_FAILED');const p=JSON.parse(ev.result?.value||'null');
  assert(p&&p.url.replace(/\/$/,'')===TARGET.replace(/\/$/,''),'UNEXPECTED_PAGE');assert(docStatus===200,'UNEXPECTED_DOCUMENT_STATUS_'+docStatus);assert(p.h1?.width>0&&p.h1?.height>0,'H1_NOT_VISIBLE');
  const fcp=p.paint?.find(e=>e.name==='first-contentful-paint')?.ms;const lcp=p.probe?.lcp?.at(-1);assert(Number.isFinite(fcp),'FCP_MISSING');assert(Number.isFinite(lcp?.ms),'LCP_MISSING');assert(p.hero?.complete&&p.hero?.naturalWidth>0,'HERO_NOT_LOADED');
  await cmd('Tracing.end',{},40000);tracing=false;
  const completion=await Promise.race([traceDone,sleep(80000).then(()=>{throw Error('TRACING_COMPLETE_TIMEOUT')})]);assert(completion?.stream,'TRACE_STREAM_MISSING');assert(completion.dataLossOccurred!==true,'TRACE_DATA_LOSS');
  traceRaw=await readTraceStream(completion.stream,sid);
  const parsed=JSON.parse(traceRaw.toString('utf8'));const events=parsed.traceEvents||[];assert(events.length>500,'TRACE_EVENTS_TOO_FEW_'+events.length);
  const trace=traceSummary(events,docStart,fcp);assert(trace.rendererThreadNames.length>0&&trace.mainThreadXEvents>0,'TRACE_NO_MAIN_THREAD_EVENTS');
  const traceFilename=`trace-run-${index}.json.gz`;fs.writeFileSync(path.join(OUTPUT,traceFilename),zlib.gzipSync(traceRaw,{level:6}));
  const requests=[...net.values()].filter(x=>x.start>=docStart&&x.start<=docStart+fcp/1000+1).map(x=>({...x,startAfterDocMs:ms((x.start-docStart)*1000),responseWaitMs:Number.isFinite(x.responseAt)?ms((x.responseAt-x.start)*1000):null,completeAfterDocMs:Number.isFinite(x.end)?ms((x.end-docStart)*1000):null}));
  const byType={};for(const x of requests){const g=byType[x.type]||{count:0,bytes:0};g.count++;g.bytes+=x.encodedBytes||0;byType[x.type]=g}
  const result={index,utc:new Date().toISOString(),fcpMs:ms(fcp),lcpMs:ms(lcp.ms),lcpUrl:lcp.url,cls:p.probe.cls,htmlResponseStartMs:ms(p.nav?.responseStartMs),htmlResponseEndMs:ms(p.nav?.responseEndMs),fcpAfterHtmlEndMs:ms(fcp-p.nav?.responseEndMs),domContentLoadedMs:ms(p.nav?.domContentLoadedMs),fontStatus:p.fontStatus,styleCount:p.styles.length,longTasksBeforeFcp:p.probe.longTasks.filter(x=>x.startMs<fcp),trace,traceFilename,traceBytes:traceRaw.length,requestCountBeforeFcp:requests.length,requestsByType:byType,cssRequests:requests.filter(x=>x.type==='Stylesheet').map(x=>({url:x.url.split('?')[0].split('/').slice(-2).join('/'),startAfterDocMs:x.startAfterDocMs,completeAfterDocMs:x.completeAfterDocMs,responseWaitMs:x.responseWaitMs,bytes:x.encodedBytes||0,status:x.status})),fontRequests:requests.filter(x=>x.type==='Font').map(x=>({url:x.url.split('?')[0].split('/').slice(-2).join('/'),startAfterDocMs:x.startAfterDocMs,completeAfterDocMs:x.completeAfterDocMs,responseWaitMs:x.responseWaitMs,bytes:x.encodedBytes||0,status:x.status})),heroRequests:requests.filter(x=>x.url.includes(HERO)).map(x=>({startAfterDocMs:x.startAfterDocMs,completeAfterDocMs:x.completeAfterDocMs,responseWaitMs:x.responseWaitMs,bytes:x.encodedBytes||0,status:x.status})),elapseWallMs:Date.now()-wall};
  log(`  FCP=${result.fcpMs}ms LCP=${result.lcpMs}ms HTMLend=${result.htmlResponseEndMs}ms mainBusy=${trace.busyRunTaskMs??'N/A'}ms traceEvents=${trace.eventCount} FCPMarker=${trace.fcpTraceMarkerFound}`);return result;
 }finally{
  if(tracing){try{await cdp.send('Tracing.end',{},sid,10000)}catch{}}
  off.forEach(fn=>fn());try{await cdp.send('Target.closeTarget',{targetId},undefined,7000)}catch(e){log('TARGET_CLOSE_WARNING '+e.message)}
 }
}
function buildReport(){const xs=data.trials;const summary={fcpMs:median(xs.map(x=>x.fcpMs)),lcpMs:median(xs.map(x=>x.lcpMs)),htmlResponseEndMs:median(xs.map(x=>x.htmlResponseEndMs)),fcpAfterHtmlEndMs:median(xs.map(x=>x.fcpAfterHtmlEndMs)),busyRunTaskMs:median(xs.map(x=>x.trace.busyRunTaskMs)),rendererThreadsFound:xs.filter(x=>x.trace.rendererThreadNames.length>0).length,fcpTraceMarkersFound:xs.filter(x=>x.trace.fcpTraceMarkerFound).length};data.summary=summary;
 const ranked=xs.flatMap(x=>x.trace.topOverlappingEvents.map(y=>({name:y.name,ms:y.overlapMs})));const names=new Map();for(const r of ranked)names.set(r.name,(names.get(r.name)||0)+r.ms);const frequent=[...names].sort((a,b)=>b[1]-a[1]).slice(0,15);
 const lines=['# Halleus /compare - Chrome first-paint Performance Trace','','- Date UTC: '+new Date().toISOString(),'- Native unmodified live /compare; mobile 390x844, 4x CPU, 1.6Mbps, cache off.','- Chrome Tracing events, not A/B, PageSpeed score, or real-user field data.','','## Medians','',...Object.entries(summary).map(([k,v])=>`- ${k}: ${v==null?'N/A':v}`),'','## Trials','', '| Run | FCP ms | LCP ms | HTML end ms | FCP after HTML ms | Renderer main RunTask busy ms | Trace FCP marker | Raw trace |','|---:|---:|---:|---:|---:|---:|:---:|---|',...xs.map(x=>`| ${x.index} | ${x.fcpMs} | ${x.lcpMs} | ${x.htmlResponseEndMs} | ${x.fcpAfterHtmlEndMs} | ${x.trace.busyRunTaskMs??'N/A'} | ${x.trace.fcpTraceMarkerFound?'yes':'no'} | ${x.traceFilename} |`),'','## Dominant overlapping main-thread event types (nonadditive)','',...frequent.map(([n,t])=>`- ${n}: ${ms(t)}ms across runs (nested overlaps may double count)`),'','## Notes','',...data.limits.map(x=>'- '+x)];fs.writeFileSync(path.join(OUTPUT,'report.md'),lines.join('\n')+'\n','utf8');log('TRACE_REPORT_READY '+JSON.stringify(summary));}
async function main(){assert(OUTPUT&&BROWSER,'MISSING_ARGS');assert(Number.isInteger(RUNS)&&RUNS>=1&&RUNS<=3,'BAD_RUN_COUNT');fs.mkdirSync(OUTPUT,{recursive:true});save();try{await startChrome();for(let i=1;i<=RUNS;i++){try{const t=await runTrial(i);data.trials.push(t);data.attempts.push({run:i,status:'PASS'});}catch(e){data.attempts.push({run:i,status:'FAIL',error:e.stack||String(e)});log(`Trial ${i} FAILED ${e.message}`)}save();}if(data.trials.length)buildReport();assert(data.trials.length===RUNS,`INCOMPLETE_TRACE_TRIALS ${data.trials.length}/${RUNS}`);data.status='PASS';data.utcEnded=new Date().toISOString();save()}catch(e){data.status='FAIL';data.error=e.stack||String(e);data.utcEnded=new Date().toISOString();save();fs.writeFileSync(path.join(OUTPUT,'FAILURE.txt'),data.error+'\n','utf8');console.error('TRACE_FAILED '+e.message);process.exitCode=1;}finally{cdp?.close();try{chrome?.kill()}catch{};if(profile){try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:2,retryDelay:400})}catch{log('PROFILE_RETAINED '+profile)}}}}
main();
'@

try {
    [IO.File]::WriteAllText($jsPath, $script, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host '[2/3] CHROME PERFORMANCE TRACE: 3 NATIVE MOBILE LOADS' -ForegroundColor Cyan
    & $node.Source $jsPath "--chrome=$chrome" "--output=$out"
    $result = $LASTEXITCODE
    if ($result -ne 0) {
        $zip = Join-Path $download "HalleusCompareFirstPaintTrace-FailureLogs-$stamp.zip"
        Compress-Archive -Path (Join-Path $out '*') -DestinationPath $zip -Force
        Write-Host "FAILURE_LOGS: $zip" -ForegroundColor Yellow
    }
    Write-Host '[3/3] RESULTS / GIT WORKTREE' -ForegroundColor Cyan
    if (Test-Path -LiteralPath (Join-Path $out 'report.md')) {
        Get-Content -LiteralPath (Join-Path $out 'report.md') -Encoding UTF8 | Select-Object -First 25
    }
    Write-Host "REPORT: $(Join-Path $out 'report.md')"
    Write-Host "RAW_JSON: $(Join-Path $out 'results.json')"
    $after = @(& git -C $repo -c core.quotepath=false status --porcelain --untracked-files=all)
    if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: FINAL_GIT_STATUS_FAILED' }
    if (($before -join "`n") -cne ($after -join "`n")) { throw 'SAFETY_FATAL: WORKTREE_CHANGED_DURING_TRACE' }
    Write-Host "WORKTREE_UNCHANGED_BY_RUNNER; UNTRACKED_ENTRIES=$($after.Count)"
    & git -C $repo --no-pager diff --check
    if ($LASTEXITCODE -ne 0) { throw 'UNRELATED_BASELINE_FAILURE: GIT_DIFF_CHECK' }
    Write-Host 'GIT_DIFF_CHECK_PASS'
    if ($result -ne 0) { throw 'COMPARE_FIRST_PAINT_TRACE_FAILED' }
    Write-Host 'HALLEUS_COMPARE_FIRST_PAINT_TRACE_COMPLETE' -ForegroundColor Green
}
finally {
    Remove-Item -LiteralPath $jsPath -Force -ErrorAction SilentlyContinue
}