import Image from "next/image";
import { IntentPrefetchLink } from "@/components/IntentPrefetchLink";
import type { ReactNode } from "react";

import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { SiteHeader } from "@/components/SiteHeader";
import { ShopAwareBackToTop } from "@/components/shop/ShopAwareBackToTop";



import styles from "./app-shell.module.css";
import humanStyles from "./human-first-shell.module.css";

type AppShellProps = {
  children: ReactNode;
};



const footerLinks = [
  { href: "/chart", label: "ساخت چارت تولد" },
  { href: "/vedic", label: "چارت تولد ودیک" },
  { href: "/compare", label: "چارت ازدواج" },
  { href: "/sky", label: "آسمان امروز" },
  { href: "/wiki", label: "ویکی آسترولوژی" },
  { href: "/shop", label: "فروشگاه هالیوس" },
  { href: "/shop/track", label: "پیگیری سفارش" },
  { href: "/shop/shipping-returns", label: "ارسال و مرجوعی سفارش" },
  { href: "/privacy", label: "حریم خصوصی" },
] as const;

// HALLEUS_WIKI_CTA_RUNTIME_V18
// HALLEUS_WIKI_CTA_END_GEOMETRY_SYNC_V19_REPAIR
// HALLEUS_WIKI_CTA_END_SCROLL_OFFSET_V20
// HALLEUS_WIKI_CTA_SHORT_VIEWPORT_V22
// HALLEUS_WIKI_CTA_GLOBAL_DISMISS_V23
// Lightweight shared bootstrap. The editorial CTA runtime is only loaded on eligible Wiki articles.
const WIKI_EDITORIAL_CTA_BOOTSTRAP = `(() => {
  const KEY = "__HALLEUS_WIKI_CTA_BOOTSTRAP_V23__";
  if (window[KEY]) return;
  window[KEY] = true;
  let observing = false;
  let scriptRequested = false;
  const isWikiRoute = () => location.pathname === "/wiki" || location.pathname.startsWith("/wiki/");
  const loadWhenNeeded = () => {
    if (!isWikiRoute()) return;
    if (!document.querySelector('[data-wiki-editorial-reviewed="true"]')) return;
    observer.disconnect();
    observing = false;
    if (scriptRequested) return;
    scriptRequested = true;
    const script = document.createElement("script");
    script.src = "/scripts/halleus-wiki-cta-v23.js";
    script.async = true;
    document.head.appendChild(script);
  };
  const observer = new MutationObserver(loadWhenNeeded);
  const syncRoute = () => {
    if (!isWikiRoute()) {
      observer.disconnect();
      observing = false;
      return;
    }
    if (!observing && !scriptRequested) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
      observing = true;
    }
    loadWhenNeeded();
  };
  window.addEventListener("halleus:route-changed", syncRoute);
  syncRoute();
})();`;

export function AppShell({ children }: AppShellProps) {


  return (
    <div className={`${styles.shell} ${humanStyles.humanShell}`}>
      <SiteHeader />
      <main className={styles.main} id="main-content">
        {children}
      </main>

      <script dangerouslySetInnerHTML={{ __html: WIKI_EDITORIAL_CTA_BOOTSTRAP }} />

      <ShopAwareBackToTop />


      <footer
        data-approved-lockup="/halleus-logo/logo-horizontal-bilingual-final-20260804.png"
        className={`site-footer ${styles.footer}`}
      >
      <nav className={styles.contactStrip} aria-label="راه‌های ارتباطی هالیوس" dir="rtl">
        <div className={styles.contactStripInner}>
          <a
            className={styles.contactStripLink}
            href="tel:+989353997359"
            aria-label="تماس با هالیوس: ۰۹۳۵۳۹۹۷۳۵۹"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"
              fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              strokeLinejoin="round">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.5 2.9a2 2 0 0 1-.6 1.7L7.1 10a16 16 0 0 0 6.9 6.9l1.7-1.9a2 2 0 0 1 1.7-.6l2.9.5a2 2 0 0 1 1.7 2Z" />
            </svg>
            <span className={styles.contactStripLabel}>تماس</span>
            <bdi dir="ltr">۰۹۳۵۳۹۹۷۳۵۹</bdi>
          </a>
          <span className={styles.contactStripDivider} aria-hidden="true" />
          <a
            className={styles.contactStripLink}
            href="https://t.me/thecloudteam"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="پیام در تلگرام: thecloudteam"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"
              fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
              strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            <span className={styles.contactStripLabel}>تلگرام</span>
            <bdi dir="ltr">@thecloudteam</bdi>
          </a>
        </div>
      </nav>
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
              آسترولوژی فارسی برای چارت تولد، چارت ازدواج و سیناستری، آسمان امروز و مسیرهای پیش رو.
            </p>

            <p className={styles.footerResponsibility}>
              برای شناخت چارت، رابطه‌ها و مسیرهای پیش رو
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
            <div className={`footer-links ${styles.footerLinks}`} dir="rtl">
              {[footerLinks.slice(0, 5), footerLinks.slice(5)].map((column) => (
                <div className={styles.footerLinkColumn} key={column[0].href}>
                  {column.map((link) => (
                    <IntentPrefetchLink
                      className={`footer-link ${styles.footerLink}`}
                      href={link.href}
                      key={link.href}
                    >
                      {link.label}
                    </IntentPrefetchLink>
                  ))}
                </div>
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
          <span className={styles.footerBottomNote}>داده واقعی · خوانش فارسی · نگاه به مسیر پیش رو</span>
        </div>

      </footer>

      <AnalyticsConsent />
    </div>
  );
}
