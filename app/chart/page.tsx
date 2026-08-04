import type { Metadata } from "next";
import { ChartForm } from "@/components/ChartForm";

export const metadata: Metadata = {
  title: "چارت تولد رایگان فارسی با تفسیر | هالیوس",
  description:
    "تاریخ، ساعت و شهر تولدت را وارد کن تا چارت تولد رایگان فارسی و گزارش شخصی خورشید، ماه، رایزینگ، خانه‌ها و جنبه‌ها را ببینی؛ با محدودیت روشن برای ساعت نامعلوم.",
  alternates: {
    canonical: "/chart",
  },
};

export default function ChartPage() {
  return <ChartForm />;
}
