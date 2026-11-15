'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { validateBahmanPreview, type BahmanPreview } from '@/lib/shop/nemad-man-bahman-preview';
import { NemadManBahmanArtwork } from './NemadManBahmanArtwork';
import styles from './nemad-man-bahman-preview.module.css';

function approvedExample(): BahmanPreview {
  const result = validateBahmanPreview('آراد', '۱۳۷۵/۱۱/۲۵');
  if (!result.ok) throw new Error('The Bahman preview fixture is invalid.');
  return result.value;
}
const example = approvedExample();

export function NemadManBahmanPreview() {
  const [name, setName] = useState('آراد');
  const [date, setDate] = useState('۱۳۷۵/۱۱/۲۵');
  const [preview, setPreview] = useState<BahmanPreview>(example);
  const [error, setError] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateBahmanPreview(name, date);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError('');
    setPreview(result.value);
  }

  return (
    <main className={styles.page} dir="rtl" data-shop-page="bahman-dev-preview">
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.kicker}>نماد من / نسخهٔ آزمایشی بهمن</span>
          <h1>تابلوی خودت، با نام و تاریخ تولدت</h1>
          <p>سبک مینیمال ستاره‌ایِ دلو را با اطلاعات دلخواهت ببین؛ این صفحه فقط برای بررسی طراحی است.</p>
        </header>
        <div className={styles.layout}>
          <section className={styles.previewPanel} aria-label="پیش‌نمایش شخصی‌سازی‌شده">
            <div className={styles.board}><NemadManBahmanArtwork name={preview.name} date={preview.gregorianDate} /></div>
            <p className={styles.note}>طرح روی شاسی بدون قاب. خطوط صورت فلکی دلو از دادهٔ مرجع نجومی گرفته شده‌اند؛ تاریخ فقط نوشتهٔ شخصی‌سازی‌شده را تغییر می‌دهد، نه موقعیت ستاره‌ها.</p>
          </section>
          <section className={styles.editor} aria-label="شخصی‌سازی تابلو">
            <h2>این تابلو برای کیه؟</h2>
            <p>نام و تاریخ تولد را وارد کن و پیش‌نمایش را بساز.</p>
            <form onSubmit={submit} className={styles.form} noValidate>
              <label htmlFor="bahman-name">نام روی تابلو</label>
              <input id="bahman-name" name="name" value={name} onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
                maxLength={40} autoComplete="off" placeholder="مثلاً آراد" />
              <label htmlFor="bahman-date">تاریخ تولد شمسی</label>
              <input id="bahman-date" name="date" value={date} onChange={(event: ChangeEvent<HTMLInputElement>) => setDate(event.target.value)}
                inputMode="numeric" autoComplete="off" dir="ltr" placeholder="۱۳۷۵/۱۱/۲۵" />
              <small>فعلاً فقط تاریخ‌های بهمن پذیرفته می‌شوند؛ تاریخِ روی تابلو به سبک نمونهٔ تأییدشده، میلادی نمایش داده می‌شود.</small>
              {error ? <p className={styles.error} role="alert">{error}</p> : null}
              <button className={styles.submit} type="submit">ساخت پیش‌نمایش</button>
            </form>
            <div className={styles.info}>
              <strong>فعلاً فقط پیش‌نمایش</strong>
              <p>سفارش، پرداخت، دانلود فایل چاپ و ذخیرهٔ اطلاعات کاربر فعال نیستند. نام و تاریخ فقط در مرورگر همین صفحه استفاده می‌شوند.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
