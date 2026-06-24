import Link from "next/link";
import type { ReactNode } from "react";
import { NavLinks } from "@/components/NavLinks";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <header>
        <nav>
          <Link href="/">Halleus</Link>

          <NavLinks />
        </nav>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div>
          <strong>Halleus</strong>
          <p>
            تحلیل‌ها در این محصول برای سرگرمی، خودشناسی و تفسیر نمادین هستند؛
            نه پیش‌بینی قطعی یا توصیه پزشکی، مالی و حقوقی.
          </p>
        </div>
      </footer>
    </>
  );
}
