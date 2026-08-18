import {
  AdminAccessError,
  assertAdminUploadRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import { adminErrorResponse, noStoreJsonResponse } from "@/lib/admin/admin-http";
import { recordAdminAuditEvent } from "@/lib/admin/admin-service";
import { getHalleusRuntimeEnv } from "@/lib/config/env";
import {
  TelegramContentPackValidationError,
  parseTelegramContentPack,
} from "@/lib/telegram/telegram-content-pack";
import {
  getTelegramAdminQueueSummary,
  inspectTelegramContentPackImport,
} from "@/lib/telegram/telegram-admin-service";
import { enqueueTelegramContentPack } from "@/lib/telegram/telegram-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 3_000_000;

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "telegram.read");
    const summary = await getTelegramAdminQueueSummary();
    return noStoreJsonResponse({ ok: true, summary });
  } catch (error) {
    return adminErrorResponse(error, "خلاصهٔ صف تلگرام دریافت نشد.");
  }
}

export async function POST(request: Request) {
  let actor;
  try {
    assertAdminUploadRequest(request);
    actor = await requireAdminCapability(request, "telegram.import.write");
    const form = await request.formData();
    const file = form.get("package");
    if (!(file instanceof File)) {
      throw new AdminAccessError(
        400,
        "فایل بستهٔ محتوای تلگرام پیدا نشد. یک فایل JSON خروجی چت محتوا انتخاب کن.",
      );
    }
    if (file.size < 2 || file.size > MAX_UPLOAD_BYTES) {
      throw new AdminAccessError(
        400,
        `حجم فایل بستهٔ تلگرام معتبر نیست. اندازهٔ فایل باید بین ۲ بایت و ${MAX_UPLOAD_BYTES.toLocaleString("en-US")} بایت باشد؛ هیچ پیامی وارد صف نشد.`,
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(await file.text()) as unknown;
    } catch {
      throw new AdminAccessError(
        400,
        "فایل انتخاب‌شده JSON معتبر نیست. فایل اصلاح نشده و هیچ پیامی وارد صف انتشار نشد.",
      );
    }

    let parsed;
    try {
      parsed = parseTelegramContentPack(raw, getHalleusRuntimeEnv().siteUrl);
    } catch (error) {
      if (error instanceof TelegramContentPackValidationError) {
        throw new AdminAccessError(
          400,
          `بستهٔ تلگرام معتبر نیست: ${error.message} هیچ پیامی وارد صف نشد.`,
        );
      }
      throw error;
    }

    const importStartedAt = new Date();
    const pastItems = parsed.items.filter(
      (item) => Date.parse(item.scheduledFor) <= importStartedAt.getTime(),
    );
    const importableItems = parsed.items.filter(
      (item) => Date.parse(item.scheduledFor) > importStartedAt.getTime(),
    );

    // HALLEUS_TELEGRAM_IMPORT_RETIRED_HISTORY_R1
    const inspection = await inspectTelegramContentPackImport(
      importableItems,
      importStartedAt,
    );
    if (inspection.conflictDates.length > 0) {
      const conflictText = inspection.conflictDates
        .map((conflict) => {
          const packText =
            conflict.existingPackIds.length > 0
              ? ` بسته‌های موجود: ${conflict.existingPackIds.join(", ")}.`
              : "";
          const identityText =
            conflict.changedIdentityCount > 0
              ? ` ${conflict.changedIdentityCount} پیام همان شناسهٔ قبلی را دارند اما متن، زمان یا نوع پیام تغییر کرده؛ بنابراین duplicate ساده محسوب نمی‌شوند.`
              : "";
          const freshText =
            conflict.freshCount > 0
              ? ` ${conflict.freshCount} پیام تازه هم برای روزی آمده که از قبل محتوا دارد.`
              : "";
          return `${conflict.localDate}: ${conflict.existingCount} پیام از قبل وجود دارد و بستهٔ جدید ${conflict.incomingCount} پیام برای همان روز دارد.${identityText}${freshText}${packText}`;
        })
        .join(" | ");
      throw new AdminAccessError(
        409,
        `هم‌پوشانی محتوای تلگرام پیدا شد. ${conflictText} نسخهٔ قبلی دست‌نخورده ماند و هیچ بخش جدیدی از این فایل وارد نشد. اگر واقعاً می‌خواهی محتوای یک روز عوض شود، اول نسخهٔ همان روز را آگاهانه جایگزین کن؛ فایل را دوباره کورکورانه وارد نکن.`,
      );
    }

    const queued = await enqueueTelegramContentPack(inspection.newItems);
    await recordAdminAuditEvent({
      actor,
      action: "admin.telegram.content_pack_imported",
      targetType: "telegram_content_pack",
      targetId: parsed.packId,
      afterSummary: {
        itemCount: parsed.items.length,
        importableCount: importableItems.length,
        queuedCount: queued.length,
        skippedPastCount: pastItems.length,
        pastCutoff: importStartedAt.toISOString(),
        skippedDuplicateCount: inspection.skippedDuplicateCount,
        duplicateDates: inspection.duplicateDates,
        ignoredRetiredCount: inspection.ignoredRetiredCount,
        ignoredRetiredDates: inspection.ignoredRetiredDates,
        rangeStart: parsed.rangeStart,
        rangeEnd: parsed.rangeEnd,
        timezone: parsed.timezone,
        aiContentConfigVersion: parsed.aiContentConfigVersion,
      },
      reason: "Bulk Telegram content pack scheduled.",
      success: true,
    });

    return noStoreJsonResponse(
      {
        ok: true,
        result: {
          packId: parsed.packId,
          itemCount: parsed.items.length,
          importableCount: importableItems.length,
          queuedCount: queued.length,
          skippedPastCount: pastItems.length,
          pastCutoff: importStartedAt.toISOString(),
          skippedDuplicateCount: inspection.skippedDuplicateCount,
          duplicateDates: inspection.duplicateDates,
          ignoredRetiredCount: inspection.ignoredRetiredCount,
          ignoredRetiredDates: inspection.ignoredRetiredDates,
          alreadyImported:
            pastItems.length === 0 &&
            queued.length === 0 &&
            inspection.skippedDuplicateCount === importableItems.length,
          rangeStart: parsed.rangeStart,
          rangeEnd: parsed.rangeEnd,
          aiContentConfigVersion: parsed.aiContentConfigVersion,
        },
      },
      201,
    );
  } catch (error) {
    if (actor) {
      try {
        await recordAdminAuditEvent({
          actor,
          action: "admin.telegram.content_pack_import_failed",
          targetType: "telegram_content_pack",
          reason: "Bulk Telegram content pack import failed.",
          success: false,
          afterSummary: {
            error:
              error instanceof Error
                ? error.message.slice(0, 500)
                : "Unknown error",
          },
        });
      } catch {
        // Keep the import error primary.
      }
    }
    return adminErrorResponse(
      error,
      "ورود بستهٔ تلگرام ناموفق بود و هیچ پیام جدیدی وارد صف نشد.",
    );
  }
}
