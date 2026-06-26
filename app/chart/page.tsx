import type { Metadata } from "next";
import { ChartForm } from "@/components/ChartForm";

export const metadata: Metadata = {
  title: "ساخت گزارش تولد | Halleus",
  description:
    "فرم ساخت گزارش تولد در Halleus؛ کاربر تاریخ، ساعت و شهر تولد را وارد می‌کند و گزارش فارسی ذخیره‌شده دریافت می‌کند.",
};

export default function ChartPage() {
  return <ChartForm />;
}
