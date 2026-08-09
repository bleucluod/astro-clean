import { AdminDirectGate } from "@/components/admin/AdminDirectGate";

export default async function AdminiReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  return <AdminDirectGate mode="reports" reportId={reportId} />;
}
