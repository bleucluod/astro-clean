import Link from "next/link";

export const MVP_NAVIGATION_POLISH_VERSION = "0.1.52" as const;

const ENGINE_MVP_LINKS = [
      {
        href: "/engine/real-chart",
        eyebrow: "Real chart",
        title: "چارت واقعی‌تر و قابل دیدن",
        description:
          "ورودی تولد را به محاسبه‌ی astronomy-engine، چارت، bridge panel و متن فارسی گزارش وصل می‌کند.",
        cta: "محاسبه چارت",
      },
  {
    href: "/engine/report-flow",
    eyebrow: "MVP flow",
    title: "فرم تولد → گزارش نمونه",
    description:
      "مسیر محصولی جدید: کاربر ورودی تولد می‌دهد و همان‌جا خروجی report-like با چارت، bridge و متن فارسی می‌بیند.",
    cta: "باز کردن report flow",
  },
  {
    href: "/engine/report-preview",
    eyebrow: "Engine preview",
    title: "پیش‌نمایش چارت واقعی",
    description:
      "نمایش pipeline داده: normalized chart، enrichment، real chart bridge و متن نمونه‌ی گزارش.",
    cta: "دیدن preview",
  },
  {
    href: "/engine/real",
    eyebrow: "Real engine",
    title: "وضعیت engine واقعی",
    description:
      "مسیر محاسبات واقعی و تصمیم‌های فنی engine در این بخش دنبال می‌شود.",
    cta: "دیدن engine",
  },
  {
    href: "/reports",
    eyebrow: "Reports",
    title: "گزارش‌های ذخیره‌شده",
    description:
      "مسیر گزارش‌ها برای بررسی تجربه‌ی detail page و bridge panel بعد از ساخت گزارش.",
    cta: "رفتن به reports",
  },
];

export function EngineMvpNavigationPanel() {
  return (
    <section className="rounded-3xl border border-[#E7D8C7] bg-[#FFF9F2] p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A6B45]">
            MVP navigation
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#3E2F25]">
            مسیرهای جدید تست محصول
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-8 text-[#6B5A4C]">
            این لینک‌ها کمک می‌کنند بعد از هر deploy سریع ببینی engine، report flow
            و report preview واقعاً در محصول پیدا می‌شوند. این بخش برای کاربر نهایی
            هم کم‌کم تبدیل به مسیر ساده‌تر ساخت گزارش می‌شود.
          </p>
        </div>

        <span className="rounded-full border border-[#D8C2AA] bg-white px-4 py-2 text-sm font-semibold text-[#6A4B35]">
          v0.1.52
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {ENGINE_MVP_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-[#ECDCCB] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B1845B]">
              {item.eyebrow}
            </p>
            <h3 className="mt-2 text-lg font-bold text-[#3E2F25]">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-[#6B5A4C]">{item.description}</p>
            <p className="mt-4 text-sm font-bold text-[#7A4F33] transition group-hover:translate-x-[-2px]">
              {item.cta} ←
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[#ECDCCB] bg-white/70 p-4">
        <p className="text-sm font-bold text-[#4A382C]">Manual QA سریع</p>
        <p className="mt-2 text-sm leading-7 text-[#6B5A4C]">
          بعد از `pnpm dev` یا deploy، برو به `/engine` و مطمئن شو لینک‌های
          report flow و report preview دیده می‌شوند و هر دو صفحه باز می‌شوند.
        </p>
      </div>
    </section>
  );
}
