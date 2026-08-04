const FAVORITE_REPORT_IDS_KEY = "astro-clean-favorite-report-ids";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function loadFavoriteReportIds(): string[] {
  if (!canUseStorage()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(FAVORITE_REPORT_IDS_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function saveFavoriteReportIds(reportIds: string[]) {
  if (!canUseStorage()) {
    return;
  }

  const uniqueIds = Array.from(new Set(reportIds));

  window.localStorage.setItem(FAVORITE_REPORT_IDS_KEY, JSON.stringify(uniqueIds));
}

export function toggleFavoriteReportId(reportId: string) {
  const currentIds = loadFavoriteReportIds();
  const isFavorite = currentIds.includes(reportId);

  if (isFavorite) {
    saveFavoriteReportIds(currentIds.filter((id) => id !== reportId));
    return false;
  }

  saveFavoriteReportIds([reportId, ...currentIds]);
  return true;
}

export function clearFavoriteReportIds() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(FAVORITE_REPORT_IDS_KEY);
}
