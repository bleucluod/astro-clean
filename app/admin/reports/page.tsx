import type { Metadata } from "next";
import { AdminReportsWorkspace } from "@/components/admin/AdminReportsWorkspace";

export const metadata: Metadata = { title: "مدیریت گزارش‌ها | هالیوس", robots: { index: false, follow: false } };
export default function AdminReportsPage() { return <AdminReportsWorkspace />; }
