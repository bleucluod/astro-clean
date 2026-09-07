"use client";

import type { MouseEvent, ReactNode } from "react";
import { trackComparePublicAggregateEvent } from "@/lib/config/analytics";

export function ComparisonBuilderLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  function moveToBuilder(event: MouseEvent<HTMLAnchorElement>) {
    trackComparePublicAggregateEvent("compare_builder_started");
    const target = document.getElementById("compare-builder");
    if (!target) return;

    event.preventDefault();
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
    window.history.replaceState(null, "", "#compare-builder");
  }

  return (
    <a className={className} href="#compare-builder" onClick={moveToBuilder}>
      {children}
    </a>
  );
}
