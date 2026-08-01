import { createHash, randomBytes } from "node:crypto";
import type {
  GeneratedReportIndexingPolicy,
  GeneratedReportVisibility,
  GeneratedReportVisibilityKind,
  ReportAccessTier,
  ReportIdentityConsentState,
  ReportPublicationConsentState,
  ReportPublicationIntent,
  ReportPublicationOwnerKind,
  ReportPublicationPolicy,
  ReportPublicationPolicyInput,
} from "@/types/report-generation";


export const REPORT_PUBLICATION_POLICY_VERSION = "1" as const;
export const REPORT_PUBLICATION_COPY_VERSION =
  "report-publication-policy-v1" as const;

export type ReportPublicationMutationAction = "publish" | "unpublish";

export type OwnedReportPublicationMutationInput = {
  action: ReportPublicationMutationAction;
  ownerKind: ReportPublicationOwnerKind;
  tier: ReportAccessTier;
  identityConsentState: ReportIdentityConsentState;
  adminRestricted?: boolean;
};

export type OwnedReportPublicationMutationDecision =
  | {
      ok: true;
      action: ReportPublicationMutationAction;
      visibility: "public" | "unpublished";
      publicationIntent: ReportPublicationIntent;
      policy: ReportPublicationPolicy;
    }
  | {
      ok: false;
      action: ReportPublicationMutationAction;
      code:
        | "admin-restricted"
        | "owner-kind-not-account"
        | "policy-rejected";
      policy: ReportPublicationPolicy;
    };

function compactReasons(
  ...reasons: Array<string | false | null | undefined>
): string[] {
  return reasons.filter((reason): reason is string => Boolean(reason));
}

export function evaluateReportPublicationPolicy(
  input: ReportPublicationPolicyInput,
): ReportPublicationPolicy {
  const publicationIntent = input.publicationIntent ?? "default";
  const requestedPublicationConsent =
    input.publicationConsentState ?? "pending";
  const identityConsentState = input.identityConsentState ?? "withheld";
  const legacyRecord = input.legacyRecord === true || input.ownerKind === "legacy";

  if (input.adminRestricted === true) {
    return {
      version: REPORT_PUBLICATION_POLICY_VERSION,
      ownerKind: input.ownerKind,
      tier: input.tier,
      publicationState: "restricted",
      publicationConsentState:
        input.tier === "free" ? "not-required" : requestedPublicationConsent,
      identityConsentState,
      indexingPolicy: "noindex",
      publiclyReadable: false,
      sitemapEligible: false,
      identityPublic: false,
      reasons: ["admin-restriction-overrides-publication"],
    };
  }

  if (legacyRecord) {
    return {
      version: REPORT_PUBLICATION_POLICY_VERSION,
      ownerKind: input.ownerKind,
      tier: input.tier,
      publicationState: "private",
      publicationConsentState: requestedPublicationConsent,
      identityConsentState,
      indexingPolicy: "noindex",
      publiclyReadable: false,
      sitemapEligible: false,
      identityPublic: false,
      reasons: ["legacy-report-never-auto-publishes"],
    };
  }

  if (input.ownerKind === "local" || input.tier === "preview") {
    return {
      version: REPORT_PUBLICATION_POLICY_VERSION,
      ownerKind: input.ownerKind,
      tier: input.tier,
      publicationState: "private",
      publicationConsentState: "pending",
      identityConsentState,
      indexingPolicy: "noindex",
      publiclyReadable: false,
      sitemapEligible: false,
      identityPublic: false,
      reasons: ["local-preview-is-not-a-publication-record"],
    };
  }

  if (input.tier === "free") {
    const publicationState =
      publicationIntent === "unpublish" ? "unpublished" : "public";
    const publiclyReadable = publicationState === "public";

    return {
      version: REPORT_PUBLICATION_POLICY_VERSION,
      ownerKind: input.ownerKind,
      tier: input.tier,
      publicationState,
      publicationConsentState: "not-required",
      identityConsentState,
      indexingPolicy: publiclyReadable ? "indexable" : "noindex",
      publiclyReadable,
      sitemapEligible: publiclyReadable,
      identityPublic:
        publiclyReadable && identityConsentState === "granted",
      reasons: compactReasons(
        publiclyReadable
          ? "free-report-is-public-by-product-contract"
          : "owner-unpublished-free-report",
        identityConsentState !== "granted" &&
          "identity-withheld-independently-of-publication",
      ),
    };
  }

  const ownerGrantedPublication =
    publicationIntent === "publish" &&
    requestedPublicationConsent === "granted";
  const ownerWithdrewPublication =
    publicationIntent === "unpublish" ||
    requestedPublicationConsent === "withdrawn";
  const publicationState = ownerGrantedPublication
    ? "public"
    : ownerWithdrewPublication
      ? "unpublished"
      : "private";
  const publiclyReadable = publicationState === "public";

  return {
    version: REPORT_PUBLICATION_POLICY_VERSION,
    ownerKind: input.ownerKind,
    tier: input.tier,
    publicationState,
    publicationConsentState: requestedPublicationConsent,
    identityConsentState,
    indexingPolicy: publiclyReadable ? "indexable" : "noindex",
    publiclyReadable,
    sitemapEligible: publiclyReadable,
    identityPublic: publiclyReadable && identityConsentState === "granted",
    reasons: compactReasons(
      ownerGrantedPublication
        ? "premium-owner-explicitly-published"
        : ownerWithdrewPublication
          ? "premium-owner-unpublished"
          : "premium-private-by-default",
      identityConsentState !== "granted" &&
        "identity-withheld-independently-of-publication",
    ),
  };
}

export function evaluateOwnedReportPublicationMutation(
  input: OwnedReportPublicationMutationInput,
): OwnedReportPublicationMutationDecision {
  const publicationIntent: ReportPublicationIntent =
    input.action === "publish" ? "publish" : "unpublish";
  const publicationConsentState: ReportPublicationConsentState =
    input.tier === "premium"
      ? input.action === "publish"
        ? "granted"
        : "withdrawn"
      : "not-required";
  const policy = evaluateReportPublicationPolicy({
    ownerKind: input.ownerKind,
    tier: input.tier,
    publicationIntent,
    publicationConsentState,
    identityConsentState: input.identityConsentState,
    adminRestricted: input.adminRestricted,
    legacyRecord: input.ownerKind === "legacy",
  });

  if (input.adminRestricted === true) {
    return {
      ok: false,
      action: input.action,
      code: "admin-restricted",
      policy,
    };
  }

  if (input.ownerKind !== "account") {
    return {
      ok: false,
      action: input.action,
      code: "owner-kind-not-account",
      policy,
    };
  }

  const expectedState =
    input.action === "publish" ? "public" : "unpublished";

  if (policy.publicationState !== expectedState) {
    return {
      ok: false,
      action: input.action,
      code: "policy-rejected",
      policy,
    };
  }

  return {
    ok: true,
    action: input.action,
    visibility: expectedState,
    publicationIntent,
    policy,
  };
}

type GeneratedVisibilityInput = {
  kind: GeneratedReportVisibilityKind;
  nickname: string | null;
  ownerKind: ReportPublicationOwnerKind;
  tier: ReportAccessTier;
  publicationIntent?: ReportPublicationIntent;
  publicationConsentState?: ReportPublicationConsentState;
  identityConsentState?: ReportIdentityConsentState;
  legacyRecord?: boolean;
  compatibilityIndexAfterConsent?: boolean;
  compatibilityRequiresPublicationConsent?: boolean;
};

function publicationSummary(policy: ReportPublicationPolicy): string {
  if (policy.publicationState === "restricted") {
    return "این گزارش از نمایش عمومی محدود شده است.";
  }

  if (policy.tier === "free" && policy.publicationState === "public") {
    return "گزارش رایگان عمومی و قابل ایندکس است؛ نمایش هویت فقط با رضایت جداگانه انجام می‌شود.";
  }

  if (policy.tier === "premium" && policy.publicationState === "public") {
    return "مالک گزارش پریمیوم با رضایت صریح، انتشار عمومی را فعال کرده است.";
  }

  if (policy.publicationState === "unpublished") {
    return "این گزارش از انتشار عمومی خارج شده و قابل ایندکس نیست.";
  }

  return "این گزارش خصوصی است و در نتایج عمومی یا نقشهٔ سایت قرار نمی‌گیرد.";
}

export function createGeneratedReportVisibility(
  input: GeneratedVisibilityInput,
): GeneratedReportVisibility {
  const publicationPolicy = evaluateReportPublicationPolicy({
    ownerKind: input.ownerKind,
    tier: input.tier,
    publicationIntent: input.publicationIntent,
    publicationConsentState: input.publicationConsentState,
    identityConsentState: input.identityConsentState,
    legacyRecord: input.legacyRecord,
  });
  const indexingPolicy: GeneratedReportIndexingPolicy =
    input.compatibilityIndexAfterConsent &&
    publicationPolicy.indexingPolicy === "noindex"
      ? "index-after-consent"
      : publicationPolicy.indexingPolicy;

  return {
    kind: input.kind,
    indexingPolicy,
    nickname: input.nickname,
    consent: {
      required:
        input.compatibilityRequiresPublicationConsent === true ||
        (publicationPolicy.tier === "premium" &&
          publicationPolicy.publicationState !== "public"),
      capturedAt: null,
      copyVersion: REPORT_PUBLICATION_COPY_VERSION,
      userFacingSummary: publicationSummary(publicationPolicy),
    },
    publicationPolicy,
    notes: publicationPolicy.reasons,
  };
}

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
