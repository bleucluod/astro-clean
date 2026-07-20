import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { AnalyticsConsent } from "@/components/AnalyticsConsent";
import { SiteHeader } from "@/components/SiteHeader";
import { getPublicWikiCatalog } from "@/lib/wiki/wiki-repository";
import { sortPublicWikiArticlesNewestFirst } from "@/lib/wiki/wiki-public-discovery";

import styles from "./app-shell.module.css";

type AppShellProps = {
  children: ReactNode;
};

const footerLinks = [
  { href: "/chart", label: "ساخت چارت تولد" },
  { href: "/sky", label: "آسمان امروز" },
  { href: "/wiki", label: "ویکی آسترولوژی" },
  { href: "/privacy", label: "حریم خصوصی" },
] as const;

export async function AppShell({ children }: AppShellProps) {
  const { articles: wikiArticles } = await getPublicWikiCatalog();
  const latestWikiArticles = sortPublicWikiArticlesNewestFirst(wikiArticles).slice(0, 4);

  return (
    <div className={styles.shell}>
      <SiteHeader />
      <main className={styles.main} id="main-content">
        {children}
      </main>

      <Link className={styles.backToTop} href="#main-content" aria-label="پرش به ابتدای محتوای صفحه">
        <span aria-hidden="true">↑</span>
        پرش به بالا
      </Link>

      <footer className={`site-footer ${styles.footer}`}>
        <div className={`footer-inner ${styles.footerInner}`}>
          <div className={`footer-brand-block ${styles.footerBrandBlock}`}>
            <Link className={styles.footerBrand} href="/" aria-label="هالیوس">
              <Image
                src="/halleus-logo/emblem-transparent.png"
                alt=""
                width={42}
                height={42}
                className={styles.footerLogo}
              />
              <span>
                <strong>هالیوس</strong>
                <small>Halleus.ir</small>
              </span>
            </Link>

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
                <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>

          <div className={styles.footerNavBlock} aria-label="مسیرهای اصلی">
            <div className={`footer-links ${styles.footerLinks}`}>
              {footerLinks.map((link) => (
                <Link className={`footer-link ${styles.footerLink}`} href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.footerWikiBlock} aria-label="تازه‌ترین مقاله‌های ویکی">
            <span className={styles.footerNavTitle}>تازه‌ترین‌های ویکی</span>
            {latestWikiArticles.length > 0 ? (
              <div className={styles.footerWikiLinks}>
                {latestWikiArticles.map((article) => (
                  <Link
                    className={styles.footerWikiLink}
                    href={`/wiki/${article.slug}`}
                    key={article.slug}
                  >
                    {article.title}
                  </Link>
                ))}
              </div>
            ) : (
              <Link className={styles.footerWikiEmpty} href="/wiki">
                رفتن به ویکی هالیوس
              </Link>
            )}
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear().toLocaleString("fa-IR", { useGrouping: false })} هالیوس</span>
        </div>
      </footer>

      <AnalyticsConsent />
    </div>
  );
}
