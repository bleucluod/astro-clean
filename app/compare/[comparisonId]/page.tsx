import { ComparisonReport } from "@/components/comparison/ComparisonReport";

type ComparisonPageProps = {
  params: Promise<{
    comparisonId: string;
  }>;
};

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { comparisonId } = await params;
  const localDemo = process.env.NODE_ENV === "development" && process.env.HALLEUS_COMPARE_LOCAL_DEMO === "1";
  return <ComparisonReport key={comparisonId} comparisonId={comparisonId} localDemo={localDemo} />;
}
