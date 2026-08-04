import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "خوانش خصوصی تحلیل رابطه",
  description: "نتیجهٔ خصوصی تحلیل رابطه در هالیوس.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  referrer: "no-referrer",
};

export default function PrivateComparisonLayout({ children }: { children: ReactNode }) {
  return children;
}
