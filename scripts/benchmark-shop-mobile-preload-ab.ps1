param(
    [Parameter(Mandatory = $true)]
    [string] $RepoPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# R2: read-only experiment on live site; hydration reinsertion prevented in B test browser only.
# All generated data stays in Downloads; nothing is written to the repository or VPS.
$target = '4d5fa08ad755f62624d2db6a108bdaf0fdb64cbc'
$tag = 'v2026.11.23-shop-mobile-hero-preload-4d5fa08'
$downloadDir = Join-Path $HOME 'Downloads'
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$outDir = Join-Path $downloadDir "HalleusShopPreloadAB-R2-results-$stamp"
$jsPath = Join-Path ([System.IO.Path]::GetTempPath()) "HalleusShopPreloadAB-R2-$stamp-$([guid]::NewGuid().ToString('N')).js"

if (-not (Test-Path -LiteralPath $RepoPath -PathType Container)) { throw 'SAFETY_FATAL: REPO_NOT_FOUND' }
if (-not (Test-Path -LiteralPath (Join-Path $RepoPath '.git'))) { throw 'SAFETY_FATAL: NOT_A_GIT_WORKTREE' }
$origin = (& git -C $RepoPath remote get-url origin)
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: ORIGIN_READ_FAILED' }
$origin = ($origin | Out-String).Trim()
if ($origin -notin @(
    'https://github.com/bleucluod/astro-clean',
    'https://github.com/bleucluod/astro-clean.git',
    'git@github.com:bleucluod/astro-clean.git'
)) { throw "SAFETY_FATAL: WRONG_ORIGIN $origin" }
$branch = (& git -C $RepoPath branch --show-current)
if ($LASTEXITCODE -ne 0 -or ($branch | Out-String).Trim() -cne 'main') { throw 'SAFETY_FATAL: EXPECTED_MAIN' }

Write-Host '[1/3] READ-ONLY SAFETY / GITHUB TAG' -ForegroundColor Cyan
$remoteTag = @(& git -C $RepoPath ls-remote --tags origin "refs/tags/$tag" "refs/tags/$tag^{}")
if ($LASTEXITCODE -ne 0) { throw 'EXTERNAL_BLOCK: REMOTE_TAG_LOOKUP_FAILED' }
$remoteSha = @($remoteTag | ForEach-Object { if ($_ -match '^([0-9a-f]{40})\s+refs/tags/') { $Matches[1] } })
if ($target -notin $remoteSha) { throw 'SAFETY_FATAL: RELEASE_TAG_TARGET_MISMATCH_OR_MISSING' }

$before = @(& git -C $RepoPath -c core.quotepath=false status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: CANNOT_READ_LOCAL_WORKTREE' }
if ($before.Count -gt 0) {
    Write-Host 'LOCAL_WORKTREE_DIRTY: this is permitted for this READ-ONLY benchmark; no stash, reset, checkout, pull, or source writes.' -ForegroundColor Yellow
}

$nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCmd) { throw 'EXTERNAL_BLOCK: NODE_NOT_FOUND (Node 22+ required)' }
$nodeVersion = (& $nodeCmd.Source -p 'process.versions.node')
if ($LASTEXITCODE -ne 0) { throw 'EXTERNAL_BLOCK: NODE_VERSION_READ_FAILED' }
if ([version](($nodeVersion | Out-String).Trim()) -lt [version]'22.0.0') { throw 'EXTERNAL_BLOCK: NODE_22_OR_NEWER_REQUIRED' }

$chromeCandidates = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe"
)
$chrome = $chromeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
if (-not $chrome) { throw 'EXTERNAL_BLOCK: GOOGLE_CHROME_NOT_INSTALLED' }

New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$js = @'
'use strict';
// Halleus Shop mobile hero preload A/B: read-only against production, no dependencies.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: sleep } = require('node:timers/promises');

const args = Object.fromEntries(process.argv.slice(2).map((s, i, a) => s.startsWith('--') ? [s.slice(2).split('=')[0], s.includes('=') ? s.slice(s.indexOf('=') + 1) : a[i + 1]] : null).filter(Boolean));
const URL_TARGET = args.url || 'https://halleus.ir/shop';
const OUTPUT_DIR = args.output;
const CHROME_EXE = args.chrome;
const RUN_COUNT = Number(args.runs || 5);
const NEEDLE = '/shop-preview/hero-mobile-v012.webp';
const TRIAL_ORDER = Array.from({length: RUN_COUNT * 2}, (_, i) => (Math.floor(i / 2) % 2 === 0 ? ['A','B'] : ['B','A'])[i%2]); // AB BA AB BA AB
const NETWORK = { offline:false, latency:150, downloadThroughput:200000, uploadThroughput:93750 };
const CPU_RATE = 4;
const VIEWPORT = {width:390,height:844,deviceScaleFactor:2.75,mobile:true};
let chromeProcess;
let profilePath;
let cdp;
let fatalError;
let runData = {schema:2, status:'STARTED', url:URL_TARGET, targetCommit:'4d5fa08ad755f62624d2db6a108bdaf0fdb64cbc', startUtc:new Date().toISOString(), preloaded:[], withoutPreload:[], attempts:[], environment:{node:process.version,os:os.platform(),cpu:os.cpus()[0]?.model||null,viewport:VIEWPORT,cpuThrottlingRate:CPU_RATE,network:NETWORK},notes:['Controlled local CDP PerformanceObserver test, not a Lighthouse Performance Score or Google PSI run.', 'Both arms buffer and fulfill the same HTML document; this is a controlled proxy, not native streaming.', 'B removes initial preload links and prevents React/JS from reinserting that exact preload link; any script-triggered duplicate hero request invalidates the trial.', 'Request count is not automatically transfer count. Encoded bytes and loadingFinished are tracked separately.','No changes are made to GitHub, source, VPS, or production content.']};
if (!OUTPUT_DIR || !CHROME_EXE) throw new Error('Missing --output or --chrome');
fs.mkdirSync(OUTPUT_DIR,{recursive:true});
const writeJson = () => fs.writeFileSync(path.join(OUTPUT_DIR,'results.json'),JSON.stringify(runData,null,2),'utf8');
function log(s) {console.log(`[${new Date().toISOString()}] ${s}`)}
function assert(cond,s){if(!cond)throw new Error(s)}
function median(arr){let xs=[...arr].sort((a,b)=>a-b);return xs.length%2 ? xs[Math.floor(xs.length/2)] : (xs[xs.length/2-1]+xs[xs.length/2])/2}
function htmlPreloadTags(html){return [...html.matchAll(/<link\b[^>]*>/gi)].map(x=>x[0]).filter(t => /\brel\s*=\s*["']?preload\b/i.test(t)&&t.includes(NEEDLE));}
function stripPreloads(html){let count=0;const edited=html.replace(/<link\b[^>]*>/gi,t=>{if(/\brel\s*=\s*["']?preload\b/i.test(t)&&t.includes(NEEDLE)){count++;return '';}return t;});return {edited,count};}
class DevTools {
  constructor(url) {
    this.ws = new WebSocket(url);this.pending=new Map();this.listeners=[];this.id=0;
    this.ws.addEventListener('message', e=>{let msg;try{msg=JSON.parse(String(e.data));}catch{return;}
      if(msg.id){const p=this.pending.get(msg.id);if(!p)return;this.pending.delete(msg.id);clearTimeout(p.timer);if(msg.error)p.reject(new Error(`${p.method}: ${msg.error.message}`));else p.resolve(msg.result||{});}
      else if(msg.method){for(const h of this.listeners){if(h.method===msg.method && (h.session===undefined || h.session===msg.sessionId)){try{h.fn(msg.params||{},msg.sessionId);}catch(e){console.error('HANDLER_FAILURE',e.message)}}}}
    });
    this.ws.addEventListener('close',()=>{for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Chrome DevTools websocket closed'))}this.pending.clear()});
  }
  static async connect(url){const c=new DevTools(url);await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('WS_OPEN_TIMEOUT')),15000);c.ws.addEventListener('open',()=>{clearTimeout(t);resolve()}, {once:true});c.ws.addEventListener('error',()=>{clearTimeout(t);reject(new Error('WS_CONNECT_ERROR'))},{once:true})});return c;}
  on(method,fn,session){const h={method,fn,session};this.listeners.push(h);return ()=>this.listeners=this.listeners.filter(x=>x!==h);}
  send(method,params={},sessionId,timeout=30000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`${method}: TIMEOUT`))},timeout);this.pending.set(id,{resolve,reject,timer,method});try{this.ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}))}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e)}})}
  close(){try{this.ws.close()}catch{}}
}
// Executed before any page script, including hydration. A observes only; B additionally
// prevents the exact target preload resource from being reattached by client JavaScript.
// The guard is narrowly scoped to link[rel~=preload][href=hero-mobile-v012.webp].
function injectionForArm(arm) {
  const without = arm === 'B';
  return `(()=>{
    const probe = window.__halleusProbe = {lcps:[],cls:0,shifts:[],errors:[],
      preloadGuard:{enabled:${without},suppressed:0,leaked:0,methods:[],observed:0}};
    try {new PerformanceObserver(l=>{for(const e of l.getEntries())probe.lcps.push({ms:e.startTime,renderMs:e.renderTime,loadMs:e.loadTime,size:e.size,url:e.url||null,element:e.element?e.element.tagName.toLowerCase():null,id:e.element?.id||null,className:typeof e.element?.className==='string'?e.element.className.slice(0,200):null});}).observe({type:'largest-contentful-paint',buffered:true});}catch(e){probe.errors.push('LCP: '+e.message)}
    try {new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput){probe.cls+=e.value;probe.shifts.push({ms:e.startTime,value:e.value});}}).observe({type:'layout-shift',buffered:true});}catch(e){probe.errors.push('CLS: '+e.message)}
    if (!${without}) return;
    const target = ${JSON.stringify(NEEDLE)};
    const isTarget = (node) => {
      if (!node || node.nodeType !== 1 || node.tagName !== 'LINK') return false;
      const rel = String(node.getAttribute('rel')||'').toLowerCase().split(/\s+/);
      if (!rel.includes('preload')) return false;
      try {return new URL(node.getAttribute('href')||'',location.href).pathname === target;}catch{return false;}
    };
    const record = (method) => {probe.preloadGuard.suppressed++;probe.preloadGuard.methods.push(method);};
    const filterFragment = (node,method) => {
      if (!node || node.nodeType !== 11) return;
      for (const child of Array.from(node.childNodes)) {
        if (isTarget(child)) {node.removeChild(child);record(method);}
      }
    };
    for (const method of ['appendChild','insertBefore','replaceChild']) {
      const original = Node.prototype[method];
      Node.prototype[method] = function(node,...args){
        if(isTarget(node)){record(method);return method==='replaceChild'?args[0]:node;}
        filterFragment(node,method);
        return original.call(this,node,...args);
      };
    }
    for (const method of ['append','prepend','replaceChildren']) {
      const original = Element.prototype[method];
      Element.prototype[method] = function(...nodes){
        nodes=nodes.filter(node=>{if(isTarget(node)){record(method);return false;}filterFragment(node,method);return true;});
        return original.apply(this,nodes);
      };
    }
    const originalAdjacent=Element.prototype.insertAdjacentElement;
    Element.prototype.insertAdjacentElement=function(position,node){
      if(isTarget(node)){record('insertAdjacentElement');return node;}
      return originalAdjacent.call(this,position,node);
    };
    const observer=new MutationObserver((records)=>{
      for(const rec of records)for(const node of rec.addedNodes){
        if(isTarget(node)) {probe.preloadGuard.leaked++;node.remove();}
        else if(node.nodeType===1)for(const link of node.querySelectorAll('link[rel~=preload]')){
          if(isTarget(link)){probe.preloadGuard.leaked++;link.remove();}
        }
      }
    });
    document.addEventListener('DOMContentLoaded',()=>{observer.observe(document,{childList:true,subtree:true});probe.preloadGuard.observed=1;},{once:true});
  })();`;
}

async function startChrome(){
  profilePath=fs.mkdtempSync(path.join(os.tmpdir(),'halleus-shop-ab-chrome-'));
  const chromeArgs=['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profilePath}`,'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-sync','about:blank'];
  if(os.platform()==='linux' && process.getuid?.()===0) chromeArgs.unshift('--no-sandbox');
  chromeProcess=spawn(CHROME_EXE,chromeArgs,{stdio:'ignore',windowsHide:true});
  chromeProcess.on('error',e=>fatalError=e);
  const activeFile=path.join(profilePath,'DevToolsActivePort');
  let port;
  for(let i=0;i<100;i++){
    if(fatalError)throw new Error(`CHROME_LAUNCH_FAILED: ${fatalError.message}`);
    if(chromeProcess.exitCode!==null)throw new Error(`CHROME_EARLY_EXIT=${chromeProcess.exitCode}`);
    if(fs.existsSync(activeFile)){const first=fs.readFileSync(activeFile,'utf8').trim().split(/\r?\n/)[0];if(/^\d+$/.test(first)){port=Number(first);break}}
    await sleep(200);
  }
  assert(port,'CHROME_DEVTOOLS_PORT_NOT_CREATED');
  const res=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(10000)});
  assert(res.ok,`CHROME_DEBUG_HTTP_${res.status}`);
  const version=await res.json();
  runData.environment.browser=version.Browser;runData.environment.protocolVersion=version['Protocol-Version'];
  log(`Chrome: ${version.Browser}; CDP port bound to localhost`);
  cdp=await DevTools.connect(version.webSocketDebuggerUrl);
}
function normalizeHeaders(headers){const blocked=new Set(['content-length','transfer-encoding','content-encoding','connection','keep-alive','trailer']);return (headers||[]).filter(h=>!blocked.has(h.name.toLowerCase()));}
async function trial(arm,index){
  const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});
  let sessionId;let detach=[];let interceptionError;let intercept={seen:false,tagCount:0,removed:0,responseStatus:0,unexpectedHeader:false,htmlBytes:0};let networkRecords=new Map();let cacheEntries=0;let documentRequestStart=null;
  try{
    ({sessionId}=await cdp.send('Target.attachToTarget',{targetId,flatten:true}));
    const cmd=(m,p={},t)=>cdp.send(m,p,sessionId,t);
    await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');
    await cmd('Network.setCacheDisabled',{cacheDisabled:true});
    await cmd('Network.setBypassServiceWorker',{bypass:true});
    await cmd('Emulation.setDeviceMetricsOverride',VIEWPORT);
    await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
    await cmd('Emulation.setCPUThrottlingRate',{rate:CPU_RATE});
    await cmd('Network.emulateNetworkConditions',NETWORK);
    await cmd('Page.addScriptToEvaluateOnNewDocument',{source:injectionForArm(arm)});
    detach.push(cdp.on('Network.requestWillBeSent',p=>{
      if(p.type==='Document'&&p.request?.url?.replace(/\/$/,'')===URL_TARGET.replace(/\/$/,''))documentRequestStart=p.timestamp;
      if(p.request?.url?.includes(NEEDLE))networkRecords.set(p.requestId,{requestId:p.requestId,startTimestamp:p.timestamp,initiatorType:p.initiator?.type||null,url:p.request.url});
    },sessionId));
    detach.push(cdp.on('Network.requestServedFromCache',p=>{if(networkRecords.has(p.requestId))cacheEntries++},sessionId));
    detach.push(cdp.on('Network.responseReceived',p=>{const r=networkRecords.get(p.requestId);if(r){r.status=p.response?.status;r.fromDiskCache=!!p.response?.fromDiskCache;r.fromServiceWorker=!!p.response?.fromServiceWorker;r.protocol=p.response?.protocol}},sessionId));
    detach.push(cdp.on('Network.loadingFinished',p=>{const r=networkRecords.get(p.requestId);if(r){r.doneTimestamp=p.timestamp;r.encodedDataLength=p.encodedDataLength}},sessionId));
    detach.push(cdp.on('Network.loadingFailed',p=>{const r=networkRecords.get(p.requestId);if(r){r.failed=true;r.errorText=p.errorText}},sessionId));
    detach.push(cdp.on('Fetch.requestPaused',p=>{
      (async()=>{
        if(!p.responseStatusCode || (p.responseStatusCode<200||p.responseStatusCode>=300)){
          await cmd('Fetch.continueRequest',{requestId:p.requestId});return;
        }
        if(intercept.seen)throw new Error('DUPLICATE_DOCUMENT_RESPONSE');
        intercept.seen=true;
        intercept.responseStatus=p.responseStatusCode;
        const h=p.responseHeaders||[];
        intercept.unexpectedHeader=h.some(x=>x.name.toLowerCase()==='link' && x.value.includes(NEEDLE));
        if(intercept.unexpectedHeader)throw new Error('TARGET_PRELOAD_PRESENT_IN_LINK_HTTP_HEADER');
        const raw=await cmd('Fetch.getResponseBody',{requestId:p.requestId},60000);
        const buf=raw.base64Encoded?Buffer.from(raw.body,'base64'):Buffer.from(raw.body,'utf8');
        const html=buf.toString('utf8');
        assert(/<html[\s>]/i.test(html),'INTERCEPTED_BODY_NOT_HTML');
        intercept.tagCount=htmlPreloadTags(html).length;
        assert(intercept.tagCount>0,`TARGET_PRELOAD_NOT_FOUND_IN_HTML for ${arm}`);
        const change=arm==='B'?stripPreloads(html):{edited:html,count:0};
        intercept.removed=change.count;intercept.htmlBytes=Buffer.byteLength(change.edited);
        if(arm==='B')assert(intercept.removed===intercept.tagCount,'FAILED_TO_REMOVE_ALL_HERO_PRELOAD_LINKS');
        await cmd('Fetch.fulfillRequest',{requestId:p.requestId,responseCode:p.responseStatusCode,responseHeaders:normalizeHeaders(h),body:Buffer.from(change.edited,'utf8').toString('base64')},60000);
      })().catch(async e=>{interceptionError=e;log(`Trial ${index} ${arm}: interception failure: ${e.message}`);try{await cmd('Fetch.failRequest',{requestId:p.requestId,errorReason:'Failed'})}catch{}});
    },sessionId));
    const targetPattern=new URL(URL_TARGET).origin+'/*';
    await cmd('Fetch.enable',{patterns:[{urlPattern:targetPattern,resourceType:'Document',requestStage:'Response'}]});
    log(`Trial ${index} ${arm==='A'?'WITH':'WITHOUT'} preload: navigating ${URL_TARGET}`);
    const start=Date.now();
    const nav=await cmd('Page.navigate',{url:URL_TARGET},30000);
    assert(!nav.errorText,`PAGE_NAVIGATE_ERROR_${nav.errorText}`);
    let state;
    for(let i=0;i<110;i++){
      if(interceptionError)throw interceptionError;
      if(Date.now()-start>70000)throw new Error('NAVIGATION_READY_TIMEOUT');
      await sleep(500);
      try{
        const r=await cmd('Runtime.evaluate',{expression:'document.readyState',returnByValue:true},6000);
        state=r.result?.value;
      }catch(e){if(interceptionError)throw interceptionError;continue}
      if(state==='complete'&&intercept.seen)break;
    }
    assert(intercept.seen&&state==='complete',`INVALID_NAVIGATION: state=${state} intercepted=${intercept.seen}`);
    await sleep(2500);
    const r=await cmd('Runtime.evaluate',{expression:`JSON.stringify(({p:window.__halleusProbe,paint:performance.getEntriesByType('paint').map(e=>({name:e.name,ms:e.startTime})),navigation:performance.getEntriesByType('navigation').map(e=>({responseStart:e.responseStart,domContentLoadedEventEnd:e.domContentLoadedEventEnd,loadEventEnd:e.loadEventEnd})),heroResourceTimings:performance.getEntriesByType('resource').filter(e=>e.name.includes('/shop-preview/hero-mobile-v012.webp')).map(e=>({startMs:e.startTime,fetchStartMs:e.fetchStart,requestStartMs:e.requestStart,responseStartMs:e.responseStart,responseEndMs:e.responseEnd,initiatorType:e.initiatorType,transferSize:e.transferSize,encodedBodySize:e.encodedBodySize})),remainingPreloadLinks:[...document.querySelectorAll('link[rel~=preload]')].filter(e=>{try{return new URL(e.getAttribute('href')||'',location.href).pathname==='/shop-preview/hero-mobile-v012.webp'}catch{return false}}).length,url:location.href,heroBackground:[...document.querySelectorAll('div,section')].map(e=>getComputedStyle(e).backgroundImage).find(s=>s.includes('/shop-preview/hero-mobile-v012.webp'))||''}))`,returnByValue:true,awaitPromise:true},15000);
    assert(!r.exceptionDetails,`RUNTIME_EVALUATION_FAILED ${r.exceptionDetails?.text||''}`);
    const payload=JSON.parse(r.result.value);
    assert(payload.url.replace(/\/$/,'')===URL_TARGET.replace(/\/$/,''),`NAVIGATED_TO_DIFFERENT_URL=${payload.url}`);
    const p=payload.p||{};const lcps=p.lcps||[];const lcp=lcps.at(-1);const fcp=payload.paint.find(x=>x.name==='first-contentful-paint');
    assert(lcp&&Number.isFinite(lcp.ms)&&lcp.ms>0,'MISSING_LCP');
    assert(fcp&&Number.isFinite(fcp.ms),'MISSING_FCP');
    assert(payload.heroBackground.includes(NEEDLE),'MOBILE_HERO_NOT_USING_EXPECTED_IMAGE');
    const heroRequest=[...networkRecords.values()].filter(x=>x.url.includes(NEEDLE));
    assert(heroRequest.length>0,'HERO_NETWORK_REQUEST_NOT_OBSERVED');
    assert(documentRequestStart!==null,'DOCUMENT_START_TIME_MISSING');
    for (const req of heroRequest) {
      req.startRelativeToDocumentMs=Math.round((req.startTimestamp-documentRequestStart)*1000);
      if(Number.isFinite(req.doneTimestamp)) req.finishedRelativeToDocumentMs=Math.round((req.doneTimestamp-documentRequestStart)*1000);
      if(Number.isFinite(req.doneTimestamp))req.networkDurationMs=Math.round((req.doneTimestamp-req.startTimestamp)*1000);
    }
    const guard=p.preloadGuard||{};
    assert(guard.enabled===(arm==='B'),'PRELOAD_GUARD_NOT_INITIALIZED');
    assert(arm==='A'?payload.remainingPreloadLinks>0:payload.remainingPreloadLinks===0,'HYDRATION_REINSERTED_PRELOAD_LINK');
    if(arm==='B'){
      assert(guard.observed===1,'PRELOAD_HYDRATION_OBSERVER_NOT_ACTIVE');
      assert(guard.leaked===0,'PRELOAD_GUARD_LEAKED_LINK');
      assert(heroRequest.every(req=>req.initiatorType!=='script'),'SCRIPT_TRIGGERED_HERO_REQUEST_IN_NO_PRELOAD_ARM');
    }
    assert(heroRequest.every(req=>req.status===200 && Number.isFinite(req.doneTimestamp) && !req.failed),'INCOMPLETE_HERO_NETWORK_REQUEST');
    const realTransfers=heroRequest.filter(req=>req.encodedDataLength>1000 && !req.fromDiskCache && !req.fromServiceWorker).length;
    assert(realTransfers===1,'DUPLICATE_OR_MISSING_HERO_NETWORK_TRANSFER');
    const data={trial:index,arm,utc:new Date().toISOString(),lcpMs:Math.round(lcp.ms),fcpMs:Math.round(fcp.ms),cls:Number((p.cls||0).toFixed(5)),lcpElement:lcp,heroImageRequests:heroRequest,heroRequestCount:heroRequest.length,heroTransfers:realTransfers,heroResourceTimings:payload.heroResourceTimings,preloadGuard:guard,remainingPreloadLinks:payload.remainingPreloadLinks,cacheEvents:cacheEntries,preloadLinkCount:intercept.tagCount,removedPreloadLinkCount:intercept.removed,responseStatus:intercept.responseStatus,responseHtmlBytes:intercept.htmlBytes,heroBackground:payload.heroBackground,paint:payload.paint,navigation:payload.navigation,observerErrors:p.errors,elapsedWallMs:Date.now()-start};
    assert(data.preloadLinkCount>0&&(arm==='A'?data.removedPreloadLinkCount===0:data.removedPreloadLinkCount===data.preloadLinkCount),'PRELOAD_EXPERIMENT_INVALID');
    log(`  LCP=${data.lcpMs}ms FCP=${data.fcpMs}ms CLS=${data.cls} heroRequests=${data.heroRequestCount} transfers=${data.heroTransfers} reinsertBlocked=${guard.suppressed} links=${data.preloadLinkCount} removed=${data.removedPreloadLinkCount}`);
    return data;
  }finally{
    for(const unsubscribe of detach)unsubscribe();
    try{await cdp.send('Target.closeTarget',{targetId},undefined,7000)}catch(e){log('Target cleanup warning: '+e.message)}
  }
}
function buildReport(){
  const a=runData.preloaded,b=runData.withoutPreload;
  const med=s=>({lcpMs:median(s.map(r=>r.lcpMs)),fcpMs:median(s.map(r=>r.fcpMs)),cls:median(s.map(r=>r.cls)),heroRequests:median(s.map(r=>r.heroRequestCount)),heroTransfers:median(s.map(r=>r.heroTransfers)),heroStartMs:median(s.map(r=>r.heroImageRequests[0].startRelativeToDocumentMs))});
  const x=med(a),y=med(b);
  const gainMs=y.lcpMs-x.lcpMs;
  const gainPercent=Number((gainMs/y.lcpMs*100).toFixed(2));
  const claim=(a.some(r=>r.lcpElement?.element!=='div')||b.some(r=>r.lcpElement?.element!=='div'))?'Inspect element attributes: LCP may not consistently be the hero.':'Inspect LCP element className in JSON to verify hero alignment.';
  // Do not interpret an A/B result as conclusive if the uncontrolled spread dwarfs the effect.
  const spread = s => Math.max(...s.map(r=>r.lcpMs))-Math.min(...s.map(r=>r.lcpMs));
  const spreadA=spread(a),spreadB=spread(b);
  const conclusion = (Math.abs(gainMs) <= Math.max(spreadA,spreadB))?'INCONCLUSIVE_NOISE_DOMINATES':'DIRECTIONAL_ONLY';
  const summary={preload:x,noPreload:y,lcpGainMs:gainMs,lcpGainPercent:gainPercent,lcpImproved:gainMs>0,spreadAms:spreadA,spreadBms:spreadB,conclusion};
  runData.summary=summary;
  const lines=[
    '# Halleus Shop - Mobile hero preload A/B',
    '',`- Date (UTC): ${new Date().toISOString()}`,`- Live URL: ${URL_TARGET}`,`- Chrome: ${runData.environment.browser}`,
    '- Method: Chrome DevTools Protocol; 390x844 viewport; 4x CPU throttle; 1.6 Mbps download / 750 Kbps upload / 150ms RTT; cache disabled; 5 A and 5 B interleaved.',
    '- A = live HTML with preload; B = the same buffered live HTML with the target link removed and JS reinsertion guarded in the test browser. Both arms use response interception (buffered HTML).' ,
    '- Site itself, GitHub and VPS remain unchanged.',
    '', '| Metric (median) | A with preload | B without preload | A improvement vs B |',
    '|---|---:|---:|---:|',
    `| LCP (ms) | ${x.lcpMs} | ${y.lcpMs} | ${gainMs} ms (${gainPercent}%) |`,
    `| FCP (ms) | ${x.fcpMs} | ${y.fcpMs} | ${y.fcpMs-x.fcpMs} ms |`,
    `| CLS | ${x.cls} | ${y.cls} | n/a |`,
    `| Hero request count | ${x.heroRequests} | ${y.heroRequests} | inspect per-trial JSON |`,
    `| Hero completed transfers | ${x.heroTransfers} | ${y.heroTransfers} | inspect per-trial JSON |`,
    `| First hero request after document (ms) | ${x.heroStartMs} | ${y.heroStartMs} | ${y.heroStartMs-x.heroStartMs} ms |`,
    '',`**Observed result:** ${gainMs>0?`preload was faster by ${gainMs} ms (${gainPercent}%) in this A/B test`:gainMs<0?`preload was slower by ${Math.abs(gainMs)} ms in this A/B test`:'no median LCP difference in this A/B test'}. Verdict: ${conclusion}. This is a small 5+5 sample, not proof of user-perceived improvement or the PSI baseline difference.`,
    '', '| Trial | Arm | LCP ms | FCP ms | CLS | Preload links | Removed | Client reinserts blocked | Remaining target links | Hero requests | Hero transfers | LCP element |',
    '|---:|:---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...runData.attempts.filter(r=>r.status==='PASS').map(t=>{const r=t.data;return `| ${r.trial} | ${r.arm} | ${r.lcpMs} | ${r.fcpMs} | ${r.cls} | ${r.preloadLinkCount} | ${r.removedPreloadLinkCount} | ${r.preloadGuard?.suppressed||0} | ${r.remainingPreloadLinks} | ${r.heroRequestCount} | ${r.heroTransfers} | ${[r.lcpElement?.element,r.lcpElement?.className].filter(Boolean).join(' ').replace(/\|/g,'/')} |`}),
    '', '## Limitations',
    '- The existing PageSpeed Insights baseline of 5,800 ms uses different hardware and run conditions; DO NOT subtract these values from 5,800 ms.',
    '- Chrome PerformanceObserver LCP/FCP/CLS measurements are NOT Lighthouse scores or Lighthouse TBT.',
    '- CDP CPU throttling is a slowdown relative to this computer; identical settings do not fully normalize different CPUs.',
    '- Using Fetch.getResponseBody / Fetch.fulfillRequest buffers the page HTML in both A and B, so this experiment is a controlled proxy for page behavior, not exact native streaming.',
    '- CDN/Internet/server jitter remains possible. Five runs per arm give an exploratory result, not statistical certainty.',
    '- Hydration guard is confined to the test browser; if unexpected target links or script-initiated hero requests remain, the trial FAILS and no result is claimed.',
    `- Variability: A LCP range=${spreadA} ms, B LCP range=${spreadB} ms; verdict=${conclusion}.`,
    `- ${claim}`,
    '', '## Files',
    '- results.json: raw CDP metrics, times, resource request initiator/status/bytes, per-trial link counts, Chrome/environment metadata',
    '- FAILURE.txt: present only on failure',
  ];
  fs.writeFileSync(path.join(OUTPUT_DIR,'report.md'),lines.join('\n')+'\n','utf8');
}
(async()=>{
  try{
    assert(RUN_COUNT>=1&&RUN_COUNT<=10&&Number.isInteger(RUN_COUNT),'INVALID_RUN_COUNT');
    assert(fs.existsSync(CHROME_EXE),'CHROME_EXE_NOT_FOUND');
    assert(typeof WebSocket==='function','NODE_22_WEBSOCKET_REQUIRED');
    assert(new URL(URL_TARGET).protocol==='https:'||new URL(URL_TARGET).hostname==='127.0.0.1','INVALID_URL');
    writeJson();
    await startChrome();
    for(let i=0;i<TRIAL_ORDER.length;i++){
      const arm=TRIAL_ORDER[i];
      let done=false;
      for(let attempt=1;attempt<=2&&!done;attempt++){
        try{
          const data=await trial(arm,i+1);runData.attempts.push({trial:i+1,arm,attempt,status:'PASS',data});runData[arm==='A'?'preloaded':'withoutPreload'].push(data);done=true;
        }catch(e){
          runData.attempts.push({trial:i+1,arm,attempt,status:'FAIL',error:e.message});
          log(`Trial ${i+1} attempt ${attempt} failed: ${e.message}`);
          if(attempt===2){runData.failedTrials??=[];runData.failedTrials.push({trial:i+1,arm,root:e.message});}
          else await sleep(1000);
        }
        writeJson();
      }
    }
    if(runData.failedTrials?.length){
      throw new Error(`CANDIDATE_FAILURE: ${runData.failedTrials.length} invalid trials; roots=${JSON.stringify([...new Set(runData.failedTrials.map(x=>x.root))])}`);
    }
    assert(runData.preloaded.length===RUN_COUNT&&runData.withoutPreload.length===RUN_COUNT,'INCOMPLETE_BALANCED_SAMPLES');
    assert(runData.withoutPreload.every(r=>r.remainingPreloadLinks===0 && r.preloadGuard.enabled && r.preloadGuard.leaked===0),'INVALID_NO_PRELOAD_ARM');
    runData.status='PASS';runData.endUtc=new Date().toISOString();
    buildReport();writeJson();
    log('A/B_DONE: validated trial report.md and results.json created');
    console.log(JSON.stringify(runData.summary));
  }catch(e){runData.status='FAIL';runData.endUtc=new Date().toISOString();runData.error=e.stack||e.message;writeJson();fs.writeFileSync(path.join(OUTPUT_DIR,'FAILURE.txt'),`${e.stack||e.message}\n`, 'utf8');console.error('AB_FAILED:',e.message);process.exitCode=1;
  }finally{
    cdp?.close();if(chromeProcess){try{chromeProcess.kill()}catch{}} // Only the dedicated temporary Chrome instance
    // Chrome sometimes retains short-lived child processes. Do not recursively delete potentially live profile.
    if(profilePath){try{fs.rmSync(profilePath,{recursive:true,force:true,maxRetries:2,retryDelay:300})}catch{log(`Temporary Chrome profile remains for safe manual deletion: ${profilePath}`)}}
  }
})();

'@

try {
    Write-Host '[2/3] VERIFIED HYDRATION-SAFE 5x+5x A/B (LIVE SITE)' -ForegroundColor Cyan
    [System.IO.File]::WriteAllText($jsPath, $js, (New-Object System.Text.UTF8Encoding($false)))
    & $nodeCmd.Source $jsPath '--url=https://halleus.ir/shop' "--chrome=$chrome" "--output=$outDir" '--runs=5'
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        $failureZip = Join-Path $downloadDir "HalleusShopPreloadAB-R2-FailureLogs-$stamp.zip"
        if (Test-Path -LiteralPath $outDir) {
            Compress-Archive -LiteralPath $outDir -DestinationPath $failureZip -Force
            Write-Host "FAILURE_LOGS: $failureZip" -ForegroundColor Yellow
        }
        throw "BENCHMARK_FAILED: exit_code=$exitCode; read FAILURE.txt in $outDir. Do not claim improvement."
    }
    Write-Host '[3/3] RESULTS' -ForegroundColor Cyan
    Get-Content -LiteralPath (Join-Path $outDir 'report.md') -TotalCount 26 -Encoding UTF8
    Write-Host "REPORT: $(Join-Path $outDir 'report.md')" -ForegroundColor Green
    Write-Host "RAW_JSON: $(Join-Path $outDir 'results.json')" -ForegroundColor Green
    Write-Host 'HALLEUS_SHOP_AB_COMPLETE' -ForegroundColor Green
}
finally {
    if (Test-Path -LiteralPath $jsPath) { Remove-Item -LiteralPath $jsPath -Force -ErrorAction SilentlyContinue }
    Write-Host "`nFINAL GIT STATUS (read-only)" -ForegroundColor Cyan
    & git -C $RepoPath -c core.quotepath=false status --short --untracked-files=all
    Write-Host "`nFINAL DIFF SUMMARY" -ForegroundColor Cyan
    & git -C $RepoPath --no-pager diff --stat
    & git -C $RepoPath --no-pager diff --cached --stat
    $after = @(& git -C $RepoPath -c core.quotepath=false status --porcelain --untracked-files=all)
    if ((($before -join "`n") -cne ($after -join "`n"))) {
        Write-Host 'WARNING: Worktree status changed during the run; investigate external changes. Runner does not write to the repository.' -ForegroundColor Yellow
    }
}