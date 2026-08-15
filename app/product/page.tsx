import type { Metadata } from "next";

import { ProductOfferGrid } from "@/components/monetization/ProductAccessCards";
import { HomepageProductProof } from "@/components/HomepageProductProof";
import { ProductCommerceSurface } from "@/components/commerce/CommerceSurfaces";
import { getReportAccessPolicy } from "@/lib/monetization/product-entitlement-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تفسیر چارت تولد فارسی | گزارش تولد شخصی هالیوس",
  description: "ساختار گزارش چارت تولد هالیوس، مسیر خواندن، تفاوت Free و Full براساس سیاست دسترسی واقعی، و نمونهٔ تجربهٔ تفسیر فارسی را ببین.",
  alternates: { canonical: "/product" },
  robots: { index: true, follow: true },
};

export default async function ProductPage() {
  // HALLEUS_FREE_ALL_PRODUCT_PAGE_BATCH1_R1
  const policy = await getReportAccessPolicy();
  const freeAll = policy.monetizationMode === "FREE_ALL";
  return (
    <ProductCommerceSurface
      freeAll={freeAll}
      accessAndPackages={freeAll ? null : <ProductOfferGrid />}
      proof={<HomepageProductProof />}
    />
  );
}
