import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/config/seo";
import { AnalyticsPreferencesLink } from "@/components/AnalyticsConsent";
import { FinalEditorialPage } from "@/components/FinalEditorialPage";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "حریم خصوصی هالیوس | انتشار، حذف و ایندکس گزارش‌ها",
  description: "قواعد عمومی یا خصوصی بودن گزارش تولد، نمایش نام، حذف گزارش، تحلیل رابطه، سفارش و Analytics را در حریم خصوصی هالیوس روشن و یک‌جا بخوان.",
  canonical: "/privacy",
});

export default function PrivacyPage() {
  return <FinalEditorialPage pageKey="privacy" slots={{ analytics: <AnalyticsPreferencesLink label="تنظیم آمار بازدید هالیوس" /> }} omitActionSections={["analytics"]} />;
}
