/**
 * Tiny ZIP (STORE) packer for temporary, local-only Nemad Man PNG previews.
 * PNG is already compressed; STORE avoids external dependencies and 24 browser
 * download prompts. This does not render or modify any poster.
 */
type NemadZipEntry = { name: string; png: Blob };

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let i = 0; i < 8; i++) c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
  crcTable[n] = c >>> 0;
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export async function packageNemadPosterPngs(entries: NemadZipEntry[]): Promise<Blob> {
  if (entries.length !== 24) throw new Error('بستهٔ نماد من باید دقیقاً ۲۴ تصویر داشته باشد.');
  const names = new Set<string>();
  const parts: BlobPart[] = [];
  const central: ArrayBuffer[] = [];
  const encoder = new TextEncoder();
  let offset = 0;
  let directoryBytes = 0;

  for (const entry of entries) {
    if (!/^[0-9]{2}-[a-z]+-sign-(dark|light)\.png$/.test(entry.name) || names.has(entry.name)) {
      throw new Error('نام فایل‌های خروجی تکراری یا نامعتبر است.');
    }
    names.add(entry.name);
    const content = new Uint8Array(await entry.png.arrayBuffer());
    if (entry.png.type !== 'image/png' || content.length < 24 ||
        content[0] !== 137 || content[1] !== 80 || content[2] !== 78 || content[3] !== 71 ||
        content[4] !== 13 || content[5] !== 10 || content[6] !== 26 || content[7] !== 10) {
      throw new Error('خروجی PNG معتبر نیست: ' + entry.name);
    }

    const filename = encoder.encode(entry.name);
    const length = content.byteLength;
    if (length > 0xffffffff || filename.length > 0xffff || offset + 30 + filename.length + length > 0xffffffff) {
      throw new Error('حجم بسته برای قالب ZIP معمولی بیش از حد است.');
    }
    const checksum = crc32(content);

    const local = new ArrayBuffer(30 + filename.length);
    const a = new DataView(local);
    a.setUint32(0, 0x04034b50, true);
    a.setUint16(4, 20, true);
    a.setUint16(6, 0x0800, true);
    a.setUint16(8, 0, true);
    a.setUint16(12, 33, true);
    a.setUint32(14, checksum, true);
    a.setUint32(18, length, true);
    a.setUint32(22, length, true);
    a.setUint16(26, filename.length, true);
    new Uint8Array(local).set(filename, 30);
    parts.push(local, entry.png);

    const centralHeader = new ArrayBuffer(46 + filename.length);
    const b = new DataView(centralHeader);
    b.setUint32(0, 0x02014b50, true);
    b.setUint16(4, 20, true);
    b.setUint16(6, 20, true);
    b.setUint16(8, 0x0800, true);
    b.setUint16(10, 0, true);
    b.setUint16(14, 33, true);
    b.setUint32(16, checksum, true);
    b.setUint32(20, length, true);
    b.setUint32(24, length, true);
    b.setUint16(28, filename.length, true);
    b.setUint32(42, offset, true);
    new Uint8Array(centralHeader).set(filename, 46);
    central.push(centralHeader);
    directoryBytes += centralHeader.byteLength;
    offset += local.byteLength + length;
  }

  if (offset + directoryBytes > 0xffffffff) throw new Error('حجم ZIP بیش از حد است.');
  const end = new ArrayBuffer(22);
  const footer = new DataView(end);
  footer.setUint32(0, 0x06054b50, true);
  footer.setUint16(8, entries.length, true);
  footer.setUint16(10, entries.length, true);
  footer.setUint32(12, directoryBytes, true);
  footer.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}
