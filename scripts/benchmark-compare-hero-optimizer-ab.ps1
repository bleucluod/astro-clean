param(
    [Parameter(Mandatory = $true)]
    [string] $RepoPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Read-only live A/B. B changes only Chrome's outgoing hero image request,
# leaving the server-rendered HTML, React hydration, website and VPS untouched.
$expectedBase = '7fbf941b59368a9fe0ad12e17bef08e7b23a8f48'
$originAllowed = @('https://github.com/bleucluod/astro-clean','https://github.com/bleucluod/astro-clean.git','git@github.com:bleucluod/astro-clean.git')
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$outDir = Join-Path (Join-Path $HOME 'Downloads') "HalleusCompareHeroOptimizerAB-results-$timestamp"
$jsPath = Join-Path ([System.IO.Path]::GetTempPath()) "HalleusCompareHeroOptimizerAB-$timestamp-$([guid]::NewGuid().ToString('N')).js"

Write-Host '[1/3] READ-ONLY GITHUB SAFETY' -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $RepoPath -PathType Container)) { throw 'SAFETY_FATAL: REPO_NOT_FOUND' }
if (-not (Test-Path -LiteralPath (Join-Path $RepoPath '.git'))) { throw 'SAFETY_FATAL: NOT_GIT_WORKTREE' }
$origin = (& git -C $RepoPath remote get-url origin | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -notin $originAllowed) { throw 'SAFETY_FATAL: WRONG_ORIGIN' }
$branch = (& git -C $RepoPath branch --show-current | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -cne 'main') { throw 'SAFETY_FATAL: WRONG_BRANCH' }
$remoteLine = @(& git -C $RepoPath ls-remote origin refs/heads/main)
if ($LASTEXITCODE -ne 0 -or $remoteLine.Count -ne 1) { throw 'EXTERNAL_BLOCK: REMOTE_HEAD_LOOKUP_FAILED' }
$remoteHead = ($remoteLine[0] -split '\s+')[0]
$trackedHead = (& git -C $RepoPath rev-parse refs/remotes/origin/main | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $trackedHead -cne $remoteHead) { throw 'EXTERNAL_BLOCK: FETCH_OR_PULL_ORIGIN_MAIN_FIRST' }
& git -C $RepoPath merge-base --is-ancestor $expectedBase $remoteHead
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: UNEXPECTED_REMOTE_HISTORY' }
Write-Host "VERIFIED_REMOTE_MAIN: $remoteHead"
$dirtyBefore = @(& git -C $RepoPath -c core.quotepath=false status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: STATUS_READ_FAILED' }
if ($dirtyBefore.Count -gt 0) { Write-Host 'DIRTY_WORKTREE_PRESERVED: read-only; no source edits, pull, checkout, stash or deploy.' -ForegroundColor Yellow }
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { throw 'EXTERNAL_BLOCK: NODE_22_PLUS_REQUIRED' }
$nodeVersion = (& $node.Source -p 'process.versions.node' | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [version]$nodeVersion -lt [version]'22.0.0') { throw 'EXTERNAL_BLOCK: NODE_22_PLUS_REQUIRED' }
$chromeCandidates = @("${env:ProgramFiles}\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe")
$chrome = $chromeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
if (-not $chrome) { throw 'EXTERNAL_BLOCK: CHROME_NOT_FOUND' }

New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$js = @'
'use strict';
// Pure browser-proxy experiment: both arms use original HTML; only B rewrites
// the single hero image network request from original to Next image optimizer.
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {spawn}=require('node:child_process');const {setTimeout:sleep}=require('node:timers/promises');
const arg=Object.fromEntries(process.argv.slice(2).map(s=>{let i=s.indexOf('=');return i>2&&s.startsWith('--')?[s.slice(2,i),s.slice(i+1)]:null}).filter(Boolean));
const BASE='https://halleus.ir',PAGE=BASE+'/compare',HERO='/halleus-synastry-chart-comparison.webp';
const B_URL=BASE+'/_next/image?url=%2Fhalleus-synastry-chart-comparison.webp&w=1080&q=75';
const RUNS=5,ORDER=['A','B','B','A','A','B','B','A','A','B'];
const DEVICE={width:390,height:844,deviceScaleFactor:2.75,mobile:true};
const NETWORK={offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750};
const OUT=arg.output,CHROME=arg.chrome;const assert=(x,s)=>{if(!x)throw Error(s)};
const median=xs=>{const a=[...xs].sort((x,y)=>x-y);return a.length%2?a[a.length>>1]:(a[a.length/2-1]+a[a.length/2])/2};
const round=x=>Number.isFinite(x)?Math.round(x):null;
const isHero=u=>{try{const x=new URL(u);return x.origin===BASE&&x.pathname===HERO}catch{return false}};
const data={schema:1,status:'STARTED',startUtc:new Date().toISOString(),page:PAGE,baselineImage:BASE+HERO,optimizedImage:B_URL,method:'Native production HTML with Chrome DevTools request-only image URL override in B; not a production change, not Lighthouse.',runs:RUNS,order:ORDER,network:NETWORK,device:DEVICE,trials:[],attempts:[],preflight:null,limitations:['Image requests are rewritten in the test browser only. Browser and ISP effects remain.','This tests Next image optimizer at w=1080 q=75, not a source-code change; the resulting image may differ in resolution.','Both arms use CDP Fetch request pausing for the original image. The candidate optimizer is warmed during preflight to avoid benchmarking cold-start optimization.']};
const log=s=>console.log(`[${new Date().toISOString()}] ${s}`);
const save=()=>fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(data,null,2));
let chrome,profile,cdp;
class CDP{
 constructor(url){this.ws=new WebSocket(url);this.id=0;this.wait=new Map();this.handlers=[];
 this.ws.addEventListener('message',ev=>{let msg;try{msg=JSON.parse(String(ev.data))}catch{return};if(msg.id){const p=this.wait.get(msg.id);if(!p)return;this.wait.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(Error(`${p.method}: ${msg.error.message}`)):p.resolve(msg.result||{});}else if(msg.method)for(const h of this.handlers){if(h.method===msg.method&&(h.session===undefined||h.session===msg.sessionId)){try{h.cb(msg.params||{})}catch(e){log('EVENT_ERROR '+e.message)}}}});
 this.ws.addEventListener('close',()=>{for(const v of this.wait.values()){clearTimeout(v.timer);v.reject(Error('CDP_CLOSED'))}this.wait.clear()})}
 static async connect(url){const c=new CDP(url);await new Promise((ok,no)=>{const t=setTimeout(()=>no(Error('CDP_CONNECT_TIMEOUT')),15000);c.ws.addEventListener('open',()=>{clearTimeout(t);ok()}, {once:true});c.ws.addEventListener('error',()=>{clearTimeout(t);no(Error('CDP_WS_ERROR'))},{once:true})});return c;}
 on(method,cb,session){const h={method,cb,session};this.handlers.push(h);return()=>{this.handlers=this.handlers.filter(x=>x!==h)}}
 send(method,params={},session,timeout=30000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.wait.delete(id);reject(Error(method+'_TIMEOUT'))},timeout);this.wait.set(id,{resolve,reject,timer,method});try{this.ws.send(JSON.stringify({id,method,params,...(session?{sessionId:session}:{})}))}catch(e){this.wait.delete(id);clearTimeout(timer);reject(e)}})}
 close(){try{this.ws.close()}catch{}}
}
const PROBE=`(()=>{window.__compareAB={lcp:[],cls:0,errors:[]};const p=window.__compareAB;try{new PerformanceObserver(l=>{for(const x of l.getEntries())p.lcp.push({ms:x.startTime,renderMs:x.renderTime,loadMs:x.loadTime,url:x.url||'',tag:x.element?.tagName||'',className:String(x.element?.className||'').slice(0,150)})}).observe({type:'largest-contentful-paint',buffered:true})}catch(e){p.errors.push('LCP:'+e.message)}try{new PerformanceObserver(l=>{for(const x of l.getEntries())if(!x.hadRecentInput)p.cls+=x.value}).observe({type:'layout-shift',buffered:true})}catch(e){p.errors.push('CLS:'+e.message)}})();`;
async function preflight(){
 // A direct Page.navigate to a binary image can legitimately report ERR_ABORTED.
 // Instead, navigate to the already-verified same-origin HTML page and ask
 // that page to fetch and decode the optimized image. No server mutations.
 const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});
 let session;
 try{
 ({sessionId:session}=await cdp.send('Target.attachToTarget',{targetId,flatten:true}));
 const cmd=(m,p={},t=30000)=>cdp.send(m,p,session,t);
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');
 await cmd('Network.setCacheDisabled',{cacheDisabled:true});
 await cmd('Network.setBypassServiceWorker',{bypass:true});
 const nav=await cmd('Page.navigate',{url:PAGE},35000);
 if(nav.errorText)throw Error('EXTERNAL_BLOCK: NEXT_IMAGE_PREFLIGHT_PAGE_'+nav.errorText);
 const started=Date.now();let ready=false;
 for(let i=0;i<130;i++){
   if(Date.now()-started>65000)break;
   await sleep(400);
   try{const r=await cmd('Runtime.evaluate',{expression:'location.origin+"|"+document.readyState',returnByValue:true},6000);
     if(r.result?.value===BASE+'|complete'){ready=true;break}
   }catch{}
 }
 assert(ready,'EXTERNAL_BLOCK: NEXT_IMAGE_PREFLIGHT_PAGE_NOT_READY');
 const expression=`(async()=>{
   try{
     const response=await fetch(${JSON.stringify(B_URL)}, {
       cache:'reload',headers:{Accept:'image/avif,image/webp,image/apng,image/svg+xml,image/*;q=0.8,*/*;q=0.5'}
     });
     const mime=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
     const buffer=await response.arrayBuffer();
     const info={status:response.status,mime,bytes:buffer.byteLength,finalUrl:response.url,
       width:null,height:null,decodeError:null,method:'same-origin fetch + createImageBitmap'};
     if(response.ok && mime.startsWith('image/')){
       try{
         const bitmap=await createImageBitmap(new Blob([buffer],{type:mime}));
         info.width=bitmap.width;info.height=bitmap.height;bitmap.close();
       }catch(e){info.decodeError=String(e)}
     }
     return info;
   }catch(e){return {error:String(e),name:e?.name||'Error',method:'same-origin fetch'};}
 })()`;
 const result=await cmd('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},75000);
 assert(!result.exceptionDetails,'EXTERNAL_BLOCK: NEXT_IMAGE_EVALUATE_'+(result.exceptionDetails?.text||'UNKNOWN'));
 const candidate=result.result?.value;
 assert(candidate&&typeof candidate==='object','EXTERNAL_BLOCK: NEXT_IMAGE_PREFLIGHT_NO_RESULT');
 data.preflight=candidate;save();
 assert(!candidate.error,'EXTERNAL_BLOCK: NEXT_IMAGE_FETCH_'+candidate.error);
 assert(candidate.status===200,`CANDIDATE_FAILURE: NEXT_IMAGE_HTTP_${candidate.status}`);
 assert(candidate.mime?.startsWith('image/'),`CANDIDATE_FAILURE: NEXT_IMAGE_MIME_${candidate.mime}`);
 assert(!candidate.decodeError&&candidate.width>0&&candidate.height>0,`CANDIDATE_FAILURE: NEXT_IMAGE_DECODE_${candidate.decodeError}`);
 assert(candidate.width<=1080,`CANDIDATE_FAILURE: NEXT_IMAGE_NOT_RESIZED_${candidate.width}`);
 assert(candidate.bytes>10000&&candidate.bytes<144724,`CANDIDATE_FAILURE: NEXT_OPTIMIZED_IMAGE_NOT_SMALLER_${candidate.bytes}`);
 log(`Candidate verified: ${candidate.bytes} body bytes, ${candidate.width}x${candidate.height}, ${candidate.mime}; optimizer warmed`);
 }finally{try{await cdp.send('Target.closeTarget',{targetId},undefined,7000)}catch{}}
}
async function startChrome(){profile=fs.mkdtempSync(path.join(os.tmpdir(),'halleus-compare-optimizer-ab-'));
 const flags=['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-sync','about:blank'];if(process.platform==='linux'&&process.getuid?.()===0)flags.unshift('--no-sandbox');
 chrome=spawn(CHROME,flags,{stdio:'ignore',windowsHide:true});let launchErr;chrome.on('error',e=>launchErr=e);let port;
 for(let i=0;i<100;i++){if(launchErr)throw Error('CHROME_START_'+launchErr.message);if(chrome.exitCode!==null)throw Error('CHROME_EXIT_'+chrome.exitCode);const f=path.join(profile,'DevToolsActivePort');if(fs.existsSync(f)){const n=fs.readFileSync(f,'utf8').split(/\r?\n/)[0];if(/^\d+$/.test(n)){port=Number(n);break}}await sleep(200)}assert(port,'CHROME_CDP_PORT_MISSING');
 const r=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(10000)});assert(r.ok,'CDP_HTTP_'+r.status);const x=await r.json();data.chrome=x.Browser;cdp=await CDP.connect(x.webSocketDebuggerUrl);log('Chrome '+x.Browser);
}
async function trial(arm,index){
 const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});let session,offs=[],intercepted=0,fetchProblem=null,docStart=null,docStatus=null,hero=new Map();
 try{
 ({sessionId:session}=await cdp.send('Target.attachToTarget',{targetId,flatten:true}));const cmd=(m,p={},timeout=30000)=>cdp.send(m,p,session,timeout);
 await cmd('Page.enable');await cmd('Runtime.enable');await cmd('Network.enable');
 await cmd('Network.setCacheDisabled',{cacheDisabled:true});await cmd('Network.setBypassServiceWorker',{bypass:true});
 await cmd('Emulation.setDeviceMetricsOverride',DEVICE);await cmd('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
 await cmd('Emulation.setCPUThrottlingRate',{rate:4});await cmd('Network.emulateNetworkConditions',NETWORK);
 await cmd('Page.addScriptToEvaluateOnNewDocument',{source:PROBE});
 offs.push(cdp.on('Network.requestWillBeSent',p=>{if(p.type==='Document'&&p.request?.url?.replace(/\/$/,'')===PAGE)docStart=p.timestamp; if(isHero(p.request?.url||'')||(p.request?.url?.includes('/_next/image?')&&p.request?.url?.includes('halleus-synastry-chart-comparison.webp')))hero.set(p.requestId,{id:p.requestId,requestedUrl:p.request.url,start:p.timestamp,initiator:p.initiator?.type||null});},session));
 offs.push(cdp.on('Network.responseReceived',p=>{if(p.type==='Document'&&p.response?.url?.startsWith(PAGE))docStatus=p.response.status;const x=hero.get(p.requestId);if(x){x.responseUrl=p.response?.url;x.responseAt=p.timestamp;x.mime=p.response?.mimeType;x.status=p.response?.status;x.cache=!!p.response?.fromDiskCache;x.serviceWorker=!!p.response?.fromServiceWorker}},session));
 offs.push(cdp.on('Network.loadingFinished',p=>{const x=hero.get(p.requestId);if(x){x.end=p.timestamp;x.bytes=p.encodedDataLength}},session));
 offs.push(cdp.on('Network.loadingFailed',p=>{const x=hero.get(p.requestId);if(x)x.failed=p.errorText||'FAILED'},session));
 offs.push(cdp.on('Fetch.requestPaused',p=>{(async()=>{if(!isHero(p.request?.url||'')){await cmd('Fetch.continueRequest',{requestId:p.requestId});return;}intercepted++;const params={requestId:p.requestId};if(arm==='B')params.url=B_URL;await cmd('Fetch.continueRequest',params)})().catch(e=>{fetchProblem=e;log('FETCH_REWRITE_FAILED '+e.message)})},session));
 await cmd('Fetch.enable',{patterns:[{urlPattern:'*halleus-synastry-chart-comparison.webp*',resourceType:'Image',requestStage:'Request'}]});
 log(`Trial ${index}/${RUNS*2} ${arm==='A'?'ORIGINAL':'OPTIMIZED'}: ${PAGE}`);
 const wall=Date.now(),nav=await cmd('Page.navigate',{url:PAGE},40000);assert(!nav.errorText,'NAV_FAILED_'+nav.errorText);
 let ready=false;for(let i=0;i<170;i++){if(fetchProblem)throw fetchProblem;if(Date.now()-wall>100000)throw Error('PAGE_TIMEOUT');await sleep(400);try{const v=await cmd('Runtime.evaluate',{expression:'document.readyState',returnByValue:true},6000);if(v.result?.value==='complete'){ready=true;break}}catch(e){if(fetchProblem)throw fetchProblem}}
 assert(ready,'DOCUMENT_NOT_READY');await sleep(1700);
 const expr=`JSON.stringify((()=>{const img=document.querySelector('img[src*="halleus-synastry-chart-comparison.webp"]');return {url:location.href,probe:window.__compareAB,paint:performance.getEntriesByType('paint').map(x=>({name:x.name,ms:x.startTime})),nav:performance.getEntriesByType('navigation').map(x=>({responseStart:x.responseStart,loadEnd:x.loadEventEnd})),img:img?{src:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight,complete:img.complete,clientWidth:Math.round(img.getBoundingClientRect().width),clientHeight:Math.round(img.getBoundingClientRect().height)}:null}})())`;
 const v=await cmd('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true},15000);assert(!v.exceptionDetails,'BROWSER_EVALUATION_FAILED');const pg=JSON.parse(v.result?.value||'null');
 const lcp=pg?.probe?.lcp?.at(-1),fcp=pg?.paint?.find(x=>x.name==='first-contentful-paint');const requests=[...hero.values()];
 assert(pg?.url===PAGE,'WRONG_PAGE');assert(docStatus===200,'DOCUMENT_STATUS_'+docStatus);assert(pg?.img?.complete&&pg.img.width>0,'HERO_IMAGE_INCOMPLETE');
 assert(lcp&&fcp,'MISSING_METRICS');assert(lcp.url?.includes(HERO.slice(1)),'HERO_NOT_LCP');
 assert(intercepted===1,`INVALID_INTERCEPTION_COUNT_${intercepted}`);assert(requests.length===1,`INVALID_HERO_REQUEST_COUNT_${requests.length}`);
 const h=requests[0];assert(h.status===200&&h.end!=null&&!h.failed&&h.bytes>0,'HERO_NETWORK_FAILED');assert(h.mime?.startsWith('image/'),'BAD_HERO_MIME');assert(!h.cache&&!h.serviceWorker,'HERO_FROM_CACHE');
 // CDP response URL can contain the rewritten path on some Chrome versions, but
 // an unchanged response URL is not by itself proof that the body was optimized.
 if(arm==='B'){assert(h.bytes<data.preflight.bytes*1.65,`B_IMAGE_TRANSFER_TOO_LARGE_${h.bytes}`);assert(pg.img.width<=1080,'B_IMAGE_DIMENSIONS_NOT_OPTIMIZED')}
 else{assert(pg.img.width>1080,'A_IMAGE_NOT_ORIGINAL_WIDTH');assert(h.bytes>data.preflight.bytes,'A_IMAGE_NOT_LARGER_THAN_OPTIMIZED')}
 const x={index,arm,utc:new Date().toISOString(),lcpMs:round(lcp.ms),fcpMs:round(fcp.ms),cls:Number((pg.probe.cls||0).toFixed(5)),heroStartMs:round(docStart==null?NaN:(h.start-docStart)*1000),heroResponseWaitMs:round((h.responseAt-h.start)*1000),heroReceiveMs:round((h.end-h.responseAt)*1000),heroRequestToCompleteMs:round((h.end-h.start)*1000),heroEncodedBytes:h.bytes,renderAfterLoadMs:round(lcp.renderMs-lcp.loadMs),imageNaturalWidth:pg.img.width,imageNaturalHeight:pg.img.height,imageClientWidth:pg.img.clientWidth,heroRequest:h,intercepted,observerErrors:pg.probe.errors,wallMs:Date.now()-wall};
 log(`  LCP=${x.lcpMs}ms FCP=${x.fcpMs}ms heroBytes=${x.heroEncodedBytes} wait=${x.heroResponseWaitMs}ms receive=${x.heroReceiveMs}ms render=${x.renderAfterLoadMs}ms`);return x;
 }finally{offs.forEach(f=>f());try{await cdp.send('Target.closeTarget',{targetId},undefined,7000)}catch(e){log('CLOSE_TARGET_WARNING '+e.message)}}
}
function report(){const a=data.trials.filter(x=>x.arm==='A'),b=data.trials.filter(x=>x.arm==='B');const med=(xs,k)=>median(xs.map(x=>x[k]));const keys=['lcpMs','fcpMs','cls','heroStartMs','heroResponseWaitMs','heroReceiveMs','heroRequestToCompleteMs','heroEncodedBytes','renderAfterLoadMs'];const summary={};for(const k of keys)summary[k]={original:med(a,k),optimized:med(b,k)};summary.lcpGainMs=summary.lcpMs.original-summary.lcpMs.optimized;summary.lcpGainPercent=Number((summary.lcpGainMs/summary.lcpMs.original*100).toFixed(2));summary.imageSavingsPercent=Number(((summary.heroEncodedBytes.original-summary.heroEncodedBytes.optimized)/summary.heroEncodedBytes.original*100).toFixed(2));summary.lcpSpreadA=Math.max(...a.map(x=>x.lcpMs))-Math.min(...a.map(x=>x.lcpMs));summary.lcpSpreadB=Math.max(...b.map(x=>x.lcpMs))-Math.min(...b.map(x=>x.lcpMs));summary.conclusion=Math.max(summary.lcpSpreadA,summary.lcpSpreadB)>=Math.abs(summary.lcpGainMs)*2?'INCONCLUSIVE_NOISE_DOMINATES':summary.lcpGainMs>0?'PROMISING_NOT_PROOF':'NO_CONFIRMED_IMPROVEMENT';data.summary=summary;
 const md=['# Halleus /compare – original versus Next.js optimized hero (read-only A/B)','','- Date UTC: '+new Date().toISOString(),'- URL: '+PAGE,'- Original: '+BASE+HERO,'- Optimized: '+B_URL,'- Both arms use live HTML, with request-stage interception. No source, GitHub or VPS changes.','- 390x844 viewport, 4x CPU throttle, 1.6Mbps down, 150ms RTT, cache disabled, 5+5 interleaved.','','| Median | Original | Optimized |','|---|---:|---:|',...keys.map(k=>`| ${k} | ${summary[k].original} | ${summary[k].optimized} |`),'',`- LCP difference (original minus optimized): **${summary.lcpGainMs}ms (${summary.lcpGainPercent}%)**`,`- Bytes saved: **${summary.imageSavingsPercent}%**`,`- Verdict: **${summary.conclusion}** (not proof of user field CWV or PSI outcome)`,'','| Trial | Arm | LCP | FCP | Bytes | Response wait | Receive |','|---:|:---:|---:|---:|---:|---:|---:|',...data.trials.map(x=>`| ${x.index} | ${x.arm} | ${x.lcpMs} | ${x.fcpMs} | ${x.heroEncodedBytes} | ${x.heroResponseWaitMs} | ${x.heroReceiveMs} |`),'','This experiment rewrites outgoing image requests locally, preserving the source HTML and React hydration; it is not a deployed Next.js Image change.'];fs.writeFileSync(path.join(OUT,'report.md'),md.join('\n')+'\n');log('AB_REPORT_READY '+JSON.stringify(summary));}
async function main(){assert(OUT&&CHROME,'BAD_ARGUMENTS');fs.mkdirSync(OUT,{recursive:true});save();try{
 await startChrome();log('Optimized endpoint preflight');await preflight();
 for(let i=0;i<ORDER.length;i++){let done=false;for(let attempt=1;attempt<=2&&!done;attempt++){try{const x=await trial(ORDER[i],i+1);data.trials.push(x);data.attempts.push({index:i+1,arm:ORDER[i],attempt,status:'PASS'});done=true;}catch(e){data.attempts.push({index:i+1,arm:ORDER[i],attempt,status:'FAIL',reason:String(e?.message||e)});log(`Trial ${i+1} attempt ${attempt} failed: ${String(e?.message||e)}`);if(attempt===1)await sleep(1000)}save()}}
 const a=data.trials.filter(x=>x.arm==='A'),b=data.trials.filter(x=>x.arm==='B');if(a.length!==RUNS||b.length!==RUNS)throw Error(`CANDIDATE_FAILURE: INCOMPLETE_VALID_TRIALS A=${a.length} B=${b.length}`);
 report();data.status='PASS';data.endUtc=new Date().toISOString();save();
 }catch(e){data.status='FAIL';data.error=e.stack||String(e);data.endUtc=new Date().toISOString();save();fs.writeFileSync(path.join(OUT,'FAILURE.txt'),data.error+'\n');console.error('AB_FAILED '+e.message);process.exitCode=1;}finally{cdp?.close();try{chrome?.kill()}catch{};if(profile){try{fs.rmSync(profile,{force:true,recursive:true,maxRetries:2,retryDelay:300})}catch{log('Chrome profile retained for manual cleanup: '+profile)}}}}
main();
'@

try {
    [System.IO.File]::WriteAllText($jsPath, $js, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host '[2/3] PRECHECK + 5+5 A/B ORIGINAL VS OPTIMIZED HERO' -ForegroundColor Cyan
    & $node.Source $jsPath "--chrome=$chrome" "--output=$outDir"
    $testCode = $LASTEXITCODE
    if ($testCode -ne 0) {
        $failureZip = Join-Path (Join-Path $HOME 'Downloads') "HalleusCompareHeroOptimizerAB-FailureLogs-$timestamp.zip"
        Compress-Archive -LiteralPath $outDir -DestinationPath $failureZip -Force
        Write-Host "FAILURE_LOGS: $failureZip" -ForegroundColor Yellow
    }
    Write-Host '[3/3] RESULTS / GIT STATUS' -ForegroundColor Cyan
    $report = Join-Path $outDir 'report.md'
    if (Test-Path -LiteralPath $report) { Get-Content -LiteralPath $report -Encoding UTF8 | Select-Object -First 22 }
    Write-Host "REPORT: $report"
    Write-Host "RAW_JSON: $(Join-Path $outDir 'results.json')"
    $dirtyAfter = @(& git -C $RepoPath -c core.quotepath=false status --porcelain --untracked-files=all)
    if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: STATUS_READ_FAILED_AFTER_RUN' }
    if (($dirtyBefore -join "`n") -cne ($dirtyAfter -join "`n")) { throw 'SAFETY_FATAL: WORKTREE_CHANGED_DURING_TEST' }
    Write-Host "WORKTREE_UNCHANGED_BY_RUNNER; GIT_STATUS_ENTRIES=$($dirtyAfter.Count)"
    & git -C $RepoPath --no-pager diff --check
    if ($LASTEXITCODE -ne 0) { throw 'EXISTING_WORKTREE_DIFF_CHECK_FAILURE' }
    Write-Host 'GIT_DIFF_CHECK_PASS'
    if ($testCode -ne 0) { throw 'COMPARE_OPTIMIZER_AB_FAILED' }
    Write-Host 'HALLEUS_COMPARE_OPTIMIZER_AB_COMPLETE' -ForegroundColor Green
}
finally { Remove-Item -LiteralPath $jsPath -Force -ErrorAction SilentlyContinue }