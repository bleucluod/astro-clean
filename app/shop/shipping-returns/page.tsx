import { buildSocialPreviewMetadata } from '@/lib/config/seo';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  SHOP_HANDOFF_MAX_BUSINESS_DAYS,
  SHOP_POST_TRANSIT_MIN_BUSINESS_DAYS,
  SHOP_POST_TRANSIT_MAX_BUSINESS_DAYS,
} from '@/lib/shop/shop-merchant-policy';

export const metadata: Metadata = {
  title: 'شرایط ارسال و مرجوعی تابلوهای سفارشی | هالیوس',
  description: 'زمان آماده‌سازی و تحویل تابلوهای هالیوس به پست یا تیپاکس، شیوه پیگیری سفارش و شرایط انصراف و رسیدگی به کالای آسیب‌دیده یا مغایر.',
  ...buildSocialPreviewMetadata({
    title: 'شرایط ارسال و مرجوعی تابلوهای سفارشی | هالیوس',
    description: 'زمان آماده‌سازی و تحویل تابلوهای هالیوس به پست یا تیپاکس، شیوه پیگیری سفارش و شرایط انصراف و رسیدگی به کالای آسیب‌دیده یا مغایر.',
    canonical: "/shop/shipping-returns",
  }),
  alternates: { canonical: '/shop/shipping-returns' },
  robots: { index: true, follow: true },
};

export default function ShopShippingReturnsPage() {
  return <section dir="rtl" style={{
    background: '#F8FAFC', color: '#243447', padding: 'clamp(32px, 6vw, 64px) 20px',
    minHeight: '60dvh', lineHeight: 2,
  }}>
    <article style={{ maxWidth: 760, margin: '0 auto' }}>
      <p style={{ color: '#52657A', fontSize: 13 }}>فروشگاه هالیوس</p>
      <h1 style={{ fontSize: 'clamp(24px, 4vw, 32px)', margin: '8px 0 22px', lineHeight: 1.6 }}>
        شرایط ارسال و مرجوعی آثار سفارشی
      </h1>
      <h2 style={{ fontSize: 20, marginTop: 26 }}>آماده‌سازی و ارسال</h2>
      <p>تابلوهای هالیوس مطابق انتخاب‌ها و مشخصات سفارش ساخته می‌شوند.
        پس از تأیید پرداخت، تابلو حداکثر تا {SHOP_HANDOFF_MAX_BUSINESS_DAYS.toLocaleString('fa-IR')} روز کاری
        برای ارسال به پست یا تیپاکس تحویل داده می‌شود. این زمان، زمان تحویل بسته به شرکت حمل است،
        نه زمان رسیدن آن به نشانی گیرنده.</p>
      <p>برای ارسال با پست پیشتاز، زمان تقریبی حمل پس از تحویل بسته به پست را
        {' '}{SHOP_POST_TRANSIT_MIN_BUSINESS_DAYS.toLocaleString('fa-IR')} تا {SHOP_POST_TRANSIT_MAX_BUSINESS_DAYS.toLocaleString('fa-IR')} روز کاری در نظر بگیر.
        این بازه شامل زمان آماده‌سازی تابلو نیست و زمان قطعی تحویل محسوب نمی‌شود؛
        مقصد، تعطیلات و شرایط شبکهٔ پستی ممکن است باعث تأخیر شوند.
        زمان حمل تیپاکس نیز به سرویس و مقصد بستگی دارد.
        هزینه پست یا بسته‌بندی تیپاکس در مراحل سفارش مشخص می‌شود؛ هزینه حمل تیپاکس طبق گزینه انتخابی، پس‌کرایه است.</p>
      <h2 style={{ fontSize: 20, marginTop: 26 }}>انصراف و مرجوعی تابلوهای شخصی‌سازی‌شده</h2>
      <p>برای محصولات دارای نام، تاریخ، پیام یا سایر مشخصات اختصاصی، امکان مشاهده پیش‌نمایش
        پیش از ثبت سفارش فراهم است. به دلیل ساخت اثر بر اساس مشخصات فردی خریدار،
        پس از ثبت و تأیید سفارش، انصراف سلیقه‌ای یا مرجوعی صرفاً به علت تغییر نظر
        یا اشتباه در اطلاعات واردشده توسط خریدار پذیرفته نمی‌شود.</p>
      <p>این محدودیت به معنی سلب حقوق قانونی خریدار نیست. در صورت آسیب‌دیدگی کالا،
        ایراد ساخت یا چاپ، یا مغایرت اثر تحویلی با مشخصات ثبت‌شدهٔ سفارش،
        موضوع بررسی و بر اساس تعهدات فروشنده و حقوق قانونی مشتری رسیدگی می‌شود.</p>
      <h2 style={{ fontSize: 20, marginTop: 26 }}>پیگیری سفارش یا اعلام مشکل</h2>
      <p>پس از ثبت سفارش، وضعیت آماده‌سازی و کد رهگیری حمل را از
        {' '}<Link href="/shop/track" style={{ color: '#2F4052', textDecoration: 'underline' }}>صفحهٔ پیگیری سفارش</Link>
        {' '}ببین. اگر کالای تحویلی آسیب‌دیده یا مغایر بود،
        شماره سفارش و تصویر مشکل را از طریق
        {' '}<a href="https://www.instagram.com/halleus_ir/" target="_blank" rel="noopener noreferrer"
          style={{ color: '#2F4052', textDecoration: 'underline' }}>راه ارتباطی هالیوس</a>
        {' '}برای بررسی بفرست؛ پیش از هر اقدام به بازگرداندن کالا هماهنگ کن.</p>
      <p style={{ marginTop: 30 }}>
        <Link href="/shop" style={{ color: '#2F4052', textDecoration: 'underline' }}>بازگشت به فروشگاه</Link>
      </p>
    </article>
  </section>;
}
