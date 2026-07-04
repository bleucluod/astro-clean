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
            <span>Halleus</span>
          </Link>

          <NavLinks />

          <Link href="/chart" className="site-nav-cta">
            ساخت گزارش
          </Link>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand-block">
            <strong>Halleus</strong>
            <p className="footer-note">
              هالیوس یک تجربه فارسی برای ساخت و خواندن گزارش چارت تولد است؛
              فعلاً free-first، خصوصی و در حال آماده‌سازی برای محصول عمومی بهتر.
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
