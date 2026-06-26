import type { Metadata } from "next";
import { ReportsList } from "@/components/ReportsList";

export const metadata: Metadata = {
  title: "گزارش‌های ذخیره‌شده | Halleus",
  description:
    "مشاهده و مدیریت گزارش‌های ذخیره‌شده چارت تولد در Halleus.",
};

export default function ReportsPage() {
  return <ReportsList />;
}
