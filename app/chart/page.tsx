import type { Metadata } from "next";
import { ChartForm } from "@/components/ChartForm";

export const metadata: Metadata = {
  title: "ساخت گزارش تولد | Halleus",
  description:
    "صفحه شروع ساخت گزارش تولد در Halleus؛ تاریخ شمسی، ساعت و شهر تولد را وارد می‌کنی و گزارش فارسی ذخیره‌شده می‌گیری.",
  alternates: {
    canonical: "/chart",
  },
};

export default function ChartPage() {
  return <ChartForm />;
}
