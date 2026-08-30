"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { WikiArticleCallToAction } from "@/lib/wiki/wiki-content";
import styles from "../wiki.module.css";

// HALLEUS_WIKI_MOBILE_STICKY_CTA
const MOBILE_MEDIA_QUERY = "(max-width: 720px)";
// HALLEUS_WIKI_MOBILE_STICKY_CTA_CONTENT_PROGRESS
const REVEAL_PROGRESS = 0.22;
const DISMISS_LABEL = "بستن پیشنهاد";

type WikiStickyCtaProps = {
  callToAction: WikiArticleCallToAction;
  contentRootId: string;
  inlineCtaId: string;
};

export function WikiStickyCta({
  callToAction,
  contentRootId,
  inlineCtaId,
}: WikiStickyCtaProps) {
  const [eligible, setEligible] = useState(false);
  const [inlineCtaReached, setInlineCtaReached] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA_QUERY);

    const updateEligibility = () => {
      if (!media.matches) {
        setEligible(false);
        return;
      }

      const contentRoot = document.getElementById(contentRootId);
      if (!contentRoot) {
        setEligible(false);
        return;
      }

      const contentTop =
        contentRoot.getBoundingClientRect().top + window.scrollY;
      const contentHeight = Math.max(contentRoot.scrollHeight, 1);
      const progress = Math.min(
        1,
        Math.max(0, (window.scrollY - contentTop) / contentHeight),
      );
      setEligible(progress >= REVEAL_PROGRESS);
    };

    const scheduleEligibilityUpdate = () => {
      if (animationFrame.current !== null) {
        return;
      }

      animationFrame.current = window.requestAnimationFrame(() => {
        animationFrame.current = null;
        updateEligibility();
      });
    };

    scheduleEligibilityUpdate();
    window.addEventListener("scroll", scheduleEligibilityUpdate, {
      passive: true,
    });
    window.addEventListener("resize", scheduleEligibilityUpdate);
    media.addEventListener("change", updateEligibility);

    return () => {
      window.removeEventListener("scroll", scheduleEligibilityUpdate);
      window.removeEventListener("resize", scheduleEligibilityUpdate);
      media.removeEventListener("change", updateEligibility);
      if (animationFrame.current !== null) {
        window.cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [contentRootId]);

  useEffect(() => {
    const inlineCta = document.getElementById(inlineCtaId);
    if (!inlineCta) {
      return;
    }

    const inlineCtaTop =
      inlineCta.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY + window.innerHeight >= inlineCtaTop) {
      const frame = window.requestAnimationFrame(() => {
        setInlineCtaReached(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry?.isIntersecting ||
          (entry && entry.boundingClientRect.bottom <= 0)
        ) {
          setInlineCtaReached(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -4% 0px",
      },
    );

    observer.observe(inlineCta);
    return () => observer.disconnect();
  }, [inlineCtaId]);

  const visible = eligible && !inlineCtaReached && !dismissed;

  return (
    <div
      aria-hidden={!visible}
      className={styles.mobileStickyCta}
      data-visible={visible ? "true" : "false"}
    >
      <Link
        aria-label={`${callToAction.label} - ${callToAction.title}`}
        className={styles.mobileStickyCtaLink}
        href={callToAction.href}
        tabIndex={visible ? undefined : -1}
      >
        <span>{callToAction.label}</span>
        <span aria-hidden="true">{"\u2190"}</span>
      </Link>
      <button
        aria-label={DISMISS_LABEL}
        className={styles.mobileStickyCtaDismiss}
        onClick={() => setDismissed(true)}
        tabIndex={visible ? undefined : -1}
        type="button"
      >
        <span aria-hidden="true">{"\u00d7"}</span>
      </button>
    </div>
  );
}