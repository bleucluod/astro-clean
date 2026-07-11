import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { SiteHeader } from "@/components/SiteHeader";

import styles from "./app-shell.module.css";

type AppShellProps = {
  children: ReactNode;
};

const footerLinks = [
  { href: "/chart", label: "ساخت گزارش" },
  { href: "/product", label: "محصول" },
  { href: "/pricing", label: "پلن‌ها" },
  { href: "/order", label: "سفارش دستی" },
  { href: "/reports", label: "گزارش‌ها" },
  { href: "/wiki", label: "ویکی" },
  { href: "/privacy", label: "حریم خصوصی" },
] as const;

export function AppShell({ children }: AppShellProps) {
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
              تجربه‌ای فارسی، آرام و دقیق برای ساخت گزارش تولد، دیدن آسمان امروز و یادگیری منطق چارت.
            </p>
          </div>

          <div className={styles.footerNavBlock}>
            <span className={styles.footerNavTitle}>دسترسی سریع</span>
            <div className={`footer-links ${styles.footerLinks}`}>
              {footerLinks.map((link) => (
                <Link className={`footer-link ${styles.footerLink}`} href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear().toLocaleString("fa-IR")} هالیوس</span>
          <span>برای خودشناسی نمادین، نه تصمیم‌گیری قطعی</span>
        </div>
      </footer>
    </div>
  );
}
