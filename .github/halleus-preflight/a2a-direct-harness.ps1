Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Baseline = "4901e6a25cf6f7d818efd094d5e3dbfeb3ed62d1"
$CandidateRunnerSha = "38db15ea76ff14c301d27a99c6a86f7201b0304e30ac3374e7a45944769b0c5c"
$Runner = Join-Path $env:RUNNER_TEMP "Apply-Halleus-Report-Publication-Persistence-A2a-20260801.ps1"
$Target = Join-Path $env:RUNNER_TEMP "halleus-a2a-target"
$Evidence = Join-Path $env:RUNNER_TEMP "halleus-a2a-evidence"

function Invoke-NativeChecked {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$FailureMarker
    )

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$FailureMarker=$LASTEXITCODE"
    }
}

Write-Host "=== RECONSTRUCT EXACT CANDIDATE ==="
$Encoded = (1..4 | ForEach-Object {
    $PartPath = ".github/halleus-preflight/a2a-candidate4.part$_.txt"
    if (-not (Test-Path -LiteralPath $PartPath -PathType Leaf)) {
        throw "CANDIDATE_PART_NOT_FOUND=$PartPath"
    }
    [IO.File]::ReadAllText($PartPath).Trim()
}) -join ""

$CompressedBytes = [Convert]::FromBase64String($Encoded)
$InputStream = New-Object IO.MemoryStream(,$CompressedBytes)
$Gzip = New-Object IO.Compression.GZipStream(
    $InputStream,
    [IO.Compression.CompressionMode]::Decompress
)
$OutputStream = [IO.File]::Create($Runner)
try {
    $Gzip.CopyTo($OutputStream)
}
finally {
    $OutputStream.Dispose()
    $Gzip.Dispose()
    $InputStream.Dispose()
}

$ActualRunnerSha = (Get-FileHash -LiteralPath $Runner -Algorithm SHA256).Hash.ToLowerInvariant()
if ($ActualRunnerSha -ne $CandidateRunnerSha) {
    throw "CANDIDATE_RUNNER_SHA_MISMATCH=$ActualRunnerSha"
}

$Tokens = $null
$ParseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
    $Runner,
    [ref]$Tokens,
    [ref]$ParseErrors
) | Out-Null
if (@($ParseErrors).Count -gt 0) {
    @($ParseErrors) | ForEach-Object { Write-Host $_.Message }
    throw "CANDIDATE_RUNNER_PARSE_FAILED"
}
Write-Host "CANDIDATE_RUNNER_SHA256=$ActualRunnerSha"
Write-Host "CANDIDATE_RUNNER_PARSE=PASS"

Write-Host "=== PREPARE FRESH BASELINE WORKTREE ==="
Remove-Item -LiteralPath $Target, $Evidence -Recurse -Force -ErrorAction SilentlyContinue
Invoke-NativeChecked -FilePath "git" -Arguments @("fetch", "origin", "main", "--tags") -FailureMarker "FETCH_BASELINE_FAILED"

& git show-ref --verify --quiet refs/heads/main
$MainRefStatus = $LASTEXITCODE
if ($MainRefStatus -eq 0) {
    Invoke-NativeChecked -FilePath "git" -Arguments @("branch", "-D", "main") -FailureMarker "DELETE_LOCAL_MAIN_FAILED"
}
elseif ($MainRefStatus -ne 1) {
    throw "CHECK_LOCAL_MAIN_FAILED=$MainRefStatus"
}

Invoke-NativeChecked -FilePath "git" -Arguments @("branch", "main", $Baseline) -FailureMarker "CREATE_BASELINE_BRANCH_FAILED"
Invoke-NativeChecked -FilePath "git" -Arguments @("worktree", "add", $Target, "main") -FailureMarker "CREATE_TARGET_WORKTREE_FAILED"

Push-Location $Target
try {
    Invoke-NativeChecked -FilePath "pnpm" -Arguments @("install", "--frozen-lockfile") -FailureMarker "PNPM_INSTALL_FAILED"
}
finally {
    Pop-Location
}

Write-Host "=== ROLLBACK REHEARSAL ==="
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Runner -Mode Rehearse -RepoPath $Target
if ($LASTEXITCODE -ne 0) {
    Write-Host "REHEARSAL_STATUS_AFTER_FAILURE"
    & git -C $Target status --short
    Write-Host "REHEARSAL_DIFF_AFTER_FAILURE"
    & git -C $Target --no-pager diff
    throw "RUNNER_REHEARSAL_FAILED=$LASTEXITCODE"
}

$AfterRehearsal = @(& git -C $Target status --porcelain)
if ($LASTEXITCODE -ne 0) {
    throw "REHEARSAL_STATUS_READ_FAILED=$LASTEXITCODE"
}
if ($AfterRehearsal.Count -gt 0) {
    $AfterRehearsal | ForEach-Object { Write-Host $_ }
    throw "REHEARSAL_DID_NOT_ROLL_BACK"
}
Write-Host "ROLLBACK_REHEARSAL=PASS"

Write-Host "=== EXACT APPLY ==="
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Runner -Mode Apply -RepoPath $Target
if ($LASTEXITCODE -ne 0) {
    Write-Host "APPLY_STATUS_AFTER_FAILURE"
    & git -C $Target status --short
    Write-Host "APPLY_DIFF_AFTER_FAILURE"
    & git -C $Target --no-pager diff
    throw "RUNNER_APPLY_FAILED=$LASTEXITCODE"
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

$Actual = @(& git -C $Target status --porcelain | ForEach-Object {
    $_.Substring(3).Replace("\", "/")
} | Sort-Object)
if ($LASTEXITCODE -ne 0) {
    throw "FINAL_STATUS_READ_FAILED=$LASTEXITCODE"
}
$ExpectedSorted = @($Expected | Sort-Object)
if (($Actual -join "`n") -ne ($ExpectedSorted -join "`n")) {
    throw "CHANGED_FILE_BOUNDARY_MISMATCH actual=$($Actual -join ',')"
}
Write-Host "CHANGED_FILE_BOUNDARY=PASS"

New-Item -ItemType Directory -Path $Evidence -Force | Out-Null
Copy-Item -LiteralPath $Runner -Destination (Join-Path $Evidence (Split-Path $Runner -Leaf)) -Force
foreach ($Relative in $Expected) {
    $Source = Join-Path $Target ($Relative -replace "/", [IO.Path]::DirectorySeparatorChar)
    $Destination = Join-Path $Evidence ($Relative -replace "/", [IO.Path]::DirectorySeparatorChar)
    New-Item -ItemType Directory -Path (Split-Path -Parent $Destination) -Force | Out-Null
    Copy-Item -LiteralPath $Source -Destination $Destination -Force
}

$Manifest = @(
    "BASELINE=$Baseline",
    "RUNNER_SHA256=$ActualRunnerSha"
)
foreach ($Relative in $ExpectedSorted) {
    $Blob = (& git -C $Target hash-object -- $Relative).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $Blob) {
        throw "AFTER_BLOB_READ_FAILED=$Relative"
    }
    $Manifest += "AFTER_BLOB $Relative $Blob"
}
$Manifest += "STATUS"
$Manifest += @(& git -C $Target status --short)
if ($LASTEXITCODE -ne 0) {
    throw "FINAL_SHORT_STATUS_READ_FAILED=$LASTEXITCODE"
}

& git -C $Target diff --check
if ($LASTEXITCODE -ne 0) {
    throw "FINAL_DIFF_CHECK_FAILED=$LASTEXITCODE"
}
$Manifest += "DIFF_CHECK=PASS"
$Manifest += "WINDOWS_CANDIDATE_PREFLIGHT=PASS"
[IO.File]::WriteAllLines((Join-Path $Evidence "manifest.txt"), $Manifest, (New-Object System.Text.UTF8Encoding($false)))
Write-Host ($Manifest -join "`n")
