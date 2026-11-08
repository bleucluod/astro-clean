import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { BirthSkyLiveProduct } from '@/components/shop/BirthSkyLiveProduct';

// Same Estedad Light/Regular/Medium assets used by the approved P01 R9b
// native renderer. Keep the live SVG and downloaded PNG typography aligned.
const estedad = localFont({
  src: [
    { path: '../../../assets/shop-print/fonts/Estedad-Light.ttf', weight: '300', style: 'normal' },
    { path: '../../../assets/shop-print/fonts/Estedad-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../../assets/shop-print/fonts/Estedad-Medium.ttf', weight: '500', style: 'normal' },
  ],
  variable: '--font-p02-estedad',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'آسمان تولد | نقشهٔ واقعی ستاره‌های لحظهٔ تولد | هالیوس',
  description: 'نقشهٔ محاسبه‌شدهٔ ستاره‌های لحظهٔ تولد را با تاریخ شمسی یا میلادی، ساعت و شهر واقعی بساز و تصویر تخت اثر را ببین. فروش این تابلو هنوز آغاز نشده است.',
  alternates: { canonical: '/shop/birth-sky-map' },
  // The owner is reviewing the real computed product prior to imagery/pricing signoff.
  robots: { index: false, follow: true },
};

export default function BirthSkyProductPage() {
  return <div className={estedad.variable}><BirthSkyLiveProduct /></div>;
}
