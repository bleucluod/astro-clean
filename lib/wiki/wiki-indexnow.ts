import { getAdminDatabase } from "@/lib/admin/admin-database";
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

async function recordWikiIndexNowSubmissionBestEffort(input: {
  reason: string;
  ok: boolean;
  skipped: boolean;
  urlList: readonly string[];
  status?: number;
  error?: string;
}) {
  try {
    const sql = getAdminDatabase();
    await sql`
      insert into halleus_private.wiki_indexnow_submissions (
        reason, ok, skipped, url_count, status_code, error_summary, submitted_urls
      ) values (
        ${input.reason},
        ${input.ok},
        ${input.skipped},
        ${input.urlList.length},
        ${input.status ?? null},
        ${input.error ?? null},
        ${sql.json(input.urlList.slice(0, 10000))}
      )
    `;
  } catch {
    // IndexNow delivery must not fail publishing if observability storage is not ready yet.
  }
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
  const urlList = buildWikiDiscoveryUrls(pathsOrSlugs).slice(0, 10000);
  if (!key) {
    const result = {
      ok: true,
      skipped: true,
      reason: "indexnow-not-configured",
      submitted: 0,
    };
    await recordWikiIndexNowSubmissionBestEffort({
      reason: result.reason,
      ok: result.ok,
      skipped: result.skipped,
      urlList,
    });
    return result;
  }

  if (!urlList.length) {
    const result = {
      ok: true,
      skipped: true,
      reason: "no-wiki-discovery-urls",
      submitted: 0,
    };
    await recordWikiIndexNowSubmissionBestEffort({
      reason: result.reason,
      ok: result.ok,
      skipped: result.skipped,
      urlList,
    });
    return result;
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
      const result = {
        ok: false,
        skipped: false,
        reason,
        submitted: 0,
        status: response.status,
      };
      await recordWikiIndexNowSubmissionBestEffort({
        reason,
        ok: result.ok,
        skipped: result.skipped,
        urlList,
        status: response.status,
      });
      return result;
    }

    const result = {
      ok: true,
      skipped: false,
      reason,
      submitted: urlList.length,
      status: response.status,
    };
    await recordWikiIndexNowSubmissionBestEffort({
      reason,
      ok: result.ok,
      skipped: result.skipped,
      urlList,
      status: response.status,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "unknown";
    const result = {
      ok: false,
      skipped: false,
      reason,
      submitted: 0,
      error: message,
    };
    await recordWikiIndexNowSubmissionBestEffort({
      reason,
      ok: result.ok,
      skipped: result.skipped,
      urlList,
      error: message,
    });
    return result;
  } finally {
    clearTimeout(timeout);
  }
}
