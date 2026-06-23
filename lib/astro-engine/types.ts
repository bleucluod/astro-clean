import type { ZodiacKey } from "@/types/astro";

export type AstroElement = "fire" | "earth" | "air" | "water";

export type AstroModality = "cardinal" | "fixed" | "mutable";

export type AstroPolarity = "yang" | "yin";

export type EngineChartPoint = "sun" | "moon" | "rising";

export type InsightCategory =
  | "identity"
  | "emotion"
  | "social-mask"
  | "balance"
  | "growth";

export type InsightTone = "supportive" | "reflective" | "caution";

export type EngineChartInput = Partial<Record<EngineChartPoint, ZodiacKey>>;

export type ZodiacSymbolProfile = {
  key: ZodiacKey;
  faName: string;
  enName: string;
  element: AstroElement;
  modality: AstroModality;
  polarity: AstroPolarity;
  keywords: string[];
  symbolicSummary: string;
};

export type EngineInsight = {
  id: string;
  category: InsightCategory;
  tone: InsightTone;
  title: string;
  summary: string;
  keywords: string[];
  weight: number;
  source: {
    point?: EngineChartPoint;
    sign?: ZodiacKey;
    rule: string;
  };
};

export type EngineProfile = {
  elements: Record<AstroElement, number>;
  modalities: Record<AstroModality, number>;
  dominantElement: AstroElement | null;
  dominantModality: AstroModality | null;
};

export type EngineResult = {
  version: "engine-v0";
  generatedAt: string;
  profile: EngineProfile;
  insights: EngineInsight[];
  safetyNote: string;
};
