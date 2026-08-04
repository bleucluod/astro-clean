import Link from "next/link";
import { seoRoutes, siteConfig } from "@/lib/config/seo";

export function DeploymentStatusCard() {
  return (
    <section className="card">
      <span className="badge">Deployment</span>

      <h2>وضعیت آمادگی deploy</h2>

      <p>
        این کارت نشان می‌دهد اپ برای public frontend demo با چه URL پایه‌ای
        sitemap، robots و metadata را می‌سازد.
      </p>

      <div className="status-grid">
        <div className="mini-card">
          <strong>Site URL</strong>
          <span>{siteConfig.url}</span>
        </div>

        <div className="mini-card">
          <strong>SEO Routes</strong>
          <span>{seoRoutes.length.toLocaleString("fa-IR")}</span>
        </div>

        <div className="mini-card">
          <strong>Public SEO</strong>
          <span>هنوز غیرفعال</span>
        </div>

        <div className="mini-card">
          <strong>Backend</strong>
          <span>نداریم</span>
        </div>
      </div>

      <div className="actions">
        <Link className="button secondary" href="/sitemap.xml">
          دیدن sitemap
        </Link>

        <Link className="button secondary" href="/robots.txt">
          دیدن robots
        </Link>

        <Link className="button secondary" href="/privacy">
          حریم داده
        </Link>
      </div>
    </section>
  );
}
