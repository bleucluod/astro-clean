import Link from "next/link";

const entries = [
  {
    term: "گزارش نمادین",
    description:
      "متنی تفسیری و سنتی که برای self-reflection طراحی شده، نه پیش‌بینی قطعی یا ادعای علمی.",
  },
  {
    term: "Local preview",
    description:
      "حالت فعلی محصول که داده‌ها را در مرورگر همین دستگاه نگه می‌دارد.",
  },
  {
    term: "Repository-backed storage",
    description:
      "یعنی UI مستقیم با localStorage حرف نمی‌زند و از یک لایه ذخیره‌سازی قابل تعویض استفاده می‌کند.",
  },
  {
    term: "Preview account",
    description:
      "مدل اکانت موقت که قبل از فعال شدن auth واقعی، ساختار محصول را آماده نگه می‌دارد.",
  },
  {
    term: "Feature gate",
    description:
      "قاعده‌ای برای اینکه هر پلن به چه قابلیت‌هایی دسترسی داشته باشد.",
  },
];

export default function WikiPage() {
  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Halleus Wiki</span>

        <h1>راهنمای Halleus</h1>

        <p>
          این راهنما اصطلاحات محصول را توضیح می‌دهد تا مسیر preview، گزارش‌ها،
          اکانت و پرداخت روشن باشد.
        </p>

        <div className="actions">
          <Link className="button" href="/product">
            نقشه محصول
          </Link>

          <Link className="button secondary" href="/privacy">
            حریم داده
          </Link>
        </div>
      </div>

      <section className="card">
        <span className="badge">Glossary</span>

        <h2>واژه‌نامه کوتاه</h2>

        <div className="home-step-list">
          {entries.map((entry) => (
            <div key={entry.term}>
              <strong>{entry.term}</strong>
              <span>{entry.description}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <span className="badge">Safety Note</span>

        <h2>یادآوری مهم</h2>

        <p>
          Halleus برای نگاه نمادین، سنتی و تفسیری ساخته می‌شود. گزارش‌ها نباید
          جای تصمیم پزشکی، حقوقی، مالی یا تصمیم قطعی زندگی را بگیرند.
        </p>
      </section>
    </section>
  );
}
