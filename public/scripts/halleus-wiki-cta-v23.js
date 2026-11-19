// HALLEUS_WIKI_CTA_RUNTIME_V18
// HALLEUS_WIKI_CTA_SHORT_VIEWPORT_V22
// HALLEUS_WIKI_CTA_GLOBAL_DISMISS_V23
// Loaded only when a reviewed Wiki editorial CTA exists.
(() => {
  const RUNTIME_KEY = "__HALLEUS_WIKI_CTA_RUNTIME_V23__";
  const REVIEWED_SELECTOR = '[data-wiki-editorial-reviewed="true"]';
  const ARTICLE_BODY_ID = "wiki-article-body";
  const INLINE_CTA_ID = "wiki-article-inline-cta";
  const CARD_SELECTOR = '[data-wiki-editorial-mobile-cta="true"]';
  const CHROME_CONTROL_SELECTOR =
    '[data-mobile-account-fab], [data-wiki-chrome-control="back-to-top"]';
  const MOBILE_MEDIA = window.matchMedia("(max-width: 720px)");
  const CHROME_MEDIA = window.matchMedia("(max-width: 760px)");
  const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
  const revealProgress = 0.35;
  const controlExitDurationMs = 220;
  const choreographyGapMs = 70;
  const enterDurationMs = 300;
  const visibleDurationMs = 12000;
  const exitDurationMs = 300;
  const controlReturnDelayMs = 70;
  const dismissStorageKey = "halleus_sticky_cta_dismissed";

  const hasGlobalDismissal = () => {
    try {
      return window.localStorage.getItem(dismissStorageKey) === "1";
    } catch {
      return false;
    }
  };

  const persistGlobalDismissal = () => {
    try {
      window.localStorage.setItem(dismissStorageKey, "1");
    } catch {
      // Storage can be unavailable; dismissal still closes this card.
    }
  };

  if (window[RUNTIME_KEY]?.version === "v23") {
    window[RUNTIME_KEY].scan();
    return;
  }

  let activeRoot = null;
  let activeController = null;
  let scanQueued = false;

  const queueScan = () => {
    if (scanQueued) return;
    scanQueued = true;
    queueMicrotask(() => {
      scanQueued = false;
      scan();
    });
  };

  const createController = (root) => {
    const cleanups = [];
    let disposed = false;
    let currentCard = null;
    let currentEnd = null;
    let endObserver = null;
    let endInView = false;
    let deferredChromeControl = null;
    let hasEverReachedEnd = false;
    let blockedByEnd = false;
    let shown = false;
    let phase = "idle";
    let visibilityTimer = null;
    let choreographyTimer = null;
    let enterTimer = null;
    let exitTimer = null;
    let controlReturnTimer = null;
    let countdownFrame = null;
    let remainingMs = visibleDurationMs;
    let previousTick = 0;
    let pointerPaused = false;
    let touchPaused = false;
    let focusPaused = false;

    const body = document.body;

    const add = (target, type, listener, options) => {
      target.addEventListener(type, listener, options);
      cleanups.push(() => target.removeEventListener(type, listener, options));
    };

    const clearTimer = (name) => {
      if (name === "choreography" && choreographyTimer !== null) {
        window.clearTimeout(choreographyTimer);
        choreographyTimer = null;
      }
      if (name === "enter" && enterTimer !== null) {
        window.clearTimeout(enterTimer);
        enterTimer = null;
      }
      if (name === "exit" && exitTimer !== null) {
        window.clearTimeout(exitTimer);
        exitTimer = null;
      }
      if (name === "controls" && controlReturnTimer !== null) {
        window.clearTimeout(controlReturnTimer);
        controlReturnTimer = null;
      }
    };

    const clearVisibilityTimer = () => {
      if (visibilityTimer === null) return;
      window.clearTimeout(visibilityTimer);
      visibilityTimer = null;
    };

    const cancelCountdown = () => {
      if (countdownFrame === null) return;
      window.cancelAnimationFrame(countdownFrame);
      countdownFrame = null;
    };

    const chromeControlFocused = () => {
      const active = document.activeElement;
      return (
        active instanceof HTMLElement &&
        Boolean(active.closest(CHROME_CONTROL_SELECTOR))
      );
    };

    const getCard = () =>
      root.querySelector(CARD_SELECTOR);

    const getProgressNode = (card) =>
      card?.querySelector("[data-wiki-cta-progress]") ?? null;

    const updateTabVisibility = () => {
      const card = currentCard ?? getCard();
      if (!(card instanceof HTMLElement)) return;
      currentCard = card;
      const tabVisible = document.visibilityState === "visible";
      const interactive = tabVisible && phase === "visible";
      card.setAttribute("data-tab-visible", tabVisible ? "true" : "false");
      card.setAttribute("aria-hidden", interactive ? "false" : "true");
      card.querySelectorAll("a,button").forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (!interactive) node.setAttribute("tabindex", "-1");
        else node.removeAttribute("tabindex");
      });
    };

    const setCardHiddenForViewport = () => {
      const card = currentCard ?? getCard();
      if (!(card instanceof HTMLElement)) return;
      currentCard = card;

      if (["controls-out", "entering", "visible", "exiting"].includes(phase)) {
        const active =
          MOBILE_MEDIA.matches &&
          document.visibilityState === "visible";
        card.hidden = !active || phase === "controls-out";
        if (active) body.setAttribute("data-wiki-card-active", "true");
        else body.removeAttribute("data-wiki-card-active");
      }
    };

    const restoreChromeAfterCard = (immediate = false) => {
      clearTimer("controls");
      if (immediate || REDUCE_MOTION.matches) {
        body.removeAttribute("data-wiki-card-active");
        return;
      }
      controlReturnTimer = window.setTimeout(() => {
        controlReturnTimer = null;
        body.removeAttribute("data-wiki-card-active");
      }, controlReturnDelayMs);
    };

    const finishCardExit = (immediate = false) => {
      clearTimer("choreography");
      clearTimer("enter");
      clearTimer("exit");
      cancelCountdown();
      phase = "done";
      shown = true;
      const card = currentCard ?? getCard();
      if (card instanceof HTMLElement) {
        currentCard = card;
        card.hidden = true;
        card.setAttribute("data-state", "done");
        card.setAttribute("data-exiting", "false");
        card.querySelectorAll("a,button").forEach((node) => {
          if (node instanceof HTMLElement) node.setAttribute("tabindex", "-1");
        });
      }
      restoreChromeAfterCard(immediate);
    };

    const beginExit = (force = false) => {
      if (!["entering", "visible"].includes(phase)) return;
      if (!force && focusPaused) return;

      if (REDUCE_MOTION.matches) {
        finishCardExit(true);
        return;
      }

      clearTimer("enter");
      cancelCountdown();
      phase = "exiting";
      body.setAttribute("data-wiki-card-active", "true");
      const card = currentCard ?? getCard();
      if (card instanceof HTMLElement) {
        currentCard = card;
        card.hidden = false;
        card.setAttribute("data-state", "exiting");
        card.setAttribute("data-exiting", "true");
        card.querySelectorAll("a,button").forEach((node) => {
          if (node instanceof HTMLElement) node.setAttribute("tabindex", "-1");
        });
      }

      clearTimer("exit");
      exitTimer = window.setTimeout(() => {
        exitTimer = null;
        finishCardExit(false);
      }, exitDurationMs);
    };

    const updateProgress = () => {
      const card = currentCard ?? getCard();
      if (!(card instanceof HTMLElement)) return;
      currentCard = card;
      const progress = getProgressNode(card);
      if (!(progress instanceof HTMLElement)) return;

      const elapsedRatio = REDUCE_MOTION.matches
        ? 0
        : Math.max(0, Math.min(1, 1 - remainingMs / visibleDurationMs));
      progress.style.setProperty(
        "--wiki-cta-progress-angle",
        `${elapsedRatio}turn`,
      );
    };

    const countdownTick = (now) => {
      if (disposed || phase !== "visible") return;

      const mobilePaused = !MOBILE_MEDIA.matches;
      const paused =
        pointerPaused ||
        touchPaused ||
        focusPaused ||
        document.visibilityState !== "visible" ||
        mobilePaused;

      const delta = Math.max(0, now - previousTick);
      previousTick = now;

      if (!paused) {
        remainingMs = Math.max(0, remainingMs - delta);
        updateProgress();
        if (remainingMs === 0) {
          beginExit(false);
          return;
        }
      }

      countdownFrame = window.requestAnimationFrame(countdownTick);
    };

    const startCountdown = () => {
      cancelCountdown();
      previousTick = performance.now();
      countdownFrame = window.requestAnimationFrame(countdownTick);
    };

    const bindCard = () => {
      const card = getCard();
      if (!(card instanceof HTMLElement) || card === currentCard) return;

      currentCard = card;

      const dismiss = card.querySelector("[data-wiki-cta-dismiss]");
      const onDismiss = () => {
        persistGlobalDismissal();
        beginExit(true);
      };
      if (dismiss) add(dismiss, "click", onDismiss);

      const onPointerEnter = (event) => {
        if (event.pointerType === "mouse") pointerPaused = true;
      };
      const onPointerLeave = (event) => {
        if (event.pointerType === "mouse") pointerPaused = false;
      };
      const onPointerDown = (event) => {
        if (event.pointerType !== "touch") return;
        const target = event.target;
        if (target instanceof Element && target.closest("a,button")) return;
        touchPaused = true;
        pointerPaused = true;
      };
      const releaseTouch = () => {
        if (!touchPaused) return;
        touchPaused = false;
        pointerPaused = false;
      };
      const onFocusIn = () => {
        focusPaused = true;
      };
      const onFocusOut = (event) => {
        const next = event.relatedTarget;
        if (!(next instanceof Node) || !card.contains(next)) {
          focusPaused = false;
        }
      };

      add(card, "pointerenter", onPointerEnter);
      add(card, "pointerleave", onPointerLeave);
      add(card, "pointerdown", onPointerDown);
      add(card, "pointerup", releaseTouch);
      add(card, "pointercancel", releaseTouch);
      add(card, "focusin", onFocusIn);
      add(card, "focusout", onFocusOut);

      card.hidden = !["entering", "visible", "exiting"].includes(phase);
      card.setAttribute("data-state", phase);
      card.setAttribute("data-exiting", phase === "exiting" ? "true" : "false");
      updateTabVisibility();
      updateProgress();
    };

    const applyEndState = (inView) => {
      endInView = inView;

      if (!inView) {
        body.removeAttribute("data-wiki-end-cta-in-view");
        if (deferredChromeControl) {
          deferredChromeControl.removeEventListener("blur", applyDeferredEndState);
          deferredChromeControl = null;
        }
        return;
      }

      if (chromeControlFocused()) {
        if (deferredChromeControl) {
          deferredChromeControl.removeEventListener("blur", applyDeferredEndState);
        }
        deferredChromeControl = document.activeElement;
        deferredChromeControl?.addEventListener("blur", applyDeferredEndState, {
          once: true,
        });
        return;
      }

      body.setAttribute("data-wiki-end-cta-in-view", "true");
    };

    function applyDeferredEndState() {
      deferredChromeControl = null;
      if (CHROME_MEDIA.matches && endInView) {
        body.setAttribute("data-wiki-end-cta-in-view", "true");
      }
    }

    const markEndReached = () => {
      if (hasEverReachedEnd) return;
      hasEverReachedEnd = true;
      if (!shown) {
        blockedByEnd = true;
        return;
      }
      if (phase === "controls-out") {
        blockedByEnd = true;
        clearTimer("choreography");
        finishCardExit(false);
        return;
      }
      beginExit(true);
    };

    const disconnectEndObserver = () => {
      endObserver?.disconnect();
      endObserver = null;
      currentEnd = null;
      applyEndState(false);
    };

    const syncEndGeometry = (target) => {
      const rect = target.getBoundingClientRect();
      const hasRectLayout = rect.width > 0 || rect.height > 0;
      const rectInView =
        hasRectLayout && rect.top < window.innerHeight && rect.bottom > 0;
      const rectAlreadyPassed = hasRectLayout && rect.bottom <= 0;

      const scroller = document.scrollingElement;
      const viewportTop =
        scroller instanceof HTMLElement ? scroller.scrollTop : window.scrollY;
      const viewportBottom = viewportTop + window.innerHeight;

      let offsetTop = 0;
      let offsetNode = target;
      while (offsetNode instanceof HTMLElement) {
        offsetTop += offsetNode.offsetTop;
        offsetNode = offsetNode.offsetParent;
      }

      const offsetHeight = target.offsetHeight;
      const hasOffsetLayout = offsetHeight > 0;
      const offsetBottom = offsetTop + offsetHeight;
      const offsetInView =
        hasOffsetLayout &&
        offsetTop < viewportBottom &&
        offsetBottom > viewportTop;
      const offsetAlreadyPassed =
        hasOffsetLayout && offsetBottom <= viewportTop;

      const inView = rectInView || offsetInView;
      const alreadyPassed = rectAlreadyPassed || offsetAlreadyPassed;

      if (inView || alreadyPassed) markEndReached();
      applyEndState(inView);
    };

    const connectEndObserver = () => {
      if (!CHROME_MEDIA.matches) {
        disconnectEndObserver();
        return;
      }

      const target = document.getElementById(INLINE_CTA_ID);
      if (!(target instanceof HTMLElement)) return;

      if (target === currentEnd && endObserver) {
        syncEndGeometry(target);
        return;
      }

      disconnectEndObserver();
      currentEnd = target;
      syncEndGeometry(target);

      endObserver = new IntersectionObserver(([entry]) => {
        if (!entry || disposed) return;
        const entryRect = entry.boundingClientRect;
        const entryHasLayout =
          entryRect.width > 0 || entryRect.height > 0;

        if (
          entryHasLayout &&
          (entry.isIntersecting || entryRect.bottom <= 0)
        ) {
          markEndReached();
        }

        applyEndState(entryHasLayout && entry.isIntersecting);
      }, { threshold: 0, rootMargin: "0px" });

      endObserver.observe(target);
    };

    const completeEntrance = () => {
      if (disposed || phase !== "entering") return;
      phase = "visible";
      const card = currentCard ?? getCard();
      if (!(card instanceof HTMLElement)) {
        finishCardExit(true);
        return;
      }
      currentCard = card;
      card.setAttribute("data-state", "visible");
      card.setAttribute("data-exiting", "false");
      updateTabVisibility();
      updateProgress();
      startCountdown();
    };

    const revealCard = () => {
      choreographyTimer = null;
      if (disposed || blockedByEnd || hasEverReachedEnd) {
        finishCardExit(false);
        return;
      }
      if (document.visibilityState !== "visible") {
        choreographyTimer = window.setTimeout(revealCard, 200);
        return;
      }

      bindCard();
      const card = currentCard ?? getCard();
      if (!(card instanceof HTMLElement)) {
        finishCardExit(true);
        return;
      }

      currentCard = card;
      phase = "entering";
      remainingMs = visibleDurationMs;
      card.hidden = false;
      card.setAttribute("data-state", "entering");
      card.setAttribute("data-exiting", "false");
      body.setAttribute("data-wiki-card-active", "true");
      updateTabVisibility();
      updateProgress();
      setCardHiddenForViewport();

      if (REDUCE_MOTION.matches) {
        completeEntrance();
        return;
      }

      // Establish the off-screen entering frame before flipping to visible.
      // Without a committed starting frame, mobile browsers can skip the
      // transition and make the card appear abruptly.
      void card.offsetHeight;
      window.requestAnimationFrame(() => {
        if (disposed || phase !== "entering") return;
        card.setAttribute("data-state", "visible");
        clearTimer("enter");
        enterTimer = window.setTimeout(() => {
          enterTimer = null;
          completeEntrance();
        }, enterDurationMs);
      });
    };

    const startCardSequence = () => {
      if (shown || blockedByEnd || hasEverReachedEnd) return false;
      bindCard();
      if (!(currentCard instanceof HTMLElement)) return false;

      shown = true;
      phase = "controls-out";
      body.setAttribute("data-wiki-card-active", "true");
      currentCard.hidden = true;
      currentCard.setAttribute("data-state", "controls-out");
      updateTabVisibility();

      if (REDUCE_MOTION.matches) {
        revealCard();
        return true;
      }

      clearTimer("choreography");
      choreographyTimer = window.setTimeout(
        revealCard,
        controlExitDurationMs + choreographyGapMs,
      );
      return true;
    };

    const evaluateEligibility = () => {
      if (disposed || blockedByEnd || hasEverReachedEnd) return;
      if (hasGlobalDismissal()) {
        if (shown && ["controls-out", "entering", "visible"].includes(phase)) {
          beginExit(true);
        } else if (!shown) {
          finishCardExit(true);
        }
        return;
      }
      if (shown) return;

      bindCard();
      connectEndObserver();

      if (document.visibilityState !== "visible") return;
      if (!MOBILE_MEDIA.matches) return;
      if (chromeControlFocused()) return;

      const article = document.getElementById(ARTICLE_BODY_ID);
      if (!(article instanceof HTMLElement)) return;

      const rect = article.getBoundingClientRect();
      if (!(rect.height > 0)) return;

      const top = rect.top + window.scrollY;
      const progress = Math.min(
        1,
        Math.max(0, (window.scrollY - top) / rect.height),
      );

      if (progress < revealProgress) return;
      startCardSequence();
    };

    const scheduleVisibilityProbe = () => {
      if (disposed || shown) return;
      clearVisibilityTimer();
      visibilityTimer = window.setTimeout(() => {
        visibilityTimer = null;
        evaluateEligibility();
        scheduleVisibilityProbe();
      }, 250);
    };

    const onVisibility = () => {
      updateTabVisibility();
      setCardHiddenForViewport();
      evaluateEligibility();
    };

    const onResizeOrScroll = () => {
      setCardHiddenForViewport();
      connectEndObserver();
      evaluateEligibility();
    };

    const onMobileMedia = () => {
      setCardHiddenForViewport();
      evaluateEligibility();
    };

    const onChromeMedia = () => {
      connectEndObserver();
      evaluateEligibility();
    };

    const onReduceMotion = () => {
      updateProgress();
    };

    add(document, "visibilitychange", onVisibility);
    add(window, "scroll", onResizeOrScroll, { passive: true });
    add(window, "resize", onResizeOrScroll);
    add(document, "focusin", evaluateEligibility);
    add(document, "focusout", evaluateEligibility);
    add(MOBILE_MEDIA, "change", onMobileMedia);
    add(CHROME_MEDIA, "change", onChromeMedia);
    add(REDUCE_MOTION, "change", onReduceMotion);

    bindCard();
    connectEndObserver();
    evaluateEligibility();
    scheduleVisibilityProbe();

    return {
      refresh() {
        bindCard();
        connectEndObserver();
        evaluateEligibility();
      },
      cleanup() {
        if (disposed) return;
        disposed = true;
        clearVisibilityTimer();
        clearTimer("choreography");
        clearTimer("enter");
        clearTimer("exit");
        clearTimer("controls");
        cancelCountdown();
        disconnectEndObserver();
        for (const cleanup of cleanups.splice(0)) cleanup();
        body.removeAttribute("data-wiki-card-active");
        body.removeAttribute("data-wiki-end-cta-in-view");
        if (currentCard instanceof HTMLElement) {
          currentCard.hidden = true;
          currentCard.setAttribute("data-state", "done");
        }
      },
    };
  };

  function scan() {
    const root = document.querySelector(REVIEWED_SELECTOR);

    if (root === activeRoot && activeController) {
      activeController.refresh();
      return;
    }

    activeController?.cleanup();
    activeController = null;
    activeRoot = root;

    if (root instanceof HTMLElement && !hasGlobalDismissal()) {
      activeController = createController(root);
    }
  }

  const observer = new MutationObserver(queueScan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window[RUNTIME_KEY] = {
    version: "v23",
    scan,
    teardown() {
      activeController?.cleanup();
      activeController = null;
      activeRoot = null;
      observer.disconnect();
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }
})();
