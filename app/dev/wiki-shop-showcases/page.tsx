import { notFound } from "next/navigation";
import { WikiShopShowcasePanel } from "@/components/admin/WikiShopShowcasePanel";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "پیش‌نمایش آزمایشی ویترین ویکی | هالیوس",
  robots: { index: false, follow: false },
};

export default function WikiShopShowcaseDevPreview() {
  // Never expose this sample interface on production or through the real admin route.
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main dir="rtl" style={{ minHeight: "100vh", padding: "24px 12px",
      background: "#f8fafc", color: "#243447" }}>
      <WikiShopShowcasePanel token="" canWrite demo />
    </main>
  );
}
