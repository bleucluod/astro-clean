Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Baseline = "b7d016ef817f9434ee8289dbd7cdd17a3beb9c9e"
$ExpectedRunnerBlob = "ab5223f917d337aaa35dc01dc94223de03052876"
$RunnerName = "Apply-Halleus-Report-Publication-Mutation-A2b-20260801.ps1"
$RunnerSource = Join-Path $env:GITHUB_WORKSPACE $RunnerName
$TempRoot = Join-Path $env:RUNNER_TEMP ("halleus-a2b-" + [guid]::NewGuid().ToString("N"))
$TargetRepo = Join-Path $TempRoot "target"
$Evidence = Join-Path $env:GITHUB_WORKSPACE "a2b-evidence"
$ExpectedChangedFiles = @(
    "app/api/reports/account/route.ts"
    "config/halleus-check-impact.json"
    "lib/admin/admin-service.ts"
    "lib/reports/report-access-contract.ts"
    "lib/reports/report-access-service.ts"
    "package.json"
    "scripts/check-report-publication-mutation.mjs"
)

function Run {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory = $env:GITHUB_WORKSPACE
    )

    $old = Get-Location
    try {
        Set-Location -LiteralPath $WorkingDirectory
        & $FilePath @Arguments
        $code = $LASTEXITCODE
    }
    finally {
        Set-Location -LiteralPath $old
    }

    if ($code -ne 0) {
        throw "COMMAND_FAILED=$FilePath EXIT_CODE=$code"
    }
}

if (-not (Test-Path -LiteralPath $RunnerSource)) {
    throw "RUNNER_MISSING=$RunnerSource"
}

$actualRunnerBlob = (
    & git.exe rev-parse "HEAD:$RunnerName"
).Trim()

if ($LASTEXITCODE -ne 0 -or $actualRunnerBlob -ne $ExpectedRunnerBlob) {
    throw "RUNNER_BLOB_MISMATCH=$actualRunnerBlob"
}

$actualRunnerSha = (
    Get-FileHash -LiteralPath $RunnerSource -Algorithm SHA256
).Hash.ToLowerInvariant()

$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
    $RunnerSource,
    [ref]$tokens,
    [ref]$parseErrors
) | Out-Null

if ($parseErrors.Count -gt 0) {
    $parseErrors | ForEach-Object { Write-Host $_ }
    throw "RUNNER_PARSE_FAILED"
}

Write-Host "RUNNER_BLOB=$actualRunnerBlob"
Write-Host "RUNNER_SHA256=$actualRunnerSha"
Write-Host "RUNNER_PARSE=PASS"

New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null

Run `
    -FilePath "git.exe" `
    -Arguments @(
        "clone",
        "--no-local",
        $env:GITHUB_WORKSPACE,
        $TargetRepo
    )

Run `
    -FilePath "git.exe" `
    -Arguments @(
        "checkout",
        "-B",
        "main",
        $Baseline
    ) `
    -WorkingDirectory $TargetRepo

Run `
    -FilePath "git.exe" `
    -Arguments @(
        "update-ref",
        "refs/remotes/origin/main",
        $Baseline
    ) `
    -WorkingDirectory $TargetRepo

Run `
    -FilePath "git.exe" `
    -Arguments @(
        "reset",
        "--hard",
        $Baseline
    ) `
    -WorkingDirectory $TargetRepo

Run `
    -FilePath "git.exe" `
    -Arguments @(
        "clean",
        "-fdx"
    ) `
    -WorkingDirectory $TargetRepo

Run `
    -FilePath "pnpm.cmd" `
    -Arguments @(
        "install",
        "--frozen-lockfile"
    ) `
    -WorkingDirectory $TargetRepo

Write-Host "=== ROLLBACK REHEARSAL ==="
& powershell.exe `
    -NoProfile `
    -ExecutionPolicy Bypass `
    -File $RunnerSource `
    -Mode RollbackRehearsal `
    -RepoPath $TargetRepo

if ($LASTEXITCODE -ne 0) {
    throw "ROLLBACK_REHEARSAL_FAILED=$LASTEXITCODE"
}

$statusAfterRollback = (
    & git.exe -C $TargetRepo status --porcelain=v1 --untracked-files=all
) -join "`n"

if ($LASTEXITCODE -ne 0 -or $statusAfterRollback) {
    Write-Host $statusAfterRollback
    throw "ROLLBACK_REHEARSAL_DIRTY"
}

Write-Host "ROLLBACK_REHEARSAL_TARGET=CLEAN"

Write-Host "=== EXACT APPLY ==="
& powershell.exe `
    -NoProfile `
    -ExecutionPolicy Bypass `
    -File $RunnerSource `
    -Mode Apply `
    -RepoPath $TargetRepo

if ($LASTEXITCODE -ne 0) {
    throw "RUNNER_APPLY_FAILED=$LASTEXITCODE"
}

$tracked = @(
    & git.exe -C $TargetRepo diff --name-only
)
$untracked = @(
    & git.exe -C $TargetRepo ls-files --others --exclude-standard
)
$actualChanged = @($tracked + $untracked | Sort-Object -Unique)
$difference = @(
    Compare-Object `
        -ReferenceObject @($ExpectedChangedFiles | Sort-Object) `
        -DifferenceObject $actualChanged
)

if ($difference.Count -gt 0) {
    Write-Host "EXPECTED_CHANGED"
    $ExpectedChangedFiles
    Write-Host "ACTUAL_CHANGED"
    $actualChanged
    throw "AFTER_STATE_FILE_BOUNDARY_MISMATCH"
}

Run `
    -FilePath "git.exe" `
    -Arguments @(
        "--no-pager",
        "diff",
        "--check"
    ) `
    -WorkingDirectory $TargetRepo

Remove-Item -LiteralPath $Evidence -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $Evidence -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Evidence "after-state") -Force | Out-Null
Copy-Item -LiteralPath $RunnerSource -Destination (Join-Path $Evidence $RunnerName)

$manifest = New-Object System.Collections.Generic.List[string]
$manifest.Add("BASELINE=$Baseline")
$manifest.Add("RUNNER_SHA256=$actualRunnerSha")
$manifest.Add("CHANGED_FILE_COUNT=$($ExpectedChangedFiles.Count)")

foreach ($relativePath in $ExpectedChangedFiles) {
    $source = Join-Path $TargetRepo $relativePath
    $destination = Join-Path (Join-Path $Evidence "after-state") $relativePath
    $destinationParent = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
    [IO.File]::WriteAllBytes(
        $destination,
        [IO.File]::ReadAllBytes($source)
    )
    $blob = (& git.exe -C $TargetRepo hash-object -- $relativePath).Trim()
    $manifest.Add("AFTER_BLOB $relativePath $blob")
}

[IO.File]::WriteAllLines(
    (Join-Path $Evidence "manifest.txt"),
    $manifest,
    (New-Object System.Text.UTF8Encoding($false))
)

& git.exe -C $TargetRepo --no-pager diff > (Join-Path $Evidence "after-state.diff")
if ($LASTEXITCODE -ne 0) {
    throw "EVIDENCE_DIFF_FAILED"
}

$PostgresScriptSource = Join-Path $env:GITHUB_WORKSPACE ".github/halleus-preflight/a2b-postgres.sh"
Copy-Item -LiteralPath $PostgresScriptSource -Destination (Join-Path $Evidence "a2b-postgres.sh")

Write-Host "WINDOWS_EXACT_PREFLIGHT=PASS"
