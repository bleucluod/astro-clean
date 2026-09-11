import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

import styles from "./commerce-surfaces.module.css";
import orderStyles from "./order-surface.module.css";

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

export function PricingCommerceSurface({ packages, freeAll = false }: { packages: ReactNode; freeAll?: boolean }) {
  // HALLEUS_FREE_ALL_PRICING_SURFACE_BATCH1_R1
  if (freeAll) {
    return (
      <main className={styles.page} data-commerce-surface="pricing" data-effective-access-mode="FREE_ALL">
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <Eyebrow>دسترسی کامل فعال است</Eyebrow>
            <h1>گزارش کامل و تحلیل رابطه فعلاً بدون خرید یا مصرف اعتبار در دسترس‌اند</h1>
            <p>ساخت چارت، خواندن گزارش کامل و ساخت تحلیل رابطه در حالت فعلی هزینه یا اعتبار کم نمی‌کند. موجودی اعتبارها و سابقه خریدهای قبلی محفوظ می‌مانند.</p>
            <div className={styles.actions}>
              <PrimaryLink href="/chart">ساخت گزارش کامل</PrimaryLink>
              <SecondaryLink href="/compare">ساخت تحلیل رابطه</SecondaryLink>
            </div>
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionIntro}>
            <Eyebrow>بدون تغییر در حریم خصوصی</Eyebrow>
            <h2>رایگان‌شدن دسترسی، گزارش را عمومی نمی‌کند</h2>
            <p>حالت FREE_ALL فقط مانع خرید و مصرف اعتبار را برمی‌دارد. وضعیت خصوصی یا عمومی گزارش، رضایت انتشار و اشتراک‌گذاری همان قواعد قبلی را دارند.</p>
          </div>
          <ReadingLinks />
        </section>
      </main>
    );
  }
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

export function ProductCommerceSurface({ accessAndPackages, proof, freeAll = false }: { accessAndPackages: ReactNode; proof: ReactNode; freeAll?: boolean }) {
  // HALLEUS_FREE_ALL_PRODUCT_SURFACE_BATCH1_R1
  if (freeAll) {
    return (
      <main className={styles.page} data-commerce-surface="product" data-effective-access-mode="FREE_ALL">
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <Eyebrow>گزارش کامل، بدون قفل اعتباری</Eyebrow>
            <h1>تفسیر کامل چارت تولد فارسی هالیوس</h1>
            <p>همه فصل‌های گزارش در حالت فعلی بدون خرید و بدون مصرف اعتبار باز هستند؛ محاسبه و محتوای گزارش همان خروجی واقعی هالیوس است.</p>
            <div className={styles.actions}>
              <PrimaryLink href="/chart">ساخت چارت تولد</PrimaryLink>
              <SecondaryLink href="/compare">تحلیل رابطه</SecondaryLink>
            </div>
          </div>
        </section>
        <section className={styles.proofSection} aria-labelledby="product-proof-title">
          <div className={styles.sectionIntro}>
            <Eyebrow>نمونه محصول</Eyebrow>
            <h2 id="product-proof-title">شکل واقعی تجربه گزارش را ببین</h2>
          </div>
          <div className={styles.proof}>{proof}</div>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionIntro}>
            <Eyebrow>مرز دسترسی و انتشار</Eyebrow>
            <h2>دسترسی رایگان، تنظیمات حریم خصوصی را تغییر نمی‌دهد</h2>
            <p>بازشدن کامل گزارش مستقل از عمومی‌کردن، رضایت انتشار و اشتراک‌گذاری است.</p>
          </div>
          <ReadingLinks />
        </section>
      </main>
    );
  }
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
  selectedPackage,
  requestForm,
  freeAll = false,
}: {
  selectedPackage: {
    code: string;
    name: string;
    description: string;
    priceLabel: string;
    fullReportCredits: number;
    relationshipCredits: number;
    badge: string | null;
  };
  requestForm: ReactNode;
  freeAll?: boolean;
}) {
  // HALLEUS_FREE_ALL_ORDER_SURFACE_BATCH1_R1
  if (freeAll) {
    return (
      <main
        className={orderStyles.orderPage}
        data-commerce-surface="order"
        data-effective-access-mode="FREE_ALL"
      >
        <section className={orderStyles.freeAllHero}>
          <span className={orderStyles.kicker}>خرید لازم نیست</span>
          <h1>گزارش کامل و تحلیل رابطه فعلاً رایگان‌اند</h1>
          <p>
            تا وقتی دسترسی رایگان فعال است، نه خرید تازه لازم داری و نه از
            اعتبارهای قبلی چیزی کم می‌شود. مستقیم برو سراغ گزارش یا تحلیل رابطه.
          </p>
          <div className={orderStyles.freeAllActions}>
            <Link className={orderStyles.primaryAction} href="/chart">
              ساخت گزارش
            </Link>
            <Link className={orderStyles.secondaryAction} href="/compare">
              ساخت تحلیل رابطه
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      className={orderStyles.orderPage}
      data-commerce-surface="order"
      data-halleus-order="checkout-request-v2"
    >
      <section className={orderStyles.hero}>
        <div className={orderStyles.heroGrid}>
          <div className={orderStyles.heroVisual}>
            <Image
              className={orderStyles.heroImage}
              src="/halleus-order-hero.webp"
              alt="تصویر نمادین خرید اعتبار در هالیوس"
              fill
              priority
              sizes="(max-width: 900px) calc(100vw - 40px), 1120px"
            />
            <div className={orderStyles.heroScrim} aria-hidden="true" />

            <div className={orderStyles.heroCopy}>
              <span className={orderStyles.kicker}>خرید اعتبار</span>
              <h1>بسته‌ات آماده است؛ حالا خرید را هماهنگ کن</h1>
              <p>
                پرداخت در هالیوس فعلاً دستی است. جزئیات بسته را پایین می‌بینی؛
                اگر همه‌چیز درست بود، در تلگرام پیام بده. اعتبار فقط بعد از تأیید
                پرداخت به حسابت اضافه می‌شود.
              </p>
              <div
                className={orderStyles.heroTrust}
                aria-label="ویژگی‌های مسیر خرید"
              >
                <span>پرداخت دستی</span>
                <span>اعتبار بعد از تأیید</span>
                <span>بدون اشتراک ماهانه</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={orderStyles.packageSection}
        aria-labelledby="order-package-title"
      >
        <div className={orderStyles.sectionHeading}>
          <span className={orderStyles.kicker}>بسته‌ای که انتخاب کردی</span>
          <h2 id="order-package-title">یک‌بار جزئیاتش را چک کن</h2>
          <p>
            قیمت و تعداد اعتبارها را ببین. اگر بستهٔ دیگری می‌خواهی، برگرد به
            صفحهٔ قیمت‌ها.
          </p>
        </div>

        <article className={orderStyles.packageCard}>
          <div className={orderStyles.packageIdentity}>
            {selectedPackage.badge ? (
              <span className={orderStyles.packageBadge}>
                {selectedPackage.badge}
              </span>
            ) : null}
            <h2>{selectedPackage.name}</h2>
            <p>{selectedPackage.description}</p>
          </div>

          <div className={orderStyles.packagePrice}>
            <span>قیمت</span>
            <strong>{selectedPackage.priceLabel}</strong>
          </div>
        </article>

        <div className={orderStyles.creditGrid}>
          <div className={orderStyles.creditCard}>
            <span>گزارش کامل</span>
            <strong>
              {selectedPackage.fullReportCredits > 0
                ? `${selectedPackage.fullReportCredits.toLocaleString("fa-IR")} اعتبار`
                : "ندارد"}
            </strong>
          </div>
          <div className={orderStyles.creditCard}>
            <span>تحلیل رابطه</span>
            <strong>
              {selectedPackage.relationshipCredits > 0
                ? `${selectedPackage.relationshipCredits.toLocaleString("fa-IR")} اعتبار`
                : "ندارد"}
            </strong>
          </div>
        </div>

        <div className={orderStyles.packageFooter}>
          <p>
            هر اعتبار برای بازکردن یک گزارش کامل یا ساخت یک تحلیل رابطه استفاده
            می‌شود؛ این بسته اشتراک ماهانه نیست.
          </p>
          <Link className={orderStyles.textLink} href="/pricing">
            تغییر بسته
          </Link>
        </div>
      </section>

      <section
        className={orderStyles.completionSection}
        aria-labelledby="order-completion-title"
      >
        <div className={orderStyles.sectionHeading}>
          <span className={orderStyles.kicker}>مرحلهٔ بعد</span>
          <h2 id="order-completion-title">برای ادامه، در تلگرام پیام بده</h2>
          <p>
            ثبت فرم پایین اختیاری است. اگر می‌خواهی درخواستت داخل هالیوس هم
            بماند و بعداً راحت‌تر پیگیری شود، فرم را هم پر کن.
          </p>
        </div>

        <div className={orderStyles.completionGrid}>
          <article
            className={`${orderStyles.completionCard} ${orderStyles.completionCardPrimary}`}
          >
            <span>هماهنگی در تلگرام</span>
            <h3>هماهنگی پرداخت</h3>
            <p>
              اسم همین بسته را بفرست تا روش پرداخت را بگیری. بعد از تأیید،
              اعتبار به حسابت اضافه می‌شود.
            </p>
            <a
              className={orderStyles.primaryAction}
              href="https://t.me/lbleu"
              rel="noreferrer"
              target="_blank"
            >
              پیام به @lbleu
            </a>
          </article>

          <article className={orderStyles.completionCard}>
            <span>ثبت در هالیوس</span>
            <h3>درخواستت را اینجا هم ثبت کن</h3>
            <p>
              این فرم فقط برای پیگیری است و جای پرداخت را نمی‌گیرد.
            </p>
            <a
              className={orderStyles.secondaryAction}
              href="#order-request-form"
            >
              رفتن به فرم درخواست
            </a>
          </article>
        </div>
      </section>

      <section
        className={orderStyles.formSection}
        aria-labelledby="order-form-title"
      >
        <div className={orderStyles.sectionHeading}>
          <span className={orderStyles.kicker}>فرم درخواست</span>
          <h2 id="order-form-title">اگر می‌خواهی درخواستت در هالیوس هم ثبت شود</h2>
          <p>
            نام و راه ارتباطی‌ات را وارد کن. برای پرداخت همچنان باید از تلگرام
            هماهنگ کنی.
          </p>
        </div>
        {requestForm}
      </section>

      <section
        className={orderStyles.stepsSection}
        aria-labelledby="order-steps-title"
      >
        <div className={orderStyles.sectionHeading}>
          <span className={orderStyles.kicker}>بعد از پرداخت</span>
          <h2 id="order-steps-title">از پرداخت تا استفاده از اعتبار</h2>
        </div>

        <div className={orderStyles.stepsGrid}>
          <article className={orderStyles.step}>
            <span className={orderStyles.stepIndex}>۱</span>
            <h3>هماهنگی پرداخت</h3>
            <p>روش پرداخت را در تلگرام می‌گیری و همان بسته را هماهنگ می‌کنی.</p>
          </article>
          <article className={orderStyles.step}>
            <span className={orderStyles.stepIndex}>۲</span>
            <h3>تأیید خرید</h3>
            <p>بعد از تأیید پرداخت، اعتبار بسته به حساب هالیوس اضافه می‌شود.</p>
          </article>
          <article className={orderStyles.step}>
            <span className={orderStyles.stepIndex}>۳</span>
            <h3>استفاده از اعتبار</h3>
            <p>
              {selectedPackage.relationshipCredits > 0
                ? "بعدش می‌توانی اعتبارها را برای گزارش کامل یا تحلیل رابطه استفاده کنی."
                : "بعدش می‌توانی اعتبارها را برای بازکردن گزارش‌های کامل استفاده کنی."}
            </p>
          </article>
        </div>
      </section>

      <aside className={orderStyles.privacyStrip}>
        <p>
          خرید یا استفاده از اعتبار، گزارشت را خودکار عمومی نمی‌کند. تحلیل
          رابطه هم همیشه خصوصی می‌ماند.
        </p>
        <Link className={orderStyles.textLink} href="/privacy">
          جزئیات حریم خصوصی
        </Link>
      </aside>
    </main>
  );
}
