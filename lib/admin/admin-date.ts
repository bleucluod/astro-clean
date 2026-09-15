const ADMIN_TIMEZONE = "Asia/Tehran";
const ADMIN_PERSIAN_LOCALE = "fa-IR-u-ca-persian";

function toDate(value: string) {
  const normalized = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T12:00:00.000Z`)
    : new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatAdminDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = toDate(value);
  if (!date) return value;
  try {
    return new Intl.DateTimeFormat(ADMIN_PERSIAN_LOCALE, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: ADMIN_TIMEZONE,
    }).format(date);
  } catch {
    return value;
  }
}

export function formatAdminDateOnly(value: string | null | undefined) {
  if (!value) return "—";
  const date = toDate(value);
  if (!date) return value;
  try {
    return new Intl.DateTimeFormat(ADMIN_PERSIAN_LOCALE, {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: ADMIN_TIMEZONE,
    }).format(date);
  } catch {
    return value;
  }
}