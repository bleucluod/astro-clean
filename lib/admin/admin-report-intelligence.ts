import {
  asBoolean,
  asNullableString,
  asNumber,
  asRecord,
  asString,
  getAdminDatabase,
} from "@/lib/admin/admin-database";
import { AdminAccessError } from "@/lib/admin/admin-auth";
import type {
  AdminReportBreakdownItem,
  AdminReportCohortPayload,
  AdminReportFilterOptions,
  AdminReportFilters,
  AdminReportInsights,
  AdminReportSummary,
  AdminReportTrendPoint,
} from "@/lib/admin/admin-types";

const REPORT_INTELLIGENCE_SCAN_LIMIT = 50_000;
export const REPORT_CSV_EXPORT_LIMIT = 10_000;
const TEHRAN_TIMEZONE = "Asia/Tehran";

function cleanNullable(value: unknown) {
  const normalized = asNullableString(value)?.trim() ?? "";
  return normalized || null;
}

function allowedVisibility(value: string): AdminReportSummary["visibility"] {
  return [
    "public",
    "private",
    "shared_by_link",
    "unpublished",
    "restricted_by_admin",
  ].includes(value)
    ? (value as AdminReportSummary["visibility"])
    : "unknown";
}

function parseBirthParts(value: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return { year: null, month: null };
  const month = Number(match[2]);
  if (month < 1 || month > 12) return { year: null, month: null };
  return { year: match[1], month: match[2] };
}

function tehranDay(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TEHRAN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function tehranMonth(value: string) {
  return tehranDay(value).slice(0, 7);
}

function tehranWeek(value: string) {
  const localDay = tehranDay(value);
  const date = new Date(`${localDay}T00:00:00.000Z`);
  const daysSinceSaturday = (date.getUTCDay() + 1) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceSaturday);
  return date.toISOString().slice(0, 10);
}

// HALLEUS_REPORT_CANONICAL_NORMALIZATION_R1
export function normalizeAdminReportRow(raw: unknown): AdminReportSummary {
  const row = asRecord(raw);
  const birthDate = cleanNullable(row.birth_date);
  const birthParts = parseBirthParts(birthDate);
  const birthTimeAccuracyRaw = asString(row.birth_time_accuracy);
  const publicationState = cleanNullable(row.publication_state) ?? "unknown";
  const visibility = allowedVisibility(asString(row.visibility));
  const reportType =
    cleanNullable(row.metadata_report_type) ??
    cleanNullable(row.top_level_report_type) ??
    "unknown";

  return {
    id: asString(row.id),
    title: asString(row.title) || "گزارش ذخیره‌شده",
    ownerUserId: asString(row.user_id),
    ownerDisplayName: cleanNullable(row.owner_display_name),
    subjectName: cleanNullable(row.subject_name),
    birthDate,
    birthTime: cleanNullable(row.birth_time),
    birthTimeAccuracy: ["known", "unknown"].includes(birthTimeAccuracyRaw)
      ? (birthTimeAccuracyRaw as "known" | "unknown")
      : null,
    birthCity: cleanNullable(row.birth_city),
    birthCountry: cleanNullable(row.birth_country),
    birthYear: birthParts.year,
    birthMonth: birthParts.month,
    ownerKind: cleanNullable(row.publication_owner_kind) ?? "unknown",
    accountPlan: cleanNullable(row.account_plan),
    visibility,
    publicationState,
    source: cleanNullable(row.source) ?? "unknown",
    reportType,
    accessTier: cleanNullable(row.access_tier) ?? "unknown",
    engineVersion: cleanNullable(row.engine_version),
    reportVersion: cleanNullable(row.report_version),
    publicationConsentState:
      cleanNullable(row.publication_consent_state) ?? "unknown",
    identityConsentState: cleanNullable(row.identity_consent_state) ?? "unknown",
    shareEnabled: asBoolean(row.share_enabled),
    storageBytes: asNumber(row.storage_bytes),
    reportJsonBytes: asNumber(row.report_json_bytes),
    indexable: visibility === "public" && publicationState === "public",
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

async function loadCanonicalAdminReports() {
  const sql = getAdminDatabase();
  const rows = await sql`
    select
      r.id,
      r.user_id,
      coalesce(
        nullif(r.title, ''),
        nullif(r.report_json #>> '{input,name}', ''),
        'گزارش ذخیره‌شده'
      ) as title,
      u.display_name as owner_display_name,
      u.plan as account_plan,
      r.report_json #>> '{input,name}' as subject_name,
      r.report_json #>> '{input,birthDate}' as birth_date,
      r.report_json #>> '{input,birthTime}' as birth_time,
      r.report_json #>> '{input,birthTimeAccuracy}' as birth_time_accuracy,
      r.report_json #>> '{input,birthCity}' as birth_city,
      r.report_json #>> '{input,birthCountry}' as birth_country,
      nullif(r.report_json #>> '{metadata,reportType}', '') as metadata_report_type,
      nullif(r.report_json ->> 'reportType', '') as top_level_report_type,
      r.publication_owner_kind,
      r.access_tier,
      r.publication_state,
      r.publication_consent_state,
      r.identity_consent_state,
      r.visibility,
      r.share_enabled,
      r.source,
      coalesce(
        nullif(r.report_json #>> '{engineData,engineVersion}', ''),
        nullif(r.report_json #>> '{chart,engineVersion}', ''),
        nullif(r.report_json ->> 'engineVersion', '')
      ) as engine_version,
      coalesce(
        nullif(r.report_json #>> '{metadata,reportVersion}', ''),
        nullif(r.report_json ->> 'reportVersion', '')
      ) as report_version,
      r.created_at::text as created_at,
      r.updated_at::text as updated_at,
      pg_column_size(r)::int as storage_bytes,
      pg_column_size(r.report_json)::int as report_json_bytes,
      count(*) over()::int as full_count
    from public.halleus_reports as r
    left join public.halleus_users as u on u.id = r.user_id
    where r.deleted_at is null
    order by r.created_at desc
    limit ${REPORT_INTELLIGENCE_SCAN_LIMIT + 1}
  `;

  const fullCount = asNumber(asRecord(rows[0]).full_count);
  if (fullCount > REPORT_INTELLIGENCE_SCAN_LIMIT) {
    throw new AdminAccessError(
      413,
      `Reports Intelligence currently supports up to ${REPORT_INTELLIGENCE_SCAN_LIMIT.toLocaleString("en-US")} active reports without introducing BI infrastructure.`,
    );
  }
  return rows.map(normalizeAdminReportRow);
}

function normalizeFilterText(value: string | null) {
  return value?.trim().toLocaleLowerCase("fa") ?? "";
}

function includesSearch(report: AdminReportSummary, search: string) {
  if (!search) return true;
  return [
    report.id,
    report.title,
    report.ownerUserId,
    report.ownerDisplayName,
    report.subjectName,
    report.birthCity,
    report.birthCountry,
    report.source,
    report.reportType,
  ].some((value) =>
    (value ?? "").toLocaleLowerCase("fa").includes(search),
  );
}

function sameFilter(value: string | null | undefined, filter: string | null) {
  if (!filter) return true;
  return (value ?? "").toLocaleLowerCase("fa") === filter.toLocaleLowerCase("fa");
}

// HALLEUS_REPORT_SHARED_COHORT_FILTER_R1
export function filterAdminReports(
  reports: readonly AdminReportSummary[],
  filters: AdminReportFilters,
) {
  const search = normalizeFilterText(filters.search);
  return reports.filter((report) => {
    const createdDay = tehranDay(report.createdAt);
    if (filters.dateFrom && createdDay < filters.dateFrom) return false;
    if (filters.dateTo && createdDay > filters.dateTo) return false;
    if (!includesSearch(report, search)) return false;
    if (!sameFilter(report.birthCity, filters.birthCity)) return false;
    if (!sameFilter(report.birthCountry, filters.birthCountry)) return false;
    if (!sameFilter(report.reportType, filters.reportType)) return false;
    if (!sameFilter(report.ownerKind, filters.ownerKind)) return false;
    if (!sameFilter(report.accessTier, filters.accessTier)) return false;
    if (!sameFilter(report.visibility, filters.visibility)) return false;
    if (!sameFilter(report.source, filters.source)) return false;
    if (!sameFilter(report.birthYear, filters.birthYear)) return false;
    if (!sameFilter(report.birthMonth, filters.birthMonth)) return false;
    return true;
  });
}

function readShortParam(params: URLSearchParams, key: string, max = 120) {
  const value = params.get(key)?.trim() ?? "";
  return value ? value.slice(0, max) : null;
}

function readDateParam(params: URLSearchParams, key: string) {
  const value = readShortParam(params, key, 10);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AdminAccessError(400, `${key} must use YYYY-MM-DD.`);
  }
  return value;
}

export function readAdminReportFilters(params: URLSearchParams): AdminReportFilters {
  const birthYear = readShortParam(params, "birthYear", 4);
  if (birthYear && !/^\d{4}$/.test(birthYear)) {
    throw new AdminAccessError(400, "birthYear must contain four digits.");
  }
  const birthMonth = readShortParam(params, "birthMonth", 2);
  if (
    birthMonth &&
    (!/^\d{1,2}$/.test(birthMonth) ||
      Number(birthMonth) < 1 ||
      Number(birthMonth) > 12)
  ) {
    throw new AdminAccessError(400, "birthMonth must be between 1 and 12.");
  }
  return {
    search: (params.get("search") ?? "").trim().slice(0, 160),
    dateFrom: readDateParam(params, "dateFrom"),
    dateTo: readDateParam(params, "dateTo"),
    birthCity: readShortParam(params, "birthCity"),
    birthCountry: readShortParam(params, "birthCountry"),
    reportType: readShortParam(params, "reportType"),
    ownerKind: readShortParam(params, "ownerKind"),
    accessTier: readShortParam(params, "accessTier"),
    visibility: readShortParam(params, "visibility"),
    source: readShortParam(params, "source"),
    birthYear,
    birthMonth: birthMonth ? birthMonth.padStart(2, "0") : null,
  };
}

function countBreakdown(
  reports: readonly AdminReportSummary[],
  picker: (report: AdminReportSummary) => string | null | undefined,
  limit = 30,
): AdminReportBreakdownItem[] {
  const counts = new Map<string, number>();
  for (const report of reports) {
    const key = picker(report)?.trim() || "unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key, "fa"))
    .slice(0, limit);
}

function trend(
  reports: readonly AdminReportSummary[],
  picker: (report: AdminReportSummary) => string,
  limit: number,
): AdminReportTrendPoint[] {
  const counts = new Map<string, number>();
  for (const report of reports) {
    const key = picker(report);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => left.key.localeCompare(right.key))
    .slice(-limit);
}


function buildStorageInsights(reports: readonly AdminReportSummary[]) {
  const rowSizes = reports
    .map((report) => Math.max(0, report.storageBytes))
    .sort((left, right) => left - right);
  const reportJsonSizes = reports.map((report) =>
    Math.max(0, report.reportJsonBytes),
  );
  const totalBytes = rowSizes.reduce((sum, value) => sum + value, 0);
  const reportJsonTotalBytes = reportJsonSizes.reduce(
    (sum, value) => sum + value,
    0,
  );
  const medianBytes =
    rowSizes.length === 0
      ? 0
      : rowSizes.length % 2 === 1
        ? rowSizes[Math.floor(rowSizes.length / 2)]
        : Math.round(
            (rowSizes[rowSizes.length / 2 - 1] +
              rowSizes[rowSizes.length / 2]) /
              2,
          );

  return {
    rowCount: reports.length,
    totalBytes,
    averageBytes:
      reports.length > 0 ? Math.round(totalBytes / reports.length) : 0,
    largestBytes: rowSizes.at(-1) ?? 0,
    medianBytes,
    reportJsonTotalBytes,
    reportJsonAverageBytes:
      reports.length > 0
        ? Math.round(reportJsonTotalBytes / reports.length)
        : 0,
  };
}

export function buildAdminReportInsights(
  reports: readonly AdminReportSummary[],
  now = new Date(),
): AdminReportInsights {
  const today = tehranDay(now.toISOString());
  const cutoff7 = new Date(now.getTime() - 6 * 86_400_000);
  const cutoff30 = new Date(now.getTime() - 29 * 86_400_000);
  const cutoff7Day = tehranDay(cutoff7.toISOString());
  const cutoff30Day = tehranDay(cutoff30.toISOString());

  const creators = new Set(
    reports.map((report) => report.ownerUserId).filter(Boolean),
  );

  const accountCounts = new Map<string, number>();
  for (const report of reports) {
    if (report.ownerKind !== "account" || !report.ownerUserId) continue;
    accountCounts.set(
      report.ownerUserId,
      (accountCounts.get(report.ownerUserId) ?? 0) + 1,
    );
  }
  const accountValues = [...accountCounts.values()];
  const accountTotalReports = accountValues.reduce((sum, value) => sum + value, 0);

  return {
    volume: {
      today: reports.filter((report) => tehranDay(report.createdAt) === today).length,
      last7Days: reports.filter((report) => tehranDay(report.createdAt) >= cutoff7Day).length,
      last30Days: reports.filter((report) => tehranDay(report.createdAt) >= cutoff30Day).length,
      total: reports.length,
    },
    uniqueCreators: creators.size,
    storage: buildStorageInsights(reports),
    accountFrequency: {
      accountCount: accountValues.length,
      averageReportsPerAccount:
        accountValues.length > 0
          ? Number((accountTotalReports / accountValues.length).toFixed(2))
          : 0,
      oneReportAccounts: accountValues.filter((count) => count === 1).length,
      multiReportAccounts: accountValues.filter((count) => count > 1).length,
    },
    byReportType: countBreakdown(reports, (report) => report.reportType),
    byAccessTier: countBreakdown(reports, (report) => report.accessTier),
    byOwnerKind: countBreakdown(reports, (report) => report.ownerKind),
    topBirthCities: countBreakdown(
      reports.filter((report) => report.birthCity),
      (report) => report.birthCity,
      15,
    ),
    topBirthCountries: countBreakdown(
      reports.filter((report) => report.birthCountry),
      (report) => report.birthCountry,
      15,
    ),
    birthYears: countBreakdown(
      reports.filter((report) => report.birthYear),
      (report) => report.birthYear,
      120,
    ),
    birthMonths: countBreakdown(
      reports.filter((report) => report.birthMonth),
      (report) => report.birthMonth,
      12,
    ),
    trends: {
      daily: trend(reports, (report) => tehranDay(report.createdAt), 30),
      weekly: trend(reports, (report) => tehranWeek(report.createdAt), 12),
      monthly: trend(reports, (report) => tehranMonth(report.createdAt), 12),
    },
  };
}

function uniqueOptions(
  reports: readonly AdminReportSummary[],
  picker: (report: AdminReportSummary) => string | null | undefined,
) {
  return [...new Set(reports.map(picker).filter((value): value is string => Boolean(value?.trim())))]
    .sort((left, right) => left.localeCompare(right, "fa"));
}

function buildFilterOptions(
  reports: readonly AdminReportSummary[],
): AdminReportFilterOptions {
  return {
    birthCities: uniqueOptions(reports, (report) => report.birthCity),
    birthCountries: uniqueOptions(reports, (report) => report.birthCountry),
    reportTypes: uniqueOptions(reports, (report) => report.reportType),
    ownerKinds: uniqueOptions(reports, (report) => report.ownerKind),
    accessTiers: uniqueOptions(reports, (report) => report.accessTier),
    visibilities: uniqueOptions(reports, (report) => report.visibility),
    sources: uniqueOptions(reports, (report) => report.source),
    birthYears: uniqueOptions(reports, (report) => report.birthYear).sort().reverse(),
  };
}

export async function getAdminReportCohort(input: {
  filters: AdminReportFilters;
  page: number;
  pageSize: number;
}): Promise<AdminReportCohortPayload> {
  const allReports = await loadCanonicalAdminReports();
  const cohort = filterAdminReports(allReports, input.filters);
  const page = Math.max(1, input.page);
  const pageSize = Math.min(Math.max(1, input.pageSize), 100);
  const offset = (page - 1) * pageSize;

  return {
    reports: cohort.slice(offset, offset + pageSize),
    total: cohort.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(cohort.length / pageSize)),
    filters: input.filters,
    options: buildFilterOptions(allReports),
    insights: buildAdminReportInsights(cohort),
  };
}

function spreadsheetSafe(value: unknown) {
  const raw =
    value === null || value === undefined
      ? ""
      : typeof value === "boolean"
        ? value
          ? "true"
          : "false"
        : String(value);
  return /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
}

function csvCell(value: unknown) {
  return `"${spreadsheetSafe(value).replaceAll('"', '""')}"`;
}

export function buildAdminReportCsv(reports: readonly AdminReportSummary[]) {
  const columns: Array<[string, (report: AdminReportSummary) => unknown]> = [
    ["report_id", (report) => report.id],
    ["title", (report) => report.title],
    ["report_type", (report) => report.reportType],
    ["subject_name", (report) => report.subjectName],
    ["birth_date", (report) => report.birthDate],
    ["birth_time", (report) => report.birthTime],
    ["birth_time_accuracy", (report) => report.birthTimeAccuracy],
    ["birth_city", (report) => report.birthCity],
    ["birth_country", (report) => report.birthCountry],
    ["owner_user_id", (report) => report.ownerUserId],
    ["owner_display_name", (report) => report.ownerDisplayName],
    ["owner_kind", (report) => report.ownerKind],
    ["account_plan", (report) => report.accountPlan],
    ["access_tier", (report) => report.accessTier],
    ["visibility", (report) => report.visibility],
    ["publication_state", (report) => report.publicationState],
    ["publication_consent_state", (report) => report.publicationConsentState],
    ["identity_consent_state", (report) => report.identityConsentState],
    ["share_enabled", (report) => report.shareEnabled],
    ["indexable", (report) => report.indexable],
    ["source", (report) => report.source],
    ["storage_bytes", (report) => report.storageBytes],
    ["report_json_bytes", (report) => report.reportJsonBytes],
    ["created_at", (report) => report.createdAt],
    ["updated_at", (report) => report.updatedAt],
  ];
  const lines = [
    columns.map(([label]) => csvCell(label)).join(","),
    ...reports.map((report) =>
      columns.map(([, picker]) => csvCell(picker(report))).join(","),
    ),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export async function getAdminReportCsvCohort(filters: AdminReportFilters) {
  const allReports = await loadCanonicalAdminReports();
  const cohort = filterAdminReports(allReports, filters);
  if (cohort.length > REPORT_CSV_EXPORT_LIMIT) {
    throw new AdminAccessError(
      413,
      `CSV export is bounded to ${REPORT_CSV_EXPORT_LIMIT.toLocaleString("en-US")} rows. Narrow the active cohort first.`,
    );
  }
  return {
    csv: buildAdminReportCsv(cohort),
    rowCount: cohort.length,
  };
}

export function auditSafeReportFilters(filters: AdminReportFilters) {
  return {
    searchApplied: Boolean(filters.search),
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    birthCity: filters.birthCity,
    birthCountry: filters.birthCountry,
    reportType: filters.reportType,
    ownerKind: filters.ownerKind,
    accessTier: filters.accessTier,
    visibility: filters.visibility,
    source: filters.source,
    birthYear: filters.birthYear,
    birthMonth: filters.birthMonth,
  };
}
