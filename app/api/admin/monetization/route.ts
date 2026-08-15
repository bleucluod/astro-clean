import {
  assertAdminMutationRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readOptionalString,
  readRequiredString,
} from "@/lib/admin/admin-http";
import {
  listAdminUsers,
  recordAdminAuditEvent,
} from "@/lib/admin/admin-service";
import {
  adjustAccountCredit,
  getAccountProductAccess,
  getProductPackages,
  getReportAccessControlState,
  grantPackageCredits,
  listCreditHistory,
  saveProductPackage,
  saveReportAccessPolicy,
} from "@/lib/monetization/product-entitlement-service";
import type { HalleusCreditType } from "@/lib/monetization/product-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// HALLEUS_ACCESS_SALES_ADMIN_API_R1
export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "memberships.manage");
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").slice(0, 160);
    const userId = (url.searchParams.get("userId") ?? "").slice(0, 160);

    const [accessControl, packages, users] = await Promise.all([
      getReportAccessControlState(),
      getProductPackages(),
      search ? listAdminUsers(search, 20, 1) : Promise.resolve([]),
    ]);
    const policy = accessControl.policy;
    const access = userId
      ? await getAccountProductAccess(userId)
      : null;
    const history = userId
      ? await listCreditHistory(userId, 50)
      : [];

    return noStoreJsonResponse({
      ok: true,
      policy,
      accessControl,
      packages,
      users,
      access,
      history,
    });
  } catch (error) {
    return adminErrorResponse(error, "دسترسی و فروش دریافت نشد.");
  }
}

export async function PUT(request: Request) {
  let actor: Awaited<ReturnType<typeof requireAdminCapability>> | null = null;
  try {
    assertAdminMutationRequest(request);
    actor = await requireAdminCapability(request, "memberships.manage");
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse(
        { ok: false, error: "Request body must be an object." },
        400,
      );
    }
    const action = readRequiredString(body.action, "action", 80);

    if (action === "save_policy") {
      // HALLEUS_ACCESS_MODE_AUDIT_BATCH1_R1
      const before = await getReportAccessControlState();
      const policy = await saveReportAccessPolicy({
        config: body.policy,
        actorUserId: actor.userId,
      });
      const after = await getReportAccessControlState();
      await recordAdminAuditEvent({
        actor,
        action: "admin.monetization.access_policy_updated",
        targetType: "report_access_policy",
        targetId: String(policy.version),
        beforeSummary: {
          version: before.version,
          monetizationMode: before.effectiveMode,
        },
        afterSummary: {
          version: after.version,
          monetizationMode: after.effectiveMode,
          updatedAt: after.updatedAt,
        },
        reason: "Report access mode and Free/Full presentation policy updated.",
        success: true,
      });
      return noStoreJsonResponse({ ok: true, policy, accessControl: after });
    }

    if (action === "save_package") {
      const raw = readObject(body.package);
      if (!raw) {
        return noStoreJsonResponse(
          { ok: false, error: "Package configuration is required." },
          400,
        );
      }
      const priceMinor = Number(raw.priceMinor);
      const fullReportCredits = Number(raw.fullReportCredits);
      const relationshipCredits = Number(raw.relationshipCredits);
      const displayOrder = Number(raw.displayOrder);
      const item = await saveProductPackage({
        package: {
          code: readRequiredString(raw.code, "package.code", 80),
          name: readRequiredString(raw.name, "package.name", 160),
          active: raw.active === true,
          priceMinor,
          currency: "IRR",
          fullReportCredits,
          relationshipCredits,
          displayOrder,
          badge: readOptionalString(raw.badge, 120),
          cta: readRequiredString(raw.cta, "package.cta", 160),
          description: readRequiredString(
            raw.description,
            "package.description",
            500,
          ),
          shortLabel: readRequiredString(raw.name, "package.name", 160),
          promise: readRequiredString(
            raw.description,
            "package.description",
            500,
          ),
          testPriceToman: Math.round(priceMinor / 10),
          priceMode: "configured",
        },
        actorUserId: actor.userId,
      });
      await recordAdminAuditEvent({
        actor,
        action: "admin.monetization.package_updated",
        targetType: "product_package",
        targetId: item.code,
        afterSummary: {
          active: item.active,
          priceMinor: item.priceMinor,
          currency: item.currency,
          fullReportCredits: item.fullReportCredits,
          relationshipCredits: item.relationshipCredits,
        },
        reason: "Manual-purchase package configuration updated.",
        success: true,
      });
      return noStoreJsonResponse({ ok: true, package: item });
    }

    if (action === "grant_package") {
      const userId = readRequiredString(body.userId, "userId", 160);
      const packageCode = readRequiredString(
        body.packageCode,
        "packageCode",
        80,
      );
      const reason = readRequiredString(body.reason, "reason", 500);
      const result = await grantPackageCredits({
        userId,
        packageCode,
        reason,
        actorUserId: actor.userId,
        idempotencyKey:
          readOptionalString(body.idempotencyKey, 160) ??
          `admin-package:${crypto.randomUUID()}`,
      });
      await recordAdminAuditEvent({
        actor,
        action: "admin.monetization.package_granted",
        targetType: "user",
        targetId: userId,
        afterSummary: {
          packageCode,
          balances: result.access.balances,
        },
        reason,
        success: true,
      });
      return noStoreJsonResponse({ ok: true, result });
    }

    if (action === "adjust_credit") {
      const userId = readRequiredString(body.userId, "userId", 160);
      const creditType = readRequiredString(
        body.creditType,
        "creditType",
        60,
      ) as HalleusCreditType;
      if (
        creditType !== "full_report_credit" &&
        creditType !== "relationship_credit"
      ) {
        return noStoreJsonResponse(
          { ok: false, error: "Unsupported credit type." },
          400,
        );
      }
      const delta = Number(body.delta);
      const reason = readRequiredString(body.reason, "reason", 500);
      const result = await adjustAccountCredit({
        userId,
        creditType,
        delta,
        reason,
        actorUserId: actor.userId,
        idempotencyKey:
          readOptionalString(body.idempotencyKey, 160) ??
          `admin-adjust:${crypto.randomUUID()}`,
      });
      await recordAdminAuditEvent({
        actor,
        action: "admin.monetization.credit_adjusted",
        targetType: "user",
        targetId: userId,
        afterSummary: { creditType, delta, balance: result.balance },
        reason,
        success: true,
      });
      return noStoreJsonResponse({ ok: true, result });
    }

    return noStoreJsonResponse(
      { ok: false, error: "Unsupported monetization admin action." },
      400,
    );
  } catch (error) {
    return adminErrorResponse(error, "عملیات دسترسی و فروش انجام نشد.");
  }
}
