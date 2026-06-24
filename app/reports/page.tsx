import type { Metadata } from "next";
import { ReportsList } from "@/components/ReportsList";

export const metadata: Metadata = {
  title: "گزارش‌های ذخیره‌شده | Halleus",
  description:
    "مشاهده گزارش‌های ذخیره‌شده کاربر در Halleus با ذخیره موقت در مرورگر در نسخه MVP.",
};

export default function ReportsPage() {
  return <ReportsList />;
}
