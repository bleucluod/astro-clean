import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fonts: Readonly<Record<string, string>> = {
  '300': 'Estedad-Light.ttf',
  '400': 'Estedad-Regular.ttf',
  '500': 'Estedad-Medium.ttf',
};

/** A development-only font bridge for exact SVG-to-PNG export.
 * Never serves arbitrary disk paths or exposes this endpoint in production. */
export async function GET(request: NextRequest) {
  const weight = request.nextUrl.searchParams.get('weight');
  const file = weight && Object.hasOwn(fonts, weight) ? fonts[weight] : null;
  if (process.env.NODE_ENV === 'production' || !file) {
    return new Response(null, { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
  }
  try {
    const bytes = await readFile(join(process.cwd(), 'assets', 'shop-print', 'fonts', file));
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'font/ttf',
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch {
    return new Response(null, { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
  }
}
