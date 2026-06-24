import type { ReportRecord } from "@/types/storage";
import { normalizeReportRecords } from "./report-records";

export function encodeReportRecords(records: ReportRecord[]) {
  return JSON.stringify(
    {
      app: "halleus",
      type: "report-records",
      version: 1,
      exportedAt: new Date().toISOString(),
      records,
    },
    null,
    2,
  );
}

export function decodeReportRecords(payload: unknown): ReportRecord[] {
  if (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    "records" in payload
  ) {
    return normalizeReportRecords(payload.records);
  }

  return normalizeReportRecords(payload);
}
