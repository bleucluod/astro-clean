import type { LanguageReadinessReport } from "@/types/language";
import { FINGLISH_PHRASES } from "@/lib/language/finglish-map";
import { PERSIAN_PRODUCT_COPY } from "@/lib/language/persian-product-copy";

export function getLanguageReadinessReport(): LanguageReadinessReport {
  const blockers: string[] = [];
  const nextSteps = [
    "Move remaining user-facing labels into the Persian copy registry.",
    "Use controlled Finglish only for new copy drafts.",
    "Convert controlled Finglish through the local converter before writing UI text.",
    "Keep runner files ASCII-only and write Persian content through UTF-8 payloads.",
  ];

  if (FINGLISH_PHRASES.length < 8) {
    blockers.push("Finglish phrase map is too small for broad copy conversion.");
  }

  if (PERSIAN_PRODUCT_COPY.length < 6) {
    blockers.push("Persian copy registry needs more user-facing entries.");
  }

  return {
    locale: "fa-IR",
    copyRegistryReady: PERSIAN_PRODUCT_COPY.length >= 6,
    finglishConverterReady: FINGLISH_PHRASES.length >= 8,
    uiSafetyReady: blockers.length === 0,
    blockers,
    nextSteps,
  };
}
