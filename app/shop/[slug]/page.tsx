import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import NemadMonthProductPage, { generateMetadata as monthMetadata } from '../nemad-man/[month]/page';

type Props = { params: Promise<{ slug: string }> };

// Public canonical path chosen for the month sign products.
// The existing page still gates production access and noindexes review content.
export const dynamic = 'force-dynamic';

async function monthParams({ params }: Props): Promise<{ params: Promise<{ month: string }> }> {
  const slug = (await params).slug;
  const match = /^([a-z]+)-sign$/.exec(slug);
  if (!match) notFound();
  return { params: Promise.resolve({ month: match[1] }) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return monthMetadata(await monthParams(props));
}

export default async function SignProductPage(props: Props) {
  return NemadMonthProductPage(await monthParams(props));
}
