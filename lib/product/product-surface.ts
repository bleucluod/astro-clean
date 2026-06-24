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
    description: "مسیر اصلی ساخت گزارش تولد در حالت preview.",
    status: "live",
  },
  {
    href: "/reports",
    label: "آرشیو گزارش‌ها",
    description: "گزارش‌های ذخیره‌شده، علاقه‌مندی‌ها، یادداشت‌ها و export/import.",
    status: "live",
  },
  {
    href: "/dashboard",
    label: "داشبورد",
    description: "نمای کلی گزارش‌ها و وضعیت storage/account.",
    status: "preview",
  },
  {
    href: "/profile",
    label: "پروفایل",
    description: "وضعیت preview account، plan و entitlementها.",
    status: "preview",
  },
  {
    href: "/pricing",
    label: "پلن‌ها",
    description: "مدل قیمت‌گذاری و آمادگی پرداخت، بدون payment واقعی.",
    status: "preview",
  },
  {
    href: "/privacy",
    label: "حریم داده",
    description: "توضیح شفاف درباره local storage و مسیر آینده account.",
    status: "live",
  },
  {
    href: "/roadmap",
    label: "نقشه راه",
    description: "مسیر محصول از preview تا account و پرداخت.",
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
    description: "وضعیت زیرساخت جایگزینی mock با محاسبه واقعی.",
    status: "preview",
  },
  {
    href: "/quality",
    label: "کیفیت گزارش",
    description: "استاندارد لحن، بخش‌ها و safety برای گزارش‌های آینده.",
    status: "preview",
  },
  {
    href: "/interpretation",
    label: "تفسیر گزارش",
    description: "ماژول‌های ترکیب گزارش و pipeline تفسیر آینده.",
    status: "preview",
  },
];

export function getProductSurfaceLinks() {
  return PRODUCT_SURFACE_LINKS;
}
