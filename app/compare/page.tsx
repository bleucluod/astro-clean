import type { Metadata } from "next";
import { ComparisonComposer } from "@/components/comparison/ComparisonComposer";

export const metadata: Metadata = {
  title: "سازگاری چارت تولد دو نفر | تحلیل رابطه و سیناستری",
  description: "تحلیل رابطه با چارت تولد دو نفر؛ بررسی گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها و مسیر رشد بدون نمره یا حکم قطعی.",
};

export default function ComparePage() {
  return <ComparisonComposer />;
}
