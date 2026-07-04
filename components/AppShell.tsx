import Link from "next/link";
import type { ReactNode } from "react";
import { NavLinks } from "@/components/NavLinks";

type AppShellProps = {
  children: ReactNode;
};

const footerLinks = [
  { href: "/chart", label: "ساخت گزارش تولد" },
  { href: "/reports", label: "گزارش‌ها" },
  { href: "/product", label: "محصول" },
  { href: "/privacy", label: "حریم خصوصی" },
] as const;

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <header className="site-header">
        <nav className="site-nav" aria-label="ناوبری اصلی">
          <Link href="/" className="site-brand" aria-label="Halleus">
            <span className="site-brand-mark">✦</span>
            <span className="site-brand-copy">
              <strong>Halleus</strong>
              <small>هالیوس</small>
            </span>
          </Link>

          <div className="site-nav-links" aria-label="صفحه‌های اصلی">
            <NavLinks />
          </div>

          <div className="site-nav-actions">
            <Link href="/chart" className="site-nav-cta">
              <span className="site-nav-cta-main">ساخت گزارش تولد</span>
            </Link>
          </div>
        </nav>
      </header>

      <main id="top">{children}</main>

      <a className="back-to-top-button" href="#top" aria-label="پرش به بالای صفحه">
        <span aria-hidden="true">↑</span>
        <span>پرش به بالا</span>
      </a>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand-block">
            <strong>Halleus</strong>
            <p className="footer-note">
              هالیوس تجربه‌ای فارسی برای خواندن چارت تولد است؛ فعلاً رایگان،
              خصوصی و متمرکز بر کیفیت گزارش و تجربه خواندن.
            </p>
          </div>

          <nav className="footer-links" aria-label="دسترسی‌های سریع">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="footer-link">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}
