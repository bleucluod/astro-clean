"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { NavLinks } from "@/components/NavLinks";

import styles from "./app-shell.module.css";

const HEADER_HIDE_OFFSET = 96;
const HEADER_SCROLL_DELTA = 6;

export function SiteHeader() {
  const lastScrollYRef = useRef(0);
  const [isHidden, setIsHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollYRef.current;

      setIsScrolled(currentScrollY > 10);

      if (currentScrollY < HEADER_HIDE_OFFSET) {
        setIsHidden(false);
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
    <header
      className={headerClassName}
      data-site-header="human-first-v2"
    >
      <nav
        className={`site-nav site-nav-app ${styles.nav}`}
        aria-label="ناوبری اصلی"
      >
        <Link
          href="/"
          className={`site-brand ${styles.brand}`}
          aria-label="هالیوس | صفحه اصلی"
        >
          <span
            className={`site-brand-mark ${styles.brandMark}`}
            aria-hidden="true"
          >
            <Image
              src="/halleus-logo/emblem-transparent.png"
              alt=""
              width={38}
              height={38}
              priority
              className="site-brand-logo-emblem"
            />
          </span>

          <span className={`site-brand-copy ${styles.brandCopy}`}>
            <strong>هالیوس</strong>
            <small>Halleus.ir</small>
          </span>
        </Link>

        <div
          className={`site-nav-scroll-row ${styles.navScrollRow}`}
          aria-label="مسیرهای اصلی هالیوس"
        >
          <div className={`site-nav-links ${styles.navLinks}`}>
            <NavLinks />
          </div>

          <div className={styles.headerActions}>
            <Link
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
            </Link>

            <Link
              className={`site-nav-cta site-header-cta ${styles.headerCta}`}
              href="/chart"
            >
              ساخت چارت
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
