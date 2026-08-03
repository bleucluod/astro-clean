export type HumanFirstEvidence = {
  id: string;
  label: string;
  detail: string;
};

export type HumanFirstNarrativeBlock = {
  id: string;
  title: string;
  humanExperience: string;
  dailySituation: string;
  feelingOrReaction: string;
  effect: string;
  strength: string;
  challenge: string;
  practicalStep: string;
  evidence: HumanFirstEvidence[];
};

export type HumanFirstDirectionalNarrativeBlock =
  HumanFirstNarrativeBlock & {
    personA: string;
    personB: string;
    cycle: string;
  };

export type HumanFirstReadingSectionId =
  | "overview"
  | "primary-patterns"
  | "strength-challenge"
  | "inner-world"
  | "mind-language"
  | "relationships"
  | "drive-direction"
  | "friction-repair"
  | "growth-path"
  | "deeper-layers"
  | "chart-details";

export type HumanFirstNavigationItem = {
  id: HumanFirstReadingSectionId;
  label: string;
};
