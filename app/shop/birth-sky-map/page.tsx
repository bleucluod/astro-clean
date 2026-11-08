import type { Metadata } from 'next';
import { BirthSkyLiveProduct } from '@/components/shop/BirthSkyLiveProduct';

export const metadata: Metadata = {
  title: 'آسمان تولد | نقشهٔ واقعی ستاره‌های لحظهٔ تولد | هالیوس',
  description: 'نقشهٔ محاسبه‌شدهٔ ستاره‌های لحظهٔ تولد را با تاریخ شمسی یا میلادی، ساعت و شهر واقعی بساز و تصویر تخت اثر را ببین. فروش این تابلو هنوز آغاز نشده است.',
  alternates: { canonical: '/shop/birth-sky-map' },
  // The owner is reviewing the real computed product prior to imagery/pricing signoff.
  robots: { index: false, follow: true },
};

export default function BirthSkyProductPage() {
  return <BirthSkyLiveProduct />;
}
