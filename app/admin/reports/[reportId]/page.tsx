import type { Metadata } from "next";
import { AdminReportsWorkspace } from "@/components/admin/AdminReportsWorkspace";

export const metadata: Metadata = { title: "جزئیات گزارش | هالیوس", robots: { index: false, follow: false } };
export default async function AdminReportDetailPage({ params }: { params: Promise<{ reportId: string }> }) { const { reportId } = await params; return <AdminReportsWorkspace reportId={reportId} />; }
