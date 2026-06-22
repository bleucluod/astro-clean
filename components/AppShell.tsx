import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/", label: "خانه" },
  { href: "/chart", label: "ساخت چارت" },
  { href: "/dashboard", label: "داشبورد" },
  { href: "/reports", label: "گزارش‌ها" },
  { href: "/profile", label: "پروفایل" },
  { href: "/roadmap", label: "نقشه راه" },
  { href: "/wiki", label: "آسترو ویکی" },
  { href: "/admin", label: "ادمین" },
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <header>
        <nav>
          <Link href="/">Astro Clean</Link>

          <div>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div>
          <strong>Astro Clean</strong>
          <p>
            تحلیل‌ها در این محصول برای سرگرمی، خودشناسی و تفسیر نمادین هستند؛
            نه پیش‌بینی قطعی یا توصیه پزشکی، مالی و حقوقی.
          </p>
        </div>
      </footer>
    </>
  );
}
