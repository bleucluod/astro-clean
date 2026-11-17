import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { notFound } from 'next/navigation';

// Development-only font trial, never a public production asset.
export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') notFound();
  const archive = await readFile(join(process.cwd(), 'assets/shop-print/fonts/Far_Ziba.zip'));
  let offset = 0;
  while (offset + 30 <= archive.length && archive.readUInt32LE(offset) === 0x04034b50) {
    const flags = archive.readUInt16LE(offset + 6);
    const method = archive.readUInt16LE(offset + 8);
    const compressedLength = archive.readUInt32LE(offset + 18);
    const rawLength = archive.readUInt32LE(offset + 22);
    const filenameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const filename = archive.toString('utf8', offset + 30, offset + 30 + filenameLength);
    const start = offset + 30 + filenameLength + extraLength;
    const end = start + compressedLength;
    if (end > archive.length) throw new Error('Invalid Far Ziba archive bounds');
    if (filename === 'Far_Ziba/Far_Ziba.ttf') {
      if (flags !== 0 || method !== 8 || rawLength !== 47400) {
        throw new Error('Unexpected Far Ziba archive format');
      }
      const font = inflateRawSync(archive.subarray(start, end));
      if (font.length !== rawLength || font.readUInt32BE(0) !== 0x00010000) {
        throw new Error('Invalid Far Ziba TrueType font');
      }
      return new Response(new Uint8Array(font), {
        headers: { 'Content-Type': 'font/ttf', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
      });
    }
    offset = end;
  }
  throw new Error('Far_Ziba.ttf missing from owner-provided font archive');
}
