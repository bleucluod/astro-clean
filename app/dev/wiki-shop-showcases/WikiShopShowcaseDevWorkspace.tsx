"use client";
import { WikiShopShowcasePanel } from "@/components/admin/WikiShopShowcasePanel";

export function WikiShopShowcaseDevWorkspace() {
  return <div id="wiki-shop-showcases-dev" dir="rtl"
    style={{ width: "min(1320px, 100%)", padding: "clamp(12px, 2vw, 28px)", marginInline: "auto" }}>
    <WikiShopShowcasePanel token="" canWrite demo />
  </div>;
}
