"use client";

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "./admin-console.module.css";

type QueueFilter =
  | "today"
  | "tomorrow"
  | "date"
  | "all"
  | "ready"
  | "published"
  | "problems";

type QueueItem = {
  id: string;
  contentKey: string;
  contentClass: string;
  contentType: string;
  status: string;
  scheduledFor: string;
  updatedAt: string;
  publishedAt: string | null;
  retryAfter: string | null;
  attemptCount: number;
  packId: string | null;
  reason: string | null;
  previewText: string | null;
};

type QueuePage = {
  filter: QueueFilter;
  date: string | null;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: QueueItem[];
};

type QueueSummary = {
  currentPackId: string | null;
  draftCount: number;
  readyCount: number;
  retryingCount: number;
  publishedCount: number;
  failedCount: number;
  uncertainCount: number;
  stalePublishingCount: number;
  futureScheduledCount: number;
  futureClearableCount: number;
  todayRemaining: number;
  tomorrowRemaining: number;
  nextScheduledAt: string | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  futureCoverageEnd: string | null;
  lastError: string | null;
};

type FutureDay = {
  localDate: string;
  total: number;
  manageableCount: number;
  firstScheduledAt: string | null;
  lastScheduledAt: string | null;
};

type TelegramWorkspaceSection = "overview" | "operations";

type Cta = {
  label: string;
  target: "sky" | "chart" | "compare" | "wiki";
  wikiSlug?: string;
};

type QueueDetail = QueueItem & {
  telegramMessageId: string | null;
  dispatchStartedAt: string | null;
  lastAttemptAt: string | null;
  editableText: string;
  renderedPayload: {
    text: string;
    parseMode: "HTML";
    disableWebPagePreview: true;
  };
  cta: Cta | null;
  sourceRef: string | null;
  itemId: string | null;
  timingMode: string | null;
  eventAt: string | null;
  sourceProvenance: Record<string, unknown> | null;
  canEdit: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  canRetry: boolean;
  canSendNow: boolean;
  scheduledLocal: string;
};

type ControlSnapshot = {
  timezone: "Asia/Tehran";
  globalPaused: boolean;
  controlUpdatedAt: string;
  pausedDays: Array<{ localDate: string; reason: string; createdAt: string }>;
  counters: {
    dueNow: number;
    scheduled: number;
    sent: number;
    failed: number;
    skipped: number;
    cancelled: number;
    retryingCount: number;
    uncertainCount: number;
    stalePublishingCount: number;
    todayRemaining: number;
    todayPublished: number;
    tomorrowRemaining: number;
    futureClearableCount: number;
  };
  coverageThrough: string | null;
  nextItem: QueueItem | null;
  upcomingItems: QueueItem[];
  todayTimeline: QueueItem[];
  packs: Array<{
    packId: string;
    total: number;
    published: number;
    ready: number;
    failed: number;
    skipped: number;
    cancelled: number;
    rangeStart: string | null;
    rangeEnd: string | null;
    aiContentConfigVersion: number | null;
  }>;
  alerts: Array<{
    level: "info" | "warning" | "critical";
    code: string;
    message: string;
  }>;
  policySkips: Array<{
    id: string;
    packId: string | null;
    skippedPastCount: number;
    skippedDuplicateCount: number;
    createdAt: string;
  }>;
};


type TelegramAiContentSettings = {
  messagesPerDayMin: number;
  messagesPerDayMax: number;
  tone: string;
  messageLength: "short" | "mixed" | "medium";
  emojiPolicy: string;
  ctaStyle: string;
  contentMix: string;
  repetitionRule: string;
  messageTypes: string[];
};

type TelegramAiContentConfig = {
  version: number;
  rawPrompt: string;
  settings: TelegramAiContentSettings;
  updatedAt: string | null;
  updatedBy: string | null;
  persisted: boolean;
};

type JsonPayload = Record<string, unknown>;

const FILTERS: Array<{ id: QueueFilter; label: string }> = [
  { id: "ready", label: "آینده" },
  { id: "today", label: "امروز" },
  { id: "tomorrow", label: "فردا" },
  { id: "date", label: "تاریخ دلخواه" },
  { id: "published", label: "تاریخچهٔ انتشار" },
  { id: "problems", label: "مشکلات" },
  { id: "all", label: "همه" },
];

const SMART_FEATURE_OPTIONS = [
  { id: "moon_phase", label: "فاز و روشنایی ماه" },
  { id: "planetary_states", label: "موقعیت و درجهٔ سیارات" },
  { id: "motion", label: "حرکت، رتروگرید و نزدیک Station" },
  { id: "aspects", label: "جنبه‌های فعال و دقیق" },
  { id: "ingress", label: "ورود سیاره به نشانه" },
  { id: "station", label: "Station و تغییر جهت" },
  { id: "context", label: "کانتکست ۳ روز قبل و بعد" },
] as const;

const SMART_BODY_OPTIONS = [
  ["sun", "خورشید"],
  ["moon", "ماه"],
  ["mercury", "عطارد"],
  ["venus", "زهره"],
  ["mars", "مریخ"],
  ["jupiter", "مشتری"],
  ["saturn", "زحل"],
  ["uranus", "اورانوس"],
  ["neptune", "نپتون"],
  ["pluto", "پلوتو"],
] as const;

const SMART_ASPECT_OPTIONS = [
  ["conjunction", "مقارنه"],
  ["sextile", "سکستایل"],
  ["square", "تربیع"],
  ["trine", "تثلیث"],
  ["opposition", "مقابله"],
] as const;

const SMART_PHASE_OPTIONS = [
  ["applying", "در حال نزدیک‌شدن"],
  ["exact", "دقیق"],
  ["separating", "در حال جداشدن"],
] as const;

function toggleSelection(
  current: string[],
  value: string,
  checked: boolean,
) {
  if (checked) {
    return current.includes(value) ? current : [...current, value];
  }
  return current.filter((item) => item !== value);
}

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

function formatTehranDay(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalizeError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
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

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "پیش‌نویس",
    ready: "آماده",
    publishing: "در حال انتشار",
    published: "منتشرشده",
    failed: "ناموفق",
    skipped: "ردشده",
    cancelled: "لغوشده",
  };
  return labels[status] ?? status;
}


const TELEGRAM_AI_PROMPT_SAMPLE = "برای داده‌های موتور هالیوس، پیام‌های تلگرام فارسی بساز.\n\nلحن و حس:\n- فارسی محاوره‌ای، جوان، زنده و shareable باشد.\n- شوخی و lite-toxic فقط وقتی استفاده شود که واضحاً شوخی است و آزاردهنده نیست.\n- متن‌ها طبیعی باشند و حس کپی‌پیست، قالب ثابت یا تولید ماشینی ندهند.\n- ایموجی و شکل‌هایی مثل :)، :)) و xd طبیعی و متنوع باشند؛ نه در همهٔ پیام‌ها و نه با یک الگوی تکراری.\n\nترکیب محتوا:\n- خبر رویداد، آموزش کوتاه، کوییز/میم، sign-impact و recap را متنوع ترکیب کن.\n- filler نامرتبط فقط برای پرکردن تعداد پیام ممنوع است.\n- تعداد و mix پیام‌ها با داده و ظرفیت واقعی همان بسته هماهنگ باشد.\n- forecast روز و natal spotlight را با هم قاطی نکن.\n\nCTA:\n- اکثریت پیام‌ها بدون CTA باشند.\n- CTA فقط وقتی اضافه شود که ادامهٔ طبیعی همان پیام است.\n- label CTA فارسی، طبیعی و غیرتبلیغاتی باشد.\n- CTA را صرفاً برای اینکه همهٔ پیام‌ها لینک داشته باشند اضافه نکن.\n\nضدتکرار:\n- opening، ریتم، سناریو، CTA و wikiSlug بی‌دلیل تکرار نشوند.\n- اگر فقط اسم سیاره، نشانه یا موضوع عوض شده ولی ساختار متن همان است، متن را بازنویسی کن.\n- پیام‌های نزدیک به هم زاویه، شروع و ریتم متفاوت داشته باشند.\n\nمرز داده و موتور:\n- این prompt فقط لحن، تنوع، تعداد و فرم محتوا را کنترل می‌کند.\n- هیچ دادهٔ نجومی، زمان event، provenance، sourceRef، safety rule یا محدودیت فنی موتور را تغییر نده.\n- چیزی خارج از facts موجود در بسته اختراع نکن.\n- اگر داده برای یک ادعا کافی نیست، آن ادعا را نساز.\n- زمان‌بندی و واقعیت رویدادها را از دادهٔ موتور بگیر، نه از حدس متنی.\n\nخروجی باید با schema و validation بستهٔ تلگرام هالیوس سازگار بماند.";

function normalizeTelegramPromptForEditor(value: unknown) {
  if (typeof value !== "string") return TELEGRAM_AI_PROMPT_SAMPLE;
  const current = value.replace(/\r\n/g, "\n").trim();
  if (!current) return TELEGRAM_AI_PROMPT_SAMPLE;
  const isLegacy =
    current.includes("تعداد و mix پیام‌ها را از تنظیمات محتوایی همین بسته رعایت کن") &&
    current.includes("CTA فقط وقتی طبیعی است اضافه شود") &&
    !current.includes("اکثریت پیام‌ها بدون CTA") &&
    !current.includes("opening، ریتم، سناریو");
  return isLegacy ? TELEGRAM_AI_PROMPT_SAMPLE : value;
}

function normalizeTelegramPromptPayload<T>(payload: T): T {
  if (!payload || typeof payload !== "object") return payload;
  const record = payload as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, "rawPrompt")) return payload;
  return {
    ...record,
    rawPrompt: normalizeTelegramPromptForEditor(record.rawPrompt),
  } as T;
}

function downloadTelegramPromptSample() {
  downloadBlob(
    new Blob([TELEGRAM_AI_PROMPT_SAMPLE], { type: "text/plain;charset=utf-8" }),
    "Halleus-Telegram-AI-Prompt-Sample.txt",
  );
}

export function TelegramAdminPanel({
  token,
  activeSection = "overview",
  onSectionChange = () => undefined,
}: {
  token: string;
  activeSection?: TelegramWorkspaceSection;
  onSectionChange?: (section: TelegramWorkspaceSection) => void;
}) {
  const today = useMemo(() => tehranDateToday(), []);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => addDays(today, 14));
  const [city, setCity] = useState("تهران");
  const [file, setFile] = useState<File | null>(null);
  const [contentConfig, setContentConfig] =
    useState<TelegramAiContentConfig | null>(null);
  const [contentDraft, setContentDraft] =
    useState<TelegramAiContentConfig | null>(null);

  const [filter, setFilter] = useState<QueueFilter>("ready");
  const [chosenDate, setChosenDate] = useState(today);
  const [pageNumber, setPageNumber] = useState(1);
  const [queuePage, setQueuePage] = useState<QueuePage | null>(null);
  const [overviewQueue, setOverviewQueue] = useState<QueuePage | null>(null);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [futureDays, setFutureDays] = useState<FutureDay[]>([]);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [dayQueues, setDayQueues] = useState<Record<string, QueuePage>>({});
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [control, setControl] = useState<ControlSnapshot | null>(null);
  const [controlError, setControlError] = useState("");
  const [detail, setDetail] = useState<QueueDetail | null>(null);

  const [editText, setEditText] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [ctaTarget, setCtaTarget] = useState<"" | Cta["target"]>("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaWikiSlug, setCtaWikiSlug] = useState("");
  const [pauseDate, setPauseDate] = useState(today);
  const [smartFeatures, setSmartFeatures] = useState<string[]>(() =>
    SMART_FEATURE_OPTIONS.map((item) => item.id),
  );
  const [smartBodies, setSmartBodies] = useState<string[]>(() =>
    SMART_BODY_OPTIONS.map(([id]) => id),
  );
  const [smartAspects, setSmartAspects] = useState<string[]>(() =>
    SMART_ASPECT_OPTIONS.map(([id]) => id),
  );
  const [smartPhases, setSmartPhases] = useState<string[]>(() =>
    SMART_PHASE_OPTIONS.map(([id]) => id),
  );
  const [smartAspectLimit, setSmartAspectLimit] =
    useState<"12" | "all">("12");

  const [loading, setLoading] = useState(false);
  const [busyKey, setBusyKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const authHeaders = useMemo(
    () => ({ authorization: `Bearer ${token}` }),
    [token],
  );

  const loadControl = useCallback(async () => {
    if (!token) return;
    const response = await fetch("/api/admin/telegram/operations", {
      cache: "no-store",
      headers: authHeaders,
    });
    const payload = (await response.json()) as JsonPayload;
    if (!response.ok) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : "وضعیت کنترل تلگرام دریافت نشد.",
      );
    }
    setControl(payload.snapshot as ControlSnapshot);
  }, [authHeaders, token]);

  const loadSummary = useCallback(async () => {
    if (!token) return;
    const response = await fetch("/api/admin/telegram/content-pack", {
      cache: "no-store",
      headers: authHeaders,
    });
    const payload = (await response.json()) as JsonPayload;
    if (!response.ok) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : "خلاصهٔ صف تلگرام دریافت نشد.",
      );
    }
    setSummary(payload.summary as QueueSummary);
  }, [authHeaders, token]);

  const loadOverviewQueue = useCallback(async () => {
    if (!token) return;
    const response = await fetch(
      "/api/admin/telegram/queue?view=upcoming&limit=5",
      {
        cache: "no-store",
        headers: authHeaders,
      },
    );
    const payload = (await response.json()) as JsonPayload;
    if (!response.ok) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : "پیش‌نمایش پیام‌های آینده دریافت نشد.",
      );
    }
    setOverviewQueue(payload.page as QueuePage);
  }, [authHeaders, token]);

  const loadFutureDays = useCallback(async () => {
    if (!token) return;
    const response = await fetch(
      "/api/admin/telegram/queue?view=days&limit=120",
      {
        cache: "no-store",
        headers: authHeaders,
      },
    );
    const payload = (await response.json()) as JsonPayload;
    if (!response.ok) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : "فهرست روزهای آینده دریافت نشد.",
      );
    }
    setFutureDays((payload.days as FutureDay[]) ?? []);
  }, [authHeaders, token]);

  const loadContentConfig = useCallback(async () => {
    if (!token) return;
    const response = await fetch("/api/admin/telegram/content-config", {
      cache: "no-store",
      headers: authHeaders,
    });
    const payload = (await response.json()) as JsonPayload;
    if (!response.ok) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : "دستور محتوایی AI دریافت نشد.",
      );
    }
    const next = payload.config as TelegramAiContentConfig;
    setContentConfig(next);
    setContentDraft(next);
  }, [authHeaders, token]);

  const loadQueue = useCallback(async () => {
    if (!token) return;
    const query = new URLSearchParams({
      filter,
      page: String(pageNumber),
      pageSize: "24",
    });
    if (filter === "date") query.set("date", chosenDate);
    const response = await fetch(`/api/admin/telegram/queue?${query.toString()}`, {
      cache: "no-store",
      headers: authHeaders,
    });
    const payload = (await response.json()) as JsonPayload;
    if (!response.ok) {
      throw new Error(
        typeof payload.error === "string" ? payload.error : "صف تلگرام دریافت نشد.",
      );
    }
    setQueuePage(payload.page as QueuePage);
  }, [authHeaders, chosenDate, filter, pageNumber, token]);

  const loadDayQueue = useCallback(
    async (localDate: string) => {
      if (!token) return;
      const query = new URLSearchParams({
        filter: "date",
        date: localDate,
        page: "1",
        pageSize: "120",
      });
      const response = await fetch(
        `/api/admin/telegram/queue?${query.toString()}`,
        {
          cache: "no-store",
          headers: authHeaders,
        },
      );
      const payload = (await response.json()) as JsonPayload;
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "پیام‌های روز دریافت نشد.",
        );
      }
      setDayQueues((current) => ({
        ...current,
        [localDate]: payload.page as QueuePage,
      }));
    },
    [authHeaders, token],
  );

  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([
        loadSummary(),
        loadOverviewQueue(),
        loadQueue(),
        loadFutureDays(),
      ]);
      setError("");
    } catch (refreshError) {
      setError(normalizeError(refreshError, "وضعیت تلگرام دریافت نشد."));
    }

    try {
      await loadControl();
      setControlError("");
    } catch (refreshError) {
      setControl(null);
      setControlError(
        normalizeError(
          refreshError,
          "وضعیت Pause/Resume تلگرام دریافت نشد.",
        ),
      );
    }
  }, [
    loadControl,
    loadFutureDays,
    loadOverviewQueue,
    loadQueue,
    loadSummary,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshAll(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshAll]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadContentConfig().catch((configError) => {
        setError(
          normalizeError(configError, "دستور محتوایی AI دریافت نشد."),
        );
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadContentConfig]);

  async function openDetail(id: string) {
    setBusyKey(`detail:${id}`);
    setError("");
    try {
      const response = await fetch(`/api/admin/telegram/queue?id=${encodeURIComponent(id)}`, {
        cache: "no-store",
        headers: authHeaders,
      });
      const payload = (await response.json()) as JsonPayload;
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "جزئیات پیام دریافت نشد.",
        );
      }
      const next = payload.detail as QueueDetail;
      setDetail(next);
      setEditText(next.editableText);
      setScheduledLocal(next.scheduledLocal);
      setCtaTarget(next.cta?.target ?? "");
      setCtaLabel(next.cta?.label ?? "");
      setCtaWikiSlug(next.cta?.wikiSlug ?? "");
    } catch (detailError) {
      setError(normalizeError(detailError, "جزئیات پیام دریافت نشد."));
    } finally {
      setBusyKey("");
    }
  }

  async function openDetailFromDay(id: string) {
    await openDetail(id);
    window.requestAnimationFrame(() => {
      document
        .getElementById("telegram-message-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function toggleDay(localDate: string) {
    if (expandedDay === localDate) {
      setExpandedDay(null);
      return;
    }
    setExpandedDay(localDate);
    if (!dayQueues[localDate]) {
      try {
        await loadDayQueue(localDate);
      } catch (dayError) {
        setError(normalizeError(dayError, "پیام‌های روز دریافت نشد."));
      }
    }
  }

  async function runOperation(body: Record<string, unknown>, key: string) {
    setBusyKey(key);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/telegram/operations", {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
        },
        body: JSON.stringify(normalizeTelegramPromptPayload(body)),
      });
      const payload = (await response.json()) as JsonPayload;
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string" ? payload.error : "عملیات تلگرام انجام نشد.",
        );
      }
      setMessage("عملیات با موفقیت ثبت شد.");
      const currentId = detail?.id ?? null;
      await refreshAll();
      if (currentId) {
        await openDetail(currentId).catch(() => setDetail(null));
      }
    } catch (operationError) {
      setError(normalizeError(operationError, "عملیات تلگرام انجام نشد."));
    } finally {
      setBusyKey("");
    }
  }

  async function downloadTransitPack() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const query = new URLSearchParams({
        startDate,
        endDate,
        city,
        features: smartFeatures.join(","),
        bodies: smartBodies.join(","),
        aspectKinds: smartAspects.join(","),
        aspectPhases: smartPhases.join(","),
        aspectLimit: smartAspectLimit,
      });
      const response = await fetch(`/api/admin/telegram/transit-pack?${query.toString()}`, {
        cache: "no-store",
        headers: authHeaders,
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
      setMessage("بستهٔ هوشمند ترنزیت آماده و دانلود شد؛ با هر next فقط ۳ روز بعدی نوشته می‌شود.");
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
        headers: authHeaders,
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
        queuedCount?: number;
        skippedPastCount?: number;
        skippedDuplicateCount?: number;
        alreadyImported?: boolean;
      };
      const queued = Number(result.queuedCount ?? 0);
      const past = Number(result.skippedPastCount ?? 0);
      const duplicate = Number(result.skippedDuplicateCount ?? 0);
      if (result.alreadyImported) {
        setMessage(
          `این بسته قبلاً به هالیوس داده شده بود؛ ${duplicate.toLocaleString("fa-IR")} پیام تکراری دوباره وارد صف نشد.`,
        );
      } else {
        setMessage(
          `${queued.toLocaleString("fa-IR")} پیام آینده با زمان‌بندی اصلی وارد صف شد. ${past.toLocaleString("fa-IR")} پیام چون زمان انتشارشان تا لحظهٔ ورود فایل گذشته بود، عمداً وارد صف نشد.`,
        );
      }
      setFile(null);
      await refreshAll();
    } catch (importError) {
      setError(normalizeError(importError, "ورود بستهٔ تلگرام ناموفق بود."));
    } finally {
      setLoading(false);
    }
  }

  async function saveContentConfig() {
    if (!contentDraft) return;
    setBusyKey("content-config");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/telegram/content-config", {
        method: "PUT",
        headers: {
          ...authHeaders,
          "content-type": "application/json",
          "x-halleus-admin-origin": window.location.origin,
        },
        body: JSON.stringify({
          rawPrompt: contentDraft.rawPrompt,
          settings: contentDraft.settings,
        }),
      });
      const payload = (await response.json()) as JsonPayload;
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "ذخیرهٔ دستور محتوایی انجام نشد.",
        );
      }
      const next = payload.config as TelegramAiContentConfig;
      setContentConfig(next);
      setContentDraft(next);
      setMessage(`دستور محتوایی نسخه ${next.version.toLocaleString("fa-IR")} ذخیره شد.`);
    } catch (configError) {
      setError(normalizeError(configError, "ذخیرهٔ دستور محتوایی انجام نشد."));
    } finally {
      setBusyKey("");
    }
  }

  function updateContentSetting<K extends keyof TelegramAiContentSettings>(
    key: K,
    value: TelegramAiContentSettings[K],
  ) {
    setContentDraft((current) =>
      current
        ? {
            ...current,
            settings: {
              ...current.settings,
              [key]: value,
            },
          }
        : current,
    );
  }

  async function clearFutureQueue() {
    const count = summary?.futureClearableCount ?? 0;
    if (count <= 0) {
      setMessage("پیام آیندهٔ قابل لغو در صف نیست.");
      return;
    }
    if (
      !window.confirm(
        `${count.toLocaleString("fa-IR")} پیام آیندهٔ ارسال‌نشده از صف خارج شود؟ تاریخچه و پیام‌های ارسال‌شده پاک نمی‌شوند.`,
      )
    ) {
      return;
    }
    await runOperation(
      {
        action: "clear_future",
        confirm: "CLEAR_FUTURE_QUEUE",
        reason: "پاک‌کردن صف آینده با تأیید صریح ادمین",
      },
      "clear-future",
    );
  }

  async function cancelSelectedDays() {
    const selected = futureDays.filter((day) =>
      selectedDays.includes(day.localDate),
    );
    const count = selected.reduce(
      (sum, day) => sum + day.manageableCount,
      0,
    );
    if (count <= 0) {
      setMessage("در روزهای انتخاب‌شده پیام آیندهٔ قابل لغو نیست.");
      return;
    }
    if (
      !window.confirm(
        `${selected.length.toLocaleString("fa-IR")} روز و ${count.toLocaleString("fa-IR")} پیام آینده از صف خارج شود؟ پیام‌های ارسال‌شده و تاریخچه دست‌نخورده می‌مانند.`,
      )
    ) {
      return;
    }
    await runOperation(
      {
        action: "cancel_days",
        localDates: selected.map((day) => day.localDate),
        confirm: "CANCEL_SELECTED_DAYS",
        reason: "لغو گروهی روزهای انتخاب‌شده از پنل ادمین",
      },
      "cancel-days",
    );
    setSelectedDays([]);
    setExpandedDay(null);
    setDayQueues({});
  }

  const selectedFutureMessageCount = futureDays
    .filter((day) => selectedDays.includes(day.localDate))
    .reduce((sum, day) => sum + day.manageableCount, 0);

  const ctaForSave: Cta | null =
    ctaTarget && ctaLabel.trim()
      ? {
          target: ctaTarget,
          label: ctaLabel.trim(),
          ...(ctaTarget === "wiki" && ctaWikiSlug.trim()
            ? { wikiSlug: ctaWikiSlug.trim() }
            : {}),
        }
      : null;

  return (
    <div className={styles.telegramWorkspace}>
      {error ? <p className={styles.error}>{error}</p> : null}
      {message ? <p className={styles.success}>{message}</p> : null}

      {activeSection === "overview" ? (
        <>
          <section className={styles.telegramOverviewHero}>
            <div>
              <span className={styles.eyebrow}>پوشش واقعی صف · Asia/Tehran</span>
              <h3>
                {summary?.futureCoverageEnd
                  ? `محتوای تلگرام تا ${formatTehranDay(summary.futureCoverageEnd)} آماده است.`
                  : "در صف آینده پوشش آماده‌ای پیدا نشد."}
              </h3>
              <p>
                {control
                  ? control.globalPaused
                    ? "Publisher متوقف است."
                    : "Publisher فعال است."
                  : "پوشش و شمارش از صف اصلی خوانده می‌شود؛ وضعیت Pause/Resume جداگانه است."}
              </p>
            </div>
            <button type="button" disabled={loading} onClick={() => void refreshAll()}>
              تازه‌سازی
            </button>
          </section>

          <section className={styles.telegramStatusStrip} aria-label="خلاصهٔ تلگرام">
            <article><span>آمادهٔ آینده</span><strong>{(summary?.futureScheduledCount ?? 0).toLocaleString("fa-IR")}</strong></article>
            <article><span>باقی‌ماندهٔ امروز</span><strong>{(summary?.todayRemaining ?? 0).toLocaleString("fa-IR")}</strong></article>
            <article><span>فردا</span><strong>{(summary?.tomorrowRemaining ?? 0).toLocaleString("fa-IR")}</strong></article>
            <article data-attention={(summary?.failedCount ?? 0) > 0 ? "true" : "false"}><span>ناموفق</span><strong>{(summary?.failedCount ?? 0).toLocaleString("fa-IR")}</strong></article>
            <article data-attention={(summary?.uncertainCount ?? 0) > 0 ? "true" : "false"}><span>تحویل نامشخص</span><strong>{(summary?.uncertainCount ?? 0).toLocaleString("fa-IR")}</strong></article>
            <article><span>ارسال بعدی</span><strong>{formatDate(summary?.nextScheduledAt ?? null)}</strong></article>
          </section>

          {(control?.alerts.length ?? 0) > 0 ? (
            <section className={styles.telegramAlertStack} aria-label="هشدارهای عملیاتی">
              {control?.alerts.map((alert) => (
                <article key={alert.code} data-level={alert.level}>
                  <strong>{alert.level === "critical" ? "فوری" : alert.level === "warning" ? "بررسی" : "اطلاع"}</strong>
                  <span>{alert.message}</span>
                </article>
              ))}
            </section>
          ) : null}

          <section className={styles.telegramUpcomingSection}>
            <div className={styles.telegramOpsHeader}>
              <div>
                <span className={styles.eyebrow}>پیام‌های بعدی</span>
                <h3>۵ پیام آینده</h3>
              </div>
              <button type="button" onClick={() => onSectionChange("operations")}>رفتن به عملیات</button>
            </div>
            <div className={styles.telegramUpcomingList}>
              {(overviewQueue?.items ?? []).map((item) => (
                <button
                  className={styles.telegramUpcomingRow}
                  type="button"
                  key={item.id}
                  onClick={() => {
                    onSectionChange("operations");
                    void openDetail(item.id);
                  }}
                >
                  <div>
                    <strong>{item.previewText || "متن پیام در preview موجود نیست."}</strong>
                    <small>{item.contentType} · {item.packId ?? "بدون Pack ID"}</small>
                  </div>
                  <time>{formatDate(item.scheduledFor)}</time>
                  <span>{statusLabel(item.status)}</span>
                </button>
              ))}
              {(overviewQueue?.items.length ?? 0) === 0 ? (
                <p className={styles.telegramNote}>پیام آینده‌ای در صف نیست.</p>
              ) : null}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className={styles.telegramOpsSection}>
            <div className={styles.telegramOpsHeader}>
              <div>
                <span className={styles.eyebrow}>کنترل انتشار</span>
                <h3>{control?.globalPaused ? "انتشار سراسری متوقف است" : "Publisher فعال است"}</h3>
                <p>Resume امن، backlog گذشته را یک‌باره ارسال نمی‌کند.</p>
              </div>
              <button
                type="button"
                disabled={!control || Boolean(busyKey)}
                onClick={() =>
                  void runOperation(
                    {
                      action: control?.globalPaused ? "resume_global" : "pause_global",
                      controlUpdatedAt: control?.controlUpdatedAt,
                      reason: control?.globalPaused
                        ? "Resume امن از پنل ادمین"
                        : "Pause سراسری از پنل ادمین",
                    },
                    "global-pause",
                  )
                }
              >
                {control?.globalPaused ? "Resume امن" : "Pause سراسری"}
              </button>
            </div>
            {controlError ? (
              <p className={styles.telegramControlNote}>
                وضعیت Pause/Resume دریافت نشد؛ نمایش پوشش، صف و ویرایش روزها
                مستقل از این کنترل ادامه دارد.
              </p>
            ) : null}
            <div className={styles.telegramDayPause}>
              <input
                type="date"
                value={pauseDate}
                onChange={(event) => setPauseDate(event.target.value)}
              />
              <button
                type="button"
                disabled={Boolean(busyKey)}
                onClick={() =>
                  void runOperation(
                    {
                      action: "pause_day",
                      localDate: pauseDate,
                      reason: "توقف این روز از پنل ادمین",
                    },
                    `pause-day:${pauseDate}`,
                  )
                }
              >
                توقف این روز
              </button>
              {control?.pausedDays.some((item) => item.localDate === pauseDate) ? (
                <button
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() =>
                    void runOperation(
                      {
                        action: "resume_day",
                        localDate: pauseDate,
                        reason: "Resume روز از پنل ادمین",
                      },
                      `resume-day:${pauseDate}`,
                    )
                  }
                >
                  برداشتن توقف
                </button>
              ) : null}
            </div>
          </section>

          <section className={styles.telegramDangerZone}>
            <div>
              <span className={styles.eyebrow}>صف آینده</span>
              <h3>پاک‌کردن پیام‌های آینده</h3>
              <p>
                فقط draft/ready آینده از صف خارج می‌شود. پیام ارسال‌شده، history،
                audit و delivery_uncertain دست‌نخورده می‌ماند.
              </p>
            </div>
            <button
              className={styles.dangerAction}
              type="button"
              disabled={
                Boolean(busyKey) ||
                (summary?.futureClearableCount ?? 0) === 0
              }
              onClick={() => void clearFutureQueue()}
            >
              پاک‌کردن همه پیام‌های آینده
              {" · "}
              {(summary?.futureClearableCount ?? 0).toLocaleString("fa-IR")}
            </button>
          </section>

          <section
            className={styles.telegramDayBrowser}
            data-telegram-day-first="true"
          >
            <div className={styles.telegramOpsHeader}>
              <div>
                <span className={styles.eyebrow}>صف روزمحور</span>
                <h3>پیام‌های آینده بر اساس روز</h3>
                <p>
                  هر روز را باز کن، متن هر پیام را ببین و با دکمهٔ ویرایش
                  وارد همان Message Detail امن شو.
                </p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => void loadFutureDays()}
              >
                تازه‌سازی روزها
              </button>
            </div>

            {selectedDays.length > 0 ? (
              <div className={styles.telegramSelectedDaysBar}>
                <strong>
                  {selectedDays.length.toLocaleString("fa-IR")} روز ·{" "}
                  {selectedFutureMessageCount.toLocaleString("fa-IR")} پیام قابل لغو
                </strong>
                <button
                  className={styles.dangerAction}
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() => void cancelSelectedDays()}
                >
                  حذف روزهای انتخاب‌شده از صف آینده ·{" "}
                  {selectedFutureMessageCount.toLocaleString("fa-IR")} پیام
                </button>
              </div>
            ) : null}

            <div className={styles.telegramDayList}>
              {futureDays.map((day) => {
                const expanded = expandedDay === day.localDate;
                const dayQueue = dayQueues[day.localDate];
                const selected = selectedDays.includes(day.localDate);
                return (
                  <article
                    className={styles.telegramDayCard}
                    data-selected={selected ? "true" : "false"}
                    key={day.localDate}
                  >
                    <div className={styles.telegramDayHeader}>
                      <label
                        className={styles.telegramDayCheckbox}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={day.manageableCount === 0}
                          onChange={(event) =>
                            setSelectedDays((current) =>
                              toggleSelection(
                                current,
                                day.localDate,
                                event.target.checked,
                              ),
                            )
                          }
                        />
                        <span>انتخاب روز</span>
                      </label>
                      <button
                        className={styles.telegramDayExpand}
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => void toggleDay(day.localDate)}
                      >
                        <span>
                          <strong>{formatTehranDay(day.firstScheduledAt)}</strong>
                          <small>
                            {day.total.toLocaleString("fa-IR")} پیام ·{" "}
                            {day.manageableCount.toLocaleString("fa-IR")} قابل
                            مدیریت
                          </small>
                        </span>
                        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                      </button>
                    </div>

                    {expanded ? (
                      <div className={styles.telegramDayMessages}>
                        {(dayQueue?.items ?? []).map((item) => (
                          <article
                            className={styles.telegramDayMessageRow}
                            key={item.id}
                          >
                            <div>
                              <time>{formatDate(item.scheduledFor)}</time>
                              <strong>
                                {item.previewText || "متن preview موجود نیست."}
                              </strong>
                              <small>
                                {statusLabel(item.status)} · {item.contentType}
                                {" · "}
                                {item.packId ?? "بدون Pack ID"}
                              </small>
                            </div>
                            <button
                              className={styles.telegramDayEditButton}
                              type="button"
                              disabled={busyKey === `detail:${item.id}`}
                              onClick={() => void openDetailFromDay(item.id)}
                            >
                              {item.status === "draft" || item.status === "ready"
                                ? "ویرایش"
                                : "جزئیات"}
                            </button>
                          </article>
                        ))}
                        {!dayQueue ? (
                          <p className={styles.telegramNote}>
                            پیام‌های این روز در حال دریافت است.
                          </p>
                        ) : dayQueue.items.length === 0 ? (
                          <p className={styles.telegramNote}>
                            پیامی برای این روز باقی نمانده است.
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {futureDays.length === 0 ? (
                <p className={styles.telegramNote}>
                  روز آینده‌ای با پیام قابل مدیریت در صف نیست.
                </p>
              ) : null}
            </div>
          </section>

          {detail ? (
            <section id="telegram-message-editor" className={styles.telegramMessageEditor}>
              <div className={styles.telegramOpsHeader}>
                <div><span className={styles.eyebrow}>Message Detail</span><h3>ویرایش پیام برنامه‌ریزی‌شده</h3></div>
                <button type="button" onClick={() => setDetail(null)}>بستن</button>
              </div>

              <div className={styles.telegramDetailFacts}>
                <span>وضعیت: <strong>{statusLabel(detail.status)}</strong></span>
                <span>نوع: <strong>{detail.contentType}</strong></span>
                <span>Pack: <strong>{detail.packId ?? "—"}</strong></span>
                <span>Item ID: <strong>{detail.itemId ?? "—"}</strong></span>
                <span>Content Key: <strong>{detail.contentKey}</strong></span>
                <span>تلاش: <strong>{detail.attemptCount.toLocaleString("fa-IR")}</strong></span>
                <span>Retry after: <strong>{formatDate(detail.retryAfter)}</strong></span>
                <span>Telegram message ID: <strong>{detail.telegramMessageId ?? "—"}</strong></span>
              </div>

              {detail.reason ? <p className={styles.telegramReason}>{detail.reason}</p> : null}

              <label className={styles.telegramEditorField}>
                متن پیام
                <textarea
                  value={editText}
                  rows={8}
                  disabled={!detail.canEdit}
                  onChange={(event) => setEditText(event.target.value)}
                />
              </label>

              <div className={styles.telegramCtaEditor}>
                <label>
                  CTA target
                  <select
                    value={ctaTarget}
                    disabled={!detail.canEdit}
                    onChange={(event) => setCtaTarget(event.target.value as "" | Cta["target"])}
                  >
                    <option value="">بدون CTA</option>
                    <option value="sky">Sky</option>
                    <option value="chart">Chart</option>
                    <option value="compare">Compare</option>
                    <option value="wiki">Wiki</option>
                  </select>
                </label>
                <label>
                  برچسب CTA
                  <input
                    value={ctaLabel}
                    disabled={!detail.canEdit || !ctaTarget}
                    onChange={(event) => setCtaLabel(event.target.value)}
                  />
                </label>
                {ctaTarget === "wiki" ? (
                  <label>
                    Wiki slug
                    <input
                      value={ctaWikiSlug}
                      disabled={!detail.canEdit}
                      onChange={(event) => setCtaWikiSlug(event.target.value)}
                    />
                  </label>
                ) : null}
              </div>

              <div className={styles.telegramItemActions}>
                <button
                  type="button"
                  disabled={!detail.canEdit || Boolean(busyKey)}
                  onClick={() =>
                    void runOperation(
                      {
                        action: "edit",
                        queueId: detail.id,
                        expectedUpdatedAt: detail.updatedAt,
                        text: editText,
                        cta: ctaForSave,
                        reason: "ویرایش متن/CTA از پنل ادمین",
                      },
                      `edit:${detail.id}`,
                    )
                  }
                >
                  ذخیرهٔ متن و CTA
                </button>
              </div>

              <div className={styles.telegramScheduleEditor}>
                <label>
                  زمان جدید در Asia/Tehran
                  <input
                    type="datetime-local"
                    value={scheduledLocal}
                    disabled={!detail.canReschedule}
                    onChange={(event) => setScheduledLocal(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={!detail.canReschedule || Boolean(busyKey)}
                  onClick={() =>
                    void runOperation(
                      {
                        action: "reschedule",
                        queueId: detail.id,
                        expectedUpdatedAt: detail.updatedAt,
                        scheduledLocal,
                        reason: "تغییر زمان از پنل ادمین",
                      },
                      `reschedule:${detail.id}`,
                    )
                  }
                >
                  ثبت زمان جدید
                </button>
              </div>

              <div className={styles.telegramItemActions}>
                {detail.canRetry ? (
                  <button
                    type="button"
                    disabled={Boolean(busyKey)}
                    onClick={() =>
                      void runOperation(
                        {
                          action: "retry",
                          queueId: detail.id,
                          expectedUpdatedAt: detail.updatedAt,
                          reason: "Retry امن از پنل ادمین",
                        },
                        `retry:${detail.id}`,
                      )
                    }
                  >
                    تلاش دوبارهٔ امن
                  </button>
                ) : null}
                {detail.canCancel ? (
                  <button
                    className={styles.dangerAction}
                    type="button"
                    disabled={Boolean(busyKey)}
                    onClick={() =>
                      void runOperation(
                        {
                          action: "cancel",
                          queueId: detail.id,
                          expectedUpdatedAt: detail.updatedAt,
                          reason: "لغو پیام آینده از پنل ادمین",
                        },
                        `cancel:${detail.id}`,
                      )
                    }
                  >
                    لغو بدون حذف
                  </button>
                ) : null}
                {detail.canSendNow ? (
                  <button
                    type="button"
                    disabled={Boolean(busyKey)}
                    onClick={() => {
                      if (!window.confirm("این پیام همین حالا از مسیر اصلی publisher ارسال شود؟")) return;
                      void runOperation(
                        {
                          action: "send_now",
                          queueId: detail.id,
                          expectedUpdatedAt: detail.updatedAt,
                          confirm: "SEND_NOW",
                          reason: "Send Now با تأیید صریح ادمین",
                        },
                        `send-now:${detail.id}`,
                      );
                    }}
                  >
                    Send Now
                  </button>
                ) : null}
              </div>

              <details className={styles.telegramExactPreview} open>
                <summary>پیش‌نمایش دقیق payload ذخیره‌شده</summary>
                <pre>{detail.renderedPayload.text}</pre>
              </details>

              <details className={styles.telegramExactPreview}>
                <summary>Source provenance برای دیباگ</summary>
                <pre>
                  {detail.sourceProvenance
                    ? JSON.stringify(detail.sourceProvenance, null, 2)
                    : "بدون provenance"}
                </pre>
              </details>
            </section>
          ) : null}



          <section className={[styles.telegramPromptEditor, styles.telegramPromptCard].join(" ")}>
            <div className={styles.telegramOpsHeader}>
              <div>
                <span className={styles.eyebrow}>AI Content Direction</span>
                <h3>دستور محتوایی AI</h3>
                <p>
                  فقط لحن، تعداد و فرم پیام‌ها editable است. دادهٔ موتور هالیوس و
                  provenance قابل تغییر نیست.
                </p>
              </div>
              <span>
                نسخه {contentConfig?.version.toLocaleString("fa-IR") ?? "—"}
                {contentConfig?.persisted === false ? " · پیش‌فرض محلی" : ""}
              </span>
            </div>

            <details className={styles.telegramEngineReadonly}>
              <summary>دادهٔ موتور هالیوس · فقط خواندنی</summary>
              <p>
                ترنزیت‌ها، تاریخ و زمان event، sourceRef، sourceProvenance،
                contentFacts و محدودیت‌های safety از موتور می‌آیند و این فرم حق
                تغییرشان را ندارد.
              </p>
            </details>

            {contentDraft ? (
              <>
                <div className={styles.telegramPromptSettings}>









                </div>


        <div
          className={styles.telegramPromptHeader}
          data-telegram-prompt-product-header="true"
        >
          <div>
            <span className={styles.telegramPromptEyebrow}>دستور محتوایی AI</span>
            <h3>پرامپت تولید محتوای تلگرام</h3>
            <p>همهٔ قوانین لحن، ایموجی، ترکیب محتوا، CTA و ضدتکرار فقط از همین متن می‌آیند.</p>
          </div>
          <span className={styles.telegramPromptSingleSource}>یک منبع واحد</span>
        </div>
<label className={[styles.telegramRawPrompt, styles.telegramPromptEditor].join(" ")} data-telegram-single-prompt-editor="batch1-final-correction-r2">
                  پرامپت کامل تولید محتوای تلگرام
                  <textarea
                    rows={18}
                    value={normalizeTelegramPromptForEditor(contentDraft.rawPrompt)}
                    onChange={(event) =>
                      setContentDraft((current) =>
                        current ? { ...current, rawPrompt: event.target.value } : current,
                      )
                    }
                    className={styles.telegramPromptTextarea}
                      dir="rtl"
                    />
                </label>
          <div data-telegram-prompt-sample-download="true" className={styles.telegramPromptRecovery}>
            <p>
              اگر متن پاک شد، نسخهٔ کامل پیشنهادی هالیوس را از همین‌جا دانلود کن.
            </p>
            <button type="button" onClick={downloadTelegramPromptSample} className={styles.telegramPromptSecondary}>
              دانلود نمونه پرامپت
            </button>
          </div>


                <div className={styles.telegramItemActions}>
                  <button
                    className={[styles.primaryAction, styles.telegramPromptPrimary].join(" ")}
                    type="button"
                    disabled={busyKey === "content-config"}
                    onClick={() => void saveContentConfig()}
                  >
                    ذخیره دستور محتوایی
                  </button>
                  <button
                    type="button"
                    disabled={!contentConfig}
                    onClick={() => setContentDraft(contentConfig)}
                   className={styles.telegramPromptCancel}>
                    لغو تغییرات
                  </button>
                </div>
              </>
            ) : (
              <p className={styles.telegramNote}>دستور محتوایی در حال دریافت است.</p>
            )}
          </section>

          <section className={styles.telegramGeneratorGrid}>
            <article className={styles.telegramGeneratorCard}>
              <span className={styles.telegramStep}>۱</span>
              <h3>ساخت بستهٔ هوشمند</h3>
              <p>ترنزیت واقعی برای چت محتوا؛ هر next فقط ۳ روز بعدی.</p>
              <details
                className={styles.telegramSmartPicker}
                data-telegram-smart-picker="public-sky-only"
                open
              >
                <summary>داده‌های عمومی موتور در این بسته</summary>
                <p>
                  فقط داده‌های عمومی آسمان. هیچ دادهٔ شخصی یا ناتال وارد
                  Smart Pack نمی‌شود.
                </p>

                <div className={styles.telegramSmartOptionGrid}>
                  {SMART_FEATURE_OPTIONS.map((option) => (
                    <label key={option.id}>
                      <input
                        type="checkbox"
                        checked={smartFeatures.includes(option.id)}
                        onChange={(event) =>
                          setSmartFeatures((current) =>
                            toggleSelection(
                              current,
                              option.id,
                              event.target.checked,
                            ),
                          )
                        }
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>

                <details className={styles.telegramSmartSubgroup}>
                  <summary>سیارات و اجرام</summary>
                  <div className={styles.telegramSmartOptionGrid}>
                    {SMART_BODY_OPTIONS.map(([id, label]) => (
                      <label key={id}>
                        <input
                          type="checkbox"
                          checked={smartBodies.includes(id)}
                          onChange={(event) =>
                            setSmartBodies((current) =>
                              toggleSelection(
                                current,
                                id,
                                event.target.checked,
                              ),
                            )
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </details>

                <details className={styles.telegramSmartSubgroup}>
                  <summary>جنبه‌ها و فاز آن‌ها</summary>
                  <div className={styles.telegramSmartOptionGrid}>
                    {SMART_ASPECT_OPTIONS.map(([id, label]) => (
                      <label key={id}>
                        <input
                          type="checkbox"
                          checked={smartAspects.includes(id)}
                          onChange={(event) =>
                            setSmartAspects((current) =>
                              toggleSelection(
                                current,
                                id,
                                event.target.checked,
                              ),
                            )
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                    {SMART_PHASE_OPTIONS.map(([id, label]) => (
                      <label key={id}>
                        <input
                          type="checkbox"
                          checked={smartPhases.includes(id)}
                          onChange={(event) =>
                            setSmartPhases((current) =>
                              toggleSelection(
                                current,
                                id,
                                event.target.checked,
                              ),
                            )
                          }
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                  <label className={styles.telegramSmartAspectLimit}>
                    تعداد aspectهای روز
                    <select
                      value={smartAspectLimit}
                      onChange={(event) =>
                        setSmartAspectLimit(
                          event.target.value === "all" ? "all" : "12",
                        )
                      }
                    >
                      <option value="12">۱۲ مورد مهم</option>
                      <option value="all">همهٔ aspectهای موتور</option>
                    </select>
                  </label>
                </details>
              </details>

              <div className={styles.telegramRangeGrid}>
                <label>
                  شروع
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </label>
                <label>
                  پایان
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </label>
              </div>
              <label className={styles.telegramCityField}>
                شهر مرجع
                <input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="تهران"
                />
              </label>
              <button className={styles.primaryAction} type="button" disabled={loading} onClick={() => void downloadTransitPack()}>
                ساخت و دانلود بستهٔ هوشمند
              </button>
            </article>

            <article className={styles.telegramGeneratorCard}>
              <span className={styles.telegramStep}>۲</span>
              <h3>ورود بستهٔ تجمیعی محتوا</h3>
              <p>پیام تکراری، هم‌پوشانیِ نسخهٔ متفاوت و پیام‌های past-due با guard اصلی کنترل می‌شوند.</p>
              <label className={styles.telegramFileField}>
                <span>{file ? file.name : "انتخاب فایل JSON"}</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
              <button className={styles.primaryAction} type="button" disabled={loading || !file} onClick={() => void importContentPack()}>
                اعتبارسنجی، جلوگیری از تکرار و زمان‌بندی بسته
              </button>
            </article>
          </section>

          <details className={styles.telegramAdvancedTools}>
            <summary>
              <span>ابزارهای پیشرفته صف و خطاها</span>
              <small>Today Timeline · Queue Browser · Failure Center · Pack Progress</small>
            </summary>
            <div className={styles.telegramAdvancedToolsBody}>
          <section className={styles.telegramOpsSection}>
            <div className={styles.telegramOpsHeader}>
              <div><span className={styles.eyebrow}>Today Timeline · Asia/Tehran</span><h3>امروز دقیقاً چه اتفاقی می‌افتد؟</h3></div>
            </div>
            <div className={styles.telegramTimeline}>
              {(control?.todayTimeline ?? []).map((item) => (
                <button type="button" key={item.id} onClick={() => void openDetail(item.id)}>
                  <time>{formatDate(item.scheduledFor)}</time>
                  <span>{statusLabel(item.status)}</span>
                  <span>{item.previewText || item.contentType}</span>
                </button>
              ))}
              {(control?.todayTimeline.length ?? 0) === 0 ? <p className={styles.telegramNote}>برای امروز پیامی در صف نیست.</p> : null}
            </div>
          </section>

          <section className={styles.telegramOpsSection}>
            <div className={styles.telegramOpsHeader}>
              <div><span className={styles.eyebrow}>Queue Browser</span><h3>صف، تاریخچه و Failure Center</h3></div>
              <button type="button" disabled={loading} onClick={() => void refreshAll()}>تازه‌سازی</button>
            </div>
            <div className={styles.telegramFilterBar}>
              {FILTERS.map((item) => (
                <button
                  type="button"
                  data-active={filter === item.id ? "true" : "false"}
                  key={item.id}
                  onClick={() => {
                    setFilter(item.id);
                    setPageNumber(1);
                  }}
                >
                  {item.label}
                </button>
              ))}
              {filter === "date" ? (
                <input
                  type="date"
                  value={chosenDate}
                  onChange={(event) => {
                    setChosenDate(event.target.value);
                    setPageNumber(1);
                  }}
                />
              ) : null}
            </div>

            <div className={styles.telegramQueueList}>
              {(queuePage?.items ?? []).map((item) => (
                <button className={styles.telegramQueueRow} type="button" key={item.id} onClick={() => void openDetail(item.id)}>
                  <div className={styles.telegramQueueText}>
                    <strong>{item.previewText || "متن preview موجود نیست."}</strong>
                    <small>{item.contentType} · {item.packId ?? "بدون Pack ID"}</small>
                  </div>
                  <time>{formatDate(item.scheduledFor)}</time>
                  <span>{statusLabel(item.status)}</span>
                  <span>تلاش {item.attemptCount.toLocaleString("fa-IR")}</span>
                  {item.reason ? <small>{item.reason}</small> : null}
                </button>
              ))}
              {(queuePage?.items.length ?? 0) === 0 ? <p className={styles.telegramNote}>موردی برای این فیلتر نیست.</p> : null}
            </div>

            <div className={styles.telegramPager}>
              <button type="button" disabled={(queuePage?.page ?? 1) <= 1} onClick={() => setPageNumber((value) => Math.max(1, value - 1))}>قبلی</button>
              <span>صفحه {(queuePage?.page ?? 1).toLocaleString("fa-IR")} از {(queuePage?.totalPages ?? 1).toLocaleString("fa-IR")} · {(queuePage?.total ?? 0).toLocaleString("fa-IR")} پیام</span>
              <button type="button" disabled={(queuePage?.page ?? 1) >= (queuePage?.totalPages ?? 1)} onClick={() => setPageNumber((value) => value + 1)}>بعدی</button>
            </div>
          </section>

          <section className={styles.telegramOpsSection}>
            <div className={styles.telegramOpsHeader}>
              <div><span className={styles.eyebrow}>Pack Progress</span><h3>پوشش و پیشرفت بسته‌ها</h3></div>
            </div>
            <div className={styles.telegramPackGrid}>
              {(control?.packs ?? []).map((pack) => (
                <article key={pack.packId}>
                  <strong>{pack.packId}</strong>
                  <span>{formatDate(pack.rangeStart)} تا {formatDate(pack.rangeEnd)}</span>
                  <p>
                    کل {pack.total.toLocaleString("fa-IR")} · منتشر {pack.published.toLocaleString("fa-IR")}
                    {" "}· آماده {pack.ready.toLocaleString("fa-IR")} · خطا {pack.failed.toLocaleString("fa-IR")}
                    {" "}· رد/لغو {(pack.skipped + pack.cancelled).toLocaleString("fa-IR")}
                  </p>
                  <small>
                    دستور محتوایی:{" "}
                    {pack.aiContentConfigVersion
                      ? `v${pack.aiContentConfigVersion.toLocaleString("fa-IR")}`
                      : "legacy / نامشخص"}
                  </small>
                </article>
              ))}
            </div>
          </section>

          {(control?.policySkips.length ?? 0) > 0 ? (
            <details className={styles.telegramHealth}>
              <summary>Policy / Import skips</summary>
              <div className={styles.telegramEventList}>
                {control?.policySkips.map((skip) => (
                  <article className={styles.telegramEventRow} key={skip.id}>
                    <strong>{skip.packId ?? "Content Pack"}</strong>
                    <span>
                      زمان گذشته: {skip.skippedPastCount.toLocaleString("fa-IR")} · duplicate:{" "}
                      {skip.skippedDuplicateCount.toLocaleString("fa-IR")}
                    </span>
                    <time>{formatDate(skip.createdAt)}</time>
                  </article>
                ))}
              </div>
            </details>
          ) : null}

            </div>
          </details>
        </>
      )}
    </div>
  );
}
