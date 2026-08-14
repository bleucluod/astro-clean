import {
  asBoolean,
  asNullableString,
  asNumber,
  asRecord,
  asString,
  getAdminDatabase,
} from "@/lib/admin/admin-database";
import {
  DEFAULT_REPORT_ACCESS_POLICY,
  normalizeReportAccessPolicy,
  type ReportAccessPolicy,
} from "@/lib/monetization/access-policy";
import {
  DEFAULT_PRODUCT_PACKAGES,
  type HalleusCreditType,
  type HalleusProductPackage,
} from "@/lib/monetization/product-catalog";
import type {
  AccountCreditBalances,
  AccountProductAccess,
} from "@/lib/monetization/product-access-contract";

export class ProductCreditError extends Error {
  constructor(
    public readonly code:
      | "credit_required"
      | "report_not_owned"
      | "invalid_request"
      | "package_not_found",
    message: string,
  ) {
    super(message);
    this.name = "ProductCreditError";
  }
}

function mapPackage(raw: unknown): HalleusProductPackage {
  const row = asRecord(raw);
  const priceMinor = asNumber(row.price_minor);
  return {
    code: asString(row.code),
    name: asString(row.name),
    active: asBoolean(row.active),
    priceMinor,
    currency: "IRR",
    fullReportCredits: asNumber(row.full_report_credits),
    relationshipCredits: asNumber(row.relationship_credits),
    displayOrder: asNumber(row.display_order),
    badge: asNullableString(row.badge),
    cta: asString(row.cta),
    description: asString(row.description),
    shortLabel: asString(row.name),
    promise: asString(row.description),
    testPriceToman: Math.round(priceMinor / 10),
    priceMode: "configured",
  };
}

async function readBalances(userId: string): Promise<AccountCreditBalances> {
  const sql = getAdminDatabase();
  try {
    const rows = await sql`
      select credit_type, balance
      from halleus_private.account_credit_balances
      where user_id = ${userId}::uuid
    `;
    const balances: AccountCreditBalances = {
      fullReport: 0,
      relationship: 0,
    };
    for (const raw of rows) {
      const row = asRecord(raw);
      if (row.credit_type === "full_report_credit") {
        balances.fullReport = asNumber(row.balance);
      }
      if (row.credit_type === "relationship_credit") {
        balances.relationship = asNumber(row.balance);
      }
    }
    return balances;
  } catch {
    return { fullReport: 0, relationship: 0 };
  }
}

export async function getReportAccessPolicy(): Promise<ReportAccessPolicy> {
  const sql = getAdminDatabase();
  try {
    const rows = await sql`
      select version, config
      from halleus_private.report_access_policy
      where singleton_id = 1
      limit 1
    `;
    if (!rows.length) return DEFAULT_REPORT_ACCESS_POLICY;
    const row = asRecord(rows[0]);
    return normalizeReportAccessPolicy(row.config, asNumber(row.version));
  } catch {
    return DEFAULT_REPORT_ACCESS_POLICY;
  }
}

export async function getProductPackages(input?: {
  activeOnly?: boolean;
}): Promise<HalleusProductPackage[]> {
  const sql = getAdminDatabase();
  try {
    const rows = input?.activeOnly
      ? await sql`
          select *
          from halleus_private.product_packages
          where active = true
          order by display_order asc, code asc
        `
      : await sql`
          select *
          from halleus_private.product_packages
          order by display_order asc, code asc
        `;
    return rows.map(mapPackage);
  } catch {
    return DEFAULT_PRODUCT_PACKAGES
      .filter((item) => !input?.activeOnly || item.active)
      .map((item) => ({ ...item }));
  }
}

export async function getProductPackageByCode(
  code: string,
): Promise<HalleusProductPackage | null> {
  const packages = await getProductPackages();
  return packages.find((item) => item.code === code) ?? null;
}

export async function getAccountProductAccess(
  userId: string | null,
  reportId?: string | null,
): Promise<AccountProductAccess> {
  const [policy, activePackages] = await Promise.all([
    getReportAccessPolicy(),
    getProductPackages({ activeOnly: true }),
  ]);
  if (!userId) {
    return {
      authenticated: false,
      balances: { fullReport: 0, relationship: 0 },
      reportUnlocked: false,
      policy,
      activePackages,
    };
  }

  const balances = await readBalances(userId);
  let reportUnlocked = false;
  if (reportId) {
    const sql = getAdminDatabase();
    try {
      const rows = await sql`
        select 1
        from halleus_private.report_unlocks
        where user_id = ${userId}::uuid and report_id = ${reportId}
        limit 1
      `;
      reportUnlocked = rows.length > 0;
    } catch {
      reportUnlocked = false;
    }
  }

  return {
    authenticated: true,
    balances,
    reportUnlocked,
    policy,
    activePackages,
  };
}

// HALLEUS_ATOMIC_REPORT_CREDIT_CONSUME_R1
export async function unlockReportWithCredit(input: {
  userId: string;
  reportId: string;
  idempotencyKey: string;
}) {
  if (!input.reportId.trim() || !input.idempotencyKey.trim()) {
    throw new ProductCreditError(
      "invalid_request",
      "Report unlock request is incomplete.",
    );
  }
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    const reportRows = await tx`
      select id::text as id
      from public.halleus_reports
      where id = ${input.reportId}
        and user_id::text = ${input.userId}
        and deleted_at is null
        and restricted_at is null
      for update
    `;
    if (!reportRows.length) {
      throw new ProductCreditError(
        "report_not_owned",
        "این گزارش روی حساب فعلی پیدا نشد.",
      );
    }

    const existing = await tx`
      select 1
      from halleus_private.report_unlocks
      where user_id = ${input.userId}::uuid and report_id = ${input.reportId}
      limit 1
    `;
    if (existing.length) {
      const balances = await tx`
        select balance
        from halleus_private.account_credit_balances
        where user_id = ${input.userId}::uuid
          and credit_type = 'full_report_credit'
      `;
      return {
        unlocked: true,
        consumed: false,
        balance: balances.length ? asNumber(balances[0].balance) : 0,
      };
    }

    await tx`
      insert into halleus_private.account_credit_balances (
        user_id, credit_type, balance
      )
      values (${input.userId}::uuid, 'full_report_credit', 0)
      on conflict (user_id, credit_type) do nothing
    `;

    const updated = await tx`
      update halleus_private.account_credit_balances
      set balance = balance - 1, updated_at = now()
      where user_id = ${input.userId}::uuid
        and credit_type = 'full_report_credit'
        and balance > 0
      returning balance
    `;
    if (!updated.length) {
      throw new ProductCreditError(
        "credit_required",
        "برای بازکردن این گزارش یک اعتبار گزارش کامل لازم است.",
      );
    }

    const ledgerRows = await tx`
      insert into halleus_private.credit_ledger (
        user_id, credit_type, delta, balance_after,
        source, reason, related_report_id, idempotency_key
      )
      values (
        ${input.userId}::uuid, 'full_report_credit', -1,
        ${asNumber(updated[0].balance)}, 'report_unlock',
        'One full-report credit consumed for permanent report unlock.',
        ${input.reportId}, ${input.idempotencyKey}
      )
      returning id::text as id
    `;
    const ledgerId = asString(ledgerRows[0].id);

    await tx`
      insert into halleus_private.report_unlocks (
        user_id, report_id, consume_ledger_id
      )
      values (
        ${input.userId}::uuid, ${input.reportId}, ${ledgerId}::bigint
      )
    `;

    await tx`
      update public.halleus_reports
      set access_tier = 'premium',
          visibility = 'private',
          publication_intent = 'default',
          publication_state = 'private',
          publication_consent_state = 'pending',
          share_enabled = false,
          share_token_hash = null,
          updated_at = now()
      where id = ${input.reportId}
        and user_id::text = ${input.userId}
        and visibility <> 'restricted_by_admin'
    `;

    return {
      unlocked: true,
      consumed: true,
      balance: asNumber(updated[0].balance),
    };
  });
}

// HALLEUS_ATOMIC_RELATIONSHIP_CREDIT_CONSUME_R1
export async function consumeRelationshipCredit(input: {
  userId: string;
  resultKey: string;
  idempotencyKey: string;
}) {
  if (!input.resultKey.trim() || !input.idempotencyKey.trim()) {
    throw new ProductCreditError(
      "invalid_request",
      "Relationship credit request is incomplete.",
    );
  }
  const sql = getAdminDatabase();

  return sql.begin(async (tx) => {
    await tx`
      select pg_advisory_xact_lock(
        hashtextextended(
          ${`relationship:${input.userId}:${input.resultKey}`},
          0
        )
      )
    `;

    const existing = await tx`
      select 1
      from halleus_private.relationship_unlocks
      where user_id = ${input.userId}::uuid
        and result_key = ${input.resultKey}
      limit 1
    `;
    if (existing.length) {
      const balances = await tx`
        select balance
        from halleus_private.account_credit_balances
        where user_id = ${input.userId}::uuid
          and credit_type = 'relationship_credit'
      `;
      return {
        consumed: false,
        balance: balances.length ? asNumber(balances[0].balance) : 0,
      };
    }

    await tx`
      insert into halleus_private.account_credit_balances (
        user_id, credit_type, balance
      )
      values (${input.userId}::uuid, 'relationship_credit', 0)
      on conflict (user_id, credit_type) do nothing
    `;

    const updated = await tx`
      update halleus_private.account_credit_balances
      set balance = balance - 1, updated_at = now()
      where user_id = ${input.userId}::uuid
        and credit_type = 'relationship_credit'
        and balance > 0
      returning balance
    `;
    if (!updated.length) {
      throw new ProductCreditError(
        "credit_required",
        "برای ساخت تحلیل رابطه تازه یک اعتبار تحلیل رابطه لازم است.",
      );
    }

    const ledgerRows = await tx`
      insert into halleus_private.credit_ledger (
        user_id, credit_type, delta, balance_after,
        source, reason, relationship_result_key, idempotency_key
      )
      values (
        ${input.userId}::uuid, 'relationship_credit', -1,
        ${asNumber(updated[0].balance)}, 'relationship_create',
        'One relationship credit consumed for a new private result.',
        ${input.resultKey}, ${input.idempotencyKey}
      )
      returning id::text as id
    `;
    const ledgerId = asString(ledgerRows[0].id);

    await tx`
      insert into halleus_private.relationship_unlocks (
        user_id, result_key, consume_ledger_id
      )
      values (
        ${input.userId}::uuid, ${input.resultKey}, ${ledgerId}::bigint
      )
    `;

    return {
      consumed: true,
      balance: asNumber(updated[0].balance),
    };
  });
}

export async function saveReportAccessPolicy(input: {
  config: unknown;
  actorUserId: string;
}) {
  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const rows = await tx`
      select version
      from halleus_private.report_access_policy
      where singleton_id = 1
      for update
    `;
    const nextVersion = (rows.length ? asNumber(rows[0].version) : 0) + 1;
    const policy = normalizeReportAccessPolicy(input.config, nextVersion);
    await tx`
      insert into halleus_private.report_access_policy (
        singleton_id, version, config, updated_at, updated_by
      )
      values (
        1, ${nextVersion}, ${tx.json(policy)}, now(),
        ${input.actorUserId}::uuid
      )
      on conflict (singleton_id)
      do update set
        version = excluded.version,
        config = excluded.config,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `;
    return policy;
  });
}

export async function saveProductPackage(input: {
  package: HalleusProductPackage;
  actorUserId: string;
}) {
  const item = input.package;
  if (
    !/^[a-z0-9]+(?:_[a-z0-9]+)*$/u.test(item.code) ||
    !Number.isInteger(item.priceMinor) ||
    item.priceMinor < 0 ||
    !Number.isInteger(item.fullReportCredits) ||
    item.fullReportCredits < 0 ||
    !Number.isInteger(item.relationshipCredits) ||
    item.relationshipCredits < 0 ||
    item.currency !== "IRR"
  ) {
    throw new ProductCreditError(
      "invalid_request",
      "Package configuration is invalid.",
    );
  }
  if (item.relationshipCredits > 0 && item.fullReportCredits < 1) {
    throw new ProductCreditError(
      "invalid_request",
      "Standalone Relationship package is not allowed.",
    );
  }

  const sql = getAdminDatabase();
  await sql`
    insert into halleus_private.product_packages (
      code, name, active, price_minor, currency,
      full_report_credits, relationship_credits, display_order,
      badge, cta, description, updated_at, updated_by
    )
    values (
      ${item.code}, ${item.name}, ${item.active}, ${item.priceMinor},
      'IRR', ${item.fullReportCredits}, ${item.relationshipCredits},
      ${item.displayOrder}, ${item.badge}, ${item.cta},
      ${item.description}, now(), ${input.actorUserId}::uuid
    )
    on conflict (code)
    do update set
      name = excluded.name,
      active = excluded.active,
      price_minor = excluded.price_minor,
      currency = excluded.currency,
      full_report_credits = excluded.full_report_credits,
      relationship_credits = excluded.relationship_credits,
      display_order = excluded.display_order,
      badge = excluded.badge,
      cta = excluded.cta,
      description = excluded.description,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `;
  return item;
}

async function updateCreditBalance(input: {
  userId: string;
  creditType: HalleusCreditType;
  delta: number;
  source: string;
  packageCode?: string | null;
  sourceRequestId?: string | null;
  reason: string;
  actorUserId: string;
  idempotencyKey: string;
}) {
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    throw new ProductCreditError(
      "invalid_request",
      "Credit adjustment must be a non-zero integer.",
    );
  }

  const sql = getAdminDatabase();
  return sql.begin(async (tx) => {
    const existing = await tx`
      select balance_after
      from halleus_private.credit_ledger
      where user_id = ${input.userId}::uuid
        and credit_type = ${input.creditType}
        and idempotency_key = ${input.idempotencyKey}
      limit 1
    `;
    if (existing.length) {
      return {
        balance: asNumber(existing[0].balance_after),
        applied: false,
      };
    }

    await tx`
      insert into halleus_private.account_credit_balances (
        user_id, credit_type, balance
      )
      values (${input.userId}::uuid, ${input.creditType}, 0)
      on conflict (user_id, credit_type) do nothing
    `;

    const updated = await tx`
      update halleus_private.account_credit_balances
      set balance = balance + ${input.delta}, updated_at = now()
      where user_id = ${input.userId}::uuid
        and credit_type = ${input.creditType}
        and balance + ${input.delta} >= 0
      returning balance
    `;
    if (!updated.length) {
      throw new ProductCreditError(
        "credit_required",
        "Credit adjustment would make the balance negative.",
      );
    }

    await tx`
      insert into halleus_private.credit_ledger (
        user_id, credit_type, delta, balance_after, source,
        package_code, source_request_id, reason, actor_user_id,
        idempotency_key
      )
      values (
        ${input.userId}::uuid, ${input.creditType}, ${input.delta},
        ${asNumber(updated[0].balance)}, ${input.source},
        ${input.packageCode ?? null},
        ${input.sourceRequestId ?? null}::bigint,
        ${input.reason}, ${input.actorUserId}::uuid,
        ${input.idempotencyKey}
      )
    `;

    return {
      balance: asNumber(updated[0].balance),
      applied: true,
    };
  });
}

export async function adjustAccountCredit(input: {
  userId: string;
  creditType: HalleusCreditType;
  delta: number;
  reason: string;
  actorUserId: string;
  idempotencyKey: string;
}) {
  return updateCreditBalance({
    ...input,
    source: "admin_adjustment",
  });
}

export async function grantPackageCredits(input: {
  userId: string;
  packageCode: string;
  reason: string;
  actorUserId: string;
  sourceRequestId?: string | null;
  idempotencyKey: string;
}) {
  const item = await getProductPackageByCode(input.packageCode);
  if (!item) {
    throw new ProductCreditError(
      "package_not_found",
      "Package was not found.",
    );
  }
  if (item.relationshipCredits > 0 && item.fullReportCredits < 1) {
    throw new ProductCreditError(
      "invalid_request",
      "Standalone Relationship package is not allowed.",
    );
  }

  const results = [];
  if (item.fullReportCredits > 0) {
    results.push(
      await updateCreditBalance({
        userId: input.userId,
        creditType: "full_report_credit",
        delta: item.fullReportCredits,
        source: "package_grant",
        packageCode: item.code,
        sourceRequestId: input.sourceRequestId,
        reason: input.reason,
        actorUserId: input.actorUserId,
        idempotencyKey: `${input.idempotencyKey}:full`,
      }),
    );
  }
  if (item.relationshipCredits > 0) {
    results.push(
      await updateCreditBalance({
        userId: input.userId,
        creditType: "relationship_credit",
        delta: item.relationshipCredits,
        source: "package_grant",
        packageCode: item.code,
        sourceRequestId: input.sourceRequestId,
        reason: input.reason,
        actorUserId: input.actorUserId,
        idempotencyKey: `${input.idempotencyKey}:relationship`,
      }),
    );
  }
  return {
    package: item,
    results,
    access: await getAccountProductAccess(input.userId),
  };
}

export async function listCreditHistory(userId: string, limit = 40) {
  const sql = getAdminDatabase();
  const rows = await sql`
    select
      id::text as id,
      credit_type,
      delta,
      balance_after,
      source,
      package_code,
      reason,
      actor_user_id::text as actor_user_id,
      related_report_id,
      relationship_result_key,
      created_at::text as created_at
    from halleus_private.credit_ledger
    where user_id = ${userId}::uuid
    order by created_at desc
    limit ${Math.min(100, Math.max(1, limit))}
  `;
  return rows.map((raw) => {
    const row = asRecord(raw);
    return {
      id: asString(row.id),
      creditType: asString(row.credit_type),
      delta: asNumber(row.delta),
      balanceAfter: asNumber(row.balance_after),
      source: asString(row.source),
      packageCode: asNullableString(row.package_code),
      reason: asString(row.reason),
      actorUserId: asNullableString(row.actor_user_id),
      relatedReportId: asNullableString(row.related_report_id),
      relationshipResultKey: asNullableString(
        row.relationship_result_key,
      ),
      createdAt: asString(row.created_at),
    };
  });
}
