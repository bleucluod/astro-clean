import { getShopCatalogReadiness } from '@/lib/shop/shop-catalog-readiness';
import styles from './shop-catalog-readiness.module.css';

const money = (value: number) => value.toLocaleString('fa-IR');

/** Source-controlled print proof review. Live prices are managed separately above. */
export function ShopCatalogReadiness() {
  return <section className={styles.board} aria-labelledby="shop-catalog-readiness-title">
    <div className={styles.heading}>
      <div>
        <h3 id="shop-catalog-readiness-title">آمادگی محصولات و فایل‌های چاپ</h3>
        <p>اطلاعات فایل‌های چاپ و قیمت‌های اصلی این بخش از سورس فروشگاه است؛ قیمت فعلی را در «مدیریت قیمت محصولات» بالای همین قسمت ببین و تغییر بده. تصاویر گالری نمونه‌های نمایشی‌اند و برای چاپ استفاده نمی‌شوند.</p>
      </div>
      <span className={styles.notReady}>۳ محصول · آمادهٔ انتشار نیست</span>
    </div>
    <div className={styles.grid}>{getShopCatalogReadiness().map((product) => <article className={styles.product} key={product.id}>
      <div className={styles.productHeading}>
        <strong>{product.title}</strong>
        <span>{product.id.toUpperCase()}</span>
      </div>
      <p className={styles.proof}>{product.proofDescription}</p>
      <dl className={styles.prices} aria-label="قیمت‌های اصلی (نه قیمت‌های فعلی)">{product.sizes.map((size) => <div key={size.dimension}>
        <dt>{size.label} سانتی‌متر</dt>
        <dd>{money(size.priceToman)} تومان</dd>
      </div>)}</dl>
      <div className={styles.assets}>
        <strong>چهار تصویر گالری</strong>
        <ul>{product.gallery.map((item) => <li key={item.src}>
          <a href={item.src} target="_blank" rel="noopener noreferrer" title={item.alt}>{item.label}</a>
        </li>)}</ul>
      </div>
      <p className={styles.proof}>فایل نهایی چاپ: <strong>تأیید نشده</strong>
        {product.proofNativePixels ? <> · پیش‌نمایش {money(product.proofNativePixels.width)}×{money(product.proofNativePixels.height)} پیکسل</> : <> · پیش‌نمایش برداری، بدون تأیید چاپخانه</>}
      </p>
      <p className={styles.decisions}>تصمیم‌های باز: {product.pendingDecisions.join(' · ')}</p>
    </article>)}</div>
  </section>;
}
