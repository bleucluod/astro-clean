import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

const footerLinks = [
  { href: "/chart", label: "ساخت گزارش" },
  { href: "/product", label: "محصول" },
  { href: "/pricing", label: "پلن‌ها" },
  { href: "/order", label: "سفارش دستی" },
  { href: "/reports", label: "گزارش‌ها" },
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

          <Link href="/chart" className="site-nav-cta">
            شروع
          </Link>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand-block">
            <strong>Halleus</strong>
            <p className="footer-note">
              Halleus.ir — تجربه‌ای مینیمال برای ساخت و نگهداری گزارش‌های چارت تولد.
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
