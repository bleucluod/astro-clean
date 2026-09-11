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
    href: "/order",
    label: "سفارش دستی",
    description:
      "آماده‌سازی متن سفارش و هماهنگی دستی پیش از فعال شدن پرداخت آنلاین.",
    status: "live",
  },
  {
    href: "/privacy",
    label: "حریم داده",
    description: "توضیح شفاف درباره ذخیره محلی و مسیر آینده حساب کاربری.",
    status: "live",
  },
  {
    href: "/wiki",
    label: "راهنما",
    description: "راهنمای مفهومی Halleus و گزارش‌های نمادین.",
    status: "preview",
  },
];


export const SALES_NAVIGATION_LINKS = [
  {
    href: "/chart",
    label: "ساخت گزارش",
  },
  {
    href: "/product",
    label: "محصول",
  },
  {
    href: "/pricing",
    label: "پلن‌ها",
  },
    {
    href: "/order",
    label: "سفارش دستی",
  },
  {
    href: "/reports",
    label: "گزارش‌ها",
  },
  {
    href: "/privacy",
    label: "حریم داده",
  },
] as const;

export function getSalesNavigationLinks() {
  return SALES_NAVIGATION_LINKS;
}

export function getProductSurfaceLinks() {
  return PRODUCT_SURFACE_LINKS;
}
