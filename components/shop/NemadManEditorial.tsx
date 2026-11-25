import type { ShopCopySection, ShopProduct } from './product-detail-data';
import styles from './birth-sky-live-product.module.css';
import { ContextualProductText } from './ContextualProductText';

function CopySection({ section, index }: { section: ShopCopySection; index: number }) {
  return <section className={styles.editorialSection} aria-label={section.title}>
    <div className={styles.editorialSectionHeader}>
      <span className={styles.editorialKicker}>{index === 0 ? 'روایت نماد من' : 'نماد من · هالیوس'}</span>
      <h2>{section.title}</h2>
    </div>
    <div className={styles.editorialBody}>
      {section.paragraphs.map((paragraph, i) => <p key={i}><ContextualProductText text={paragraph} /></p>)}
      {section.subheading ? <>
        <h3>{section.subheading.title}</h3>
        {section.subheading.paragraphs.map((paragraph, i) => <p key={i}><ContextualProductText text={paragraph} /></p>)}
      </> : null}
      {section.subheadings?.map((heading) => <div key={heading.title}>
        <h3>{heading.title}</h3>
        {heading.paragraphs.map((paragraph, i) => <p key={i}><ContextualProductText text={paragraph} /></p>)}
      </div>)}
    </div>
  </section>;
}

/** Approved copy remains in its original order. This only uses P02's existing display skin. */
export function NemadManEditorial({ product }: { product: ShopProduct }) {
  const sections: ShopCopySection[] = [
    { title: product.storyTitle, paragraphs: product.story },
    { title: product.qualityTitle, paragraphs: product.quality },
    ...(product.preCraftSections ?? []),
  ];
  return <div className={styles.editorialRoot}>
    {sections.map((section, i) => <CopySection section={section} index={i} key={section.title} />)}
    <section className={styles.faqSection} aria-labelledby="nemad-man-faq">
      <span className={styles.editorialKicker}>برای انتخاب آگاهانه‌تر</span>
      <h2 id="nemad-man-faq">{product.faqHeading ?? 'پرسش‌های متداول'}</h2>
      <div className={styles.faqList}>
        {product.faq.map((item) => <details key={item.question} className={styles.faqItem}>
          <summary>{item.question}<span aria-hidden="true">+</span></summary>
          <p>{item.answer}</p>
        </details>)}
      </div>
    </section>
    {product.postCraftSections?.map((section, i) =>
      <CopySection section={section} index={sections.length + i} key={section.title} />)}
    {product.closingCopy ? <section className={styles.editorialSection} aria-label={product.closingCopy.title}>
      <div className={styles.editorialSectionHeader}><span className={styles.editorialKicker}>نماد شخصی تو</span>
        <h2>{product.closingCopy.title}</h2></div>
      <div className={styles.editorialBody}>
        <p>{product.closingCopy.text}</p>
        <p><a href="#personalize">{product.closingCopy.button}</a></p>
      </div>
    </section> : null}
  </div>;
}
