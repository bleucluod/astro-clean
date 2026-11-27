import { projectComparisonChapterPreview } from "./comparison-preview-projection.mjs";

/** Unwired server-side orchestration seam. Actor, chart provenance, generated
 * manuscript and persistence receipt MUST come from trusted server adapters.
 * This module neither authenticates requests nor implements persistence,
 * atomic retry, entitlement, or payment. Never expose it through a client route.
 */
const contexts = new Set(["romantic", "friendship", "family", "work", "general"]);
const times = new Set(["exact", "unknown"]);
const keys = ["chartAId", "chartBId", "relationshipContext", "chartABirthTimeStatus", "chartBBirthTimeStatus", "retryKey"];
const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
const id = value => typeof value === "string" && value.length > 0 && value.length <= 220 &&
  value === value.trim() && !/[\x00-\x1f\x7f]/u.test(value);
const failure = code => ({ ok: false, code });

export function parseComparisonPreviewRequest(raw) {
  if (!object(raw) || Object.keys(raw).length !== keys.length ||
      keys.some(key => !Object.prototype.hasOwnProperty.call(raw, key)) ||
      !id(raw.chartAId) || !id(raw.chartBId) || raw.chartAId === raw.chartBId ||
      !contexts.has(raw.relationshipContext) ||
      !times.has(raw.chartABirthTimeStatus) || !times.has(raw.chartBBirthTimeStatus) ||
      typeof raw.retryKey !== "string" || !/^[A-Za-z0-9_-]{16,128}$/u.test(raw.retryKey)) {
    return null;
  }
  return {
    chartAId: raw.chartAId, chartBId: raw.chartBId,
    relationshipContext: raw.relationshipContext,
    chartABirthTimeStatus: raw.chartABirthTimeStatus,
    chartBBirthTimeStatus: raw.chartBBirthTimeStatus,
    retryKey: raw.retryKey,
  };
}

function validChart(chart, actor, expectedId) {
  return object(chart) && chart.ownerId === actor.id && chart.ownerKind === actor.kind &&
    chart.id === expectedId && chart.deleted === false && chart.provenance === "verified-server-calculation" &&
    times.has(chart.birthTimeStatus) && id(chart.snapshotRevision) &&
    object(chart.report) && chart.report.id === expectedId && object(chart.report.realEngine);
}
function canUseTime(chart, requested) {
  return requested === "unknown" || chart.birthTimeStatus === "exact";
}

/** The persist adapter must atomically bind owner + retryKey to the exact
 * ordered inputs/revisions; replay must return the original committed preview,
 * or report a conflict. No implementation of that adapter is supplied here.
 * This first-write-only seam rejects nonmatching receipts rather than exposing
 * an unconfirmed result; replay/recovery require a later explicit contract.
 */
export async function createComparisonPreviewCandidate(actor, raw, deps) {
  if (!object(actor) || !id(actor.id) || !["account", "guest"].includes(actor.kind)) {
    return failure("AUTH_REQUIRED");
  }
  const input = parseComparisonPreviewRequest(raw);
  if (!input) return failure("INVALID_REQUEST");
  try {
    const owner = { id: actor.id, kind: actor.kind };
    const a = await deps.loadOwnedChart(owner, input.chartAId);
    if (!validChart(a, owner, input.chartAId)) return failure("CHART_UNAVAILABLE");
    const b = await deps.loadOwnedChart(owner, input.chartBId);
    if (!validChart(b, owner, input.chartBId)) return failure("CHART_UNAVAILABLE");
    if (!canUseTime(a, input.chartABirthTimeStatus) || !canUseTime(b, input.chartBBirthTimeStatus)) {
      return failure("TIME_STATUS_INVALID");
    }
    const binding = {
      chartAId: input.chartAId, chartBId: input.chartBId,
      chartARevision: a.snapshotRevision, chartBRevision: b.snapshotRevision,
      relationshipContext: input.relationshipContext,
      chartABirthTimeStatus: input.chartABirthTimeStatus,
      chartBBirthTimeStatus: input.chartBBirthTimeStatus,
    };
    // The adapter runs the existing writer and evidence planner, with a server ID.
    const generated = await deps.generate(a.report, b.report, { ...binding });
    const record = generated?.record;
    if (!object(record) || record.version !== "comparison-product-v1" || !id(record.id) ||
        record.chartAId !== binding.chartAId || record.chartBId !== binding.chartBId ||
        record.relationshipContext !== binding.relationshipContext ||
        record.chartABirthTimeStatus !== binding.chartABirthTimeStatus ||
        record.chartBBirthTimeStatus !== binding.chartBBirthTimeStatus ||
        !object(record.report) || !object(record.reading) ||
        record.privacy?.visibility !== "private" || record.privacy?.indexingPolicy !== "noindex" ||
        record.privacy?.rawBirthInputStored !== false) {
      return failure("GENERATION_INVALID");
    }
    const preview = projectComparisonChapterPreview(record.reading, generated.plan);
    // Only the server-side adapter receives the full record. No public spread.
    const receipt = await deps.persist({ owner, retryKey: input.retryKey, binding, record, preview });
    if (!object(receipt) || receipt.status !== "created" || receipt.reportId !== record.id) {
      return failure("PERSISTENCE_UNCONFIRMED");
    }
    return { ok: true, reportId: record.id, preview };
  } catch {
    // No internal error details or partial manuscript in the response.
    return failure("PREVIEW_UNAVAILABLE");
  }
}
