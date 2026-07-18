# Halleus Project Context

Last updated: 2026-07-18
Authority checkpoint: `v0.1.333-wiki-queue-operations-ai-guide`
Checkpoint commit: `f6cc03e0fd37c6ea04acc6031ea2a2d28aab031c`

This file is the compact live handoff for Halleus. It is operational authority, not a milestone archive. Historical details belong in Git history and release tags.

## 1. Authority and evidence order

Use this order whenever sources disagree:

1. Current terminal output from the active user repository for branch, HEAD, tag, index, worktree, untracked files, generated files, and local tooling.
2. Current VPS output for active release, previous release, systemd state, production environment, migrations, production data, and live smoke behavior.
3. Tracked files from the exact active commit on GitHub when local HEAD equals `origin/main` and the worktree is clean.
4. Product-direction decisions in this file and `docs/HALLEUS_IDEA_GARDEN.md`.
5. Engine contracts in `types/report-generation.ts` and current live engine/report source.
6. `docs/HALLEUS_ENGINE_REALITY_AUDIT.md` and `docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md` only as historical design records; their old baselines are not current-state evidence.
7. Conversation memory and older summaries.

Never generate code, guards, runners, transforms, routes, or patches from remembered structure. Inspect every relevant live target, contract, route, script, registry entry, and guard first.

## 2. Verified release checkpoint

Verified from the completed release on 2026-07-18:

```text
Repository: https://github.com/bleucluod/astro-clean
Local root: C:\Projects\astro-clean
Branch: main
HEAD/origin/main: f6cc03e0fd37c6ea04acc6031ea2a2d28aab031c
Tag at HEAD: v0.1.333-wiki-queue-operations-ai-guide
Production active release: /srv/halleus/releases/v0.1.333-wiki-queue-operations-ai-guide-f6cc03e0fd37
Rollback release: /srv/halleus/releases/v0.1.332-wiki-bulk-scheduling-actions-e81e45a75683
Service: halleus.service active and enabled
```

The release build, TypeScript pass, static generation, service restart, and public smoke checks passed. Local tracked files were clean after release; old PowerShell runners remained untracked and are not project source.

Always reverify these values before a modifying batch. A checkpoint in this document is a handoff anchor, not permission to assume current Git or VPS state.

## 3. Product direction

Halleus is a Persian-first astrology and self-discovery product centered on useful, readable birth-chart reports.

Priorities:

1. Real report value, depth, synthesis, and report-page reading experience.
2. Honest astrology calculation and limitations.
3. Clear guest/free versus premium/private behavior.
4. The live Persian Wiki as a trusted educational and organic-acquisition surface.
5. Sky Pulse only when its transit source is verified and its claims remain bounded.

The product should feel calm, minimal, human, reflective, trustworthy, and app-like. It must not feel like fortune-telling, deterministic prediction, a generic astrology blog, or an exposed engineering workbench.

Avoid reopening completed work, generic infrastructure, broad polish, docs-only detours, premature SEO expansion, or payment/hosting work unless it solves an active failure or directly enables the selected product minimum.

## 4. Report publication, privacy, and consent model

This is the authoritative product model. Check `docs/HALLEUS_IDEA_GARDEN.md` before changing it.

```text
Guest report: public and indexable.
Logged-in free report: public and indexable.
Logged-in premium report: private and noindex by default.
Premium owner: may explicitly make a selected report public and indexable.
Identifying details: optional and shown only with explicit consent.
Analytics consent: never substitutes for report-publication consent.
Admin: may restrict or unpublish an existing public report, but may not force a private report public.
```

Important implementation distinction:

- The model above is the approved product direction.
- Current report routes remain noindex until the public-report route, ownership, publication consent, unpublish/delete behavior, and indexing contract are fully implemented and verified.
- Premium-request intake already records `private` versus `public_with_consent` choices, but that is not proof that the full public-report system is live.
- Do not describe current stored report pages as indexable merely because the future product model says free reports will be public.

## 5. Current technical foundation

### Application stack

```text
Next.js 16.2.9 App Router
React 19.2.4
TypeScript
astronomy-engine 2.1.19
@astrodraw/astrochart 3.0.2 as renderer only
Supabase authentication and Postgres-backed server storage
postgres 3.4.x runtime client
```

### Birth-chart engine

Current live source is the authority. At the checkpoint:

- Geocentric planetary positions for Sun through Pluto use `astronomy-engine`.
- Civil birth time is converted through the supplied IANA timezone.
- Ascendant, descendant, midheaven, and IC are calculated and normalized.
- The local Placidus calculator is active for new charts.
- Polar or non-convergent Placidus cases do not silently substitute a different house system.
- Retrograde state is calculated from sampled apparent geocentric longitude.
- The current default lunar-node path is the local True/Osculating model based on `GeoMoonState`; the South Node is the derived opposition.
- Local True/Osculating Black Moon Lilith exists as guarded technical engine output, but interpretive report narrative remains disabled while `approvedForReportOutput` is false.
- Uncertain birth time, timezone boundaries, polar limits, and other accuracy limits must remain visible and honest.

Do not let AI invent chart calculations. Calculation rules and report-language naturalization remain separate responsibilities.

### Report generation

- `types/report-generation.ts` is the canonical generation contract authority.
- `/api/engine/real-chart` uses the report-generation service and returns an explicit generation contract.
- The public form still preserves a safe fallback bridge so a calculation failure does not create a broken user flow.
- A fallback must be labeled as fallback; it must not be presented as equivalent to a fully calculated chart.
- The report page includes narrative sections, technical facts, aspects, personal-transit relevance, special points, and the natal chart wheel when the stored data supports them.
- The chart wheel is visualization only and must never become a calculation source.

The next product work should improve synthesis, reduce repetition, clarify reading order, and increase the felt value of the report before scaling premium gates or public report SEO.

### Accounts and report storage

- Username/password authentication and mobile-number collection are established through Supabase.
- Account report save/read paths exist with ownership checks and safe local fallback behavior.
- Local and account copies are distinct storage states; never assume one implies deletion or migration of the other.
- Production data is not changed by a code deploy unless an approved migration, seed, or explicit data operation runs.
- A Wiki article published in production remains published across ordinary local code changes and release deployment because publication state is database data, not build output.

### Admin and premium operations

- Admin authorization is server-side and database-backed through private membership records keyed to authenticated users.
- Capabilities and audit events are authoritative; client flags, query parameters, and user metadata are not authorization.
- Premium-request intake and operational status management exist.
- Payment expansion, automatic entitlement, and broad paywall configuration remain separate product work.

### Wiki

The Persian Wiki is live and must be preserved.

- Public Wiki reads are database-first and server-only.
- Only published, indexable, already-published rows may reach public routes, redirects, or sitemap output.
- The tracked content snapshot is a recovery path for database/schema failure, not a bypass that may resurrect draft, scheduled, archived, deleted, or nonindex rows.
- Valid Wiki articles are self-canonical and index/follow.
- The Wiki CMS supports packages/import, drafts, editing, revisions, rollback, soft delete/restore, categories, media, scheduling, publication jobs, audit, revalidation, and automatic publishing.
- Queue operations support reschedule, cancel, bounded retry, concurrency checks, priority, dependency-aware position preview/apply, and a live AI content guide.
- Actual production queue/settings state is database state and must be checked live before operational claims.

### SEO and analytics

- The homepage, main public product routes, Wiki index, and valid Wiki articles are organic-acquisition surfaces.
- Internal/account/admin/engine/quality routes remain noindex boundaries.
- Report routes remain noindex until the approved public-report model is actually implemented.
- Sitemap and Search Console indexing were externally verified for key Wiki URLs; future claims must still be checked against live Search Console and public responses.
- GA4 is limited to approved public paths, supports explicit opt-out, and excludes report routes, birth data, report content, names, mobile numbers, email addresses, account IDs, and report IDs.
- Analytics preference never grants permission to publish a report.

### VPS release model

- Production uses `/srv/halleus/releases/<tag>-<short-sha>` worktrees.
- `/srv/halleus/current` and `/srv/halleus/previous` provide atomic activation and rollback targets.
- `ops/vps/halleus-release.sh` verifies the exact commit/tag, installs locked dependencies, runs release checks, builds before activation, restarts `halleus.service`, runs smoke checks, and restores the previous release if activation smoke fails.
- A Git commit, GitHub push, active VPS release, database state, and public behavior are separate states and must be reported separately.

## 6. Known gaps and boundaries

Do not blur these gaps:

- The approved free-public/premium-private publication model is not yet fully implemented on report routes.
- Premium access control and admin-configurable report-section gating are not complete.
- Payment/entitlement expansion is not the current priority unless the user explicitly activates it after meaningful traffic or premium requests.
- Report depth, synthesis, and reading experience still need focused improvement.
- Public user profiles and selected public reports are future work.
- Sky Pulse must not expand beyond verified transit/calculation sources.
- Old context baselines, progress percentages, Render assumptions, and historical “next batch” notes are not current authority.

## 7. Batch and modification workflow

### Safety Gate

Before the first modifying action, state:

```text
HEAD and origin/main
latest tag
worktree/index/untracked state
exact files inspected
allowed and forbidden targets
apply method
checks and impact plan
commit/tag/push/deploy plan
rollback boundary
failure-ledger risks demonstrated by the live task
```

Unknown fields require read-only inspection before modification.

### Scope

Each batch should contain at most:

- one product minimum,
- one focused behavioral or contract guard,
- docs only for a durable decision.

Small changes must remain small. Combine only changes with the same runtime path, failure boundary, and verification plan.

### Runner artifact

A modifying artifact must be a ZIP whose root contains exactly one uniquely named `.ps1` runner.

The runner must:

- verify branch, HEAD, tag, target blobs, index, tracked worktree, and known untracked artifacts;
- reject unrelated dirty or untracked files;
- write only approved targets;
- back up tracked targets outside the repository;
- stop on failure and roll back only its own changes;
- preserve encoding and line endings;
- show final Git status and a no-pager diff;
- never commit, tag, push, deploy, migrate, alter Nginx, or change production data unless that release/data action was explicitly approved.

Do not deliver loose runners, source files, recovery runners, cleanup runners, formatting runners, or commit-preparation runners.

### Mandatory isolated preflight

Before delivery, reproduce the exact after-state from the exact verified source in an isolated worktree or disposable repo copy. Run:

- exact changed-file boundary checks,
- every new or modified guard,
- the live `check:plan` and `verify` implementations when they cover the impact,
- encoding,
- required lint,
- `git --no-pager diff --check`,
- required production build.

The user's worktree must not be the first full test environment.

### Verification acceleration

- `config/halleus-check-impact.json` is the shared impact registry.
- `pnpm run check:plan -- <files>` explains the required guards, lint, and build.
- `pnpm run verify -- <files>` executes that plan.
- Runners must not reimplement pnpm/build process launching when the shared verifier already covers it.
- Unknown paths fail safe.
- Docs-only changes may skip lint/build only when the live planner proves that policy.

### Failure handling

After any failure:

1. Stop.
2. Inspect status, index, diff, rollback output, and final Git state.
3. Classify external versus internal failure.
4. Do not retry blindly.

After a delivered runner fails, discard it and enter diagnosis-only mode. Restart only as a fresh smaller batch after new inspection, a new Safety Gate, a new rollback boundary, and explicit user direction.

### Finalization

After required checks pass:

1. Stage only approved project files.
2. Never stage runners, ZIPs, collected context, generated artifacts, or unrelated files.
3. Show staged status and diff summary.
4. Wait for explicit release confirmation.
5. On confirmation, combine commit, tag, atomic push, deploy, release status, and smoke verification when practical.
6. Stop immediately on unresolved failure.

## 8. Current sequence

Until the user changes direction:

1. Complete the authority realignment in this document and the Idea Garden.
2. Run the focused workflow reliability/speed batch based on demonstrated runner and impact-plan failures.
3. Resume report-value, depth, generation, and report-page experience work.
4. Preserve the live/indexed Wiki and add Wiki work only when selected or when it directly supports report value.
5. Implement premium visibility/access and the free-public/premium-private model only from the approved contract, without confusing product direction with current live indexing.
6. Defer broad SEO, payment expansion, hosting changes, generic infrastructure, and unrelated polish unless an active failure requires them.

## 9. Historical note

This file intentionally no longer contains the long append-only milestone and failure archive. Git commits and release tags preserve that history. Only current verified evidence and durable active rules belong here.
