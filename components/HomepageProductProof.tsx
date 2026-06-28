import Link from "next/link";

const reportPreviewBlocks = [
  {
    label: "نمونه‌ی خوانش",
    title: "الگوی احساسی و نیاز اصلی",
    description:
      "گزارش اولیه کمک می‌کند بفهمی کدام نیازها، واکنش‌ها و عادت‌های تکراری در چارتت پررنگ‌تر دیده می‌شوند؛ بدون اینکه حکم قطعی بدهد.",
  },
  {
    label: "نمونه‌ی ساختار",
    title: "از نشانه تا برداشت قابل استفاده",
    description:
      "به جای فهرست اصطلاحات، هر بخش به زبان ساده توضیح می‌دهد این الگو چطور ممکن است در رابطه، تصمیم‌گیری یا مراقبت از خود دیده شود.",
  },
  {
    label: "نمونه‌ی قدم بعدی",
    title: "یک سوال برای برگشتن به خودت",
    description:
      "گزارش با سوال‌ها و یادآوری‌های کوتاه همراه می‌شود تا فقط خوانده نشود؛ بتوانی بعداً به آن برگردی و برداشتت را کامل‌تر کنی.",
  },
];

const productProofCards = [
  {
    title: "رایگان: شروع و آشنایی با زبان گزارش",
    description:
      "گزارش اولیه برای دیدن لحن، ساختار و چند برداشت اصلی ساخته می‌شود. این بخش برای شروع کافی است، نه برای ادعای کامل بودن همه جزئیات چارت.",
  },
  {
    title: "کامل‌تر: خوانش منسجم‌تر بر اساس همان گزارش",
    description:
      "اگر گزارش اولیه برایت معنی‌دار بود، نسخه کامل‌تر می‌تواند همان مسیر را با جزئیات بیشتر، پیوندهای بهتر و توضیح انسانی‌تر ادامه بدهد.",
  },
  {
    title: "خصوصی‌تر: بدون نمایش عمومی اطلاعات تولد",
    description:
      "مسیر محصول طوری طراحی می‌شود که اطلاعات تولد برای ساخت گزارش استفاده شود؛ نه برای تبدیل شدن به محتوای عمومی یا ادعای پیش‌گویی.",
  },
];

const proofSteps = [
  "نمونه خروجی را قبل از اعتماد کامل می‌بینی.",
  "گزارش اولیه را ذخیره می‌کنی و بعداً دوباره می‌خوانی.",
  "اگر خواستی نسخه کامل‌تر را از همان مسیر سفارش می‌دهی.",
];

export function HomepageProductProof() {
  return (
    <section className="card paid-section" aria-labelledby="homepage-product-proof-title">
      <div>
        <span className="section-label">نمونه و اعتماد</span>

        <h2 id="homepage-product-proof-title">
          قبل از اینکه شروع کنی، ببین Halleus قرار است چه جور گزارشی بسازد
        </h2>

        <p>
          Halleus قرار نیست فقط تاریخ تولد بگیرد و یک متن کلی تحویل بدهد. هدف این است
          که از داده تولد به یک خوانش فارسی، قابل مرور و قابل ادامه برسیم؛ چیزی که
          بتوانی بخوانی، نگه داری و اگر خواستی نسخه کامل‌ترش را سفارش بدهی.
        </p>
      </div>

      <div className="grid grid-3">
        {reportPreviewBlocks.map((item) => (
          <article className="mini-card paid-value-card" key={item.title}>
            <span className="badge">{item.label}</span>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className="card paid-manual-order home-next-card">
        <div>
          <span className="section-label">فرق گزارش اولیه و نسخه کامل‌تر</span>

          <h3>اول با گزارش اولیه شروع کن؛ بعد تصمیم بگیر چقدر عمیق‌تر می‌خواهی.</h3>

          <p>
            نسخه رایگان برای شروع، دیدن زبان محصول و گرفتن چند برداشت اصلی است. نسخه
            کامل‌تر باید روی همان مسیر بنا شود: دقیق‌تر، منسجم‌تر و مناسب‌تر برای
            کسی که می‌خواهد گزارشش را جدی‌تر بخواند.
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش اولیه
          </Link>
          <Link className="button secondary" href="/pricing">
            مقایسه گزینه‌ها
          </Link>
        </div>
      </div>

      <div className="grid grid-3">
        {productProofCards.map((item) => (
          <article className="mini-card paid-value-card" key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className="demo-flow polished-demo-flow">
        {proofSteps.map((step, index) => (
          <div className="demo-step" key={step}>
            <span>{(index + 1).toLocaleString("fa-IR")}</span>
            <h3>{step}</h3>
            <p>
              این مسیر کمک می‌کند homepage فقط معرفی نباشد؛ یک نمونه از تجربه محصول
              را قبل از ورود به فرم نشان بدهد.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
