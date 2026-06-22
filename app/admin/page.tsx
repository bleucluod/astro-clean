import type { Metadata } from "next";
import { FeatureFlagList } from "@/components/FeatureFlagList";

export const metadata: Metadata = {
  title: "ادمین MVP | Astro Clean",
  description:
    "پنل ساده ادمین Astro Clean برای نمایش feature flagها و آماده‌سازی مسیر کنترل محصول در آینده.",
};

export default function AdminPage() {
  return (
    <section className="grid">
      <div className="card">
        <span className="badge">ادمین MVP</span>

        <h1>Feature Flags آینده محصول</h1>

        <p>
          این پنل فعلاً فقط نمایشی است. هنوز backend، auth، دیتابیس یا ادمین
          واقعی نداریم. هدف این است که از همین MVP ذهنیت کنترل قابلیت‌ها را
          تمیز نگه داریم.
        </p>
      </div>

      <FeatureFlagList />
    </section>
  );
}
