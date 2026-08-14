import type { Metadata } from "next";

import { ProductOfferGrid } from "@/components/monetization/ProductAccessCards";
import { HomepageProductProof } from "@/components/HomepageProductProof";
import { ProductCommerceSurface } from "@/components/commerce/CommerceSurfaces";

export const metadata: Metadata = {
  title: "تفسیر چارت تولد فارسی | گزارش تولد شخصی هالیوس",
  description: "ساختار گزارش چارت تولد هالیوس، مسیر خواندن، تفاوت Free و Full براساس سیاست دسترسی واقعی، و نمونهٔ تجربهٔ تفسیر فارسی را ببین.",
  alternates: { canonical: "/product" },
  robots: { index: true, follow: true },
};

export default function ProductPage() {
  return <ProductCommerceSurface accessAndPackages={<ProductOfferGrid />} proof={<HomepageProductProof />} />;
}
