import type { Metadata } from "next";

import { FinalEditorialPage } from "@/components/FinalEditorialPage";
import { ComparisonComposer } from "@/components/comparison/ComparisonComposer";

export const metadata: Metadata = {
  title: "چارت سیناستری آنلاین | مقایسه دو چارت تولد",
  description: "دو چارت تولد را در چارت سیناستری هالیوس کنار هم بگذار و گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها و اصطکاک را در یک نتیجه خصوصی و بدون درصد سازگاری بررسی کن.",
  alternates: { canonical: "/compare" },
  robots: { index: true, follow: true },
};

export default function ComparePage() {
  return <FinalEditorialPage pageKey="compare" slots={{ "chart-selection": <ComparisonComposer embedded /> }} />;
}
