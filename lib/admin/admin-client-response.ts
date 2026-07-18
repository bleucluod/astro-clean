export type AdminJsonPayload = Record<string, unknown>;

const GENERIC_ADMIN_REQUEST_ERROR = "The admin request failed.";

function errorMessage(payload: AdminJsonPayload) {
  const message = typeof payload.error === "string" ? payload.error.trim() : "";
  const code = typeof payload.code === "string" ? payload.code.trim() : "";

  if (!message) return GENERIC_ADMIN_REQUEST_ERROR;
  return code ? `${message} (${code})` : message;
}

export async function readAdminJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const body = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      response.ok
        ? "The admin response must be JSON."
        : `The admin response was invalid. Status: ${response.status}`,
    );
  }

  let payload: AdminJsonPayload;
  try {
    const parsed = JSON.parse(body) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error("Response JSON must be an object.");
    }
    payload = parsed as AdminJsonPayload;
  } catch {
    throw new Error("The admin response did not contain valid JSON.");
  }

  if (!response.ok) {
    throw new Error(errorMessage(payload));
  }

  return payload;
}
