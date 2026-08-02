import type { AstrologyReport } from "@/types/astro";
import { evaluateReportPublicationPolicy } from "@/lib/reports/report-access-contract";
import type { ReportPublicationPolicyInput } from "@/types/report-generation";
import type { ReportRecord, ReportRecordSummary } from "@/types/storage";
import { createDatabaseReportRepository } from "@/lib/storage/database-report-repository";
import { getReportDatabaseDriver } from "@/lib/database/report-database-driver";
import { summarizeReportRecord } from "@/lib/storage/report-records";

export type ServerReportPersistenceOptions = {
  userId: string;
  publication?: ReportPublicationPolicyInput;
};

export type SaveServerReportInput = ServerReportPersistenceOptions & {
  report: AstrologyReport;
};

export type GetServerReportInput = ServerReportPersistenceOptions & {
  reportId: string;
};

function normalizeServerPersistenceId(value: string, label: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`${label} is required for server report persistence.`);
  }

  return normalizedValue;
}

export function createServerReportPersistenceRepository(
  options: ServerReportPersistenceOptions,
) {
  return createDatabaseReportRepository({
    userId: normalizeServerPersistenceId(options.userId, "userId"),
    publication: options.publication,
  });
}

export async function saveServerGeneratedReport({
  userId,
  report,
  publication,
}: SaveServerReportInput): Promise<ReportRecord> {
  const repository = createServerReportPersistenceRepository({
    userId,
    publication,
  });

  return repository.saveReport(report);
}

export async function getServerStoredReport({
  userId,
  reportId,
}: GetServerReportInput): Promise<ReportRecord | null> {
  const repository = createServerReportPersistenceRepository({ userId });

  return repository.getReport(
    normalizeServerPersistenceId(reportId, "reportId"),
  );
}

export async function listServerReportSummaries({
  userId,
}: ServerReportPersistenceOptions): Promise<ReportRecordSummary[]> {
  const repository = createServerReportPersistenceRepository({ userId });
  const records = await repository.listReports();

  return records.map(summarizeReportRecord);
}

export type GetPublicServerReportInput = {
  reportId: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function replaceSensitiveTokens(value: unknown, tokens: string[]): unknown {
  if (typeof value === "string") {
    return tokens.reduce((current, token) => {
      if (token.length < 3) {
        return current;
      }

      return current.replace(
        new RegExp(escapeRegExp(token), "gu"),
        "اطلاعات پنهان",
      );
    }, value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceSensitiveTokens(item, tokens));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        replaceSensitiveTokens(item, tokens),
      ]),
    );
  }

  return value;
}

export function projectPublicReportRecord(
  record: ReportRecord,
): ReportRecord | null {
  const publication = record.publication;

  if (
    !publication ||
    record.visibility !== "public" ||
    publication.policyVersion !== "1" ||
    publication.publicationState !== "public"
  ) {
    return null;
  }

  const policy = evaluateReportPublicationPolicy({
    ownerKind: publication.ownerKind,
    tier: publication.accessTier,
    publicationIntent: publication.publicationIntent,
    publicationConsentState: publication.publicationConsentState,
    identityConsentState: publication.identityConsentState,
    legacyRecord: publication.ownerKind === "legacy",
  });

  if (!policy.publiclyReadable || policy.indexingPolicy !== "indexable") {
    return null;
  }

  const input = record.report.input;
  const identityName = policy.identityPublic ? input.name?.trim() : "";
  const sensitiveTokens = [
    policy.identityPublic ? "" : input.name,
    input.birthDate,
    input.birthTime,
    input.birthCity,
    input.birthCountry,
    input.currentResidenceCity,
    input.currentResidenceCountry,
  ]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean);
  const report = replaceSensitiveTokens(
    record.report,
    sensitiveTokens,
  ) as AstrologyReport;

  report.input = {
    ...(identityName ? { name: identityName } : {}),
    birthDate: "",
    birthTime: "",
    birthCity: "",
    birthCountry: "",
  };

  if (report.realEngine) {
    report.realEngine = {
      ...report.realEngine,
      cityLabel: "پنهان در نمایش عمومی",
      utcIso: "پنهان در نمایش عمومی",
    };
  }

  const reportWithEngineData = report as AstrologyReport & {
    engineData?: {
      personalTransitReportData?: unknown;
      [key: string]: unknown;
    } | null;
  };

  if (reportWithEngineData.engineData?.personalTransitReportData) {
    reportWithEngineData.engineData = {
      ...reportWithEngineData.engineData,
      personalTransitReportData: null,
    };
  }

  return {
    ...record,
    userId: undefined,
    note: undefined,
    favorite: false,
    report,
    input: report.input,
  };
}

export async function getPublicServerStoredReport({
  reportId,
}: GetPublicServerReportInput): Promise<ReportRecord | null> {
  const driver = getReportDatabaseDriver();
  const record = await driver.getPublicReportById(
    normalizeServerPersistenceId(reportId, "reportId"),
  );

  return record ? projectPublicReportRecord(record) : null;
}
