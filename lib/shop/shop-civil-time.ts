export type ShopCivilTimeResult =
  | { status: 'resolved'; utcIso: string }
  | { status: 'ambiguous' | 'nonexistent' | 'invalid-timezone' };

/**
 * Resolve local civil time against the IANA timezone database. An hour repeated
 * by a DST rollback is not guessed; a skipped hour is not silently normalized.
 */
export function resolveShopCivilTimeUtc(localDate: string, localTime: string, timeZone: string): ShopCivilTimeResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(localTime)) {
    return { status: 'nonexistent' };
  }
  const wall = new Date(`${localDate}T${localTime}:00.000Z`);
  if (!Number.isFinite(wall.getTime()) || wall.toISOString().slice(0, 10) !== localDate) {
    return { status: 'nonexistent' };
  }
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    });
  } catch {
    return { status: 'invalid-timezone' };
  }
  const partsAt = (utcMilliseconds: number) => {
    const parts = formatter.formatToParts(new Date(utcMilliseconds));
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    return {
      year: value('year'), month: value('month'), day: value('day'),
      hour: value('hour'), minute: value('minute'), second: value('second'),
    };
  };

  const wallMilliseconds = wall.getTime();
  const offsets = new Set<number>();
  // Sampling both sides of the civil day catches ordinary and historical DST
  // changes, including non-hour offsets, without assuming a fixed UTC offset.
  for (const hours of [-36, -12, 0, 12, 36]) {
    const probe = wallMilliseconds + hours * 3_600_000;
    const local = partsAt(probe);
    const localAsUtcDate = new Date(0);
    localAsUtcDate.setUTCFullYear(local.year, local.month - 1, local.day);
    localAsUtcDate.setUTCHours(local.hour, local.minute, local.second, 0);
    const localAsUtc = localAsUtcDate.getTime();
    offsets.add(localAsUtc - probe);
  }
  const matches = new Set<number>();
  for (const offset of offsets) {
    const candidate = wallMilliseconds - offset;
    const actual = partsAt(candidate);
    const expected = `${localDate}T${localTime}:00`;
    const actualText = `${String(actual.year).padStart(4, '0')}-${String(actual.month).padStart(2, '0')}-${String(actual.day).padStart(2, '0')}T${String(actual.hour).padStart(2, '0')}:${String(actual.minute).padStart(2, '0')}:${String(actual.second).padStart(2, '0')}`;
    if (actualText === expected) matches.add(candidate);
  }
  if (matches.size > 1) return { status: 'ambiguous' };
  if (matches.size !== 1) return { status: 'nonexistent' };
  return { status: 'resolved', utcIso: new Date([...matches][0]).toISOString() };
}
