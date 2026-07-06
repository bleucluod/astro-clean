import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavLinks } from "@/components/NavLinks";

type AppShellProps = {
  children: ReactNode;
};

const footerLinks = [
  { href: "/chart", label: "ساخت گزارش تولد" },
  { href: "/reports", label: "گزارش‌ها" },
  { href: "/dashboard", label: "پنل کاربری" },
  { href: "/product", label: "محصول" },
  { href: "/privacy", label: "حریم خصوصی" },
] as const;

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <header className="site-header">
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

          <div className="site-nav-links" aria-label="صفحه‌های اصلی">
            <NavLinks />
          </div>

          <Link className="site-header-cta" href="/chart">
            گزارش تولدم را بساز
          </Link>

          <details className="site-mobile-menu">
            <summary aria-label="باز کردن منوی سایت">
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </summary>

            <div className="site-mobile-menu-panel" aria-label="منوی موبایل">
              <NavLinks />

              <Link className="site-mobile-menu-cta" href="/chart">
                گزارش تولدم را بساز
              </Link>
            </div>
          </details>
        </nav>
      </header>

      <main id="top">{children}</main>

      <a className="back-to-top-button" href="#top" aria-label="پرش به بالای صفحه">
        <span aria-hidden="true">↑</span>
        <span>پرش به بالا</span>
      </a>

      <footer className="site-footer">
        <div className="footer-inner footer-inner-clean">
          <div className="footer-brand-block">
            <Image
              src="/halleus-logo/emblem-transparent.png"
              alt=""
              width={32}
              height={32}
              className="footer-brand-logo"
            />
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
