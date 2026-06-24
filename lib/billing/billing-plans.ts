import type { BillingPlan, BillingPlanSlug } from "@/types/billing";

export const BILLING_PLANS = [
  {
    slug: "preview",
    name: "Preview",
    description: "برای تست رایگان محصول در حالت local preview.",
    currency: "USD",
    monthlyPrice: 0,
    yearlyPrice: 0,
    isPublic: true,
    features: [
      "ساخت گزارش‌های mock در مرورگر",
      "آرشیو محلی گزارش‌ها",
      "یادداشت و علاقه‌مندی",
      "Export و Import گزارش‌ها",
    ],
    limits: {
      savedReports: 50,
      exportsPerMonth: "unlimited",
      advancedReports: 0,
    },
  },
  {
    slug: "personal",
    name: "Personal",
    description: "برای کاربرانی که می‌خواهند گزارش‌ها را در حساب خود نگه دارند.",
    currency: "USD",
    monthlyPrice: 9,
    yearlyPrice: 90,
    isPublic: true,
    features: [
      "ذخیره‌سازی ابری گزارش‌ها",
      "گزارش‌های پیشرفته‌تر",
      "یادداشت‌های خصوصی",
      "دسترسی از چند دستگاه",
    ],
    limits: {
      savedReports: "unlimited",
      exportsPerMonth: "unlimited",
      advancedReports: 20,
    },
  },
  {
    slug: "professional",
    name: "Professional",
    description: "برای استفاده جدی‌تر، آرشیو بزرگ‌تر و خروجی‌های حرفه‌ای‌تر.",
    currency: "USD",
    monthlyPrice: 19,
    yearlyPrice: 190,
    isPublic: true,
    features: [
      "همه قابلیت‌های Personal",
      "گزارش‌های پیشرفته نامحدود",
      "خروجی‌های کامل‌تر",
      "آمادگی برای client workflow",
    ],
    limits: {
      savedReports: "unlimited",
      exportsPerMonth: "unlimited",
      advancedReports: "unlimited",
    },
  },
] as const satisfies readonly BillingPlan[];

export function getBillingPlan(planSlug: BillingPlanSlug): BillingPlan {
  return BILLING_PLANS.find((plan) => plan.slug === planSlug) ?? BILLING_PLANS[0];
}

export function getPublicBillingPlans(): BillingPlan[] {
  return BILLING_PLANS.filter((plan) => plan.isPublic);
}
