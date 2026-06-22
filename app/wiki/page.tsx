import type { Metadata } from "next";
import Link from "next/link";
import { wikiTopics } from "@/lib/config/wiki";

export const metadata: Metadata = {
  title: "Astro Wiki | آسترو ویکی فارسی",
  description:
    "آسترو ویکی Astro Clean پایه‌ای سبک برای محتوای آموزشی فارسی درباره سیارات، خانه‌ها، رایزینگ‌ها و اصطلاحات آسترولوژی.",
};

export default function WikiPage() {
  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Astro Wiki</span>

        <h1>پایه سبک برای محتوای آموزشی و SEO</h1>

        <p>
          Astro Wiki در آینده محل محتوای آموزشی، طبیعی و قابل ایندکس خواهد بود.
          فعلاً فقط چند موضوع پایه را نشان می‌دهیم تا مسیر SEO از روز اول در
          ساختار محصول دیده شود، بدون اینکه وارد تولید انبوه صفحه شویم.
        </p>

        <p>
          متن‌های این بخش باید فارسی روان، بومی‌سازی‌شده و کنترل‌شده باشند؛ نه
          ترجمه ماشینی یا محتوای بی‌کیفیت programmatic.
        </p>

        <div className="actions">
          <Link className="button" href="/roadmap">
            دیدن نقشه راه
          </Link>

          <Link className="button secondary" href="/chart">
            ساخت چارت mock
          </Link>
        </div>
      </div>

      <div className="grid grid-3">
        {wikiTopics.map((topic) => (
          <article className="card" key={topic.slug}>
            <span className="badge">موضوع آموزشی</span>
            <h2>{topic.title}</h2>
            <p>{topic.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
