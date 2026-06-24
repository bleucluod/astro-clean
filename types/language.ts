export type HalleusLocale = "fa-IR";

export type FinglishPhrase = {
  key: string;
  finglish: string;
  persian: string;
  category: "navigation" | "report" | "action" | "status" | "safety";
};

export type PersianCopyEntry = {
  key: string;
  value: string;
  description: string;
};

export type LanguageReadinessReport = {
  locale: HalleusLocale;
  copyRegistryReady: boolean;
  finglishConverterReady: boolean;
  uiSafetyReady: boolean;
  blockers: string[];
  nextSteps: string[];
};
