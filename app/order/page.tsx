import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/config/seo";
import { PremiumRequestForm } from "@/components/PremiumRequestForm";
import { isHalleusProductCode, type HalleusProductCode } from "@/lib/monetization/product-catalog";
import { ProductOfferGrid } from "@/components/monetization/ProductAccessCards";
import { OrderCommerceSurface } from "@/components/commerce/CommerceSurfaces";
import { getReportAccessPolicy } from "@/lib/monetization/product-entitlement-service";

type OrderPageProps = { searchParams?: Promise<{ reportId?: string | string[]; product?: string | string[]; package?: string | string[] }> };

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "خرید اعتبار گزارش کامل و تحلیل رابطه | هالیوس",
  description: "بستهٔ هالیوس را انتخاب کن و خرید را به‌صورت دستی با @lbleu هماهنگ کن. قیمت و اعتبارها از کاتالوگ فعال هالیوس خوانده می‌شوند و هیچ پرداخت موفق ساختگی نمایش داده نمی‌شود.",
  canonical: "/order",
});

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function productCode(value: string | string[] | undefined): HalleusProductCode {
  const normalized = first(value).trim();
  return isHalleusProductCode(normalized) ? normalized : "full_5";
}

function normalizeCommerceValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] ?? "" : value ?? "").trim();
}

export default async function OrderPage({ searchParams }: OrderPageProps) {
  // HALLEUS_FREE_ALL_ORDER_PAGE_BATCH1_R1
  const policy = await getReportAccessPolicy();
  const freeAll = policy.monetizationMode === "FREE_ALL";
  const params = await searchParams;
  const commerceParams = params as Record<string, string | string[] | undefined> | undefined;
  const selectedPackageCode = normalizeCommerceValue(commerceParams?.package) || normalizeCommerceValue(commerceParams?.product);
  return (
    <OrderCommerceSurface
      freeAll={freeAll}
      selectedPackageCode={selectedPackageCode}
      catalog={<ProductOfferGrid />}
      requestForm={<PremiumRequestForm
            initialReportId={first(params?.reportId).trim()}
            initialProductCode={productCode(params?.package ?? params?.product)}
          />}
    />
  );
}
