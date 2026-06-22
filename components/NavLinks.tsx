"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div>
      {navItems.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            className={isActive ? "nav-link active" : "nav-link"}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
