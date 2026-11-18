/** Canonical Jalali-month identity shared by Nemad pages, cart, orders and print handoff. */
export const NEMAD_MONTHS = [
  { slug: 'farvardin', title: 'فروردین' },
  { slug: 'ordibehesht', title: 'اردیبهشت' },
  { slug: 'khordad', title: 'خرداد' },
  { slug: 'tir', title: 'تیر' },
  { slug: 'mordad', title: 'مرداد' },
  { slug: 'shahrivar', title: 'شهریور' },
  { slug: 'mehr', title: 'مهر' },
  { slug: 'aban', title: 'آبان' },
  { slug: 'azar', title: 'آذر' },
  { slug: 'dey', title: 'دی' },
  { slug: 'bahman', title: 'بهمن' },
  { slug: 'esfand', title: 'اسفند' },
] as const;

export type NemadMonthSlug = (typeof NEMAD_MONTHS)[number]['slug'];

export function getNemadMonthIndex(value: unknown): number {
  if (typeof value !== 'string') return -1;
  return NEMAD_MONTHS.findIndex(month => month.slug === value);
}

export function isNemadMonthSlug(value: unknown): value is NemadMonthSlug {
  return getNemadMonthIndex(value) !== -1;
}

export function getNemadMonthTitle(value: unknown): string | null {
  const index = getNemadMonthIndex(value);
  return index === -1 ? null : NEMAD_MONTHS[index].title;
}
