import { hasAuthConfig, hasDatabaseConfig } from "@/lib/config/env";
import type {
  AuthProviderOption,
  AuthReadinessReport,
} from "@/types/auth";

export const AUTH_PROVIDER_OPTIONS: AuthProviderOption[] = [
  {
    provider: "supabase",
    status: "selected",
    strengths: [
      "Auth and Postgres can live in one platform.",
      "Useful when database and account storage should ship together.",
      "Good fit for a fast account-backed MVP after local-preview is stable.",
    ],
    tradeoffs: [
      "Platform coupling is higher than Auth.js plus a separate database.",
      "Migration strategy should be documented before production users exist.",
    ],
    bestWhen: [
      "You want fewer moving pieces.",
      "You want auth and database readiness to move together.",
      "You want report ownership and account storage to ship in one foundation.",
    ],
  },
  {
    provider: "authjs",
    status: "recommended",
    strengths: [
      "Flexible provider model.",
      "Works well with a separate Postgres provider.",
      "Keeps auth provider choice more portable.",
    ],
    tradeoffs: [
      "More setup decisions are owned by the app.",
      "Needs careful session/database configuration.",
    ],
    bestWhen: [
      "You want to keep the database and auth stack loosely coupled.",
      "You are comfortable managing more implementation details.",
    ],
  },
  {
    provider: "clerk",
    status: "undecided",
    strengths: [
      "Fast account UI and account management.",
      "Good when polished auth UX matters early.",
    ],
    tradeoffs: [
      "More product behavior lives outside the app.",
      "Pricing and account model should be reviewed before committing.",
    ],
    bestWhen: [
      "You want account UX fast.",
      "You are okay with a managed identity layer.",
    ],
  },
];

export function getAuthReadinessReport(): AuthReadinessReport {
  const blockers: string[] = [];
  const recommendedNextSteps: string[] = [];

  if (!hasDatabaseConfig()) {
    blockers.push("DATABASE_URL is not configured.");
    recommendedNextSteps.push("Configure the Supabase/Postgres database URL outside Git.");
  }

  if (!hasAuthConfig()) {
    blockers.push("AUTH_SECRET is not configured.");
    recommendedNextSteps.push("Configure the auth/session secret outside Git.");
  }

  recommendedNextSteps.push("Implement the Supabase auth driver behind the AuthDriver contract.");
  recommendedNextSteps.push("Connect report records to authenticated Supabase user ids.");
  recommendedNextSteps.push("Build local-preview to account migration UI.");
  recommendedNextSteps.push("Keep reports private/noindex until explicit public consent exists.");

  return {
    stage: blockers.length === 0 ? "staging" : "provider-selected",
    provider: "supabase",
    canEnableRealLogin: blockers.length === 0,
    blockers,
    recommendedNextSteps,
  };
}
