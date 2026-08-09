import {
  asBoolean,
  asNullableString,
  asNumber,
  asRecord,
  asString,
  getAdminDatabase,
} from "@/lib/admin/admin-database";
import { setSupabaseAccountSuspended } from "@/lib/admin/admin-supabase";
import type {
  AdminAuditEventSummary,
  AdminOverviewPayload,
  AdminPremiumRequestSummary,
  AdminReportSummary,
  AdminUserSummary,
} from "@/lib/admin/admin-types";
import {
  AdminAccessError,
  type VerifiedAdminActor,
} from "@/lib/admin/admin-auth";
import { validateReportTitle } from "@/lib/reports/report-access-contract";

type AuditInput = {
  actor: VerifiedAdminActor | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  beforeSummary?: Record<string, unknown> | null;
  afterSummary?: Record<string, unknown> | null;
  reason?: string | null;
  success: boolean;
  correlationId?: string;
};

export async function recordAdminAuditEvent(input: AuditInput) {
  const sql = getAdminDatabase();
  await sql`
    insert into halleus_private.admin_audit_events (
      actor_user_id,
      actor_role,
      action,
      target_type,
      target_id,
      before_summary,
      after_summary,
      reason,
      success,
      request_correlation_id
    )
    values (
      ${input.actor?.userId ?? null}::uuid,
      ${input.actor?.role ?? null},
      ${input.action},
      ${input.targetType},
      ${input.targetId ?? null},
      ${input.beforeSummary ? JSON.stringify(input.beforeSummary) : null}::jsonb,
      ${input.afterSummary ? JSON.stringify(input.afterSummary) : null}::jsonb,
      ${input.reason ?? null},
      ${input.success},
      ${input.correlationId ?? input.actor?.correlationId ?? crypto.randomUUID()}
    )
  `;
}

async function safeFailureAudit(
  input: Omit<AuditInput, "success">,
  error: unknown,
) {
  try {
    await recordAdminAuditEvent({
      ...input,
      success: false,
      afterSummary: {
        error:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Unknown admin operation failure.",
      },
    });
  } catch {
    // Preserve the original operation error. Audit health is visible separately.
  }
}

export async function getAdminOverview(): Promise<AdminOverviewPayload> {
  const sql = getAdminDatabase();
  const rows = await sql`
    select
      (select count(*) from public.halleus_users)::int as users,
      (select count(*) from public.halleus_reports)::int as reports,
      (select count(*) from public.halleus_reports where visibility = 'public')::int as public_reports,
      (select count(*) from public.halleus_reports where visibility <> 'public')::int as private_reports,
      (
        select count(*)
        from halleus_private.premium_requests
        where status not in ('delivered', 'canceled')
      )::int as open_premium_requests,
      (
        select count(*)
        from halleus_private.admin_audit_events
        where created_at >= now() - interval '24 hours'
      )::int as audit_events_24h
  `;
  const row = asRecord(rows[0]);

  return {
    users: asNumber(row.users),
    reports: asNumber(row.reports),
    publicReports: asNumber(row.public_reports),
    privateReports: asNumber(row.private_reports),
    openPremiumRequests: asNumber(row.open_premium_requests),
    auditEvents24h: asNumber(row.audit_events_24h),
  };
}

export async function listAdminUsers(
  search: string,
  limit: number,
  page = 1,
): Promise<AdminUserSummary[]> {
  const sql = getAdminDatabase();
  const query = search ? `%${search}%` : null;
  const offset = (Math.max(1, page) - 1) * limit;
  const rows = await sql`
    select
      u.id,
      u.email,
      u.display_name,
      u.status,
      u.plan,
      u.created_at::text as created_at,
      a.last_sign_in_at::text as last_sign_in_at,
      count(r.id)::int as report_count,
      max(r.created_at)::text as last_report_at,
      (
        select n.body
        from halleus_private.admin_notes n
        where n.target_type = 'user' and n.target_id = u.id
        order by n.created_at desc
        limit 1
      ) as latest_note
    from public.halleus_users u
    left join auth.users a on a.id::text = u.id
    left join public.halleus_reports r on r.user_id = u.id
    where (
      ${query}::text is null
      or u.id ilike ${query}
      or coalesce(u.email, '') ilike ${query}
      or coalesce(u.display_name, '') ilike ${query}
    )
    group by u.id, u.email, u.display_name, u.status, u.plan, u.created_at, a.last_sign_in_at
    order by u.created_at desc
    limit ${limit}
    offset ${offset}
  `;

  return rows.map((raw) => {
    const row = asRecord(raw);
    return {
      id: asString(row.id),
      email: asNullableString(row.email),
      displayName: asNullableString(row.display_name),
      status: asString(row.status),
      plan: asString(row.plan),
      reportCount: asNumber(row.report_count),
      lastReportAt: asNullableString(row.last_report_at),
      lastSignInAt: asNullableString(row.last_sign_in_at),
      createdAt: asString(row.created_at),
      latestNote: asNullableString(row.latest_note),
    };
  });
}

export async function setAdminUserStatus(input: {
  actor: VerifiedAdminActor;
  userId: string;
  status: "active" | "suspended";
  reason: string;
}) {
  const sql = getAdminDatabase();
  let previousStatus = "";
  let supabaseChanged = false;

  try {
    const beforeRows = await sql`
      select status
      from public.halleus_users
      where id = ${input.userId}
      limit 1
    `;
    const before = asRecord(beforeRows[0]);
    previousStatus = asString(before.status);

    if (!previousStatus) {
      throw new AdminAccessError(404, "User was not found.");
    }

    if (input.actor.userId === input.userId && input.status === "suspended") {
      throw new AdminAccessError(409, "An admin cannot suspend their own account.");
    }

    const ownerRows = await sql`
      select role, status
      from halleus_private.admin_memberships
      where user_id::text = ${input.userId}
      limit 1
    `;
    const targetMembership = asRecord(ownerRows[0]);
    if (
      input.status === "suspended" &&
      targetMembership.role === "owner" &&
      targetMembership.status === "active"
    ) {
      throw new AdminAccessError(409, "An active owner account cannot be suspended here.");
    }

    const shouldSuspend = input.status === "suspended";
    await setSupabaseAccountSuspended(input.userId, shouldSuspend);
    supabaseChanged = true;

    await sql.begin(async (tx) => {
      await tx`
        update public.halleus_users
        set status = ${input.status}, updated_at = now()
        where id = ${input.userId}
      `;
      await tx`
        insert into halleus_private.admin_audit_events (
          actor_user_id, actor_role, action, target_type, target_id,
          before_summary, after_summary, reason, success, request_correlation_id
        )
        values (
          ${input.actor.userId}::uuid,
          ${input.actor.role},
          'admin.user.status_changed',
          'user',
          ${input.userId},
          ${tx.json({ status: previousStatus })},
          ${tx.json({ status: input.status })},
          ${input.reason},
          true,
          ${input.actor.correlationId}
        )
      `;
    });
  } catch (error) {
    if (supabaseChanged && previousStatus) {
      try {
        await setSupabaseAccountSuspended(
          input.userId,
          previousStatus === "suspended",
        );
      } catch {
        // The original error is still the primary failure.
      }
    }
    await safeFailureAudit(
      {
        actor: input.actor,
        action: "admin.user.status_changed",
        targetType: "user",
        targetId: input.userId,
        beforeSummary: previousStatus ? { status: previousStatus } : null,
        reason: input.reason,
      },
      error,
    );
    throw error;
  }
}

export async function addAdminUserNote(input: {
  actor: VerifiedAdminActor;
  userId: string;
  body: string;
}) {
  const sql = getAdminDatabase();
  try {
    await sql.begin(async (tx) => {
      await tx`
        insert into halleus_private.admin_notes (
          target_type, target_id, body, created_by
        )
        values ('user', ${input.userId}, ${input.body}, ${input.actor.userId}::uuid)
      `;
      await tx`
        insert into halleus_private.admin_audit_events (
          actor_user_id, actor_role, action, target_type, target_id,
          after_summary, reason, success, request_correlation_id
        )
        values (
          ${input.actor.userId}::uuid,
          ${input.actor.role},
          'admin.user.note_added',
          'user',
          ${input.userId},
          ${tx.json({ noteLength: input.body.length })},
          'Internal support note added.',
          true,
          ${input.actor.correlationId}
        )
      `;
    });
  } catch (error) {
    await safeFailureAudit(
      {
        actor: input.actor,
        action: "admin.user.note_added",
        targetType: "user",
        targetId: input.userId,
        reason: "Internal support note failed.",
      },
      error,
    );
    throw error;
  }
}

export async function listAdminReports(
  search: string,
  limit: number,
  page = 1,
): Promise<AdminReportSummary[]> {
  const sql = getAdminDatabase();
  const query = search ? `%${search}%` : null;
  const offset = (Math.max(1, page) - 1) * limit;
  const rows = await sql`
    select
      r.id,
      r.user_id,
      r.visibility,
      r.source,
      coalesce(r.title, r.report_json #>> '{input,name}', 'گزارش ذخیره‌شده') as title,
      u.display_name as owner_display_name,
      coalesce(
        r.report_json #>> '{access,tier}',
        r.report_json ->> 'tier',
        'unknown'
      ) as access_tier,
      coalesce(
        r.report_json #>> '{engineData,engineVersion}',
        r.report_json #>> '{chart,engineVersion}',
        r.report_json ->> 'engineVersion'
      ) as engine_version,
      coalesce(
        r.report_json #>> '{metadata,reportVersion}',
        r.report_json ->> 'reportVersion'
      ) as report_version,
      coalesce(
        r.report_json #>> '{publication,consentState}',
        r.report_json ->> 'publicationConsentState',
        'unknown'
      ) as publication_consent_state,
      r.created_at::text as created_at,
      r.updated_at::text as updated_at
    from public.halleus_reports r
    left join public.halleus_users u on u.id = r.user_id
    where r.deleted_at is null and (
      ${query}::text is null
      or r.id ilike ${query}
      or r.user_id ilike ${query}
      or r.source ilike ${query}
      or coalesce(r.title, '') ilike ${query}
      or coalesce(u.display_name, '') ilike ${query}
    )
    order by r.created_at desc
    limit ${limit}
    offset ${offset}
  `;

  return rows.map((raw) => {
    const row = asRecord(raw);
    return {
      id: asString(row.id),
      title: asString(row.title),
      ownerUserId: asString(row.user_id),
      ownerDisplayName: asNullableString(row.owner_display_name),
      visibility: ["public", "shared_by_link", "unpublished", "restricted_by_admin"].includes(asString(row.visibility))
        ? asString(row.visibility) as AdminReportSummary["visibility"]
        : "private",
      source: asString(row.source),
      accessTier: asString(row.access_tier),
      engineVersion: asNullableString(row.engine_version),
      reportVersion: asNullableString(row.report_version),
      publicationConsentState: asString(row.publication_consent_state),
      indexable: false,
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    };
  });
}

export async function restrictAdminReportVisibility(input: {
  actor: VerifiedAdminActor;
  reportId: string;
  reason: string;
}) {
  const sql = getAdminDatabase();

  try {
    await sql.begin(async (tx) => {
      const rows = await tx`
        select visibility, publication_state
        from public.halleus_reports
        where id = ${input.reportId}
        for update
      `;
      const before = asRecord(rows[0]);
      if (!before.visibility) {
        throw new AdminAccessError(404, "Report was not found.");
      }

      await tx`
        update public.halleus_reports
        set visibility = 'restricted_by_admin',
            publication_state = 'restricted',
            share_enabled = false,
            share_token_hash = null,
            restricted_at = now(),
            restricted_by = ${input.actor.userId}::uuid,
            restriction_reason = ${input.reason},
            updated_at = now()
        where id = ${input.reportId}
      `;

      await tx`
        insert into halleus_private.admin_audit_events (
          actor_user_id, actor_role, action, target_type, target_id,
          before_summary, after_summary, reason, success, request_correlation_id
        )
        values (
          ${input.actor.userId}::uuid,
          ${input.actor.role},
          'admin.report.visibility_restricted',
          'report',
          ${input.reportId},
          ${tx.json({ visibility: asString(before.visibility) })},
          ${tx.json({ visibility: "restricted_by_admin" })},
          ${input.reason},
          true,
          ${input.actor.correlationId}
        )
      `;
    });
  } catch (error) {
    await safeFailureAudit(
      {
        actor: input.actor,
        action: "admin.report.visibility_restricted",
        targetType: "report",
        targetId: input.reportId,
        reason: input.reason,
      },
      error,
    );
    throw error;
  }
}

export async function updateAdminReportTitle(input: { actor: VerifiedAdminActor; reportId: string; title: unknown; reason: string }) {
  const sql = getAdminDatabase();
  const title = validateReportTitle(input.title);
  const rows = await sql`update public.halleus_reports set title = ${title}, updated_at = now() where id = ${input.reportId} and deleted_at is null returning id`;
  if (!rows.length) throw new AdminAccessError(404, "Report was not found.");
  await recordAdminAuditEvent({ actor: input.actor, action: "admin.report.title_updated", targetType: "report", targetId: input.reportId, afterSummary: { titleLength: title.length }, reason: input.reason, success: true });
}

export async function softDeleteAdminReport(input: { actor: VerifiedAdminActor; reportId: string; reason: string }) {
  const sql = getAdminDatabase();
  const rows = await sql`update public.halleus_reports set deleted_at = now(), deleted_by = ${input.actor.userId}::uuid, delete_reason = ${input.reason}, visibility = 'unpublished', publication_intent = 'unpublish', publication_state = 'unpublished', publication_consent_state = case when access_tier = 'premium' then 'withdrawn' else 'not-required' end, share_enabled = false, share_token_hash = null, updated_at = now() where id = ${input.reportId} and deleted_at is null returning id`;
  if (!rows.length) throw new AdminAccessError(404, "Report was not found.");
  await recordAdminAuditEvent({ actor: input.actor, action: "admin.report.soft_deleted", targetType: "report", targetId: input.reportId, reason: input.reason, success: true });
}

export async function getAdminPrivateReportContent(input: {
  actor: VerifiedAdminActor;
  reportId: string;
  reason: string;
}) {
  const sql = getAdminDatabase();

  try {
    const rows = await sql`
      select id, user_id, visibility, report_json
      from public.halleus_reports
      where id = ${input.reportId}
      limit 1
    `;
    const row = asRecord(rows[0]);
    if (!row.id) {
      throw new AdminAccessError(404, "Report was not found.");
    }

    await recordAdminAuditEvent({
      actor: input.actor,
      action: "admin.report.private_content_viewed",
      targetType: "report",
      targetId: input.reportId,
      afterSummary: {
        ownerUserId: asString(row.user_id),
        visibility: asString(row.visibility),
      },
      reason: input.reason,
      success: true,
    });

    return {
      id: asString(row.id),
      ownerUserId: asString(row.user_id),
      visibility: asString(row.visibility),
      report: row.report_json,
    };
  } catch (error) {
    await safeFailureAudit(
      {
        actor: input.actor,
        action: "admin.report.private_content_viewed",
        targetType: "report",
        targetId: input.reportId,
        reason: input.reason,
      },
      error,
    );
    throw error;
  }
}

export async function getAdminReportCustomerContact(input: { actor: VerifiedAdminActor; reportId: string; reason: string }) {
  const sql = getAdminDatabase();
  const rows = await sql`
    select u.display_name, u.email, a.phone
    from public.halleus_reports r
    join public.halleus_users u on u.id = r.user_id
    left join auth.users a on a.id::text = u.id
    where r.id = ${input.reportId} and r.deleted_at is null
    limit 1
  `;
  const row = asRecord(rows[0]);
  if (!rows.length) throw new AdminAccessError(404, "Report was not found.");
  await recordAdminAuditEvent({ actor: input.actor, action: "admin.report.customer_contact_viewed", targetType: "report", targetId: input.reportId, afterSummary: { hasPhone: Boolean(row.phone), hasEmail: Boolean(row.email) }, reason: input.reason, success: true });
  return { displayName: asNullableString(row.display_name), email: asNullableString(row.email), phone: asNullableString(row.phone) };
}

export async function createPremiumRequest(input: {
  userId: string | null;
  contactName: string;
  contactValue: string;
  requestedProduct: string;
  linkedReportId: string | null;
  customerNotes: string | null;
  publicationChoice: "not_requested" | "private" | "public_with_consent";
}) {
  const sql = getAdminDatabase();
  const correlationId = crypto.randomUUID();

  return sql.begin(async (tx) => {
    const rows = await tx`
      insert into halleus_private.premium_requests (
        user_id,
        contact_name,
        contact_value,
        requested_product,
        linked_report_id,
        customer_notes,
        publication_choice
      )
      values (
        ${input.userId}::uuid,
        ${input.contactName},
        ${input.contactValue},
        ${input.requestedProduct},
        ${input.linkedReportId},
        ${input.customerNotes},
        ${input.publicationChoice}
      )
      returning id::text as id, status, created_at::text as created_at
    `;
    const row = asRecord(rows[0]);

    await tx`
      insert into halleus_private.admin_audit_events (
        actor_user_id, actor_role, action, target_type, target_id,
        after_summary, reason, success, request_correlation_id
      )
      values (
        ${input.userId}::uuid,
        ${input.userId ? "user" : "guest"},
        'premium_request.created',
        'premium_request',
        ${asString(row.id)},
        ${tx.json({
          requestedProduct: input.requestedProduct,
          linkedReport: Boolean(input.linkedReportId),
          publicationChoice: input.publicationChoice,
        })},
        'Premium request intake.',
        true,
        ${correlationId}
      )
    `;

    return {
      id: asString(row.id),
      status: asString(row.status),
      createdAt: asString(row.created_at),
    };
  });
}

export async function listPremiumRequests(
  limit: number,
  page = 1,
): Promise<AdminPremiumRequestSummary[]> {
  const sql = getAdminDatabase();
  const offset = (Math.max(1, page) - 1) * limit;
  const rows = await sql`
    select
      id::text as id,
      user_id::text as user_id,
      contact_name,
      contact_value,
      requested_product,
      linked_report_id,
      customer_notes,
      internal_notes,
      status,
      agreed_amount::text as agreed_amount,
      due_date::text as due_date,
      delivery_status,
      publication_choice,
      created_at::text as created_at,
      updated_at::text as updated_at
    from halleus_private.premium_requests
    order by
      case status
        when 'new' then 1
        when 'reviewing' then 2
        when 'approved' then 3
        when 'preparing' then 4
        else 5
      end,
      created_at desc
    limit ${limit}
    offset ${offset}
  `;

  return rows.map((raw) => {
    const row = asRecord(raw);
    const status = asString(row.status) as AdminPremiumRequestSummary["status"];
    const deliveryStatus = asString(
      row.delivery_status,
    ) as AdminPremiumRequestSummary["deliveryStatus"];
    const publicationChoice = asString(
      row.publication_choice,
    ) as AdminPremiumRequestSummary["publicationChoice"];

    return {
      id: asString(row.id),
      userId: asNullableString(row.user_id),
      contactName: asString(row.contact_name),
      contactValue: asString(row.contact_value),
      requestedProduct: asString(row.requested_product),
      linkedReportId: asNullableString(row.linked_report_id),
      customerNotes: asNullableString(row.customer_notes),
      internalNotes: asNullableString(row.internal_notes),
      status,
      agreedAmount: asNullableString(row.agreed_amount),
      dueDate: asNullableString(row.due_date),
      deliveryStatus,
      publicationChoice,
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    };
  });
}

export async function updatePremiumRequest(input: {
  actor: VerifiedAdminActor;
  requestId: string;
  status: AdminPremiumRequestSummary["status"];
  deliveryStatus: AdminPremiumRequestSummary["deliveryStatus"];
  internalNotes: string | null;
  agreedAmount: string | null;
  dueDate: string | null;
  linkedReportId: string | null;
  reason: string;
}) {
  const sql = getAdminDatabase();

  try {
    await sql.begin(async (tx) => {
      const beforeRows = await tx`
        select
          status,
          delivery_status,
          agreed_amount::text as agreed_amount,
          due_date::text as due_date,
          linked_report_id
        from halleus_private.premium_requests
        where id = ${input.requestId}::bigint
        for update
      `;
      const before = asRecord(beforeRows[0]);
      if (!before.status) {
        throw new AdminAccessError(404, "Premium request was not found.");
      }

      const amount =
        input.agreedAmount === null ? null : Number(input.agreedAmount);
      if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
        throw new AdminAccessError(400, "Agreed amount must be a non-negative number.");
      }

      await tx`
        update halleus_private.premium_requests
        set status = ${input.status},
            delivery_status = ${input.deliveryStatus},
            internal_notes = ${input.internalNotes},
            agreed_amount = ${amount},
            due_date = ${input.dueDate},
            linked_report_id = ${input.linkedReportId},
            updated_at = now()
        where id = ${input.requestId}::bigint
      `;

      await tx`
        insert into halleus_private.admin_audit_events (
          actor_user_id, actor_role, action, target_type, target_id,
          before_summary, after_summary, reason, success, request_correlation_id
        )
        values (
          ${input.actor.userId}::uuid,
          ${input.actor.role},
          'admin.premium_request.updated',
          'premium_request',
          ${input.requestId},
          ${tx.json({
            status: asString(before.status),
            deliveryStatus: asString(before.delivery_status),
            agreedAmount: asNullableString(before.agreed_amount),
            dueDate: asNullableString(before.due_date),
            linkedReportId: asNullableString(before.linked_report_id),
          })},
          ${tx.json({
            status: input.status,
            deliveryStatus: input.deliveryStatus,
            agreedAmount: input.agreedAmount,
            dueDate: input.dueDate,
            linkedReportId: input.linkedReportId,
            internalNoteLength: input.internalNotes?.length ?? 0,
          })},
          ${input.reason},
          true,
          ${input.actor.correlationId}
        )
      `;
    });
  } catch (error) {
    await safeFailureAudit(
      {
        actor: input.actor,
        action: "admin.premium_request.updated",
        targetType: "premium_request",
        targetId: input.requestId,
        reason: input.reason,
      },
      error,
    );
    throw error;
  }
}

export async function listAdminAuditEvents(
  limit: number,
  page = 1,
): Promise<AdminAuditEventSummary[]> {
  const sql = getAdminDatabase();
  const offset = (Math.max(1, page) - 1) * limit;
  const rows = await sql`
    select
      id::text as id,
      actor_user_id::text as actor_user_id,
      actor_role,
      action,
      target_type,
      target_id,
      reason,
      success,
      request_correlation_id,
      created_at::text as created_at
    from halleus_private.admin_audit_events
    order by created_at desc
    limit ${limit}
    offset ${offset}
  `;

  return rows.map((raw) => {
    const row = asRecord(raw);
    return {
      id: asString(row.id),
      actorUserId: asNullableString(row.actor_user_id),
      actorRole: asNullableString(row.actor_role),
      action: asString(row.action),
      targetType: asString(row.target_type),
      targetId: asNullableString(row.target_id),
      reason: asNullableString(row.reason),
      success: asBoolean(row.success),
      requestCorrelationId: asString(row.request_correlation_id),
      createdAt: asString(row.created_at),
    };
  });
}
