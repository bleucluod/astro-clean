param(
  [Parameter(Mandatory=$true)][string]$RepoPath,
  [ValidateSet('Prepare','A','B','LocalA','LocalB','Stop','Status')][string]$Mode='Prepare'
)
$ErrorActionPreference='Stop'
Set-StrictMode -Version Latest

# Halleus PageSpeed A/B: isolated preview, not a production release.
# Maintained only on perf/20261123-pagespeed-tunnel-runner; never merge into main.
$RequiredMain='d2a107d45b41940f3694ff483069a5f5c3fcd263'
$ShaA='cbc39dafbd08e876bf8d977eb3d02849d71f35a4'
$ShaB='613b12c18b3bcfcc8a8d16a5c12a9de81d2ecb37'
$RepoPath=[IO.Path]::GetFullPath($RepoPath)
$Lab=Join-Path (Split-Path $RepoPath -Parent) 'halleus-pagespeed-tunnel-lab-20261123'
$WorkA=Join-Path $Lab 'a'
$WorkB=Join-Path $Lab 'b'
$Runtime=Join-Path $Lab 'runtime'
$Logs=Join-Path $Lab 'logs'
$StatePath=Join-Path $Runtime 'pids.json'
$Selection=Join-Path $Runtime 'selection.txt'
$ProxyPath=Join-Path $Runtime 'chart-only-proxy.cjs'
$NextPort=3298
$ProxyPort=3299
$Marker='HALLEUS_PSI_TUNNEL_20261123_R1'
$Failures=[System.Collections.Generic.List[string]]::new()

function Info([string]$s) { Write-Host ('HALLEUS_PSI: '+$s) }
function Fatal([string]$s) { throw ('SAFETY_FATAL: '+$s) }
function Invoke-GitChecked([string[]]$Items) {
  $v=@(& git.exe -C $RepoPath @Items)
  if ($LASTEXITCODE -ne 0) { Fatal ('Git failed: '+($Items -join ' ')) }
  return $v
}
function Verify-Repo {
  foreach($tool in @('git','node','pnpm')){
    if(-not (Get-Command $(if($tool -eq 'git'){'git.exe'}else{$tool}) -ErrorAction SilentlyContinue)){Fatal ('Missing tool: '+$tool)}
  }
  if(-not(Test-Path (Join-Path $RepoPath '.git'))){Fatal 'Not a Git working tree'}
  $origin=[string](Invoke-GitChecked @('remote','get-url','origin') | Select-Object -First 1)
  if($origin -notin @('https://github.com/bleucluod/astro-clean','https://github.com/bleucluod/astro-clean.git','git@github.com:bleucluod/astro-clean.git')){Fatal ('Wrong origin: '+$origin)}
  $branch=[string](Invoke-GitChecked @('branch','--show-current') | Select-Object -First 1)
  if($branch -ne 'main'){Fatal ('Expected main, got '+$branch)}
  $dirty=@(Invoke-GitChecked @('status','--porcelain=v1','--untracked-files=all') | Where-Object {$_})
  if($dirty.Count){Fatal ('Main contains uncommitted files: '+($dirty -join '; '))}
  $script:MainHead=[string](Invoke-GitChecked @('rev-parse','HEAD') | Select-Object -First 1)
  if($script:MainHead -notmatch '^[a-f0-9]{40}$'){Fatal 'Invalid HEAD'}
  if($script:MainHead -ne $RequiredMain){Fatal ('Unexpected main HEAD: '+$script:MainHead+' (expected '+$RequiredMain+')')}
  Info ('source main='+$script:MainHead+' (clean)')
}
function Verify-Lab {
  if(Test-Path $Lab){
    if((Get-Item $Lab -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){Fatal 'Lab path is a link'}
    if(-not(Test-Path (Join-Path $Lab '.identity'))){Fatal 'Unknown existing lab'}
    if((Get-Content (Join-Path $Lab '.identity') -Raw).Trim() -ne $Marker){Fatal 'Lab marker mismatch'}
  }
  foreach($p in @($WorkA,$WorkB,$Runtime,$Logs)){
    if(Test-Path $p){
      if((Get-Item $p -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){Fatal ('Unexpected link: '+$p)}
    }
  }
}
function Ensure-Lab {
  if(-not(Test-Path $Lab)){
    New-Item -ItemType Directory $Lab | Out-Null
    [IO.File]::WriteAllText((Join-Path $Lab '.identity'),$Marker,[Text.UTF8Encoding]::new($false))
  }
  foreach($p in @($Runtime,$Logs)){New-Item -ItemType Directory -Force $p | Out-Null}
}
function Check-Worktree([string]$path,[string]$sha) {
  if(-not(Test-Path $path)){return $false}
  if(-not(Test-Path (Join-Path $path '.git') -PathType Leaf)){Fatal ('Existing directory not a linked worktree: '+$path)}
  $headOutput=@(& git.exe -C $path rev-parse --verify HEAD)
  $headExit=$LASTEXITCODE
  $actualHead=if($headOutput.Count -eq 1){([string]$headOutput[0]).Trim()}else{'<invalid-head-output>'}
  if($headExit -ne 0 -or $actualHead -ne $sha){
    Fatal ('Unexpected worktree HEAD: path='+$path+' expected='+$sha+' actual='+$actualHead+' git_exit='+$headExit)
  }
  $dirty=@(& git.exe -C $path status --porcelain=v1 --untracked-files=all)
  $statusExit=$LASTEXITCODE
  if($statusExit -ne 0){Fatal ('Cannot read worktree status: '+$path+' git_exit='+$statusExit)}
  $dirty=@($dirty | Where-Object {$_})
  if($dirty.Count){Fatal ('Dirty preview worktree: '+$path+' entries='+$dirty.Count)}
  $envs=@(Get-ChildItem $path -File -Force -Filter '.env*' | Where-Object {$_.Name -ne '.env.example'})
  if($envs.Count){Fatal ('Preview environment file found at '+$path)}
  return $true
}
function Source-Refs {
  Info 'Fetching two pinned source refs'
  Invoke-GitChecked @('fetch','origin','refs/heads/perf/psi-a-cbc39da:refs/remotes/origin/perf/psi-a-cbc39da','refs/heads/perf/psi-b-613b12c:refs/remotes/origin/perf/psi-b-613b12c') | Out-Null
  $a=[string](Invoke-GitChecked @('rev-parse','refs/remotes/origin/perf/psi-a-cbc39da') | Select-Object -First 1)
  $b=[string](Invoke-GitChecked @('rev-parse','refs/remotes/origin/perf/psi-b-613b12c') | Select-Object -First 1)
  if($a -ne $ShaA -or $b -ne $ShaB){Fatal 'Source refs do not match pinned SHAs'}
  $changed=@(Invoke-GitChecked @('diff','--name-only',$ShaA,$ShaB))
  if($changed.Count -ne 1 -or $changed[0] -ne 'components/ChartMobileBirthPicker.tsx'){Fatal 'Unexpected A/B source diff'}
  Invoke-GitChecked @('diff','--check',$ShaA,$ShaB) | Out-Null
}
function Ensure-Worktree([string]$p,[string]$sha){
  if(Check-Worktree $p $sha){Info ('RESUMED_PASS worktree '+$sha.Substring(0,7));return}
  Invoke-GitChecked @('worktree','add','--detach',$p,$sha) | Out-Null
  if(-not(Check-Worktree $p $sha)){Fatal 'Worktree was not created'}
}
function Clean-Env([scriptblock]$body){
  $names=@(Get-ChildItem Env: | Where-Object {$_.Name -match '(?i)(DATABASE|POSTGRES|SUPABASE|AUTH|SECRET|TOKEN|PASSWORD|PAYMENT|BITPAY|STRIPE|TELEGRAM|VERCEL|HALLEUS|SENTRY|CLOUDFLARE|NEXT_PUBLIC|GOOGLE_APPLICATION_CREDENTIALS)'} | ForEach-Object {$_.Name})
  $old=@{}
  foreach($n in $names){$old[$n]=[Environment]::GetEnvironmentVariable($n,'Process');[Environment]::SetEnvironmentVariable($n,$null,'Process')}
  $nodeEnv=[Environment]::GetEnvironmentVariable('NODE_ENV','Process')
  [Environment]::SetEnvironmentVariable('NODE_ENV','production','Process')
  try {& $body} finally {
    foreach($n in $old.Keys){[Environment]::SetEnvironmentVariable($n,[string]$old[$n],'Process')}
    [Environment]::SetEnvironmentVariable('NODE_ENV',$nodeEnv,'Process')
  }
}
function Logged([string]$dir,[string]$command,[string[]]$commandArgs,[string]$logfile){
  Push-Location $dir
  try {
    $old=$ErrorActionPreference
    $ErrorActionPreference='Continue'
    try {
      $ok=Clean-Env {& $command @commandArgs *>&1 | Out-File $logfile -Encoding utf8 -Width 230; $LASTEXITCODE -eq 0}
      return [bool]$ok
    } finally {$ErrorActionPreference=$old}
  } finally {Pop-Location}
}
function Build-NoDbPreview([string]$dir,[string]$logFile){
  # Preview-only overlay. Changes only Wiki server storage handling for build-time
  # prerendering; /chart's source is unchanged. Restore original bytes on all exits.
  $wikiPath=Join-Path $dir 'lib/wiki/wiki-repository.ts'
  if(-not(Test-Path $wikiPath -PathType Leaf)){Fatal ('Wiki source missing: '+$wikiPath)}
  $originalBytes=[IO.File]::ReadAllBytes($wikiPath)
  $source=[Text.UTF8Encoding]::new($false,$true).GetString($originalBytes)
  $patternRuntime='(?m)^function isProductionWikiRuntime\(\) \{\r?\n  return process\.env\.NODE_ENV === "production";\r?\n\}'
  $patternFooter='(?m)^export const getLatestPublicWikiFooterArticles = cache\(async \(\) =>\r?\n  loadPersistedFooterArticles\(\),\r?\n\);'
  if([regex]::Matches($source,$patternRuntime).Count -ne 1 -or
     [regex]::Matches($source,$patternFooter).Count -ne 1){
    Fatal 'Preview Wiki overlay source contract changed: refusing unknown patch'
  }
  $newline=if($source.Contains(([string][char]13+[char]10))){[string][char]13+[char]10}else{[string][char]10}
  $replacementRuntime='function isProductionWikiRuntime() {'+$newline+
    '  return false; // HALLEUS_PSI_PREVIEW_WIKI_FALLBACK_ONLY'+$newline+'}'
  $replacementFooter='export const getLatestPublicWikiFooterArticles = cache(async () =>'+$newline+
    '  [] as PublicWikiFooterArticle[], // HALLEUS_PSI_PREVIEW_WIKI_FOOTER_NO_DB'+$newline+');'
  $candidate=[regex]::Replace($source,$patternRuntime,$replacementRuntime)
  $candidate=[regex]::Replace($candidate,$patternFooter,$replacementFooter)
  if($candidate -eq $source -or
     -not $candidate.Contains('HALLEUS_PSI_PREVIEW_WIKI_FALLBACK_ONLY') -or
     -not $candidate.Contains('HALLEUS_PSI_PREVIEW_WIKI_FOOTER_NO_DB')){
    Fatal 'Preview Wiki overlay patch was not generated'
  }
  $ok=$false
  try {
    [IO.File]::WriteAllText($wikiPath,$candidate,[Text.UTF8Encoding]::new($false))
    Info 'TEMPORARY_PREVIEW_OVERLAY: Wiki no-DB fallback; /chart unmodified'
    $ok=Logged $dir 'pnpm' @('build') $logFile
  } finally {
    [IO.File]::WriteAllBytes($wikiPath,$originalBytes)
    $post=@(& git.exe -C $dir status --porcelain=v1 --untracked-files=all)
    $statusCode=$LASTEXITCODE
    $post=@($post | Where-Object {$_})
    if($statusCode -ne 0 -or $post.Count){
      Fatal ('Preview source not restored cleanly: '+$dir+' git_exit='+$statusCode+' status='+($post -join '; '))
    }
    Info ('RESTORED_PREVIEW_SOURCE: '+$dir)
  }
  return $ok
}
function Build([string]$label,[string]$dir,[string]$sha){
  if(-not(Check-Worktree $dir $sha)){Fatal ('Missing '+$label)}
  $fingerprint=$sha+'/'+(Get-FileHash (Join-Path $dir 'pnpm-lock.yaml') -Algorithm SHA256).Hash+'/'+(& node --version)+'/'+(& pnpm --version)+'/wiki-preview-no-db-r2'
  $stamp=Join-Path $Runtime ($label+'.stamp')
  $buildId=Join-Path $dir '.next/BUILD_ID'
  if((Test-Path $stamp) -and (Test-Path $buildId) -and (Get-Content $stamp -Raw).Trim() -eq $fingerprint){Info ('RESUMED_PASS build '+$label);return}
  Info ('Installing dependencies for '+$label)
  if(-not(Logged $dir 'pnpm' @('install','--frozen-lockfile','--prod=false') (Join-Path $Logs ($label+'-install.log')))){
    $Failures.Add($label+'/install')
  }
  if(-not(Test-Path (Join-Path $dir 'node_modules'))){$Failures.Add($label+'/build/BLOCKED_BY_DEPENDENCY');return}
  foreach($guard in @('scripts/check-chart-trace-first-render.mjs','scripts/check-chart-mobile-journey.mjs')){
    if(-not(Test-Path (Join-Path $dir $guard))){$Failures.Add($label+'/missing-guard/'+$guard);continue}
    if(-not(Logged $dir 'node' @($guard) (Join-Path $Logs ($label+'-'+[IO.Path]::GetFileName($guard)+'.log')))){$Failures.Add($label+'/guard/'+$guard)}
  }
  Info ('Building '+$label+' (see '+$Logs+')')
  if(-not(Build-NoDbPreview $dir (Join-Path $Logs ($label+'-build.log')))){
    $Failures.Add($label+'/build')
  } elseif(-not(Test-Path $buildId)) {
    $Failures.Add($label+'/BUILD_ID-missing')
  } else {
    [IO.File]::WriteAllText($stamp,$fingerprint,[Text.UTF8Encoding]::new($false))
    Info ('PASS build '+$label)
  }
}
function Read-State {
  if(-not(Test-Path $StatePath)){return @{}}
  try {
    $json=Get-Content $StatePath -Raw | ConvertFrom-Json
    $o=@{}; foreach($p in $json.PSObject.Properties){$o[$p.Name]=$p.Value}
    return $o
  } catch {Fatal 'Corrupt process state; will not stop unknown processes'}
}
function Save-State([hashtable]$s){
  [IO.File]::WriteAllText($StatePath,($s|ConvertTo-Json -Depth 4),[Text.UTF8Encoding]::new($false))
}
function Owns([string]$name,[object]$info){
  if(-not $info){return $false}
  $pidNumber=[int]$info.pid
  if($pidNumber -le 0){Fatal ('Invalid PID for '+$name)}
  $proc=Get-CimInstance Win32_Process -Filter "ProcessId=$pidNumber" -ErrorAction SilentlyContinue
  if(-not $proc){return $false}
  if(([string]$proc.CommandLine).IndexOf([string]$info.needle,[StringComparison]::OrdinalIgnoreCase) -lt 0){
    Fatal ('PID was reused or changed: '+$name)
  }
  return $true
}
function Stop-Owned([hashtable]$s,[string]$name){
  if(-not $s.ContainsKey($name)){return}
  $info=$s[$name]
  if(Owns $name $info){
    & taskkill.exe /PID ([string]$info.pid) /T /F | Out-Null
    if($LASTEXITCODE -ne 0){Fatal ('Unable to stop owned process '+$name)}
  }
  [void]$s.Remove($name);Save-State $s
}
function Port-Used([int]$port){
  return [bool](@(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue).Count)
}
function Ports-Safe([hashtable]$s) {
  foreach($check in @(@{port=$NextPort;key='next'},@{port=$ProxyPort;key='proxy'})){
    if(Port-Used $check.port){
      if(-not($s.ContainsKey($check.key) -and (Owns $check.key $s[$check.key]))){Fatal ('Port in use by unknown service: '+$check.port)}
    }
  }
}
function Spawn([hashtable]$s,[string]$name,[string]$exe,[string[]]$commandArgs,[string]$cwd,[string]$needle){
  $p=Clean-Env {
    Start-Process -FilePath $exe -ArgumentList $commandArgs -WorkingDirectory $cwd -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $Logs ($name+'-out.log')) -RedirectStandardError (Join-Path $Logs ($name+'-err.log'))
  }
  $s[$name]=@{pid=$p.Id;needle=$needle};Save-State $s
}
function Reachable([string]$url){
  for($i=0;$i -lt 30;$i++){
    try {
      $r=Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -TimeoutSec 5 -MaximumRedirection 0
      if($r.StatusCode -eq 200){return $true}
    } catch {}
    Start-Sleep -Milliseconds 600
  }
  return $false
}
$ProxyJs=@'
'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const [localPort, nextPort, dirA, dirB, selectedFile]=process.argv.slice(2);
if(!selectedFile)process.exit(9);
const roots={a:dirA,b:dirB};
const safe={
  'x-robots-tag':'noindex,nofollow,noarchive',
  'cache-control':'no-store',
  'referrer-policy':'no-referrer',
  'x-content-type-options':'nosniff',
  'content-security-policy':"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' blob:; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:"
};
function asset(root,route){
  if(!route.startsWith('/')||route.includes('\\')||route.includes('\0'))return false;
  const parts=route.slice(1).split('/');
  if(parts.some(s=>!s||s==='.'||s==='..'||s.startsWith('.')))return false;
  const base=fs.realpathSync(path.join(root,'public'));
  const file=path.resolve(base,...parts);
  if(!file.startsWith(base+path.sep))return false;
  try{return fs.realpathSync(file).startsWith(base+path.sep)&&fs.statSync(file).isFile()}catch{return false}
}
function allowed(req,root){
  if(!['GET','HEAD'].includes(req.method))return false;
  if(!req.url||req.url.length>2048||!req.url.startsWith('/')||req.url.startsWith('//')||req.url.includes('\\'))return false;
  let url;try{url=new URL(req.url,'http://127.0.0.1')}catch{return false}
  const p=url.pathname;
  if(p.includes('%')||p.includes('..')||p.includes('//')||p.includes('/.'))return false;
  if(p==='/chart')return !url.search || ([...url.searchParams.keys()].every(x=>x==='_rsc') && url.searchParams.has('_rsc'));
  if(p.startsWith('/_next/static/'))return !url.search&&/^\/_next\/static\/[a-zA-Z0-9._\/-]+$/.test(p)&&p.length<300;
  if(p==='/_next/image'){
    if([...url.searchParams.keys()].some(x=>!['url','w','q'].includes(x)))return false;
    const image=url.searchParams.get('url')||'';
    return image.startsWith('/')&&!image.includes('%')&&asset(root,image);
  }
  return !url.search&&asset(root,p);
}
function error(res,status){
  res.writeHead(status,{...safe,'content-type':'text/plain;charset=utf-8'});
  res.end('Unavailable on Halleus PageSpeed preview');
}
http.createServer((req,res)=>{
  let selected;try{selected=fs.readFileSync(selectedFile,'utf8').trim()}catch{return error(res,503)}
  if(!roots[selected])return error(res,503);
  if(!allowed(req,roots[selected]))return error(res,404);
  const headers={host:'127.0.0.1:'+nextPort,'accept':req.headers.accept||'*/*','accept-encoding':req.headers['accept-encoding']||'identity','user-agent':req.headers['user-agent']||'PageSpeed'};
  const prox=http.request({hostname:'127.0.0.1',port:Number(nextPort),method:req.method,path:req.url,headers,timeout:30000},up=>{
    const responseHeaders={...up.headers,...safe};
    delete responseHeaders['set-cookie'];delete responseHeaders['transfer-encoding'];delete responseHeaders.connection;
    res.writeHead(up.statusCode||502,responseHeaders);
    up.pipe(res);
  });
  prox.on('error',()=>{if(!res.headersSent)error(res,502);else res.destroy()});
  prox.on('timeout',()=>prox.destroy());
  req.pipe(prox);
}).listen(Number(localPort),'127.0.0.1',()=>console.log('HALLEUS_PSI_PROXY_READY'));
'@
function Cloudflared {
  $cmd=Get-Command cloudflared.exe -ErrorAction SilentlyContinue
  if($cmd){return $cmd.Source}
  $paths=@(
    (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\cloudflared.exe'),
    (Join-Path $env:ProgramFiles 'cloudflared\cloudflared.exe'),
    (Join-Path $env:ProgramFiles 'Cloudflare\cloudflared.exe')
  )
  $programFilesX86=[Environment]::GetEnvironmentVariable('ProgramFiles(x86)')
  if($programFilesX86){
    $paths += (Join-Path $programFilesX86 'cloudflared\cloudflared.exe')
    $paths += (Join-Path $programFilesX86 'Cloudflare\cloudflared.exe')
  }
  foreach($p in $paths){if(Test-Path -LiteralPath $p -PathType Leaf){return $p}}
  $packages=Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
  if(Test-Path -LiteralPath $packages -PathType Container){
    foreach($d in @(Get-ChildItem -LiteralPath $packages -Directory -Filter 'Cloudflare.cloudflared*')){
      $exe=Join-Path $d.FullName 'cloudflared.exe'
      if(Test-Path -LiteralPath $exe -PathType Leaf){return $exe}
    }
  }
  return $null
}
function Tunnel-Url {
  foreach($f in @((Join-Path $Logs 'tunnel-err.log'),(Join-Path $Logs 'tunnel-out.log'))){
    if(Test-Path $f){
      $v=[regex]::Matches((Get-Content $f -Raw),'https://[a-z0-9-]+\.trycloudflare\.com')
      if($v.Count){return $v[$v.Count-1].Value}
    }
  }
  return $null
}
function Start-Variant([string]$kind,[bool]$LocalOnly=$false){
  $work=if($kind -eq 'a'){$WorkA}else{$WorkB}
  $sha=if($kind -eq 'a'){$ShaA}else{$ShaB}
  if(-not(Check-Worktree $work $sha) -or -not(Test-Path (Join-Path $work '.next/BUILD_ID'))){Fatal ('Build not prepared: '+$kind)}
  $cloud=$null
  if(-not $LocalOnly){
    $cloud=Cloudflared
    if(-not $cloud){
      $Failures.Add('EXTERNAL_BLOCK/cloudflared-missing')
      Info 'Install Cloudflare Quick Tunnel CLI: winget install --id Cloudflare.cloudflared --exact'
      return
    }
  }
  $s=Read-State;Ports-Safe $s
  if($LocalOnly){
    # Prevent an existing owned tunnel from publishing a local-only comparison.
    Stop-Owned $s 'tunnel'
  }
  if($s.ContainsKey('next')){
    Stop-Owned $s 'next'
    for($i=0;$i -lt 30 -and (Port-Used $NextPort);$i++){Start-Sleep -Milliseconds 300}
    if(Port-Used $NextPort){Fatal 'Next port did not release'}
  }
  $node=(Get-Command node).Source
  $next=Join-Path $work 'node_modules\next\dist\bin\next'
  if(-not(Test-Path $next)){Fatal ('Missing Next binary: '+$next)}
  Remove-Item $Selection -ErrorAction SilentlyContinue
  Spawn $s 'next' $node @('"'+$next+'"','start','--hostname','127.0.0.1','--port',[string]$NextPort) $work $next
  if(-not(Reachable ('http://127.0.0.1:'+$NextPort+'/chart'))){$Failures.Add($kind+'/next-not-ready');return}
  if(-not $s.ContainsKey('proxy') -or -not(Owns 'proxy' $s['proxy'])){
    [IO.File]::WriteAllText($ProxyPath,$ProxyJs,[Text.UTF8Encoding]::new($false))
    & node --check $ProxyPath
    if($LASTEXITCODE -ne 0){Fatal 'Proxy syntax failed'}
    Spawn $s 'proxy' $node @('"'+$ProxyPath+'"',[string]$ProxyPort,[string]$NextPort,'"'+$WorkA+'"','"'+$WorkB+'"','"'+$Selection+'"') $Runtime $ProxyPath
  }
  [IO.File]::WriteAllText($Selection,$kind,[Text.UTF8Encoding]::new($false))
  if(-not(Reachable ('http://127.0.0.1:'+$ProxyPort+'/chart'))){$Failures.Add($kind+'/proxy-not-ready');return}
  foreach($route in @('/api/engine/real-chart','/reports','/admini','/account','/profile')){
    try{$r=Invoke-WebRequest -Uri ('http://127.0.0.1:'+$ProxyPort+$route) -UseBasicParsing -TimeoutSec 5;$code=[int]$r.StatusCode}
    catch{$code=[int]$_.Exception.Response.StatusCode}
    if($code -ne 404){$Failures.Add($kind+'/unsafe-route/'+$route+'/'+$code)}
  }
  if($Failures.Count){return}
  if($LocalOnly){
    Info ('ACTIVE_LOCAL='+$kind+' COMMIT='+$sha)
    Info ('LOCAL_LIGHTHOUSE_URL=http://127.0.0.1:'+$ProxyPort+'/chart')
    Info 'Run Chrome DevTools Lighthouse: Navigation, Mobile, Performance.'
    Info 'This is a local Lighthouse comparison, not a remote PageSpeed Insights score.'
    return
  }
  if(-not $s.ContainsKey('tunnel') -or -not(Owns 'tunnel' $s['tunnel'])){
    foreach($file in @('config.yml','config.yaml')){
      if(Test-Path (Join-Path (Join-Path $HOME '.cloudflared') $file)){Fatal 'Existing .cloudflared config prevents Quick Tunnel'}
    }
    Spawn $s 'tunnel' $cloud @('tunnel','--url',('http://127.0.0.1:'+$ProxyPort)) $Runtime ('--url http://127.0.0.1:'+$ProxyPort)
  }
  $url=$null
  for($i=0;$i -lt 40;$i++){ $url=Tunnel-Url; if($url){break}; Start-Sleep -Milliseconds 500 }
  if(-not $url){$Failures.Add('EXTERNAL_BLOCK/tunnel-url-not-issued');return}
  Info ('ACTIVE='+$kind+' COMMIT='+$sha)
  Info ('PAGE_SPEED_URL='+$url+'/chart')
  Info ('OPEN_PSI=https://pagespeed.web.dev/analysis?url='+[uri]::EscapeDataString($url+'/chart')+'&form_factor=mobile')
  Info 'Same URL for A/B as long as the tunnel stays running.'
}
function Failure-Zip {
  if(-not(Test-Path -LiteralPath $Logs -PathType Container)){return}
  $stage=$null
  try {
    $downloads=Join-Path $HOME 'Downloads'
    New-Item -ItemType Directory -Force -Path $downloads | Out-Null
    $summary=Join-Path $Logs 'failure-summary.txt'
    [IO.File]::WriteAllLines($summary,[string[]](@('HEAD='+$MainHead,'A='+$ShaA,'B='+$ShaB,'FAILURES:')+[string[]]$Failures),[Text.UTF8Encoding]::new($false))
    # Snapshot logs before archiving. A running Next.js process may keep its log files open.
    $stage=Join-Path $Runtime ('failure-snapshot-'+[guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $stage | Out-Null
    $skipped=[System.Collections.Generic.List[string]]::new()
    foreach($f in @(Get-ChildItem -LiteralPath $Logs -File)){
      $inputStream=$null
      $outputStream=$null
      try {
        $inputStream=[IO.File]::Open($f.FullName,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
        $outputStream=[IO.File]::Create((Join-Path $stage $f.Name))
        $inputStream.CopyTo($outputStream)
      } catch {
        $skipped.Add($f.Name+': '+$_.Exception.GetType().Name)
      } finally {
        if($outputStream){$outputStream.Dispose()}
        if($inputStream){$inputStream.Dispose()}
      }
    }
    [IO.File]::WriteAllLines((Join-Path $stage 'snapshot-notes.txt'),[string[]](@('SKIPPED_LOGS:')+[string[]]$skipped),[Text.UTF8Encoding]::new($false))
    $zip=Join-Path $downloads ('Halleus-PageSpeed-FailureLogs-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.zip')
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force -ErrorAction Stop
    Info ('FAILURE_LOGS_ZIP='+$zip)
    if($skipped.Count){Info ('LOCKED_LOGS_NOT_COPIED='+($skipped -join ', '))}
  } catch {
    Info ('FAILURE_LOG_ARCHIVE_ERROR='+$_.Exception.Message)
  } finally {
    if($stage -and (Test-Path -LiteralPath $stage -PathType Container)){
      Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}
try {
  Verify-Repo;Verify-Lab
  $s=Read-State;Ports-Safe $s
  switch($Mode){
    'Prepare'{
      Source-Refs;Ensure-Lab
      Ensure-Worktree $WorkA $ShaA
      Ensure-Worktree $WorkB $ShaB
      Build 'a' $WorkA $ShaA
      Build 'b' $WorkB $ShaB
      if(-not $Failures.Count){Start-Variant 'a'}
    }
    'A'{Start-Variant 'a'}
    'B'{Start-Variant 'b'}
    'LocalA'{Start-Variant 'a' $true}
    'LocalB'{Start-Variant 'b' $true}
    'Stop'{
      foreach($name in @('tunnel','proxy','next')){Stop-Owned $s $name}
      Remove-Item $Selection -ErrorAction SilentlyContinue
      Info 'Stopped owned processes only; builds retained.'
    }
    'Status'{
      foreach($name in @('next','proxy','tunnel')){
        $status=if($s.ContainsKey($name)){Owns $name $s[$name]}else{$false}
        Info ($name+'='+$status)
      }
      Info ('URL='+[string](Tunnel-Url))
      if(Test-Path $Selection){Info ('ACTIVE='+(Get-Content $Selection -Raw).Trim())}
    }
  }
  if($Failures.Count){Info ('FAILURES='+($Failures -join '; '));Failure-Zip;exit 1}
  $head=[string](Invoke-GitChecked @('rev-parse','HEAD')|Select-Object -First 1)
  if($head -ne $MainHead){Fatal 'Main HEAD changed during operation'}
  $dirty=@(Invoke-GitChecked @('status','--porcelain=v1','--untracked-files=all') | Where-Object {$_})
  Info ('FINAL_GIT_STATUS=' + $(if($dirty.Count){$dirty -join '; '}else{'CLEAN'}))
  Info 'A/B diff: components/ChartMobileBirthPicker.tsx only.'
  Info 'No commit/tag/push/deploy/production changes.'
} catch {
  $msg=[string]$_.Exception.Message
  Info $msg
  if(-not $msg.StartsWith('SAFETY_FATAL:')){
    $Failures.Add('CANDIDATE_FAILURE/'+$msg)
    Failure-Zip
  }
  exit 1
}
