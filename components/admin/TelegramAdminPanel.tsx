"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "./admin-console.module.css";

type QueueSummary = {
  currentPackId: string | null;
  draftCount: number;
  readyCount: number;
  retryingCount: number;
  publishedCount: number;
  failedCount: number;
  uncertainCount: number;
  stalePublishingCount: number;
  nextScheduledAt: string | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  lastError: string | null;
};

type JsonPayload = Record<string, unknown>;

function tehranDateToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone: "Asia/Tehran",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizeError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/telegram queue summary failed/iu.test(message)) {
    return "خلاصهٔ صف تلگرام دریافت نشد. اگر localhost به دیتابیس وصل نیست، این خطا در محیط محلی طبیعی است.";
  }
  if (/telegram bridge/iu.test(message)) {
    return "ارتباط سرویس تلگرام آماده نیست. وضعیت Worker و تنظیمات bridge را بررسی کن.";
  }
  if (/content pack.*valid json/iu.test(message)) {
    return "فایل بستهٔ تلگرام JSON معتبر نیست. هیچ پیامی وارد صف نشده؛ فایل درست خروجی AI را دوباره انتخاب کن.";
  }
  if (/scheduled before its event time/iu.test(message)) {
    return "زمان‌بندی یکی از پیام‌ها قبل از زمان واقعی رویداد است. پیام وارد صف نشده؛ اگر متن پیش‌نمایش است timingMode را pre_event بگذار، وگرنه زمان انتشار را به eventAt یا بعد از آن منتقل کن.";
  }
  if (/overlap|هم‌پوشانی/iu.test(message)) {
    return message;
  }
  return message || fallback;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function TelegramAdminPanel({ token }: { token: string }) {
  const today = useMemo(() => tehranDateToday(), []);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => addDays(today, 14));
  const [city, setCity] = useState("تهران");
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch("/api/admin/telegram/content-pack", {
        cache: "no-store",
        headers: { authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as JsonPayload;
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "وضعیت صف تلگرام دریافت نشد.",
        );
      }
      setSummary(payload.summary as QueueSummary);
      setError("");
    } catch (loadError) {
      setError(normalizeError(loadError, "وضعیت صف تلگرام دریافت نشد."));
    }
  }, [token]);

  useEffect(() => {
    // Admin queue summary is external server state synchronized on tab load.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSummary();
  }, [loadSummary]);

  async function downloadTransitPack() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const query = new URLSearchParams({ startDate, endDate, city });
      const response = await fetch(`/api/admin/telegram/transit-pack?${query.toString()}`, {
        cache: "no-store",
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const payload = (await response.json()) as JsonPayload;
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "ساخت بسته ترنزیت ناموفق بود.",
        );
      }
      const blob = await response.blob();
      downloadBlob(blob, `Halleus-Telegram-Transit-Pack-${startDate}-to-${endDate}.json`);
      setMessage("بستهٔ هوشمند ترنزیت آماده و دانلود شد.");
    } catch (downloadError) {
      setError(normalizeError(downloadError, "ساخت بسته ترنزیت ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  async function importContentPack() {
    if (!file) {
      setError("اول فایل JSON خروجی چت محتوا را انتخاب کن.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData();
      form.set("package", file);
      const response = await fetch("/api/admin/telegram/content-pack", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      const payload = (await response.json()) as JsonPayload;
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "ورود بستهٔ تلگرام ناموفق بود.",
        );
      }
      const result = payload.result as {
        packId?: string;
        itemCount?: number;
        queuedCount?: number;
        skippedPastCount?: number;
        pastCutoff?: string;
        skippedDuplicateCount?: number;
        duplicateDates?: string[];
        alreadyImported?: boolean;
      };
      const queuedCount = Number(result.queuedCount ?? 0);
      const skippedPastCount = Number(result.skippedPastCount ?? 0);
      const skippedDuplicateCount = Number(result.skippedDuplicateCount ?? 0);
      const dates = Array.isArray(result.duplicateDates)
        ? result.duplicateDates.join("، ")
        : "";
      if (result.alreadyImported) {
        setMessage(
          `این بسته قبلاً به هالیوس داده شده بود. ${skippedDuplicateCount.toLocaleString("fa-IR")} پیام تکراری شناسایی شد و دوباره وارد صف نشد؛ صف انتشار هیچ تغییری نکرد.`,
        );
      } else if (queuedCount === 0 && skippedPastCount > 0) {
        setMessage(
          `هیچ پیام تازه‌ای وارد صف نشد. ${skippedPastCount.toLocaleString("fa-IR")} پیام چون زمان انتشارشان تا لحظهٔ ورود فایل گذشته بود، عمداً رد شدند و روی کانال نریختند.`,
        );
      } else if (skippedPastCount > 0 || skippedDuplicateCount > 0) {
        const pastText =
          skippedPastCount > 0
            ? ` ${skippedPastCount.toLocaleString("fa-IR")} پیامِ گذشته عمداً وارد صف نشد.`
            : "";
        const duplicateText =
          skippedDuplicateCount > 0
            ? ` ${skippedDuplicateCount.toLocaleString("fa-IR")} پیام تکراری هم بدون ساخت نسخهٔ دوم رد شد${dates ? ` (${dates})` : ""}.`
            : "";
        setMessage(
          `${queuedCount.toLocaleString("fa-IR")} پیام آینده با زمان‌بندی اصلی وارد صف شد.${pastText}${duplicateText}`,
        );
      } else {
        setMessage(
          `بسته ${result.packId ?? "تلگرام"} با ${queuedCount.toLocaleString("fa-IR")} پیام جدید وارد صف انتشار شد.`,
        );
      }
      setFile(null);
      await loadSummary();
    } catch (importError) {
      setError(normalizeError(importError, "ورود بستهٔ تلگرام ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  const issueCount =
    (summary?.failedCount ?? 0) +
    (summary?.uncertainCount ?? 0) +
    (summary?.stalePublishingCount ?? 0);

  return (
    <div className={styles.telegramWorkspace}>
      {error ? <p className={styles.error}>{error}</p> : null}
      {message ? <p className={styles.success}>{message}</p> : null}

      <section className={styles.telegramStatusStrip} aria-label="وضعیت انتشار تلگرام">
        <article>
          <span>آماده</span>
          <strong>{(summary?.readyCount ?? 0).toLocaleString("fa-IR")}</strong>
        </article>
        <article>
          <span>پست بعدی</span>
          <strong>{formatDate(summary?.nextScheduledAt ?? null)}</strong>
        </article>
        <article>
          <span>منتشرشده</span>
          <strong>{(summary?.publishedCount ?? 0).toLocaleString("fa-IR")}</strong>
        </article>
        <article data-attention={issueCount > 0 ? "true" : "false"}>
          <span>نیازمند بررسی</span>
          <strong>{issueCount.toLocaleString("fa-IR")}</strong>
        </article>
      </section>

      <section className={styles.telegramCoverageCard}>
        <div>
          <span className={styles.eyebrow}>پوشش محتوا</span>
          <h3>{summary?.currentPackId || "هنوز بسته‌ای فعال نیست"}</h3>
          <p>
            {summary?.coverageStart || summary?.coverageEnd
              ? `${formatDate(summary?.coverageStart ?? null)} تا ${formatDate(summary?.coverageEnd ?? null)}`
              : "بعد از ورود اولین Content Pack، بازهٔ پوشش اینجا دیده می‌شود."}
          </p>
        </div>
        <button type="button" disabled={loading} onClick={() => void loadSummary()}>
          تازه‌سازی وضعیت
        </button>
      </section>

      <div className={styles.telegramActionGrid}>
        <section className={styles.telegramActionCard}>
          <div>
            <span className={styles.stepBadge}>۱</span>
            <div>
              <h3>ساخت بستهٔ هوشمند</h3>
              <p>کل بازهٔ انتخابی از موتور هالیوس می‌آید؛ ۳ روز قبل و بعد فقط به‌شکل خلاصهٔ کم‌حجم برای continuity اضافه می‌شوند. AI با هر next فقط ۳ روز بعدی را می‌نویسد.</p>
            </div>
          </div>
          <div className={styles.telegramFormGrid}>
            <label>
              شروع
              <input
                type="date"
                value={startDate}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setStartDate(event.target.value)}
              />
            </label>
            <label>
              پایان
              <input
                type="date"
                value={endDate}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setEndDate(event.target.value)}
              />
            </label>
            <label className={styles.wideField}>
              شهر مرجع
              <input
                value={city}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setCity(event.target.value)}
                placeholder="تهران"
              />
            </label>
          </div>
          <button
            className={styles.primaryAction}
            type="button"
            aria-label="دانلود Smart Transit Pack"
            disabled={loading}
            onClick={() => void downloadTransitPack()}
          >
            ساخت و دانلود بستهٔ هوشمند
          </button>
        </section>

        <section className={styles.telegramActionCard}>
          <div>
            <span className={styles.stepBadge}>۲</span>
            <div>
              <h3>ورود بستهٔ تجمیعی محتوا</h3>
              <p>فایل cumulative را هر زمان خواستی وارد کن. بسته یا پیام تکراری دوباره ساخته نمی‌شود؛ هم‌پوشانیِ نسخهٔ متفاوت با توضیح دقیق متوقف می‌شود.</p>
            </div>
          </div>

          <label className={styles.filePicker}>
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setFile(event.target.files?.[0] ?? null)
              }
            />
            <span>{file ? file.name : "انتخاب فایل JSON"}</span>
            <strong>{file ? "تغییر فایل" : "انتخاب"}</strong>
          </label>

          <button
            className={styles.primaryAction}
            type="button"
            disabled={loading || !file}
            onClick={() => void importContentPack()}
          >
            اعتبارسنجی، جلوگیری از تکرار و زمان‌بندی بسته
          </button>
        </section>
      </div>

      <details className={styles.telegramHealth} open={issueCount > 0}>
        <summary>
          <span>سلامت سیستم انتشار</span>
          <strong>{issueCount > 0 ? `${issueCount.toLocaleString("fa-IR")} مورد نیازمند بررسی` : "سالم"}</strong>
        </summary>
        <div className={styles.telegramHealthGrid}>
          <article><span>در انتظار تلاش دوباره</span><strong>{(summary?.retryingCount ?? 0).toLocaleString("fa-IR")}</strong></article>
          <article><span>تحویل نامشخص</span><strong>{(summary?.uncertainCount ?? 0).toLocaleString("fa-IR")}</strong></article>
          <article><span>انتشار گیرکرده</span><strong>{(summary?.stalePublishingCount ?? 0).toLocaleString("fa-IR")}</strong></article>
          <article><span>خطای نهایی</span><strong>{(summary?.failedCount ?? 0).toLocaleString("fa-IR")}</strong></article>
          <article><span>پیش‌نویس</span><strong>{(summary?.draftCount ?? 0).toLocaleString("fa-IR")}</strong></article>
        </div>
        {summary?.lastError ? <p className={styles.telegramLastError}>{summary.lastError}</p> : null}
      </details>
    </div>
  );
}
