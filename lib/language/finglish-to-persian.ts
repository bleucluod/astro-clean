import { getFinglishPhraseMap } from "@/lib/language/finglish-map";

export function convertControlledFinglishToPersian(input: string) {
  const phraseMap = getFinglishPhraseMap();

  return input
    .split(/(\s+|[.,!?،؛:()\[\]-]+)/u)
    .map((part) => {
      const normalized = part.trim().toLowerCase();

      if (!normalized) {
        return part;
      }

      return phraseMap.get(normalized) ?? part;
    })
    .join("");
}

export function hasConvertibleFinglish(input: string) {
  const phraseMap = getFinglishPhraseMap();

  return input
    .split(/\s+/u)
    .some((part) => phraseMap.has(part.trim().toLowerCase()));
}
