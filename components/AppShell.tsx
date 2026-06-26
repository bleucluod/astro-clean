import Link from "next/link";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <header className="site-header">
        <nav className="site-nav" aria-label="ناوبری اصلی">
          <Link href="/" className="site-brand" aria-label="Halleus">
            <span className="site-brand-mark" aria-hidden="true">
              H
            </span>
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
          <div>
            <strong>Halleus</strong>
            <p className="footer-note">
              محصولی آرام و مینیمال برای تفسیر نمادین چارت تولد.
            </p>
          </div>

          <Link href="/privacy" className="footer-link">
            حریم خصوصی
          </Link>
        </div>
      </footer>
    </>
  );
}
