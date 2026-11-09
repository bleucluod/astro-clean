import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { BirthSkyLiveProduct } from '@/components/shop/BirthSkyLiveProduct';
import { isShopP02OrderEnabled } from '@/lib/shop/shop-mvp-activation';

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
  title: 'تابلو آسمان شب تولد؛ نقشه ستاره‌ها | هالیوس',
  description: 'تابلو آسمان شب تولد هالیوس؛ نقشه ستاره‌های محاسبه‌شده برای تاریخ، ساعت و شهر دلخواه، با نام و پیام شخصی و چاپ مات روی شاسی بدون قاب در سه اندازه.',
  alternates: { canonical: '/shop/birth-sky-map' },
  // The owner is reviewing the real computed product prior to imagery/pricing signoff.
  robots: { index: false, follow: true },
};

// Read the P02 order gate per request, not once during a build.
export const dynamic = 'force-dynamic';

export default function BirthSkyProductPage() {
  return <div className={estedad.variable}><BirthSkyLiveProduct purchaseEnabled={isShopP02OrderEnabled()} /></div>;
}
