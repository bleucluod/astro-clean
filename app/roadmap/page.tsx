import type { Metadata } from "next";
import Link from "next/link";
import { roadmapItems } from "@/lib/config/roadmap";

export const metadata: Metadata = {
  title: "نقشه راه محصول | Astro Clean",
  description:
    "نقشه راه Astro Clean از MVP ساده تا اکوسیستم فارسی آسترولوژی شخصی، اجتماعی، محتوایی و SEO محور.",
};

export default function RoadmapPage() {
  return (
    <section className="grid">
      <div className="card">
        <span className="badge">نقشه راه Astro Clean</span>

        <h1>از MVP ساده تا اکوسیستم آسترولوژی شخصی</h1>

        <p>
          Astro Clean را از یک محصول کوچک و قابل دیدن شروع می‌کنیم. هدف فعلی
          ساخت تجربه‌ای تمیز و قابل لمس است، نه معماری سنگین یا قابلیت‌های
          enterprise.
        </p>

        <p>
          مسیر آینده به شکلی طراحی می‌شود که منطق نجومی، قانون‌های تفسیری،
          لایه ارائه فارسی و در آینده AI از هم جدا بمانند.
        </p>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت چارت mock
          </Link>

          <Link className="button secondary" href="/wiki">
            دیدن Astro Wiki
          </Link>
        </div>
      </div>

      <div className="grid grid-3">
        {roadmapItems.map((item) => (
          <article className="card" key={item.title}>
            <span className="badge">{item.phase}</span>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className="card">
        <h2>اصل اخلاقی محصول</h2>
        <p>
          تحلیل‌ها در Astro Clean به عنوان تفسیر نمادین، سرگرمی و خودشناسی
          ارائه می‌شوند. محصول نباید پیش‌بینی قطعی یا توصیه پزشکی، مالی، حقوقی
          یا تصمیم‌گیری جدی ارائه کند.
        </p>
      </div>
    </section>
  );
}
