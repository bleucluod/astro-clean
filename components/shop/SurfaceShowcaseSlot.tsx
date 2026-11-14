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
/** Public routes have no fallback; samples are supplied only by the development preview. */
export function SurfaceShowcaseSlot({ surface, slot, previewFallback }: {
  surface: ShowcaseSurface; slot: string; previewFallback?: SurfaceOffer;
}) {
  const [publishedOffer, setPublishedOffer] = useState<SurfaceOffer | null>(null);
  useEffect(() => {
    let live = true;
    void load(surface).then(offers => {
      if (live) setPublishedOffer(offers.find(item => item.slot === slot) ?? null);
    });
    return () => { live = false; };
  }, [surface, slot]);
  const offer = publishedOffer ?? previewFallback ?? null;
  if (!offer) return null;
  const isSample = !publishedOffer && !!previewFallback;
  return <div data-shop-showcase-surface={surface} data-shop-showcase-slot={slot}>
    {isSample ? <p style={{ color: "#e1e8ee", fontSize: 14, lineHeight: 1.8, margin: "8px 0 0" }}>
      نمونهٔ چیدمان ویترین · منتشر نشده و بدون ثبت آمار
    </p> : null}
    <WikiShopShowcaseCard offer={offer} track={!previewFallback} trackSurface={surface} />
  </div>;
}
