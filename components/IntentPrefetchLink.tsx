"use client";

import Link, { type LinkProps } from "next/link";
import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";

const DEFERRED_PREFETCH_PREFIXES = ["/chart","/compare","/product","/profile","/sky","/wiki"] as const;

type IntentPrefetchLinkProps = LinkProps &
  Omit<ComponentPropsWithoutRef<"a">, keyof LinkProps> & {
    children: ReactNode;
  };

function pathnameFromHref(href: LinkProps["href"]) {
  if (typeof href === "string") return href.split(/[?#]/, 1)[0] || "/";
  return href.pathname ?? "/";
}

function shouldDefer(href: LinkProps["href"]) {
  const pathname = pathnameFromHref(href);
  return DEFERRED_PREFETCH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export function IntentPrefetchLink({
  href,
  prefetch,
  onMouseEnter,
  onFocus,
  onTouchStart,
  children,
  ...props
}: IntentPrefetchLinkProps) {
  const [intent, setIntent] = useState(false);
  const defer = prefetch === undefined && shouldDefer(href);
  const resolvedPrefetch = defer ? (intent ? null : false) : prefetch;

  return (
    <Link
      {...props}
      href={href}
      prefetch={resolvedPrefetch}
      data-halleus-prefetch={defer ? "intent-v1" : undefined}
      onMouseEnter={(event) => {
        if (defer) setIntent(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        if (defer) setIntent(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        if (defer) setIntent(true);
        onTouchStart?.(event);
      }}
    >
      {children}
    </Link>
  );
}
