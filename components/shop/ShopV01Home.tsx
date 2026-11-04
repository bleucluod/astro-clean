'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import styles from './shop-v01-home.module.css';

export type ShopV01Item = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  href: string;
  priceToman: number | null;
  availability: 'available' | 'unavailable' | 'coming-soon';
  imageSrc: string | null;
  imageAlt: string | null;
};

const formatNumber = (value: number) => new Intl.NumberFormat('fa-IR').format(value);

function ProductArt({ item, hero = false }: { item: ShopV01Item; hero?: boolean }) {
  if (item.imageSrc && item.imageAlt) {
    return (
      <Image
        src={item.imageSrc}
        alt={item.imageAlt}
        width={hero ? 1100 : 800}
        height={hero ? 900 : 670}
        sizes={hero ? '(max-width: 767px) 100vw, 55vw' : '(max-width: 359px) 100vw, (max-width: 767px) 50vw, (max-width: 1199px) 50vw, 33vw'}
        className={styles.realProductImage}
      />
    );
  }

  return (
    <div className={`${styles.scene} ${hero ? styles.sceneHero : ''}`} aria-label="تصویر مفهومی از چیدمان تابلو؛ تصویر نهایی کالا نیست">
      <div className={styles.sceneWall} />
      <div className={styles.scenePlinth} />
      <div className={styles.sampleBoard}>
        <div className={styles.sampleBoardInner}>
          <span className={styles.boardIndex}>HALLEUS · THE MOON</span>
          <Image
            src="/halleus-visuals/moon-apollo11.webp"
            alt=""
            width={520}
            height={520}
            sizes={hero ? '280px' : '200px'}
            className={styles.moonStudy}
            aria-hidden="true"
          />
          <span className={styles.boardCaption}>ONE MOMENT, FOREVER</span>
        </div>
      </div>
      <span className={styles.mockDisclaimer}>شمای مفهومی · عکس نهایی نیست</span>
    </div>
  );
}

function PriceAndStatus({ item }: { item: ShopV01Item }) {
  if (item.availability === 'coming-soon') {
    return <div className={styles.purchaseState}><strong>قیمت پس از تأیید</strong><span>به‌زودی</span></div>;
  }

  return (
    <div className={styles.purchaseState}>
      <strong>{item.priceToman !== null ? `${formatNumber(item.priceToman)} تومان` : 'قیمت در دست بررسی'}</strong>
      <span>{item.availability === 'available' && item.priceToman !== null ? 'قابل سفارش' : 'فعلاً قابل سفارش نیست'}</span>
    </div>
  );
}

const PAGE_SIZE = 12;

export function ShopV01Home({ products, previewMode = false }: { products: ShopV01Item[]; previewMode?: boolean }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('default');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const categories = useMemo(() => Array.from(new Set(products.map((item) => item.category))), [products]);
  const showControls = products.length >= 6;
  const canSortByPrice = products.some((item) => item.priceToman !== null);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fa-IR');
    const matches = products.filter((item) =>
      (category === 'all' || item.category === category) &&
      (!query || `${item.title} ${item.subtitle} ${item.category}`.toLocaleLowerCase('fa-IR').includes(query))
    );
    if (sort === 'price-asc') return [...matches].sort((a, b) => (a.priceToman ?? Infinity) - (b.priceToman ?? Infinity));
    if (sort === 'price-desc') return [...matches].sort((a, b) => (b.priceToman ?? -1) - (a.priceToman ?? -1));
    return matches;
  }, [products, search, category, sort]);
  const shown = filtered.slice(0, visibleCount);

  function resetPage() { setVisibleCount(PAGE_SIZE); }

  return (
    <div className={styles.shopHome}>
      {previewMode && <div className={styles.previewBanner} role="status">پیش‌نمایش طراحی V01 · تصاویر، قیمت‌ها و امکان سفارش هنوز تأیید نشده‌اند</div>}
      <nav className={styles.crumbs} aria-label="مسیر صفحه">
        <Link href="/">هالیوس</Link><span aria-hidden="true">/</span><span>فروشگاه</span>
      </nav>

      <section className={styles.hero} aria-labelledby="shop-title">
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>HALLEUS / OBJECTS & MOMENTS</span>
          <h1 id="shop-title"><span className={styles.h1Kicker}>فروشگاه هالیوس</span>لحظه‌هایی که<br />می‌مانند.</h1>
          <p className={styles.heroLead}>آسمانِ یک روز خاص، به شکل اثری که می‌تونی هر روز ببینی.</p>
          <p className={styles.heroSupporting}>مجموعه‌ای از آثار شخصی و ساخته‌شده برای داستان‌های واقعی. اولین اثر ما، «ماه آن روز»، در حال آماده‌شدنه.</p>
          <a className={styles.heroButton} href="#products">دیدن مجموعه آثار <span aria-hidden="true">←</span></a>
          <span className={styles.heroFootnote}>HALLEUS STUDIO <span className={styles.footnoteDash} /> MADE FOR YOUR MOMENTS</span>
        </div>
        <div className={styles.heroMedia}>
          <ProductArt item={products[0] ?? { id: 'P01', title: 'ماه آن روز', subtitle: '', category: '', href: '#products', priceToman: null, availability: 'coming-soon', imageSrc: null, imageAlt: null }} hero />
          <span className={styles.mediaIndex}>01 / THE MOON THAT DAY</span>
        </div>
      </section>

      <section id="products" className={styles.collection} aria-labelledby="collection-heading">
        <header className={styles.collectionHeader}>
          <div>
            <span className={styles.eyebrow}>THE COLLECTION</span>
            <h2 id="collection-heading">مجموعه آثار <span className={styles.collectionCount}>{formatNumber(products.length).padStart(2, '۰')}</span></h2>
            <p>{products.length === 1 ? 'اولین اثر هالیوس؛ یک یادگاری از آسمان.' : 'آثاری که می‌تونی برای لحظه‌های خودت انتخاب کنی.'}</p>
          </div>
          {showControls && <div className={styles.collectionMeta}>{formatNumber(filtered.length)} اثر</div>}
        </header>

        {showControls && (
          <div className={styles.controls}>
            <div className={styles.categoryBar} aria-label="دسته‌بندی آثار">
              <button type="button" className={category === 'all' ? styles.categorySelected : styles.categoryButton} onClick={() => { setCategory('all'); resetPage(); }}>همهٔ آثار</button>
              {categories.map((value) => <button key={value} type="button" className={category === value ? styles.categorySelected : styles.categoryButton} onClick={() => { setCategory(value); resetPage(); }}>{value}</button>)}
            </div>
            <details className={styles.mobileControlDisclosure}>
              <summary>جست‌وجو و مرتب‌سازی</summary>
              <div className={styles.searchAndSort}>
                <label className={styles.searchLabel}>جست‌وجو در مجموعه
                  <input type="search" placeholder="نام اثر..." value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} />
                </label>
                <label className={styles.sortLabel}>مرتب‌سازی
                  <select value={sort} onChange={(event) => { setSort(event.target.value); resetPage(); }}>
                    <option value="default">پیشنهادی</option>
                    {canSortByPrice && <><option value="price-asc">قیمت: کم به زیاد</option><option value="price-desc">قیمت: زیاد به کم</option></>}
                  </select>
                </label>
              </div>
            </details>
          </div>
        )}

        {shown.length > 0 ? (
          <div className={`${styles.productGrid} ${products.length === 1 ? styles.singleProductGrid : ''}`}>
            {shown.map((item) => (
              <article className={styles.productCard} key={item.id}>
                <Link className={styles.productLink} href={item.href} aria-label={`مشاهدهٔ ${item.title}`}>
                  <div className={styles.productVisual}><ProductArt item={item} /></div>
                  <div className={styles.cardTopline}><span>{item.category}</span><span className={styles.cardCode}>{item.id}</span></div>
                  <h3>{item.title}</h3>
                  <p>{item.subtitle}</p>
                  <PriceAndStatus item={item} />
                  <span className={styles.cardAction}>مشاهدهٔ محصول <span aria-hidden="true">↗</span></span>
                </Link>
              </article>
            ))}
          </div>
        ) : <p className={styles.noResults}>اثری با این جست‌وجو پیدا نشد. عبارت دیگری رو امتحان کن.</p>}

        {filtered.length > visibleCount && (
          <div className={styles.loadMore}><button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>نمایش آثار بیشتر <span aria-hidden="true">↓</span></button></div>
        )}
      </section>

      <section className={styles.belief} aria-labelledby="belief-title">
        <div className={styles.beliefIntro}><span className={styles.eyebrow}>A LITTLE MORE PERSONAL</span><h2 id="belief-title">یک تاریخ،<br />یک داستان.</h2></div>
        <p>برای بعضی خاطره‌ها، عکس کافی نیست. گاهی می‌خوای بخشی از همان آسمان را کنار خودت نگه داری.</p>
      </section>

      <aside className={styles.trustStrip} aria-label="دربارهٔ آثار هالیوس">
        <div><span className={styles.trustNumber}>01</span><h3>ساخته‌شده برای تو</h3><p>شخصی‌سازی با تاریخ انتخابی، در آثاری که این امکان را دارند.</p></div>
        <div><span className={styles.trustNumber}>02</span><h3>چاپ مینیمال</h3><p>اولین مجموعه روی شاسی مات بدون قاب طراحی شده است.</p></div>
        <div><span className={styles.trustNumber}>03</span><h3>ارسال قابل پیگیری</h3><p>پس از فعال‌شدن سفارش، تحویل به پست یا تیپاکس و اعلام کد رهگیری تا ۷۲ ساعت کاری.</p></div>
      </aside>
    </div>
  );
}
