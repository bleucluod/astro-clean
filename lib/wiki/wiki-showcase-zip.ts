import { deflateRawSync, inflateRawSync } from "node:zlib";

export type ZipFile = { name: string; data: string | Uint8Array };
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });
const MAX_ENTRY = 12_000_000;
const MAX_TOTAL = 20_000_000;
const MAX_FILES = 120;

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const u16 = (value: number) => [value & 255, (value >>> 8) & 255];
const u32 = (value: number) => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];

export function makeWikiShowcaseZip(entries: ZipFile[]): Uint8Array {
  if (!entries.length || entries.length > MAX_FILES) throw new Error("ZIP file count is invalid");
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  const names = new Set<string>();
  let offset = 0, total = 0;
  for (const entry of entries) {
    if (!safeName(entry.name) || names.has(entry.name)) throw new Error("Unsafe or duplicate ZIP path");
    names.add(entry.name);
    const filename = textEncoder.encode(entry.name);
    const input = typeof entry.data === "string" ? textEncoder.encode(entry.data) : entry.data;
    total += input.byteLength;
    if (input.byteLength > MAX_ENTRY || total > MAX_TOTAL) throw new Error("ZIP content limit exceeded");
    const compressed = deflateRawSync(input, { level: 6 });
    const crc = crc32(input);
    const header = Uint8Array.from([
      ...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(8), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(compressed.length), ...u32(input.length), ...u16(filename.length), ...u16(0),
    ]);
    parts.push(header, filename, compressed);
    central.push(Uint8Array.from([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(8),
      ...u16(0), ...u16(0), ...u32(crc), ...u32(compressed.length), ...u32(input.length),
      ...u16(filename.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
    ]), filename);
    offset += header.length + filename.length + compressed.length;
  }
  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = Uint8Array.from([...u32(0x06054b50), ...u16(0), ...u16(0),
    ...u16(entries.length), ...u16(entries.length), ...u32(centralSize), ...u32(offset), ...u16(0)]);
  return concat([...parts, ...central, end]);
}
function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}
function safeName(name: string): boolean {
  return Boolean(name && name.length < 256 && !name.includes("\\") && !name.includes("..") &&
    !name.startsWith("/") && !name.startsWith(".") && !name.includes("//") &&
    !/[\u0000-\u001f]/.test(name) &&
    name.split("/").every((part) => part.length > 0 && !part.startsWith(".")));
}

/** Read a small, unencrypted ordinary ZIP using the central directory, not untrusted filenames. */
export function readWikiShowcaseZip(bytes: Uint8Array): Map<string, string> {
  if (bytes.length > MAX_TOTAL || bytes.length < 22) throw new Error("ZIP size is invalid");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16at = (i: number) => view.getUint16(i, true);
  const u32at = (i: number) => view.getUint32(i, true);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (u32at(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("ZIP directory not found");
  const count = u16at(eocd + 10), directorySize = u32at(eocd + 12);
  let pos = u32at(eocd + 16), total = 0;
  if (count > MAX_FILES || count === 0 || pos + directorySize > eocd) throw new Error("Invalid ZIP directory");
  const result = new Map<string, string>();
  for (let i = 0; i < count; i += 1) {
    if (pos + 46 > bytes.length || u32at(pos) !== 0x02014b50) throw new Error("Invalid ZIP entry");
    const flags = u16at(pos + 8), method = u16at(pos + 10);
    const crc = u32at(pos + 16), compSize = u32at(pos + 20), origSize = u32at(pos + 24);
    const nlen = u16at(pos + 28), extra = u16at(pos + 30), comment = u16at(pos + 32);
    const at = u32at(pos + 42);
    if (flags & 1 || ![0, 8].includes(method) || origSize > MAX_ENTRY ||
        at + 30 > bytes.length || pos + 46 + nlen + extra + comment > bytes.length ||
        u32at(at) !== 0x04034b50) throw new Error("ZIP entry format rejected");
    const name = textDecoder.decode(bytes.subarray(pos + 46, pos + 46 + nlen));
    if (!safeName(name) || result.has(name)) throw new Error("Unsafe ZIP entry");
    const locLength = u16at(at + 26), locExtra = u16at(at + 28);
    const start = at + 30 + locLength + locExtra;
    if (start + compSize > bytes.length) throw new Error("Truncated ZIP entry");
    const data = method === 8
      ? inflateRawSync(bytes.subarray(start, start + compSize), { maxOutputLength: MAX_ENTRY })
      : bytes.subarray(start, start + compSize);
    if (data.length !== origSize || crc32(data) !== crc) throw new Error("Invalid ZIP checksum");
    total += data.length;
    if (total > MAX_TOTAL) throw new Error("ZIP expanded size exceeded");
    result.set(name, textDecoder.decode(data));
    pos += 46 + nlen + extra + comment;
  }
  if (pos !== u32at(eocd + 16) + directorySize) throw new Error("ZIP directory mismatch");
  return result;
}
