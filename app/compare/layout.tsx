import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "مقایسه دو چارت | هالیوس",
    template: "%s | هالیوس",
  },
  description:
    "مقایسه خصوصی دو چارت تولد با تمرکز بر الگوهای رابطه، گفت‌وگو، امنیت عاطفی و مرزها.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
  referrer: "no-referrer",
};

export default function CompareLayout({ children }: { children: ReactNode }) {
  return children;
}
