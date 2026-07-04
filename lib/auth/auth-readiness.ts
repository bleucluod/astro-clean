import {
  hasAuthConfig,
  hasDatabaseConfig,
  hasSupabasePublicConfig,
  hasSupabaseServerConfig,
} from "@/lib/config/env";
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

  if (!hasSupabasePublicConfig()) {
    blockers.push("Supabase public URL/anon key are not configured.");
    recommendedNextSteps.push("Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY outside Git.");
  }

  if (!hasSupabaseServerConfig()) {
    recommendedNextSteps.push("Configure SUPABASE_SERVICE_ROLE_KEY only for server-side account migration and never expose it to the client.");
  }

  recommendedNextSteps.push("Use the Supabase auth driver stub for contract wiring only.");
  recommendedNextSteps.push("Keep getAuthDriver on preview unless HALLEUS_ENABLE_SUPABASE_AUTH_STUB=true and public Supabase config exists.");
  recommendedNextSteps.push("Connect report records to authenticated Supabase user ids after migration UI exists.");
  recommendedNextSteps.push("Keep reports private/noindex until explicit public consent exists.");

  return {
    stage: blockers.length === 0 ? "staging" : "provider-selected",
    provider: "supabase",
    canEnableRealLogin: false,
    blockers,
    recommendedNextSteps,
  };
}
