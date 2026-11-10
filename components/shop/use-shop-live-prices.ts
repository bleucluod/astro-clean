'use client';

import { useEffect, useState } from 'react';
import type { ShopPriceMap } from '@/lib/shop/shop-price-store';

export type LiveShopPrices = {
  prices: ShopPriceMap | null;
  error: boolean;
};

const requiredKeys = ['p01:10x15', 'p01:20x30', 'p01:30x45', 'p02:10x15', 'p02:20x30', 'p02:30x45'];

/** No stale client cache: checkout and live product prices share the DB authority. */
export function useShopLivePrices(): LiveShopPrices {
  const [prices, setPrices] = useState<ShopPriceMap | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;
    async function load() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      try {
        const response = await fetch('/api/shop/prices', { cache: 'no-store', signal: current.signal });
        const data: unknown = await response.json();
        if (!response.ok || !data || typeof data !== 'object'
          || (data as Record<string, unknown>).ok !== true) throw new Error('price_http');
        const map = (data as Record<string, unknown>).prices;
        if (!map || typeof map !== 'object' || Array.isArray(map)
          || requiredKeys.some(key => {
            const amount = (map as Record<string, unknown>)[key];
            return !Number.isSafeInteger(amount) || Number(amount) < 1000 || Number(amount) > 10_000_000;
          })) throw new Error('price_contract');
        if (active) { setPrices(map as ShopPriceMap); setError(false); }
      } catch (cause) {
        if (current.signal.aborted) return;
        if (active) { setPrices(null); setError(true); }
      }
    }
    void load();
    window.addEventListener('focus', load);
    const interval = window.setInterval(() => void load(), 15_000);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener('focus', load);
      window.clearInterval(interval);
    };
  }, []);
  return { prices, error };
}

export function liveShopPrice(prices: ShopPriceMap | null, productId: string, size: string) {
  return prices?.[productId + ':' + size] ?? null;
}
