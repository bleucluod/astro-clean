import { getHalleusRuntimeEnv } from "@/lib/config/env";

export type WikiIndexNowSubmitResult = {
  ok: boolean;
  skipped: boolean;
  reason: string;
  submitted: number;
  status?: number;
  error?: string;
};

function normalizeDiscoveryPath(pathOrSlug: string) {
  const value = pathOrSlug.trim();
  if (!value) {
    return null;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (value.startsWith("/")) {
    return value;
  }

  return `/wiki/${value}`;
}

export function buildWikiDiscoveryUrls(pathsOrSlugs: readonly (string | null | undefined)[]) {
  const env = getHalleusRuntimeEnv();
  const siteUrl = env.siteUrl.replace(/\/+$/, "");
  const urls = new Set<string>();

  for (const item of pathsOrSlugs) {
    if (!item) {
      continue;
    }
    const normalized = normalizeDiscoveryPath(item);
    if (!normalized) {
      continue;
    }
    if (/^https?:\/\//i.test(normalized)) {
      urls.add(normalized);
      continue;
    }
    urls.add(`${siteUrl}${normalized.startsWith("/") ? normalized : `/${normalized}`}`);
  }

  return Array.from(urls);
}

export async function submitWikiIndexNowUrlsBestEffort(
  pathsOrSlugs: readonly (string | null | undefined)[],
  reason: string,
): Promise<WikiIndexNowSubmitResult> {
  const env = getHalleusRuntimeEnv();
  const key = env.indexNowKey;
  if (!key) {
    return {
      ok: true,
      skipped: true,
      reason: "indexnow-not-configured",
      submitted: 0,
    };
  }

  const urlList = buildWikiDiscoveryUrls(pathsOrSlugs).slice(0, 10000);
  if (!urlList.length) {
    return {
      ok: true,
      skipped: true,
      reason: "no-wiki-discovery-urls",
      submitted: 0,
    };
  }

  const host = new URL(env.siteUrl).host;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${env.siteUrl.replace(/\/+$/, "")}/indexnow-key.txt`,
        urlList,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        reason,
        submitted: 0,
        status: response.status,
      };
    }

    return {
      ok: true,
      skipped: false,
      reason,
      submitted: urlList.length,
      status: response.status,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: false,
      reason,
      submitted: 0,
      error: error instanceof Error ? error.message.slice(0, 300) : "unknown",
    };
  } finally {
    clearTimeout(timeout);
  }
}