import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

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
      <SiteHeader />

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
              هالیوس تجربه‌ای فارسی و آرام برای ساخت و خواندن گزارش تولد است.
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
