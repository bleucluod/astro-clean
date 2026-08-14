import type { Metadata } from "next";

import { ProductOfferGrid } from "@/components/monetization/ProductAccessCards";
import { PricingCommerceSurface } from "@/components/commerce/CommerceSurfaces";

export const metadata: Metadata = {
  title: "قیمت گزارش چارت تولد کامل و اعتبارها | هالیوس",
  description: "گزارش پایه هالیوس را رایگان شروع کن و بسته‌های فعال گزارش کامل و تحلیل رابطه را با قیمت و تعداد اعتبارهای واقعی کاتالوگ هالیوس ببین.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return <PricingCommerceSurface packages={<ProductOfferGrid />} />;
}
