[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

function Convert-ToText {
  param([object[]]$Items)

  if ($null -eq $Items) {
    return ""
  }

  return (($Items | ForEach-Object { [string]$_ }) -join "`n").TrimEnd()
}

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [string[]]$Arguments = @(),

    [string]$WorkingDirectory,

    [int[]]$AllowedExitCodes = @(0),

    [switch]$Capture
  )

  $pushed = $false
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
      Push-Location -LiteralPath $WorkingDirectory
      $pushed = $true
    }

    $ErrorActionPreference = "Continue"

    if ($Capture) {
      $output = @(& $FilePath @Arguments 2>&1)
      $exitCode = $LASTEXITCODE
      $text = Convert-ToText -Items $output
      if ($AllowedExitCodes -notcontains $exitCode) {
        throw "Native command failed ($exitCode): $FilePath $($Arguments -join ' ')`n$text"
      }
      return $text
    }

    & $FilePath @Arguments
    $exitCode = $LASTEXITCODE
    if ($AllowedExitCodes -notcontains $exitCode) {
      throw "Native command failed ($exitCode): $FilePath $($Arguments -join ' ')"
    }
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference
    if ($pushed) {
      Pop-Location
    }
  }
}

if ($PSVersionTable.PSEdition -ne "Desktop" -or $PSVersionTable.PSVersion.Major -ne 5) {
  throw "WINDOWS_POWERSHELL_51_REQUIRED"
}

$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
  $PSCommandPath,
  [ref]$tokens,
  [ref]$parseErrors
) | Out-Null
if (@($parseErrors).Count -gt 0) {
  throw "HARNESS_PARSE_FAILED: $(@($parseErrors | ForEach-Object { $_.Message }) -join '; ')"
}

$warningText = Invoke-Native -FilePath "cmd.exe" -Arguments @(
  "/d",
  "/s",
  "/c",
  "echo warning: CRLF will be replaced by LF 1>&2 & exit /b 0"
) -Capture
if ($warningText -notmatch "CRLF will be replaced by LF") {
  throw "STDERR_CAPTURE_MISSING"
}

Invoke-Native -FilePath "cmd.exe" -Arguments @(
  "/d",
  "/s",
  "/c",
  "echo warning: CRLF will be replaced by LF 1>&2 & exit /b 0"
)

$failureObserved = $false
try {
  Invoke-Native -FilePath "cmd.exe" -Arguments @(
    "/d",
    "/s",
    "/c",
    "echo real failure 1>&2 & exit /b 7"
  ) -Capture | Out-Null
}
catch {
  if ($_.Exception.Message -match "Native command failed \(7\)") {
    $failureObserved = $true
  }
  else {
    throw
  }
}

if (-not $failureObserved) {
  throw "NONZERO_EXIT_WAS_NOT_REJECTED"
}

Write-Host "WINDOWS_POWERSHELL_51=PASS"
Write-Host "ZERO_EXIT_STDERR_NON_FATAL=PASS"
Write-Host "NONZERO_EXIT_FATAL=PASS"
Write-Host "RECOVERY_NATIVE_WRAPPER=PASS"
