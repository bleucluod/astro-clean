import { deflateRawSync, inflateRawSync } from "node:zlib";

function crc32(buffer: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value: number) {
  const out = Buffer.allocUnsafe(2); out.writeUInt16LE(value); return out;
}
function u32(value: number) {
  const out = Buffer.allocUnsafe(4); out.writeUInt32LE(value >>> 0); return out;
}

export function createWikiImageZip(entries: Array<{ name: string; bytes: Uint8Array }>) {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    if (!entry.name || entry.name.startsWith("/") || entry.name.includes("..") || entry.name.includes("\\")) {
      throw new Error(`Unsafe ZIP path: ${entry.name}`);
    }
    const name = Buffer.from(entry.name, "utf8");
    const raw = Buffer.from(entry.bytes);
    const compressed = deflateRawSync(raw, { level: 9 });
    const checksum = crc32(raw);
    const header = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(8), u16(0), u16(0x0021),
      u32(checksum), u32(compressed.length), u32(raw.length), u16(name.length), u16(0), name,
    ]);
    local.push(header, compressed);
    central.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(8), u16(0), u16(0x0021),
      u32(checksum), u32(compressed.length), u32(raw.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += header.length + compressed.length;
  }
  const centralBytes = Buffer.concat(central);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralBytes.length), u32(offset), u16(0),
  ]);
  return new Uint8Array(Buffer.concat([...local, centralBytes, end]));
}

export function readWikiImageZip(bytes: Uint8Array, limits = { maxEntries: 20, maxUncompressedBytes: 2_000_000 }) {
  const input = Buffer.from(bytes);
  const eocdStart = Math.max(0, input.length - 65557);
  let eocd = -1;
  for (let index = input.length - 22; index >= eocdStart; index -= 1) {
    if (input.readUInt32LE(index) === 0x06054b50) { eocd = index; break; }
  }
  if (eocd < 0) throw new Error("ZIP_EOCD_MISSING");
  const count = input.readUInt16LE(eocd + 10);
  if (count < 1 || count > limits.maxEntries) throw new Error("ZIP_ENTRY_COUNT_INVALID");
  const centralOffset = input.readUInt32LE(eocd + 16);
  let cursor = centralOffset;
  let total = 0;
  const entries = new Map<string, Uint8Array>();
  for (let item = 0; item < count; item += 1) {
    if (input.readUInt32LE(cursor) !== 0x02014b50) throw new Error("ZIP_CENTRAL_INVALID");
    const method = input.readUInt16LE(cursor + 10);
    const expectedCrc = input.readUInt32LE(cursor + 16);
    const compressedSize = input.readUInt32LE(cursor + 20);
    const rawSize = input.readUInt32LE(cursor + 24);
    const nameLength = input.readUInt16LE(cursor + 28);
    const extraLength = input.readUInt16LE(cursor + 30);
    const commentLength = input.readUInt16LE(cursor + 32);
    const localOffset = input.readUInt32LE(cursor + 42);
    const name = input.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (!name || name.startsWith("/") || name.includes("..") || name.includes("\\") || entries.has(name)) {
      throw new Error("ZIP_PATH_INVALID");
    }
    if (input.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("ZIP_LOCAL_INVALID");
    const localNameLength = input.readUInt16LE(localOffset + 26);
    const localExtraLength = input.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = input.subarray(dataStart, dataStart + compressedSize);
    const raw = method === 0 ? Buffer.from(compressed) : method === 8 ? inflateRawSync(compressed) : null;
    if (!raw || raw.length !== rawSize || crc32(raw) !== expectedCrc) throw new Error("ZIP_ENTRY_INTEGRITY_INVALID");
    total += raw.length;
    if (total > limits.maxUncompressedBytes) throw new Error("ZIP_UNCOMPRESSED_LIMIT");
    entries.set(name, new Uint8Array(raw));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}