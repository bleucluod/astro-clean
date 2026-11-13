"use client";

import { useEffect, useState } from "react";
import { WikiShopShowcaseCard } from "@/components/wiki/WikiShopShowcaseCard";
import type { ShowcaseSurface, SurfaceOffer } from "@/lib/shop/shop-showcase-contract";

const responses = new Map<ShowcaseSurface, { at: number; promise: Promise<SurfaceOffer[]> }>();
function load(surface: ShowcaseSurface) {
  const previous = responses.get(surface);
  if (previous && Date.now() - previous.at < 30000) return previous.promise;
  const promise = fetch("/api/shop/showcases?surface=" + surface, { cache: "no-store" })
    .then(async res => {
      if (!res.ok) return [];
      const body = await res.json() as { offers?: SurfaceOffer[] };
      return Array.isArray(body.offers) ? body.offers : [];
    }).catch(() => [] as SurfaceOffer[]);
  responses.set(surface, { at: Date.now(), promise });
  return promise;
}
/** No report ID or personal data is sent. A slot is empty unless an admin activates an offer. */
export function SurfaceShowcaseSlot({ surface, slot }: { surface: ShowcaseSurface; slot: string }) {
  const [offer, setOffer] = useState<SurfaceOffer | null>(null);
  useEffect(() => {
    let live = true;
    void load(surface).then(offers => {
      if (live) setOffer(offers.find(item => item.slot === slot) ?? null);
    });
    return () => { live = false; };
  }, [surface, slot]);
  if (!offer) return null;
  return <div data-shop-showcase-surface={surface} data-shop-showcase-slot={slot}>
    <WikiShopShowcaseCard offer={offer} track trackSurface={surface} />
  </div>;
}
