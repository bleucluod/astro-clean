import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isNemadMonthSlug } from '@/lib/shop/nemad-man-months';
import NemadMonthProductPage, { generateMetadata as monthMetadata } from '../nemad-man/[month]/page';

type Props = { params: Promise<{ slug: string }> };

// Public indexable canonical path for the month sign products.
// The alternate /shop/nemad-man/[month] route remains noindex.
export const dynamic = 'force-dynamic';

async function monthParams({ params }: Props): Promise<{ params: Promise<{ month: string }> }> {
  const slug = (await params).slug;
  const match = /^([a-z]+)-sign$/.exec(slug);
  if (!match || !isNemadMonthSlug(match[1])) notFound();
  return { params: Promise.resolve({ month: match[1] }) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { month } = await (await monthParams(props)).params;
  const metadata = await monthMetadata(await monthParams(props));
  return {
    ...metadata,
    alternates: { canonical: `/shop/${month}-sign` },
    robots: { index: true, follow: true },
  };
}

export default async function SignProductPage(props: Props) {
  return NemadMonthProductPage(await monthParams(props));
}
