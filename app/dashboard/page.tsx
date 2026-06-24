import type { Metadata } from "next";
import { DashboardSummary } from "@/components/DashboardSummary";

export const metadata: Metadata = {
  title: "داشبورد شخصی | Halleus",
  description:
    "داشبورد شخصی Halleus برای مشاهده آخرین گزارش‌ها، وضعیت کاربر و مسیر آینده تحلیل‌های نمادین.",
};

export default function DashboardPage() {
  return <DashboardSummary />;
}
