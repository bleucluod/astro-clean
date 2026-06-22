import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Astro Clean | تحلیل نمادین چارت تولد",
  description:
    "Astro Clean یک تجربه فارسی برای ساخت چارت تولد، گزارش‌های شخصی و مسیر آینده آسترولوژی نمادین است.",
};

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body>
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
      </body>
    </html>
  );
}