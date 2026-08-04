import type { Metadata } from "next";
import { FinalEditorialPage } from "@/components/FinalEditorialPage";
import { PremiumRequestForm } from "@/components/PremiumRequestForm";

type OrderPageProps = { searchParams?: Promise<{ reportId?: string | string[] }> };

export const metadata: Metadata = {
  title: "درخواست نسخه کامل‌تر گزارش چارت تولد | هالیوس",
  description: "درخواست نسخه کامل‌تر گزارش هالیوس را ثبت کن. ثبت فرم به معنی پرداخت یا شروع قطعی نیست و زمان، هزینه و محدوده پیش از آغاز جداگانه تأیید می‌شوند.",
  alternates: { canonical: "/order" },
};

function normalizeReportId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function OrderPage({ searchParams }: OrderPageProps) {
  const params = await searchParams;
  return <FinalEditorialPage pageKey="order" slots={{ "request-form": <PremiumRequestForm initialReportId={normalizeReportId(params?.reportId).trim()} /> }} omitActionSections={["request-preview"]} />;
}
