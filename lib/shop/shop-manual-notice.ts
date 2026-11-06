import { isValidShopOrderNumber } from './shop-order-number';

type ShopManualNoticeInput = {
  orderNumber: string;
  status: string;
  trackingCode?: string | null;
  carrier?: string;
};

/** Copy-only text. No provider is contacted and no send is claimed or recorded. */
export function buildShopManualCustomerNotice(input: ShopManualNoticeInput): string | null {
  if (!isValidShopOrderNumber(input.orderNumber)) return null;
  const opening = `سلام، سفارش شمارهٔ ${input.orderNumber} شما در هالیوس`;
  const tracking = '\nبرای پیگیری وضعیت سفارش به halleus.ir/shop/track مراجعه کنید و کد خصوصی سفارش خودتان را وارد کنید.';
  if (input.status === 'payment_verified') {
    return `${opening} پس از بررسی واریز، تأیید شد. آماده‌سازی سفارش شروع خواهد شد.${tracking}`;
  }
  if (input.status === 'preparing') {
    return `${opening} در حال آماده‌سازی است. حداکثر تا ۷۲ ساعت کاری پس از تأیید پرداخت، سفارش به شرکت حمل تحویل داده خواهد شد.${tracking}`;
  }
  if (input.status === 'shipped') {
    const code = input.trackingCode?.trim() ?? '';
    if (!/^[A-Za-z0-9۰-۹٠-٩_./-]{4,100}$/.test(code)) return null;
    if (input.carrier !== 'post' && input.carrier !== 'tipax') return null;
    const carrier = input.carrier === 'post' ? 'پست' : 'تیپاکس';
    return `${opening} به ${carrier} تحویل داده شد. کد رهگیری مرسوله: ${code}.${tracking}`;
  }
  return null;
}
