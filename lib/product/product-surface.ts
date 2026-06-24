export type ProductSurfaceLink = {
  href: string;
  label: string;
  description: string;
  status: "live" | "preview" | "planned";
};

export const PRODUCT_SURFACE_LINKS: ProductSurfaceLink[] = [
  {
    href: "/chart",
    label: "ساخت گزارش",
    description: "مسیر اصلی ساخت گزارش تولد در حالت آزمایشی.",
    status: "live",
  },
  {
    href: "/reports",
    label: "آرشیو گزارش‌ها",
    description: "گزارش‌های ذخیره‌شده، علاقه‌مندی‌ها، یادداشت‌ها و خروجی متنی.",
    status: "live",
  },
  {
    href: "/dashboard",
    label: "داشبورد",
    description: "نمای کلی گزارش‌ها و وضعیت ذخیره‌سازی و حساب کاربری.",
    status: "preview",
  },
  {
    href: "/profile",
    label: "پروفایل",
    description: "وضعیت حساب آزمایشی، پلن و دسترسی‌ها.",
    status: "preview",
  },
  {
    href: "/pricing",
    label: "پلن‌ها",
    description: "مدل قیمت‌گذاری و آمادگی پرداخت، بدون پرداخت واقعی.",
    status: "preview",
  },
  {
    href: "/privacy",
    label: "حریم داده",
    description: "توضیح شفاف درباره ذخیره محلی و مسیر آینده حساب کاربری.",
    status: "live",
  },
  {
    href: "/roadmap",
    label: "نقشه راه",
    description: "مسیر محصول از نسخه آزمایشی تا حساب کاربری و پرداخت.",
    status: "preview",
  },
  {
    href: "/wiki",
    label: "راهنما",
    description: "راهنمای مفهومی Halleus و گزارش‌های نمادین.",
    status: "preview",
  },
  {
    href: "/engine",
    label: "موتور چارت",
    description: "وضعیت زیرساخت جایگزینی خروجی آزمایشی با محاسبه واقعی.",
    status: "preview",
  },
  {
    href: "/engine/decision",
    label: "تصمیم موتور واقعی",
    description: "مقایسه مسیرهای محاسبه واقعی چارت و انتخاب مسیر MVP.",
    status: "preview",
  },
  {
    href: "/engine/real",
    label: "نمونه موتور واقعی",
    description: "نمونه اولیه اتصال astronomy-engine به مسیر گزارش.",
    status: "preview",
  },
  {
    href: "/quality",
    label: "کیفیت گزارش",
    description: "استاندارد لحن، بخش‌ها و ایمنی برای گزارش‌های آینده.",
    status: "preview",
  },
  {
    href: "/interpretation",
    label: "تفسیر گزارش",
    description: "ماژول‌های ترکیب گزارش و مسیر تفسیر آینده.",
    status: "preview",
  },
  {
    href: "/language",
    label: "زبان محصول",
    description: "لایه فارسی‌سازی، متن‌های مرکزی و مسیر کنترل‌شده Finglish به فارسی.",
    status: "preview",
  },
];

export function getProductSurfaceLinks() {
  return PRODUCT_SURFACE_LINKS;
}
