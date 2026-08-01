Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$SourceHarness = ".github/halleus-preflight/a2a-direct-harness-v2.ps1"
$GeneratedHarness = Join-Path $env:RUNNER_TEMP "a2a-direct-harness-v6.ps1"
$Utf8 = New-Object System.Text.UTF8Encoding($false)

function Replace-ExactlyOnce {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][string]$Old,
        [Parameter(Mandatory = $true)][string]$New,
        [Parameter(Mandatory = $true)][string]$Name
    )

    $First = $Text.IndexOf($Old, [StringComparison]::Ordinal)
    if ($First -lt 0) {
        throw "HARNESS_PATCH_ANCHOR_NOT_FOUND=$Name"
    }
    $Second = $Text.IndexOf($Old, $First + $Old.Length, [StringComparison]::Ordinal)
    if ($Second -ge 0) {
        throw "HARNESS_PATCH_ANCHOR_NOT_UNIQUE=$Name"
    }
    return $Text.Substring(0, $First) + $New + $Text.Substring($First + $Old.Length)
}

$Harness = [IO.File]::ReadAllText($SourceHarness).Replace("`r`n", "`n")
$Harness = Replace-ExactlyOnce `
    -Text $Harness `
    -Old '$Candidate5Sha = "382c845e8d857e7335d2117892d0b01fdb5838dd8af68e651247d68beeef02a6"' `
    -New '$Candidate5Sha = "2d1e11e306b4507f4cf84a9854c3b8a8dc5567c5c02a9e07899f8c533de8553c"' `
    -Name "candidate9-sha"

$OldNode = @'
content = content.replace(oldOrder, newOrder);
fs.writeFileSync(runnerPath, content, "utf8");
'@
$NewNode = @'
content = content.replace(oldOrder, newOrder);
const oldBoundary = '    $changedFiles = @(Get-GitLines @("diff", "--name-only"))';
const newBoundary = `    $changedFiles = @(
        Get-GitLines @("diff", "--name-only")
        Get-GitLines @("ls-files", "--others", "--exclude-standard")
    )`;
if (content.split(oldBoundary).length !== 2) {
  throw new Error("changed-file boundary anchor count mismatch");
}
content = content.replace(oldBoundary, newBoundary);
const oldPlan = '    $planArguments = @("run", "check:plan", "--") + $Targets';
const newPlan = '    $planArguments = @("run", "check:plan") + $Targets';
if (content.split(oldPlan).length !== 2) {
  throw new Error("check-plan invocation anchor count mismatch");
}
content = content.replace(oldPlan, newPlan);
const oldVerify = '    $verifyArguments = @("run", "verify", "--") + $Targets';
const newVerify = '    $verifyArguments = @("run", "verify") + $Targets';
if (content.split(oldVerify).length !== 2) {
  throw new Error("verify invocation anchor count mismatch");
}
content = content.replace(oldVerify, newVerify);
fs.writeFileSync(runnerPath, content, "utf8");
'@
$OldNode = $OldNode.Replace("`r`n", "`n")
$NewNode = $NewNode.Replace("`r`n", "`n")
$Harness = Replace-ExactlyOnce `
    -Text $Harness `
    -Old $OldNode `
    -New $NewNode `
    -Name "candidate9-patches"

[IO.File]::WriteAllText($GeneratedHarness, $Harness, $Utf8)

& powershell.exe `
    -NoProfile `
    -ExecutionPolicy Bypass `
    -File $GeneratedHarness
$ExitCode = $LASTEXITCODE
if ($ExitCode -ne 0) {
    throw "A2A_CANDIDATE9_GENERATED_HARNESS_FAILED=$ExitCode"
}
