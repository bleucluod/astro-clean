import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "چارت سیناستری آنلاین | مقایسه دو چارت تولد",
    template: "%s | هالیوس",
  },
  description:
    "چارت سیناستری آنلاین برای مقایسه دو چارت تولد و خواندن الگوهای گفت‌وگو، امنیت عاطفی، مرزها، اصطکاک و رشد؛ بدون نمره یا حکم قطعی.",
  referrer: "no-referrer",
};

export default function CompareLayout({ children }: { children: ReactNode }) {
  return children;
}
