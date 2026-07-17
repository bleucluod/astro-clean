function normalizeHttpOrigin(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

export function isTrustedAdminRequestOrigin(
  request: Request,
  canonicalSiteUrl: string,
): boolean {
  const suppliedHeader = request.headers.get("origin");

  // Preserve support for server-to-server calls that legitimately omit Origin.
  if (suppliedHeader === null || suppliedHeader.trim() === "") {
    return true;
  }

  const suppliedOrigin = normalizeHttpOrigin(suppliedHeader);

  if (!suppliedOrigin) {
    return false;
  }

  const allowedOrigins = new Set<string>();

  for (const candidate of [canonicalSiteUrl, request.url]) {
    const origin = normalizeHttpOrigin(candidate);

    if (origin) {
      allowedOrigins.add(origin);
    }
  }

  return allowedOrigins.has(suppliedOrigin);
}
