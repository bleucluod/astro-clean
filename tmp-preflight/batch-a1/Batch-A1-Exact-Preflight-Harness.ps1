$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

$expectedBase = "ffaec58d3a85fd0b0508f28756a7d0f2ea12d8c7"
$expectedTag = "v0.1.373-whole-chart-theme-coverage"
$expectedRunnerSha = "ed09bb85b9e1c1d885ccda4e0bf2ddc2e394cabb79b4d29e83e679ce8da372d9"
$sourceRef = "origin/agent/batch-a1-publication-policy-preflight-20260801"
$runnerPath = Join-Path $env:RUNNER_TEMP "Apply-Halleus-Report-Publication-Policy-A1-20260801.ps1"
$gzipPath = Join-Path $env:RUNNER_TEMP "batch-a1-old-runner.ps1.gz"
$target = Join-Path $env:RUNNER_TEMP "halleus-a1-target"
$artifactDir = Join-Path $env:RUNNER_TEMP "batch-a1-artifact"

function Invoke-GitChecked {
  param([Parameter(Mandatory=$true)][string[]]$Arguments)
  & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "GIT_FAILED=$($Arguments -join ' ')"
  }
}

Write-Host "HARNESS_START=PASS"
Invoke-GitChecked -Arguments @("fetch", "origin", "agent/batch-a1-publication-policy-preflight-20260801")

$encoded = ""
foreach ($index in 0..5) {
  $path = "tmp-preflight/batch-a1/runner-part-{0:D2}.txt" -f $index
  $part = & git show "${sourceRef}:$path"
  if ($LASTEXITCODE -ne 0) {
    throw "RUNNER_CHUNK_READ_FAILED=$path"
  }
  $encoded += ($part -join "")
}
if ($encoded.Length -ne 42224) {
  throw "OLD_RUNNER_BASE64_LENGTH_MISMATCH=$($encoded.Length)"
}

[System.IO.File]::WriteAllBytes($gzipPath, [Convert]::FromBase64String($encoded))
$input = [System.IO.File]::OpenRead($gzipPath)
try {
  $gzip = New-Object System.IO.Compression.GZipStream(
    $input,
    [System.IO.Compression.CompressionMode]::Decompress
  )
  try {
    $output = [System.IO.File]::Create($runnerPath)
    try { $gzip.CopyTo($output) } finally { $output.Dispose() }
  }
  finally { $gzip.Dispose() }
}
finally { $input.Dispose() }

$oldBlock = @(
  '  Write-Host "DEPENDENCIES=OFFLINE_INSTALL"',
  '  Invoke-Native -FilePath "pnpm.cmd" -Arguments @(',
  '    "install",',
  '    "--offline",',
  '    "--frozen-lockfile"',
  '  ) -WorkingDirectory $WorktreeRoot'
) -join "`n"
$newBlock = @(
  '  Write-Host "DEPENDENCIES=LOCKED_INSTALL"',
  '  Invoke-Native -FilePath "pnpm.cmd" -Arguments @(',
  '    "install",',
  '    "--frozen-lockfile"',
  '  ) -WorkingDirectory $WorktreeRoot'
) -join "`n"
$text = [System.IO.File]::ReadAllText($runnerPath)
if (-not $text.Contains($oldBlock)) {
  throw "RUNNER_INSTALL_BLOCK_MISSING"
}
$text = $text.Replace($oldBlock, $newBlock)
[System.IO.File]::WriteAllText(
  $runnerPath,
  $text,
  (New-Object System.Text.UTF8Encoding($true))
)

$runnerSha = (Get-FileHash -LiteralPath $runnerPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($runnerSha -ne $expectedRunnerSha) {
  throw "RUNNER_SHA256_MISMATCH=$runnerSha"
}
$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
  $runnerPath,
  [ref]$tokens,
  [ref]$errors
) | Out-Null
if (@($errors).Count -gt 0) {
  throw "RUNNER_PARSE_FAILED=$(@($errors).Message -join '; ')"
}
Write-Host "RUNNER_SHA256=$runnerSha"
Write-Host "RUNNER_PARSE=PASS"

if (Test-Path -LiteralPath $target) {
  Remove-Item -LiteralPath $target -Recurse -Force
}
Invoke-GitChecked -Arguments @(
  "clone", "--branch", "main", "--single-branch",
  "https://github.com/$env:GITHUB_REPOSITORY.git", $target
)
Invoke-GitChecked -Arguments @("-C", $target, "fetch", "origin", "main", "--tags")
$head = (& git -C $target rev-parse HEAD).Trim()
$originMain = (& git -C $target rev-parse origin/main).Trim()
$tagCommit = (& git -C $target rev-parse "${expectedTag}^{commit}").Trim()
$branch = (& git -C $target branch --show-current).Trim()
if ($branch -ne "main") { throw "TARGET_BRANCH_MISMATCH=$branch" }
if ($head -ne $expectedBase) { throw "TARGET_HEAD_MISMATCH=$head" }
if ($originMain -ne $expectedBase) { throw "TARGET_ORIGIN_MAIN_MISMATCH=$originMain" }
if ($tagCommit -ne $expectedBase) { throw "TARGET_TAG_MISMATCH=$tagCommit" }
if (& git -C $target status --porcelain=v1 --untracked-files=all) {
  throw "TARGET_NOT_CLEAN"
}

Push-Location $target
try {
  & pnpm.cmd install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw "PNPM_INSTALL_FAILED" }
}
finally { Pop-Location }
if (& git -C $target status --porcelain=v1 --untracked-files=all) {
  throw "TARGET_DIRTY_AFTER_INSTALL"
}
Write-Host "BASELINE=PASS"
Write-Host "TARGET=$target"

$stdout = Join-Path $env:RUNNER_TEMP "batch-a1-runner.stdout.txt"
$stderr = Join-Path $env:RUNNER_TEMP "batch-a1-runner.stderr.txt"
$process = Start-Process -FilePath "powershell.exe" `
  -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $runnerPath,
    "-Mode", "Apply",
    "-RepoPath", $target
  ) `
  -Wait `
  -PassThru `
  -NoNewWindow `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr

$out = if (Test-Path -LiteralPath $stdout) { [System.IO.File]::ReadAllText($stdout) } else { "" }
$err = if (Test-Path -LiteralPath $stderr) { [System.IO.File]::ReadAllText($stderr) } else { "" }
[System.Console]::Out.Write($out)
[System.Console]::Error.Write($err)
$combined = $out + "`n" + $err
if ($process.ExitCode -ne 0) {
  throw "EXACT_RUNNER_EXIT_CODE=$($process.ExitCode)"
}
foreach ($marker in @(
  "RUNNER_PARSE=PASS",
  "NATIVE_STREAM_SEPARATION=PASS",
  "AFTER_STATE_BLOBS=PASS",
  "ROLLBACK_REHEARSAL=PASS",
  "USER_WORKTREE_UNTOUCHED=PASS",
  "ISOLATED_PREFLIGHT=PASS",
  "VERIFICATION=PASS",
  "APPLY=PASS",
  "EXTRACTED_RUNNER_REPARSE=PASS"
)) {
  if (-not $combined.Contains($marker)) {
    throw "RUNNER_MARKER_MISSING=$marker"
  }
}
foreach ($unexpected in @("APPLY_ROLLBACK=PASS", "APPLY_FAILED_ROLLED_BACK")) {
  if ($combined.Contains($unexpected)) {
    throw "UNEXPECTED_APPLY_ROLLBACK=$unexpected"
  }
}
Write-Host "EXACT_RUNNER_E2E=PASS"

$expectedFiles = @(
  "config/halleus-check-impact.json",
  "lib/report-generation/report-generation-service.ts",
  "lib/reports/report-access-contract.ts",
  "scripts/check-report-ownership-sharing.mjs",
  "types/report-generation.ts"
) | Sort-Object
$actualFiles = @(& git -C $target diff --name-only --relative) |
  Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
  ForEach-Object { $_.Replace("\", "/") } |
  Sort-Object -Unique
if (($actualFiles -join "`n") -ne ($expectedFiles -join "`n")) {
  throw "FINAL_FILE_BOUNDARY_MISMATCH=$($actualFiles -join ',')"
}
$expectedBlobs = @{
  "config/halleus-check-impact.json" = "1eb0756fc8e950ec5f461f99e37cb74e8aba24b0"
  "lib/report-generation/report-generation-service.ts" = "3c7dac99c086d149dba45dfca919bf46045305df"
  "lib/reports/report-access-contract.ts" = "7b0aefab59b0fd2d93cadd74053ce3787c33a678"
  "scripts/check-report-ownership-sharing.mjs" = "070d3f6bb71947bfd100b04704166699e83e1f84"
  "types/report-generation.ts" = "a898d18039e34812ecf4ce4b73a51091f262b3c4"
}
foreach ($path in $expectedFiles) {
  $blob = (& git -C $target hash-object -- $path).Trim()
  if ($blob -ne $expectedBlobs[$path]) {
    throw "FINAL_BLOB_MISMATCH=$path expected=$($expectedBlobs[$path]) actual=$blob"
  }
}
& git -C $target --no-pager diff --check
if ($LASTEXITCODE -ne 0) { throw "FINAL_DIFF_CHECK_FAILED" }
& git -C $target status --short --untracked-files=all
& git -C $target --no-pager diff --stat

if (Test-Path -LiteralPath $artifactDir) {
  Remove-Item -LiteralPath $artifactDir -Recurse -Force
}
New-Item -ItemType Directory -Path $artifactDir -Force | Out-Null
Copy-Item -LiteralPath $runnerPath -Destination (Join-Path $artifactDir (Split-Path $runnerPath -Leaf))
Write-Host "EXACT_APPLY_AFTER_STATE=PASS"
Write-Host "USER_REPOSITORY_NOT_USED=PASS"
Write-Host "HARNESS_COMPLETE=PASS"
