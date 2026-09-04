"use client";

import { IntentPrefetchLink } from "@/components/IntentPrefetchLink";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { navItems } from "@/lib/config/navigation";
// HALLEUS_REPORT_NATIVE_SITE_HEADER_REUSE_R8_20260904
const reportReaderNavItems = [
  { href: "/profile", label: "حساب کاربری" },
  { href: "/compare", label: "سیناستری" },
] as const;

function resolveNavItems(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const isReportReader = segments.length === 2 && segments[0] === "reports";
  return isReportReader ? reportReaderNavItems : navItems;
}


export function NavLinks() {
  const pathname = usePathname();
  const activeNavItems = resolveNavItems(pathname);

  return (
    <div className="nav-link-track">
      {activeNavItems.map((item, index) => {
        const isActive = pathname.startsWith(item.href);

        return (
          <Fragment key={item.href}>
            <IntentPrefetchLink
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "nav-link active" : "nav-link"}
              href={item.href}
            >
              {item.label}
            </IntentPrefetchLink>
            {index < activeNavItems.length - 1 ? (
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
