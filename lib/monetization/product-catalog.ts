export type HalleusCreditType =
  | "full_report_credit"
  | "relationship_credit";

export type HalleusProductPackage = {
  code: string;
  name: string;
  active: boolean;
  priceMinor: number;
  currency: "IRR";
  fullReportCredits: number;
  relationshipCredits: number;
  displayOrder: number;
  badge: string | null;
  cta: string;
  description: string;
  // Compatibility aliases for Phase-5 callers until Batch 3 rewrites commerce pages.
  shortLabel: string;
  promise: string;
  testPriceToman: number;
  priceMode: "configured";
};

export type HalleusPackageCode = string;
export type HalleusProductCode = HalleusPackageCode;

export const HALLEUS_DEFAULT_PACKAGE_CODES = [
  "single_full",
  "full_5",
  "couple_5_2",
] as const;

export const DEFAULT_PRODUCT_PACKAGES: readonly HalleusProductPackage[] = [
  {
    code: "single_full",
    name: "یک گزارش کامل",
    active: false,
    priceMinor: 1_490_000,
    currency: "IRR",
    fullReportCredits: 1,
    relationshipCredits: 0,
    displayOrder: 10,
    badge: null,
    cta: "گرفتن یک گزارش کامل",
    description:
      "یک اعتبار برای بازکردن دائمی یک گزارش تولد کامل. این بسته به‌صورت پیش‌فرض فعال نیست.",
    shortLabel: "یک گزارش کامل",
    promise: "یک گزارش را کامل باز کن و همان گزارش برای همیشه روی حسابت باز بماند.",
    testPriceToman: 149_000,
    priceMode: "configured",
  },
  {
    code: "full_5",
    name: "۵ گزارش کامل",
    active: true,
    priceMinor: 5_000_000,
    currency: "IRR",
    fullReportCredits: 5,
    relationshipCredits: 0,
    displayOrder: 20,
    badge: "پیشنهاد اصلی",
    cta: "گرفتن ۵ گزارش کامل",
    description:
      "پنج اعتبار مستقل؛ هر اعتبار یک گزارش تولد را برای همیشه کامل باز می‌کند.",
    shortLabel: "۵ گزارش کامل",
    promise: "۵ گزارش کامل برای چارت‌های مختلف؛ بدون اشتراک ماهانه.",
    testPriceToman: 500_000,
    priceMode: "configured",
  },
  {
    code: "couple_5_2",
    name: "۵ گزارش کامل + ۲ تحلیل رابطه",
    active: true,
    priceMinor: 7_000_000,
    currency: "IRR",
    fullReportCredits: 5,
    relationshipCredits: 2,
    displayOrder: 30,
    badge: "برای دو نفر",
    cta: "گرفتن بسته رابطه",
    description:
      "پنج گزارش کامل و دو اعتبار ساخت تحلیل رابطه خصوصی.",
    shortLabel: "۵ گزارش کامل + ۲ تحلیل رابطه",
    promise: "۵ گزارش کامل + ۲ تحلیل رابطه خصوصی، بدون محصول Relationship جدا.",
    testPriceToman: 700_000,
    priceMode: "configured",
  },
];

export const HALLEUS_PRODUCT_CODES = HALLEUS_DEFAULT_PACKAGE_CODES;
export const HALLEUS_PRODUCT_OFFERS = DEFAULT_PRODUCT_PACKAGES;

// HALLEUS_CREDIT_PACKAGE_CATALOG_R1
export function isHalleusPackageCode(
  value: unknown,
): value is HalleusPackageCode {
  return (
    typeof value === "string" &&
    /^[a-z0-9]+(?:_[a-z0-9]+)*$/u.test(value) &&
    value.length <= 80
  );
}

export function normalizeHalleusPackageCode(
  value: unknown,
): HalleusPackageCode | null {
  if (value === "premium_birth") return "single_full";
  if (value === "bundle") return "couple_5_2";
  if (value === "relationship") return null;
  return isHalleusPackageCode(value) ? value : null;
}

export function isHalleusProductCode(
  value: unknown,
): value is HalleusProductCode {
  return normalizeHalleusPackageCode(value) !== null;
}

export function getFallbackProductPackage(
  code: string,
): HalleusProductPackage | null {
  const normalized = normalizeHalleusPackageCode(code);
  if (!normalized) return null;
  return (
    DEFAULT_PRODUCT_PACKAGES.find(
      (item) => item.code === normalized,
    ) ?? null
  );
}

export function getHalleusProductOffer(code: HalleusProductCode) {
  const offer = getFallbackProductPackage(code);
  if (!offer) {
    throw new Error(`Unknown Halleus package code: ${code}`);
  }
  return offer;
}

export function formatPackagePriceToman(
  priceMinor: number,
  currency: "IRR",
) {
  const toman = currency === "IRR" ? Math.round(priceMinor / 10) : priceMinor;
  return `${toman.toLocaleString("fa-IR")} تومان`;
}

export function formatTestPriceToman(value: number) {
  return `${value.toLocaleString("fa-IR")} تومان`;
}
