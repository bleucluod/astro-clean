import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/config/seo";
import { PremiumRequestForm } from "@/components/PremiumRequestForm";
import { OrderCommerceSurface } from "@/components/commerce/CommerceSurfaces";
import {
  DEFAULT_PRODUCT_PACKAGES,
  formatPackagePriceToman,
  normalizeHalleusPackageCode,
  type HalleusProductCode,
} from "@/lib/monetization/product-catalog";
import { getPublicReportAccessPolicy } from "@/lib/monetization/product-entitlement-service";

type OrderPageProps = {
  searchParams?: Promise<{
    reportId?: string | string[];
    product?: string | string[];
    package?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "خرید اعتبار گزارش کامل و تحلیل رابطه | هالیوس",
  description:
    "بستهٔ موردنظرت را ببین و برای خرید با هالیوس هماهنگ کن. اعتبار فقط بعد از تأیید پرداخت به حسابت اضافه می‌شود و خرید، گزارشت را خودکار عمومی نمی‌کند.",
  canonical: "/order",
});

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function activeProductCode(
  value: string | string[] | undefined,
): HalleusProductCode {
  const normalized = normalizeHalleusPackageCode(first(value).trim());
  const selected = DEFAULT_PRODUCT_PACKAGES.find(
    (item) => item.active && item.code === normalized,
  );

  if (selected) {
    return selected.code;
  }

  return (
    DEFAULT_PRODUCT_PACKAGES.find((item) => item.active)?.code ?? "full_5"
  );
}

function normalizeCommerceValue(value: string | string[] | undefined) {
  return first(value).trim();
}

export default async function OrderPage({ searchParams }: OrderPageProps) {
  const policy = await getPublicReportAccessPolicy();
  const freeAll = policy.monetizationMode === "FREE_ALL";
  const params = searchParams ? await searchParams : undefined;
  const requestedPackage =
    normalizeCommerceValue(params?.package) ||
    normalizeCommerceValue(params?.product);
  const selectedProductCode = activeProductCode(requestedPackage);
  const selectedPackage =
    DEFAULT_PRODUCT_PACKAGES.find(
      (item) => item.active && item.code === selectedProductCode,
    ) ?? DEFAULT_PRODUCT_PACKAGES.find((item) => item.active);

  if (!selectedPackage) {
    throw new Error("No active Halleus package is configured.");
  }

  return (
    <OrderCommerceSurface
      freeAll={freeAll}
      selectedPackage={{
        code: selectedPackage.code,
        name: selectedPackage.name,
        description: selectedPackage.description,
        priceLabel: formatPackagePriceToman(
          selectedPackage.priceMinor,
          selectedPackage.currency,
        ),
        fullReportCredits: selectedPackage.fullReportCredits,
        relationshipCredits: selectedPackage.relationshipCredits,
        badge: selectedPackage.badge,
      }}
      requestForm={
        <PremiumRequestForm
          initialReportId={first(params?.reportId).trim()}
          initialProductCode={selectedPackage.code}
        />
      }
    />
  );
}
