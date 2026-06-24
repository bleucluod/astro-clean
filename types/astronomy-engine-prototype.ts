export type AstronomyEnginePrototypeStatus =
  | "package-ready"
  | "package-missing"
  | "calculation-failed";

export type AstronomyEnginePrototypeBody =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn";

export type AstronomyEnginePrototypeNote = {
  status: AstronomyEnginePrototypeStatus;
  message: string;
};
