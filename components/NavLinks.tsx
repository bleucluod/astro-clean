"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/config/navigation";

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div>
      {navItems.map((item) => {
        const isActive = pathname.startsWith(item.href);

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
