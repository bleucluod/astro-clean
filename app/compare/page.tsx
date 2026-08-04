import type { Metadata } from "next";
import { ComparisonComposer } from "@/components/comparison/ComparisonComposer";

export const metadata: Metadata = {
  title: "چارت سیناستری آنلاین | مقایسه دو چارت تولد",
  description:
    "چارت سیناستری آنلاین برای تحلیل رابطه با مقایسه دو چارت تولد؛ بررسی گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها، ترمیم و مسیر رشد بدون نمره یا حکم قطعی.",
  alternates: {
    canonical: "/compare",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ComparePage() {
  return <ComparisonComposer />;
}
