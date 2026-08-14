import {
  getSupabaseUserFromAuthorizationHeader,
  type VerifiedSupabaseAccountUser,
} from "@/lib/auth/supabase-server-user";
import {
  adminErrorResponse,
  noStoreJsonResponse,
  readObject,
  readOptionalString,
  readRequiredString,
} from "@/lib/admin/admin-http";
import { createPremiumRequest } from "@/lib/admin/admin-service";
import { normalizeHalleusPackageCode } from "@/lib/monetization/product-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicationChoices = ["not_requested", "private", "public_with_consent"] as const;

// HALLEUS_CANONICAL_PRODUCT_REQUEST_R1
export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > 10000) {
      return noStoreJsonResponse({ ok: false, error: "Request body is too large." }, 413);
    }
    const body = readObject(await request.json());
    if (!body) return noStoreJsonResponse({ ok: false, error: "Request body must be an object." }, 400);
    const honeypot = readOptionalString(body.company, 200);
    if (honeypot) return noStoreJsonResponse({ ok: true, request: { status: "new" } });

    const authorizationHeader = request.headers.get("authorization");
    let user: VerifiedSupabaseAccountUser | null = null;
    if (authorizationHeader) {
      try {
        user = await getSupabaseUserFromAuthorizationHeader(authorizationHeader);
      } catch {
        return noStoreJsonResponse({ ok: false, error: "Account session could not be verified." }, 401);
      }
    }

    const rawProductCode = readRequiredString(body.productCode, "productCode", 80);
    const productCode = normalizeHalleusPackageCode(rawProductCode);
    if (!productCode) {
      return noStoreJsonResponse({ ok: false, error: "Unsupported package code." }, 400);
    }
    const publicationChoice = readRequiredString(body.publicationChoice ?? "not_requested", "publicationChoice", 40);
    if (!publicationChoices.includes(publicationChoice as (typeof publicationChoices)[number])) {
      return noStoreJsonResponse({ ok: false, error: "Unsupported publication choice." }, 400);
    }
    const created = await createPremiumRequest({
      userId: user?.id ?? null,
      contactName: readRequiredString(body.contactName, "contactName", 160),
      contactValue: readRequiredString(body.contactValue, "contactValue", 320),
      productCode,
      linkedReportId: readOptionalString(body.linkedReportId, 200),
      customerNotes: readOptionalString(body.customerNotes, 4000),
      publicationChoice: publicationChoice as (typeof publicationChoices)[number],
    });

    return noStoreJsonResponse({ ok: true, request: { ...created, accountLinked: Boolean(user?.id) } }, 201);
  } catch (error) {
    return adminErrorResponse(error, "Premium request could not be saved.");
  }
}
