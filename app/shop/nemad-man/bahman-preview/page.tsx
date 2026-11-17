import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NemadManBahmanPreview } from '@/components/shop/NemadManBahmanPreview';
import { validateBahmanPreview } from '@/lib/shop/nemad-man-bahman-preview';
import type { NemadPosterTheme } from '@/components/shop/NemadManBahmanArtwork';
import type { NemadPosterSize } from '@/lib/shop/nemad-man-preview-export';

export const metadata: Metadata = {
  title: 'پیش‌نمایش آزمایشی تابلوی بهمن | هالیوس',
  robots: { index: false, follow: false },
};

// Never expose a provisional zodiac product or its preview in production.
export const dynamic = 'force-dynamic';

type PreviewPageProps = {
  searchParams: Promise<{ batchMonth?: string; batchTheme?: string; batchPrintSize?: string }>;
};

export default async function BahmanPreviewPage({ searchParams }: PreviewPageProps) {
  if (process.env.NODE_ENV === 'production') notFound();
  const query = await searchParams;
  const monthIndex = Number(query.batchMonth);
  if (!query.batchMonth || !Number.isInteger(monthIndex) || monthIndex < 1 || monthIndex > 12) {
    return <NemadManBahmanPreview />;
  }

  // Explicitly for local review, the SAME astronomy validation and poster
  // component are used. Server and client receive identical initial values.
  const date = '1375/' + String(monthIndex).padStart(2, '0') + '/15';
  const result = validateBahmanPreview('آراد', date);
  if (!result.ok) throw new Error('Batch example date cannot resolve: ' + date);
  const theme: NemadPosterTheme = query.batchTheme === 'light' ? 'light' : 'dark';
  const printSize: NemadPosterSize =
    query.batchPrintSize === '10x15' || query.batchPrintSize === '30x45'
      ? query.batchPrintSize : '20x30';
  return <NemadManBahmanPreview
    initialPreview={result.value}
    initialTheme={theme}
    initialPrintSize={printSize}
  />;
}
