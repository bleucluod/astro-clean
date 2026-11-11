'use client';

import { useRef, type TouchEvent } from 'react';

/** Mobile-only horizontal gallery swipe; vertical page scrolling remains native. */
export function useShopGallerySwipe(onSwipe: (step: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const suppressZoomUntil = useRef(0);

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    if (event.touches.length !== 1) {
      start.current = null;
      return;
    }
    start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    const origin = start.current;
    start.current = null;
    if (!origin || event.changedTouches.length !== 1
      || !window.matchMedia('(max-width: 760px)').matches) return;
    const dx = event.changedTouches[0].clientX - origin.x;
    const dy = event.changedTouches[0].clientY - origin.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;
    suppressZoomUntil.current = Date.now() + 500;
    onSwipe(dx < 0 ? 1 : -1);
  }

  function onTouchCancel() {
    start.current = null;
  }

  return {
    touchHandlers: { onTouchStart, onTouchEnd, onTouchCancel },
    canOpenZoom: () => Date.now() > suppressZoomUntil.current,
  };
}
