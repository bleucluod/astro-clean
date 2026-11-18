import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NemadManMockupGenerator } from '@/components/shop/NemadManMockupGenerator';

export const metadata: Metadata = {
  title: 'مولد گروهی موکاپ نماد من | هالیوس',
  robots: { index: false, follow: false },
};

// Keep this image utility local-only until an explicit production access decision.
export default function NemadManMockupGeneratorPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <NemadManMockupGenerator />;
}
