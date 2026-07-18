import type { AstrologyReport } from "@/types/astro";
import type {
  ReportRecord,
  ReportRecordSummary,
  ReportSource,
  ReportVisibility,
} from "@/types/storage";

type CreateReportRecordOptions = {
  favorite?: boolean;
  note?: string;
  source?: ReportSource;
  userId?: string;
  visibility?: ReportVisibility;
};

export function createReportRecord(
  report: AstrologyReport,
  options: CreateReportRecordOptions = {},
): ReportRecord {
  const timestamp = new Date().toISOString();

  return {
    id: report.id,
    userId: options.userId,
    report,
    input: report.input,
    createdAt: report.createdAt || timestamp,
    updatedAt: timestamp,
    favorite: options.favorite ?? false,
    note: options.note,
    visibility: options.visibility ?? "private",
    source: options.source ?? "local-preview",
  };
}

export function summarizeReportRecord(
  record: ReportRecord,
): ReportRecordSummary {
  return {
    id: record.id,
    title: record.input.name ? `گزارش ${record.input.name}` : "گزارش ذخیره‌شده",
    userId: record.userId,
    name: record.input.name,
    birthDate: record.input.birthDate,
    birthTime: record.input.birthTime,
    birthCity: record.input.birthCity,
    birthCountry: record.input.birthCountry,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    favorite: record.favorite,
    hasNote: Boolean(record.note?.trim()),
    visibility: record.visibility,
    source: record.source,
  };
}

export function isReportRecord(value: unknown): value is ReportRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<ReportRecord>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string" &&
    typeof candidate.favorite === "boolean" &&
    typeof candidate.visibility === "string" &&
    typeof candidate.source === "string" &&
    typeof candidate.report === "object" &&
    candidate.report !== null &&
    typeof candidate.input === "object" &&
    candidate.input !== null
  );
}

export function normalizeReportRecords(value: unknown): ReportRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isReportRecord);
}
