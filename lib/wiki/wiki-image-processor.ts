import { createHash } from "node:crypto";
import sharp from "sharp";

import { WIKI_IMAGE_VARIANTS } from "@/lib/wiki/wiki-image-types";

export function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function inspectWikiWebp(bytes: Uint8Array) {
  const metadata = await sharp(bytes, { failOn: "warning" }).metadata();
  if (metadata.format !== "webp" || !metadata.width || !metadata.height) {
    throw new Error("WIKI_IMAGE_WEBP_REQUIRED");
  }
  return { width: metadata.width, height: metadata.height };
}

async function encodeToBudget(input: Uint8Array, width: number, height: number, maxBytes: number) {
  for (const quality of [82, 78, 74, 70, 66, 62, 58, 54, 50, 46, 42, 38]) {
    const output = await sharp(input, { failOn: "warning" })
      .resize(width, height, { fit: "cover", position: "centre", withoutEnlargement: false })
      .webp({ quality, effort: 6, smartSubsample: true })
      .toBuffer();
    if (output.length <= maxBytes) return new Uint8Array(output);
  }
  throw new Error(`WIKI_IMAGE_BUDGET_UNMET:${width}x${height}:${maxBytes}`);
}

const HEX_POPCOUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4] as const;

function perceptualBitsToHex(bits: string) {
  let hex = "";
  for (let index = 0; index < bits.length; index += 4) {
    hex += Number.parseInt(bits.slice(index, index + 4), 2).toString(16);
  }
  return hex;
}

export async function perceptualHash(bytes: Uint8Array) {
  const { data } = await sharp(bytes, { failOn: "warning" })
    .resize(8, 8, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const values = [...data];
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return perceptualBitsToHex(values.map((value) => value >= average ? "1" : "0").join(""));
}

export function perceptualDistance(left: string, right: string) {
  if (!/^[0-9a-f]{16}$/i.test(left) || !/^[0-9a-f]{16}$/i.test(right)) {
    throw new Error("WIKI_IMAGE_PERCEPTUAL_HASH_INVALID");
  }
  let distance = 0;
  for (let index = 0; index < 16; index += 1) {
    const xor = Number.parseInt(left[index], 16) ^ Number.parseInt(right[index], 16);
    distance += HEX_POPCOUNT[xor];
  }
  return distance;
}

export async function normalizeWikiImagePrimary(inputBytes: Uint8Array) {
  const metadata = await sharp(inputBytes, { failOn: "warning" }).metadata();
  if (!metadata.width || !metadata.height || !["webp", "png", "jpeg"].includes(metadata.format ?? "")) {
    throw new Error("WIKI_IMAGE_SOURCE_FORMAT_INVALID");
  }
  return encodeToBudget(inputBytes, 1200, 675, 50_000);
}

export async function prepareWikiImageVariants(primaryBytes: Uint8Array) {
  const metadata = await inspectWikiWebp(primaryBytes);
  if (metadata.width !== 1200 || metadata.height !== 675) throw new Error("WIKI_IMAGE_PRIMARY_DIMENSIONS_INVALID");
  if (primaryBytes.length > 50_000) throw new Error("WIKI_IMAGE_PRIMARY_BYTES_EXCEEDED");
  const primaryHash = sha256(primaryBytes);
  const primaryPhash = await perceptualHash(primaryBytes);
  const result = [];
  for (const contract of WIKI_IMAGE_VARIANTS) {
    const bytes = contract.width === 1200
      ? primaryBytes
      : await encodeToBudget(primaryBytes, contract.width, contract.height, contract.maxBytes);
    if (bytes.length > contract.maxBytes) throw new Error(`WIKI_IMAGE_VARIANT_BYTES_EXCEEDED:${contract.width}`);
    result.push({
      ...contract,
      bytes,
      contentHash: contract.width === 1200 ? primaryHash : sha256(bytes),
      perceptualHash: contract.width === 1200 ? primaryPhash : await perceptualHash(bytes),
    });
  }
  return result;
}