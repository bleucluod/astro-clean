import {
  assertAdminMutationRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readRequiredString,
} from "@/lib/admin/admin-http";
import { recordAdminAuditEvent } from "@/lib/admin/admin-service";
import {
  getTelegramAiContentConfig,
  updateTelegramAiContentConfig,
} from "@/lib/telegram/telegram-content-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// HALLEUS_TELEGRAM_AI_CONTENT_CONFIG_API_R1
export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "telegram.read");
    const config = await getTelegramAiContentConfig();
    return noStoreJsonResponse({ ok: true, config });
  } catch (error) {
    return adminErrorResponse(error, "دستور محتوایی تلگرام دریافت نشد.");
  }
}

export async function PUT(request: Request) {
  let actor: Awaited<ReturnType<typeof requireAdminCapability>> | null = null;
  try {
    assertAdminMutationRequest(request);
    actor = await requireAdminCapability(request, "telegram.operations.write");
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse(
        { ok: false, error: "Request body must be an object." },
        400,
      );
    }
    const rawPrompt = readRequiredString(body.rawPrompt, "rawPrompt", 12_000);
    const config = await updateTelegramAiContentConfig({
      rawPrompt,
      settings: body.settings,
      actorUserId: actor.userId,
    });

    await recordAdminAuditEvent({
      actor,
      action: "admin.telegram.ai_content_config_updated",
      targetType: "telegram_ai_content_config",
      targetId: String(config.version),
      afterSummary: {
        version: config.version,
        rawPromptLength: config.rawPrompt.length,
        settings: config.settings,
      },
      reason: "Telegram AI content direction updated from admin.",
      success: true,
    });

    return noStoreJsonResponse({ ok: true, config });
  } catch (error) {
    if (actor) {
      try {
        await recordAdminAuditEvent({
          actor,
          action: "admin.telegram.ai_content_config_update_failed",
          targetType: "telegram_ai_content_config",
          afterSummary: {
            error:
              error instanceof Error
                ? error.message.slice(0, 320)
                : "Unknown config failure.",
          },
          reason: "Telegram AI content direction update failed.",
          success: false,
        });
      } catch {
        // Keep the primary failure.
      }
    }
    return adminErrorResponse(error, "ذخیرهٔ دستور محتوایی تلگرام انجام نشد.");
  }
}
