import type { Metadata } from "next";

import { ProductOfferGrid } from "@/components/monetization/ProductAccessCards";
import { PricingCommerceSurface } from "@/components/commerce/CommerceSurfaces";
import { getReportAccessPolicy } from "@/lib/monetization/product-entitlement-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "قیمت گزارش چارت تولد کامل و اعتبارها | هالیوس",
  description: "گزارش پایه هالیوس را رایگان شروع کن و بسته‌های فعال گزارش کامل و تحلیل رابطه را با قیمت و تعداد اعتبارهای واقعی کاتالوگ هالیوس ببین.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

export default async function PricingPage() {
  // HALLEUS_FREE_ALL_PRICING_PAGE_BATCH1_R1
  const policy = await getReportAccessPolicy();
  const freeAll = policy.monetizationMode === "FREE_ALL";
  return (
    <PricingCommerceSurface
      freeAll={freeAll}
      packages={freeAll ? null : <ProductOfferGrid />}
    />
  );
}
