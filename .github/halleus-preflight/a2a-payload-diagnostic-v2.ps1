Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedPartHashes = @(
    "41b07a692e15ccc10463c135c69ce7125a223559b8e5a67a1bdadf5c33cb0426",
    "959c73666b96ccfacb053f85947f7511c0ee1c504f200473ea6c92d416867ff8",
    "965939644492fac129d85d5c240d4c333ea5fcf21ae268b5e5067e2e7347a610",
    "6c70b9c17610746b61fe4f34f8fada839f365300ba2f11fc1c9c4f1287a0683e"
)
$ExpectedPartLengths = @(7200, 7200, 7200, 7036)
$PartContents = @(1..4 | ForEach-Object {
    $PartIndex = $_
    $PartPath = ".github/halleus-preflight/a2a-candidate4.part$PartIndex.txt"
    if (-not (Test-Path -LiteralPath $PartPath -PathType Leaf)) {
        throw "CANDIDATE_PART_NOT_FOUND=$PartPath"
    }

    $PartText = [IO.File]::ReadAllText($PartPath).Trim()
    $PartBytes = [Text.Encoding]::UTF8.GetBytes($PartText)
    $PartSha = [BitConverter]::ToString(
        [Security.Cryptography.SHA256]::Create().ComputeHash($PartBytes)
    ).Replace("-", "").ToLowerInvariant()

    Write-Host "CANDIDATE_PART_${PartIndex}_LENGTH=$($PartText.Length)"
    Write-Host "CANDIDATE_PART_${PartIndex}_SHA256=$PartSha"

    if ($PartText.Length -ne $ExpectedPartLengths[$PartIndex - 1]) {
        throw "CANDIDATE_PART_LENGTH_MISMATCH=$PartIndex"
    }
    if ($PartSha -ne $ExpectedPartHashes[$PartIndex - 1]) {
        throw "CANDIDATE_PART_SHA_MISMATCH=$PartIndex"
    }
    $PartText
})

$Encoded = $PartContents -join ""
$EncodedBytes = [Text.Encoding]::UTF8.GetBytes($Encoded)
$EncodedSha = [BitConverter]::ToString(
    [Security.Cryptography.SHA256]::Create().ComputeHash($EncodedBytes)
).Replace("-", "").ToLowerInvariant()

Write-Host "CANDIDATE_CONCAT_LENGTH=$($Encoded.Length)"
Write-Host "CANDIDATE_CONCAT_SHA256=$EncodedSha"

if ($Encoded.Length -ne 28636) {
    throw "CANDIDATE_CONCAT_LENGTH_MISMATCH=$($Encoded.Length)"
}
if ($EncodedSha -ne "2f17769020ae81fe0ce45f53480e7e4eb3cc937be592cf7962830bdbaaf6c85c") {
    throw "CANDIDATE_CONCAT_SHA_MISMATCH=$EncodedSha"
}

$CompressedBytes = [Convert]::FromBase64String($Encoded)
$CompressedSha = [BitConverter]::ToString(
    [Security.Cryptography.SHA256]::Create().ComputeHash($CompressedBytes)
).Replace("-", "").ToLowerInvariant()

Write-Host "CANDIDATE_COMPRESSED_LENGTH=$($CompressedBytes.Length)"
Write-Host "CANDIDATE_COMPRESSED_SHA256=$CompressedSha"

if ($CompressedBytes.Length -ne 21477) {
    throw "CANDIDATE_COMPRESSED_LENGTH_MISMATCH=$($CompressedBytes.Length)"
}
if ($CompressedSha -ne "3d195f601d001201dd0472ca59a39347167d902be22f87be5e7817271048514") {
    throw "CANDIDATE_COMPRESSED_SHA_MISMATCH=$CompressedSha"
}

Write-Host "CANDIDATE_PAYLOAD_DIAGNOSTIC=PASS"
