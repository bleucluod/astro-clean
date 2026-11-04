'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { siteConfig } from '@/lib/config/seo';
import { buildShopProductStructuredData } from './product-schema';
import { getRelatedProducts, getShopProduct, SHOP_SIZES, type ShopProductId } from './product-detail-data';
import styles from './product-detail.module.css';

type PersonalDetails = {
  calendar: 'jalali' | 'gregorian';
  date: string;
  time: string;
  city: string;
  names: string;
  message: string;
};

const emptyDetails: PersonalDetails = { calendar: 'jalali', date: '', time: '', city: '', names: '', message: '' };

function formatPrice(amount: number) {
  return new Intl.NumberFormat('fa-IR').format(amount);
}

function displayPrice(amount: number, compact = false) {
  if (amount >= 1_000_000 && amount % 1_000 === 0) {
    const millions = Math.floor(amount / 1_000_000);
    const thousands = (amount % 1_000_000) / 1_000;
    if (!compact) {
      return thousands > 0
        ? { value: `${formatPrice(millions)} میلیون و ${formatPrice(thousands)}`, unit: 'هزار تومان' }
        : { value: formatPrice(millions), unit: 'میلیون تومان' };
    }
    return { value: formatPrice(amount / 1_000_000), unit: 'میلیون تومان' };
  }
  if (amount >= 1_000 && amount % 1_000 === 0) {
    return { value: formatPrice(amount / 1_000), unit: 'هزار تومان' };
  }
  return { value: formatPrice(amount), unit: 'تومان' };
}

function TextWithLinks({ children }: { children: string }) {
  const parts = children.split(/(<a href="\/shop\/p0[123]">[^<]+<\/a>)/g);
  return (
    <>
      {parts.map((part, i) => {
        const link = part.match(/^<a href="(\/shop\/p0[123])">([^<]+)<\/a>$/);
        return link ? <Link key={i} href={link[1]}>{link[2]}</Link> : <span key={i}>{part}</span>;
      })}
    </>
  );
}

function SizeIllustration({ image, title }: { image: string; title: string }) {
  return (
    <div className={styles.sizeIllustration} aria-label={`مقایسهٔ نسبت اندازه‌های تابلوی ${title}`}>
      {SHOP_SIZES.map((size, i) => (
        <div className={styles.sizeSample} key={size.dimension}>
          <div className={styles.sizeWall} aria-hidden="true">
            <div className={`${styles.sizeImage} ${styles[`sizeImage${i}`]}`}>
              <Image src={image} alt="" fill sizes="(max-width: 760px) 80px, 190px" />
            </div>
            {i === 2 ? <span className={styles.sizePencil} /> : null}
          </div>
          <span dir="ltr">{size.label}</span>
          <small>سانتی‌متر</small>
        </div>
      ))}
    </div>
  );
}

export function ProductDetail({ id }: { id: ShopProductId }) {
  const product = getShopProduct(id);
  const related = getRelatedProducts(id);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isZoomOpen, setZoomOpen] = useState(false);
  const [isSizeZoomOpen, setSizeZoomOpen] = useState(false);
  const [form, setForm] = useState<PersonalDetails>(emptyDetails);
  const [confirmed, setConfirmed] = useState<PersonalDetails | null>(null);
  const [formError, setFormError] = useState('');
  const [isFooterVisible, setFooterVisible] = useState(false);
  const [isFormVisible, setFormVisible] = useState(false);
  const zoomDialog = useRef<HTMLDialogElement>(null);
  const sizeZoomDialog = useRef<HTMLDialogElement>(null);
  const price = SHOP_SIZES[sizeIndex].price;
  const shownPrice = displayPrice(price);
  const stickyPrice = displayPrice(price, true);
  const startingPrice = displayPrice(SHOP_SIZES[0].price);
  const formCopy = {
    p01: {
      title: 'کدام روز را به ماه می‌سپاری؟',
      intro: 'بعضی لحظه‌ها می‌گذرند، اما دلمان می‌خواهد نورشان جایی بماند.',
      date: 'تاریخ آن لحظه',
      names: 'نامی برای ماندن',
      details: 'حرف دیگری هم برای این خاطره داری؟',
      submit: 'تأیید این لحظه',
    },
    p02: {
      title: 'آسمان کدام لحظه را نگه داریم؟',
      intro: 'تاریخ، ساعت و شهر تولدت را بگو تا آسمان همان لحظه را پیدا کنیم.',
      date: 'تاریخ تولد',
      names: 'نامی کنار ستاره‌ها',
      details: 'پیامی هم کنار این آسمان می‌گذاری؟',
      submit: 'تأیید این آسمان',
    },
    p03: {
      title: 'این شب، یادگار کدام قصه است؟',
      intro: 'یک نام، یک تاریخ یا چند کلمه؛ همین‌ها این شب را به قصهٔ شما نزدیک‌تر می‌کنند.',
      date: 'تاریخ خاطره (اختیاری)',
      names: 'نام‌های این قصه',
      details: 'حرف دیگری هم برای این قصه داری؟',
      submit: 'تأیید این قصه',
    },
  }[id];
  const hideMobileBar = isFooterVisible || isFormVisible;
  const structuredData = buildShopProductStructuredData(product, siteConfig.url);

  useEffect(() => {
    const dialog = zoomDialog.current;
    if (!dialog) return;
    if (isZoomOpen && !dialog.open) dialog.showModal();
    if (!isZoomOpen && dialog.open) dialog.close();
  }, [isZoomOpen]);

  useEffect(() => {
    const dialog = sizeZoomDialog.current;
    if (!dialog) return;
    if (isSizeZoomOpen && !dialog.open) dialog.showModal();
    if (!isSizeZoomOpen && dialog.open) dialog.close();
  }, [isSizeZoomOpen]);

  useEffect(() => {
    const footer = document.querySelector('footer.site-footer');
    if (!footer || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { rootMargin: '0px 0px 90px 0px' },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const formElement = document.getElementById('personalize');
    if (!formElement || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setFormVisible(entry.isIntersecting));
    observer.observe(formElement);
    return () => observer.disconnect();
  }, []);

  function updateForm(field: keyof PersonalDetails, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setConfirmed(null);
    setFormError('');
  }

  function confirmDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const needsDate = id !== 'p03';
    const digits = form.date.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
    if (needsDate && !form.date.trim()) {
      setFormError('لطفاً تاریخ این لحظه را وارد کن.');
      return;
    }
    if (form.date.trim() && form.calendar === 'jalali') {
      const match = digits.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      const year = Number(match?.[1]);
      const month = Number(match?.[2]);
      const day = Number(match?.[3]);
      const maxDay = month <= 6 ? 31 : 30;
      if (!match || year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > maxDay) {
        setFormError('تاریخ شمسی معتبر را به شکل ۱۴۰۳/۰۶/۱۲ وارد کن.');
        return;
      }
    }
    if (id === 'p02' && (!form.time || !form.city.trim())) {
      setFormError('برای آسمان تولد، ساعت و شهر تولد هم ضروری‌اند.');
      return;
    }
    setConfirmed({ ...form });
  }

  return (
    <div className={styles.page} data-shop-page="product" dir="rtl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
      <div className={styles.content}>
        <section className={styles.productHero} aria-label={product.title}>
          <div className={styles.gallery}>
            <nav className={styles.breadcrumbs} aria-label="مسیر صفحه">
              <Link href="/">هالیوس</Link><span aria-hidden="true">/</span>
              <Link href="/shop">فروشگاه</Link><span aria-hidden="true">/</span>
              <span aria-current="page">{product.title}</span>
            </nav>
            <button className={styles.mainPhotoButton} type="button" onClick={() => setZoomOpen(true)} aria-label={`بزرگ‌نمایی ${product.gallery[photoIndex].label}`}>
              <Image
                key={product.gallery[photoIndex].src}
                src={product.gallery[photoIndex].src}
                alt={product.gallery[photoIndex].alt}
                fill
                priority={photoIndex === 0}
                sizes="(max-width: 760px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), 660px"
                className={photoIndex === 0 ? styles.primaryPhoto : styles.portraitPhoto}
              />
              <span className={styles.zoomHint} aria-hidden="true">
                <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10.5" cy="10.5" r="6.5" />
                  <path d="m15.5 15.5 5 5M10.5 8v5M8 10.5h5" />
                </svg>
              </span>
            </button>
            <div className={styles.thumbnails} aria-label="تصاویر محصول">
              {product.gallery.map((photo, index) => (
                <button
                  type="button"
                  key={photo.src}
                  className={`${styles.thumbnail} ${photoIndex === index ? styles.thumbnailActive : ''}`}
                  onClick={() => setPhotoIndex(index)}
                  aria-label={`نمایش تصویر ${index + 1}: ${photo.label}`}
                  aria-pressed={photoIndex === index}
                >
                  <Image src={photo.src} alt="" fill sizes="(max-width: 760px) 82px, 156px" />
                </button>
              ))}
            </div>
            {product.galleryNote ? <p className={styles.galleryCaption}>{product.galleryNote}</p> : null}
          </div>

          <div className={styles.productInfo}>
            <div className={styles.productHeading}>
              <h1>{product.title}</h1>
              <p className={styles.tagline}>{product.tagline}</p>
            </div>
            <div className={styles.purchasePanel}>
              <p className={styles.introduction}>{product.introduction}</p>
              <fieldset className={styles.sizes}>
                <legend>اندازهٔ تابلو <small>(سانتی‌متر)</small></legend>
                <div className={styles.sizeGrid}>
                  {SHOP_SIZES.map((size, i) => (
                    <button
                      key={size.dimension}
                      type="button"
                      className={`${styles.sizeChoice} ${sizeIndex === i ? styles.sizeSelected : ''}`}
                      aria-pressed={sizeIndex === i}
                      onClick={() => { setSizeIndex(i); setConfirmed(null); }}
                    >
                      <span dir="ltr">{size.label}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className={styles.priceBlock}>
                <p className={styles.priceLabel}>قیمت</p>
                <p className={styles.price} aria-live="polite"><bdi>{shownPrice.value}</bdi><span>{shownPrice.unit}</span></p>
              </div>
              <a className={styles.sizeGuideLink} href="#size-guide">مقایسهٔ اندازه‌ها روی دیوار <span aria-hidden="true">↓</span></a>
              <form id="personalize" onSubmit={confirmDetails} className={styles.personalizeForm} aria-label={`شخصی‌سازی ${product.title}`}>
                <div className={styles.formIntro}>
                  <span className={styles.formKicker}>شخصی‌سازی اثر</span>
                  <h2 className={styles.formTitle}>{formCopy.title}</h2>
                  <p className={styles.formPoem}>{formCopy.intro}</p>
                </div>
                <div className={styles.calendarChooser}>
                  <span className={styles.calendarLabel}>تقویم</span>
                  <div className={styles.calendarSwitch} role="group" aria-label="نوع تقویم">
                    {([['jalali', 'شمسی'], ['gregorian', 'میلادی']] as const).map(([calendar, label]) => (
                      <button
                        key={calendar}
                        type="button"
                        className={`${styles.calendarOption} ${form.calendar === calendar ? styles.calendarActive : ''}`}
                        aria-pressed={form.calendar === calendar}
                        onClick={() => { if (form.calendar !== calendar) { setForm((previous) => ({ ...previous, calendar, date: '' })); setConfirmed(null); setFormError(''); } }}
                      >{label}</button>
                    ))}
                  </div>
                </div>
                <div className={styles.formField}>
                  <label htmlFor="product-date">{formCopy.date}</label>
                  <div className={styles.dateInputShell}>
                    <input id="product-date" dir="ltr" required={id !== 'p03'} value={form.date} type={form.calendar === 'gregorian' ? 'date' : 'text'} inputMode={form.calendar === 'jalali' ? 'numeric' : undefined} placeholder={form.calendar === 'jalali' ? '۱۴۰۳/۰۶/۱۲' : undefined} onChange={(event) => updateForm('date', event.target.value)} />
                    {form.calendar === 'jalali' ? (
                      <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 18h2" />
                      </svg>
                    ) : null}
                  </div>
                </div>
                {id === 'p02' ? (
                  <>
                    <div className={styles.dateFields}>
                      <div className={styles.formField}><label htmlFor="product-time">ساعت دقیق تولد</label><input id="product-time" type="time" dir="ltr" required value={form.time} onChange={(event) => updateForm('time', event.target.value)} /></div>
                      <div className={styles.formField}><label htmlFor="product-city">شهر تولد</label><input id="product-city" type="text" required maxLength={100} placeholder="نام شهر تولد" value={form.city} onChange={(event) => updateForm('city', event.target.value)} /></div>
                    </div>
                    <p className={styles.formHint}>برای نقشهٔ ستاره‌ها، تاریخ، ساعت و شهر دقیق تولد اهمیت دارند.</p>
                  </>
                ) : null}
                <div className={styles.formField}>
                  <label htmlFor="product-names">{formCopy.names} <small>(اختیاری)</small></label>
                  <input id="product-names" type="text" maxLength={60} placeholder={id === 'p03' ? 'مثلاً هاله و آراد' : 'نامی که دوست داری روی تابلو باشد…'} value={form.names} onChange={(event) => updateForm('names', event.target.value)} />
                </div>
                <details className={styles.optionalFields}>
                  <summary>{formCopy.details} <span aria-hidden="true">+</span></summary>
                  <div className={styles.optionalFieldsInner}>
                    {id === 'p01' ? (
                      <div className={styles.dateFields}>
                        <div className={styles.formField}><label htmlFor="product-time">ساعت (اختیاری)</label><input id="product-time" type="time" dir="ltr" value={form.time} onChange={(event) => updateForm('time', event.target.value)} /></div>
                        <div className={styles.formField}><label htmlFor="product-city">شهر (اختیاری)</label><input id="product-city" type="text" maxLength={100} placeholder="نام شهر، اگر دوست داری" value={form.city} onChange={(event) => updateForm('city', event.target.value)} /></div>
                      </div>
                    ) : null}
                    <div className={styles.formField}>
                      <label htmlFor="product-message">پیام کوتاه (اختیاری)</label>
                      <textarea id="product-message" maxLength={60} rows={2} placeholder="چند کلمه که فقط برای شما معنا دارد…" value={form.message} onChange={(event) => updateForm('message', event.target.value)} />
                      <small>حداکثر ۶۰ نویسه</small>
                    </div>
                  </div>
                </details>
                {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
                <button className={styles.confirmAction} type="submit">{formCopy.submit} <span aria-hidden="true">←</span></button>
                {confirmed ? (
                  <div className={styles.personalSummary} aria-live="polite">
                    <strong>انتخاب‌های تو تأیید شدند</strong>
                    <span><bdi dir="ltr">{SHOP_SIZES[sizeIndex].label}</bdi> سانتی‌متر</span>
                    {confirmed.date ? <span>تاریخ: {confirmed.date} ({confirmed.calendar === 'jalali' ? 'شمسی' : 'میلادی'})</span> : null}
                    {confirmed.time ? <span>ساعت: {confirmed.time}</span> : null}
                    {confirmed.city ? <span>شهر: {confirmed.city}</span> : null}
                    {confirmed.names ? <span>نام: {confirmed.names}</span> : null}
                    {confirmed.message ? <span>پیام: {confirmed.message}</span> : null}
                  </div>
                ) : null}
              </form>
              <div className={styles.specification}>
                <span>{product.highlight}</span>
                <span>سپردن سفارش به پست یا تیپاکس تا ۷۲ ساعت کاری پس از تأیید پرداخت، همراه با کد رهگیری</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.storySection} aria-labelledby="story-heading">
          <div className={styles.storyImage}>
            <Image src={product.gallery[1].src} alt={product.gallery[1].alt} width={563} height={908} sizes="(max-width: 760px) calc(100vw - 32px), 440px" />
          </div>
          <div className={styles.storyCopy}>
            <span className={styles.sectionKicker}>داستان این اثر</span>
            <h2 id="story-heading">{product.storyTitle}</h2>
            {product.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>

        <section className={styles.craftSection} aria-labelledby="craft-heading">
          <div className={styles.craftCopy}>
            <span className={styles.sectionKicker}>جزئیات و کیفیت</span>
            <h2 id="craft-heading">{product.qualityTitle}</h2>
            {product.quality.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <div className={styles.craftLabels}><span>سطح مات</span><span>چاپ روی شاسی</span><span>سه اندازه</span></div>
          </div>
          <div className={styles.craftImage}>
            <Image src={product.gallery[3].src} alt={product.gallery[3].alt} width={563} height={908} sizes="(max-width: 760px) calc(100vw - 32px), 440px" />
          </div>
        </section>

        <section id="size-guide" className={styles.dimensionsSection} aria-labelledby="dimensions-heading">
          <div className={styles.centerIntro}>
            <span className={styles.sectionKicker}>راهنمای انتخاب اندازه</span>
            <h2 id="dimensions-heading">کدام اندازه برای فضای تو مناسب‌تر است؟</h2>
            <p>هر سه اندازه، نسبت تصویر یکسانی دارند؛ تفاوت در جایی است که می‌خواهی تابلو دیده شود.</p>
          </div>
          <div className={styles.sizeGuideFrame}>
            <SizeIllustration image={product.gallery[3].src} title={product.title} />
            <button type="button" className={styles.sizeZoomButton} onClick={() => setSizeZoomOpen(true)} aria-label="بزرگ‌نمایی مقایسهٔ اندازه‌ها">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5M10.5 8v5M8 10.5h5" /></svg>
              <span>بزرگ‌نمایی</span>
            </button>
          </div>
          <p className={styles.sizeNote}>اندازه‌ها با نسبت واقعی کنار هم‌اند؛ مدادِ ۱۸ سانتی‌متری هم با همان مقیاس نمایش داده شده است. هر سه اندازه با چاپ مات روی شاسی آماده می‌شوند.</p>
        </section>

        <section className={styles.dispatchStrip} aria-label="چاپ و ارسال">
          <div><strong>سه اندازهٔ انتخابی</strong><span>۱۰×۱۵، ۲۰×۳۰، ۳۰×۴۵ سانتی‌متر</span></div>
          <div><strong>چاپ مات روی شاسی</strong><span>آماده برای نصب و هدیه‌دادن</span></div>
          <div><strong>ارسال با پست یا تیپاکس</strong><span>تحویل به شرکت حمل‌ونقل تا ۷۲ ساعت کاری پس از تأیید پرداخت، همراه با کد رهگیری. زمان رسیدن بسته به مقصد بستگی دارد.</span></div>
        </section>

        <section className={styles.faqSection} aria-labelledby="faq-heading">
          <span className={styles.sectionKicker}>برای انتخاب مطمئن‌تر</span>
          <h2 id="faq-heading">پرسش‌های متداول دربارهٔ {product.title}</h2>
          <div className={styles.faqList}>
            {product.faq.map(({ question, answer }) => (
              <details key={question} className={styles.faqItem}>
                <summary>{question}<span className={styles.faqPlus} aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.editorialSection} aria-labelledby="editorial-heading">
          <span className={styles.sectionKicker}>بیشتر دربارهٔ این اثر</span>
          <h2 id="editorial-heading">{product.editorialTitle}</h2>
          {product.editorialIntro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <details className={styles.readMore}>
            <summary><span className={styles.readMoreClosedLabel}>بیشتر دربارهٔ این اثر بخوان</span><span className={styles.readMoreOpenLabel}>کمتر بخوان</span><span className={styles.readMoreArrow} aria-hidden="true">⌄</span></summary>
            <div className={styles.readMoreContent}>
              {product.editorial.map((section) => (
                <div key={section.title} className={styles.editorialSubsection}>
                  <h3>{section.title}</h3>
                  {section.paragraphs.map((paragraph) => <p key={paragraph}><TextWithLinks>{paragraph}</TextWithLinks></p>)}
                </div>
              ))}
            </div>
          </details>
        </section>

        <section className={styles.relatedSection} aria-labelledby="related-heading">
          <div className={styles.relatedHeading}><span className={styles.sectionKicker}>از همین مجموعه</span><h2 id="related-heading">شاید این آثار را هم دوست داشته باشی</h2></div>
          <div className={styles.relatedGrid}>
            {related.map((item) => (
              <Link key={item.id} href={`/shop/${item.id}`} className={styles.relatedCard}>
                <span className={styles.relatedImage}><Image src={item.gallery[0].src} alt={item.gallery[0].alt} fill sizes="(max-width: 760px) calc(100vw - 32px), 584px" /></span>
                <span className={styles.relatedTitle}>{item.title}<span aria-hidden="true">←</span></span>
                <span className={styles.relatedDescription}>{item.tagline}</span>
                <span className={styles.relatedPrice}>از {startingPrice.value} {startingPrice.unit}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className={`${styles.mobilePurchaseBar} ${hideMobileBar ? styles.mobilePurchaseBarHidden : ''}`} inert={hideMobileBar} aria-hidden={hideMobileBar}>
        <div><small>قیمت</small><strong><bdi>{stickyPrice.value}</bdi> <span>{stickyPrice.unit}</span></strong></div>
        <a href="#personalize">{confirmed ? 'ویرایش انتخاب‌ها' : 'شخصی‌سازی اثر'}</a>
      </div>

      <dialog ref={zoomDialog} onClose={() => setZoomOpen(false)} className={styles.zoomDialog} aria-label={`تصاویر ${product.title}`}>
        <div className={styles.zoomInner}>
          <button type="button" className={styles.dialogClose} onClick={() => setZoomOpen(false)} aria-label="بستن بزرگ‌نمایی">×</button>
          <div className={styles.zoomPhoto}><Image src={product.gallery[photoIndex].src} alt={product.gallery[photoIndex].alt} fill sizes="95vw" /></div>
          <div className={styles.zoomActions}>
            <button type="button" onClick={() => setPhotoIndex((photoIndex + product.gallery.length - 1) % product.gallery.length)}>تصویر قبل</button>
            <span>{formatPrice(photoIndex + 1)} از {formatPrice(product.gallery.length)}</span>
            <button type="button" onClick={() => setPhotoIndex((photoIndex + 1) % product.gallery.length)}>تصویر بعد</button>
          </div>
        </div>
      </dialog>

      <dialog ref={sizeZoomDialog} onClose={() => setSizeZoomOpen(false)} className={styles.zoomDialog} aria-label={`بزرگ‌نمایی مقایسهٔ اندازه‌های ${product.title}`}>
        <div className={styles.zoomInner}>
          <button type="button" className={styles.dialogClose} onClick={() => setSizeZoomOpen(false)} aria-label="بستن مقایسهٔ اندازه‌ها">×</button>
          <h2 className={styles.sizeZoomTitle}>مقایسهٔ اندازه‌ها با مداد ۱۸ سانتی‌متری</h2>
          <div className={styles.sizeZoomContent}><SizeIllustration image={product.gallery[3].src} title={product.title} /></div>
          <p className={styles.sizeZoomNote}>نسبت طول و عرض تابلوها و مداد در یک مقیاس است؛ اندازهٔ نمایش به صفحه‌نمایش تو بستگی دارد.</p>
        </div>
      </dialog>

    </div>
  );
}
