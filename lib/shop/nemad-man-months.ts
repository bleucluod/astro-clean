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

// Single shared shop cover selection for all twelve approved signs.
// Homepage and catalog must show the same photograph for a given month.
export const NEMAD_SHOP_COVERS = {
  farvardin: { file: '03-nazanin-dark-lounge.webp', theme: 'dark' },
  ordibehesht: { file: 'arad-light-black-edge-20261118.webp', theme: 'light' },
  khordad: { file: '02-taraneh-1377-03-13-dark-wall-bench.webp', theme: 'dark' },
  tir: { file: 'halle-light-30x45-black-edge-20261118.webp', theme: 'light' },
  mordad: { file: '04-parastoo-1375-05-14-dark-gift-wrap.webp', theme: 'dark' },
  shahrivar: { file: 'halle-light-30x45-black-edge-20261118.webp', theme: 'light' },
  mehr: { file: '02-amir-1389-07-14-dark-wall-bench.webp', theme: 'dark' },
  aban: { file: 'halle-light-30x45-black-edge-20261118.webp', theme: 'light' },
  azar: { file: '04-sam-1389-09-12-dark-gift-wrap.webp', theme: 'dark' },
  dey: { file: 'halle-light-30x45-black-edge-20261118.webp', theme: 'light' },
  bahman: { file: '02-nora-1370-11-18-dark-wall-bench.webp', theme: 'dark' },
  esfand: { file: 'arad-light-black-edge-20261118.webp', theme: 'light' },
} as const satisfies Record<(typeof NEMAD_MONTHS)[number]['slug'], { file: string; theme: 'dark' | 'light' }>;

/** Persian-calendar month for today's date in the shop's Tehran timezone. */
export function getCurrentTehranNemadMonth(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    timeZone: "Asia/Tehran",
    month: "numeric",
  });
  const monthValue = formatter.formatToParts(date).find((part) => part.type === "month")?.value;
  const number = Number(monthValue);
  if (!Number.isInteger(number) || number < 1 || number > 12) {
    throw new Error("Unexpected Persian calendar month");
  }
  return NEMAD_MONTHS[number - 1];
}
