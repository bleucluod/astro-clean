export type ShopCarrier = 'post' | 'tipax';
export type ShippingForm = {
  name: string;
  mobile: string;
  province: string;
  city: string;
  postalCode: string;
  address: string;
  note: string;
  carrier: ShopCarrier;
};

const LEGACY_CHECKOUT_SESSION_KEY = 'halleus.shop.checkout.session.v1';
export const SHOP_SHIPPING_AND_PACKAGING: Record<ShopCarrier, number> = {
  post: 100_000,
  tipax: 50_000,
};

export const blankShipping: ShippingForm = {
  name: '', mobile: '', province: '', city: '', postalCode: '', address: '', note: '', carrier: 'post',
};

export const englishDigits = (value: string) => value.replace(/[۰-۹٠-٩]/g, (digit) =>
  String('۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩'.indexOf(digit) % 10));

export function normalizeMobileTail(value: string) {
  const digits = englishDigits(value).replace(/\D/g, '');
  const withoutCountry = digits.startsWith('0098') ? digits.slice(4) : digits.startsWith('98') ? digits.slice(2) : digits;
  return (withoutCountry.startsWith('0') ? withoutCountry.slice(1) : withoutCountry).slice(0, 10);
}

export function validateShipping(form: ShippingForm): string | null {
  if (!/^9\d{9}$/.test(form.mobile)) return 'شمارهٔ موبایل باید ۱۰ رقم و با ۹ شروع شود.';
  if (!/^\d{10}$/.test(englishDigits(form.postalCode))) return 'کد پستی باید دقیقاً ۱۰ رقم باشد.';
  if (!form.name.trim() || !form.province || !form.city.trim() || form.address.trim().length < 10) {
    return 'لطفاً نام گیرنده و نشانی کامل را وارد کن.';
  }
  return null;
}

// Earlier checkout drafts stored recipient PII in sessionStorage. Never restore
// or write those drafts; remove any old copy when the flow is opened.
export function clearCheckoutSession() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(LEGACY_CHECKOUT_SESSION_KEY); } catch { /* No browser storage available. */ }
}
