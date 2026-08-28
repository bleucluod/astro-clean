"use client";

// HALLEUS_SEO_COMMAND_CENTER_R1
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AdminSessionPayload } from "@/lib/admin/admin-types";
import type {
  WikiIndexabilityArticleStatus,
  WikiIndexabilityObservabilityState,
} from "@/lib/wiki/wiki-indexability-observability-types";
import type {
  WikiLinkAdminState,
  WikiLinkAdminSuggestion,
  WikiLinkGraphArticle,
  WikiLinkGraphEdge,
  WikiLinkScanRules,
} from "@/lib/wiki/wiki-link-admin-types";
import styles from "./admin-console.module.css";

export type SeoWorkspaceSection =
  | "overview"
  | "readiness"
  | "links"
  | "opportunities"
  | "export"
  | "search-console"
  | "settings";

type SeoStatusFilter = "all" | "published" | "scheduled" | "draft";
type SeoIssueFilter =
  | "all"
  | "problem"
  | "missing"
  | "unpublished"
  | "noindex"
  | "noIncoming";
type SeoSort = "problem" | "incomingAsc" | "outgoingDesc" | "scheduled" | "title";
type SeoExportKind = "all" | "problems" | "noIncoming" | "linkMap";
type SearchConsoleRow = {
  page: string;
  path: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
type SearchConsoleInsight = {
  key: string;
  title: string;
  metric: string;
  reason: string;
  action: string;
  tone: "danger" | "attention" | "positive";
  stableId?: string;
};
type SearchConsoleFileParseResult = {
  rows: SearchConsoleRow[];
  sourceName: string;
};
type ZipCsvEntry = {
  name: string;
  text: string;
};
type BrowserDecompressionStreamConstructor = new (format: string) => TransformStream<Uint8Array, Uint8Array>;

type Props = {
  token: string;
  session: AdminSessionPayload;
  activeSection: SeoWorkspaceSection;
  onSectionChange: (section: SeoWorkspaceSection) => void;
};

const CATEGORY_LABELS: Record<string, string> = {
  foundations: "آموزش آسترولوژی از صفر",
  accuracy: "دقت ساعت و شهر تولد",
  planets: "سیاره‌ها و نقاط چارت تولد",
  houses: "خانه‌ها و زاویه‌های چارت تولد",
  aspects: "جنبه‌ها و الگوهای چارت تولد",
  transits: "ترنزیت سیارات",
  systems: "انواع و نظام‌های آسترولوژی",
};

const NUMERIC_RULE_FIELDS = [
  ["outgoingMin", "حداقل لینک خروجی", "حداقل تعداد لینک‌های متنی خروجی که برای هر مقاله انتظار داری."],
  ["outgoingMax", "حداکثر لینک خروجی", "سقف لینک‌های متنی خروجی پیش از اینکه صفحه بیش‌ازحد شلوغ شود."],
  ["incomingMin", "حداقل لینک ورودی", "حداقل لینک متنی که بهتر است از مقاله‌های دیگر به این صفحه برسد."],
  ["incomingTarget", "هدف لینک ورودی", "هدف پیشنهادی هالیوس برای تقویت کشف و ارتباط موضوعی مقاله‌ها."],
  ["incomingMax", "حداکثر لینک ورودی", "سقف کنترلی برای تشخیص صفحات با تمرکز غیرعادی لینک‌ها."],
  ["categoryLinkMax", "حداکثر لینک دسته‌بندی", "بیشترین تعداد لینک دسته‌بندی که اسکن برای یک مقاله می‌پذیرد."],
  ["anchorMinChars", "حداقل طول متن لینک", "متن لینک خیلی کوتاه معمولاً زمینه کافی برای مقصد نمی‌دهد."],
  ["anchorMaxChars", "حداکثر طول متن لینک", "متن لینک خیلی طولانی خوانایی پاراگراف را ضعیف می‌کند."],
] as const satisfies readonly [
  keyof Pick<
    WikiLinkScanRules,
    | "outgoingMin"
    | "outgoingMax"
    | "incomingMin"
    | "incomingTarget"
    | "incomingMax"
    | "categoryLinkMax"
    | "anchorMinChars"
    | "anchorMaxChars"
  >,
  string,
  string,
][];

const EMPTY_RULES: WikiLinkScanRules = {
  outgoingMin: 0,
  outgoingMax: 0,
  incomingMin: 0,
  incomingTarget: 3,
  incomingMax: 0,
  breadcrumbRequired: true,
  categoryLinkMax: 1,
  coreMax: 0,
  coreRoutes: ["/", "/chart", "/compare", "/sky", "/wiki"],
  anchorMinChars: 3,
  anchorMaxChars: 120,
  oneWordCoreAllowlist: ["هالیوس"],
  excludedStableIds: [],
  prohibitSelf: true,
  prohibitDuplicate: true,
  prohibitUnpublishedTargets: true,
};

function formatNumber(value: number) {
  return value.toLocaleString("fa-IR");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Tehran",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function emitAdminNotice(detail: {
  tone?: "info" | "success" | "error";
  title: string;
  message?: string;
  durationMs?: number;
}) {
  window.dispatchEvent(new CustomEvent("halleus-admin-notification", { detail }));
}

function parseAdminResponseError(status: number, text: string) {
  const cleanText = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const suffix = cleanText ? ` جزئیات کوتاه: ${cleanText.slice(0, 140)}` : "";
  if (status === 401 || status === 403) {
    return `نشست ادمین معتبر نیست یا دسترسی این عملیات را نداری. صفحه را رفرش کن و دوباره وارد شو.${suffix}`;
  }
  return `پاسخ سرور قابل خواندن نبود. کد HTTP: ${status}.${suffix}`;
}

function graphStatus(article: WikiLinkGraphArticle): Exclude<SeoStatusFilter, "all"> {
  if (article.publicReady) return "published";
  if (article.status === "scheduled" || Boolean(article.scheduledFor)) return "scheduled";
  return "draft";
}

function graphStatusLabel(article: WikiLinkGraphArticle) {
  const status = graphStatus(article);
  if (status === "published") return "منتشر";
  if (status === "scheduled") return "زمان‌بندی";
  return "پیش‌نویس";
}

function targetStateLabel(edge: WikiLinkGraphEdge) {
  const labels: Record<WikiLinkGraphEdge["targetState"], string> = {
    published: "منتشر",
    scheduled: "زمان‌بندی",
    draft: "پیش‌نویس",
    noindex: "خارج از ایندکس",
    missing: "پیدا نشد",
  };
  return labels[edge.targetState];
}

function articleIssueLabel(article: WikiLinkGraphArticle) {
  if (article.unresolvedOutgoingCount > 0) {
    return `${formatNumber(article.unresolvedOutgoingCount)} مقصد لینک باید اصلاح شود`;
  }
  if (article.bodyIncomingCount === 0 && article.bodyPlannedIncomingCount > 0) {
    return "فقط لینک ورودی برنامه‌ریزی‌شده دارد";
  }
  if (article.bodyIncomingCount === 0) return "لینک ورودی زنده ندارد";
  return "مشکل فوری ندارد";
}

function readinessReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    "Body links point to unpublished or missing Wiki targets.":
      "در متن مقاله به صفحه‌ای لینک داده شده که هنوز منتشر نشده یا پیدا نمی‌شود.",
    "Article is not public-ready.": "مقاله هنوز برای نمایش عمومی آماده نیست.",
    "Article is excluded from sitemap.": "این صفحه داخل سایت‌مپ قرار نمی‌گیرد.",
    "Published row is not technically public-ready.":
      "مقاله منتشر شده، اما وضعیت فنی انتشار عمومی کامل نیست.",
    "Article has no incoming body links.":
      "هیچ مقاله‌ای از داخل متن به این صفحه لینک نداده است.",
  };
  return labels[reason] ?? reason;
}

function readinessAction(article: WikiIndexabilityArticleStatus) {
  if (article.unresolvedInlineTargets.length > 0) {
    return "مقصدهای لینک داخل متن را به صفحه منتشرشده و قابل ایندکس تغییر بده.";
  }
  if (article.incoming.active === 0) {
    return "از یک یا چند مقاله مرتبط، لینک متنی طبیعی به این صفحه بساز.";
  }
  if (!article.publicReady) {
    return "وضعیت انتشار، indexable و زمان انتشار مقاله را بررسی کن.";
  }
  if (!article.sitemapEligible) {
    return "شرایط ورود این صفحه به سایت‌مپ را بررسی کن.";
  }
  return "دلیل هشدار را بررسی و سپس اسکن را دوباره اجرا کن.";
}

function suggestionStatusLabel(value: string) {
  const labels: Record<string, string> = {
    suggested: "پیشنهادشده",
    edited: "ویرایش‌شده",
    approved: "تاییدشده",
    rejected: "ردشده",
    conflict: "تعارض",
    applied: "اعمال‌شده",
    verified: "تایید نهایی",
    rolled_back: "بازگردانده‌شده",
  };
  return labels[value] ?? value;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/^\uFEFF/, "").replace(/\s+/g, " ");
}

function findCsvColumn(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeCsvHeader);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeCsvHeader(header)));
}

function hasSearchConsolePageHeaders(text: string) {
  const rows = parseCsv(text);
  return rows.some((row) => {
    const headers = row.map(normalizeCsvHeader);
    return headers.some((header) => ["top pages", "page", "pages", "landing page", "url", "صفحه"].includes(header)) &&
      headers.some((header) => ["clicks", "کلیک", "کلیک‌ها"].includes(header)) &&
      headers.some((header) => ["impressions", "impression", "نمایش", "نمایش‌ها"].includes(header));
  });
}

function parseMetric(value: string) {
  const normalized = value.replace("%", "").replaceAll(",", "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCtr(value: string) {
  const parsed = parseMetric(value);
  return value.includes("%") || parsed > 1 ? parsed / 100 : parsed;
}

function normalizePagePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).pathname.replace(/\/$/, "") || "/";
  } catch {
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return path.replace(/\/$/, "") || "/";
  }
}

function parseSearchConsoleCsv(text: string): SearchConsoleRow[] {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeCsvHeader);
    return headers.some((header) => ["clicks", "کلیک", "کلیک‌ها"].includes(header)) &&
      headers.some((header) => ["impressions", "impression", "نمایش", "نمایش‌ها"].includes(header));
  });
  if (headerIndex < 0) throw new Error("ستون‌های Clicks و Impressions در CSV پیدا نشد.");

  const headers = rows[headerIndex];
  const pageIndex = findCsvColumn(headers, ["top pages", "page", "pages", "landing page", "url", "صفحه"]);
  const clicksIndex = findCsvColumn(headers, ["clicks", "کلیک", "کلیک‌ها"]);
  const impressionsIndex = findCsvColumn(headers, ["impressions", "impression", "نمایش", "نمایش‌ها"]);
  const ctrIndex = findCsvColumn(headers, ["ctr", "میانگین ctr", "نرخ کلیک"]);
  const positionIndex = findCsvColumn(headers, ["position", "average position", "avg. position", "میانگین جایگاه", "رتبه"]);

  if (pageIndex < 0 || clicksIndex < 0 || impressionsIndex < 0) {
    throw new Error("CSV باید حداقل ستون صفحه، Clicks و Impressions داشته باشد.");
  }

  return rows
    .slice(headerIndex + 1)
    .map((row) => ({
      page: row[pageIndex] ?? "",
      path: normalizePagePath(row[pageIndex] ?? ""),
      clicks: parseMetric(row[clicksIndex] ?? ""),
      impressions: parseMetric(row[impressionsIndex] ?? ""),
      ctr: ctrIndex >= 0 ? parseCtr(row[ctrIndex] ?? "") : 0,
      position: positionIndex >= 0 ? parseMetric(row[positionIndex] ?? "") : 0,
    }))
    .filter((row) => row.path.startsWith("/wiki/") && row.impressions > 0);
}

function isZipUpload(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".zip") || file.type === "application/zip" || file.type === "application/x-zip-compressed";
}

function readUint16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function readUint32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

function findZipEndOfCentralDirectory(view: DataView) {
  const minOffset = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (readUint32(view, offset) === 0x06054b50) return offset;
  }
  return -1;
}

function decodeZipName(bytes: Uint8Array) {
  return new TextDecoder("utf-8").decode(bytes);
}

async function inflateZipBytes(bytes: Uint8Array, entryName: string) {
  const globalScope = globalThis as typeof globalThis & {
    DecompressionStream?: BrowserDecompressionStreamConstructor;
  };
  const DecompressionStreamCtor = globalScope.DecompressionStream;
  if (!DecompressionStreamCtor) {
    throw new Error(`مرورگر نمی‌تواند فایل فشرده ${entryName} را باز کند؛ Pages.csv را جدا آپلود کن.`);
  }
  const payload = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(payload).set(bytes);
  const stream = new Blob([payload]).stream().pipeThrough(new DecompressionStreamCtor("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function extractSearchConsoleCsvEntriesFromZip(buffer: ArrayBuffer): Promise<ZipCsvEntry[]> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const eocdOffset = findZipEndOfCentralDirectory(view);
  if (eocdOffset < 0) throw new Error("فایل ZIP معتبر نیست.");

  const entryCount = readUint16(view, eocdOffset + 10);
  let cursor = readUint32(view, eocdOffset + 16);
  const entries: ZipCsvEntry[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (readUint32(view, cursor) !== 0x02014b50) break;
    const compressionMethod = readUint16(view, cursor + 10);
    const compressedSize = readUint32(view, cursor + 20);
    const fileNameLength = readUint16(view, cursor + 28);
    const extraLength = readUint16(view, cursor + 30);
    const commentLength = readUint16(view, cursor + 32);
    const localHeaderOffset = readUint32(view, cursor + 42);
    const fileName = decodeZipName(bytes.slice(cursor + 46, cursor + 46 + fileNameLength));
    cursor += 46 + fileNameLength + extraLength + commentLength;

    if (!fileName.toLowerCase().endsWith(".csv")) continue;
    if (readUint32(view, localHeaderOffset) !== 0x04034b50) continue;
    const localNameLength = readUint16(view, localHeaderOffset + 26);
    const localExtraLength = readUint16(view, localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedBytes = bytes.slice(dataOffset, dataOffset + compressedSize);
    let csvBytes: Uint8Array;
    if (compressionMethod === 0) {
      csvBytes = compressedBytes;
    } else if (compressionMethod === 8) {
      csvBytes = await inflateZipBytes(compressedBytes, fileName);
    } else {
      continue;
    }
    entries.push({ name: fileName, text: new TextDecoder("utf-8").decode(csvBytes) });
  }

  return entries;
}

async function parseSearchConsoleUpload(file: File): Promise<SearchConsoleFileParseResult> {
  if (!isZipUpload(file)) {
    return { rows: parseSearchConsoleCsv(await file.text()), sourceName: file.name };
  }

  const entries = await extractSearchConsoleCsvEntriesFromZip(await file.arrayBuffer());
  const candidates = entries.sort((left, right) => {
    const leftScore = left.name.toLowerCase().endsWith("pages.csv") ? 0 : hasSearchConsolePageHeaders(left.text) ? 1 : 2;
    const rightScore = right.name.toLowerCase().endsWith("pages.csv") ? 0 : hasSearchConsolePageHeaders(right.text) ? 1 : 2;
    return leftScore - rightScore || left.name.localeCompare(right.name);
  });

  for (const entry of candidates) {
    try {
      return {
        rows: parseSearchConsoleCsv(entry.text),
        sourceName: `${file.name} / ${entry.name}`,
      };
    } catch {
      // Keep trying other CSV files in the Search Console export.
    }
  }

  throw new Error("داخل ZIP، فایل Pages.csv قابل خواندن Search Console پیدا نشد.");
}

function articlePath(article: WikiLinkGraphArticle) {
  return `/wiki/${article.slug}`;
}

export function SeoAdminPanel({ token, session, activeSection, onSectionChange }: Props) {
  const [state, setState] = useState<WikiLinkAdminState | null>(null);
  const [indexability, setIndexability] = useState<WikiIndexabilityObservabilityState | null>(null);
  const [ruleDraft, setRuleDraft] = useState<WikiLinkScanRules>(EMPTY_RULES);
  const [loading, setLoading] = useState(true);
  const [selectedStableId, setSelectedStableId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SeoStatusFilter>("all");
  const [issueFilter, setIssueFilter] = useState<SeoIssueFilter>("problem");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<SeoSort>("problem");
  const [searchConsoleRows, setSearchConsoleRows] = useState<SearchConsoleRow[]>([]);
  const [searchConsoleFileName, setSearchConsoleFileName] = useState("");

  const canDraft = session.capabilities.includes("wiki.draft.write");
  const canPublish = session.capabilities.includes("wiki.publish.write");
  const canSettings = session.capabilities.includes("wiki.settings.write");

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      headers.set("authorization", `Bearer ${token}`);
      if (init?.body) headers.set("content-type", "application/json");
      const response = await fetch(path, { ...init, cache: "no-store", headers });
      const contentType = response.headers.get("content-type") ?? "";
      let payload: Record<string, unknown> | null = null;
      if (contentType.includes("application/json")) {
        try {
          payload = (await response.json()) as Record<string, unknown>;
        } catch {
          throw new Error("پاسخ سرور JSON معتبر نبود.");
        }
      }
      if (!payload) {
        const text = await response.text();
        throw new Error(parseAdminResponseError(response.status, text));
      }
      if (!response.ok) {
        throw new Error(typeof payload.error === "string" ? payload.error : "درخواست SEO ناموفق بود.");
      }
      return payload;
    },
    [token],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [linkPayload, indexPayload] = await Promise.all([
        request("/api/admin/wiki/link-maintenance"),
        request("/api/admin/wiki/indexability"),
      ]);
      const nextState = linkPayload.state as WikiLinkAdminState;
      setState(nextState);
      setIndexability(indexPayload.state as WikiIndexabilityObservabilityState);
      setRuleDraft(nextState.rules);
    } catch (error) {
      emitAdminNotice({
        tone: "error",
        title: "بارگذاری SEO ناموفق بود",
        message: error instanceof Error ? error.message : "خطای ناشناخته",
      });
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    // Data loading is the external synchronization owned by the SEO workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function mutate(
    action: string,
    body: Record<string, unknown>,
    success: string,
    pending: string,
  ) {
    setLoading(true);
    emitAdminNotice({ tone: "info", title: pending, durationMs: 0 });
    try {
      await request("/api/admin/wiki/link-maintenance", {
        method: "POST",
        body: JSON.stringify({ action, ...body }),
      });
      emitAdminNotice({ tone: "success", title: success });
      await load();
    } catch (error) {
      emitAdminNotice({
        tone: "error",
        title: "عملیات انجام نشد",
        message: error instanceof Error ? error.message : "خطای ناشناخته",
      });
    } finally {
      setLoading(false);
    }
  }

  async function runFullScan() {
    await mutate("scan", {}, "اسکن کامل ویکی ثبت شد.", "اسکن کامل ویکی شروع شد");
  }

  async function saveRules() {
    const reason = window.prompt("دلیل ثبت تنظیمات جدید:");
    if (!reason?.trim()) return;
    await mutate(
      "save_rules",
      { rules: ruleDraft, reason: reason.trim() },
      "تنظیمات اسکن ذخیره شد.",
      "در حال ذخیره تنظیمات اسکن",
    );
  }

  async function suggestionAction(
    suggestion: WikiLinkAdminSuggestion,
    action: "approve_suggestion" | "reject_suggestion" | "apply_suggestion" | "rollback_suggestion",
  ) {
    const reason = window.prompt("دلیل این تصمیم را ثبت کن:");
    if (!reason?.trim()) return;
    await mutate(
      action,
      { suggestionId: suggestion.id, reason: reason.trim() },
      "وضعیت پیشنهاد به‌روز شد.",
      "در حال به‌روزرسانی پیشنهاد",
    );
  }

  async function editSuggestion(suggestion: WikiLinkAdminSuggestion) {
    const proposedAnchor = window.prompt("انکر پیشنهادی:", suggestion.proposedAnchor);
    if (!proposedAnchor?.trim()) return;
    const proposedParagraph = window.prompt("پاراگراف نهایی:", suggestion.proposedParagraph);
    if (!proposedParagraph?.trim()) return;
    const reason = window.prompt("دلیل ویرایش:");
    if (!reason?.trim()) return;
    await mutate(
      "edit_suggestion",
      {
        suggestionId: suggestion.id,
        proposedAnchor: proposedAnchor.trim(),
        proposedParagraph: proposedParagraph.trim(),
        reason: reason.trim(),
      },
      "پیشنهاد ویرایش شد.",
      "در حال ویرایش پیشنهاد",
    );
  }

  async function importSearchConsoleCsv(file: File | null) {
    if (!file) return;
    if (file.size > 2_000_000) {
      emitAdminNotice({
        tone: "error",
        title: "CSV سرچ کنسول بزرگ است",
        message: "فعلاً فایل تا ۲ مگابایت را داخل مرورگر تحلیل می‌کنیم.",
      });
      return;
    }
    try {
      const parsed = await parseSearchConsoleUpload(file);
      const rows = parsed.rows;
      setSearchConsoleRows(rows);
      setSearchConsoleFileName(parsed.sourceName);
      emitAdminNotice({
        tone: "success",
        title: isZipUpload(file) ? "ZIP سرچ کنسول خوانده شد" : "CSV سرچ کنسول خوانده شد",
        message: `${formatNumber(rows.length)} ردیف ویکی آماده تحلیل است.`,
      });
    } catch (error) {
      emitAdminNotice({
        tone: "error",
        title: "خواندن CSV ناموفق بود",
        message: error instanceof Error ? error.message : "فرمت فایل قابل خواندن نبود.",
      });
    }
  }

  const categories = useMemo<string[]>(
    () => Array.from(new Set<string>((state?.graph.articles ?? []).map((article) => article.categoryId))).sort(),
    [state?.graph.articles],
  );

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const articles = [...(state?.graph.articles ?? [])].filter((article) => {
      if (statusFilter !== "all" && graphStatus(article) !== statusFilter) return false;
      if (categoryFilter !== "all" && article.categoryId !== categoryFilter) return false;
      if (issueFilter === "problem" && article.unresolvedOutgoingCount === 0 && article.bodyIncomingCount > 0) {
        return false;
      }
      if (
        issueFilter === "missing" &&
        !article.outgoingBodyLinks.some((edge) => edge.targetState === "missing")
      ) {
        return false;
      }
      if (
        issueFilter === "unpublished" &&
        !article.outgoingBodyLinks.some(
          (edge) => edge.targetState === "scheduled" || edge.targetState === "draft",
        )
      ) {
        return false;
      }
      if (
        issueFilter === "noindex" &&
        !article.outgoingBodyLinks.some((edge) => edge.targetState === "noindex")
      ) {
        return false;
      }
      if (issueFilter === "noIncoming" && article.bodyIncomingCount > 0) return false;

      const effectiveDate = article.publishedAt ?? article.scheduledFor;
      const ymd = effectiveDate?.slice(0, 10) ?? "";
      if (dateFrom && (!ymd || ymd < dateFrom)) return false;
      if (dateTo && (!ymd || ymd > dateTo)) return false;

      if (!normalizedQuery) return true;
      const haystack = [
        article.title,
        article.slug,
        article.stableId,
        CATEGORY_LABELS[article.categoryId] ?? article.categoryId,
        ...article.outgoingBodyLinks.flatMap((edge) => [
          edge.anchor,
          edge.targetTitle ?? "",
          edge.targetStableId,
        ]),
        ...article.incomingBodyLinks.flatMap((edge) => [edge.anchor, edge.sourceTitle]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    articles.sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title, "fa");
      if (sort === "incomingAsc") {
        return left.bodyIncomingCount - right.bodyIncomingCount || left.title.localeCompare(right.title, "fa");
      }
      if (sort === "outgoingDesc") {
        return right.bodyOutgoingCount - left.bodyOutgoingCount || left.title.localeCompare(right.title, "fa");
      }
      if (sort === "scheduled") {
        return (
          (Date.parse(left.scheduledFor ?? "") || Number.MAX_SAFE_INTEGER) -
            (Date.parse(right.scheduledFor ?? "") || Number.MAX_SAFE_INTEGER) ||
          left.title.localeCompare(right.title, "fa")
        );
      }
      return (
        right.unresolvedOutgoingCount - left.unresolvedOutgoingCount ||
        left.bodyIncomingCount - right.bodyIncomingCount ||
        left.title.localeCompare(right.title, "fa")
      );
    });
    return articles;
  }, [categoryFilter, dateFrom, dateTo, issueFilter, query, sort, state?.graph.articles, statusFilter]);

  const selectedArticle = useMemo(
    () => state?.graph.articles.find((article) => article.stableId === selectedStableId) ?? null,
    [selectedStableId, state?.graph.articles],
  );

  const readinessTasks = useMemo(
    () =>
      [...(indexability?.articles ?? [])]
        .filter((article) => article.severity !== "ok")
        .sort((left, right) => {
          const severityWeight = { blocked: 2, warning: 1, ok: 0 } as const;
          return severityWeight[right.severity] - severityWeight[left.severity] || left.title.localeCompare(right.title, "fa");
        }),
    [indexability?.articles],
  );

  const opportunities = useMemo(
    () =>
      [...(state?.graph.articles ?? [])]
        .filter(
          (article) =>
            article.unresolvedOutgoingCount > 0 ||
            article.bodyIncomingCount === 0,
        )
        .sort((left, right) => {
          const leftScheduledNoIncoming = graphStatus(left) === "scheduled" && left.bodyIncomingCount === 0 ? 1 : 0;
          const rightScheduledNoIncoming = graphStatus(right) === "scheduled" && right.bodyIncomingCount === 0 ? 1 : 0;
          return (
            right.unresolvedOutgoingCount - left.unresolvedOutgoingCount ||
            rightScheduledNoIncoming - leftScheduledNoIncoming ||
            left.bodyIncomingCount - right.bodyIncomingCount ||
            left.title.localeCompare(right.title, "fa")
          );
        }),
    [state?.graph.articles],
  );

  const searchConsoleInsights = useMemo<SearchConsoleInsight[]>(() => {
    const articles = state?.graph.articles ?? [];
    const articlesByPath = new Map(articles.map((article) => [articlePath(article), article]));
    const matchedPaths = new Set<string>();
    const insights: SearchConsoleInsight[] = [];

    for (const row of searchConsoleRows) {
      const article = articlesByPath.get(row.path);
      if (!article) continue;
      matchedPaths.add(row.path);
      const metric = `${formatNumber(row.impressions)} نمایش · ${formatNumber(row.clicks)} کلیک · رتبه ${row.position.toLocaleString("fa-IR")}`;
      if (row.impressions >= 100 && row.ctr < 0.02) {
        insights.push({
          key: `${row.path}:ctr`,
          title: article.title,
          metric,
          reason: "نمایش خوب است اما CTR پایین مانده.",
          action: "عنوان SEO و meta description را بازنویسی کن.",
          tone: "attention",
          stableId: article.stableId,
        });
      }
      if (row.position >= 8 && row.position <= 20) {
        insights.push({
          key: `${row.path}:position`,
          title: article.title,
          metric,
          reason: "صفحه نزدیک صفحه اول یا ابتدای صفحه دوم است.",
          action: "با لینک داخلی از مقاله‌های مرتبط تقویتش کن.",
          tone: article.bodyIncomingCount === 0 ? "danger" : "attention",
          stableId: article.stableId,
        });
      }
      if (row.impressions > 0 && article.bodyIncomingCount === 0) {
        insights.push({
          key: `${row.path}:incoming`,
          title: article.title,
          metric,
          reason: article.bodyPlannedIncomingCount > 0
            ? "گوگل صفحه را دیده، اما فقط از مقاله‌های منتشرنشده لینک برنامه‌ریزی‌شده دارد."
            : "گوگل صفحه را دیده، اما از متن مقاله‌های منتشر لینک ورودی زنده ندارد.",
          action: "قبل از دستکاری متن، یک یا چند ورودی contextual بساز.",
          tone: "danger",
          stableId: article.stableId,
        });
      }
    }

    for (const article of articles) {
      if (!article.publicReady || matchedPaths.has(articlePath(article))) continue;
      insights.push({
        key: `${article.stableId}:missing-gsc`,
        title: article.title,
        metric: "در CSV سرچ کنسول دیده نشد",
        reason: article.bodyPlannedIncomingCount > 0
          ? "ممکن است لینک‌های برنامه‌ریزی‌شده هنوز برای گوگل قابل دیدن نباشند."
          : "ممکن است هنوز کشف نشده باشد یا impression کافی نگرفته باشد.",
        action: article.bodyIncomingCount === 0 ? "اول برایش لینک ورودی متنی بساز." : "بعد از اسکن بعدی GSC دوباره بررسی کن.",
        tone: article.bodyIncomingCount === 0 ? "attention" : "positive",
        stableId: article.stableId,
      });
    }

    return insights.slice(0, 40);
  }, [searchConsoleRows, state?.graph.articles]);

  const searchConsoleSummary = useMemo(
    () => ({
      rows: searchConsoleRows.length,
      impressions: searchConsoleRows.reduce((sum, row) => sum + row.impressions, 0),
      clicks: searchConsoleRows.reduce((sum, row) => sum + row.clicks, 0),
    }),
    [searchConsoleRows],
  );

  function openLinkDetails(stableId: string) {
    setSelectedStableId(stableId);
    onSectionChange("links");
  }

  function resetLinkFilters(nextIssue: SeoIssueFilter = "problem") {
    setQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setIssueFilter(nextIssue);
    setSort("problem");
  }

  function exportArticles(kind: SeoExportKind) {
    const articles = state?.graph.articles ?? [];
    if (kind === "problems") {
      return articles.filter((article) => article.unresolvedOutgoingCount > 0);
    }
    if (kind === "noIncoming") {
      return articles.filter((article) => article.bodyIncomingCount === 0);
    }
    return articles;
  }

  function downloadSeoExport(kind: SeoExportKind) {
    if (!state?.graph || !indexability) return;
    const selected = exportArticles(kind);
    const payload = {
      schema: "halleus_seo_command_center_v1",
      generatedAt: new Date().toISOString(),
      sourceGeneratedAt: {
        linkGraph: state.graph.generatedAt,
        indexability: indexability.generatedAt,
      },
      scopeFa: "داده فنی SEO و لینک‌های داخل متن ویکی؛ بدون ادعای ایندکس گوگل یا داده Search Console.",
      ...(kind === "linkMap" ? {
        aiContract: {
          mode: "add_only_internal_links",
          preserveExistingLinks: true,
          instructionFa:
            "این خروجی برای ساخت لینک‌سازی داخلی افزایشی است. هیچ لینک موجودی را حذف، جابه‌جا یا بازنویسی نکن؛ فقط در پاراگراف‌های واقعاً مرتبط لینک‌های contextual تازه پیشنهاد بده.",
          liveIncomingDefinitionFa:
            "bodyIncomingCount فقط لینک ورودی از مقاله‌های منتشر و قابل ایندکس را می‌شمارد.",
          plannedIncomingDefinitionFa:
            "bodyPlannedIncomingCount لینک‌هایی است که از مقاله‌های منتشرنشده یا زمان‌بندی‌شده می‌آید و هنوز اعتبار زنده محسوب نمی‌شود.",
        },
      } : {}),
      summary: {
        linkGraph: state.graph.summary,
        indexability: indexability.summary,
      },
      articles: selected.map((article) => ({
        stableId: article.stableId,
        slug: article.slug,
        title: article.title,
        category: CATEGORY_LABELS[article.categoryId] ?? article.categoryId,
        status: graphStatusLabel(article),
        publishedAt: article.publishedAt,
        scheduledFor: article.scheduledFor,
        bodyIncomingCount: article.bodyIncomingCount,
        bodyPlannedIncomingCount: article.bodyPlannedIncomingCount,
        bodyTotalIncomingCount: article.bodyTotalIncomingCount,
        bodyOutgoingCount: article.bodyOutgoingCount,
        unresolvedOutgoingCount: article.unresolvedOutgoingCount,
        plannedUnresolvedOutgoingCount: article.plannedUnresolvedOutgoingCount,
        practicalIssue: articleIssueLabel(article),
        outgoingBodyLinks: article.outgoingBodyLinks.map((edge) => ({
          anchor: edge.anchor,
          href: edge.href,
          targetStableId: edge.targetStableId,
          targetTitle: edge.targetTitle,
          targetSlug: edge.targetSlug,
          targetPath: edge.targetPath,
          targetStatus: edge.targetStatus,
          targetState: edge.targetState,
        })),
        incomingBodyLinks: article.incomingBodyLinks.map((edge) => ({
          anchor: edge.anchor,
          sourceStableId: edge.sourceStableId,
          sourceTitle: edge.sourceTitle,
          sourceSlug: edge.sourceSlug,
          sourcePath: edge.sourcePath,
          sourceStatus: edge.sourceStatus,
          live: Boolean(edge.sourcePath),
        })),
      })),
    };
    const suffix = kind === "all"
      ? "all"
      : kind === "problems"
        ? "fix-list"
        : kind === "linkMap"
          ? "internal-link-map-ai"
          : "no-incoming";
    const fileName = `halleus-seo-${suffix}-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    emitAdminNotice({ tone: "success", title: "فایل SEO آماده شد", message: fileName });
  }

  const unresolved = state?.graph.summary.unresolvedOutgoing ?? 0;
  const noIncoming = state?.graph.summary.articlesWithoutIncoming ?? 0;
  const blocked = indexability?.summary.blocked ?? 0;

  const primaryPriority = unresolved > 0
    ? {
        eyebrow: "اولویت اول",
        title: `اصلاح ${formatNumber(unresolved)} مقصد لینک مشکل‌دار`,
        body: "مقاله منتشرشده نباید کاربر، گوگل یا ابزارهای AI را به مقصد گم‌شده، منتشرنشده یا خارج از ایندکس بفرستد.",
        action: "دیدن مقصدهای مشکل‌دار",
        run: () => {
          resetLinkFilters("problem");
          onSectionChange("links");
        },
      }
    : blocked > 0
      ? {
          eyebrow: "اولویت اول",
          title: `رفع ${formatNumber(blocked)} مشکل آمادگی ایندکس`,
          body: "این صفحه‌ها از نظر وضعیت انتشار، سایت‌مپ یا مسیر لینک داخلی هنوز آماده نیستند.",
          action: "دیدن کارهای آمادگی ایندکس",
          run: () => onSectionChange("readiness"),
        }
      : noIncoming > 0
        ? {
            eyebrow: "اولویت اول",
            title: `ساخت لینک ورودی برای ${formatNumber(noIncoming)} مقاله`,
            body: "این مقاله‌ها از متن مقاله‌های دیگر ورودی ندارند و در ساختار داخلی ویکی ضعیف‌تر دیده می‌شوند.",
            action: "دیدن فرصت‌های لینک‌سازی",
            run: () => onSectionChange("opportunities"),
          }
        : {
            eyebrow: "وضعیت فعلی",
            title: "مشکل فوری در لینک‌های متنی و آمادگی ایندکس دیده نمی‌شود",
            body: "می‌توانی اسکن را تازه کنی یا خروجی AI را برای بررسی دوره‌ای دانلود کنی.",
            action: "رفتن به خروجی AI",
            run: () => onSectionChange("export"),
          };

  if (loading && !state) {
    return <div className={styles.seoLoading}>داده‌های SEO در حال آماده‌شدن است…</div>;
  }

  return (
    <div className={styles.seoWorkspace}>
      {activeSection === "overview" ? (
        <>
          <section className={styles.seoHero}>
            <div>
              <span className={styles.seoEyebrow}>مرکز فرمان SEO</span>
              <h2>
                {unresolved > 0 || blocked > 0
                  ? "SEO ویکی نیازمند اصلاح است"
                  : noIncoming > 0
                    ? "ساختار لینک داخلی قابل تقویت است"
                    : "وضعیت فنی SEO ویکی سالم است"}
              </h2>
              <p>این صفحه فقط چیزهایی را نشان می‌دهد که به تصمیم و اکشن بعدی کمک می‌کنند.</p>
            </div>
            <div className={styles.seoHeroActions}>
              {canSettings ? (
                <button type="button" disabled={loading} onClick={() => void runFullScan()}>
                  اسکن دوباره
                </button>
              ) : null}
              <button type="button" onClick={() => downloadSeoExport("problems")}>
                دانلود لیست اصلاح
              </button>
            </div>
          </section>

          <section className={styles.seoMetricGrid}>
            <button type="button" onClick={() => { resetLinkFilters("problem"); onSectionChange("links"); }}>
              <strong>{formatNumber(unresolved)}</strong>
              <span>مقصد لینک نیازمند اصلاح</span>
            </button>
            <button type="button" onClick={() => onSectionChange("opportunities")}>
              <strong>{formatNumber(noIncoming)}</strong>
              <span>مقاله بدون لینک ورودی متنی</span>
            </button>
            <button type="button" onClick={() => onSectionChange("readiness")}>
              <strong>{formatNumber(blocked)}</strong>
              <span>صفحه نیازمند اصلاح آمادگی ایندکس</span>
            </button>
          </section>

          <section className={styles.seoPriorityCard}>
            <span>{primaryPriority.eyebrow}</span>
            <h3>{primaryPriority.title}</h3>
            <p>{primaryPriority.body}</p>
            <button type="button" onClick={primaryPriority.run}>{primaryPriority.action}</button>
          </section>

          <section className={styles.seoPathGrid}>
            {([
              ["readiness", "آمادگی ایندکس", "صفحه‌هایی که از نظر انتشار، سایت‌مپ یا لینک‌ها کار دارند."],
              ["links", "لینک‌سازی داخلی", "فیلتر، جدول فشرده و جزئیات ورودی و خروجی هر مقاله."],
              ["opportunities", "فرصت‌های رشد", "اولویت‌های عملی از وضعیت انتشار و لینک‌های داخلی."],
              ["export", "خروجی AI", "فایل تمیز برای تحلیل یا ساخت لیست اصلاح."],
              ["search-console", "داده سرچ کنسول", "CSV سرچ کنسول را با لینک‌های داخلی ترکیب کن."],
              ["settings", "تنظیمات اسکن", "قواعد فنی و هدف لینک ورودی، دور از صفحه اصلی."],
            ] as const).map(([section, title, body]) => (
              <button key={section} type="button" onClick={() => onSectionChange(section)}>
                <strong>{title}</strong>
                <span>{body}</span>
              </button>
            ))}
          </section>
        </>
      ) : null}

      {activeSection === "readiness" ? (
        <section className={styles.seoSection}>
          <div className={styles.seoSectionHeader}>
            <div>
              <span className={styles.seoEyebrow}>کارهای لازم</span>
              <h2>آمادگی ایندکس</h2>
              <p>هر ردیف می‌گوید مشکل چیست، چرا مهم است و قدم بعدی چیست.</p>
            </div>
            <small>آخرین خوانش: {formatDate(indexability?.generatedAt)}</small>
          </div>
          <div className={styles.seoCompactMetrics}>
            <span><strong>{formatNumber(indexability?.summary.publicReady ?? 0)}</strong> آماده انتشار عمومی</span>
            <span><strong>{formatNumber(indexability?.summary.sitemapEligible ?? 0)}</strong> داخل سایت‌مپ</span>
            <span><strong>{formatNumber(readinessTasks.length)}</strong> نیازمند کار</span>
          </div>
          {readinessTasks.length ? (
            <div className={styles.seoTaskList}>
              {readinessTasks.map((article) => (
                <article key={article.stableId}>
                  <div className={styles.seoTaskTop}>
                    <div>
                      <strong>{article.title}</strong>
                      <small>{article.expectedPath}</small>
                    </div>
                    <span data-tone={article.severity === "blocked" ? "danger" : "attention"}>
                      {article.severity === "blocked" ? "نیاز به اصلاح" : "بررسی شود"}
                    </span>
                  </div>
                  <dl>
                    <div><dt>مشکل</dt><dd>{readinessReasonLabel(article.reasons[0] ?? "-")}</dd></div>
                    <div><dt>چرا مهم است</dt><dd>تا وقتی این وضعیت حل نشود، مسیر کشف و لینک داخلی این صفحه تمیز و قابل اتکا نیست.</dd></div>
                    <div><dt>قدم بعدی</dt><dd>{readinessAction(article)}</dd></div>
                  </dl>
                  <div className={styles.seoRowActions}>
                    <button type="button" onClick={() => openLinkDetails(article.stableId)}>دیدن لینک‌ها</button>
                    {article.publicReady ? (
                      <a href={article.expectedPath} target="_blank" rel="noreferrer">باز کردن صفحه عمومی</a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.seoEmpty}>در خوانش فعلی، کار باز آمادگی ایندکس دیده نمی‌شود.</div>
          )}
        </section>
      ) : null}

      {activeSection === "links" ? (
        <section className={styles.seoSection}>
          <div className={styles.seoSectionHeader}>
            <div>
              <span className={styles.seoEyebrow}>ساختار لینک داخلی</span>
              <h2>لینک‌سازی داخلی</h2>
              <p>جدول فقط تصمیم‌ساز است؛ جزئیات کامل لینک‌ها در پنل کنار صفحه باز می‌شود.</p>
            </div>
            <small>{formatNumber(filteredArticles.length)} مقاله در این نما</small>
          </div>

          <div className={styles.seoFilterToolbar}>
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجو در مقاله، انکر یا مقصد" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as SeoStatusFilter)}>
              <option value="all">همه وضعیت‌ها</option>
              <option value="published">منتشر</option>
              <option value="scheduled">زمان‌بندی</option>
              <option value="draft">پیش‌نویس</option>
            </select>
            <select value={issueFilter} onChange={(event) => setIssueFilter(event.target.value as SeoIssueFilter)}>
              <option value="all">همه مقاله‌ها</option>
              <option value="problem">نیازمند کار</option>
              <option value="missing">مقصد پیدا نمی‌شود</option>
              <option value="unpublished">مقصد منتشر نشده</option>
              <option value="noindex">مقصد خارج از ایندکس</option>
              <option value="noIncoming">بدون ورودی متنی</option>
            </select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">همه دسته‌ها</option>
              {categories.map((category) => <option key={category} value={category}>{CATEGORY_LABELS[category] ?? category}</option>)}
            </select>
            <label>از <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
            <label>تا <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
            <select value={sort} onChange={(event) => setSort(event.target.value as SeoSort)}>
              <option value="problem">اولویت</option>
              <option value="incomingAsc">کمترین ورودی</option>
              <option value="outgoingDesc">بیشترین خروجی</option>
              <option value="scheduled">نزدیک‌ترین زمان‌بندی</option>
              <option value="title">عنوان</option>
            </select>
          </div>

          <div className={styles.seoTableWrap}>
            <table>
              <thead>
                <tr>
                  <th>مقاله</th><th>دسته</th><th>وضعیت</th><th>تاریخ</th><th>ورودی زنده</th><th>خروجی</th><th>مشکل</th><th>اکشن</th>
                </tr>
              </thead>
              <tbody>
                {filteredArticles.map((article) => (
                  <tr key={article.stableId}>
                    <td><strong>{article.title}</strong><small>{article.slug}</small></td>
                    <td>{CATEGORY_LABELS[article.categoryId] ?? article.categoryId}</td>
                    <td>{graphStatusLabel(article)}</td>
                    <td>{formatDate(article.publishedAt ?? article.scheduledFor)}</td>
                    <td>
                      <strong>{formatNumber(article.bodyIncomingCount)}</strong>
                      {article.bodyPlannedIncomingCount > 0 ? (
                        <small>{formatNumber(article.bodyPlannedIncomingCount)} برنامه‌ریزی‌شده</small>
                      ) : null}
                    </td>
                    <td>{formatNumber(article.bodyOutgoingCount)}</td>
                    <td>
                      <span data-tone={article.unresolvedOutgoingCount > 0 ? "danger" : article.bodyIncomingCount === 0 ? "attention" : "positive"}>
                        {articleIssueLabel(article)}
                      </span>
                    </td>
                    <td><button type="button" onClick={() => setSelectedStableId(article.stableId)}>جزئیات</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!filteredArticles.length ? <div className={styles.seoEmpty}>با این فیلترها مقاله‌ای پیدا نشد.</div> : null}
        </section>
      ) : null}

      {activeSection === "opportunities" ? (
        <section className={styles.seoSection}>
          <div className={styles.seoSectionHeader}>
            <div>
              <span className={styles.seoEyebrow}>اولویت‌ها</span>
              <h2>فرصت‌های رشد</h2>
              <p>فعلاً این اولویت‌بندی از وضعیت انتشار و لینک داخلی می‌آید؛ داده Search Console هنوز به این بخش وصل نشده است.</p>
            </div>
          </div>
          {opportunities.length ? (
            <div className={styles.seoOpportunityList}>
              {opportunities.map((article) => {
                const scheduledNoIncoming = graphStatus(article) === "scheduled" && article.bodyIncomingCount === 0;
                const label = article.unresolvedOutgoingCount > 0
                  ? "اول اصلاح مقصد لینک"
                  : scheduledNoIncoming
                    ? "قبل از انتشار لینک ورودی بساز"
                    : "لینک ورودی بساز";
                return (
                  <article key={article.stableId}>
                    <div>
                      <strong>{article.title}</strong>
                      <small>{CATEGORY_LABELS[article.categoryId] ?? article.categoryId} · {graphStatusLabel(article)}</small>
                    </div>
                    <p>{label}</p>
                    <div className={styles.seoRowActions}>
                      <button type="button" onClick={() => openLinkDetails(article.stableId)}>دیدن جزئیات لینک</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.seoEmpty}>فرصت فوری از روی داده لینک داخلی دیده نمی‌شود.</div>
          )}

          {(state?.suggestions ?? []).length ? (
            <div className={styles.seoSuggestions}>
              <h3>پیشنهادهای آماده لینک‌سازی</h3>
              {(state?.suggestions ?? []).map((suggestion) => (
                <article key={suggestion.id}>
                  <div className={styles.seoTaskTop}>
                    <div>
                      <strong>{suggestion.sourceStableId} → {suggestion.targetStableId}</strong>
                      <small>{suggestion.placement} · {Math.round(suggestion.confidence * 100)}٪ اطمینان</small>
                    </div>
                    <span>{suggestionStatusLabel(suggestion.status)}</span>
                  </div>
                  <p>{suggestion.proposedParagraph}</p>
                  <div className={styles.seoRowActions}>
                    {canDraft && ["suggested", "edited"].includes(suggestion.status) ? (
                      <button type="button" onClick={() => void editSuggestion(suggestion)}>ویرایش</button>
                    ) : null}
                    {canPublish && ["suggested", "edited"].includes(suggestion.status) ? (
                      <button type="button" onClick={() => void suggestionAction(suggestion, "approve_suggestion")}>تایید</button>
                    ) : null}
                    {canDraft && ["suggested", "edited", "approved"].includes(suggestion.status) ? (
                      <button type="button" onClick={() => void suggestionAction(suggestion, "reject_suggestion")}>رد</button>
                    ) : null}
                    {canPublish && suggestion.status === "approved" ? (
                      <button type="button" onClick={() => void suggestionAction(suggestion, "apply_suggestion")}>اعمال در پیش‌نویس</button>
                    ) : null}
                    {canPublish && ["applied", "verified"].includes(suggestion.status) ? (
                      <button type="button" onClick={() => void suggestionAction(suggestion, "rollback_suggestion")}>بازگردانی</button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {activeSection === "export" ? (
        <section className={styles.seoSection}>
          <div className={styles.seoSectionHeader}>
            <div>
              <span className={styles.seoEyebrow}>خروجی برای AI</span>
              <h2>خروجی AI</h2>
              <p>فایل‌ها فقط داده فنی و لینک‌های متنی را می‌دهند و ادعای ایندکس گوگل ندارند.</p>
            </div>
          </div>
          <div className={styles.seoExportGrid}>
            <article>
              <strong>لیست اصلاح مقصدها</strong>
              <p>برای مقاله‌هایی که لینک داخل متن به مقصد مشکل‌دار دارند.</p>
              <button type="button" onClick={() => downloadSeoExport("problems")}>دانلود JSON</button>
            </article>
            <article>
              <strong>مقاله‌های بدون ورودی</strong>
              <p>برای ساخت برنامه لینک‌سازی قدیمی → جدید یا تقویت صفحات مهم.</p>
              <button type="button" onClick={() => downloadSeoExport("noIncoming")}>دانلود JSON</button>
            </article>
            <article>
              <strong>خروجی کامل SEO</strong>
              <p>گراف لینک، وضعیت انتشار و خلاصه آمادگی ایندکس در یک فایل.</p>
              <button type="button" onClick={() => downloadSeoExport("all")}>دانلود JSON</button>
            </article>
            <article>
              <strong>نقشه لینک‌سازی برای AI</strong>
              <p>همه لینک‌های ورودی و خروجی هر صفحه، با قرارداد فقط افزودن لینک جدید.</p>
              <button type="button" onClick={() => downloadSeoExport("linkMap")}>دانلود JSON</button>
            </article>
          </div>
        </section>
      ) : null}

      {activeSection === "search-console" ? (
        <section className={styles.seoSection}>
          <div className={styles.seoSectionHeader}>
            <div>
              <span className={styles.seoEyebrow}>داده بیرونی</span>
              <h2>داده سرچ کنسول</h2>
              <p>CSV صفحه‌های Search Console را موقتاً داخل مرورگر تحلیل کن؛ چیزی در دیتابیس ذخیره نمی‌شود.</p>
            </div>
            {searchConsoleFileName ? <small>{searchConsoleFileName}</small> : null}
          </div>
          <label className={styles.seoUploadBox}>
            <input
              type="file"
              accept=".csv,.zip,text/csv,application/zip,application/x-zip-compressed"
              onChange={(event) => void importSearchConsoleCsv(event.target.files?.[0] ?? null)}
            />
            <strong>آپلود CSV یا ZIP سرچ کنسول</strong>
            <span>Performance → Pages را به صورت CSV یا خروجی ZIP کامل Search Console اینجا انتخاب کن.</span>
          </label>
          {searchConsoleRows.length ? (
            <>
              <div className={styles.seoCompactMetrics}>
                <span><strong>{formatNumber(searchConsoleSummary.rows)}</strong> ردیف ویکی</span>
                <span><strong>{formatNumber(searchConsoleSummary.impressions)}</strong> نمایش</span>
                <span><strong>{formatNumber(searchConsoleSummary.clicks)}</strong> کلیک</span>
                <span><strong>{formatNumber(searchConsoleInsights.length)}</strong> پیشنهاد</span>
              </div>
              {searchConsoleInsights.length ? (
                <div className={styles.seoOpportunityList}>
                  {searchConsoleInsights.map((insight) => (
                    <article key={insight.key}>
                      <div>
                        <strong>{insight.title}</strong>
                        <small>{insight.metric}</small>
                      </div>
                      <p>{insight.reason} {insight.action}</p>
                      <div className={styles.seoRowActions}>
                        {insight.stableId ? (
                          <button type="button" onClick={() => openLinkDetails(insight.stableId!)}>
                            دیدن لینک‌ها
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.seoEmpty}>در این CSV، فرصت واضحی برای مقاله‌های ویکی پیدا نشد.</div>
              )}
              <div className={styles.seoTableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>صفحه</th><th>کلیک</th><th>نمایش</th><th>CTR</th><th>رتبه</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchConsoleRows.slice(0, 30).map((row) => (
                      <tr key={row.path}>
                        <td><strong>{row.path}</strong><small>{row.page}</small></td>
                        <td>{formatNumber(row.clicks)}</td>
                        <td>{formatNumber(row.impressions)}</td>
                        <td>{`${(row.ctr * 100).toLocaleString("fa-IR", { maximumFractionDigits: 1 })}٪`}</td>
                        <td>{row.position.toLocaleString("fa-IR", { maximumFractionDigits: 1 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className={styles.seoEmpty}>هنوز CSV سرچ کنسول انتخاب نشده؛ فرصت‌های رشد فعلاً فقط از لینک‌های داخلی ساخته می‌شوند.</div>
          )}
        </section>
      ) : null}

      {activeSection === "settings" ? (
        <section className={styles.seoSection}>
          <div className={styles.seoSectionHeader}>
            <div>
              <span className={styles.seoEyebrow}>تنظیمات پیشرفته</span>
              <h2>تنظیمات اسکن</h2>
              <p>این اعداد رفتار اسکن را کنترل می‌کنند و از صفحه اصلی SEO جدا نگه داشته شده‌اند.</p>
            </div>
          </div>
          <div className={styles.seoSettingsGrid}>
            {NUMERIC_RULE_FIELDS.map(([key, label, help]) => (
              <label key={key}>
                <span>{label}</span>
                <input
                  type="number"
                  value={ruleDraft[key]}
                  disabled={!canSettings || loading}
                  onChange={(event) => setRuleDraft((current) => ({ ...current, [key]: Number(event.target.value) }))}
                />
                <small>{help}{key === "incomingTarget" ? " پیشنهاد هالیوس: ۳ لینک ورودی." : ""}</small>
              </label>
            ))}
          </div>
          {canSettings ? (
            <div className={styles.seoSectionActions}>
              <button type="button" disabled={loading} onClick={() => void saveRules()}>ذخیره تنظیمات اسکن</button>
            </div>
          ) : (
            <div className={styles.seoEmpty}>این حساب دسترسی تغییر تنظیمات اسکن را ندارد.</div>
          )}
        </section>
      ) : null}

      {selectedArticle && activeSection === "links" ? (
        <>
          <button type="button" className={styles.seoDrawerBackdrop} aria-label="بستن جزئیات لینک" onClick={() => setSelectedStableId(null)} />
          <aside className={styles.seoLinkDrawer} aria-label={`جزئیات لینک ${selectedArticle.title}`}>
            <div className={styles.seoDrawerHeader}>
              <div>
                <span className={styles.seoEyebrow}>جزئیات لینک</span>
                <h3>{selectedArticle.title}</h3>
                <small>{CATEGORY_LABELS[selectedArticle.categoryId] ?? selectedArticle.categoryId} · {graphStatusLabel(selectedArticle)}</small>
              </div>
              <button type="button" aria-label="بستن" onClick={() => setSelectedStableId(null)}>×</button>
            </div>
            <div className={styles.seoCompactMetrics}>
              <span><strong>{formatNumber(selectedArticle.bodyIncomingCount)}</strong> ورودی زنده</span>
              <span><strong>{formatNumber(selectedArticle.bodyPlannedIncomingCount)}</strong> ورودی برنامه‌ریزی‌شده</span>
              <span><strong>{formatNumber(selectedArticle.bodyOutgoingCount)}</strong> خروجی</span>
              <span><strong>{formatNumber(selectedArticle.unresolvedOutgoingCount)}</strong> مقصد مشکل‌دار</span>
            </div>
            <section>
              <h4>به کجا لینک داده؟</h4>
              {selectedArticle.outgoingBodyLinks.length ? (
                <div className={styles.seoEdgeList}>
                  {selectedArticle.outgoingBodyLinks.map((edge, index) => (
                    <article key={`${edge.targetStableId}-${edge.anchor}-${index}`}>
                      <strong>{edge.targetTitle ?? edge.targetStableId}</strong>
                      <span>{edge.anchor}</span>
                      <small>{targetStateLabel(edge)}</small>
                    </article>
                  ))}
                </div>
              ) : <p>لینک خروجی متنی ندارد.</p>}
            </section>
            <section>
              <h4>از کجا لینک گرفته؟</h4>
              {selectedArticle.incomingBodyLinks.length ? (
                <div className={styles.seoEdgeList}>
                  {selectedArticle.incomingBodyLinks.map((edge, index) => (
                    <article key={`${edge.sourceStableId}-${edge.anchor}-${index}`}>
                      <strong>{edge.sourceTitle}</strong>
                      <span>{edge.anchor}</span>
                      <small>{edge.sourcePath ? "زنده" : "برنامه‌ریزی‌شده"}</small>
                    </article>
                  ))}
                </div>
              ) : <p>هنوز لینک ورودی متنی ندارد.</p>}
            </section>
          </aside>
        </>
      ) : null}
    </div>
  );
}
