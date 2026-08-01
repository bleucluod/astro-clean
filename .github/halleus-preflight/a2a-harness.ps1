Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Baseline = "4901e6a25cf6f7d818efd094d5e3dbfeb3ed62d1"
$SourceRunnerSha = "71f2f295e39286388ae324795480c4652d9a6b3e17411cf80df67dcfe576e741"
$CandidateRunnerSha = "c1f76dc626a401f65817a4b7fdfeea995f1acc99b0d4df3a918100608912acf2"
$Runner = Join-Path $env:RUNNER_TEMP "Apply-Halleus-Report-Publication-Persistence-A2a-20260801.ps1"
$Target = Join-Path $env:RUNNER_TEMP "halleus-a2a-target"
$Evidence = Join-Path $env:RUNNER_TEMP "halleus-a2a-evidence"
$Utf8 = New-Object System.Text.UTF8Encoding($false)

function Replace-ExactlyOnce {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][string]$Old,
        [Parameter(Mandatory = $true)][string]$New,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $first = $Text.IndexOf($Old, [StringComparison]::Ordinal)
    if ($first -lt 0) { throw "ANCHOR_NOT_FOUND=$Name" }
    $second = $Text.IndexOf($Old, $first + $Old.Length, [StringComparison]::Ordinal)
    if ($second -ge 0) { throw "ANCHOR_NOT_UNIQUE=$Name" }
    return $Text.Substring(0, $first) + $New + $Text.Substring($first + $Old.Length)
}

Write-Host "=== RECONSTRUCT CANDIDATE RUNNER ==="
$Encoded = (1..4 | ForEach-Object {
    Get-Content -LiteralPath ".github/halleus-preflight/a2a-runner.part$_" -Raw
}) -join ""
$Bytes = [Convert]::FromBase64String($Encoded)
$InputStream = New-Object IO.MemoryStream(,$Bytes)
$Gzip = New-Object IO.Compression.GZipStream($InputStream, [IO.Compression.CompressionMode]::Decompress)
$OutputStream = [IO.File]::Create($Runner)
try {
    $Gzip.CopyTo($OutputStream)
}
finally {
    $OutputStream.Dispose()
    $Gzip.Dispose()
    $InputStream.Dispose()
}

$ActualSourceSha = (Get-FileHash -LiteralPath $Runner -Algorithm SHA256).Hash.ToLowerInvariant()
if ($ActualSourceSha -ne $SourceRunnerSha) {
    throw "SOURCE_RUNNER_SHA_MISMATCH=$ActualSourceSha"
}

$Content = [IO.File]::ReadAllText($Runner, $Utf8)
$Content = Replace-ExactlyOnce -Text $Content `
    -Old "    `"config/halleus-check-impact.json`",`n)" `
    -New "    `"config/halleus-check-impact.json`"`n)" `
    -Name "targets-trailing-comma"

$CaptureOld = $Utf8.GetString([Convert]::FromBase64String("ICAgICRzdGRvdXQgPSBpZiAoVGVzdC1QYXRoIC1MaXRlcmFsUGF0aCAkc3Rkb3V0UGF0aCkgewogICAgICAgIChHZXQtQ29udGVudCAtTGl0ZXJhbFBhdGggJHN0ZG91dFBhdGggLVJhdykuVHJpbSgpCiAgICB9IGVsc2UgewogICAgICAgICIiCiAgICB9CiAgICAkc3RkZXJyID0gaWYgKFRlc3QtUGF0aCAtTGl0ZXJhbFBhdGggJHN0ZGVyclBhdGgpIHsKICAgICAgICAoR2V0LUNvbnRlbnQgLUxpdGVyYWxQYXRoICRzdGRlcnJQYXRoIC1SYXcpLlRyaW0oKQogICAgfSBlbHNlIHsKICAgICAgICAiIgogICAgfQ=="))
$CaptureNew = $Utf8.GetString([Convert]::FromBase64String("ICAgICRzdGRvdXQgPSBpZiAoVGVzdC1QYXRoIC1MaXRlcmFsUGF0aCAkc3Rkb3V0UGF0aCkgewogICAgICAgIFtJTy5GaWxlXTo6UmVhZEFsbFRleHQoJHN0ZG91dFBhdGgpLlRyaW0oKQogICAgfSBlbHNlIHsKICAgICAgICAiIgogICAgfQogICAgJHN0ZGVyciA9IGlmIChUZXN0LVBhdGggLUxpdGVyYWxQYXRoICRzdGRlcnJQYXRoKSB7CiAgICAgICAgW0lPLkZpbGVdOjpSZWFkQWxsVGV4dCgkc3RkZXJyUGF0aCkuVHJpbSgpCiAgICB9IGVsc2UgewogICAgICAgICIiCiAgICB9"))
$Content = Replace-ExactlyOnce -Text $Content -Old $CaptureOld -New $CaptureNew -Name "native-capture-empty-stream"

$ArrayReplacements = @(
    @(
        '    $indexChanges = Get-GitLines @("diff", "--cached", "--name-only")',
        '    $indexChanges = @(Get-GitLines @("diff", "--cached", "--name-only"))'
    ),
    @(
        '    $trackedChanges = Get-GitLines @("diff", "--name-only")',
        '    $trackedChanges = @(Get-GitLines @("diff", "--name-only"))'
    ),
    @(
        '    $untracked = Get-GitLines @("ls-files", "--others", "--exclude-standard")',
        '    $untracked = @(Get-GitLines @("ls-files", "--others", "--exclude-standard"))'
    ),
    @(
        '    $changedFiles = Get-GitLines @("diff", "--name-only")',
        '    $changedFiles = @(Get-GitLines @("diff", "--name-only"))'
    ),
    @(
        '        $finalStatus = Get-GitLines @("status", "--short")',
        '        $finalStatus = @(Get-GitLines @("status", "--short"))'
    )
)

$ReplacementIndex = 0
foreach ($Pair in $ArrayReplacements) {
    $ReplacementIndex += 1
    $Content = Replace-ExactlyOnce -Text $Content -Old $Pair[0] -New $Pair[1] -Name "array-capture-$ReplacementIndex"
}

[IO.File]::WriteAllText($Runner, $Content, $Utf8)
$ActualCandidateSha = (Get-FileHash -LiteralPath $Runner -Algorithm SHA256).Hash.ToLowerInvariant()
if ($ActualCandidateSha -ne $CandidateRunnerSha) {
    throw "CANDIDATE_RUNNER_SHA_MISMATCH=$ActualCandidateSha"
}

$Tokens = $null
$ParseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile($Runner, [ref]$Tokens, [ref]$ParseErrors) | Out-Null
if ($ParseErrors.Count -gt 0) {
    $ParseErrors | ForEach-Object { Write-Host $_.Message }
    throw "CANDIDATE_RUNNER_PARSE_FAILED"
}
Write-Host "SOURCE_RUNNER_SHA256=$ActualSourceSha"
Write-Host "CANDIDATE_RUNNER_SHA256=$ActualCandidateSha"
Write-Host "CANDIDATE_RUNNER_PARSE=PASS"

Write-Host "=== PREPARE EXACT BASELINE WORKTREE ==="
Remove-Item -LiteralPath $Target, $Evidence -Recurse -Force -ErrorAction SilentlyContinue
git fetch origin main --tags
if ($LASTEXITCODE -ne 0) { throw "FETCH_BASELINE_FAILED" }
git show-ref --verify --quiet refs/heads/main
if ($LASTEXITCODE -eq 0) {
    git branch -D main
    if ($LASTEXITCODE -ne 0) { throw "DELETE_LOCAL_MAIN_FAILED" }
}
git branch main $Baseline
if ($LASTEXITCODE -ne 0) { throw "CREATE_BASELINE_BRANCH_FAILED" }
git worktree add $Target main
if ($LASTEXITCODE -ne 0) { throw "CREATE_TARGET_WORKTREE_FAILED" }

Push-Location $Target
try {
    pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "PNPM_INSTALL_FAILED" }
}
finally {
    Pop-Location
}

Write-Host "=== ROLLBACK REHEARSAL ==="
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Runner -Mode Rehearse -RepoPath $Target
if ($LASTEXITCODE -ne 0) {
    Write-Host "REHEARSAL_STATUS_AFTER_FAILURE"
    git -C $Target status --short
    Write-Host "REHEARSAL_DIFF_AFTER_FAILURE"
    git -C $Target --no-pager diff
    throw "RUNNER_REHEARSAL_FAILED"
}
$AfterRehearsal = @(git -C $Target status --porcelain)
if ($AfterRehearsal.Count -gt 0) {
    $AfterRehearsal | ForEach-Object { Write-Host $_ }
    throw "REHEARSAL_DID_NOT_ROLL_BACK"
}
Write-Host "ROLLBACK_REHEARSAL=PASS"

Write-Host "=== EXACT APPLY ==="
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Runner -Mode Apply -RepoPath $Target
if ($LASTEXITCODE -ne 0) {
    Write-Host "APPLY_STATUS_AFTER_FAILURE"
    git -C $Target status --short
    Write-Host "APPLY_DIFF_AFTER_FAILURE"
    git -C $Target --no-pager diff
    throw "RUNNER_APPLY_FAILED"
}

$Expected = @(
    "app/api/reports/account/route.ts",
    "app/api/reports/beta/route.ts",
    "config/halleus-check-impact.json",
    "database/migrations/0009_report_publication_persistence.sql",
    "lib/database/postgres-report-database-driver.ts",
    "lib/database/report-row-mapper.ts",
    "lib/reports/report-access-service.ts",
    "lib/storage/account-report-save-client.ts",
    "lib/storage/database-report-repository.ts",
    "lib/storage/report-records.ts",
    "lib/storage/server-report-persistence.ts",
    "package.json",
    "scripts/check-report-publication-persistence.mjs",
    "types/storage.ts"
)
$Actual = @(git -C $Target status --porcelain | ForEach-Object { $_.Substring(3).Replace("\", "/") } | Sort-Object)
$ExpectedSorted = @($Expected | Sort-Object)
if (($Actual -join "`n") -ne ($ExpectedSorted -join "`n")) {
    throw "CHANGED_FILE_BOUNDARY_MISMATCH actual=$($Actual -join ',')"
}

New-Item -ItemType Directory -Path $Evidence -Force | Out-Null
Copy-Item -LiteralPath $Runner -Destination (Join-Path $Evidence (Split-Path $Runner -Leaf))
foreach ($Relative in $Expected) {
    $Source = Join-Path $Target ($Relative -replace "/", [IO.Path]::DirectorySeparatorChar)
    $Destination = Join-Path $Evidence ($Relative -replace "/", [IO.Path]::DirectorySeparatorChar)
    New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

$Manifest = @(
    "BASELINE=$Baseline",
    "RUNNER_SHA256=$ActualCandidateSha"
)
foreach ($Relative in $ExpectedSorted) {
    $Blob = (git -C $Target hash-object -- $Relative).Trim()
    $Manifest += "AFTER_BLOB $Relative $Blob"
}
$Manifest += "STATUS"
$Manifest += @(git -C $Target status --short)
git -C $Target diff --check
if ($LASTEXITCODE -ne 0) { throw "FINAL_DIFF_CHECK_FAILED" }
$Manifest += "DIFF_CHECK=PASS"
$Manifest += "WINDOWS_CANDIDATE_PREFLIGHT=PASS"
Set-Content -LiteralPath (Join-Path $Evidence "manifest.txt") -Value $Manifest -Encoding UTF8
Write-Host ($Manifest -join "`n")
