import { ShopQuoteError, quoteShopItems } from '@/lib/shop/shop-quote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

export async function POST(request: Request) {
  // The physical shop is still closed in production. No live payment or order is accepted.
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ ok: false }, { status: 404, headers });
  }

  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > 8_000) return Response.json({ ok: false }, { status: 413, headers });

  try {
    const body = await request.text();
    if (body.length > 8_000) return Response.json({ ok: false }, { status: 413, headers });
    const quote = quoteShopItems(JSON.parse(body));
    return Response.json({ ok: true, quote }, { headers });
  } catch (error) {
    if (error instanceof ShopQuoteError || error instanceof SyntaxError) {
      return Response.json({ ok: false }, { status: 400, headers });
    }
    return Response.json({ ok: false }, { status: 500, headers });
  }
}
