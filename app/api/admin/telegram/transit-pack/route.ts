import {
  AdminAccessError,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import { adminErrorResponse } from "@/lib/admin/admin-http";
import {
  TelegramContentPackValidationError,
  buildTelegramSmartTransitPack,
} from "@/lib/telegram/telegram-content-pack";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "telegram.read");
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate") ?? "";
    const endDate = url.searchParams.get("endDate") ?? "";
    const city = url.searchParams.get("city") ?? "تهران";
    let pack;
    try {
      pack = buildTelegramSmartTransitPack({ startDate, endDate, city });
    } catch (error) {
      if (error instanceof TelegramContentPackValidationError) {
        throw new AdminAccessError(400, error.message);
      }
      throw error;
    }
    const filename = `Halleus-Telegram-Transit-Pack-${pack.range.startDate}-to-${pack.range.endDate}.json`;
    return new Response(JSON.stringify(pack, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return adminErrorResponse(error, "ساخت بستهٔ هوشمند تلگرام ناموفق بود.");
    }
    const detail =
      error instanceof Error && error.message
        ? error.message.slice(0, 500)
        : "علت فنی نامشخص است.";
    return adminErrorResponse(
      new AdminAccessError(
        500,
        `ساخت بستهٔ هوشمند تلگرام ناموفق بود: ${detail} هیچ فایلی ساخته نشد. تاریخ شروع، پایان و شهر را بررسی کن؛ اگر دوباره رخ داد همین متن کامل خطا را بفرست.`,
      ),
      "ساخت بستهٔ هوشمند تلگرام ناموفق بود.",
    );
  }
}
