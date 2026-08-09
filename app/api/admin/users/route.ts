import {
  assertAdminMutationRequest,
  requireAdminCapability,
} from "@/lib/admin/admin-auth";
import {
  noStoreJsonResponse,
  adminErrorResponse,
  readLimit,
  readPage,
  readObject,
  readOptionalString,
  readRequiredString,
} from "@/lib/admin/admin-http";
import {
  addAdminUserNote,
  listAdminUsers,
  setAdminUserStatus,
} from "@/lib/admin/admin-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminCapability(request, "users.read");
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 160);
    const users = await listAdminUsers(
      search,
      readLimit(url.searchParams.get("limit")),
      readPage(url.searchParams.get("page")),
    );
    return noStoreJsonResponse({ ok: true, users });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertAdminMutationRequest(request);
    const body = readObject(await request.json());
    if (!body) {
      return noStoreJsonResponse(
        { ok: false, error: "Request body must be an object." },
      400,
    );
    }

    const action = readRequiredString(body.action, "action", 80);
    const userId = readRequiredString(body.userId, "userId", 160);

    if (action === "set_status") {
      const actor = await requireAdminCapability(request, "users.status.write");
      const status = readRequiredString(body.status, "status", 20);
      if (status !== "active" && status !== "suspended") {
        return noStoreJsonResponse(
          { ok: false, error: "Unsupported account status." },
      400,
    );
      }
      const reason = readRequiredString(body.reason, "reason", 1000);
      await setAdminUserStatus({ actor, userId, status, reason });
      return noStoreJsonResponse({ ok: true });
    }

    if (action === "add_note") {
      const actor = await requireAdminCapability(request, "users.notes.write");
      const note = readOptionalString(body.note, 4000);
      if (!note) {
        return noStoreJsonResponse(
          { ok: false, error: "note is required." },
      400,
    );
      }
      await addAdminUserNote({ actor, userId, body: note });
      return noStoreJsonResponse({ ok: true });
    }

    return noStoreJsonResponse(
      { ok: false, error: "Unsupported admin user action." },
      400,
    );
  } catch (error) {
    return adminErrorResponse(error);
  }
}
