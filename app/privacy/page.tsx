import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { AnalyticsPreferencesLink } from "@/components/AnalyticsConsent";
import { buildPublicPageMetadata } from "@/lib/config/seo";

import styles from "./privacy-page.module.css";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "حریم خصوصی هالیوس | داده‌های تولد، گزارش‌ها و حساب کاربری",
  description:
    "ببین هالیوس چه اطلاعاتی برای چارت تولد، حساب، تحلیل رابطه و آمار بازدید استفاده می‌کند، چه چیزی عمومی می‌شود و چطور گزارش‌ها و تنظیمات حریم خصوصی را مدیریت کنی.",
  canonical: "/privacy",
});

const quickFacts = [
  {
    title: "روی دستگاهت",
    text: "بعضی گزارش‌ها و تنظیمات در مرورگر همین دستگاه ذخیره می‌شوند.",
  },
  {
    title: "در حسابت",
    text: "اگر وارد حساب باشی، گزارش‌هایی که ذخیره می‌کنی به همان حساب متصل می‌مانند.",
  },
  {
    title: "وقتی گزارشی عمومی است",
    text: "اطلاعات حساس تولد مثل تاریخ، ساعت و شهر تولد در نسخه عمومی نشان داده نمی‌شوند.",
  },
] as const;

const visibilityCards = [
  {
    label: "خصوصی",
    title: "فقط برای خودت",
    text: "گزارش خصوصی فقط برای خودت در دسترس است و در صفحه‌های عمومی یا نتایج جست‌وجو نشان داده نمی‌شود.",
  },
  {
    label: "اشتراک با لینک",
    title: "فقط برای کسی که لینک را دارد",
    text: "اگر برای گزارشت لینک اشتراک بسازی، فقط کسی که لینک را دارد می‌تواند آن نسخه را باز کند. این صفحه در نتایج جست‌وجو نمایش داده نمی‌شود و اطلاعات حساس تولد از آن حذف می‌شوند.",
  },
  {
    label: "عمومی",
    title: "ممکن است در نتایج جست‌وجو دیده شود",
    text: "گزارش‌های رایگان ممکن است به‌صورت عمومی در هالیوس نمایش داده شوند و موتورهای جست‌وجو هم بتوانند آن‌ها را پیدا کنند. اگر گزارش را با حساب هالیوس ساخته باشی، می‌توانی بعداً آن را از حالت عمومی خارج کنی. گزارش Premium به‌طور پیش‌فرض خصوصی است و فقط وقتی خودت بخواهی عمومی می‌شود.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="privacy-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>حریم خصوصی</span>
          <h1 id="privacy-title" className={styles.heroTitle}>
            داده‌های تو در هالیوس چه می‌شوند؟
          </h1>
          <p className={styles.heroLead}>
            برای ساخت چارت به اطلاعات تولد نیاز داریم. بعضی داده‌ها روی مرورگر خودت
            می‌مانند و بعضی برای حساب یا گزارش روی سرور هالیوس ذخیره می‌شوند. در این
            صفحه می‌بینی چه اطلاعاتی نگه می‌داریم، چه چیزی ممکن است عمومی شود و
            کدام انتخاب‌ها در اختیار خودت هستند.
          </p>

          <div className={styles.heroActions}>
            <Link className={styles.primaryAction} href="/reports">
              مدیریت گزارش‌ها
            </Link>
            <Link className={styles.secondaryAction} href="/chart">
              ساخت چارت تولد
            </Link>
          </div>

          <nav className={styles.anchorNav} aria-label="بخش‌های حریم خصوصی">
            <a href="#reports">گزارش‌ها</a>
            <a href="#relationship">تحلیل رابطه</a>
            <a href="#account">حساب کاربری</a>
            <a href="#analytics">آمار بازدید</a>
          </nav>
        </div>

        <div className={styles.heroVisual}>
          <Image
            src="/halleus-privacy-hero.webp"
            alt="چرخ چارت و نماد قفل برای حریم خصوصی در هالیوس"
            width={1600}
            height={900}
            priority
            sizes="(max-width: 820px) calc(100vw - 40px), 520px"
            className={styles.heroImage}
          />
          <div className={styles.heroVisualCaption}>
            گزارش‌های روی دستگاه، گزارش‌های حساب و نسخه‌های عمومی سطح دسترسی
            یکسانی ندارند.
          </div>
        </div>
      </section>

      <section className={styles.quickFacts} aria-label="حریم خصوصی در یک نگاه">
        {quickFacts.map((item) => (
          <article className={styles.quickFact} key={item.title}>
            <span className={styles.quickDot} aria-hidden="true" />
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className={styles.section} id="reports">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>چارت و گزارش تولد</span>
          <h2>برای ساخت چارت تولد چه اطلاعاتی لازم است؟</h2>
          <p>
            برای محاسبه چارت از نامی که وارد می‌کنی، تاریخ تولد، ساعت تولد یا
            نامعلوم‌بودن آن و شهر تولد استفاده می‌کنیم. اگر بخشی از گزارش به محل
            زندگی فعلی نیاز داشته باشد و آن را فعال کنی، همان اطلاعات هم در محاسبه
            استفاده می‌شوند.
          </p>
        </div>

        <div className={styles.dataGrid}>
          <article className={styles.dataCard}>
            <span className={styles.cardKicker}>حافظه مرورگر</span>
            <h3>نسخه‌ای برای برگشتن به گزارش</h3>
            <p>
              هالیوس می‌تواند نسخه‌ای از گزارش را در حافظه مرورگر همین دستگاه نگه
              دارد تا بعداً دوباره به آن برگردی. پاک‌کردن داده‌های مرورگر می‌تواند
              این نسخه محلی را هم حذف کند.
            </p>
          </article>

          <article className={styles.dataCard}>
            <span className={styles.cardKicker}>ذخیره سروری</span>
            <h3>گزارش مهمان یا گزارش حساب</h3>
            <p>
              ممکن است نسخه‌ای از گزارش تولدت روی سرور هالیوس هم ذخیره شود تا
              بعداً بتوانی دوباره به آن دسترسی داشته باشی. اگر وارد حساب باشی، این
              نسخه به حسابت متصل می‌ماند. اگر بدون حساب گزارش بسازی، نسخه
              ذخیره‌شده روی سرور به حساب شخصی‌ای متصل نیست.
            </p>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionSoft}`} id="visibility">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>نمایش گزارش</span>
          <h2>خصوصی، اشتراک با لینک و عمومی یکی نیستند</h2>
          <p>
            نوع دسترسی هر گزارش مشخص می‌کند چه کسی بتواند آن را ببیند. عمومی‌بودن
            خود گزارش هم با نمایش نام و هویت یکی نیست.
          </p>
        </div>

        <div className={styles.visibilityGrid}>
          {visibilityCards.map((item) => (
            <article className={styles.visibilityCard} key={item.label}>
              <span className={styles.visibilityLabel}>{item.label}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <div className={styles.callout}>
          <strong>در نسخه عمومی چه چیزهایی دیده نمی‌شوند؟</strong>
          <p>
            تاریخ، ساعت، شهر و کشور تولد، محل زندگی فعلی، شناسه کاربر و یادداشت
            شخصی در نسخه عمومی نمایش داده نمی‌شوند. نام هم فقط وقتی می‌تواند نمایش
            داده شود که رضایت جداگانه برای نمایش هویت ثبت شده باشد.
          </p>
        </div>

        <Link className={styles.inlineLink} href="/reports">
          دیدن و مدیریت گزارش‌ها
        </Link>
      </section>

      <section className={styles.section} id="relationship">
        <div className={styles.splitSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>تحلیل رابطه</span>
            <h2>تحلیل رابطه خصوصی می‌ماند</h2>
            <p>
              تحلیل رابطه در بخش‌های عمومی هالیوس یا نتایج جست‌وجو نمایش داده
              نمی‌شود. نتیجه می‌تواند روی همین مرورگر بماند و اگر وارد حساب باشی،
              به‌صورت خصوصی در حسابت هم ذخیره شود.
            </p>
            <p>
              در نسخه ذخیره‌شده تحلیل رابطه، تاریخ، ساعت و شهر خام تولد دو نفر
              نگه‌داری نمی‌شود. هالیوس برای ساخت نتیجه از چارت‌های محاسبه‌شده
              استفاده می‌کند.
            </p>
            <Link className={styles.inlineLink} href="/compare">
              رفتن به تحلیل رابطه
            </Link>
          </div>

          <aside className={styles.sideNote}>
            <span>قاعده هالیوس</span>
            <strong>نتیجه رابطه همیشه خصوصی می‌ماند.</strong>
            <p>
              ذخیره‌کردن تحلیل رابطه در حساب هم آن را عمومی نمی‌کند.
            </p>
          </aside>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionSoft}`} id="account">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>حساب هالیوس</span>
          <h2>وقتی حساب می‌سازی چه اطلاعاتی نگه می‌داریم؟</h2>
          <p>
            برای ساخت حساب از نام کاربری و شماره موبایل استفاده می‌کنیم. اگر خودت
            وارد کنی، ایمیل دوم هم می‌تواند به حسابت اضافه شود. ورود و حفظ نشست حساب
            با Supabase Auth انجام می‌شود و گزارش‌هایی که در حسابت ذخیره می‌کنی به
            همان حساب متصل می‌مانند.
          </p>
        </div>

        <div className={styles.compactGrid}>
          <article>
            <strong>اطلاعات حساب</strong>
            <p>
              نام کاربری، شماره موبایل و در صورت ثبت، ایمیل دوم؛ به‌همراه اطلاعات
              لازم برای ورود به حساب.
            </p>
          </article>
          <article>
            <strong>گزارش‌های حساب</strong>
            <p>
              گزارش‌های ذخیره‌شده و در صورت استفاده، عنوان، علاقه‌مندی و یادداشت
              شخصی.
            </p>
          </article>
        </div>

        <Link className={styles.inlineLink} href="/profile">
          رفتن به حساب و پروفایل
        </Link>
      </section>

      <section className={styles.section} id="telegram">
        <div className={styles.splitSection}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>هدیه تلگرام</span>
            <h2>اتصال تلگرام فقط وقتی انجام می‌شود که خودت هدیه را فعال کنی</h2>
            <p>
              اگر هدیه عضویت تلگرام را فعال کنی، شناسه تلگرامت به حساب هالیوس
              وصل می‌شود تا عضویت در کانال بررسی شود و مطمئن شویم این هدیه برای همان
              حساب فقط یک‌بار استفاده می‌شود. زمان شروع و پایان Premium هدیه هم ثبت
              می‌شود.
            </p>
            <Link className={styles.inlineLink} href="/profile">
              مدیریت حساب و هدیه تلگرام
            </Link>
          </div>

          <aside className={styles.sideNote}>
            <span>اختیاری</span>
            <strong>بدون شروع این فرایند، اتصال تلگرام لازم نیست.</strong>
            <p>
              این اطلاعات فقط برای اتصال تلگرام، بررسی عضویت و فعال‌کردن هدیه
              استفاده می‌شوند.
            </p>
          </aside>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionSoft}`} id="analytics">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>آمار بازدید</span>
          <h2>هالیوس از آمار بازدید چه چیزی می‌بیند؟</h2>
          <p>
            برای اینکه بفهمیم کدام صفحه‌های عمومی بیشتر دیده می‌شوند، هالیوس از
            Google Analytics 4 استفاده می‌کند. اطلاعات معمولی مثل صفحه‌ای که باز
            کرده‌ای، عنوان صفحه و مشخصات فنی کلی مرورگر ممکن است ثبت شوند. نام،
            اطلاعات تولد، متن گزارش و شناسه گزارش به Google Analytics فرستاده
            نمی‌شوند.
          </p>
          <p>
            شخصی‌سازی تبلیغات، Google Signals و ذخیره تبلیغاتی غیرفعال‌اند. آمار
            بازدید به‌طور پیش‌فرض فعال است، اما هر زمان بخواهی می‌توانی آن را از
            همین صفحه خاموش کنی.
          </p>
        </div>

        <div className={styles.analyticsControl}>
          <div>
            <strong>روشن یا خاموش بودن آمار بازدید دست خودت است.</strong>
            <p>تغییر این تنظیم، ساخت چارت و استفاده از گزارش را متوقف نمی‌کند.</p>
          </div>
          <AnalyticsPreferencesLink
            className={styles.analyticsButton}
            label="تنظیم آمار بازدید هالیوس"
          />
        </div>
      </section>

      <section className={styles.section} id="control">
        <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>حذف و کنترل</span>
          <h2>چه چیزهایی را خودت می‌توانی مدیریت یا حذف کنی؟</h2>
        </div>

        <div className={styles.controlList}>
          <div>
            <strong>گزارش‌های همین دستگاه</strong>
            <p>
              از بخش گزارش‌ها می‌توانی نسخه‌های محلی را حذف کنی. پاک‌کردن داده‌های
              مرورگر هم می‌تواند داده‌های محلی هالیوس را پاک کند.
            </p>
          </div>
          <div>
            <strong>گزارش‌های حساب</strong>
            <p>
              گزارش متعلق به حسابت را می‌توانی از بخش گزارش‌ها حذف کنی. حذف گزارش
              حساب، لینک اشتراک فعال آن را هم از کار می‌اندازد.
            </p>
          </div>
          <div>
            <strong>گزارش مهمان روی سرور</strong>
            <p>
              اگر بدون حساب گزارش ساخته باشی، نسخه‌ای که روی سرور ذخیره شده به
              حسابی تعلق ندارد؛ بنابراین فعلاً از بخش «گزارش‌های من» نمی‌توانی آن
              نسخه را مستقیم حذف کنی.
            </p>
          </div>
          <div>
            <strong>آمار بازدید</strong>
            <p>
              از دکمه تنظیم آمار بازدید در همین صفحه می‌توانی Analytics را خاموش یا
              دوباره فعال کنی.
            </p>
          </div>
        </div>

        <Link className={styles.primaryAction} href="/reports">
          مدیریت گزارش‌ها
        </Link>
      </section>

      <section className={styles.footerNote} aria-label="یادداشت حریم خصوصی">
        <span>آخرین بازبینی: شهریور ۱۴۰۵</span>
        <p>
          این توضیحات بر اساس شیوه فعلی نگهداری و نمایش اطلاعات در هالیوس نوشته
          شده‌اند. اگر این شیوه‌ها تغییر کنند، این صفحه هم به‌روزرسانی می‌شود.
        </p>
      </section>
    </div>
  );
}
