"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NavLinks } from "@/components/NavLinks";

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

      setIsScrolled(currentScrollY > 12);

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
    isHidden ? "site-header-hidden" : "site-header-visible",
    isScrolled ? "site-header-scrolled" : "site-header-top",
  ].join(" ");

  return (
    <header className={headerClassName}>
      <nav className="site-nav site-nav-app" aria-label="ناوبری اصلی">
        <Link href="/" className="site-brand" aria-label="Halleus | هالیوس">
          <span className="site-brand-mark" aria-hidden="true">
            <Image
              src="/halleus-logo/emblem-transparent.png"
              alt=""
              width={36}
              height={36}
              priority
              className="site-brand-logo-emblem"
            />
          </span>
          <span className="site-brand-copy">
            <strong>Halleus</strong>
            <small>هالیوس</small>
          </span>
        </Link>

        <div className="site-nav-scroll-row" aria-label="صفحه‌های اصلی">
          <div className="site-nav-links">
            <NavLinks />
          </div>

          <Link className="site-nav-cta site-header-cta" href="/chart">
            ساخت گزارش
          </Link>
        </div>
      </nav>
    </header>
  );
}
