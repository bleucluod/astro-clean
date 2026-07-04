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
    title: "خانه و جنبه در زندگی روزمره",
    description:
      "هر بخش تلاش می‌کند بگوید این الگو در رابطه، کار، بدن، خانه یا تصمیم‌های کوچک خودش را کجا نشان می‌دهد.",
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
      "تمرکز فعلی روی کیفیت تجربه است. انتشار عمومی، SEO و مدل پولی بعد از آماده‌تر شدن محصول بررسی می‌شوند.",
  },
];

const proofSteps = [
  "اول جنس زبان گزارش را در چند کارت کوتاه می‌بینی.",
  "بعد گزارش تولدت را می‌سازی و در مسیر خصوصی می‌خوانی.",
  "وقتی product آماده‌تر شد، نمونه کامل و مسیرهای عمومی جداگانه اضافه می‌شوند.",
];

export function HomepageProductProof() {
  return (
    <section className="card paid-section" id="report-preview" aria-labelledby="homepage-product-proof-title">
      <div>
        <span className="section-label">نمونه و اعتماد</span>

        <h2 id="homepage-product-proof-title">
          قبل از ساخت گزارش، جنس خوانش هالیوس را ببین
        </h2>

        <p>
          این بخش یک preview سبک از زبان گزارش است؛ نه جایگزین گزارش کامل، بلکه
          نشانه‌ای از اینکه هالیوس چارت را چطور به یک روایت فارسی و قابل مرور
          تبدیل می‌کند.
        </p>
      </div>

      <div className="grid grid-3">
        {reportPreviewBlocks.map((item) => (
          <article className="mini-card paid-value-card product-preview-card" key={item.title}>
            <span className="badge">{item.label}</span>
            <strong>{item.title}</strong>
            <p>{item.description}</p>
          </article>
        ))}
      </div>

      <div className="card home-sample-card">
        <div>
          <span className="section-label">نمونه کوتاه</span>

          <h3>«گزارش از یک تصویر کلی شروع می‌کند، نه از فهرست خشک جایگاه‌ها.»</h3>

          <p>
            مثلاً به‌جای اینکه فقط بگوید ماه در کدام نشانه است، تلاش می‌کند
            نشان دهد نیاز احساسی، ریتم درونی و میدان‌های مهم زندگی چگونه کنار هم
            دیده می‌شوند.
          </p>
        </div>

        <div className="actions">
          <Link className="button" href="/chart">
            ساخت گزارش تولد
          </Link>
          <Link className="button secondary" href="/reports">
            گزارش‌های من
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
              مسیر صفحه اصلی باید همین‌قدر روشن بماند: اول ارزش محصول، بعد
              ساخت گزارش، بعد توسعه آرام قابلیت‌های بعدی.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
