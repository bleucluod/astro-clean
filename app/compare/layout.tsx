import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "تحلیل رابطه با چارت تولد دو نفر | هالیوس",
    template: "%s | هالیوس",
  },
  description:
    "تحلیل خصوصی رابطه با چارت تولد دو نفر؛ با تمرکز بر گفت‌وگو، امنیت عاطفی، نزدیکی، مرزها و مسیر رشد.",
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
