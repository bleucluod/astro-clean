import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NemadManBahmanPreview } from '@/components/shop/NemadManBahmanPreview';

export const metadata: Metadata = {
  title: 'پیش‌نمایش آزمایشی تابلوی بهمن | هالیوس',
  robots: { index: false, follow: false },
};

// Never expose a provisional zodiac product or its preview in production.
export const dynamic = 'force-dynamic';

export default function BahmanPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <NemadManBahmanPreview />;
}
