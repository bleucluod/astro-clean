import Link from "next/link";

const phases = [
  {
    title: "Preview محصول",
    status: "انجام شده",
    description: "homepage، ساخت گزارش، آرشیو، export/import، dashboard و profile preview.",
  },
  {
    title: "Foundation پایدار",
    status: "در حال تکمیل",
    description: "storage، account، auth، database و billing contractها و checkerها.",
  },
  {
    title: "چارت واقعی",
    status: "قدم مهم بعدی",
    description: "جایگزینی mock engine با مسیر محاسبه واقعی و گزارش‌های باکیفیت‌تر.",
  },
  {
    title: "حساب کاربری و دیتابیس",
    status: "بعد از تصمیم provider",
    description: "انتخاب auth/database و اتصال گزارش‌ها به user واقعی.",
  },
  {
    title: "پرداخت و پلن‌ها",
    status: "بعد از auth/database",
    description: "فعال‌سازی پرداخت فقط وقتی کیفیت گزارش و ذخیره‌سازی حساب آماده شد.",
  },
];

export default function RoadmapPage() {
  return (
    <section className="grid">
      <div className="card">
        <span className="badge">Halleus Roadmap</span>

        <h1>نقشه راه Halleus</h1>

        <p>
          مسیر محصول از public preview به MVP تجاری باید مرحله‌ای و قابل برگشت
          باشد. هر مرحله باید پایه‌ای بسازد که در مراحل بعدی دوباره دور ریخته
          نشود.
        </p>

        <div className="actions">
          <Link className="button" href="/product">
            نقشه محصول
          </Link>

          <Link className="button secondary" href="/pricing">
            پلن‌ها
          </Link>
        </div>
      </div>

      <section className="card">
        <span className="badge">Phases</span>

        <h2>فازهای اصلی</h2>

        <div className="home-step-list">
          {phases.map((phase, index) => (
            <div key={phase.title}>
              <strong>
                {(index + 1).toLocaleString("fa-IR")}. {phase.title}
              </strong>
              <span>
                {phase.status} · {phase.description}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <span className="badge">Next Product Decision</span>

        <h2>تصمیم بعدی</h2>

        <p>
          از اینجا به بعد، مهم‌ترین تصمیم فنی انتخاب مسیر auth/database است.
          پیشنهاد فعلی: Supabase برای سرعت و یکپارچگی، یا Auth.js + Postgres
          برای انعطاف بیشتر.
        </p>
      </section>
    </section>
  );
}
