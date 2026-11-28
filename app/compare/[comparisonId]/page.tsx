import { ComparisonReport } from "@/components/comparison/ComparisonReport";
import { ComparisonPremiumLibrary } from "@/components/comparison/ComparisonPremiumLibrary";
import { isComparisonStorageReady,isComparisonCheckoutReady } from "@/lib/comparison/comparison-payment-config";
import { UUID } from "@/lib/comparison/comparison-payment-flow";
import { notFound } from "next/navigation";
export const dynamic="force-dynamic";

type ComparisonPageProps = {
  params: Promise<{
    comparisonId: string;
  }>;
};

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { comparisonId } = await params;
  if (UUID.test(comparisonId)) {
    if (!isComparisonStorageReady()) notFound();
    return <ComparisonPremiumLibrary key={comparisonId} directReportId={comparisonId} checkoutEnabled={isComparisonCheckoutReady()} />;
  }
  return <ComparisonReport comparisonId={comparisonId} />;
}
