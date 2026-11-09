import { BIRTH_SKY_CLOSING, BIRTH_SKY_FAQ, BIRTH_SKY_SECTIONS } from './birth-sky-content';
import styles from './birth-sky-live-product.module.css';

function RichCopy({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((part, i) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={i}>{part.slice(2, -2)}</strong>
    : <span key={i}>{part}</span>)}</>;
}

export function BirthSkyEditorial() {
  return <div className={styles.editorialRoot}>
    {BIRTH_SKY_SECTIONS.map((section, index) => (
      <section key={section.title} className={styles.editorialSection} aria-label={section.title}>
        <div className={styles.editorialSectionHeader}>
          <span className={styles.editorialKicker}>{index === 0 ? 'داستانِ یک آسمان' : 'آسمان تولد هالیوس'}</span>
          <h2>{section.title}</h2>
        </div>
        <div className={styles.editorialBody}>
          {section.blocks.map((block, i) => {
            if (block.type === 'subheading') return <h3 key={i}>{block.text}</h3>;
            if (block.type === 'paragraph') return <p key={i}><RichCopy text={block.text} /></p>;
            if (block.type === 'steps') return <ol key={i}>{block.items.map((item, n) =>
              <li key={n}><RichCopy text={item} /></li>)}</ol>;
            if (block.type === 'sizes') return <div key={i} className={styles.sizeCards}>
              <div><strong>۱۰ × ۱۵ سانتی‌متر</strong><p>صمیمی و ظریف؛ برای میز، شلف و دو تابلوی کوچک کنار هم.</p></div>
              <div><strong>۲۰ × ۳۰ سانتی‌متر</strong><p>انتخابی متعادل برای دیوار اتاق و گوشهٔ مطالعه.</p></div>
              <div><strong>۳۰ × ۴۵ سانتی‌متر</strong><p>حضوری شاخص‌تر بر دیوار اصلی یا بالای کنسول.</p></div>
            </div>;
            return null;
          })}
        </div>
      </section>
    ))}
    <section className={styles.faqSection} aria-labelledby="birth-sky-faq">
      <span className={styles.editorialKicker}>برای انتخاب آگاهانه‌تر</span>
      <h2 id="birth-sky-faq">پرسش‌های پرتکرار دربارهٔ آسمان تولد</h2>
      <div className={styles.faqList}>
        {BIRTH_SKY_FAQ.map(({ question, answer }) => <details key={question} className={styles.faqItem}>
          <summary>{question}<span aria-hidden="true">+</span></summary>
          {answer.map((paragraph, i) => <p key={i}><RichCopy text={paragraph} /></p>)}
        </details>)}
      </div>
    </section>
    <section className={styles.finalEditorial} aria-label={BIRTH_SKY_CLOSING.title}>
      <h2>{BIRTH_SKY_CLOSING.title}</h2>
      {BIRTH_SKY_CLOSING.paragraphs.map((paragraph, i) => <p key={i}><RichCopy text={paragraph} /></p>)}
      <a href="#p02-personalize">{BIRTH_SKY_CLOSING.button}</a>
    </section>
  </div>;
}
