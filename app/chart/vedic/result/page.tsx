import type { Metadata } from "next";
import { VedicD1GuestResult } from "@/components/vedic/VedicD1GuestResult";

// Unsaved guest results have no standalone public/indexable document yet.
export const metadata: Metadata = {
  title: "گزارش رایگان چارت ودیک | هالیوس",
  description: "نمایش موقت گزارش رایگان چارت تولد ودیک، نمودار D1 و موقعیت سیاره‌ها.",
  robots: { index: false, follow: false },
};

export default function VedicD1ResultPage() {
  return <VedicD1GuestResult />;
}
