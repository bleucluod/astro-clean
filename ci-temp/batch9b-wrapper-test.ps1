$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

function Read-NativeTextFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return ""
  }

  return [System.IO.File]::ReadAllText($Path)
}

function Write-NativeStreamText {
  param(
    [string]$Text,
    [switch]$ErrorStream
  )

  if ([string]::IsNullOrEmpty($Text)) {
    return
  }

  if ($ErrorStream) {
    [System.Console]::Error.Write($Text)
    return
  }

  [System.Console]::Out.Write($Text)
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
  $stdoutPath = Join-Path ([System.IO.Path]::GetTempPath()) (
    "halleus-native-stdout-" + [System.Guid]::NewGuid().ToString("N") + ".txt"
  )
  $stderrPath = Join-Path ([System.IO.Path]::GetTempPath()) (
    "halleus-native-stderr-" + [System.Guid]::NewGuid().ToString("N") + ".txt"
  )

  try {
    if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
      Push-Location -LiteralPath $WorkingDirectory
      $pushed = $true
    }

    $ErrorActionPreference = "Continue"
    & $FilePath @Arguments 1> $stdoutPath 2> $stderrPath
    $exitCode = $LASTEXITCODE

    $stdoutText = Read-NativeTextFile -Path $stdoutPath
    $stderrText = Read-NativeTextFile -Path $stderrPath

    if ($AllowedExitCodes -notcontains $exitCode) {
      throw "Native command failed ($exitCode): $FilePath $($Arguments -join ' ')`nSTDOUT:`n$stdoutText`nSTDERR:`n$stderrText"
    }

    if ($Capture) {
      Write-NativeStreamText -Text $stderrText -ErrorStream
      return $stdoutText.TrimEnd([char[]]"`r`n")
    }

    Write-NativeStreamText -Text $stdoutText
    Write-NativeStreamText -Text $stderrText -ErrorStream
  }
  finally {
    $ErrorActionPreference = $previousErrorActionPreference
    foreach ($tempPath in @($stdoutPath, $stderrPath)) {
      if (Test-Path -LiteralPath $tempPath) {
        Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
      }
    }
    if ($pushed) {
      Pop-Location
    }
  }
}

$captured = Invoke-Native -FilePath "cmd.exe" -Arguments @(
  "/d", "/s", "/c",
  '"(echo lib/astrology/real-engine-synthesis.ts)&(echo warning: CRLF will be replaced by LF 1>&2)&exit /b 0"'
) -Capture

if ($captured -ne "lib/astrology/real-engine-synthesis.ts") {
  throw "STDOUT_POLLUTED_BY_STDERR: <$captured>"
}
Write-Host "CAPTURE_STDOUT_ONLY=PASS"

$failed = $false
try {
  Invoke-Native -FilePath "cmd.exe" -Arguments @(
    "/d", "/s", "/c",
    '"(echo real failure 1>&2)&exit /b 7"'
  ) -Capture | Out-Null
}
catch {
  if ($_.Exception.Message -match "Native command failed \(7\)" -and $_.Exception.Message -match "real failure") {
    $failed = $true
  }
}
if (-not $failed) {
  throw "NONZERO_EXIT_NOT_FATAL"
}
Write-Host "NONZERO_EXIT_FATAL=PASS"
Write-Host "BATCH9B_NATIVE_STREAM_SEPARATION=PASS"
