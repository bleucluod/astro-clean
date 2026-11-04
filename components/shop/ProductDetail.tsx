'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
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
  const [isPersonalizeOpen, setPersonalizeOpen] = useState(false);
  const [form, setForm] = useState<PersonalDetails>(emptyDetails);
  const [confirmed, setConfirmed] = useState<PersonalDetails | null>(null);
  const [formError, setFormError] = useState('');
  const [isFooterVisible, setFooterVisible] = useState(false);
  const personalizeDialog = useRef<HTMLDialogElement>(null);
  const zoomDialog = useRef<HTMLDialogElement>(null);
  const price = SHOP_SIZES[sizeIndex].price;

  useEffect(() => {
    const dialog = personalizeDialog.current;
    if (!dialog) return;
    if (isPersonalizeOpen && !dialog.open) dialog.showModal();
    if (!isPersonalizeOpen && dialog.open) dialog.close();
  }, [isPersonalizeOpen]);

  useEffect(() => {
    const dialog = zoomDialog.current;
    if (!dialog) return;
    if (isZoomOpen && !dialog.open) dialog.showModal();
    if (!isZoomOpen && dialog.open) dialog.close();
  }, [isZoomOpen]);

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

  function updateForm(field: keyof PersonalDetails, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
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
    setPersonalizeOpen(false);
  }

  return (
    <div className={styles.page} data-shop-page="product" dir="rtl">
      <div className={styles.content}>
        <section className={styles.productHero} aria-label={product.title}>
          <div className={styles.gallery}>
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
              <span className={styles.zoomHint} aria-hidden="true">بزرگ‌نمایی <span>↗</span></span>
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
            <p className={styles.galleryCaption}>{product.galleryNote}</p>
          </div>

          <div className={styles.productInfo}>
            <div className={styles.productHeading}>
              <nav className={styles.breadcrumbs} aria-label="مسیر صفحه">
                <Link href="/">هالیوس</Link><span aria-hidden="true">/</span>
                <Link href="/shop">فروشگاه</Link><span aria-hidden="true">/</span>
                <span aria-current="page">{product.title}</span>
              </nav>
              <span className={styles.eyebrow}>از مجموعهٔ آثار هالیوس</span>
              <h1>{product.title}</h1>
              <p className={styles.tagline}>{product.tagline}</p>
            </div>
            <div className={styles.purchaseCard}>
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
                      onClick={() => setSizeIndex(i)}
                    >
                      <span dir="ltr">{size.label}</span><small>{formatPrice(size.price)} تومان</small>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className={styles.priceBlock}>
                <p className={styles.priceLabel}>قیمت اندازهٔ انتخابی</p>
                <p className={styles.price} aria-live="polite">{formatPrice(price)} <span>تومان</span></p>
              </div>
              <a className={styles.sizeGuideLink} href="#size-guide">مقایسهٔ اندازه‌ها روی دیوار <span aria-hidden="true">↓</span></a>
              <div className={styles.specification}>
                <span>{product.highlight}</span>
                <span>ارسال با پست یا تیپاکس؛ تحویل به شرکت حمل‌ونقل تا ۷۲ ساعت کاری پس از تأیید پرداخت، همراه با کد رهگیری</span>
              </div>
              <button className={styles.mainAction} type="button" onClick={() => setPersonalizeOpen(true)}>
                {confirmed ? 'ویرایش مشخصات تابلو' : 'شخصی‌سازی تابلو'}
                <span aria-hidden="true">←</span>
              </button>
              {confirmed ? (
                <div className={styles.personalSummary} aria-live="polite">
                  <strong>انتخاب‌های تو</strong>
                  <span><bdi dir="ltr">{SHOP_SIZES[sizeIndex].label}</bdi> سانتی‌متر</span>
                  {confirmed.date ? <span>تاریخ: {confirmed.date} ({confirmed.calendar === 'jalali' ? 'شمسی' : 'میلادی'})</span> : null}
                  {confirmed.time ? <span>ساعت: {confirmed.time}</span> : null}
                  {confirmed.city ? <span>شهر: {confirmed.city}</span> : null}
                  {confirmed.names ? <span>نام: {confirmed.names}</span> : null}
                  {confirmed.message ? <span>پیام: {confirmed.message}</span> : null}
                </div>
              ) : null}
              <p className={styles.actionFootnote}>تاریخ، نام و پیام دلخواهت را هنگام شخصی‌سازی وارد می‌کنی.</p>
            </div>
          </div>
        </section>

        <section className={styles.storySection} aria-labelledby="story-heading">
          <div className={styles.storyImage}>
            <Image src={product.gallery[1].src} alt={product.gallery[1].alt} fill sizes="(max-width: 760px) calc(100vw - 32px), 690px" />
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
            <Image src={product.gallery[3].src} alt={product.gallery[3].alt} fill sizes="(max-width: 760px) calc(100vw - 32px), 500px" />
          </div>
        </section>

        <section id="size-guide" className={styles.dimensionsSection} aria-labelledby="dimensions-heading">
          <div className={styles.centerIntro}>
            <span className={styles.sectionKicker}>راهنمای انتخاب اندازه</span>
            <h2 id="dimensions-heading">کدام اندازه برای فضای تو مناسب‌تر است؟</h2>
            <p>هر سه اندازه، نسبت تصویر یکسانی دارند؛ تفاوت در جایی است که می‌خواهی تابلو دیده شود.</p>
          </div>
          <SizeIllustration image={product.gallery[0].src} title={product.title} />
          <p className={styles.sizeNote}>این مقایسه نسبت اندازه‌های ۱۰×۱۵، ۲۰×۳۰ و ۳۰×۴۵ را روی دیواری نمونه نشان می‌دهد. هر سه اندازه با چاپ مات روی شاسی آماده می‌شوند.</p>
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
            <summary>بیشتر بخوان <span aria-hidden="true">↓</span></summary>
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
                <span className={styles.relatedPrice}>از {formatPrice(SHOP_SIZES[0].price)} تومان</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className={`${styles.mobilePurchaseBar} ${isFooterVisible ? styles.mobilePurchaseBarHidden : ''}`} inert={isFooterVisible} aria-hidden={isFooterVisible}>
        <div><small>قیمت انتخابی</small><strong>{formatPrice(price)} <span>تومان</span></strong></div>
        <button type="button" onClick={() => setPersonalizeOpen(true)}>{confirmed ? 'ویرایش مشخصات' : 'شخصی‌سازی تابلو'}</button>
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

      <dialog ref={personalizeDialog} onClose={() => setPersonalizeOpen(false)} className={styles.personalizeDialog} aria-labelledby="personalize-heading">
        <form onSubmit={confirmDetails} className={styles.personalizeForm}>
          <div className={styles.modalHeader}>
            <div><span className={styles.sectionKicker}>برای تو ساخته می‌شود</span><h2 id="personalize-heading">شخصی‌سازی {product.title}</h2></div>
            <button className={styles.modalClose} type="button" onClick={() => setPersonalizeOpen(false)} aria-label="بستن">×</button>
          </div>
          <div className={styles.modalSelectedSize}>اندازهٔ انتخابی: <strong><bdi dir="ltr">{SHOP_SIZES[sizeIndex].label}</bdi> سانتی‌متر</strong><span>{formatPrice(price)} تومان</span></div>
          <div className={styles.formField}>
            <label htmlFor="product-date-mode">تقویم</label>
            <select id="product-date-mode" value={form.calendar} onChange={(event) => { updateForm('calendar', event.target.value); updateForm('date', ''); }}>
              <option value="jalali">شمسی</option><option value="gregorian">میلادی</option>
            </select>
          </div>
          <div className={styles.formField}>
            <label htmlFor="product-date">{id === 'p02' ? 'تاریخ تولد' : id === 'p03' ? 'تاریخ خاطره (اختیاری)' : 'تاریخ لحظهٔ عزیز تو'}</label>
            <input id="product-date" dir="ltr" required={id !== 'p03'} value={form.date} type={form.calendar === 'gregorian' ? 'date' : 'text'} inputMode={form.calendar === 'jalali' ? 'numeric' : undefined} placeholder={form.calendar === 'jalali' ? '۱۴۰۳/۰۶/۱۲' : undefined} onChange={(event) => updateForm('date', event.target.value)} />
          </div>
          {id === 'p02' || id === 'p01' ? (
            <>
              <div className={styles.formField}><label htmlFor="product-time">{id === 'p02' ? 'ساعت دقیق تولد' : 'ساعت (اختیاری)'}</label><input id="product-time" type="time" dir="ltr" required={id === 'p02'} value={form.time} onChange={(event) => updateForm('time', event.target.value)} /></div>
              <div className={styles.formField}><label htmlFor="product-city">{id === 'p02' ? 'شهر تولد' : 'شهر (اختیاری)'}</label><input id="product-city" type="text" required={id === 'p02'} maxLength={100} placeholder={id === 'p02' ? 'نام شهر تولد' : 'نام شهر، اگر دوست داری'} value={form.city} onChange={(event) => updateForm('city', event.target.value)} /></div>
              {id === 'p02' ? <p className={styles.formHint}>برای نقشهٔ ستاره‌ها، تاریخ، ساعت و شهر دقیق تولد اهمیت دارند.</p> : null}
            </>
          ) : null}
          <div className={styles.formField}><label htmlFor="product-names">{id === 'p03' ? 'نام‌های شما (اختیاری)' : 'نام روی تابلو (اختیاری)'}</label><input id="product-names" type="text" maxLength={60} placeholder={id === 'p03' ? 'مثلاً هاله و آراد' : 'نام دلخواه'} value={form.names} onChange={(event) => updateForm('names', event.target.value)} /></div>
          <div className={styles.formField}><label htmlFor="product-message">پیام کوتاه (اختیاری)</label><textarea id="product-message" maxLength={60} rows={2} placeholder="چند کلمه که فقط برای شما معنا دارد…" value={form.message} onChange={(event) => updateForm('message', event.target.value)} /><small>حداکثر ۶۰ نویسه</small></div>
          {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
          <button className={styles.modalSubmit} type="submit">تأیید انتخاب‌ها <span aria-hidden="true">←</span></button>
        </form>
      </dialog>
    </div>
  );
}
