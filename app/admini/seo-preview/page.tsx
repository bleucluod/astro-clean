import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { SeoKeywordWorkspace } from "@/components/admin/SeoKeywordWorkspace";

export const dynamic = "force-dynamic";

export default async function LocalSeoPreviewPage() {
  // Preview-only: no auth bypass and no access to privileged admin APIs.
  const requestHeaders = await headers();
  const host = (requestHeaders.get("host") ?? "").toLowerCase();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.toLowerCase();
  const loopback = /^(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(host);
  if (process.env.NODE_ENV !== "development" || !loopback ||
    (forwardedHost && forwardedHost !== host)) notFound();

  return (
    <main dir="rtl" style={{ minHeight: "100vh", background: "#f4f7fa", color: "#243447", padding: "24px 14px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <p style={{ margin: "0 0 14px", color: "#52657a", fontSize: 14 }}>
          پیش‌نمایش محلی SEO · بدون لاگین · بدون اتصال به دیتابیس و API خصوصی
        </p>
        <SeoKeywordWorkspace token="" canWrite graphArticles={[]} previewOnly />
      </div>
    </main>
  );
}
