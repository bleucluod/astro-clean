Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Baseline = "4901e6a25cf6f7d818efd094d5e3dbfeb3ed62d1"
$Candidate4Sha = "38db15ea76ff14c301d27a99c6a86f7201b0304e30ac3374e7a45944769b0c5c"
$Candidate5Sha = "382c845e8d857e7335d2117892d0b01fdb5838dd8af68e651247d68beeef02a6"
$Runner = Join-Path $env:RUNNER_TEMP "Apply-Halleus-Report-Publication-Persistence-A2a-20260801.ps1"
$PatchScript = Join-Path $env:RUNNER_TEMP "patch-a2a-candidate5.js"
$Target = Join-Path $env:RUNNER_TEMP "halleus-a2a-target"
$Evidence = Join-Path $env:RUNNER_TEMP "halleus-a2a-evidence"
$Utf8 = New-Object System.Text.UTF8Encoding($false)

function Invoke-NativeChecked {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$FailureMarker
    )

    & $FilePath @Arguments
    $ExitCode = $LASTEXITCODE
    if ($ExitCode -ne 0) {
        throw "$FailureMarker=$ExitCode"
    }
}

Write-Host "=== RECONSTRUCT LOCKED CANDIDATE4 ==="
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

$ActualCandidate4Sha = (Get-FileHash -LiteralPath $Runner -Algorithm SHA256).Hash.ToLowerInvariant()
if ($ActualCandidate4Sha -ne $Candidate4Sha) {
    throw "CANDIDATE4_SHA_MISMATCH=$ActualCandidate4Sha"
}
Write-Host "CANDIDATE4_SHA256=$ActualCandidate4Sha"

Write-Host "=== DERIVE BYTE-LOCKED CANDIDATE5 ==="
$PatchSource = @'
const fs = require("node:fs");
const runnerPath = process.argv[2];
if (!runnerPath) throw new Error("runner path is required");
let content = fs.readFileSync(runnerPath, "utf8");
const matches = [...content.matchAll(/FromBase64String\("([A-Za-z0-9+/=]+)"\)/g)];
if (!matches.length) throw new Error("no embedded base64 payloads found");
const longest = matches.reduce((best, item) => item[1].length > best[1].length ? item : best);
const transform = Buffer.from(longest[1], "base64").toString("utf8");
const startMarker = "const replacements = ";
const endMarker = ";\n\nfunction toAbsolute";
const start = transform.indexOf(startMarker);
if (start < 0) throw new Error("replacements start marker not found");
const jsonStart = start + startMarker.length;
const jsonEnd = transform.indexOf(endMarker, jsonStart);
if (jsonEnd < 0) throw new Error("replacements end marker not found");
const replacements = JSON.parse(transform.slice(jsonStart, jsonEnd));
const configPairs = replacements["config/halleus-check-impact.json"];
if (!Array.isArray(configPairs) || configPairs.length !== 1) {
  throw new Error("config replacement pair boundary mismatch");
}
const indent = (value) => value
  .split("\n")
  .map((line) => line ? `    ${line}` : line)
  .join("\n");
configPairs[0][0] = indent(configPairs[0][0]);
configPairs[0][1] = indent(configPairs[0][1]);
const patchedTransform =
  transform.slice(0, jsonStart) +
  JSON.stringify(replacements) +
  transform.slice(jsonEnd);
const patchedPayload = Buffer.from(patchedTransform, "utf8").toString("base64");
content =
  content.slice(0, longest.index) +
  longest[0].replace(longest[1], patchedPayload) +
  content.slice(longest.index + longest[0].length);
const oldOrder = "    Invoke-Native -FilePath \"node.exe\" -Arguments @($TransformScript, $RepoPath)\n    $CreatedTargets = @($NewTargets)\n    $Applied = $true";
const newOrder = "    $CreatedTargets = @($NewTargets)\n    $Applied = $true\n    Invoke-Native -FilePath \"node.exe\" -Arguments @($TransformScript, $RepoPath)";
if (content.split(oldOrder).length !== 2) {
  throw new Error("rollback ordering anchor count mismatch");
}
content = content.replace(oldOrder, newOrder);
fs.writeFileSync(runnerPath, content, "utf8");
'@
[IO.File]::WriteAllText($PatchScript, $PatchSource, $Utf8)
Invoke-NativeChecked -FilePath "node.exe" -Arguments @($PatchScript, $Runner) -FailureMarker "CANDIDATE5_DERIVATION_FAILED"

$ActualCandidate5Sha = (Get-FileHash -LiteralPath $Runner -Algorithm SHA256).Hash.ToLowerInvariant()
if ($ActualCandidate5Sha -ne $Candidate5Sha) {
    throw "CANDIDATE5_SHA_MISMATCH=$ActualCandidate5Sha"
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
    throw "CANDIDATE5_PARSE_FAILED"
}
Write-Host "CANDIDATE5_SHA256=$ActualCandidate5Sha"
Write-Host "CANDIDATE5_PARSE=PASS"

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
$RehearsalExitCode = $LASTEXITCODE
if ($RehearsalExitCode -ne 0) {
    Write-Host "REHEARSAL_STATUS_AFTER_FAILURE"
    & git -C $Target status --short
    Write-Host "REHEARSAL_DIFF_AFTER_FAILURE"
    & git -C $Target --no-pager diff
    throw "RUNNER_REHEARSAL_FAILED=$RehearsalExitCode"
}

$AfterRehearsal = @(& git -C $Target status --porcelain)
$RehearsalStatusExitCode = $LASTEXITCODE
if ($RehearsalStatusExitCode -ne 0) {
    throw "REHEARSAL_STATUS_READ_FAILED=$RehearsalStatusExitCode"
}
if ($AfterRehearsal.Count -gt 0) {
    $AfterRehearsal | ForEach-Object { Write-Host $_ }
    throw "REHEARSAL_DID_NOT_ROLL_BACK"
}
Write-Host "ROLLBACK_REHEARSAL=PASS"

Write-Host "=== EXACT APPLY ==="
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Runner -Mode Apply -RepoPath $Target
$ApplyExitCode = $LASTEXITCODE
if ($ApplyExitCode -ne 0) {
    Write-Host "APPLY_STATUS_AFTER_FAILURE"
    & git -C $Target status --short
    Write-Host "APPLY_DIFF_AFTER_FAILURE"
    & git -C $Target --no-pager diff
    throw "RUNNER_APPLY_FAILED=$ApplyExitCode"
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
$FinalStatusExitCode = $LASTEXITCODE
if ($FinalStatusExitCode -ne 0) {
    throw "FINAL_STATUS_READ_FAILED=$FinalStatusExitCode"
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
    "RUNNER_SHA256=$ActualCandidate5Sha"
)
foreach ($Relative in $ExpectedSorted) {
    $Blob = (& git -C $Target hash-object -- $Relative).Trim()
    $BlobExitCode = $LASTEXITCODE
    if ($BlobExitCode -ne 0 -or -not $Blob) {
        throw "AFTER_BLOB_READ_FAILED=$Relative"
    }
    $Manifest += "AFTER_BLOB $Relative $Blob"
}
$Manifest += "STATUS"
$Manifest += @(& git -C $Target status --short)
$ShortStatusExitCode = $LASTEXITCODE
if ($ShortStatusExitCode -ne 0) {
    throw "FINAL_SHORT_STATUS_READ_FAILED=$ShortStatusExitCode"
}

& git -C $Target diff --check
$DiffCheckExitCode = $LASTEXITCODE
if ($DiffCheckExitCode -ne 0) {
    throw "FINAL_DIFF_CHECK_FAILED=$DiffCheckExitCode"
}
$Manifest += "DIFF_CHECK=PASS"
$Manifest += "WINDOWS_CANDIDATE_PREFLIGHT=PASS"
[IO.File]::WriteAllLines((Join-Path $Evidence "manifest.txt"), $Manifest, $Utf8)
Write-Host ($Manifest -join "`n")
