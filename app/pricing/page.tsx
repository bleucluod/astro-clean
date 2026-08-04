import type { Metadata } from "next";

import { FinalEditorialPage } from "@/components/FinalEditorialPage";

export const metadata: Metadata = {
  title: "گزارش پایه و گزینه‌های نسخه کامل‌تر | هالیوس",
  description: "گزارش پایه هالیوس را رایگان شروع کن و در صورت نیاز، گزینه‌های نسخه کامل‌تر را ببین. زمان، هزینه، محدوده و قالب تحویل پیش از شروع جداگانه تأیید می‌شوند.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return <FinalEditorialPage pageKey="pricing" />;
}
