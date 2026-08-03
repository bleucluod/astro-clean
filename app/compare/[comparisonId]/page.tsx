import { ComparisonReport } from "@/components/comparison/ComparisonReport";

type ComparisonPageProps = {
  params: Promise<{
    comparisonId: string;
  }>;
};

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { comparisonId } = await params;
  return <ComparisonReport comparisonId={comparisonId} />;
}
