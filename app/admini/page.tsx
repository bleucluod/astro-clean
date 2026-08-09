import { Suspense } from "react";
import { AdminDirectGate } from "@/components/admin/AdminDirectGate";

export default function AdminiPage() {
  return (
    <Suspense fallback={<div>در حال آماده‌سازی پنل مدیریت…</div>}>
      <AdminDirectGate />
    </Suspense>
  );
}
