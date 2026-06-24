import type { FinglishPhrase } from "@/types/language";

export const FINGLISH_PHRASES: FinglishPhrase[] = [
  {
    key: "report",
    finglish: "gozaresh",
    persian: "گزارش",
    category: "report",
  },
  {
    key: "section",
    finglish: "bakhsh",
    persian: "بخش",
    category: "report",
  },
  {
    key: "symbolic",
    finglish: "namadin",
    persian: "نمادین",
    category: "safety",
  },
  {
    key: "reflection",
    finglish: "taamol",
    persian: "تأمل",
    category: "safety",
  },
  {
    key: "birth",
    finglish: "tavallod",
    persian: "تولد",
    category: "report",
  },
  {
    key: "chart",
    finglish: "chart",
    persian: "چارت",
    category: "navigation",
  },
  {
    key: "engine",
    finglish: "engine",
    persian: "موتور",
    category: "navigation",
  },
  {
    key: "download",
    finglish: "download",
    persian: "دانلود",
    category: "action",
  },
  {
    key: "copy",
    finglish: "copy",
    persian: "کپی",
    category: "action",
  },
];

export function getFinglishPhraseMap() {
  return new Map(FINGLISH_PHRASES.map((phrase) => [phrase.finglish, phrase.persian]));
}
