import type { Metadata } from "next";

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
          نسخه فعلی فقط شروع مسیر است: ساخت چارت، گزارش نمادین، ذخیره محلی و
          تجربه کاربری تمیز. هدف این است که سریع یک محصول قابل دیدن و دوست‌داشتنی
          داشته باشیم.
        </p>

        <h2>قابلیت‌های آینده</h2>

        <p>
          چارت تولد واقعی، تحلیل روزانه و ماهانه، داشبورد شخصی، پروفایل عمومی یا
          خصوصی، سازگاری رابطه، Couple Mode، Celebrity System، Event Charts،
          AI Astrologer Chat، گیمیفیکیشن، نوتیفیکیشن و سیستم محتوایی SEO محور.
        </p>

        <p>
          تحلیل‌ها همیشه به عنوان تفسیر نمادین، سرگرمی و خودشناسی ارائه می‌شوند؛
          نه پیش‌بینی قطعی یا توصیه پزشکی، مالی و حقوقی.
        </p>
      </div>
    </section>
  );
}
