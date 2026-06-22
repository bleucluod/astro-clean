import type { Metadata } from "next";
import { DashboardSummary } from "@/components/DashboardSummary";

export const metadata: Metadata = {
  title: "داشبورد شخصی | Astro Clean",
  description:
    "داشبورد شخصی Astro Clean برای مشاهده آخرین گزارش‌ها، وضعیت کاربر و مسیر آینده تحلیل‌های نمادین.",
};

export default function DashboardPage() {
  return <DashboardSummary />;
}
