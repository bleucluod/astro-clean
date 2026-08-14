"use client";

import { getImageProps } from "next/image";
import { IntentPrefetchLink } from "@/components/IntentPrefetchLink";
import { useEffect, useRef, useState } from "react";

import { NavLinks } from "@/components/NavLinks";

import styles from "./app-shell.module.css";

// HALLEUS_RESPONSIVE_CHROME_IMAGE_BATCH5_R1
const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

type ResponsiveChromeImageProps = {
  src: string;
  width: number;
  height: number;
  sizes: string;
  className: string;
  viewport: "desktop" | "mobile";
};

function ResponsiveChromeImage({
  src,
  width,
  height,
  sizes,
  className,
  viewport,
}: ResponsiveChromeImageProps) {
  const { props } = getImageProps({ src, alt: "", width, height, sizes });
  const oppositeViewport =
    viewport === "desktop" ? "(max-width: 760px)" : "(min-width: 761px)";

  return (
    <picture style={{ display: "contents" }} data-halleus-responsive-image={viewport}>
      <source media={oppositeViewport} srcSet={TRANSPARENT_PIXEL} />
      <img
        {...props}
        alt=""
        className={className}
        decoding="async"
        fetchPriority="high"
        loading="eager"
      />
    </picture>
  );
}

const HEADER_HIDE_OFFSET = 96;
const HEADER_SCROLL_DELTA = 6;

export function SiteHeader() {
  const lastScrollYRef = useRef(0);
  // HALLEUS_MOBILE_NAV_INDEPENDENT_REF_20260805
  const mobileNavRef = useRef<HTMLElement | null>(null);
  // HALLEUS_HEADER_NAV_DOM_STATE_REF_20260805
  const navRef = useRef<HTMLElement | null>(null);
  // HALLEUS_MOBILE_SCROLL_ACCUMULATOR_20260805
  const mobileScrollDirectionRef = useRef<"up" | "down" | null>(null);
  const mobileScrollDistanceRef = useRef(0);
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;
      const isMobileViewport = window.matchMedia(
        "(max-width: 760px)",
      ).matches;

      setIsScrolled(currentScrollY > 10);

      if (currentScrollY < HEADER_HIDE_OFFSET) {
        setIsHidden(false);
        mobileScrollDirectionRef.current = null;
        mobileScrollDistanceRef.current = 0;
      } else if (isMobileViewport) {
        const direction =
          scrollDelta > 0 ? "down" : scrollDelta < 0 ? "up" : null;

        if (direction) {
          if (mobileScrollDirectionRef.current !== direction) {
            mobileScrollDirectionRef.current = direction;
            mobileScrollDistanceRef.current = Math.abs(scrollDelta);
          } else {
            mobileScrollDistanceRef.current += Math.abs(scrollDelta);
          }

          if (mobileScrollDistanceRef.current >= HEADER_SCROLL_DELTA) {
            setIsHidden(direction === "down");
            mobileScrollDistanceRef.current = 0;
          }
        }
      } else if (scrollDelta > HEADER_SCROLL_DELTA) {
        setIsHidden(true);
      } else if (scrollDelta < -HEADER_SCROLL_DELTA) {
        setIsHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // HALLEUS_HEADER_VIEWPORT_RESET_20260805
  useEffect(() => {
    const mobileViewport = window.matchMedia("(max-width: 760px)");

    const handleViewportChange = () => {
      setIsHidden(false);
      mobileScrollDirectionRef.current = null;
      mobileScrollDistanceRef.current = 0;
      lastScrollYRef.current = window.scrollY;
    };

    mobileViewport.addEventListener("change", handleViewportChange);

    return () => {
      mobileViewport.removeEventListener("change", handleViewportChange);
    };
  }, []);

  // HALLEUS_HEADER_NAV_DOM_STATE_EFFECT_20260805
  useEffect(() => {
    const nav = navRef.current;

    if (!nav) {
      return;
    }

    let lastScrollY = window.scrollY;
    let accumulatedDistance = 0;
    let activeDirection: "up" | "down" | null = null;
    let animationFrame = 0;

    const setVisibility = (visible: boolean) => {
      nav.dataset.scrollVisibility = visible ? "visible" : "hidden";
    };

    const resetVisibility = () => {
      lastScrollY = window.scrollY;
      accumulatedDistance = 0;
      activeDirection = null;
      setVisibility(true);
    };

    const handleScrollVisibility = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;

        if (currentScrollY < HEADER_HIDE_OFFSET) {
          setVisibility(true);
          accumulatedDistance = 0;
          activeDirection = null;
        } else if (scrollDelta !== 0) {
          const direction = scrollDelta > 0 ? "down" : "up";

          if (activeDirection !== direction) {
            activeDirection = direction;
            accumulatedDistance = Math.abs(scrollDelta);
          } else {
            accumulatedDistance += Math.abs(scrollDelta);
          }

          if (accumulatedDistance >= HEADER_SCROLL_DELTA) {
            setVisibility(direction === "up");
            accumulatedDistance = 0;
          }
        }

        lastScrollY = currentScrollY;
        animationFrame = 0;
      });
    };

    resetVisibility();

    window.addEventListener("scroll", handleScrollVisibility, {
      passive: true,
    });
    window.addEventListener("resize", resetVisibility);
    window.addEventListener("orientationchange", resetVisibility);
    window.addEventListener("pageshow", resetVisibility);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      window.removeEventListener("scroll", handleScrollVisibility);
      window.removeEventListener("resize", resetVisibility);
      window.removeEventListener("orientationchange", resetVisibility);
      window.removeEventListener("pageshow", resetVisibility);
    };
  }, []);

  // HALLEUS_MOBILE_NAV_INDEPENDENT_SCROLL_20260805
  useEffect(() => {
    const mobileNav = mobileNavRef.current;

    if (!mobileNav) {
      return;
    }

    let lastScrollY = window.scrollY;
    let accumulatedDistance = 0;
    let activeDirection: "up" | "down" | null = null;
    let animationFrame = 0;

    const setVisibility = (visible: boolean) => {
      mobileNav.dataset.mobileScrollVisibility = visible
        ? "visible"
        : "hidden";
    };

    const resetVisibility = () => {
      lastScrollY = window.scrollY;
      accumulatedDistance = 0;
      activeDirection = null;
      setVisibility(true);
    };

    const handleScroll = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;

        if (currentScrollY < HEADER_HIDE_OFFSET) {
          setVisibility(true);
          accumulatedDistance = 0;
          activeDirection = null;
        } else if (scrollDelta !== 0) {
          const direction = scrollDelta > 0 ? "down" : "up";

          if (activeDirection !== direction) {
            activeDirection = direction;
            accumulatedDistance = Math.abs(scrollDelta);
          } else {
            accumulatedDistance += Math.abs(scrollDelta);
          }

          if (accumulatedDistance >= HEADER_SCROLL_DELTA) {
            setVisibility(direction === "up");
            accumulatedDistance = 0;
          }
        }

        lastScrollY = currentScrollY;
        animationFrame = 0;
      });
    };

    resetVisibility();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", resetVisibility);
    window.addEventListener("orientationchange", resetVisibility);
    window.addEventListener("pageshow", resetVisibility);

    return () => {
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }

      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", resetVisibility);
      window.removeEventListener("orientationchange", resetVisibility);
      window.removeEventListener("pageshow", resetVisibility);
    };
  }, []);

  const headerClassName = [
    "site-header",
    "site-header-app",
    styles.header,
    isHidden ? "site-header-hidden" : "site-header-visible",
    isHidden ? styles.headerHidden : styles.headerVisible,
    isScrolled ? "site-header-scrolled" : "site-header-top",
    isScrolled ? styles.headerScrolled : styles.headerTop,
  ].join(" ");

  return (
    <>
      <header
      className={headerClassName}
      data-site-header="human-first-v2"
      data-header-theme="midnight"
    >
      <nav
        ref={navRef}
        className={`site-nav site-nav-app ${styles.nav}`}
        aria-label="ناوبری اصلی"
      >
        <IntentPrefetchLink
          href="/"
          className={`site-brand ${styles.brand}`}
          aria-label="هالیوس | صفحه اصلی"
        >
          <span className={styles.brandPlate}>
            <span className={styles.brandMarkGroup}>
              <span className={styles.brandSymbolAccentWrap} aria-hidden="true">
                <ResponsiveChromeImage
                  src="/halleus-logo/symbol-transparent-white.png"
                  width={1400}
                  height={1400}
                  sizes="72px"
                  className={styles.brandSymbolAccent}
                  viewport="desktop"
                />
              </span>
              <ResponsiveChromeImage
                src="/halleus-logo/wordmark-bilingual-transparent-white.png"
                width={1900}
                height={950}
                sizes="136px"
                className={`${styles.brandLogo} ${styles.brandLogoDesktop}`}
                viewport="desktop"
              />
            </span>
          </span>
        </IntentPrefetchLink>

        <div
          className={`site-nav-scroll-row ${styles.navScrollRow}`}
          aria-label="مسیرهای اصلی هالیوس"
        >
          <div className={`site-nav-links ${styles.navLinks}`}>
            <NavLinks />
          </div>

          <div className={styles.headerActions}>
            <IntentPrefetchLink
              className={styles.accountLink}
              href="/profile"
              aria-label="حساب من"
            >
              <svg
                className={styles.accountIcon}
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="8" r="3.25" />
                <path d="M5.5 19c.8-3.3 3-5 6.5-5s5.7 1.7 6.5 5" />
              </svg>
              <span className={styles.accountLabel}>حساب من</span>
            </IntentPrefetchLink>

            <IntentPrefetchLink
              className={`site-nav-cta site-header-cta ${styles.headerCta}`}
              href="/chart"
            >
              ساخت چارت
            </IntentPrefetchLink>
          </div>
        </div>
      </nav>
    </header>

            <nav
        ref={mobileNavRef}
        className={styles.mobileNav}
        aria-label="ناوبری اصلی موبایل"
        data-mobile-nav="independent-final-v1"
      >
        <IntentPrefetchLink
          href="/"
          className={styles.mobileBrand}
          aria-label="هالیوس | صفحه اصلی"
        >
          <ResponsiveChromeImage
            src="/halleus-logo/symbol-dark-final-20260804.png"
            width={695}
            height={702}
            sizes="40px"
            className={styles.mobileBrandLogo}
            viewport="mobile"
          />
        </IntentPrefetchLink>

        <span
          className={styles.mobileWordmarkText}
          aria-hidden="true"
          data-mobile-wordmark-text="site-font-v1"
        >
          هالیوس
        </span>

        <div className={styles.mobileNavLinks}>
          <NavLinks />
        </div>
      </nav>

<IntentPrefetchLink
        className={styles.mobileAccountFab}
        href="/profile"
        aria-label="حساب من"
        data-mobile-account-fab="structural-v1"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="19"
          height="19"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.5 19c.8-3.3 3-5 6.5-5s5.7 1.7 6.5 5" />
        </svg>
      </IntentPrefetchLink>
    </>
  );
}
