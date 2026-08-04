import type { Metadata } from "next";

import { FinalEditorialPage } from "@/components/FinalEditorialPage";
import { HomepageProductProof } from "@/components/HomepageProductProof";

export const metadata: Metadata = {
  title: "تفسیر چارت تولد فارسی | داخل گزارش هالیوس چیست؟",
  description: "ببین گزارش چارت تولد هالیوس چگونه تصویر کلی، خورشید، ماه، رایزینگ، خانه‌ها، جنبه‌ها و الگوهای برجسته را در یک تفسیر فارسی و قابل‌مرور کنار هم قرار می‌دهد.",
  alternates: { canonical: "/product" },
  robots: { index: true, follow: true },
};

export default function ProductPage() {
  return <FinalEditorialPage pageKey="product" slots={{ "report-overview": <HomepageProductProof /> }} />;
}
