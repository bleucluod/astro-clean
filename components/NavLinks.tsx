"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/config/navigation";

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="nav-link-track">
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            aria-current={isActive ? "page" : undefined}
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
