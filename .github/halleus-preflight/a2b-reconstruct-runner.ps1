Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedCandidate1RunnerSha = "9edc28589f8eef4befa363b2b2c3a7b3142b2fad77c51e3089ac2a26785f576e"
$ExpectedCandidate2RunnerSha = "4ab4c015697a788b7419a07d649577a2b25d693ff3f162441e519a1215f18b81"
$ExpectedCandidate1TransformSha = "e01164de1e1ce609f70cf7c4c020a6f3d60f564c59064f266fa1eac8744c4bc5"
$ExpectedCandidate2TransformSha = "1fad6ac3f7ff39b25500141e4789fa663c6488e6685fddb00860488730967faf"
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
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function Get-BytesSha256 {
    param([byte[]]$Bytes)

    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        return ([BitConverter]::ToString($sha.ComputeHash($Bytes))).Replace("-", "").ToLowerInvariant()
    }
    finally {
        $sha.Dispose()
    }
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
$compressedSha = Get-BytesSha256 $compressedBytes

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
    $candidate1Bytes = $outputStream.ToArray()
}
finally {
    $gzipStream.Dispose()
    $inputStream.Dispose()
    $outputStream.Dispose()
}

$candidate1Sha = Get-BytesSha256 $candidate1Bytes

if ($candidate1Sha -ne $ExpectedCandidate1RunnerSha) {
    throw "CANDIDATE1_RUNNER_SHA_MISMATCH=$candidate1Sha"
}

$candidate1Text = [Text.Encoding]::UTF8.GetString($candidate1Bytes)
$payloadPattern = '\$transformBytes = \[Convert\]::FromBase64String\("(?<payload>[A-Za-z0-9+/=]+)"\)'
$payloadMatch = [regex]::Match($candidate1Text, $payloadPattern)

if (-not $payloadMatch.Success) {
    throw "TRANSFORM_PAYLOAD_NOT_FOUND"
}

$oldPayload = $payloadMatch.Groups["payload"].Value
$candidate1TransformBytes = [Convert]::FromBase64String($oldPayload)
$candidate1TransformSha = Get-BytesSha256 $candidate1TransformBytes

if ($candidate1TransformSha -ne $ExpectedCandidate1TransformSha) {
    throw "CANDIDATE1_TRANSFORM_SHA_MISMATCH=$candidate1TransformSha"
}

$candidate1TransformText = [Text.Encoding]::UTF8.GetString($candidate1TransformBytes)
$badEscape = '\\n'
$goodEscape = '\n'
$badEscapeCount = ([regex]::Matches(
    $candidate1TransformText,
    [regex]::Escape($badEscape)
)).Count

if ($badEscapeCount -ne 17) {
    throw "TRANSFORM_BAD_ESCAPE_COUNT=$badEscapeCount"
}

$candidate2TransformText = $candidate1TransformText.Replace(
    $badEscape,
    $goodEscape
)
$candidate2TransformBytes = $Utf8NoBom.GetBytes($candidate2TransformText)
$candidate2TransformSha = Get-BytesSha256 $candidate2TransformBytes

if ($candidate2TransformSha -ne $ExpectedCandidate2TransformSha) {
    throw "CANDIDATE2_TRANSFORM_SHA_MISMATCH=$candidate2TransformSha"
}

$newPayload = [Convert]::ToBase64String($candidate2TransformBytes)
$candidate2Text = $candidate1Text.Substring(0, $payloadMatch.Groups["payload"].Index) +
    $newPayload +
    $candidate1Text.Substring(
        $payloadMatch.Groups["payload"].Index +
        $payloadMatch.Groups["payload"].Length
    )

[IO.File]::WriteAllText($RunnerPath, $candidate2Text, $Utf8NoBom)

$candidate2Sha = (
    Get-FileHash -LiteralPath $RunnerPath -Algorithm SHA256
).Hash.ToLowerInvariant()

if ($candidate2Sha -ne $ExpectedCandidate2RunnerSha) {
    throw "CANDIDATE2_RUNNER_SHA_MISMATCH=$candidate2Sha"
}

$transformCheckPath = Join-Path $env:RUNNER_TEMP "halleus-a2b-transform-candidate2.cjs"
[IO.File]::WriteAllBytes($transformCheckPath, $candidate2TransformBytes)

try {
    & node.exe --check $transformCheckPath
    if ($LASTEXITCODE -ne 0) {
        throw "CANDIDATE2_TRANSFORM_PARSE_FAILED=$LASTEXITCODE"
    }
}
finally {
    Remove-Item -LiteralPath $transformCheckPath -Force -ErrorAction SilentlyContinue
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
    throw "CANDIDATE2_RUNNER_PARSE_FAILED"
}

Write-Host "CANDIDATE1_RUNNER_SHA256=$candidate1Sha"
Write-Host "CANDIDATE2_TRANSFORM_SHA256=$candidate2TransformSha"
Write-Host "CANDIDATE2_RUNNER_SHA256=$candidate2Sha"
Write-Host "RUNNER_RECONSTRUCTION=PASS"
