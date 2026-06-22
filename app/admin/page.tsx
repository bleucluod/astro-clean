import type { Metadata } from "next";
import { DemoDataPanel } from "@/components/DemoDataPanel";
import { DeploymentStatusCard } from "@/components/DeploymentStatusCard";
import { FeatureFlagList } from "@/components/FeatureFlagList";
import { LocalDataBackupPanel } from "@/components/LocalDataBackupPanel";
import { LocalDataStatusCard } from "@/components/LocalDataStatusCard";
import { MvpStatusCard } from "@/components/MvpStatusCard";

export const metadata: Metadata = {
  title: "ادمین MVP | Astro Clean",
  description:
    "نمای داخلی وضعیت MVP، فیچر فلگ‌ها و ابزارهای دمو در Astro Clean.",
};

export default function AdminPage() {
  return (
    <section className="grid">
      <div className="card">
        <span className="badge">MVP Admin</span>

        <h1>پنل داخلی سبک برای کنترل MVP</h1>

        <p>
          این صفحه ادمین واقعی نیست. فعلاً فقط برای دیدن وضعیت محصول، کنترل
          فیچرهای آینده، ریست داده‌های دمو، مدیریت داده‌های localStorage و
          بررسی آمادگی deploy ساخته شده است.
        </p>
      </div>

      <MvpStatusCard />
      <DeploymentStatusCard />
      <LocalDataStatusCard />
      <LocalDataBackupPanel />
      <DemoDataPanel />
      <FeatureFlagList />
    </section>
  );
}
