import type {
  ComparisonRecord,
  ComparisonStorageResult,
} from "@/types/comparison-product";
import { COMPARISON_PRODUCT_VERSION } from "@/types/comparison-product";

const COMPARISON_STORAGE_KEY = "halleus-private-comparisons-v1";
const MAX_PRIVATE_COMPARISONS = 6;

export function loadPrivateComparisons(): ComparisonRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(COMPARISON_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isComparisonRecord)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, MAX_PRIVATE_COMPARISONS);
  } catch {
    return [];
  }
}

export function getPrivateComparison(
  comparisonId: string,
): ComparisonRecord | null {
  return (
    loadPrivateComparisons().find((record) => record.id === comparisonId) ?? null
  );
}

export function savePrivateComparison(
  record: ComparisonRecord,
): ComparisonStorageResult {
  if (typeof window === "undefined") {
    return { ok: false, message: "ذخیره خصوصی فقط در مرورگر انجام می‌شود." };
  }

  const records = [
    record,
    ...loadPrivateComparisons().filter((item) => item.id !== record.id),
  ].slice(0, MAX_PRIVATE_COMPARISONS);

  for (let keepCount = records.length; keepCount >= 1; keepCount -= 1) {
    try {
      const keptRecords = records.slice(0, keepCount);
      window.localStorage.setItem(
        COMPARISON_STORAGE_KEY,
        JSON.stringify(keptRecords),
      );
      notifyComparisonChanged();
      return { ok: true, records: keptRecords };
    } catch {
      // Retry with fewer old comparisons. Never delete natal reports automatically.
    }
  }

  return {
    ok: false,
    message:
      "فضای ذخیره مرورگر کافی نیست. چند مقایسه یا گزارش قدیمی را حذف کن و دوباره تلاش کن.",
  };
}

export function deletePrivateComparison(
  comparisonId: string,
): ComparisonStorageResult {
  if (typeof window === "undefined") {
    return { ok: false, message: "حذف مقایسه فقط در مرورگر انجام می‌شود." };
  }

  const next = loadPrivateComparisons().filter(
    (record) => record.id !== comparisonId,
  );

  try {
    window.localStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(next));
    notifyComparisonChanged();
    return { ok: true, records: next };
  } catch {
    return {
      ok: false,
      message: "حذف مقایسه در این مرورگر کامل نشد. دوباره تلاش کن.",
    };
  }
}

export function clearPrivateComparisons(): ComparisonStorageResult {
  if (typeof window === "undefined") {
    return { ok: false, message: "پاک‌سازی فقط در مرورگر انجام می‌شود." };
  }

  try {
    window.localStorage.removeItem(COMPARISON_STORAGE_KEY);
    notifyComparisonChanged();
    return { ok: true, records: [] };
  } catch {
    return {
      ok: false,
      message: "پاک‌سازی مقایسه‌ها در این مرورگر کامل نشد.",
    };
  }
}

export function subscribeToPrivateComparisons(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === COMPARISON_STORAGE_KEY) listener();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener("halleus-comparison-changed", listener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("halleus-comparison-changed", listener);
  };
}

function notifyComparisonChanged() {
  window.dispatchEvent(new Event("halleus-comparison-changed"));
}

function isComparisonRecord(value: unknown): value is ComparisonRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<ComparisonRecord>;
  return (
    record.version === COMPARISON_PRODUCT_VERSION &&
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.updatedAt === "string" &&
    typeof record.chartAId === "string" &&
    typeof record.chartBId === "string" &&
    record.privacy?.visibility === "private" &&
    record.privacy?.indexingPolicy === "noindex" &&
    record.privacy?.rawBirthInputStored === false &&
    Boolean(record.report) &&
    Boolean(record.reading)
  );
}
