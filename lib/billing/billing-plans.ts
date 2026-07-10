import type { BillingPlan, BillingPlanSlug } from "@/types/billing";

export const BILLING_PLANS = [
  {
    slug: "preview",
    name: "گزارش پایه",
    description: "برای شروع رایگان و خواندن نسخه اولیه گزارش تولد.",
    currency: "USD",
    monthlyPrice: 0,
    yearlyPrice: 0,
    isPublic: true,
    features: [
      "ساخت گزارش تولد پایه",
      "نگهداری گزارش‌های ذخیره‌شده",
      "یادداشت و علاقه‌مندی",
      "دریافت فایل پشتیبان",
    ],
    limits: {
      savedReports: 50,
      exportsPerMonth: "unlimited",
      advancedReports: 0,
    },
  },
  {
    slug: "personal",
    name: "گزارش کامل‌تر",
    description: "برای کسی که می‌خواهد گزارش تولدش را عمیق‌تر و منسجم‌تر بخواند.",
    currency: "USD",
    monthlyPrice: 9,
    yearlyPrice: 90,
    isPublic: true,
    features: [
      "خوانش کامل‌تر بر پایه گزارش تولد",
      "مرتب‌سازی نکته‌های مهم گزارش",
      "متن فارسی آرام و قابل برگشت",
      "مناسب برای مرور شخصی",
    ],
    limits: {
      savedReports: "unlimited",
      exportsPerMonth: "unlimited",
      advancedReports: 20,
    },
  },
  {
    slug: "professional",
    name: "خوانش عمیق‌تر",
    description: "برای وقتی که نسخه کامل‌تر، منسجم‌تر و قابل ارائه‌تر می‌خواهی.",
    currency: "USD",
    monthlyPrice: 19,
    yearlyPrice: 190,
    isPublic: true,
    features: [
      "همه موارد گزارش کامل‌تر",
      "تمرکز بیشتر بر الگوهای اصلی چارت",
      "متن نهایی منسجم‌تر",
      "مناسب برای استفاده جدی‌تر",
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
