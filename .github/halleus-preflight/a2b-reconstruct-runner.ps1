Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedRunnerSha = "9edc28589f8eef4befa363b2b2c3a7b3142b2fad77c51e3089ac2a26785f576e"
$ExpectedCompressedSha = "63cda66f13dec1ad3a61176615db6d0032c2c26b92f260318382a37d369ff549"
$RunnerName = "Apply-Halleus-Report-Publication-Mutation-A2b-20260801.ps1"
$RunnerPath = Join-Path $env:GITHUB_WORKSPACE $RunnerName
$PartsRoot = Join-Path $env:GITHUB_WORKSPACE ".github/halleus-preflight/a2b-runner-parts"
$ExpectedParts = [ordered]@{
    "part01.txt" = "a029204711d60b728f2de8b54f9fead27958c897a5364245aaa07610df69ebdc"
    "part02.txt" = "553fb8a4500f0c0e54c2d99759da0272451ea4c247bb4bd5e22ee890f9d61040"
    "part03.txt" = "38c473b02cb90858003f3918e36ab15edd86f77c14b1a117d9c984ae070b2f31"
    "part04.txt" = "edf9efa14fffbcb915e1f5e9b3ea973a4f07c2781db7882cc8cace5ece8f75a7"
}

$encoded = New-Object System.Text.StringBuilder

foreach ($partName in $ExpectedParts.Keys) {
    $partPath = Join-Path $PartsRoot $partName

    if (-not (Test-Path -LiteralPath $partPath)) {
        throw "RUNNER_PART_MISSING=$partName"
    }

    $partSha = (
        Get-FileHash -LiteralPath $partPath -Algorithm SHA256
    ).Hash.ToLowerInvariant()

    if ($partSha -ne $ExpectedParts[$partName]) {
        throw "RUNNER_PART_SHA_MISMATCH=$partName ACTUAL=$partSha"
    }

    [void]$encoded.Append([IO.File]::ReadAllText($partPath).Trim())
}

$compressedBytes = [Convert]::FromBase64String($encoded.ToString())
$compressedPath = Join-Path $env:RUNNER_TEMP "halleus-a2b-runner.gz"
[IO.File]::WriteAllBytes($compressedPath, $compressedBytes)

$compressedSha = (
    Get-FileHash -LiteralPath $compressedPath -Algorithm SHA256
).Hash.ToLowerInvariant()

if ($compressedSha -ne $ExpectedCompressedSha) {
    throw "RUNNER_COMPRESSED_SHA_MISMATCH=$compressedSha"
}

$inputStream = New-Object IO.MemoryStream(,$compressedBytes)
$gzipStream = New-Object IO.Compression.GzipStream(
    $inputStream,
    [IO.Compression.CompressionMode]::Decompress
)
$outputStream = New-Object IO.MemoryStream

try {
    $gzipStream.CopyTo($outputStream)
    [IO.File]::WriteAllBytes($RunnerPath, $outputStream.ToArray())
}
finally {
    $gzipStream.Dispose()
    $inputStream.Dispose()
    $outputStream.Dispose()
    Remove-Item -LiteralPath $compressedPath -Force -ErrorAction SilentlyContinue
}

$runnerSha = (
    Get-FileHash -LiteralPath $RunnerPath -Algorithm SHA256
).Hash.ToLowerInvariant()

if ($runnerSha -ne $ExpectedRunnerSha) {
    throw "RUNNER_SHA_MISMATCH=$runnerSha"
}

$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile(
    $RunnerPath,
    [ref]$tokens,
    [ref]$parseErrors
) | Out-Null

if ($parseErrors.Count -gt 0) {
    $parseErrors | ForEach-Object { Write-Host $_ }
    throw "RUNNER_PARSE_FAILED"
}

Write-Host "RUNNER_RECONSTRUCTION_SHA256=$runnerSha"
Write-Host "RUNNER_RECONSTRUCTION=PASS"
