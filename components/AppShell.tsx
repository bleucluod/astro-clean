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

export function AppShell({ children }: AppShellProps) {


  return (
    <div className={`${styles.shell} ${humanStyles.humanShell}`}>
      <SiteHeader />
      <main className={styles.main} id="main-content">
        {children}
      </main>

      <IntentPrefetchLink
        className={styles.backToTop}
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
