import Link from "next/link";
import type { ReactNode } from "react";
import { NavLinks } from "@/components/NavLinks";
import { getSalesNavigationLinks } from "@/lib/product/product-surface";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const salesLinks = getSalesNavigationLinks();

  return (
    <>
      <header>
        <nav>
          <Link href="/">Halleus</Link>

          <NavLinks />
        </nav>

        <div className="shell-sales-nav">
          <span>مسیر سریع فروش: گزارش نمونه، توضیح محصول، پلن‌ها و سفارش دستی</span>

          <div>
            {salesLinks.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-grid">
          <div>
            <strong>Halleus</strong>
            <p>
              تحلیل‌ها در این محصول برای سرگرمی، خودشناسی و تفسیر نمادین هستند؛
              نه پیش‌بینی قطعی یا توصیه پزشکی، مالی و حقوقی.
            </p>
          </div>

          <div className="footer-sales-links">
            <strong>مسیر محصول</strong>
            <Link href="/chart">ساخت گزارش</Link>
            <Link href="/product">توضیح محصول</Link>
            <Link href="/pricing">پلن‌ها و سفارش دستی</Link>
            <Link href="/privacy">حریم داده</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
