import Link from "next/link";

const reportPreviewBlocks = [
  {
    label: "نمونه خوانش",
    title: "سه نخ اصلی چارت",
    description:
      "گزارش با خورشید، ماه و طالع شروع می‌کند تا تصویر کلی هویت، نیاز احساسی و شیوه حضور روشن‌تر شود.",
  },
  {
    label: "نمونه عمق",
    title: "از خانه و جنبه تا زندگی روزمره",
    description:
      "هر بخش تلاش می‌کند بگوید این الگو در کدام میدان زندگی، رابطه یا تصمیم‌گیری خودش را نشان می‌دهد.",
  },
  {
    label: "نمونه جمع‌بندی",
    title: "کشش، استعداد و تمرین رشد",
    description:
      "گزارش فقط placementها را نمی‌چیند؛ سعی می‌کند بگوید کجا کشش داری، کجا حمایت، و کجا تمرین انسانی‌تر لازم است.",
  },
];

const productProofCards = [
  {
    title: "بر پایه چارت تولد",
    description:
      "گزارش از داده تولد و خروجی محاسبه‌شده ساخته می‌شود، نه از یک متن عمومی که برای همه یکسان باشد.",
  },
  {
    title: "فارسی، آرام و قابل مرور",
    description:
      "لحن گزارش برای کاربر فارسی‌زبان طراحی می‌شود: قابل خواندن، بدون اصطلاحات سنگین و بدون حکم قطعی.",
  },
  {
    title: "خصوصی و free-first",
    description:
      "تمرکز فعلی روی کیفیت محصول است. پرداخت، SEO و گزارش عمومی زمانی مطرح می‌شوند که تجربه اصلی آماده‌تر باشد.",
  },
];

const proofSteps = [
  "نمونه زبان گزارش را قبل از ورود جدی‌تر می‌بینی.",
  "گزارش تولدت را می‌سازی و در مسیر خصوصی می‌خوانی.",
  "بعداً فاز ماه، Sky Pulse و مسیرهای عمومی فقط با داده و رضایت واقعی اضافه می‌شوند.",
];

export function HomepageProductProof() {
  return (
    <section className="card paid-section" id="report-preview" aria-labelledby="homepage-product-proof-title">
      <div>
        <span className="section-label">نمونه و اعتماد</span>

        <h2 id="homepage-product-proof-title">
          قبل از ساخت گزارش، ببین هالیوس چه جور خوانشی می‌سازد
        </h2>

        <p>
          هدف homepage فقط معرفی نیست؛ باید به کاربر نشان بدهد گزارش هالیوس
          از چه جنسی است: شخصی، فارسی، قابل برگشت و صادق درباره محدودیت‌ها.
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
          <span className="section-label">نمونه گزارش</span>

          <h3>در این مرحله نمونه کامل جدا نداریم، اما جای آن در معماری صفحه آماده است.</h3>

          <p>
            وقتی گزارش‌ها کمی بیشتر تثبیت شوند، همین بخش می‌تواند به نمونه گزارش
            واقعی یا preview مستقل وصل شود؛ بدون اینکه ساختار homepage عوض شود.
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش تولد
          </Link>
          <Link className="button secondary" href="/reports">
            گزارش‌های ذخیره‌شده
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
              این مسیر کمک می‌کند صفحه اصلی scalable بماند: امروز ساده و صادق،
              فردا آماده برای preview، consent و SEO وقتی محصول واقعاً آماده شد.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
