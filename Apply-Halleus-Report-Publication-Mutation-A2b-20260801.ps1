param(
    [Parameter(Mandatory = $false)]
    [string]$RepoPath = "C:\Projects\astro-clean",

    [Parameter(Mandatory = $false)]
    [ValidateSet("Apply", "RollbackRehearsal")]
    [string]$Mode = "Apply"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedBranch = "main"
$ExpectedHead = "b7d016ef817f9434ee8289dbd7cdd17a3beb9c9e"
$ExpectedTag = "v0.1.375-report-publication-persistence"

$ExpectedBlobs = @{
    "app/api/reports/account/route.ts" = "a0ad5286bb8bac1fad686ce15aa2ca05c87dc609"
    "config/halleus-check-impact.json" = "66164a9ae5a72b212d2eb0a98c184a3569227f87"
    "lib/admin/admin-service.ts" = "f614d4d8a412cf2da0b77c9281c0e66c50fb65bc"
    "lib/reports/report-access-contract.ts" = "7b0aefab59b0fd2d93cadd74053ce3787c33a678"
    "lib/reports/report-access-service.ts" = "2a39d1e171950b559732db7e75e8b0392cfef173"
    "package.json" = "2e93f9dceb3c1f0e47a5300eca9ac00fe5effe6e"
}

$ExpectedChangedFiles = @(
    "app/api/reports/account/route.ts"
    "config/halleus-check-impact.json"
    "lib/admin/admin-service.ts"
    "lib/reports/report-access-contract.ts"
    "lib/reports/report-access-service.ts"
    "package.json"
    "scripts/check-report-publication-mutation.mjs"
)

$NewFiles = @(
    "scripts/check-report-publication-mutation.mjs"
)

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(Mandatory = $false)]
        [string[]]$Arguments = @(),

        [Parameter(Mandatory = $false)]
        [string]$WorkingDirectory = $RepoPath,

        [Parameter(Mandatory = $false)]
        [switch]$AllowFailure,

        [Parameter(Mandatory = $false)]
        [switch]$Quiet
    )

    $stdoutPath = Join-Path $env:TEMP ("halleus-native-out-" + [guid]::NewGuid().ToString("N") + ".txt")
    $stderrPath = Join-Path $env:TEMP ("halleus-native-err-" + [guid]::NewGuid().ToString("N") + ".txt")
    $previousLocation = Get-Location
    $previousErrorAction = $ErrorActionPreference

    try {
        Set-Location -LiteralPath $WorkingDirectory
        $ErrorActionPreference = "Continue"
        & $FilePath @Arguments 1> $stdoutPath 2> $stderrPath
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorAction
        Set-Location -LiteralPath $previousLocation
    }

    $stdout = if (Test-Path -LiteralPath $stdoutPath) {
        [IO.File]::ReadAllText($stdoutPath)
    } else {
        ""
    }
    $stderr = if (Test-Path -LiteralPath $stderrPath) {
        [IO.File]::ReadAllText($stderrPath)
    } else {
        ""
    }

    Remove-Item -LiteralPath $stdoutPath, $stderrPath -Force -ErrorAction SilentlyContinue

    if (-not $Quiet) {
        if ($stdout) {
            Write-Host $stdout.TrimEnd()
        }
        if ($stderr) {
            Write-Host $stderr.TrimEnd()
        }
    }

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "NATIVE_COMMAND_FAILED=$FilePath EXIT_CODE=$exitCode"
    }

    [pscustomobject]@{
        ExitCode = $exitCode
        StdOut = $stdout
        StdErr = $stderr
    }
}

function Git-Capture {
    param([string[]]$Arguments)

    $result = Invoke-Native `
        -FilePath "git.exe" `
        -Arguments $Arguments `
        -Quiet

    return $result.StdOut.Trim()
}

function Get-ChangedFiles {
    $tracked = @(
        (Git-Capture @("diff", "--name-only")).Split(
            [Environment]::NewLine,
            [StringSplitOptions]::RemoveEmptyEntries
        )
    )
    $untracked = @(
        (Git-Capture @(
            "ls-files",
            "--others",
            "--exclude-standard"
        )).Split(
            [Environment]::NewLine,
            [StringSplitOptions]::RemoveEmptyEntries
        )
    )

    return @($tracked + $untracked | Sort-Object -Unique)
}

function Assert-ExactSet {
    param(
        [string[]]$Expected,
        [string[]]$Actual,
        [string]$Marker
    )

    $difference = @(
        Compare-Object `
            -ReferenceObject @($Expected | Sort-Object) `
            -DifferenceObject @($Actual | Sort-Object)
    )

    if ($difference.Count -gt 0) {
        Write-Host "EXPECTED"
        $Expected | Sort-Object
        Write-Host "ACTUAL"
        $Actual | Sort-Object
        throw $Marker
    }
}

function Restore-RunnerChanges {
    param(
        [string]$BackupRoot,
        [hashtable]$BackedUpFiles
    )

    foreach ($relativePath in $BackedUpFiles.Keys) {
        $source = Join-Path $BackupRoot $relativePath
        $target = Join-Path $RepoPath $relativePath
        $parent = Split-Path -Parent $target

        if (-not (Test-Path -LiteralPath $parent)) {
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
        }

        [IO.File]::WriteAllBytes(
            $target,
            [IO.File]::ReadAllBytes($source)
        )
    }

    foreach ($relativePath in $NewFiles) {
        $target = Join-Path $RepoPath $relativePath
        if (Test-Path -LiteralPath $target) {
            Remove-Item -LiteralPath $target -Force
        }
    }
}

$RepoPath = (Resolve-Path -LiteralPath $RepoPath).Path
$BackupRoot = Join-Path `
    $env:TEMP `
    ("Halleus-Backups\Report-Publication-Mutation-A2b-20260801-" + [guid]::NewGuid().ToString("N"))
$BackedUpFiles = @{}
$TransformScript = Join-Path `
    $env:TEMP `
    ("Halleus-A2b-Transform-" + [guid]::NewGuid().ToString("N") + ".cjs")
$Applied = $false

try {
    Write-Host "=== SAFETY GATE ==="

    $branch = Git-Capture @("branch", "--show-current")
    $head = Git-Capture @("rev-parse", "HEAD")
    $originMain = Git-Capture @("rev-parse", "origin/main")
    $headTag = Git-Capture @("describe", "--tags", "--exact-match", "HEAD")
    $status = Git-Capture @(
        "status",
        "--porcelain=v1",
        "--untracked-files=all"
    )

    if ($branch -ne $ExpectedBranch) {
        throw "BRANCH_MISMATCH=$branch"
    }

    if ($head -ne $ExpectedHead) {
        throw "HEAD_MISMATCH=$head"
    }

    if ($originMain -ne $ExpectedHead) {
        throw "ORIGIN_MAIN_MISMATCH=$originMain"
    }

    if ($headTag -ne $ExpectedTag) {
        throw "TAG_MISMATCH=$headTag"
    }

    if ($status) {
        Write-Host $status
        throw "WORKTREE_NOT_CLEAN"
    }

    foreach ($relativePath in $ExpectedBlobs.Keys) {
        $actualBlob = Git-Capture @(
            "hash-object",
            "--",
            $relativePath
        )

        if ($actualBlob -ne $ExpectedBlobs[$relativePath]) {
            throw "BLOB_MISMATCH=$relativePath ACTUAL=$actualBlob"
        }
    }

    foreach ($relativePath in $NewFiles) {
        if (Test-Path -LiteralPath (Join-Path $RepoPath $relativePath)) {
            throw "NEW_FILE_ALREADY_EXISTS=$relativePath"
        }
    }

    Write-Host "SAFETY_GATE=PASS"

    foreach ($relativePath in $ExpectedBlobs.Keys) {
        $source = Join-Path $RepoPath $relativePath
        $backup = Join-Path $BackupRoot $relativePath
        $backupParent = Split-Path -Parent $backup

        New-Item `
            -ItemType Directory `
            -Path $backupParent `
            -Force | Out-Null

        [IO.File]::WriteAllBytes(
            $backup,
            [IO.File]::ReadAllBytes($source)
        )
        $BackedUpFiles[$relativePath] = $true
    }

    $transformBytes = [Convert]::FromBase64String("Y29uc3QgZnMgPSByZXF1aXJlKCJub2RlOmZzIik7CmNvbnN0IHBhdGggPSByZXF1aXJlKCJub2RlOnBhdGgiKTsKCmNvbnN0IHJlcG9Sb290ID0gcHJvY2Vzcy5hcmd2WzJdOwoKZnVuY3Rpb24gZnVsbChyZWxhdGl2ZVBhdGgpIHsKICByZXR1cm4gcGF0aC5qb2luKHJlcG9Sb290LCByZWxhdGl2ZVBhdGgpOwp9CgpmdW5jdGlvbiByZWFkKHJlbGF0aXZlUGF0aCkgewogIHJldHVybiBmcy5yZWFkRmlsZVN5bmMoZnVsbChyZWxhdGl2ZVBhdGgpLCAidXRmOCIpOwp9CgpmdW5jdGlvbiBlb2xPZih0ZXh0KSB7CiAgcmV0dXJuIHRleHQuaW5jbHVkZXMoIlxyXG4iKSA/ICJcclxuIiA6ICJcbiI7Cn0KCmZ1bmN0aW9uIHdpdGhFb2wodGV4dCwgZW9sKSB7CiAgcmV0dXJuIHRleHQucmVwbGFjZSgvXHI/XG4vZywgZW9sKTsKfQoKZnVuY3Rpb24gcmVwbGFjZUV4YWN0KHJlbGF0aXZlUGF0aCwgYmVmb3JlLCBhZnRlcikgewogIGNvbnN0IGN1cnJlbnQgPSByZWFkKHJlbGF0aXZlUGF0aCk7CiAgY29uc3QgZW9sID0gZW9sT2YoY3VycmVudCk7CiAgY29uc3QgbmVlZGxlID0gd2l0aEVvbChiZWZvcmUsIGVvbCk7CiAgY29uc3QgcmVwbGFjZW1lbnQgPSB3aXRoRW9sKGFmdGVyLCBlb2wpOwogIGNvbnN0IGZpcnN0ID0gY3VycmVudC5pbmRleE9mKG5lZWRsZSk7CiAgY29uc3QgbGFzdCA9IGN1cnJlbnQubGFzdEluZGV4T2YobmVlZGxlKTsKCiAgaWYgKGZpcnN0IDwgMCB8fCBmaXJzdCAhPT0gbGFzdCkgewogICAgdGhyb3cgbmV3IEVycm9yKGBBTkNIT1JfTUlTTUFUQ0ggJHtyZWxhdGl2ZVBhdGh9IGNvdW50PSR7Zmlyc3QgPCAwID8gMCA6ICJtdWx0aXBsZSJ9YCk7CiAgfQoKICBmcy53cml0ZUZpbGVTeW5jKAogICAgZnVsbChyZWxhdGl2ZVBhdGgpLAogICAgY3VycmVudC5zbGljZSgwLCBmaXJzdCkgKyByZXBsYWNlbWVudCArIGN1cnJlbnQuc2xpY2UoZmlyc3QgKyBuZWVkbGUubGVuZ3RoKSwKICAgICJ1dGY4IiwKICApOwp9CgpmdW5jdGlvbiB3cml0ZU5ldyhyZWxhdGl2ZVBhdGgsIGJhc2U2NCkgewogIGNvbnN0IHRhcmdldCA9IGZ1bGwocmVsYXRpdmVQYXRoKTsKCiAgaWYgKGZzLmV4aXN0c1N5bmModGFyZ2V0KSkgewogICAgdGhyb3cgbmV3IEVycm9yKGBORVdfRklMRV9BTFJFQURZX0VYSVNUUyAke3JlbGF0aXZlUGF0aH1gKTsKICB9CgogIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUodGFyZ2V0KSwgeyByZWN1cnNpdmU6IHRydWUgfSk7CiAgZnMud3JpdGVGaWxlU3luYyh0YXJnZXQsIEJ1ZmZlci5mcm9tKGJhc2U2NCwgImJhc2U2NCIpKTsKfQoKcmVwbGFjZUV4YWN0KAogICJsaWIvcmVwb3J0cy9yZXBvcnQtYWNjZXNzLWNvbnRyYWN0LnRzIiwKICAiZXhwb3J0IGNvbnN0IFJFUE9SVF9QVUJMSUNBVElPTl9DT1BZX1ZFUlNJT04gPVxuICBcInJlcG9ydC1wdWJsaWNhdGlvbi1wb2xpY3ktdjFcIiBhcyBjb25zdDtcblxuZnVuY3Rpb24gY29tcGFjdFJlYXNvbnMoIiwKICAiZXhwb3J0IGNvbnN0IFJFUE9SVF9QVUJMSUNBVElPTl9DT1BZX1ZFUlNJT04gPVxuICBcInJlcG9ydC1wdWJsaWNhdGlvbi1wb2xpY3ktdjFcIiBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgUmVwb3J0UHVibGljYXRpb25NdXRhdGlvbkFjdGlvbiA9IFwicHVibGlzaFwiIHwgXCJ1bnB1Ymxpc2hcIjtcblxuZXhwb3J0IHR5cGUgT3duZWRSZXBvcnRQdWJsaWNhdGlvbk11dGF0aW9uSW5wdXQgPSB7XG4gIGFjdGlvbjogUmVwb3J0UHVibGljYXRpb25NdXRhdGlvbkFjdGlvbjtcbiAgb3duZXJLaW5kOiBSZXBvcnRQdWJsaWNhdGlvbk93bmVyS2luZDtcbiAgdGllcjogUmVwb3J0QWNjZXNzVGllcjtcbiAgaWRlbnRpdHlDb25zZW50U3RhdGU6IFJlcG9ydElkZW50aXR5Q29uc2VudFN0YXRlO1xuICBhZG1pblJlc3RyaWN0ZWQ/OiBib29sZWFuO1xufTtcblxuZXhwb3J0IHR5cGUgT3duZWRSZXBvcnRQdWJsaWNhdGlvbk11dGF0aW9uRGVjaXNpb24gPVxuICB8IHtcbiAgICAgIG9rOiB0cnVlO1xuICAgICAgYWN0aW9uOiBSZXBvcnRQdWJsaWNhdGlvbk11dGF0aW9uQWN0aW9uO1xuICAgICAgdmlzaWJpbGl0eTogXCJwdWJsaWNcIiB8IFwidW5wdWJsaXNoZWRcIjtcbiAgICAgIHB1YmxpY2F0aW9uSW50ZW50OiBSZXBvcnRQdWJsaWNhdGlvbkludGVudDtcbiAgICAgIHBvbGljeTogUmVwb3J0UHVibGljYXRpb25Qb2xpY3k7XG4gICAgfVxuICB8IHtcbiAgICAgIG9rOiBmYWxzZTtcbiAgICAgIGFjdGlvbjogUmVwb3J0UHVibGljYXRpb25NdXRhdGlvbkFjdGlvbjtcbiAgICAgIGNvZGU6XG4gICAgICAgIHwgXCJhZG1pbi1yZXN0cmljdGVkXCJcbiAgICAgICAgfCBcIm93bmVyLWtpbmQtbm90LWFjY291bnRcIlxuICAgICAgICB8IFwicG9saWN5LXJlamVjdGVkXCI7XG4gICAgICBwb2xpY3k6IFJlcG9ydFB1YmxpY2F0aW9uUG9saWN5O1xuICAgIH07XG5cbmZ1bmN0aW9uIGNvbXBhY3RSZWFzb25zKCIsCik7CgpyZXBsYWNlRXhhY3QoCiAgImxpYi9yZXBvcnRzL3JlcG9ydC1hY2Nlc3MtY29udHJhY3QudHMiLAogICIgIH07XG59XG5cbnR5cGUgR2VuZXJhdGVkVmlzaWJpbGl0eUlucHV0ID0geyIsCiAgIiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV2YWx1YXRlT3duZWRSZXBvcnRQdWJsaWNhdGlvbk11dGF0aW9uKFxuICBpbnB1dDogT3duZWRSZXBvcnRQdWJsaWNhdGlvbk11dGF0aW9uSW5wdXQsXG4pOiBPd25lZFJlcG9ydFB1YmxpY2F0aW9uTXV0YXRpb25EZWNpc2lvbiB7XG4gIGNvbnN0IHB1YmxpY2F0aW9uSW50ZW50OiBSZXBvcnRQdWJsaWNhdGlvbkludGVudCA9XG4gICAgaW5wdXQuYWN0aW9uID09PSBcInB1Ymxpc2hcIiA/IFwicHVibGlzaFwiIDogXCJ1bnB1Ymxpc2hcIjtcbiAgY29uc3QgcHVibGljYXRpb25Db25zZW50U3RhdGU6IFJlcG9ydFB1YmxpY2F0aW9uQ29uc2VudFN0YXRlID1cbiAgICBpbnB1dC50aWVyID09PSBcInByZW1pdW1cIlxuICAgICAgPyBpbnB1dC5hY3Rpb24gPT09IFwicHVibGlzaFwiXG4gICAgICAgID8gXCJncmFudGVkXCJcbiAgICAgICAgOiBcIndpdGhkcmF3blwiXG4gICAgICA6IFwibm90LXJlcXVpcmVkXCI7XG4gIGNvbnN0IHBvbGljeSA9IGV2YWx1YXRlUmVwb3J0UHVibGljYXRpb25Qb2xpY3koe1xuICAgIG93bmVyS2luZDogaW5wdXQub3duZXJLaW5kLFxuICAgIHRpZXI6IGlucHV0LnRpZXIsXG4gICAgcHVibGljYXRpb25JbnRlbnQsXG4gICAgcHVibGljYXRpb25Db25zZW50U3RhdGUsXG4gICAgaWRlbnRpdHlDb25zZW50U3RhdGU6IGlucHV0LmlkZW50aXR5Q29uc2VudFN0YXRlLFxuICAgIGFkbWluUmVzdHJpY3RlZDogaW5wdXQuYWRtaW5SZXN0cmljdGVkLFxuICAgIGxlZ2FjeVJlY29yZDogaW5wdXQub3duZXJLaW5kID09PSBcImxlZ2FjeVwiLFxuICB9KTtcblxuICBpZiAoaW5wdXQuYWRtaW5SZXN0cmljdGVkID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiBmYWxzZSxcbiAgICAgIGFjdGlvbjogaW5wdXQuYWN0aW9uLFxuICAgICAgY29kZTogXCJhZG1pbi1yZXN0cmljdGVkXCIsXG4gICAgICBwb2xpY3ksXG4gICAgfTtcbiAgfVxuXG4gIGlmIChpbnB1dC5vd25lcktpbmQgIT09IFwiYWNjb3VudFwiKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9rOiBmYWxzZSxcbiAgICAgIGFjdGlvbjogaW5wdXQuYWN0aW9uLFxuICAgICAgY29kZTogXCJvd25lci1raW5kLW5vdC1hY2NvdW50XCIsXG4gICAgICBwb2xpY3ksXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGV4cGVjdGVkU3RhdGUgPVxuICAgIGlucHV0LmFjdGlvbiA9PT0gXCJwdWJsaXNoXCIgPyBcInB1YmxpY1wiIDogXCJ1bnB1Ymxpc2hlZFwiO1xuXG4gIGlmIChwb2xpY3kucHVibGljYXRpb25TdGF0ZSAhPT0gZXhwZWN0ZWRTdGF0ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBvazogZmFsc2UsXG4gICAgICBhY3Rpb246IGlucHV0LmFjdGlvbixcbiAgICAgIGNvZGU6IFwicG9saWN5LXJlamVjdGVkXCIsXG4gICAgICBwb2xpY3ksXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgb2s6IHRydWUsXG4gICAgYWN0aW9uOiBpbnB1dC5hY3Rpb24sXG4gICAgdmlzaWJpbGl0eTogZXhwZWN0ZWRTdGF0ZSxcbiAgICBwdWJsaWNhdGlvbkludGVudCxcbiAgICBwb2xpY3ksXG4gIH07XG59XG5cbnR5cGUgR2VuZXJhdGVkVmlzaWJpbGl0eUlucHV0ID0ge1wiLAopOwoKcmVwbGFjZUV4YWN0KAogICJsaWIvcmVwb3J0cy9yZXBvcnQtYWNjZXNzLXNlcnZpY2UudHMiLAogICJpbXBvcnQgeyBjcmVhdGVSZXBvcnRTaGFyZVNlY3JldCwgaGFzaFJlcG9ydFNoYXJlU2VjcmV0LCBSRVBPUlRfU1VNTUFSWV9QQUdFX1NJWkUsIHZhbGlkYXRlUmVwb3J0VGl0bGUgfSBmcm9tIFwiQC9saWIvcmVwb3J0cy9yZXBvcnQtYWNjZXNzLWNvbnRyYWN0XCI7IiwKICAiaW1wb3J0IHtcbiAgY3JlYXRlUmVwb3J0U2hhcmVTZWNyZXQsXG4gIGV2YWx1YXRlT3duZWRSZXBvcnRQdWJsaWNhdGlvbk11dGF0aW9uLFxuICBoYXNoUmVwb3J0U2hhcmVTZWNyZXQsXG4gIFJFUE9SVF9TVU1NQVJZX1BBR0VfU0laRSxcbiAgdHlwZSBSZXBvcnRQdWJsaWNhdGlvbk11dGF0aW9uQWN0aW9uLFxuICB2YWxpZGF0ZVJlcG9ydFRpdGxlLFxufSBmcm9tIFwiQC9saWIvcmVwb3J0cy9yZXBvcnQtYWNjZXNzLWNvbnRyYWN0XCI7IiwKKTsKCnJlcGxhY2VFeGFjdCgKICAibGliL3JlcG9ydHMvcmVwb3J0LWFjY2Vzcy1zZXJ2aWNlLnRzIiwKICAiZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZU93bmVkUmVwb3J0VGl0bGUodXNlcklkOiBzdHJpbmcsIHJlcG9ydElkOiBzdHJpbmcsIHZhbHVlOiB1bmtub3duKSB7IiwKICAiZXhwb3J0IHR5cGUgT3duZWRSZXBvcnRQdWJsaWNhdGlvbk11dGF0aW9uUmVzdWx0ID1cbiAgfCB7XG4gICAgICBvazogdHJ1ZTtcbiAgICAgIHZpc2liaWxpdHk6IFwicHVibGljXCIgfCBcInVucHVibGlzaGVkXCI7XG4gICAgICBwdWJsaWNhdGlvbjogU3RvcmVkUmVwb3J0UHVibGljYXRpb247XG4gICAgfVxuICB8IHtcbiAgICAgIG9rOiBmYWxzZTtcbiAgICAgIGNvZGU6XG4gICAgICAgIHwgXCJub3QtZm91bmRcIlxuICAgICAgICB8IFwiYWRtaW4tcmVzdHJpY3RlZFwiXG4gICAgICAgIHwgXCJvd25lci1raW5kLW5vdC1hY2NvdW50XCJcbiAgICAgICAgfCBcInBvbGljeS1yZWplY3RlZFwiO1xuICAgIH07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtdXRhdGVPd25lZFJlcG9ydFB1YmxpY2F0aW9uKFxuICB1c2VySWQ6IHN0cmluZyxcbiAgcmVwb3J0SWQ6IHN0cmluZyxcbiAgYWN0aW9uOiBSZXBvcnRQdWJsaWNhdGlvbk11dGF0aW9uQWN0aW9uLFxuKTogUHJvbWlzZTxPd25lZFJlcG9ydFB1YmxpY2F0aW9uTXV0YXRpb25SZXN1bHQ+IHtcbiAgY29uc3Qgc3FsID0gZ2V0QWRtaW5EYXRhYmFzZSgpO1xuXG4gIHJldHVybiBzcWwuYmVnaW4oYXN5bmMgKHR4KSA9PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4YFxuICAgICAgc2VsZWN0IGlkLCB2aXNpYmlsaXR5LCByZXN0cmljdGVkX2F0LFxuICAgICAgICBwdWJsaWNhdGlvbl9vd25lcl9raW5kLCBhY2Nlc3NfdGllcixcbiAgICAgICAgcHVibGljYXRpb25faW50ZW50LCBwdWJsaWNhdGlvbl9zdGF0ZSxcbiAgICAgICAgcHVibGljYXRpb25fY29uc2VudF9zdGF0ZSwgaWRlbnRpdHlfY29uc2VudF9zdGF0ZSxcbiAgICAgICAgcHVibGljYXRpb25fcG9saWN5X3ZlcnNpb25cbiAgICAgIGZyb20gcHVibGljLmhhbGxldXNfcmVwb3J0c1xuICAgICAgd2hlcmUgaWQgPSAke3JlcG9ydElkfVxuICAgICAgICBhbmQgdXNlcl9pZCA9ICR7dXNlcklkfVxuICAgICAgICBhbmQgZGVsZXRlZF9hdCBpcyBudWxsXG4gICAgICBmb3IgdXBkYXRlXG4gICAgYDtcbiAgICBjb25zdCByb3cgPSBhc1JlY29yZChyb3dzWzBdKTtcblxuICAgIGlmICghcm93LmlkKSB7XG4gICAgICByZXR1cm4geyBvazogZmFsc2UsIGNvZGU6IFwibm90LWZvdW5kXCIgfTtcbiAgICB9XG5cbiAgICBjb25zdCBwdWJsaWNhdGlvbiA9IHN0b3JlZFB1YmxpY2F0aW9uKHJvdyk7XG4gICAgY29uc3QgZGVjaXNpb24gPSBldmFsdWF0ZU93bmVkUmVwb3J0UHVibGljYXRpb25NdXRhdGlvbih7XG4gICAgICBhY3Rpb24sXG4gICAgICBvd25lcktpbmQ6IHB1YmxpY2F0aW9uLm93bmVyS2luZCxcbiAgICAgIHRpZXI6IHB1YmxpY2F0aW9uLmFjY2Vzc1RpZXIsXG4gICAgICBpZGVudGl0eUNvbnNlbnRTdGF0ZTogcHVibGljYXRpb24uaWRlbnRpdHlDb25zZW50U3RhdGUsXG4gICAgICBhZG1pblJlc3RyaWN0ZWQ6XG4gICAgICAgIEJvb2xlYW4ocm93LnJlc3RyaWN0ZWRfYXQpIHx8XG4gICAgICAgIGFzU3RyaW5nKHJvdy52aXNpYmlsaXR5KSA9PT0gXCJyZXN0cmljdGVkX2J5X2FkbWluXCIsXG4gICAgfSk7XG5cbiAgICBpZiAoIWRlY2lzaW9uLm9rKSB7XG4gICAgICByZXR1cm4geyBvazogZmFsc2UsIGNvZGU6IGRlY2lzaW9uLmNvZGUgfTtcbiAgICB9XG5cbiAgICBjb25zdCB1cGRhdGVkUm93cyA9IGF3YWl0IHR4YFxuICAgICAgdXBkYXRlIHB1YmxpYy5oYWxsZXVzX3JlcG9ydHNcbiAgICAgIHNldCB2aXNpYmlsaXR5ID0gJHtkZWNpc2lvbi52aXNpYmlsaXR5fSxcbiAgICAgICAgICBwdWJsaWNhdGlvbl9pbnRlbnQgPSAke2RlY2lzaW9uLnB1YmxpY2F0aW9uSW50ZW50fSxcbiAgICAgICAgICBwdWJsaWNhdGlvbl9zdGF0ZSA9ICR7ZGVjaXNpb24ucG9saWN5LnB1YmxpY2F0aW9uU3RhdGV9LFxuICAgICAgICAgIHB1YmxpY2F0aW9uX2NvbnNlbnRfc3RhdGUgPVxuICAgICAgICAgICAgJHtkZWNpc2lvbi5wb2xpY3kucHVibGljYXRpb25Db25zZW50U3RhdGV9LFxuICAgICAgICAgIHB1YmxpY2F0aW9uX3BvbGljeV92ZXJzaW9uID0gJHtkZWNpc2lvbi5wb2xpY3kudmVyc2lvbn0sXG4gICAgICAgICAgc2hhcmVfZW5hYmxlZCA9IGZhbHNlLFxuICAgICAgICAgIHNoYXJlX3Rva2VuX2hhc2ggPSBudWxsLFxuICAgICAgICAgIHVwZGF0ZWRfYXQgPSBub3coKVxuICAgICAgd2hlcmUgaWQgPSAke3JlcG9ydElkfVxuICAgICAgICBhbmQgdXNlcl9pZCA9ICR7dXNlcklkfVxuICAgICAgICBhbmQgZGVsZXRlZF9hdCBpcyBudWxsXG4gICAgICAgIGFuZCByZXN0cmljdGVkX2F0IGlzIG51bGxcbiAgICAgICAgYW5kIHZpc2liaWxpdHkgPD4gJ3Jlc3RyaWN0ZWRfYnlfYWRtaW4nXG4gICAgICByZXR1cm5pbmcgdmlzaWJpbGl0eSxcbiAgICAgICAgcHVibGljYXRpb25fb3duZXJfa2luZCwgYWNjZXNzX3RpZXIsXG4gICAgICAgIHB1YmxpY2F0aW9uX2ludGVudCwgcHVibGljYXRpb25fc3RhdGUsXG4gICAgICAgIHB1YmxpY2F0aW9uX2NvbnNlbnRfc3RhdGUsIGlkZW50aXR5X2NvbnNlbnRfc3RhdGUsXG4gICAgICAgIHB1YmxpY2F0aW9uX3BvbGljeV92ZXJzaW9uXG4gICAgYDtcblxuICAgIGlmICghdXBkYXRlZFJvd3MubGVuZ3RoKSB7XG4gICAgICByZXR1cm4geyBvazogZmFsc2UsIGNvZGU6IFwiYWRtaW4tcmVzdHJpY3RlZFwiIH07XG4gICAgfVxuXG4gICAgY29uc3QgdXBkYXRlZCA9IGFzUmVjb3JkKHVwZGF0ZWRSb3dzWzBdKTtcblxuICAgIHJldHVybiB7XG4gICAgICBvazogdHJ1ZSxcbiAgICAgIHZpc2liaWxpdHk6XG4gICAgICAgIGFzU3RyaW5nKHVwZGF0ZWQudmlzaWJpbGl0eSkgPT09IFwicHVibGljXCI/XG4gICAgICAgICAgPyBcInB1YmxpY1wiXG4gICAgICAgICAgOiBcInVucHVibGlzaGVkXCIsXG4gICAgICBwdWJsaWNhdGlvbjogc3RvcmVkUHVibGljYXRpb24odXBkYXRlZCksXG4gICAgfTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1cGRhdGVPd25lZFJlcG9ydFRpdGxlKHVzZXJJZDogc3RyaW5nLCByZXBvcnRJZDogc3RyaW5nLCB2YWx1ZTogdW5rbm93bikgeyIsCik7CgpyZXBsYWNlRXhhY3QoCiAgImFwcC9hcGkvcmVwb3J0cy9hY2NvdW50L3JvdXRlLnRzIiwKICAiICBsaXN0T3duZWRSZXBvcnRTdW1tYXJpZXMsXG4gIHJldm9rZU93bmVkUmVwb3J0U2hhcmluZyxcbiAgc29mdERlbGV0ZU93bmVkUmVwb3J0LFxuICB1cGRhdGVPd25lZFJlcG9ydFRpdGxlLFxuIiwKICAiICBsaXN0T3duZWRSZXBvcnRTdW1tYXJpZXMsXG4gIG11dGF0ZU93bmVkUmVwb3J0UHVibGljYXRpb24sXG4gIHJldm9rZU93bmVkUmVwb3J0U2hhcmluZyxcbiAgc29mdERlbGV0ZU93bmVkUmVwb3J0LFxuICB1cGRhdGVPd25lZFJlcG9ydFRpdGxlLFxuIiwKKTsKCnJlcGxhY2VFeGFjdCgKICAiYXBwL2FwaS9yZXBvcnRzL2FjY291bnQvcm91dGUudHMiLAogICIgICAgaWYgKGFjdGlvbiA9PT0gXCJyZXZva2Vfc2hhcmluZ1wiKSByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBvazogYXdhaXQgcmV2b2tlT3duZWRSZXBvcnRTaGFyaW5nKHVzZXIuaWQsIHJlcG9ydElkKSB9KTtcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsIFwiUmVwb3J0IGFjdGlvbiBpcyBpbnZhbGlkLlwiKTtcbiIsCiAgIiAgICBpZiAoYWN0aW9uID09PSBcInJldm9rZV9zaGFyaW5nXCIpIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IG9rOiBhd2FpdCByZXZva2VPd25lZFJlcG9ydFNoYXJpbmcodXNlci5pZCwgcmVwb3J0SWQpIH0pO1xuICAgIGlmIChhY3Rpb24gPT09IFwicHVibGlzaFwiIHx8IGFjdGlvbiA9PT0gXCJ1bnB1Ymxpc2hcIikge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgbXV0YXRlT3duZWRSZXBvcnRQdWJsaWNhdGlvbihcbiAgICAgICAgdXNlci5pZCxcbiAgICAgICAgcmVwb3J0SWQsXG4gICAgICAgIGFjdGlvbixcbiAgICAgICk7XG5cbiAgICAgIGlmICghcmVzdWx0Lm9rKSB7XG4gICAgICAgIGlmIChyZXN1bHQuY29kZSA9PT0gXCJub3QtZm91bmRcIikge1xuICAgICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwNCwgXCJSZXBvcnQgd2FzIG5vdCBmb3VuZC5cIik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVzdWx0LmNvZGUgPT09IFwiYWRtaW4tcmVzdHJpY3RlZFwiKSB7XG4gICAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXG4gICAgICAgICAgICA0MDksXG4gICAgICAgICAgICBcIlJlcG9ydCBwdWJsaWNhdGlvbiBpcyByZXN0cmljdGVkIGJ5IGFuIGFkbWluaXN0cmF0b3IuXCIsXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFxuICAgICAgICAgIDQwOSxcbiAgICAgICAgICBcIlRoaXMgcmVwb3J0IGNhbm5vdCBiZSBwdWJsaXNoZWQgZnJvbSB0aGUgYWNjb3VudCBtdXRhdGlvbiBwYXRoLlwiLFxuICAgICAgICApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oe1xuICAgICAgICBvazogdHJ1ZSxcbiAgICAgICAgdmlzaWJpbGl0eTogcmVzdWx0LnZpc2liaWxpdHksXG4gICAgICAgIHB1YmxpY2F0aW9uOiByZXN1bHQucHVibGljYXRpb24sXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCBcIlJlcG9ydCBhY3Rpb24gaXMgaW52YWxpZC5cIik7XG4iLAopOwoKcmVwbGFjZUV4YWN0KAogICJsaWIvYWRtaW4vYWRtaW4tc2VydmljZS50cyIsCiAgIiAgICAgICAgc2VsZWN0IHZpc2liaWxpdHlcbiAgICAgICAgZnJvbSBwdWJsaWMuaGFsbGV1c19yZXBvcnRzXG4iLAogICIgICAgICAgIHNlbGVjdCB2aXNpYmlsaXR5LCBwdWJsaWNhdGlvbl9zdGF0ZVxuICAgICAgICBmcm9tIHB1YmxpYy5oYWxsZXVzX3JlcG9ydHNcbiIsCik7CgpyZXBsYWNlRXhhY3QoCiAgImxpYi9hZG1pbi9hZG1pbi1zZXJ2aWNlLnRzIiwKICAiICAgICAgICBzZXQgdmlzaWJpbGl0eSA9ICdyZXN0cmljdGVkX2J5X2FkbWluJyxcbiAgICAgICAgICAgIHNoYXJlX2VuYWJsZWQgPSBmYWxzZSxcbiIsCiAgIiAgICAgICAgc2V0IHZpc2liaWxpdHkgPSAncmVzdHJpY3RlZF9ieV9hZG1pbicsXG4gICAgICAgICAgICBwdWJsaWNhdGlvbl9zdGF0ZSA9ICdyZXN0cmljdGVkJyxcbiAgICAgICAgICAgIHNoYXJlX2VuYWJsZWQgPSBmYWxzZSxcbiIsCik7CgpyZXBsYWNlRXhhY3QoCiAgImxpYi9hZG1pbi9hZG1pbi1zZXJ2aWNlLnRzIiwKICAiICBjb25zdCByb3dzID0gYXdhaXQgc3FsYHVwZGF0ZSBwdWJsaWMuaGFsbGV1c19yZXBvcnRzIHNldCBkZWxldGVkX2F0ID0gbm93KCksIGRlbGV0ZWRfYnkgPSAke2lucHV0LmFjdG9yLnVzZXJJZH06OnV1aWQsIGRlbGV0ZV9yZWFzb24gPSAke2lucHV0LnJlYXNvbn0sIHZpc2liaWxpdHkgPSAndW5wdWJsaXNoZWQnLCBzaGFyZV9lbmFibGVkID0gZmFsc2UsIHNoYXJlX3Rva2VuX2hhc2ggPSBudWxsLCB1cGRhdGVkX2F0ID0gbm93KCkgd2hlcmUgaWQgPSAke2lucHV0LnJlcG9ydElkfSBhbmQgZGVsZXRlZF9hdCBpcyBudWxsIHJldHVybmluZyBpZGAgOyIsCiAgIiAgY29uc3Qgcm93cyA9IGF3YWl0IHNxbGB1cGRhdGUgcHVibGljLmhhbGxldXNfcmVwb3J0cyBzZXQgZGVsZXRlZF9hdCA9IG5vdygpLCBkZWxldGVkX2J5ID0gJHtpbnB1dC5hY3Rvci51c2VySWR9Ojp1dWlkLCBkZWxldGVfcmVhc29uID0gJHtpbnB1dC5yZWFzb259LCB2aXNpYmlsaXR5ID0gJ3VucHVibGlzaGVkJywgcHVibGljYXRpb25faW50ZW50ID0gJ3VucHVibGlzaCcsIHB1YmxpY2F0aW9uX3N0YXRlID0gJ3VucHVibGlzaGVkJywgcHVibGljYXRpb25fY29uc2VudF9zdGF0ZSA9IGNhc2Ugd2hlbiBhY2Nlc3NfdGllciA9ICdwcmVtaXVtJyB0aGVuICd3aXRoZHJhd24nIGVsc2UgJ25vdC1yZXF1aXJlZCcgZW5kLCBzaGFyZV9lbmFibGVkID0gZmFsc2UsIHNoYXJlX3Rva2VuX2hhc2ggPSBudWxsLCB1cGRhdGVkX2F0ID0gbm93KCkgd2hlcmUgaWQgPSAke2lucHV0LnJlcG9ydElkfSBhbmQgZGVsZXRlZF9hdCBpcyBudWxsIHJldHVybmluZyBpZGAgOyIsCik7CgpyZXBsYWNlRXhhY3QoCiAgInBhY2thZ2UuanNvbiIsCiAgIiAgICBcImNoZWNrOnJlcG9ydC1wdWJsaWNhdGlvbi1wZXJzaXN0ZW5jZVwiOiBcIm5vZGUgc2NyaXB0cy9jaGVjay1yZXBvcnQtcHVibGljYXRpb24tcGVyc2lzdGVuY2UubWpzXCIsXG4gICAgXCJjaGVjazpwbGFuXCI6IiwKICAiICAgIFwiY2hlY2s6cmVwb3J0LXB1YmxpY2F0aW9uLXBlcnNpc3RlbmNlXCI6IFwibm9kZSBzY3JpcHRzL2NoZWNrLXJlcG9ydC1wdWJsaWNhdGlvbi1wZXJzaXN0ZW5jZS5tanNcIixcbiAgICBcImNoZWNrOnJlcG9ydC1wdWJsaWNhdGlvbi1tdXRhdGlvblwiOiBcIm5vZGUgc2NyaXB0cy9jaGVjay1yZXBvcnQtcHVibGljYXRpb24tbXV0YXRpb24ubWpzXCIsXG4gICAgXCJjaGVjazpwbGFuXCI6IiwKKTsKCnJlcGxhY2VFeGFjdCgKICAiY29uZmlnL2hhbGxldXMtY2hlY2staW1wYWN0Lmpzb24iLAogICIgICAge1xuICAgICAgXCJpZFwiOiBcInJlcG9ydC1wdWJsaWNhdGlvbi1wb2xpY3lcIiwKIiwKICAiICAgIHtcbiAgICAgIFwiaWRcIjogXCJyZXBvcnQtcHVibGljYXRpb24tbXV0YXRpb25cIixcbiAgICAgIFwiZGVzY3JpcHRpb25cIjogXCJPd25lci1vbmx5IHNlcnZlciBwdWJsaWNhdGlvbiB0cmFuc2l0aW9ucyB3aXRoIHN0b3JlZCB0aWVyLCBleHBsaWNpdCBwcmVtaXVtIGNvbnNlbnQsIGFuZCBhZG1pbiByZXN0cmljdGlvbiBwcmVjZWRlbmNlLlwiLFxuICAgICAgXCJleGNsdXNpdmVcIjogdHJ1ZSxcbiAgICAgIFwicGF0dGVybnNcIjogW1xuICAgICAgICBcImFwcC9hcGkvcmVwb3J0cy9hY2NvdW50L3JvdXRlLnRzXCIsXG4gICAgICAgIFwibGliL3JlcG9ydHMvcmVwb3J0LWFjY2Vzcy1jb250cmFjdC50c1wiLFxuICAgICAgICBcImxpYi9yZXBvcnRzL3JlcG9ydC1hY2Nlc3Mtc2VydmljZS50c1wiLFxuICAgICAgICBcImxpYi9hZG1pbi9hZG1pbi1zZXJ2aWNlLnRzXCIsXG4gICAgICAgIFwic2NyaXB0cy9jaGVjay1yZXBvcnQtcHVibGljYXRpb24tbXV0YXRpb24ubWpzXCJcbiAgICAgIF0sXG4gICAgICBcImd1YXJkc1wiOiBbXG4gICAgICAgIFwiY2hlY2s6cmVwb3J0LXB1YmxpY2F0aW9uLW11dGF0aW9uXCIsXG4gICAgICAgIFwiY2hlY2s6cmVwb3J0LW93bmVyc2hpcC1zaGFyaW5nXCIsXG4gICAgICAgIFwiY2hlY2s6c2VjdXJlLWFkbWluLWNvcmVcIlxuICAgICAgXSxcbiAgICAgIFwibGludFwiOiB0cnVlLFxuICAgICAgXCJidWlsZFwiOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBcImlkXCI6IFwicmVwb3J0LXB1YmxpY2F0aW9uLXBvbGljeVwiLFxuIiwKKTsKCndyaXRlTmV3KAogICJzY3JpcHRzL2NoZWNrLXJlcG9ydC1wdWJsaWNhdGlvbi1tdXRhdGlvbi5tanMiLAogICJhVzF3YjNKMElHWnpMQ0I3SUhKbFlXUkdhV3hsVTNsdVl5QjlJR1p5YjIwZ0ltNXZaR1U2Wm5NaU93cHBiWEJ2Y25RZ2NHRjBhQ0JtY205dElDSnViMlJsT25CaGRHZ2lPd3BwYlhCdmNuUWdUVzlrZFd4bExDQjdJR055WldGMFpWSmxjWFZwY21VZ2ZTQm1jbTl0SUNKdWIyUmxPbTF2WkhWc1pTSTdDZ3BqYjI1emRDQnlaWEJ2VW05dmRDQTlJSEJ5YjJObGMzTXVZM2RrS0NrN0NtTnZibk4wSUhKbGNYVnBjbVVnUFNCamNtVmhkRkpsY1hWcGNtVW9hVzF3YjNKMExtMWxkR0Z1Y213cE93cGpiMjV6ZENCemRDQTlJSEpsY1hWcGNtVW9JblI1Y0dWelkzSnBjSFFpS1RzS1kyOXVjM1FnYjNKcFoybHVZV3hTWlhOdmJIWmxSbWxzWlc1aGJXVWdQU0JvYjJSMWJHVXVYMUpsYzI5c2RtVkdhV3hsYm1GdFpUc0tDbVoxYm1OMGFXOXVJSEpsYzI5c2RtVlhhWFJvVkhsd1pWTmpjbWx3ZEVWNGRHVnVjMmx2Ym5Nb1kyRnVaR2xrWVhSbEtTQjdDaUFnWTI5dWMzUWdZMkZ1Wkdsa1lYUmxjeUE5SUZzS0lDQWdZMkZ1Wkdsa1lYUmxMQW9nSUNBZ0pIdGpZVzVrYVdSaGRHVjlMblJ6TEFvZ0lDQWdKSHRqWVc1a2FXUmhkR1Y5TG5SemVDd2dEU0FnSUNBa0UydGxlRzFqYTBGMFpTSTdDaUFnSUNCamIyNXpkQ0J6YjNWeVkyVWdQU0JtY3k1eVpXRmtSbWxzWlZONWJtTW9abWxzWlc1aGJXVXNJQ0oxZEdZNElpazdDaUFnSUNCamIyNXpkQ0IwY21GdWMzQnBiR1ZrSUQwZ2RITXVkSEpoYm5Od2FXeGxUVzlrZFd4bEtITnZkWEpqWlN3Z2V3b2dJQ0FnSUdacGJHVk9ZVzFsT2lCbWFXeGxibUZ0WlN3S0lDQWdJQ0JqYjIxd2FXeGxjbDlQY0hScGIyNXpPaUI3Q2lBZ0lDQWdJQ0JsYzAxdlpIVnNaVWx1ZEdWeWIzQXNJSEJ5YjJObGMzTXVZMjlrZFhSbExtUmxabWx1WlhNdVRXOWtkV3hsS2tOdmJXMXZiazpTIGV0YyIsCik7Cg==")
    [IO.File]::WriteAllBytes($TransformScript, $transformBytes)

    Invoke-Native `
        -FilePath "node.exe" `
        -Arguments @($TransformScript, $RepoPath)

    $Applied = $true

    $changedFiles = @(Get-ChangedFiles)
    Assert-ExactSet `
        -Expected $ExpectedChangedFiles `
        -Actual $changedFiles `
        -Marker "CHANGED_FILE_BOUNDARY_MISMATCH"

    Write-Host "CHANGED_FILE_BOUNDARY=PASS"

    if ($Mode -eq "RollbackRehearsal") {
        Restore-RunnerChanges `
            -BackupRoot $BackupRoot `
            -BackedUpFiles $BackedUpFiles
        $Applied = $false

        $afterRollback = Git-Capture @(
            "status",
            "--porcelain=v1",
            "--untracked-files=all"
        )

        if ($afterRollback) {
            Write-Host $afterRollback
            throw "ROLLBACK_REHEARSAL_NOT_CLEAN"
        }

        Write-Host "ROLLBACK_REHEARSAL=PASS"
        exit 0
    }

    Invoke-Native `
        -FilePath "pnpm.cmd" `
        -Arguments @(
            "run",
            "check:report-publication-mutation"
        )

    $checkPlanArguments = @(
        "run",
        "check:plan"
    ) + $ExpectedChangedFiles

    Invoke-Native `
        -FilePath "pnpm.cmd" `
        -Arguments $checkPlanArguments

    $verifyArguments = @(
        "run",
        "verify"
    ) + $ExpectedChangedFiles

    Invoke-Native `
        -FilePath "pnpm.cmd" `
        -Arguments $verifyArguments

    Invoke-Native `
        -FilePath "git.exe" `
        -Arguments @(
            "--no-pager",
            "diff",
            "--check"
        )

    $finalChangedFiles = @(Get-ChangedFiles)
    Assert-ExactSet `
        -Expected $ExpectedChangedFiles `
        -Actual $finalChangedFiles `
        -Marker "FINAL_CHANGED_FILE_BOUNDARY_MISMATCH"

    Write-Host "VERIFICATION=PASS"
    Write-Host "APPLY=PASS"
    Write-Host "BACKUP=$BackupRoot"
    Write-Host ""
    Write-Host "FINAL_STATUS"
    Invoke-Native `
        -FilePath "git.exe" `
        -Arguments @(
            "status",
            "--short"
        )
    Write-Host ""
    Write-Host "FINAL_DIFF"
    Invoke-Native `
        -FilePath "git.exe" `
        -Arguments @(
            "--no-pager",
            "diff"
        )
}
catch {
    $failure = $_

    if ($Applied) {
        try {
            Restore-RunnerChanges `
                -BackupRoot $BackupRoot `
                -BackedUpFiles $BackedUpFiles
            $Applied = $false
            Write-Host "ROLLBACK_AFTER_FAILURE=PASS"
        }
        catch {
            Write-Host "ROLLBACK_AFTER_FAILURE=FAILED"
            Write-Host $_
        }
    }

    Write-Host ""
    Write-Host "FINAL_STATUS_AFTER_FAILURE"
    try {
        Invoke-Native `
            -FilePath "git.exe" `
            -Arguments @(
                "status",
                "--short"
            ) `
            -AllowFailure
    }
    catch {}

    Write-Host ""
    Write-Host "FINAL_DIFF_AFTER_FAILURE"
    try {
        Invoke-Native `
            -FilePath "git.exe" `
            -Arguments @(
                "--no-pager",
                "diff"
            ) `
            -AllowFailure
    }
    catch {}

    throw $failure
}
finally {
    Remove-Item `
        -LiteralPath $TransformScript `
        -Force `
        -ErrorAction SilentlyContinue
}
