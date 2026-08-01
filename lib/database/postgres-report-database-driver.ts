import postgres from "postgres";

import type {
  DatabaseHealthStatus,
  ReportDatabaseDriver,
} from "@/lib/database/database-driver";
import {
  fromDatabaseReportRow,
  toDatabaseReportRow,
} from "@/lib/database/report-row-mapper";
import type { DatabaseReportRow, ReportRecord } from "@/types/storage";

type RawDatabaseReportRow = Record<string, unknown>;

function nowIso() {
  return new Date().toISOString();
}

function toIsoString(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  return nowIso();
}

function normalizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  const normalized = String(value);

  return allowed.includes(normalized as T) ? (normalized as T) : fallback;
}

function normalizeRow(row: RawDatabaseReportRow): DatabaseReportRow {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    report_json: row.report_json as DatabaseReportRow["report_json"],
    note: typeof row.note === "string" ? row.note : null,
    favorite: Boolean(row.favorite),
    visibility: normalizeEnum(
      row.visibility,
      [
        "private",
        "public",
        "shared_by_link",
        "unpublished",
        "restricted_by_admin",
      ] as const,
      "private",
    ),
    publication_owner_kind: normalizeEnum(
      row.publication_owner_kind,
      ["local", "guest", "account", "legacy"] as const,
      "legacy",
    ),
    access_tier: normalizeEnum(
      row.access_tier,
      ["preview", "free", "premium"] as const,
      "free",
    ),
    publication_intent: normalizeEnum(
      row.publication_intent,
      ["default", "publish", "unpublish"] as const,
      "default",
    ),
    publication_state: normalizeEnum(
      row.publication_state,
      ["private", "public", "unpublished", "restricted"] as const,
      "private",
    ),
    publication_consent_state: normalizeEnum(
      row.publication_consent_state,
      ["not-required", "pending", "granted", "withdrawn"] as const,
      "pending",
    ),
    identity_consent_state: normalizeEnum(
      row.identity_consent_state,
      ["withheld", "granted"] as const,
      "withheld",
    ),
    publication_policy_version: "1",
    created_at: toIsoString(row.created_at),
    updated_at: toIsoString(row.updated_at),
  };
}

function createHealthStatus(
  ok: boolean,
  message: string,
): DatabaseHealthStatus {
  return {
    ok,
    driver: "postgres",
    checkedAt: nowIso(),
    message,
  };
}

export function createPostgresReportDatabaseDriver(
  databaseUrl: string,
): ReportDatabaseDriver {
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
    prepare: false,
  });

  return {
    async healthCheck() {
      try {
        await sql`select 1 as ok`;

        return createHealthStatus(true, "Postgres database driver is configured.");
      } catch (error) {
        return createHealthStatus(
          false,
          error instanceof Error
            ? error.message
            : "Postgres database health check failed.",
        );
      }
    },

    async listReportsByUser(userId: string) {
      const rows = await sql`
        select
          id,
          user_id,
          report_json,
          note,
          favorite,
          visibility,
          publication_owner_kind,
          access_tier,
          publication_intent,
          publication_state,
          publication_consent_state,
          identity_consent_state,
          publication_policy_version,
          created_at::text as created_at,
          updated_at::text as updated_at
        from halleus_reports
        where user_id = ${userId}
        order by created_at desc
      `;

      return rows.map((row) => fromDatabaseReportRow(normalizeRow(row)));
    },

    async getReportById(userId: string, reportId: string) {
      const rows = await sql`
        select
          id,
          user_id,
          report_json,
          note,
          favorite,
          visibility,
          publication_owner_kind,
          access_tier,
          publication_intent,
          publication_state,
          publication_consent_state,
          identity_consent_state,
          publication_policy_version,
          created_at::text as created_at,
          updated_at::text as updated_at
        from halleus_reports
        where user_id = ${userId} and id = ${reportId}
        limit 1
      `;

      const row = rows[0];

      return row ? fromDatabaseReportRow(normalizeRow(row)) : null;
    },

    async getPublicReportById(reportId: string) {
      const rows = await sql`
        select
          id,
          user_id,
          report_json,
          null::text as note,
          favorite,
          visibility,
          publication_owner_kind,
          access_tier,
          publication_intent,
          publication_state,
          publication_consent_state,
          identity_consent_state,
          publication_policy_version,
          created_at::text as created_at,
          updated_at::text as updated_at
        from halleus_reports
        where id = ${reportId}
          and visibility = 'public'
          and publication_state = 'public'
          and restricted_at is null
          and deleted_at is null
        limit 1
      `;

      const row = rows[0];

      return row ? fromDatabaseReportRow(normalizeRow(row)) : null;
    },

    async upsertReport(userId: string, record: ReportRecord) {
      const row = toDatabaseReportRow(userId, record);

      const rows = await sql`
        insert into halleus_reports (
          id,
          user_id,
          report_json,
          note,
          favorite,
          visibility,
          publication_owner_kind,
          access_tier,
          publication_intent,
          publication_state,
          publication_consent_state,
          identity_consent_state,
          publication_policy_version,
          source,
          created_at,
          updated_at
        )
        values (
          ${row.id},
          ${row.user_id},
          ${sql.json(row.report_json)},
          ${row.note},
          ${row.favorite},
          ${row.visibility},
          ${row.publication_owner_kind},
          ${row.access_tier},
          ${row.publication_intent},
          ${row.publication_state},
          ${row.publication_consent_state},
          ${row.identity_consent_state},
          ${row.publication_policy_version},
          ${record.source},
          ${row.created_at},
          ${row.updated_at}
        )
        on conflict (id) do update set
          report_json = excluded.report_json,
          note = excluded.note,
          favorite = excluded.favorite,
          visibility = excluded.visibility,
          publication_owner_kind = excluded.publication_owner_kind,
          access_tier = excluded.access_tier,
          publication_intent = excluded.publication_intent,
          publication_state = excluded.publication_state,
          publication_consent_state = excluded.publication_consent_state,
          identity_consent_state = excluded.identity_consent_state,
          publication_policy_version = excluded.publication_policy_version,
          source = excluded.source,
          updated_at = excluded.updated_at
        where halleus_reports.user_id = ${userId}
        returning
          id,
          user_id,
          report_json,
          note,
          favorite,
          visibility,
          publication_owner_kind,
          access_tier,
          publication_intent,
          publication_state,
          publication_consent_state,
          identity_consent_state,
          publication_policy_version,
          created_at::text as created_at,
          updated_at::text as updated_at
      `;

      const savedRow = rows[0];

      if (!savedRow) {
        throw new Error("Report could not be saved for the current user.");
      }

      return fromDatabaseReportRow(normalizeRow(savedRow));
    },

    async deleteReport(userId: string, reportId: string) {
      await sql`
        delete from halleus_reports
        where user_id = ${userId} and id = ${reportId}
      `;
    },
  };
}
