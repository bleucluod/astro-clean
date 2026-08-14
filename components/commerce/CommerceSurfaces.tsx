import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./commerce-surfaces.module.css";

const wikiLinks = [
  { href: "/wiki/birth-chart-basics", label: "چارت تولد چیست؟" },
  { href: "/wiki/sun-moon-rising", label: "خورشید، ماه و طالع" },
  { href: "/wiki/astrology-houses", label: "خانه‌های آسترولوژی" },
] as const;

function ReadingLinks() {
  return (
    <div className={styles.readingLinks} aria-label="مسیرهای مرتبط برای مطالعه">
      {wikiLinks.map((item) => (
        <Link href={item.href} key={item.href}>{item.label}</Link>
      ))}
      <Link href="/wiki">همهٔ مقاله‌های ویکی هالیوس</Link>
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <span className={styles.eyebrow}>{children}</span>;
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className={styles.primaryButton} href={href}>{children}</Link>;
}

function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className={styles.secondaryButton} href={href}>{children}</Link>;
}

export function PricingCommerceSurface({ packages }: { packages: ReactNode }) {
  return (
    <main className={styles.page} data-commerce-surface="pricing" data-halleus-predeploy-commerce="batch3-r2">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Eyebrow>گزارش پایه رایگان؛ عمق بیشتر وقتی خودت بخواهی</Eyebrow>
          <h1>گزارش چارت تولد کامل، با اعتبارهایی که برای خروجی مشخص مصرف می‌شوند</h1>
          <p>
            تحلیل چارت تولد فارسی هالیوس را با گزارش پایه شروع می‌کنی. اگر بخواهی یک گزارش تولد شخصی را کامل باز کنی یا تحلیل رابطه با چارت تولد و سیناستری بسازی، از اعتبار همان محصول استفاده می‌شود؛ خرید، حساب تو را به دسترسی نامحدود تبدیل نمی‌کند.
          </p>
          <div className={styles.actions}>
            <PrimaryLink href="/chart">ساخت گزارش پایه رایگان</PrimaryLink>
            <SecondaryLink href="/product">داخل گزارش را ببین</SecondaryLink>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="pricing-free-title">
        <div className={styles.sectionIntro}>
          <Eyebrow>شروع رایگان</Eyebrow>
          <h2 id="pricing-free-title">اول گزارش واقعی خودت را ببین، بعد دربارهٔ نسخهٔ کامل تصمیم بگیر</h2>
          <p>
            بخش رایگان برای شناخت ساختار گزارش و خواندن یک تفسیر واقعی طراحی شده است. مرز دقیق Free و Full از سیاست دسترسی فعلی هالیوس می‌آید و با تغییر تنظیمات ادمین، متن قیمت‌گذاری جداگانه از واقعیت محصول نمی‌ماند.
          </p>
        </div>
        <div className={styles.freePanel}>
          <strong>رایگان</strong>
          <span>ساخت چارت و شروع خواندن گزارش</span>
          <Link href="/chart">شروع از چارت تولد ←</Link>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="pricing-packages-title">
        <div className={styles.sectionIntro}>
          <Eyebrow>بسته‌های فعال</Eyebrow>
          <h2 id="pricing-packages-title">قیمت و اعتبارها مستقیماً از کاتالوگ فعال هالیوس</h2>
          <p>
            فقط بسته‌هایی که در پنل هالیوس فعال‌اند اینجا نمایش داده می‌شوند. قیمت، تعداد اعتبار گزارش کامل و اعتبار تحلیل رابطه از همان منبعی خوانده می‌شود که ادمین مدیریت می‌کند.
          </p>
        </div>
        <div className={styles.canonicalSurface} data-canonical-commerce-source="product-access-cards">{packages}</div>
      </section>

      <section className={styles.splitSection}>
        <article className={styles.infoCard}>
          <Eyebrow>خرید دستی و شفاف</Eyebrow>
          <h2>درگاه پرداخت خودکار نداریم</h2>
          <p>
            هماهنگی خرید فعلاً به‌صورت دستی با هالیوس انجام می‌شود. تا وقتی خرید و تخصیص اعتبار واقعاً تأیید نشده، هیچ پیام «پرداخت موفق» یا دسترسی ساختگی نشان داده نمی‌شود.
          </p>
          <a className={styles.primaryButton} href="https://t.me/lbleu" rel="noreferrer" target="_blank">هماهنگی خرید با @lbleu</a>
        </article>
        <article className={styles.infoCard}>
          <Eyebrow>حریم خصوصی</Eyebrow>
          <h2>خرید، گزارش را عمومی نمی‌کند</h2>
          <p>
            بازشدن نسخهٔ کامل یک گزارش برای همان خروجی ماندگار است و انتشار عمومی تصمیم جداگانه‌ای می‌ماند. تحلیل رابطه هم خصوصی است و مسیر عمومی اشتراک‌گذاری ندارد.
          </p>
          <Link href="/privacy">جزئیات حریم خصوصی هالیوس</Link>
        </article>
      </section>

      <section className={styles.section} aria-labelledby="pricing-learn-title">
        <div className={styles.sectionIntro}>
          <Eyebrow>قبل از خرید بیشتر بخوان</Eyebrow>
          <h2 id="pricing-learn-title">محصول، رابطه و مفاهیم پایه را جداگانه بررسی کن</h2>
        </div>
        <div className={styles.actions}>
          <SecondaryLink href="/product">ساختار گزارش تولد</SecondaryLink>
          <SecondaryLink href="/compare">تحلیل رابطه و سیناستری</SecondaryLink>
        </div>
        <ReadingLinks />
      </section>
    </main>
  );
}

export function ProductCommerceSurface({ accessAndPackages, proof }: { accessAndPackages: ReactNode; proof: ReactNode }) {
  return (
    <main className={styles.page} data-commerce-surface="product" data-halleus-predeploy-commerce="batch3-r2">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Eyebrow>از دادهٔ تولد تا یک روایت قابل‌خواندن</Eyebrow>
          <h1>تفسیر چارت تولد فارسی هالیوس؛ گزارشی برای دیدن الگوها، نه یک فهرست محاسبه</h1>
          <p>
            هالیوس جایگاه‌ها، خانه‌ها، جنبه‌ها و الگوهای برجسته را در یک مسیر خواندن فارسی کنار هم می‌گذارد تا تحلیل چارت تولد از چند تکه اطلاعات جدا به یک گزارش تولد شخصی و قابل‌مرور تبدیل شود.
          </p>
          <div className={styles.actions}>
            <PrimaryLink href="/chart">ساخت چارت تولد</PrimaryLink>
            <SecondaryLink href="/pricing">بسته‌ها و قیمت‌ها</SecondaryLink>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="product-story-title">
        <div className={styles.sectionIntro}>
          <Eyebrow>ساختار گزارش</Eyebrow>
          <h2 id="product-story-title">از تصویر کلی به فصل‌های عمیق‌تر</h2>
          <p>
            خواندن گزارش با مهم‌ترین روایت‌ها شروع می‌شود و بعد به خانه‌ها، جنبه‌ها، ریتم‌های شخصی، محور رشد و جزئیات فنی می‌رسد. هدف این است که هر بخش در زمینهٔ کل چارت معنا پیدا کند، نه اینکه سیاره‌ها و زاویه‌ها جدا از هم ردیف شوند.
          </p>
        </div>
        <div className={styles.storyGrid}>
          <article><span>01</span><h3>تصویر کلی</h3><p>چند الگوی مهم که ارزش دارد اول دیده شوند.</p></article>
          <article><span>02</span><h3>لایه‌های اصلی</h3><p>خانه‌ها، جنبه‌ها، سیاره‌ها و نقاط مهم در بستر همان چارت.</p></article>
          <article><span>03</span><h3>عمق و شواهد</h3><p>فصل‌های عمیق‌تر و جزئیات فنی وقتی برای آن گزارش باز شده باشند.</p></article>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="product-access-title">
        <div className={styles.sectionIntro}>
          <Eyebrow>Free و Full از یک قرارداد</Eyebrow>
          <h2 id="product-access-title">مرز نسخهٔ رایگان و کامل از سیاست دسترسی فعلی خوانده می‌شود</h2>
          <p>
            تعداد بخش‌های رایگان یا قفل‌شده داخل این صفحه hard-code نشده است. همان قرارداد دسترسی که گزارش واقعی را کنترل می‌کند، منبع نمایش Free/Full و بسته‌های قابل‌خرید است؛ بنابراین تغییر سیاست ادمین نیاز به بازنویسی این صفحه ندارد.
          </p>
        </div>
        <div className={styles.canonicalSurface} data-canonical-commerce-source="product-access-cards">{accessAndPackages}</div>
      </section>

      <section className={styles.proofSection} aria-labelledby="product-proof-title">
        <div className={styles.sectionIntro}>
          <Eyebrow>نمونهٔ محصول</Eyebrow>
          <h2 id="product-proof-title">قبل از خرید، شکل واقعی تجربهٔ گزارش را ببین</h2>
          <p>این بخش از همان proof فعلی هالیوس استفاده می‌کند تا صفحهٔ محصول به وعده‌های بازاریابی جدا از محصول واقعی تبدیل نشود.</p>
        </div>
        <div className={styles.proof}>{proof}</div>
      </section>

      <section className={styles.section} aria-labelledby="product-next-title">
        <div className={styles.sectionIntro}>
          <Eyebrow>قدم بعد</Eyebrow>
          <h2 id="product-next-title">گزارش خودت را بساز یا قبلش مفاهیم پایه را مرور کن</h2>
        </div>
        <div className={styles.actions}>
          <PrimaryLink href="/chart">شروع گزارش من</PrimaryLink>
          <SecondaryLink href="/pricing">دیدن بسته‌های فعال</SecondaryLink>
          <SecondaryLink href="/compare">تحلیل رابطه با دو چارت</SecondaryLink>
        </div>
        <ReadingLinks />
      </section>
    </main>
  );
}

export function OrderCommerceSurface({
  selectedPackageCode,
  catalog,
  requestForm,
}: {
  selectedPackageCode: string;
  catalog: ReactNode;
  requestForm: ReactNode;
}) {
  return (
    <main className={styles.page} data-commerce-surface="order" data-halleus-predeploy-commerce="batch3-r2">
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Eyebrow>خرید دستی؛ بدون وانمودکردن به پرداخت آنلاین</Eyebrow>
          <h1>هماهنگی خرید اعتبار هالیوس</h1>
          <p>
            بسته را از کاتالوگ فعال انتخاب می‌کنی، هماهنگی پرداخت با @lbleu انجام می‌شود و بعد از تأیید واقعی، اعتبار به حساب اضافه می‌شود. این صفحه checkout یا درگاه پرداخت نیست.
          </p>
          <div className={styles.actions}>
            <a className={styles.primaryButton} href="https://t.me/lbleu" rel="noreferrer" target="_blank">پیام به @lbleu در تلگرام</a>
            <SecondaryLink href="/pricing">برگشت به قیمت‌ها</SecondaryLink>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="order-package-title">
        <div className={styles.sectionIntro}>
          <Eyebrow>بستهٔ انتخابی</Eyebrow>
          <h2 id="order-package-title">قیمت و اعتبارها از کاتالوگ فعلی هالیوس</h2>
          {selectedPackageCode ? (
            <p>انتخاب این درخواست با شناسهٔ <code className={styles.packageCode}>{selectedPackageCode}</code> حفظ شده است. نام، قیمت و اعتبارهای بسته در کارت canonical زیر نمایش داده می‌شود.</p>
          ) : (
            <p>اگر هنوز بسته‌ای انتخاب نکرده‌ای، یکی از بسته‌های فعال زیر را ببین و از صفحهٔ قیمت‌گذاری وارد همین مسیر شو.</p>
          )}
        </div>
        <div className={styles.canonicalSurface} data-canonical-commerce-source="product-access-cards">{catalog}</div>
      </section>

      <section className={styles.splitSection}>
        <article className={styles.infoCard}>
          <Eyebrow>بعدش چه می‌شود؟</Eyebrow>
          <h2>تأیید واقعی، بعد تخصیص اعتبار</h2>
          <ol className={styles.steps}>
            <li>با @lbleu دربارهٔ همان بسته هماهنگ می‌کنی.</li>
            <li>برای دریافت اعتبار، خرید باید به یک حساب هالیوس متصل شود.</li>
            <li>بعد از تأیید، اعتبار واقعی به حساب اضافه می‌شود.</li>
            <li>اعتبار گزارش کامل فقط روی گزارشی که خودت باز می‌کنی مصرف می‌شود.</li>
          </ol>
        </article>
        <article className={styles.infoCard}>
          <Eyebrow>حریم خصوصی</Eyebrow>
          <h2>اعتبار مساوی انتشار نیست</h2>
          <p>بازکردن گزارش کامل آن را خودکار عمومی نمی‌کند. تحلیل رابطه هم خصوصی می‌ماند و دادهٔ نفر دوم برای چک‌کردن اعتبار به مسیر عمومی فرستاده نمی‌شود.</p>
          <Link href="/privacy">حریم خصوصی هالیوس</Link>
        </article>
      </section>

      <section className={styles.section} aria-labelledby="order-ledger-title">
        <div className={styles.sectionIntro}>
          <Eyebrow>ثبت درخواست داخل هالیوس</Eyebrow>
          <h2 id="order-ledger-title">اختیاری؛ برای نگه‌داشتن درخواست در مسیر فعلی</h2>
          <p>اگر لازم است درخواست در ledger فعلی هالیوس ثبت شود، فرم موجود را باز کن. این فرم پرداخت انجام نمی‌دهد و CTA اصلی خرید همچنان گفت‌وگوی تلگرام است.</p>
        </div>
        <details className={styles.requestDetails}>
          <summary>بازکردن فرم ثبت درخواست</summary>
          <div className={styles.requestForm}>{requestForm}</div>
        </details>
      </section>
    </main>
  );
}
