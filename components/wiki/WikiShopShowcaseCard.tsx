"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { analyticsConfig } from "@/lib/config/analytics";
import type { PublicWikiShopShowcase } from "@/lib/wiki/wiki-shop-showcase";
import type { ShowcaseSurface, SurfaceOffer } from "@/lib/shop/shop-showcase-contract";
import styles from "./wiki-shop-showcase.module.css";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function trackingContext(id: string, surface?: ShowcaseSurface): string | null {
  if (!UUID.test(id)) return null;
  const path = window.location.pathname;
  if (surface === "natal" && !/^\/reports\/[^/]+$/.test(path)) return null;
  if (surface === "synastry" && !/^\/compare\/[^/]+$/.test(path)) return null;
  if (surface === "sky" && path !== "/sky" && !/^\/sky\/\d{4}-\d{2}-\d{2}$/.test(path)) return null;
  if (!surface && !path.startsWith("/wiki/")) return null;
  try {
    const saved = window.localStorage.getItem(analyticsConfig.consentStorageKey);
    if (saved) {
      const setting = JSON.parse(saved) as { choice?: string; version?: number };
      if (setting.version === analyticsConfig.consentVersion && setting.choice === "denied") return null;
    }
  } catch { /* No storage access means no persisted opt-out. */ }
  if (surface) return surface; // no report URL, ID, chart data, or personal context
  const slug = path.slice("/wiki/".length).replace(/\/$/, "");
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ? slug : null;
}

function reportShowcaseEvent(id: string, event: "impression" | "click", surface?: ShowcaseSurface) {
  const context = trackingContext(id, surface);
  if (!context) return;
  const endpoint = surface ? "/api/shop/showcase-event" : "/api/wiki/showcase-event";
  const data = JSON.stringify(surface ? { id, surface, event } : { id, slug: context, event });
  const body = new Blob([data], { type: "application/json" });
  try {
    if (navigator.sendBeacon?.(endpoint, body)) return;
    void fetch(endpoint, {
      method: "POST", body, keepalive: true, credentials: "omit",
    }).catch(() => {});
  } catch { /* Measurements may fail; the product link remains usable. */ }
}

/** The preview is untracked; public cards opt in explicitly. No visitor identity is stored. */
export function WikiShopShowcaseCard({ offer, track = false, trackSurface }: {
  offer: PublicWikiShopShowcase | SurfaceOffer; track?: boolean;
  trackSurface?: ShowcaseSurface;
}) {
  const ref = useRef<HTMLElement>(null);
  const impressionSent = useRef(false);

  useEffect(() => {
    if (!track || !UUID.test(offer.id) || !ref.current ||
      typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stop = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (impressionSent.current) return;
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.5 ||
        document.visibilityState !== "visible") { stop(); return; }
      if (timer !== null) return;
      timer = setTimeout(() => {
        timer = null;
        if (document.visibilityState === "visible" && !impressionSent.current) {
          impressionSent.current = true;
          reportShowcaseEvent(offer.id, "impression", trackSurface);
          observer.disconnect();
        }
      }, 750);
    }, { threshold: [0, 0.5, 1] });
    observer.observe(ref.current);
    document.addEventListener("visibilitychange", stop);
    return () => { stop(); observer.disconnect(); document.removeEventListener("visibilitychange", stop); };
  }, [offer.id, track, trackSurface]);

  const recordClick = () => {
    if (!track) return;
    if (!impressionSent.current) {
      impressionSent.current = true;
      reportShowcaseEvent(offer.id, "impression", trackSurface);
    }
    reportShowcaseEvent(offer.id, "click", trackSurface);
  };

  return <aside ref={ref} aria-label="اثر مرتبط از فروشگاه هالیوس">
    <Link href={offer.url} className={styles.card}
      aria-label={offer.title + "؛ دیدن در فروشگاه هالیوس"}
      onClick={recordClick} onAuxClick={(event) => { if (event.button === 1) recordClick(); }}>
      <span className={styles.image}>
        <Image src={offer.image} alt={offer.imageAlt} fill
          sizes="(max-width: 760px) 240px, 180px" />
      </span>
      <span className={styles.content}>
        <span className={styles.eyebrow}>از فروشگاه هالیوس</span>
        <span className={styles.title}>{offer.title}</span>
        <span className={styles.description}>{offer.description}</span>
        <span className={styles.link}>
          <span>{offer.buttonLabel}</span>
          <span className={styles.arrow} aria-hidden="true">←</span>
        </span>
      </span>
    </Link>
  </aside>;
}
