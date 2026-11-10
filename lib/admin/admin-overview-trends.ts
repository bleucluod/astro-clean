import { asNumber, asRecord, getAdminDatabase } from "@/lib/admin/admin-database";
import type { VerifiedAdminActor } from "@/lib/admin/admin-auth";
import { TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS } from "@/lib/telegram/telegram-queue";

/** All chart data is aggregated, read-only, and bucketed in the Halleus business timezone. */
export type OverviewTrendRange = 7 | 30 | 90 | 365;
export type OverviewDailyRow = { date: string; values: Record<string, number> };
export type OverviewTrendSnapshot = {
  shop: null | {
    transferDeclared: number;
    readyForArtwork: number;
    preparing: number;
    cancellationRequested: number;
    waitingDispatch: number;
    confirmedToman: number;
  };
  wiki: null | { draft: number; scheduled: number; published: number; failedJobs: number };
  telegram: null | {
    futureScheduled: number;
    published: number;
    failed: number;
    uncertain: number;
  };
};
export type OverviewTrendPayload = {
  from: string;
  through: string;
  days: OverviewTrendRange;
  daily: OverviewDailyRow[];
  groups: Array<"growth" | "reports" | "shop" | "wiki" | "telegram" | "all">;
  snapshot: OverviewTrendSnapshot;
  markers: Array<{ date: string; label: string }>;
};

function toTehranDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return [part("year"), part("month"), part("day")].join("-");
}
function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}
function metric(map: Map<string, Record<string, number>>, date: unknown, key: string, value: unknown) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const record = map.get(date) ?? {};
  record[key] = asNumber(value);
  map.set(date, record);
}

/** 2x window in daily aggregates permits exact comparisons with the preceding period. */
export async function getAdminOverviewTrends(
  days: OverviewTrendRange,
  actor: VerifiedAdminActor,
): Promise<OverviewTrendPayload> {
  const sql = getAdminDatabase();
  const through = toTehranDate(new Date());
  const from = shiftDate(through, 1 - 2 * days);
  const canShop = actor.role === "owner" && actor.capabilities.includes("shop_orders.read");
  const canWiki = actor.capabilities.includes("wiki.read");
  const canTelegram = actor.capabilities.includes("telegram.read");
  const activeTelegramFailureCutoff = new Date(Date.now() - TELEGRAM_AUTOMATIC_SEND_MAX_LATE_MS).toISOString();
  const daily = new Map<string, Record<string, number>>();

  const usersTask = sql`
    select (created_at at time zone 'Asia/Tehran')::date::text as date,
           count(*)::int as users
    from public.halleus_users
    where created_at >= (${from}::date - interval '1 day')
      and (created_at at time zone 'Asia/Tehran')::date >= ${from}::date
    group by 1
  `;
  const reportsTask = sql`
    select (created_at at time zone 'Asia/Tehran')::date::text as date,
           count(*)::int as reports,
           count(*) filter (where coalesce(
             nullif(report_json #>> '{metadata,reportType}', ''),
             nullif(report_json ->> 'reportType', ''), 'natal'
           ) = 'comparison')::int as comparison,
           count(*) filter (where coalesce(
             nullif(report_json #>> '{metadata,reportType}', ''),
             nullif(report_json ->> 'reportType', ''), 'natal'
           ) <> 'comparison')::int as natal,
           count(*) filter (where source = 'guest')::int as guest_reports,
           count(*) filter (where coalesce(source, 'account') <> 'guest')::int as account_reports,
           count(*) filter (where visibility = 'public')::int as public_reports,
           count(*) filter (where visibility <> 'public')::int as private_reports
    from public.halleus_reports as r
    where (
      r.deleted_at is null
      or (
        r.deleted_by::text = r.user_id
        and r.delete_reason = 'Deleted by report owner.'
        and not exists (
          select 1 from halleus_private.admin_audit_events as deletion_audit
          where deletion_audit.target_type = 'report'
            and deletion_audit.target_id = r.id
            and deletion_audit.action = 'admin.report.soft_deleted'
            and deletion_audit.success = true
        )
      )
    )
      and created_at >= (${from}::date - interval '1 day')
      and (created_at at time zone 'Asia/Tehran')::date >= ${from}::date
    group by 1
  `;

  const ordersTask = canShop ? sql`
    with activity as (
      select created_at as occurred_at, 1::bigint as orders, 0::bigint as declared,
             0::bigint as verified, 0::bigint as shipped,
             total_toman::bigint as booked_toman, 0::bigint as verified_toman
      from halleus_private.shop_orders
      union all
      select transfer_declared_at, 0, 1, 0, 0, 0, 0
      from halleus_private.shop_orders where transfer_declared_at is not null
      union all
      select payment_verified_at, 0, 0, 1, 0, 0,
             case when status not in ('canceled', 'cancel_requested') then total_toman::bigint else 0 end
      from halleus_private.shop_orders where payment_verified_at is not null
      union all
      select handed_to_carrier_at, 0, 0, 0, 1, 0, 0
      from halleus_private.shop_orders where handed_to_carrier_at is not null
    )
    select (occurred_at at time zone 'Asia/Tehran')::date::text as date,
           sum(orders)::int as orders, sum(declared)::int as declared,
           sum(verified)::int as verified, sum(shipped)::int as shipped,
           sum(booked_toman)::bigint as booked_toman,
           sum(verified_toman)::bigint as verified_toman
    from activity
    where (occurred_at at time zone 'Asia/Tehran')::date >= ${from}::date
    group by 1
  ` : Promise.resolve([]);

  const shopSnapshotTask = canShop ? sql`
    select
      count(*) filter (where status = 'transfer_declared')::int as transfer_declared,
      count(*) filter (where status = 'payment_verified')::int as ready_for_artwork,
      count(*) filter (where status = 'preparing')::int as preparing,
      count(*) filter (where status = 'cancel_requested')::int as cancel_requested,
      count(*) filter (where status in ('payment_verified', 'preparing'))::int as waiting_dispatch,
      coalesce(sum(total_toman) filter (
        where payment_verified_at is not null and status not in ('canceled', 'cancel_requested')
      ), 0)::bigint as confirmed_toman
    from halleus_private.shop_orders
  ` : Promise.resolve([]);

  const wikiTask = canWiki ? sql`
    with actions as (
      select published_at as at_time, 1::bigint as published,
             0::bigint as drafts, 0::bigint as scheduled, 0::bigint as failed
      from public.wiki_articles
      where status = 'published' and published_at is not null and deleted_at is null
      union all
      select created_at, 0, 1, 0, 0
      from public.wiki_articles where status = 'draft' and deleted_at is null
      union all
      select created_at, 0, 0, 1, 0
      from public.wiki_articles where status = 'scheduled' and deleted_at is null
      union all
      select job.updated_at, 0, 0, 0, 1
      from halleus_private.wiki_publish_jobs as job
      join public.wiki_articles as article on article.id = job.article_id
      where job.status = 'failed' and article.deleted_at is null
    )
    select (at_time at time zone 'Asia/Tehran')::date::text as date,
           sum(published)::int as published, sum(drafts)::int as drafts,
           sum(scheduled)::int as scheduled, sum(failed)::int as failed
    from actions
    where (at_time at time zone 'Asia/Tehran')::date >= ${from}::date
    group by 1
  ` : Promise.resolve([]);
  const wikiSnapshotTask = canWiki ? sql`
    select
      (select count(*) from public.wiki_articles where deleted_at is null and status = 'draft')::int as draft,
      (select count(*) from public.wiki_articles where deleted_at is null and status = 'scheduled')::int as scheduled,
      (select count(*) from public.wiki_articles where deleted_at is null and status = 'published')::int as published,
      (select count(*) from (
        select distinct on (job.article_id) job.status
        from halleus_private.wiki_publish_jobs as job
        join public.wiki_articles as article on article.id = job.article_id
        where article.deleted_at is null
        order by job.article_id, job.created_at desc
      ) as latest_job where latest_job.status = 'failed')::int as failed_jobs
  ` : Promise.resolve([]);

  const telegramTask = canTelegram ? sql`
    with actions as (
      select published_at as at_time, 1::bigint as published, 0::bigint as prepared, 0::bigint as failed
      from halleus_private.telegram_content_queue
      where status = 'published' and published_at is not null
      union all
      select created_at, 0, 1, 0
      from halleus_private.telegram_content_queue
      where status in ('draft', 'ready')
      union all
      select last_attempt_at, 0, 0, 1
      from halleus_private.telegram_content_queue
      where status = 'failed' and last_attempt_at is not null
    )
    select (at_time at time zone 'Asia/Tehran')::date::text as date,
           sum(published)::int as published, sum(prepared)::int as prepared,
           sum(failed)::int as failed
    from actions
    where (at_time at time zone 'Asia/Tehran')::date >= ${from}::date
    group by 1
  ` : Promise.resolve([]);
  const telegramSnapshotTask = canTelegram ? sql`
    select
      count(*) filter (where status = 'ready' and scheduled_for > now())::int as future_scheduled,
      count(*) filter (where status = 'published')::int as published,
      count(*) filter (where status = 'failed' and scheduled_for > ${activeTelegramFailureCutoff}::timestamptz)::int as failed,
      count(*) filter (where status = 'failed' and scheduled_for > ${activeTelegramFailureCutoff}::timestamptz and last_error like '[delivery_uncertain]%')::int as uncertain
    from halleus_private.telegram_content_queue
  ` : Promise.resolve([]);

  const [usersRows, reportsRows, orderRows, shopSnapshotRows, wikiRows, wikiSnapshotRows, telegramRows, telegramSnapshotRows] =
    await Promise.all([usersTask, reportsTask, ordersTask, shopSnapshotTask,
      wikiTask, wikiSnapshotTask, telegramTask, telegramSnapshotTask]);

  for (const row of usersRows) metric(daily, row.date, "users", row.users);
  for (const row of reportsRows) {
    for (const key of ["reports", "comparison", "natal", "guest_reports", "account_reports",
      "public_reports", "private_reports"] as const) metric(daily, row.date, key, row[key]);
  }
  for (const row of orderRows) {
    for (const key of ["orders", "declared", "verified", "shipped", "booked_toman", "verified_toman"] as const) {
      metric(daily, row.date, key, row[key]);
    }
  }
  for (const row of wikiRows) {
    metric(daily, row.date, "wiki_published", row.published);
    metric(daily, row.date, "wiki_drafts", row.drafts);
    metric(daily, row.date, "wiki_scheduled", row.scheduled);
    metric(daily, row.date, "wiki_failed", row.failed);
  }
  for (const row of telegramRows) {
    metric(daily, row.date, "telegram_published", row.published);
    metric(daily, row.date, "telegram_prepared", row.prepared);
    metric(daily, row.date, "telegram_failed", row.failed);
  }
  const shop = asRecord(shopSnapshotRows[0]);
  const wiki = asRecord(wikiSnapshotRows[0]);
  const telegram = asRecord(telegramSnapshotRows[0]);
  const snapshot: OverviewTrendSnapshot = {
    shop: canShop ? {
      transferDeclared: asNumber(shop.transfer_declared),
      readyForArtwork: asNumber(shop.ready_for_artwork),
      preparing: asNumber(shop.preparing),
      cancellationRequested: asNumber(shop.cancel_requested),
      waitingDispatch: asNumber(shop.waiting_dispatch),
      confirmedToman: asNumber(shop.confirmed_toman),
    } : null,
    wiki: canWiki ? {
      draft: asNumber(wiki.draft),
      scheduled: asNumber(wiki.scheduled),
      published: asNumber(wiki.published),
      failedJobs: asNumber(wiki.failed_jobs),
    } : null,
    telegram: canTelegram ? {
      futureScheduled: asNumber(telegram.future_scheduled),
      published: asNumber(telegram.published),
      failed: asNumber(telegram.failed),
      uncertain: asNumber(telegram.uncertain),
    } : null,
  };
  const groups: OverviewTrendPayload["groups"] = ["growth", "reports", "all"];
  if (canShop) groups.push("shop");
  if (canWiki) groups.push("wiki");
  if (canTelegram) groups.push("telegram");
  const launch = "2026-11-08";
  return {
    from, through, days,
    daily: Array.from(daily, ([date, values]) => ({ date, values })).sort((a, b) => a.date.localeCompare(b.date)),
    groups, snapshot,
    markers: canShop && launch >= from && launch <= through ? [{ date: launch, label: "افتتاح فروشگاه P01" }] : [],
  };
}
