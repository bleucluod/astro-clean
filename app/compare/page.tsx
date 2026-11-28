import type { Metadata } from "next";

import { ComparisonLanding } from "@/components/comparison/ComparisonLanding";
import { buildPublicPageMetadata } from "@/lib/config/seo";

const title = "چارت ازدواج آنلاین | مقایسه دو چارت تولد با پیش‌نمایش رایگان";
const description =
  "چارت ازدواج دو نفر را بسازید و پیش‌نمایش رایگان تحلیل رابطه را بخوانید؛ مقایسه دو چارت تولد، کشش، امنیت عاطفی و جنبه‌های سیناستری، حتی بدون ساعت دقیق تولد.";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    title,
    description,
    canonical: "/compare",
    image: {
      url: "/halleus-compare-og.png",
      width: 1200,
      height: 630,
      alt: "چارت سیناستری هالیوس؛ تحلیل رابطه و ازدواج دو نفر",
    },
  }),
  robots: { index: true, follow: true },
};

export default function ComparePage() {
  return <ComparisonLanding />;
}
