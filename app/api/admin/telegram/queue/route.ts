import {
  AdminAccessError,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import {
  getTelegramAdminQueueDetail,
  listTelegramAdminFutureDays,
  listTelegramAdminUpcomingItems,
  listTelegramAdminQueuePage,
  type TelegramAdminQueueFilter,
} from "@/lib/telegram/telegram-admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILTERS: TelegramAdminQueueFilter[] = [
  "today", "tomorrow", "date", "all", "ready", "published", "problems",
];

function positiveInteger(value: string | null, fallback: number, max: number) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed)
    ? Math.min(Math.max(Math.trunc(parsed), 1), max)
    : fallback;
}

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "telegram.read");
    const url = new URL(request.url);
    const id = url.searchParams.get("id")?.trim();
    const view = url.searchParams.get("view")?.trim();
    if (view === "days") {
      const days = await listTelegramAdminFutureDays(
        positiveInteger(url.searchParams.get("limit"), 120, 180),
      );
      return noStoreJsonResponse({ ok: true, timezone: "Asia/Tehran", days });
    }
    if (view === "upcoming") {
      const pageSize = positiveInteger(url.searchParams.get("limit"), 5, 20);
      const items = await listTelegramAdminUpcomingItems(pageSize);
      return noStoreJsonResponse({
        ok: true,
        page: {
          filter: "ready",
          date: null,
          page: 1,
          pageSize,
          total: items.length,
          totalPages: 1,
          items,
        },
      });
    }
    if (id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        throw new AdminAccessError(400, "شناسهٔ پیام تلگرام معتبر نیست.");
      }
      const detail = await getTelegramAdminQueueDetail(id);
      if (!detail) throw new AdminAccessError(404, "پیام تلگرام پیدا نشد.");
      return noStoreJsonResponse({ ok: true, detail });
    }

    const rawFilter = url.searchParams.get("filter") ?? "ready";
    const filter = FILTERS.includes(rawFilter as TelegramAdminQueueFilter)
      ? (rawFilter as TelegramAdminQueueFilter)
      : "ready";
    const date = url.searchParams.get("date")?.trim() || null;
    if (filter === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
      throw new AdminAccessError(400, "برای فیلتر تاریخ، یک روز معتبر انتخاب کن.");
    }

    const page = await listTelegramAdminQueuePage({
      filter,
      date,
      page: positiveInteger(url.searchParams.get("page"), 1, 100_000),
      pageSize: positiveInteger(url.searchParams.get("pageSize"), 24, 120),
    });
    return noStoreJsonResponse({ ok: true, page });
  } catch (error) {
    return adminErrorResponse(error, "صف تلگرام دریافت نشد.");
  }
}
