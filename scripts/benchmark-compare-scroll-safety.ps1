param(
  [Parameter(Mandatory = $true)] [string] $RepoPath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Read-only evidence gate for belowfold content-visibility. No production CSS or source writes.
$expectedBase = 'cb7cb2e9bdbc34d6b070f2feb5e06676cd4985cb'
$scriptPath = 'scripts/benchmark-compare-scroll-safety.ps1'
$allowed = @('https://github.com/bleucluod/astro-clean','https://github.com/bleucluod/astro-clean.git','git@github.com:bleucluod/astro-clean.git')
Write-Host '[1/3] READ-ONLY REPOSITORY SAFETY' -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $RepoPath -PathType Container)) { throw 'SAFETY_FATAL: REPO_NOT_FOUND' }
$repo = (Resolve-Path -LiteralPath $RepoPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $repo '.git'))) { throw 'SAFETY_FATAL: NOT_REPOSITORY' }
$origin = (& git -C $repo remote get-url origin | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $origin -notin $allowed) { throw 'SAFETY_FATAL: WRONG_ORIGIN' }
$branch = (& git -C $repo branch --show-current | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -cne 'main') { throw 'SAFETY_FATAL: WRONG_BRANCH' }
& git -C $repo merge-base --is-ancestor $expectedBase HEAD
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: UNEXPECTED_HISTORY' }
& git -C $repo cat-file -e "HEAD:$scriptPath"
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: SCRIPT_NOT_COMMITTED_LOCALLY' }
$dirty = @(& git -C $repo -c core.quotepath=false status --porcelain --untracked-files=all)
if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: GIT_STATUS_FAILED' }
$runnerDirty = @(& git -C $repo diff --name-only -- $scriptPath)
if ($LASTEXITCODE -ne 0 -or $runnerDirty.Count -gt 0) { throw 'SAFETY_FATAL: RUNNER_MODIFIED' }
Write-Host "LOCAL_HEAD: $((& git -C $repo rev-parse HEAD | Out-String).Trim())"
Write-Host "LOCAL_UNCOMMITTED_ENTRIES_PRESERVED: $($dirty.Count)"
$node = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $node) { throw 'EXTERNAL_BLOCK: NODE_REQUIRED' }
$nodeV = (& $node.Source -p 'process.versions.node' | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [version]$nodeV -lt [version]'22.0.0') { throw 'EXTERNAL_BLOCK: NODE_22_PLUS_REQUIRED' }
$chromeCandidates = @("${env:ProgramFiles}\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe")
$chrome = $chromeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
if (-not $chrome) { throw 'EXTERNAL_BLOCK: CHROME_NOT_FOUND' }
$stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$download = Join-Path $HOME 'Downloads'
$out = Join-Path $download "HalleusCompareScrollSafety-results-$stamp"
$jsFile = Join-Path ([IO.Path]::GetTempPath()) "HalleusCompareScrollSafety-$stamp-$([guid]::NewGuid().ToString('N')).js"
New-Item -ItemType Directory -Path $out -Force | Out-Null

$js = @'
'use strict';
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {setTimeout:sleep}=require('node:timers/promises');
const arg=Object.fromEntries(process.argv.slice(2).filter(x=>/^--[^=]+=/.test(x)).map(x=>{const i=x.indexOf('=');return [x.slice(2,i),x.slice(i+1)]}));
const OUT=arg.output,CHROME=arg.chrome;
const PAGE=arg.fixtureUrl||'https://halleus.ir/compare';
const FIXTURE=Boolean(arg.fixtureUrl);
const SELECTOR='#compare-public-landing > section:not(#compare-builder):not([aria-labelledby="compare-page-title"])';
const SCOPED=['compare-technical-title','compare-time-title','compare-name-title','compare-faq-title','compare-final-title'];
const EXPECTED=['compare-what-title','compare-output-title','compare-method-title','compare-compatibility-title',...SCOPED];
const VIEWPORTS=arg.fixtureUrl?[{label:'fixture',width:390,height:844}]:[{label:'mobile390',width:390,height:844},{label:'desktop1280',width:1280,height:900}];
const NETWORK={offline:false,latency:150,downloadThroughput:200000,uploadThroughput:93750};
const DATA={schema:1,status:'STARTED',url:PAGE,startedUtc:new Date().toISOString(),method:'Native browser; A unmodified, B browser-only tailored CSS on last five editorial sections, inspect scroll and anchors; no Lighthouse',viewportRuns:[],errors:[],limitations:['Tailored CSS hint heights come from same-viewport A measurements and are exploratory, not an automatic production CSS recommendation.','Programmatic scrolling cannot exactly replicate every human gesture or assistive technology.','One page-load per arm and viewport: timing not statistically evaluated.','This gate checks scroll and geometry, not performance improvements.','No repository or production changes.']};
const log=x=>console.log(`[${new Date().toISOString()}] ${x}`);
const assert=(v,msg)=>{if(!v)throw Error(msg)};
const round=n=>Number.isFinite(n)?Math.round(n):null;
const save=()=>fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(DATA,null,2),'utf8');
let chrome,profile,cdp;
class CDP{
  constructor(url){this.ws=new WebSocket(url);this.id=0;this.wait=new Map();this.handlers=[];
    this.ws.addEventListener('message',e=>{let m;try{m=JSON.parse(String(e.data))}catch{return};
      if(m.id){const p=this.wait.get(m.id);if(!p)return;this.wait.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(`${p.method}: ${m.error.message}`)):p.resolve(m.result||{});return}
      if(m.method)for(const h of [...this.handlers])if(h.method===m.method&&h.sid===m.sessionId)try{h.fn(m.params||{})}catch(err){log('EVENT_ERROR '+err.message)}
    });
    this.ws.addEventListener('close',()=>{for(const w of this.wait.values()){clearTimeout(w.timer);w.reject(Error('CDP_CLOSED'))}this.wait.clear()});
  }
  static async connect(url){const c=new CDP(url);await new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('CDP_OPEN_TIMEOUT')),15000);c.ws.addEventListener('open',()=>{clearTimeout(timer);ok()},{once:true});c.ws.addEventListener('error',()=>{clearTimeout(timer);no(Error('CDP_WS_ERROR'))},{once:true})});return c}
  send(method,params={},sid,timeout=30000){const id=++this.id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.wait.delete(id);reject(Error(method+'_TIMEOUT'))},timeout);this.wait.set(id,{resolve,reject,timer,method});try{this.ws.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}))}catch(e){clearTimeout(timer);this.wait.delete(id);reject(e)}})}
  on(method,fn,sid){const h={method,fn,sid};this.handlers.push(h);return()=>{this.handlers=this.handlers.filter(x=>x!==h)}}
  close(){try{this.ws.close()}catch{}}
}
async function startChrome(){profile=fs.mkdtempSync(path.join(os.tmpdir(),'halleus-compare-scroll-audit-'));
  const flags=['--headless=new','--remote-debugging-port=0',`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--disable-sync','about:blank'];
  if(process.platform==='linux'&&process.getuid?.()===0)flags.unshift('--no-sandbox');
  chrome=spawn(CHROME,flags,{stdio:'ignore',windowsHide:true});let startError;chrome.on('error',e=>startError=e);
  let port;for(let i=0;i<100;i++){if(startError)throw Error('CHROME_LAUNCH_FAILED '+startError.message);if(chrome.exitCode!==null)throw Error('CHROME_EXIT '+chrome.exitCode);const f=path.join(profile,'DevToolsActivePort');if(fs.existsSync(f)){const line=fs.readFileSync(f,'utf8').split(/\r?\n/)[0];if(/^\d+$/.test(line)){port=Number(line);break}}await sleep(200)}
  assert(port,'CHROME_DEVTOOLS_PORT_MISSING');const r=await fetch(`http://127.0.0.1:${port}/json/version`,{signal:AbortSignal.timeout(10000)});assert(r.ok,'CDP_HTTP_'+r.status);const v=await r.json();DATA.browser=v.Browser;cdp=await CDP.connect(v.webSocketDebuggerUrl);log('Chrome '+v.Browser);
}
function browserProbe(css){return `(()=>{const p=window.__halleusScrollAudit={cls:0,allShifts:[],errors:[],installed:false};
  try{new PerformanceObserver(l=>{for(const s of l.getEntries()){p.allShifts.push({ms:s.startTime,value:s.value,recent:s.hadRecentInput});if(!s.hadRecentInput)p.cls+=s.value}}).observe({type:'layout-shift',buffered:true})}catch(e){p.errors.push('layout-shift:'+e.message)}
  const style=document.createElement('style');style.setAttribute('data-halleus-scroll-audit','true');style.textContent=${JSON.stringify(css)};
  const add=()=>{if(!document.documentElement)return false;document.documentElement.appendChild(style);p.installed=true;return true};
  if(!add()){const m=new MutationObserver(()=>{if(add())m.disconnect()});m.observe(document,{childList:true,subtree:true})}
})();`}
// Only the final five editorial sections are eligible; hero and builder are never included.
function cssFromHints(hints){return SCOPED.map(id=>{const h=hints[id];assert(Number.isFinite(h)&&h>=100&&h<12000,'INVALID_BASELINE_HEIGHT_'+id+'_'+h);return `#compare-public-landing > section[aria-labelledby="${id}"] { content-visibility: auto; contain-intrinsic-block-size: auto ${Math.round(h)}px; }`}).join('\n')}
const DOM_SNAPSHOT=`JSON.stringify((()=>{const root=document.querySelector('#compare-public-landing');const els=[...document.querySelectorAll('${SELECTOR}')];const sec=els.map(e=>{const key=e.getAttribute('aria-labelledby')||'';const h=document.getElementById(key);const r=e.getBoundingClientRect();const hr=h?.getBoundingClientRect();return {id:key,height:Math.round(r.height),width:Math.round(r.width),top:Math.round(r.top+scrollY),textChars:e.textContent.length,visibility:getComputedStyle(e).contentVisibility,headingText:h?.textContent?.trim().slice(0,70)||'',headingWidth:Math.round(hr?.width||0),headingTop:Math.round(hr?.top||0)}});
const hero=document.querySelector('#compare-public-landing > section[aria-labelledby="compare-page-title"]');const builder=document.getElementById('compare-builder');const p=window.__halleusScrollAudit;return {url:location.href,sectionCount:sec.length,sections:sec,docHeight:document.documentElement.scrollHeight,scrollY:Math.round(scrollY),heroVisibility:hero?getComputedStyle(hero).contentVisibility:null,builderVisibility:builder?getComputedStyle(builder).contentVisibility:null,heroText:hero?.textContent?.length||0,builderText:builder?.textContent?.length||0,builderPresent:!!builder,heroLink:!!hero?.querySelector('a[href="#compare-builder"]'),faqPresent:!!document.querySelector('#compare-faq-title'),installed:p?.installed,cls:p?.cls||0,allShifts:p?.allShifts||[],errors:p?.errors||[]}})())`;
async function run(view,arm,hints){
  const {targetId}=await cdp.send('Target.createTarget',{url:'about:blank'});let sid;const clean=[];
  try{({sessionId:sid}=await cdp.send('Target.attachToTarget',{targetId,flatten:true}));const send=(m,p={},timeout=30000)=>cdp.send(m,p,sid,timeout);
    await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
    await send('Network.setCacheDisabled',{cacheDisabled:true});await send('Network.setBypassServiceWorker',{bypass:true});
    await send('Emulation.setDeviceMetricsOverride',{width:view.width,height:view.height,deviceScaleFactor:view.width<800?2.75:1,mobile:view.width<800});
    await send('Emulation.setCPUThrottlingRate',{rate:4});if(!FIXTURE)await send('Network.emulateNetworkConditions',NETWORK);
    const css=arm==='B'?cssFromHints(hints):'';
    await send('Page.addScriptToEvaluateOnNewDocument',{source:browserProbe(css)});
    let mainStatus=null;clean.push(cdp.on('Network.responseReceived',e=>{if(e.type==='Document'&&e.response?.url?.replace(/\/$/,'')===PAGE.replace(/\/$/,''))mainStatus=e.response.status},sid));
    const started=Date.now();log(`${view.label} ${arm}: navigation ${PAGE}`);const nav=await send('Page.navigate',{url:PAGE},40000);assert(!nav.errorText,'NAVIGATION_FAILED_'+nav.errorText);
    let ready=false;for(let i=0;i<190;i++){if(Date.now()-started>95000)break;await sleep(400);try{const e=await send('Runtime.evaluate',{expression:'document.readyState',returnByValue:true},6000);if(e.result?.value==='complete'){ready=true;break}}catch{}}
    assert(ready,'DOCUMENT_NOT_COMPLETE');await sleep(FIXTURE?150:700);
    const evaluate=async(expression)=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},16000);assert(!r.exceptionDetails,'EVALUATION_ERROR_'+r.exceptionDetails?.text);return r.result?.value};
    const snapshot=async()=>JSON.parse(await evaluate(DOM_SNAPSHOT));
    const first=await snapshot();
    assert(first.url.replace(/\/$/,'')===PAGE.replace(/\/$/,''),'WRONG_PAGE');assert(FIXTURE||mainStatus===200,'DOCUMENT_HTTP_'+mainStatus);
    assert(first.installed&&first.builderPresent&&first.heroLink&&first.faqPresent,'PAGE_STRUCTURE_OR_PROBE_MISSING');
    assert(first.sectionCount===9,'EDITORIAL_SECTION_COUNT_CHANGED_'+first.sectionCount);
    assert(EXPECTED.every(x=>first.sections.some(y=>y.id===x)),'EDITORIAL_SECTION_IDS_CHANGED');
    assert(first.heroVisibility!=='auto'&&first.builderVisibility!=='auto','HERO_OR_BUILDER_AFFECTED');
    assert(first.heroText>40&&first.builderText>30,'HERO_OR_BUILDER_EMPTY');
    assert(!first.errors.length,'PERFORMANCE_PROBE_FAILED_'+first.errors.join(','));
    const eligible=first.sections.filter(s=>SCOPED.includes(s.id));assert(eligible.every(s=>s.visibility===(arm==='B'?'auto':'visible')),'CANDIDATE_SCOPE_MISMATCH');
    assert(first.sections.filter(s=>!SCOPED.includes(s.id)).every(s=>s.visibility!=='auto'),'NON_ELIGIBLE_EDITORIAL_AFFECTED');
    const steps=[];
    for(const id of EXPECTED){
      await evaluate(`(()=>{const h=document.getElementById(${JSON.stringify(id)});if(!h)return false;h.scrollIntoView({behavior:'instant',block:'start'});return true})()`);
      await sleep(FIXTURE?30:170);
      const p1=JSON.parse(await evaluate(`JSON.stringify((()=>{const h=document.getElementById(${JSON.stringify(id)});const e=h.closest('section');return {y:Math.round(scrollY),top:Math.round(h.getBoundingClientRect().top),height:Math.round(e.getBoundingClientRect().height),docHeight:document.documentElement.scrollHeight,textChars:e.textContent.length}})())`));
      await sleep(FIXTURE?30:230);
      const p2=JSON.parse(await evaluate(`JSON.stringify((()=>{const h=document.getElementById(${JSON.stringify(id)});const e=h.closest('section');return {y:Math.round(scrollY),top:Math.round(h.getBoundingClientRect().top),height:Math.round(e.getBoundingClientRect().height),docHeight:document.documentElement.scrollHeight,textChars:e.textContent.length}})())`));
      assert(p2.height>60,'SECTION_NOT_RENDERED_'+id);assert(Number.isFinite(p2.top)&&p2.top<view.height+100,'HEADING_NOT_REACHED_'+id);
      steps.push({id,initialHeight:first.sections.find(s=>s.id===id).height,first:p1,settled:p2,settlingMovementPx:Math.abs(p2.top-p1.top),docHeightChangePx:p2.docHeight-p1.docHeight});
    }
    // After the page has been traversed, test the actual hydrated hero CTA -> builder anchor.
    await evaluate('window.scrollTo({top:0,behavior:"instant"});true');await sleep(FIXTURE?40:300);
    await evaluate('(()=>{document.querySelector("#compare-public-landing > section[aria-labelledby=\\"compare-page-title\\"] a[href=\\"#compare-builder\\"]").click();return true})()');
    await sleep(FIXTURE?60:400);
    const anchor=JSON.parse(await evaluate('JSON.stringify((()=>{const b=document.getElementById("compare-builder");return {hash:location.hash,focused:document.activeElement?.id||"",builderTop:Math.round(b.getBoundingClientRect().top),scrollY:Math.round(scrollY),builderVisible:Math.round(b.getBoundingClientRect().width)>20,builderHeading:!!b.querySelector("h2")}})())'));
    // Open a FAQ item after scrolling to it, using the real browser click pathway.
    await evaluate('(()=>{const h=document.getElementById("compare-faq-title");h.scrollIntoView({behavior:"instant",block:"start"});return true})()');await sleep(FIXTURE?50:300);
    const faq=JSON.parse(await evaluate('JSON.stringify((()=>{const el=document.querySelector("#compare-faq-title").closest("section").querySelector("details");const summary=el?.querySelector("summary");summary?.click();return {opened:!!el?.open,questionLength:summary?.textContent?.length||0,answerLength:el?.querySelector("p")?.textContent?.length||0}})())'));
    const end=await snapshot();const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},20000);
    if(screenshot.data)fs.writeFileSync(path.join(OUT,`${view.label}-${arm}-faq.png`),Buffer.from(screenshot.data,'base64'));
    assert(anchor.hash==='#compare-builder'&&anchor.builderVisible&&anchor.builderHeading&&anchor.builderTop<view.height,'ANCHOR_NOT_WORKING');
    assert(faq.opened&&faq.questionLength>5&&faq.answerLength>10,'FAQ_INTERACTION_FAILED');
    const item={arm,viewport:view,utc:new Date().toISOString(),css,initial:first,steps,anchor,faq,after:end};
    log(`  sections=${first.sectionCount} initialHeight=${first.docHeight}px afterScroll=${end.docHeight}px cls=${end.cls.toFixed(4)} anchor=${anchor.hash} FAQ=${faq.opened}`);
    return item;
  }finally{clean.forEach(fn=>fn());try{await cdp.send('Target.closeTarget',{targetId},undefined,7000)}catch(e){log('TARGET_CLEANUP '+e.message)}}
}
function compare(view,a,b){const baseline=Object.fromEntries(a.steps.map(s=>[s.id,s.settled]));const rows=[];
  for(const s of b.steps){const original=baseline[s.id];rows.push({id:s.id,originalHeight:original.height,candidateHeight:s.settled.height,heightDifference:s.settled.height-original.height,placeholderHeight:s.initialHeight,placeholderDifference:s.initialHeight-original.height,settlingMovement:s.settlingMovementPx,textMatch:s.settled.textChars===original.textChars})}
  const maxHeightDiff=Math.max(...rows.map(x=>Math.abs(x.heightDifference))),maxHintError=Math.max(...rows.filter(x=>SCOPED.includes(x.id)).map(x=>Math.abs(x.placeholderDifference)));
  const endDifference=b.after.docHeight-a.after.docHeight,initialDifference=b.initial.docHeight-a.initial.docHeight;
  const issues=[];
  if(maxHeightDiff>12)issues.push('ACTUAL_SECTION_HEIGHT_MISMATCH');
  if(rows.some(x=>!x.textMatch))issues.push('SECTION_TEXT_MISMATCH');
  if(maxHintError>140)issues.push('PLACEHOLDER_INACCURATE');
  if(Math.abs(endDifference)>140)issues.push('AFTER_SCROLL_PAGE_HEIGHT_MISMATCH');
  if(Math.abs(initialDifference)>300)issues.push('INITIAL_PAGE_HEIGHT_MISMATCH');
  if(Math.max(...b.steps.map(s=>s.settlingMovementPx))>80)issues.push('SCROLL_SETTLING_MOVEMENT');
  if(b.after.cls>0.10||b.after.cls-a.after.cls>0.05)issues.push('EXCESSIVE_LAYOUT_SHIFT');
  if(b.after.allShifts.some(s=>s.value>0.1&&!s.recent))issues.push('LARGE_LAYOUT_SHIFT_EVENT');
  return {viewport:view.label,verdict:issues.length?'NOT_SAFE_FOR_RELEASE':'SCROLL_GEOMETRY_GATE_PASS_NOT_PERFORMANCE_PROOF',issues,rows,maxHeightDiff,maxHintError,initialPageHeightDifference:initialDifference,finalPageHeightDifference:endDifference,baselineCls:a.after.cls,candidateCls:b.after.cls,baselineAnchor:a.anchor,candidateAnchor:b.anchor};
}
function report(){const lines=['# Halleus /compare: scroll, anchor and editorial geometry gate','','- Browser-only candidate applies `content-visibility: auto` **only to the last 5 editorial sections**, with same-viewport measured height hints.','- Hero and comparison form remain fully rendered and interactive. No source edit, no site deployment.','- **This does not establish an FCP/LCP win.** The dynamic hints are for research and must be reviewed before any real CSS change.',''];
  for(const g of DATA.viewportRuns){lines.push(`## ${g.viewport.label}`,`- Verdict: **${g.analysis?.verdict||'INCOMPLETE'}**`,`- Issues: ${(g.analysis?.issues||[]).join(', ')||'none'}`,`- Initial document-height delta: ${g.analysis?.initialPageHeightDifference??'N/A'}px`,`- After-scroll document-height delta: ${g.analysis?.finalPageHeightDifference??'N/A'}px`,`- Max placeholder height error: ${g.analysis?.maxHintError??'N/A'}px`,`- Cumulative CLS: baseline ${g.original?.after?.cls??'N/A'}, candidate ${g.candidate?.after?.cls??'N/A'}`,`- Hero CTA anchors: A=${g.original?.anchor?.hash||'N/A'}, B=${g.candidate?.anchor?.hash||'N/A'}`,`- FAQ opens: A=${g.original?.faq?.opened}, B=${g.candidate?.faq?.opened}`,'','| Editorial section | Real height A | Real height B | Placeholder B | Height mismatch |','|---|---:|---:|---:|---:|',...(g.analysis?.rows||[]).map(s=>`| ${s.id} | ${s.originalHeight} | ${s.candidateHeight} | ${s.placeholderHeight} | ${s.heightDifference} |`),'')}
  lines.push('## Release boundary','',`- Overall: ${DATA.verdict||'NOT_EVALUATED'}`,'- Even a PASS requires a separate controlled performance test and review of screenshots/other viewports before proposing a production CSS change.');
  fs.writeFileSync(path.join(OUT,'report.md'),lines.join('\n')+'\n','utf8');
}
async function main(){assert(OUT&&CHROME,'MISSING_ARGS');fs.mkdirSync(OUT,{recursive:true});save();try{await startChrome();
    for(const view of VIEWPORTS){const group={viewport:view,original:null,candidate:null,analysis:null};DATA.viewportRuns.push(group);
      try{group.original=await run(view,'A',null);save();const heights=Object.fromEntries(group.original.steps.filter(s=>SCOPED.includes(s.id)).map(s=>[s.id,s.settled.height]));group.candidate=await run(view,'B',heights);group.analysis=compare(view,group.original,group.candidate);log(`${view.label} ${group.analysis.verdict} ${group.analysis.issues.join(',')||'NO_ISSUES'}`)}
      catch(e){DATA.errors.push({viewport:view.label,error:e.stack||String(e)});log(`${view.label} FAILED ${e.message}`)}save();
    }
    const allGood=DATA.viewportRuns.length===VIEWPORTS.length&&DATA.viewportRuns.every(g=>g.analysis?.verdict==='SCROLL_GEOMETRY_GATE_PASS_NOT_PERFORMANCE_PROOF');
    DATA.verdict=allGood?'SCROLL_GATE_PASS_REQUIRES_PERFORMANCE_CONFIRMATION':'SCROLL_GATE_HOLD';DATA.status=allGood?'PASS':'FAIL';DATA.endedUtc=new Date().toISOString();report();save();
    if(!allGood){fs.writeFileSync(path.join(OUT,'FAILURE.txt'),(DATA.errors.map(e=>e.viewport+' '+e.error).join('\n\n')||DATA.viewportRuns.map(g=>g.viewport.label+': '+(g.analysis?.issues||[]).join(',')).join('\n'))+'\n','utf8');process.exitCode=1}
  }catch(e){DATA.status='FAIL';DATA.verdict='EXTERNAL_OR_TOOL_FAILURE';DATA.errors.push({error:e.stack||String(e)});save();fs.writeFileSync(path.join(OUT,'FAILURE.txt'),String(e.stack||e),'utf8');console.error('SCROLL_AUDIT_FAILED '+e.message);process.exitCode=1}
  finally{cdp?.close();try{chrome?.kill()}catch{};if(profile){try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:2,retryDelay:250})}catch{log('CHROME_PROFILE_RETAINED '+profile)}}}
}
main();
'@
try {
  [IO.File]::WriteAllText($jsFile,$js,(New-Object System.Text.UTF8Encoding($false)))
  Write-Host '[2/3] COMPARE SCROLL SAFETY: MOBILE + DESKTOP; NATIVE AND SCOPED BROWSER CSS' -ForegroundColor Cyan
  & $node.Source $jsFile "--chrome=$chrome" "--output=$out"
  $rc = $LASTEXITCODE
  Write-Host '[3/3] RESULTS AND WORKTREE' -ForegroundColor Cyan
  if (Test-Path -LiteralPath (Join-Path $out 'report.md')) {
    Get-Content -LiteralPath (Join-Path $out 'report.md') -Encoding UTF8 | Select-Object -First 32
  }
  Write-Host "REPORT: $(Join-Path $out 'report.md')"
  Write-Host "RAW_JSON: $(Join-Path $out 'results.json')"
  $after = @(& git -C $repo -c core.quotepath=false status --porcelain --untracked-files=all)
  if ($LASTEXITCODE -ne 0) { throw 'SAFETY_FATAL: FINAL_GIT_STATUS_FAILED' }
  if (($dirty -join "`n") -cne ($after -join "`n")) { throw 'SAFETY_FATAL: WORKTREE_CHANGED' }
  Write-Host "WORKTREE_PRESERVED: $($after.Count) entries"
  & git -C $repo --no-pager diff --check
  if ($LASTEXITCODE -ne 0) { Write-Host 'UNRELATED_BASELINE_FAILURE: EXISTING_DIFF_CHECK' -ForegroundColor Yellow }
  else { Write-Host 'GIT_DIFF_CHECK_PASS' }
  if ($rc -ne 0) {
    $zip = Join-Path $download "HalleusCompareScrollSafety-FailureLogs-$stamp.zip"
    Compress-Archive -Path (Join-Path $out '*') -DestinationPath $zip -Force
    Write-Host "FAILURE_LOGS: $zip" -ForegroundColor Yellow
    throw 'COMPARE_SCROLL_SAFETY_HOLD'
  }
  Write-Host 'HALLEUS_COMPARE_SCROLL_SAFETY_COMPLETE' -ForegroundColor Green
}
finally { Remove-Item -LiteralPath $jsFile -Force -ErrorAction SilentlyContinue }