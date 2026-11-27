import { notFound } from "next/navigation";
import { ComparisonDemo } from "@/components/comparison/ComparisonDemo";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CompareDemoPage() {
  if (process.env.NODE_ENV !== "development" || process.env.HALLEUS_COMPARE_LOCAL_DEMO !== "1") notFound();
  return <ComparisonDemo />;
}
