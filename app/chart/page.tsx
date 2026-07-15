import type { Metadata } from "next";
import { ChartForm } from "@/components/ChartForm";

export const metadata: Metadata = {
  title: "ساخت چارت تولد رایگان | گزارش تولد فارسی هالیوس",
  description:
    "با تاریخ، ساعت و شهر تولد، چارت تولد خودت را در هالیوس بساز و گزارش تولد فارسی بگیر. اگر ساعت تولدت را نمی‌دانی، محدودیت‌های رایزینگ و خانه‌ها را هم روشن ببین.",
  alternates: {
    canonical: "/chart",
  },
};

export default function ChartPage() {
  return <ChartForm />;
}
