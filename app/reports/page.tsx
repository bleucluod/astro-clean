import type { Metadata } from "next";
import { ReportsList } from "@/components/ReportsList";

export const metadata: Metadata = {
  title: "گزارش‌های ذخیره‌شده | Astro Clean",
  description:
    "مشاهده گزارش‌های ذخیره‌شده کاربر در Astro Clean با ذخیره موقت در مرورگر در نسخه MVP.",
};

export default function ReportsPage() {
  return <ReportsList />;
}
