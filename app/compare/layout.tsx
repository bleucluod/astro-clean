import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "چارت سیناستری آنلاین | مقایسه دو چارت تولد",
    template: "%s | هالیوس",
  },
  description:
    "دو چارت تولد را برای یک خوانش خصوصی سیناستری کنار هم بگذار و الگوهای گفت‌وگو، امنیت عاطفی، مرزها و اصطکاک را بدون نمره یا حکم قطعی بررسی کن.",
  referrer: "no-referrer",
};

export default function CompareLayout({ children }: { children: ReactNode }) {
  return children;
}
