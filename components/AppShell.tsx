import Image from "next/image";
import { IntentPrefetchLink } from "@/components/IntentPrefetchLink";
import type { ReactNode } from "react";

import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { SiteHeader } from "@/components/SiteHeader";



import styles from "./app-shell.module.css";
import humanStyles from "./human-first-shell.module.css";

type AppShellProps = {
  children: ReactNode;
};



const footerLinks = [
  { href: "/chart", label: "ساخت چارت تولد" },
  { href: "/compare", label: "تحلیل رابطه" },
  { href: "/sky", label: "آسمان امروز" },
  { href: "/wiki", label: "ویکی آسترولوژی" },
  { href: "/privacy", label: "حریم خصوصی" },
] as const;

// HALLEUS_WIKI_CTA_RUNTIME_V18
// HALLEUS_WIKI_CTA_END_GEOMETRY_SYNC_V19_REPAIR
// HALLEUS_WIKI_CTA_END_SCROLL_OFFSET_V20
const WIKI_EDITORIAL_CTA_RUNTIME = "(() => {\n  const RUNTIME_KEY = \"__HALLEUS_WIKI_CTA_RUNTIME_V18__\";\n  const REVIEWED_SELECTOR = '[data-wiki-editorial-reviewed=\"true\"]';\n  const ARTICLE_BODY_ID = \"wiki-article-body\";\n  const INLINE_CTA_ID = \"wiki-article-inline-cta\";\n  const CARD_SELECTOR = '[data-wiki-editorial-mobile-cta=\"true\"]';\n  const CHROME_CONTROL_SELECTOR =\n    '[data-mobile-account-fab], [data-wiki-chrome-control=\"back-to-top\"]';\n  const MOBILE_MEDIA = window.matchMedia(\"(max-width: 720px)\");\n  const CHROME_MEDIA = window.matchMedia(\"(max-width: 760px)\");\n  const REDUCE_MOTION = window.matchMedia(\"(prefers-reduced-motion: reduce)\");\n  const revealProgress = 0.35;\n  const visibleAttentionMs = 15000;\n  const visibleDurationMs = 8000;\n  const exitDurationMs = 240;\n  const minSafeViewportHeight = 320;\n\n  if (window[RUNTIME_KEY]?.version === \"v18\") {\n    window[RUNTIME_KEY].scan();\n    return;\n  }\n\n  let activeRoot = null;\n  let activeController = null;\n  let scanQueued = false;\n\n  const queueScan = () => {\n    if (scanQueued) return;\n    scanQueued = true;\n    queueMicrotask(() => {\n      scanQueued = false;\n      scan();\n    });\n  };\n\n  const createController = (root) => {\n    const cleanups = [];\n    let disposed = false;\n    let currentCard = null;\n    let currentEnd = null;\n    let endObserver = null;\n    let endInView = false;\n    let deferredChromeControl = null;\n    let hasEverReachedEnd = false;\n    let blockedByEnd = false;\n    let shown = false;\n    let phase = \"idle\";\n    let visibilityTimer = null;\n    let exitTimer = null;\n    let countdownFrame = null;\n    let remainingMs = visibleDurationMs;\n    let previousTick = 0;\n    let pointerPaused = false;\n    let touchPaused = false;\n    let focusPaused = false;\n    let accumulatedVisibleMs = 0;\n    let visibleStartedAt =\n      document.visibilityState === \"visible\" ? performance.now() : null;\n\n    const body = document.body;\n\n    const add = (target, type, listener, options) => {\n      target.addEventListener(type, listener, options);\n      cleanups.push(() => target.removeEventListener(type, listener, options));\n    };\n\n    const clearExitTimer = () => {\n      if (exitTimer === null) return;\n      window.clearTimeout(exitTimer);\n      exitTimer = null;\n    };\n\n    const clearVisibilityTimer = () => {\n      if (visibilityTimer === null) return;\n      window.clearTimeout(visibilityTimer);\n      visibilityTimer = null;\n    };\n\n    const cancelCountdown = () => {\n      if (countdownFrame === null) return;\n      window.cancelAnimationFrame(countdownFrame);\n      countdownFrame = null;\n    };\n\n    const syncVisibleClock = (now) => {\n      const visible = document.visibilityState === \"visible\";\n      if (visible) {\n        if (visibleStartedAt === null) visibleStartedAt = now;\n        return true;\n      }\n      if (visibleStartedAt !== null) {\n        accumulatedVisibleMs += Math.max(0, now - visibleStartedAt);\n        visibleStartedAt = null;\n      }\n      return false;\n    };\n\n    const currentVisibleMs = (now) =>\n      accumulatedVisibleMs +\n      (visibleStartedAt === null ? 0 : Math.max(0, now - visibleStartedAt));\n\n    const chromeControlFocused = () => {\n      const active = document.activeElement;\n      return (\n        active instanceof HTMLElement &&\n        Boolean(active.closest(CHROME_CONTROL_SELECTOR))\n      );\n    };\n\n    const getCard = () =>\n      root.querySelector(CARD_SELECTOR);\n\n    const getProgressRect = (card) =>\n      card?.querySelector(\"[data-wiki-cta-progress]\") ?? null;\n\n    const updateTabVisibility = () => {\n      const card = currentCard ?? getCard();\n      if (!(card instanceof HTMLElement)) return;\n      currentCard = card;\n      const visible = document.visibilityState === \"visible\";\n      const disabled = !visible || phase === \"exiting\";\n      card.setAttribute(\"data-tab-visible\", visible ? \"true\" : \"false\");\n      card.setAttribute(\"aria-hidden\", visible ? \"false\" : \"true\");\n      card.querySelectorAll(\"a,button\").forEach((node) => {\n        if (!(node instanceof HTMLElement)) return;\n        if (disabled) node.setAttribute(\"tabindex\", \"-1\");\n        else node.removeAttribute(\"tabindex\");\n      });\n    };\n\n    const setCardHiddenForViewport = () => {\n      const card = currentCard ?? getCard();\n      if (!(card instanceof HTMLElement)) return;\n      currentCard = card;\n\n      if (phase === \"visible\" || phase === \"exiting\") {\n        const active =\n          MOBILE_MEDIA.matches &&\n          window.innerHeight >= minSafeViewportHeight &&\n          document.visibilityState === \"visible\";\n        card.hidden = !active;\n        if (active) body.setAttribute(\"data-wiki-card-active\", \"true\");\n        else body.removeAttribute(\"data-wiki-card-active\");\n      }\n    };\n\n    const finishImmediate = () => {\n      clearExitTimer();\n      cancelCountdown();\n      phase = \"done\";\n      shown = true;\n      body.removeAttribute(\"data-wiki-card-active\");\n      const card = currentCard ?? getCard();\n      if (card instanceof HTMLElement) {\n        currentCard = card;\n        card.hidden = true;\n        card.setAttribute(\"data-state\", \"done\");\n        card.setAttribute(\"data-exiting\", \"false\");\n        card.querySelectorAll(\"a,button\").forEach((node) => {\n          if (node instanceof HTMLElement) node.setAttribute(\"tabindex\", \"-1\");\n        });\n      }\n    };\n\n    const beginExit = () => {\n      if (phase !== \"visible\") return;\n      if (focusPaused) return;\n\n      if (REDUCE_MOTION.matches) {\n        finishImmediate();\n        return;\n      }\n\n      phase = \"exiting\";\n      body.setAttribute(\"data-wiki-card-active\", \"true\");\n      const card = currentCard ?? getCard();\n      if (card instanceof HTMLElement) {\n        currentCard = card;\n        card.setAttribute(\"data-state\", \"exiting\");\n        card.setAttribute(\"data-exiting\", \"true\");\n        card.querySelectorAll(\"a,button\").forEach((node) => {\n          if (node instanceof HTMLElement) node.setAttribute(\"tabindex\", \"-1\");\n        });\n      }\n\n      clearExitTimer();\n      exitTimer = window.setTimeout(finishImmediate, exitDurationMs);\n    };\n\n    const updateProgress = () => {\n      const card = currentCard ?? getCard();\n      if (!(card instanceof HTMLElement)) return;\n      currentCard = card;\n      const rect = getProgressRect(card);\n      if (!(rect instanceof SVGElement)) return;\n\n      const value = REDUCE_MOTION.matches\n        ? 100\n        : Math.max(0, Math.min(100, (remainingMs / visibleDurationMs) * 100));\n      rect.style.strokeDasharray = `${value} 100`;\n    };\n\n    const countdownTick = (now) => {\n      if (disposed || phase !== \"visible\") return;\n\n      const mobilePaused =\n        !MOBILE_MEDIA.matches ||\n        window.innerHeight < minSafeViewportHeight;\n      const paused =\n        pointerPaused ||\n        touchPaused ||\n        focusPaused ||\n        document.visibilityState !== \"visible\" ||\n        mobilePaused;\n\n      const delta = Math.max(0, now - previousTick);\n      previousTick = now;\n\n      if (!paused) {\n        remainingMs = Math.max(0, remainingMs - delta);\n        updateProgress();\n        if (remainingMs === 0) {\n          beginExit();\n          return;\n        }\n      }\n\n      countdownFrame = window.requestAnimationFrame(countdownTick);\n    };\n\n    const startCountdown = () => {\n      cancelCountdown();\n      previousTick = performance.now();\n      countdownFrame = window.requestAnimationFrame(countdownTick);\n    };\n\n    const bindCard = () => {\n      const card = getCard();\n      if (!(card instanceof HTMLElement) || card === currentCard) return;\n\n      currentCard = card;\n\n      const dismiss = card.querySelector(\"[data-wiki-cta-dismiss]\");\n      const onDismiss = () => finishImmediate();\n      if (dismiss) add(dismiss, \"click\", onDismiss);\n\n      const onPointerEnter = (event) => {\n        if (event.pointerType === \"mouse\") pointerPaused = true;\n      };\n      const onPointerLeave = (event) => {\n        if (event.pointerType === \"mouse\") pointerPaused = false;\n      };\n      const onPointerDown = (event) => {\n        if (event.pointerType !== \"touch\") return;\n        const target = event.target;\n        if (target instanceof Element && target.closest(\"a,button\")) return;\n        touchPaused = true;\n        pointerPaused = true;\n      };\n      const releaseTouch = () => {\n        if (!touchPaused) return;\n        touchPaused = false;\n        pointerPaused = false;\n      };\n      const onFocusIn = () => {\n        focusPaused = true;\n      };\n      const onFocusOut = (event) => {\n        const next = event.relatedTarget;\n        if (!(next instanceof Node) || !card.contains(next)) {\n          focusPaused = false;\n        }\n      };\n\n      add(card, \"pointerenter\", onPointerEnter);\n      add(card, \"pointerleave\", onPointerLeave);\n      add(card, \"pointerdown\", onPointerDown);\n      add(card, \"pointerup\", releaseTouch);\n      add(card, \"pointercancel\", releaseTouch);\n      add(card, \"focusin\", onFocusIn);\n      add(card, \"focusout\", onFocusOut);\n\n      card.hidden = phase !== \"visible\" && phase !== \"exiting\";\n      card.setAttribute(\"data-state\", phase);\n      card.setAttribute(\"data-exiting\", phase === \"exiting\" ? \"true\" : \"false\");\n      updateTabVisibility();\n      updateProgress();\n    };\n\n    const applyEndState = (inView) => {\n      endInView = inView;\n\n      if (!inView) {\n        body.removeAttribute(\"data-wiki-end-cta-in-view\");\n        if (deferredChromeControl) {\n          deferredChromeControl.removeEventListener(\"blur\", applyDeferredEndState);\n          deferredChromeControl = null;\n        }\n        return;\n      }\n\n      if (chromeControlFocused()) {\n        if (deferredChromeControl) {\n          deferredChromeControl.removeEventListener(\"blur\", applyDeferredEndState);\n        }\n        deferredChromeControl = document.activeElement;\n        deferredChromeControl?.addEventListener(\"blur\", applyDeferredEndState, {\n          once: true,\n        });\n        return;\n      }\n\n      body.setAttribute(\"data-wiki-end-cta-in-view\", \"true\");\n    };\n\n    function applyDeferredEndState() {\n      deferredChromeControl = null;\n      if (CHROME_MEDIA.matches && endInView) {\n        body.setAttribute(\"data-wiki-end-cta-in-view\", \"true\");\n      }\n    }\n\n    const markEndReached = () => {\n      if (hasEverReachedEnd) return;\n      hasEverReachedEnd = true;\n      if (!shown) {\n        blockedByEnd = true;\n        return;\n      }\n      finishImmediate();\n    };\n\n    const disconnectEndObserver = () => {\n      endObserver?.disconnect();\n      endObserver = null;\n      currentEnd = null;\n      applyEndState(false);\n    };\n\n    const syncEndGeometry = (target) => {\n      const rect = target.getBoundingClientRect();\n      const hasRectLayout = rect.width > 0 || rect.height > 0;\n      const rectInView =\n        hasRectLayout && rect.top < window.innerHeight && rect.bottom > 0;\n      const rectAlreadyPassed = hasRectLayout && rect.bottom <= 0;\n\n      const scroller = document.scrollingElement;\n      const viewportTop =\n        scroller instanceof HTMLElement ? scroller.scrollTop : window.scrollY;\n      const viewportBottom = viewportTop + window.innerHeight;\n\n      let offsetTop = 0;\n      let offsetNode = target;\n      while (offsetNode instanceof HTMLElement) {\n        offsetTop += offsetNode.offsetTop;\n        offsetNode = offsetNode.offsetParent;\n      }\n\n      const offsetHeight = target.offsetHeight;\n      const hasOffsetLayout = offsetHeight > 0;\n      const offsetBottom = offsetTop + offsetHeight;\n      const offsetInView =\n        hasOffsetLayout &&\n        offsetTop < viewportBottom &&\n        offsetBottom > viewportTop;\n      const offsetAlreadyPassed =\n        hasOffsetLayout && offsetBottom <= viewportTop;\n\n      const inView = rectInView || offsetInView;\n      const alreadyPassed = rectAlreadyPassed || offsetAlreadyPassed;\n\n      if (inView || alreadyPassed) markEndReached();\n      applyEndState(inView);\n    };\n\n    const connectEndObserver = () => {\n      if (!CHROME_MEDIA.matches) {\n        disconnectEndObserver();\n        return;\n      }\n\n      const target = document.getElementById(INLINE_CTA_ID);\n      if (!(target instanceof HTMLElement)) return;\n\n      if (target === currentEnd && endObserver) {\n        syncEndGeometry(target);\n        return;\n      }\n\n      disconnectEndObserver();\n      currentEnd = target;\n      syncEndGeometry(target);\n\n      endObserver = new IntersectionObserver(([entry]) => {\n        if (!entry || disposed) return;\n        const entryRect = entry.boundingClientRect;\n        const entryHasLayout =\n          entryRect.width > 0 || entryRect.height > 0;\n\n        if (\n          entryHasLayout &&\n          (entry.isIntersecting || entryRect.bottom <= 0)\n        ) {\n          markEndReached();\n        }\n\n        applyEndState(entryHasLayout && entry.isIntersecting);\n      }, { threshold: 0, rootMargin: \"0px\" });\n\n      endObserver.observe(target);\n    };\n\n    const showCard = () => {\n      bindCard();\n      const card = currentCard ?? getCard();\n      if (!(card instanceof HTMLElement)) return false;\n\n      currentCard = card;\n      shown = true;\n      phase = \"visible\";\n      remainingMs = visibleDurationMs;\n      card.hidden = false;\n      card.setAttribute(\"data-state\", \"visible\");\n      card.setAttribute(\"data-exiting\", \"false\");\n      body.setAttribute(\"data-wiki-card-active\", \"true\");\n      updateTabVisibility();\n      updateProgress();\n      setCardHiddenForViewport();\n      startCountdown();\n      return true;\n    };\n\n    const evaluateEligibility = () => {\n      if (disposed || shown || blockedByEnd || hasEverReachedEnd) return;\n\n      bindCard();\n      connectEndObserver();\n\n      const now = performance.now();\n      if (!syncVisibleClock(now)) return;\n      if (currentVisibleMs(now) < visibleAttentionMs) return;\n      if (!MOBILE_MEDIA.matches) return;\n      if (window.innerHeight < minSafeViewportHeight) return;\n      if (chromeControlFocused()) return;\n\n      const article = document.getElementById(ARTICLE_BODY_ID);\n      if (!(article instanceof HTMLElement)) return;\n\n      const rect = article.getBoundingClientRect();\n      if (!(rect.height > 0)) return;\n\n      const top = rect.top + window.scrollY;\n      const progress = Math.min(\n        1,\n        Math.max(0, (window.scrollY - top) / rect.height),\n      );\n\n      if (progress < revealProgress) return;\n      showCard();\n    };\n\n    const scheduleVisibilityProbe = () => {\n      if (disposed || shown) return;\n      clearVisibilityTimer();\n      visibilityTimer = window.setTimeout(() => {\n        visibilityTimer = null;\n        evaluateEligibility();\n        scheduleVisibilityProbe();\n      }, 250);\n    };\n\n    const onVisibility = () => {\n      const now = performance.now();\n      syncVisibleClock(now);\n      updateTabVisibility();\n      setCardHiddenForViewport();\n      evaluateEligibility();\n    };\n\n    const onResizeOrScroll = () => {\n      setCardHiddenForViewport();\n      connectEndObserver();\n      evaluateEligibility();\n    };\n\n    const onMobileMedia = () => {\n      setCardHiddenForViewport();\n      evaluateEligibility();\n    };\n\n    const onChromeMedia = () => {\n      connectEndObserver();\n      evaluateEligibility();\n    };\n\n    const onReduceMotion = () => {\n      updateProgress();\n    };\n\n    add(document, \"visibilitychange\", onVisibility);\n    add(window, \"scroll\", onResizeOrScroll, { passive: true });\n    add(window, \"resize\", onResizeOrScroll);\n    add(document, \"focusin\", evaluateEligibility);\n    add(document, \"focusout\", evaluateEligibility);\n    add(MOBILE_MEDIA, \"change\", onMobileMedia);\n    add(CHROME_MEDIA, \"change\", onChromeMedia);\n    add(REDUCE_MOTION, \"change\", onReduceMotion);\n\n    bindCard();\n    connectEndObserver();\n    evaluateEligibility();\n    scheduleVisibilityProbe();\n\n    return {\n      refresh() {\n        bindCard();\n        connectEndObserver();\n        evaluateEligibility();\n      },\n      cleanup() {\n        if (disposed) return;\n        disposed = true;\n        clearVisibilityTimer();\n        clearExitTimer();\n        cancelCountdown();\n        disconnectEndObserver();\n        for (const cleanup of cleanups.splice(0)) cleanup();\n        body.removeAttribute(\"data-wiki-card-active\");\n        body.removeAttribute(\"data-wiki-end-cta-in-view\");\n        if (currentCard instanceof HTMLElement) {\n          currentCard.hidden = true;\n          currentCard.setAttribute(\"data-state\", \"done\");\n        }\n      },\n    };\n  };\n\n  function scan() {\n    const root = document.querySelector(REVIEWED_SELECTOR);\n\n    if (root === activeRoot && activeController) {\n      activeController.refresh();\n      return;\n    }\n\n    activeController?.cleanup();\n    activeController = null;\n    activeRoot = root;\n\n    if (root instanceof HTMLElement) {\n      activeController = createController(root);\n    }\n  }\n\n  const observer = new MutationObserver(queueScan);\n  observer.observe(document.documentElement, {\n    childList: true,\n    subtree: true,\n  });\n\n  window[RUNTIME_KEY] = {\n    version: \"v18\",\n    scan,\n    teardown() {\n      activeController?.cleanup();\n      activeController = null;\n      activeRoot = null;\n      observer.disconnect();\n    },\n  };\n\n  if (document.readyState === \"loading\") {\n    document.addEventListener(\"DOMContentLoaded\", scan, { once: true });\n  } else {\n    scan();\n  }\n})();";

export function AppShell({ children }: AppShellProps) {


  return (
    <div className={`${styles.shell} ${humanStyles.humanShell}`}>
      <SiteHeader />
      <main className={styles.main} id="main-content">
        {children}
      </main>

      <script dangerouslySetInnerHTML={{ __html: WIKI_EDITORIAL_CTA_RUNTIME }} />

      <IntentPrefetchLink
        className={styles.backToTop}
        data-wiki-chrome-control="back-to-top"
        href="#main-content"
        aria-label="پرش به ابتدای محتوای صفحه"
      >
        <span aria-hidden="true">↑</span>
        پرش به بالا
      </IntentPrefetchLink>

      <footer
        data-approved-lockup="/halleus-logo/logo-horizontal-bilingual-final-20260804.png"
        className={`site-footer ${styles.footer}`}
      >
        <div className={styles.footerAtmosphere} aria-hidden="true">
          <span className={styles.footerPlanet} />
          <span className={styles.footerOrbitPrimary} />
          <span className={styles.footerOrbitSecondary} />
          <span className={styles.footerSignal} />
        </div>

        <div className={`footer-inner ${styles.footerInner}`}>
          <div className={`footer-brand-block ${styles.footerBrandBlock}`}>
            <IntentPrefetchLink className={styles.footerBrand} href="/" aria-label="هالیوس">
              <span className={styles.footerLogoPlate}>
                <Image
                  src="/halleus-logo/logo-horizontal-bilingual-final-20260804.png"
                  alt=""
                  width={1805}
                  height={624}
                  sizes="150px"
                  className={styles.footerLogo}
                  data-logo-variant="approved-final"
                  style={{ filter: "brightness(0) invert(1)", opacity: 1 }}
                />
              </span>
            </IntentPrefetchLink>

            <p className={`footer-note ${styles.footerNote}`}>
              تجربه‌ای فارسی برای دیدن آسمان امروز، ساخت چارت تولد و یادگیری معنای نمادین چارت.
            </p>

            <p className={styles.footerResponsibility}>
              برای خودشناسی نمادین، نه تصمیم‌گیری قطعی
            </p>

            <a
              className={styles.footerSocialLink}
              href="https://www.instagram.com/halleus_ir/"
              target="_blank"
              rel="noreferrer noopener"
              aria-label="اینستاگرام هالیوس"
              title="اینستاگرام هالیوس"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.25" />
                <circle
                  cx="17.4"
                  cy="6.6"
                  r="1"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </a>
          </div>

          <div className={styles.footerNavBlock} aria-label="مسیرهای اصلی">
            <span className={styles.footerNavTitle}>دسترسی سریع</span>
            <div className={`footer-links ${styles.footerLinks}`}>
              {footerLinks.map((link) => (
                <IntentPrefetchLink
                  className={`footer-link ${styles.footerLink}`}
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </IntentPrefetchLink>
              ))}
            </div>
          </div>

          <div
            className={styles.footerNavBlock}
            aria-label="نماد اعتماد الکترونیکی"
          >
            <span className={styles.footerNavTitle}>نماد اعتماد الکترونیکی</span>
            <a
              referrerPolicy="origin"
              target="_blank"
              href="https://trustseal.enamad.ir/?id=7712150&Code=REotxbaOeOKqzFNRhbT9IMjWC8IqBTAA"
              aria-label="نماد اعتماد الکترونیکی هالیوس"
              title="نماد اعتماد الکترونیکی هالیوس"
              style={{ width: "fit-content" }}
            >
              <img
                referrerPolicy="origin"
                src="https://trustseal.enamad.ir/logo.aspx?id=7712150&Code=REotxbaOeOKqzFNRhbT9IMjWC8IqBTAA"
                alt=""
                style={{ cursor: "pointer", display: "block" }}
                {...{ code: "REotxbaOeOKqzFNRhbT9IMjWC8IqBTAA" }}
              />
            </a>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>
            ©{" "}
            {new Date().getFullYear().toLocaleString("fa-IR", {
              useGrouping: false,
            })}{" "}
            هالیوس
          </span>
          <span className={styles.footerBottomNote}>داده واقعی · خوانش فارسی · مرزهای روشن</span>
        </div>

      </footer>

      <AnalyticsConsent />
    </div>
  );
}