import { parseShopCart, type ShopCartItem } from '@/components/shop/shop-cart';
import { validateShopMoment } from './shop-personalization';
import { getShopPrintSpec } from './shop-print-spec';
import { findHalleusCityById } from '@/lib/locations/cities';
import { calculateShopBrightStarProof } from './shop-sky-stars';

const readyForHandoff = new Set(['payment_verified', 'preparing', 'shipped', 'delivered']);

const names: Record<string, string> = {
  p01: 'ماه آن روز', p02: 'آسمان تولد', p03: 'شبِ ما',
};

export class ShopPrintHandoffError extends Error {
  constructor(message: string, readonly status = 409) { super(message); }
}

function getGregorianDate(item: ShopCartItem): string | null {
  const validated = validateShopMoment(item.productId, item.details);
  if (!validated.ok) throw new ShopPrintHandoffError('تاریخ شخصی‌سازی سفارش معتبر نیست.', 422);
  return validated.gregorianIso;
}

function getBirthSkyReference(item: ShopCartItem) {
  if (item.productId !== 'p02') return null;
  const city = findHalleusCityById(item.details.cityId);
  const validated = validateShopMoment(item.productId, item.details);
  if (!city || !validated.ok || !validated.referenceUtc) {
    throw new ShopPrintHandoffError('مکان و زمان آسمان تولد هنوز معتبر نیست.', 422);
  }
  return {
    source: 'halleus-city-catalog-and-iana-timezone',
    cityId: city.id, latitude: city.latitude, longitude: city.longitude,
    timezone: city.timezone, referenceUtc: validated.referenceUtc,
    brightStarProof: calculateShopBrightStarProof({
      referenceUtc: validated.referenceUtc,
      latitude: city.latitude, longitude: city.longitude,
    }),
  };
}

export function buildPrivateShopPrintHandoff(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new ShopPrintHandoffError('اطلاعات سفارش معتبر نیست.', 422);
  }
  const order = raw as Record<string, unknown>;
  if (typeof order.status !== 'string' || !readyForHandoff.has(order.status)) {
    throw new ShopPrintHandoffError('این سفارش هنوز برای آماده‌سازی چاپ تأیید نشده است.');
  }
  const items = parseShopCart(order.items);
  if (!Array.isArray(order.items) || !items.length || items.length !== order.items.length) {
    throw new ShopPrintHandoffError('مشخصات محصولات برای تحویل به چاپ کامل نیست.', 422);
  }
  const number = typeof order.display_number === 'number' || typeof order.display_number === 'string'
    ? String(order.display_number) : '';
  if (!/^[1-9]\d{0,17}$/.test(number)) {
    throw new ShopPrintHandoffError('شمارهٔ سفارش معتبر نیست.', 422);
  }
  return {
    format: 'halleus.private.print-brief.v1',
    orderNumber: number,
    documentKind: 'production-brief-not-print-ready-artwork',
    instructions: [
      'این فایل خلاصهٔ محرمانهٔ سفارش برای طراح/چاپخانه است؛ فایل نهاییِ قابل چاپ نیست.',
      'تصویر نهایی هر سفارش باید با تاریخ، زمان و شهر سفارش از موتور معتبر هالیوس ساخته و کنترل شود.',
      'برای آسمان تولد، جایگاه ستارگان را با داده‌های واقعی همان لحظه و مکان محاسبه کن.',
      'چاپ مات روی شاسی بدون قاب است. پیش از چاپ، فایل نهایی و اندازه را بررسی کن.',
      'محتوای شخصی این سند را فقط در آرشیو خصوصی سفارش نگهداری کن.',
    ],
    prints: items.map((item, index) => ({
      line: index + 1,
      productId: item.productId,
      productTitle: names[item.productId],
      sizeCm: item.size,
      prepressRequirements: getShopPrintSpec(item.size),
      birthSkyReference: getBirthSkyReference(item),
      quantity: item.quantity,
      material: 'matte-print-on-unframed-shasi',
      personalization: {
        calendar: item.details.calendar,
        date: item.details.date,
        // Source date is normalized, but its reference UTC instant is not guessed.
        gregorianDate: getGregorianDate(item),
        time: item.details.time,
        city: item.details.city,
        cityId: item.details.cityId,
        names: item.details.names,
        message: item.details.message,
      },
      printArtworkReady: false,
    })),
  };
}
