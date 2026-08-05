"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { navItems } from "@/lib/config/navigation";

export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="nav-link-track">
      {navItems.map((item, index) => {
        const isActive = pathname.startsWith(item.href);

        return (
          <Fragment key={item.href}>
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "nav-link active" : "nav-link"}
              href={item.href}
            >
              {item.label}
            </Link>
            {index < navItems.length - 1 ? (
              <span className="nav-link-separator" aria-hidden="true">
                |
              </span>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}
