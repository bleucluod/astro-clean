"use client";

import { IntentPrefetchLink } from "@/components/IntentPrefetchLink";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { navItems } from "@/lib/config/navigation";
// HALLEUS_REPORT_NATIVE_SITE_HEADER_REUSE_R8_20260904
const reportReaderNavItems = [
  { href: "/profile", label: "Ø­Ø³Ø§Ø¨ Ú©Ø§Ø±Ø¨Ø±ÛŒ" },
  { href: "/compare", label: "Ø³ÛŒÙ†Ø§Ø³ØªØ±ÛŒ" },
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
        const forceWikiDocumentNavigation = item.href === "/wiki";

        return (
          <Fragment key={item.href}>
            {forceWikiDocumentNavigation ? (
              <a
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "nav-link active" : "nav-link"}
                data-halleus-navigation="wiki-document-v1"
                href={item.href}
              >
                {item.label}
              </a>
            ) : (
              <IntentPrefetchLink
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "nav-link active" : "nav-link"}
                href={item.href}
              >
                {item.label}
              </IntentPrefetchLink>
            )}
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