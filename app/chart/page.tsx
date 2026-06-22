import type { Metadata } from "next";
import { ChartForm } from "@/components/ChartForm";

export const metadata: Metadata = {
  title: "ساخت چارت تولد | Astro Clean",
  description:
    "فرم ساخت چارت تولد در Astro Clean برای دریافت تحلیل نمادین فارسی بر اساس تاریخ، ساعت و محل تولد.",
};

export default function ChartPage() {
  return <ChartForm />;
}
