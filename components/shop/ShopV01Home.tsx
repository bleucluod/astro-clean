import Image from 'next/image';
import Link from 'next/link';
import styles from './shop-v01-home.module.css';

export type ShopV01Item = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  href: string | null;
  priceToman: number | null;
  availability: 'available' | 'unavailable' | 'coming-soon';
  imageSrc: string | null;
  imageAlt: string | null;
};

function ProductImage({ item }: { item: ShopV01Item }) {
  return (
    <div className={styles.productVisual}>
      {item.imageSrc ? (
        <Image
          src={item.imageSrc}
          alt={item.imageAlt ?? item.title}
          fill
          sizes="(max-width: 767px) calc(100vw - 36px), (max-width: 1024px) 46vw, 30vw"
          className={styles.productImage}
        />
      ) : (
        <span className={styles.imageUnavailable}>تصویر این اثر هنوز آماده نیست</span>
      )}
    </div>
  );
}

export function ShopV01Home({ products, showP02Invitation = true }: { products: ShopV01Item[]; showP02Invitation?: boolean }) {
  return (
    <div className={styles.shopHome}>
      <section className={styles.heroSection} aria-labelledby="shop-title">
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.heroKicker}>فروشگاه هالیوس</span>
            <h1 id="shop-title">خرید هدیه خاص از هالیوس؛ برای خاطره‌هایی که می‌مونن</h1>
            <p className={styles.heroLead}>بعضی لحظه‌ها از تقویم می‌گذرن، اما از دل نه. هالیوس از همون لحظه‌های عزیز الهام می‌گیره و اون‌ها رو به آثاری تبدیل می‌کنه که می‌تونی هر روز ببینی، دوست داشته باشی و نگه داری.</p>
          </div>
        </div>
      </section>

      <section id="products" className={styles.collection} aria-labelledby="collection-heading">
        <div className={styles.collectionInner}>
          <header className={styles.collectionHeader}>
            <h2 id="collection-heading">هدایای خاص هالیوس؛ هر اثر، یک داستان</h2>
          </header>
          <div className={products.length === 1 ? styles.featuredGrid : styles.productGrid}>
            {products.map((item) => {
              const cardContent = (
                <>
                  <ProductImage item={item} />
                  <div className={styles.productDetails}>
                    <div className={styles.productHeading}><h3>{item.title}</h3></div>
                    <p className={styles.productSubtitle}>{item.subtitle}</p>
                  </div>
                </>
              );
              return (
                <article className={products.length === 1 ? styles.featuredCard : styles.productCard} key={item.id}>
                  {item.href ? (
                    <Link className={styles.cardLink} href={item.href} aria-label={'مشاهدهٔ ' + item.title}>
                      {cardContent}
                    </Link>
                  ) : (
                    <div className={styles.cardLink}>{cardContent}</div>
                  )}
                </article>
              );
            })}
          </div>
          {showP02Invitation ? <aside className={styles.p02Invitation} aria-label="مشاهدهٔ طرح واقعی آسمان تولد">
            <div>
              <span>محصول دوم هالیوس · پیش‌نمایش طراحی</span>
              <h3>آسمان تولد، از روی ستاره‌های واقعی</h3>
              <p>تاریخ، ساعت و شهر رو انتخاب کن و پیش‌نمایش نقشهٔ محاسبه‌شدهٔ خودت رو کنار موکاپ‌های تأییدشده ببین.</p>
            </div>
            <Link href="/shop/birth-sky-map">ساخت و دیدن آسمان تولد</Link>
          </aside> : null}
        </div>
      </section>

      <section className={styles.shopEditorial} aria-labelledby="shop-editorial-heading">
        <div className={styles.shopEditorialInner}>
          <section className={styles.shopEditorialIntro}>
            <h2 id="shop-editorial-heading">برای خرید کادو خاص، از یک خاطره شروع کن</h2>
            <p>بعضی هدیه‌ها فقط لحظهٔ بازشدن جعبه رو شیرین می‌کنن؛ بعضی دیگه می‌مونن و با هر نگاه، یک حس آشنا رو برمی‌گردونن. هالیوس برای همین لحظه‌های موندگار طراحی می‌کنه. برای ما، هدیه ماندگار چیزی فراتر از یک وسیلهٔ زیباست؛ اثریه که به سلیقه، رابطه و خاطرهٔ واقعی آدم‌ها نزدیک باشه.</p>
            <p>در فروشگاه کادو هالیوس، حال‌وهوای آسمان با داستان‌های زمینی گره می‌خوره؛ یک روز مهم، یک نام عزیز یا پیامی که دلت می‌خواد باقی بمونه. برای خرید کادو و هدیه، می‌تونی تصویر و ویژگی هر اثر رو ببینی و از بین آثاری که امکان سفارش دارن انتخاب کنی. هالیوس هم مجموعه‌اش رو به‌مرور با طراحی‌های تازه گسترش می‌ده، بدون اینکه داستان و هویت هر محصول میان بقیه گم بشه.</p>
            <p>انتخاب هدیه وقتی دلنشین‌تره که مجبور نباشی فقط از روی یک عکس تصمیم بگیری. ما می‌خوایم از اولین نگاه تا لحظهٔ ثبت سفارش، بدونی چه اثری رو برای چه کسی انتخاب می‌کنی.</p>
          </section>
          <div className={styles.shopEditorialPanels}>
          <section className={styles.shopEditorialPanel} aria-labelledby="shop-design-heading">
            <h3 id="shop-design-heading">طراحی‌ای که با گذشت زمان زیباتر به دل می‌شینه</h3>
            <p>یک هدیه هنری باید هم از نزدیک دیدنی باشه و هم بعد از خاموش‌شدن هیجان روز اول، هنوز چیزی برای گفتن داشته باشه. هالیوس به ترکیب‌بندی، رنگ‌ها و فضای نفس‌کشیدن تصویر توجه می‌کنه؛ چون این اثر قراره فقط برای یک روز نباشه.</p>
            <p>اگه دنبال هدیه دکوری هستی، اینجا می‌تونی طرحی انتخاب کنی که با حال‌وهوای خونه هماهنگ باشه و در عین حال معنایی شخصی داشته باشه. کادوهای خاص همیشه به زرق‌وبرق نیاز ندارن؛ گاهی یک تصویر آرام، همون کادو زیبا و متفاوتیه که مدت‌ها دنبالشی.</p>
          </section>
          <section className={styles.shopEditorialPanel} aria-labelledby="shop-personal-heading">
            <h3 id="shop-personal-heading">هدیه خاص و متفاوت، با جزئیاتی که مال توئه</h3>
            <p>آدم‌ها با چیزهای یکسان خوشحال نمی‌شن. برای یکی یک تاریخ مهمه، برای یکی یک جمله و برای یکی تصویری که بی‌صدا یادآور یک نفره. هالیوس این تفاوت‌ها رو در طراحی جدی می‌گیره تا انتخاب کادو به سلیقهٔ کسی که براش خرید می‌کنی نزدیک‌تر بشه.</p>
            <p>در محصولاتی که امکان شخصی‌سازی دارن، می‌تونی جزئیات مشخص‌شده در صفحهٔ همون اثر رو وارد کنی؛ مثلاً تاریخ، نام یا پیام، فقط در صورتی که اون گزینه واقعاً برای محصول ارائه شده باشه. همین دقت در انتخاب می‌تونه یک هدیه خاص و شیک رو به یک هدیه به‌یادماندنی تبدیل کنه؛ چیزی که فقط دیده نمی‌شه، بلکه قصه‌ای رو زنده نگه می‌داره.</p>
          </section>
          </div>
          <details className={styles.shopMore}>
            <summary className={styles.shopMoreToggle}>
              <span className={styles.shopMoreClosedLabel}>خواندن بیشتر دربارهٔ آثار هالیوس</span>
              <span className={styles.shopMoreOpenLabel}>بستن توضیحات</span>
              <span className={styles.shopMoreChevron} aria-hidden="true">⌄</span>
            </summary>
            <div className={styles.shopMoreContent}>
          <section className={styles.shopEditorialSection} aria-labelledby="shop-choice-heading">
            <h3 id="shop-choice-heading">خرید هدیه آنلاین، با دیدن جزئیات قبل از سفارش</h3>
            <p>برای خرید هدیه آنلاین، تصویر زیبا به‌تنهایی کافی نیست. هالیوس در صفحهٔ هر محصول، تصاویر نمونه، اندازه‌های قابل‌انتخاب، قیمت و گزینه‌های مربوط به همون اثر رو کنار هم می‌ذاره تا انتخابت روشن باشه. پیش از ثبت سفارش می‌تونی ببینی چه چیزی دریافت می‌کنی و کدوم مشخصات رو خودت تعیین می‌کنی.</p>
            <p>اگه برای خرید کادو شیک دنبال اثری هستی که فقط ظاهر قشنگی نداشته باشه، جزئیات ساخت و انتخاب هم بخشی از تجربهٔ هالیوسه. برای خرید هدیه شیک لازم نیست میان زیبایی و اطلاعات شفاف یکی رو انتخاب کنی؛ هر دو باید کنار هم باشن.</p>
          </section>
          <section className={styles.shopEditorialSection} aria-labelledby="shop-gifts-heading">
            <h2 id="shop-gifts-heading">کادو شیک و خاص برای آدم‌هایی که برات مهمن</h2>
            <p>گاهی بهانه‌اش یک تبریکه، گاهی یک تشکر، و گاهی اصلاً بهانه‌ای در کار نیست. چه دنبال هدیه مناسبتی باشی و چه بخوای بی‌مناسبت کسی رو خوشحال کنی، یک انتخاب فکرشده بیشتر از قیمت و اندازه‌اش حرف برای گفتن داره.</p>
            <p>اگر کادوی ماندگار برای خانه می‌خوای، اثری انتخاب کن که جایی برای خودش در زندگی روزمره پیدا کنه: روی دیوار، کنار کتاب‌های محبوب یا در گوشه‌ای که هر بار نگاه بهش می‌افته، خاطره‌ای برمی‌گرده. یک هدیه زیبا می‌تونه چشمگیر باشه؛ هالیوس تلاش می‌کنه اون زیبایی به حس و معنای شخصی هم گره بخوره.</p>
            <p>برای خودت هم می‌تونی چیزی انتخاب کنی. لازم نیست همهٔ یادگاری‌ها رو کسی دیگه بهت هدیه بده؛ بعضی لحظه‌های زندگی ارزش این رو دارن که خودت براشون جا باز کنی.</p>
          </section>
            </div>
          </details>
          <section className={styles.shopEditorialSection} aria-labelledby="shop-orders-heading">
            <h2 id="shop-orders-heading">خرید اینترنتی کادو و هدیه از هالیوس؛ از انتخاب تا پیگیری</h2>
            <p>برای خرید آنلاین هدیه از هالیوس، اول وارد صفحهٔ اثر موردعلاقه‌ات می‌شی، تصویرها و مشخصاتش رو بررسی می‌کنی و بعد اندازه و گزینه‌های قابل‌انتخاب همون محصول رو تعیین می‌کنی. پس از واردکردن اطلاعات ارسال، می‌تونی سفارش رو بدون ساخت حساب کاربری ثبت کنی.</p>
            <p>پرداخت با کارت‌به‌کارت انجام می‌شه. بعد از اعلام و بررسی واریز و تأیید پرداخت، هالیوس آماده‌سازی سفارش رو شروع می‌کنه. حداکثر تا ۷۲ ساعت کاری پس از تأیید پرداخت، بسته به پست یا تیپاکس تحویل داده می‌شه و کد رهگیری در اختیارت قرار می‌گیره. زمان رسیدن بسته به مقصد به شرکت حمل بستگی داره.</p>
            <p>اینجا سفارش هدیه فقط به انتخاب یک طرح ختم نمی‌شه؛ تا مرحلهٔ سپردن بسته به شرکت حمل، مسیرش روشن و قابل پیگیریه.</p>
            <div className={styles.shopEditorialFaq} aria-labelledby="shop-faq-heading">
              <h3 id="shop-faq-heading">سؤال‌های رایج دربارهٔ سفارش از هالیوس</h3>
              <div className={styles.shopEditorialFaqGrid}>
              <div className={styles.shopEditorialAnswer}>
                <h4>هالیوس چه هدیه‌هایی ارائه می‌ده؟</h4>
                <p>هالیوس آثار هنری الهام‌گرفته از آسمان، تاریخ‌ها و خاطره‌های عزیز طراحی می‌کنه. آثار قابل‌سفارش رو در همین صفحه می‌بینی و برای شناخت هر کدوم وارد صفحهٔ اختصاصی اون می‌شی. مجموعهٔ هالیوس به‌مرور گسترش پیدا می‌کنه.</p>
              </div>
              <div className={styles.shopEditorialAnswer}>
                <h4>می‌تونم هدیه رو شخصی‌سازی کنم؟</h4>
                <p>در آثاری که این امکان رو دارن، بله. گزینه‌ها و محدودیت‌ها برای هر محصول جداگانه نوشته شده؛ مثلاً تاریخ، نام یا پیام فقط وقتی قابل اضافه‌کردنه که همون محصول اون گزینه رو داشته باشه.</p>
              </div>
              <div className={styles.shopEditorialAnswer}>
                <h4>برای خرید کادو آنلاین از هالیوس باید حساب کاربری بسازم؟</h4>
                <p>نه. می‌تونی به‌عنوان مهمان سفارش ثبت کنی، اطلاعات تحویل رو وارد کنی و مراحل پرداخت و پیگیری رو انجام بدی.</p>
              </div>
              <div className={styles.shopEditorialAnswer}>
                <h4>کد رهگیری رو چه زمانی دریافت می‌کنم؟</h4>
                <p>هالیوس حداکثر تا ۷۲ ساعت کاری بعد از تأیید پرداخت، بسته رو به پست یا تیپاکس تحویل می‌ده و کد رهگیری رو اعلام می‌کنه. این زمان، مهلت تحویل به شرکت حمله، نه تضمین زمان رسیدن بسته به مقصد.</p>
              </div>
              </div>
            </div>
          </section>
          <div className={styles.shopEditorialClosing}>
            <h2>هدیهٔ بعدی‌ات رو از هالیوس انتخاب کن</h2>
            <p>بعضی خاطره‌ها به یک نگاه دوباره نیاز دارن. شاید اثر بعدی هالیوس همون جایی باشه که یکی از اون‌ها برای همیشه می‌مونه.</p>
            <Link href="#products">مشاهدهٔ آثار و انتخاب هدیه <span aria-hidden="true">←</span></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
