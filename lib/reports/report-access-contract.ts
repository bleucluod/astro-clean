import { createHash, randomBytes } from "node:crypto";

export const REPORT_TITLE_MAX_LENGTH = 160;
export const REPORT_SUMMARY_PAGE_SIZE = 25;

export type ReportAccessState =
  | "private"
  | "shared_by_link"
  | "unpublished"
  | "restricted_by_admin";

export type ReportSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  reportType: string;
  accessTier: string;
  accessState: ReportAccessState;
  status: "active" | "deleted";
};

export function validateReportTitle(value: unknown) {
  if (typeof value !== "string") throw new Error("Report title must be text.");
  const title = value.trim();
  if (!title || title.length > REPORT_TITLE_MAX_LENGTH || /[\u0000-\u001f\u007f]/u.test(title)) {
    throw new Error("Report title is invalid.");
  }
  return title;
}

export function createReportShareSecret() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashReportShareSecret(token) };
}

export function hashReportShareSecret(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function readReportPage(value: string | null) {
  const page = Number.parseInt(value ?? "1", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
