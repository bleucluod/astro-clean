# Halleus Project Context

Last updated: 2026-07-02

This file is the compact handoff source of truth for continuing Halleus. It must stay actionable, not archival. Live terminal output always beats this file for current git/file state.

## 1. Current verified baseline

Latest verified baseline before this context consolidation:

```text
Repo: C:\Projects\astro-clean
Branch: main
HEAD: 52a2afd
Tag at HEAD: v0.1.123-manual-order-process-readiness
origin/main and origin/HEAD: 52a2afd
Working tree after v0.1.123: clean except ignored .env.local
```

Current uncommitted docs work may exist while consolidating this file. Before any product batch, verify with:

```powershell
git status --short --untracked-files=all
git status --short --ignored -- .env .env.local .env.example
git --no-pager log --oneline --decorate -5
git tag --points-at HEAD
```

State separation rule:

```text
Local commit/tag, GitHub push, Render deploy, and public/live behavior are separate states.
A local commit is not live.
A GitHub push is not a Render deploy.
Halleus.ir is the domain identity, not proof that the latest app is deployed.
```

Latest important deployment/database facts:

```text
Render staging beta DB path was verified in v0.1.122 through https://halleus.ir.
Beta DB public route was later disabled in Render env after verification.
Render should be treated as staging/proof for now, not the final hosting commitment.
The user wants to move faster toward the product and later evaluate Iranian hosting.
Render free Postgres has an expiration warning for July 31, 2026 unless upgraded.
```

## 2. Authority order and active files

Authority order:

```text
1. Current user-provided terminal output from the active conversation
2. Current uploaded live files from C:\Projects\astro-clean
3. docs/HALLEUS_PROJECT_CONTEXT.md
4. docs/HALLEUS_IDEA_GARDEN.md
5. Other active authority docs
6. Saved project memory / previous summaries
7. General model memory
```

Active authority files before any relevant batch:

```text
docs/HALLEUS_PROJECT_CONTEXT.md
docs/HALLEUS_IDEA_GARDEN.md
docs/HALLEUS_ENGINE_REALITY_AUDIT.md
docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md
types/report-generation.ts
```

Do not generate product code, runners, or patches from remembered structure. If a file, marker, route, check script, or product direction was not inspected live in the current batch, stop and request or collect missing context.

## 3. Mandatory Safety Gate

Before any coding, runner, artifact, file modification, commit/tag/push, deploy action, or terminal command that changes files, provide a Safety Gate with:

```text
Current known HEAD:
Latest known tag:
Working tree status:
Live files inspected:
Allowed files:
Forbidden files:
Apply method:
Checks:
Commit/tag/push plan:
Rollback plan:
Relevant failure-ledger risks:
```

If any field is unknown, ask for live context first.

Hard requirements:

```text
Safety Gate first is always implicit.
No Safety Gate, no code.
No runner may commit, tag, or push.
Commit/tag/push only after apply + relevant checks + build pass.
Use git --no-pager diff, never plain git diff.
Before commit, remove runner/ZIP/temp artifacts.
Before commit, git status --short must show only intended project files.
```

## 4. Product direction

Halleus is a Persian-first astrology/self-discovery product centered on birth reports.

It should feel:

```text
Persian-first
calm
minimal
private
premium-light
reflective
human
trustworthy
product-grade
```

It must not feel:

```text
daily horoscope
fortune telling
deterministic prediction
generic astrology blog
debug/lab interface
medical/legal/financial advice
```

Core user journey:

```text
landing/product entry
-> /chart
-> Jalali birth date + time + birth city
-> report generation
-> saved report detail
-> report history
-> optional fuller report order
```

MVP must focus on:

```text
clear public entry
/chart with Persian/Jalali UX
working report generation
saved report detail/history
manual fuller-report order bridge
pricing/product/privacy explanation
clean Persian UI without mojibake
minimal public navigation
GitHub pushed state
Render/public verification when making live claims
```

Not required for first MVP:

```text
online payment
full auth/account system
production database ownership model
complete admin order management
email/PDF/export
advanced SEO/content library
complete professional astrology depth
```

## 5. Current product state

Latest durable product state:

```text
v0.1.122: Render staging beta DB smoke passed on https://halleus.ir.
v0.1.123: Manual order process-readiness improved and pushed.
```

Current rough progress after v0.1.123:

```text
Commercial MVP overall: about 74%
Astrology/report engine: about 70-75%
Report UI / user experience: about 70%
Database/server persistence: about 80-85% as guarded staging path, not production ownership
Render deployment/public availability: about 75%
Manual order/monetization bridge: about 60-62%
Auth/account/paid private reports: about 20-25%
SEO/public free reports/wiki: about 20-25%
Iranian hosting readiness: about 10-15%
Launch readiness: about 60-65%
```

Do not inflate progress because something exists locally. Update progress only after checks/build, commit/tag/push, deployment verification, public smoke, or a feature moving from shell to real product flow.

## 6. Roadmap and next phase

Near-term sequence:

```text
1. Finish v0.1.124 public footer/internal-route alignment.
2. Public MVP/navigation readiness cleanup.
3. Report detail conversion polish.
4. MVP launch checklist.
5. Iranian hosting feasibility research only after product flow is stronger.
```

Current v0.1.124 decision:

```text
Dashboard/admin can remain accessible routes, but they should not be promoted as primary public footer links.
Do not delete /dashboard or /admin in this phase.
Do not touch sitemap, robots, product-surface, auth, payment, database, or Render unless separately inspected and scoped.
If footer links change, align components/AppShell.tsx and scripts/check-site-chrome-minimal-ui.mjs in the same scoped batch.
```

Idea Garden rule:

```text
Every product idea, roadmap decision, SEO strategy, public/private model decision, or scope change must be checked against and/or added to docs/HALLEUS_IDEA_GARDEN.md.
Do not implement a product idea that conflicts with Idea Garden unless the user explicitly changes direction.
```

## 7. Public navigation rules

Important public routes:

```text
/
/chart
/reports
/product
/pricing
/order
/privacy
```

Less prominent/internal routes:

```text
/dashboard
/profile
/roadmap
/wiki
/quality
/engine/*
/admin
```

Header/footer rules:

```text
Keep public navigation minimal.
Keep important product routes discoverable.
Do not expose admin as primary public navigation.
Do not remove route discoverability in the name of minimalism.
Do not change route paths because of Halleus.ir.
```

Known navigation conflict found in v0.1.124:

```text
components/AppShell.tsx had /dashboard and /admin in footerLinks.
scripts/check-site-chrome-minimal-ui.mjs also required those two footer routes.
A valid product decision to remove them from public footer must update the check script at the same time.
```

## 8. Runner and artifact rules

Preferred Halleus artifact shape:

```text
single uniquely named .ps1 runner
```

If ZIP is unavoidable, ZIP root must contain only the unique .ps1, or a namespaced non-source folder. Do not include root-level README.md, package.json, docs/*, payload/, app/, components/, lib/, src/, types/, or source-like files unless they are explicit intended targets.

Download/run communication must explicitly say:

```text
1. Download it.
2. Copy the .ps1 into C:\Projects\astro-clean.
3. Then run the command.
```

Runner rules:

```text
Run from repo root only.
PowerShell should orchestrate only.
Avoid embedded Persian in PowerShell.
If Persian must be in .ps1, use UTF-8 with BOM or Unicode escapes.
Avoid raw SHA guards on Windows unless generated from exact live files immediately before use.
Prefer clean-tree + allowed-file + semantic guards.
Fail on tracked dirty files unless the batch explicitly owns those files.
Allow only known untracked runner/current ZIP files.
Fail on unrelated untracked source-like files.
Write only explicitly allowed target files.
Do not leave payload/source-like temp folders in repo root before build.
```

Cleanup rules:

```text
Do not use Remove-Item -LiteralPath with wildcard patterns.
For cleanup, inspect exact artifact filenames first, then delete exact -LiteralPath values.
For wildcard cleanup, use -Path only with a tightly scoped reviewed pattern.
After any cleanup/archive failure, stop and inspect git status and exact artifact list.
```

Archive/context rules:

```text
Do not ask the user to paste long terminal output when a ZIP is safer.
User-created context ZIPs are created inside C:\Projects\astro-clean.
If a context ZIP remains untracked, include exact cleanup in the next command.
Compress-Archive can fail on copied temp files; prefer tar.exe -a -cf for context ZIPs after exact cleanup.
```

## 9. Checks

For TypeScript/runtime/UI changes:

```powershell
pnpm run check:encoding
git --no-pager diff --check
pnpm build
```

Run relevant focused checks for the touched area, for example:

```powershell
pnpm run check:report-order-context
pnpm run check:site-chrome-minimal-ui
pnpm run check:product-surface
```

Check-script rules:

```text
Existing checks are authority until explicitly changed through an inspected decision.
When product direction changes, align UI source, check script, and docs in the same scoped batch.
Checks should validate stable contracts, not stale long Persian copy or implementation details.
Visible-label guards must target exact user-facing strings only, not internal identifiers.
Do not print "passed" before all assertions are complete.
```

## 10. Failure handling protocol

If a runner/check fails:

```text
1. Stop.
2. Do not rerun blindly.
3. Inspect git status --short --untracked-files=all.
4. Inspect targeted diffs and the failing check/script.
5. Restore only known accidental files.
6. Backup before restoring overwritten tracked files.
7. If the same batch fails twice, reduce scope or switch to diagnosis.
8. Do not commit/tag/push after failed checks.
9. Record workflow failures in this file, then continue with a smaller inspected step.
```

Do not skip a planned product phase merely because a runner failed. Roll back the failed attempt, preserve the phase, and re-enter with smaller inspected steps.

## 11. Consolidated failure ledger

The old file repeated many single-incident entries. This compact ledger groups them by failure pattern. Use the prevention rules, not the old numbering.

### A. Encoding, Persian text, and terminal rendering

Errors seen:

```text
Persian mojibake such as Ø, Ù, Û, Ú, â€ or �.
Persian samples becoming question marks.
Raw Persian markers in pasted PowerShell/Node here-strings failing to match live UTF-8 files.
Console output showing mojibake while Node could read the file correctly.
v0.1.128 first report-text runner wrote mojibake into real-engine-report-writer.ts and report-v3.ts because raw Persian here-strings were interpreted by Windows PowerShell before writing UTF-8.
```

Prevention:

```text
Avoid Persian raw text inside pasted terminal runners for exact matching.
Use ASCII structural markers plus Unicode escapes or a UTF-8 artifact.
Use Node JSON/string probes for Persian file inspection.
Run check:encoding after Persian changes.
For runners that must write Persian full-file content, use an ASCII-only runner that writes pre-encoded UTF-8 bytes, or otherwise prove Windows PowerShell will not reinterpret raw Persian source text.
Treat check:encoding and build as necessary but not sufficient for Persian spacing/copy quality.
```

### B. Guessed markers, stale context, and brittle JSX patching

Errors seen:

```text
Runners guessed ChartForm, ReportDetail, ManualOrderRequestForm, AppShell, or route structure.
Generic markers such as </main>, return (...), or broad substring markers matched zero or multiple locations.
Regex replacement crossed multiline JSX and broke TSX.
Large expected oldText blocks failed after live files changed.
```

Prevention:

```text
Inspect exact live files and relevant check scripts before patching.
Avoid regex across JSX attributes or multiline JSX.
Use minimal line edits, exact current-line replacements, or full-file replacement only after inspection.
After marker failure, inspect duplicate/missing marker locations before retrying.
```

### C. Runner transaction and Git safety failures

Errors seen:

```text
Runner continued after patch failure.
Runner committed/tagged after checks failed.
Wrong tag created on previous commit.
Duplicate tag attempt.
git pager confusion from plain git diff.
```

Prevention:

```text
Every command wrapper must fail fast.
No runner may commit/tag/push.
If git commit says nothing to commit, do not tag.
Before tagging, verify HEAD changed to the expected commit.
Use git --no-pager diff.
Check tag existence before creating a tag.
```

### D. Artifact and repo hygiene failures

Errors seen:

```text
Artifact ZIP root README.md overwrote tracked README.md.
payload/ or copied source-like folders in repo root were compiled by Next.
Runner/ZIP/context/temp files remained untracked.
Download artifact was assumed to exist in repo root when it had not been copied.
```

Prevention:

```text
ZIP root must not contain README.md or source-like files unless they are intended targets.
Never leave payload/, app/, components/, lib/, types/, or copied TS/TSX in repo root before build.
Always remove runner/ZIP/temp artifacts before commit.
Instructions must say to download/copy the .ps1 into C:\Projects\astro-clean before running.
```

### E. PowerShell and Windows-specific failures

Errors seen:

```text
Execution policy blocked .ps1.
Null .Trim() call on empty native command output.
Bracket path [reportId] treated as wildcard.
Remove-Item -LiteralPath used with wildcard.
Compress-Archive file-lock error.
LF/CRLF warnings confused status.
PowerShell continuation prompt >> confused command flow.
```

Prevention:

```text
Run powershell -ExecutionPolicy Bypass -File .\runner.ps1.
Do not call .Trim() on possibly null output.
Use -LiteralPath for paths containing brackets.
Do not use -LiteralPath with wildcards.
Prefer tar.exe -a -cf for context ZIPs after Compress-Archive lock failures.
Treat LF/CRLF warnings as non-fatal unless diff --check/build fails.
If prompt stays at >>, press Ctrl+C unless command output already completed.
```

### F. Check-script and guard design failures

Errors seen:

```text
Byte-for-byte route checker failed after valid semantic change.
Stale UI copy markers broke valid changes.
Broad visible-label grep matched internal V3 identifiers.
check:site-chrome-minimal-ui required /dashboard and /admin while product direction wanted them removed from public footer.
v0.1.126 fixed runner ran check:real-report-save-flow outside the scoped bridge patch and failed on stale ReportCard marker SIGN_LABELS_FA.
```

Prevention:

```text
Checks should validate durable product contracts.
Update checks in the same batch when inspected product direction changes.
Visible-label guards must only check exact user-facing labels.
Before changing UI that has a check, inspect the check script first.
Runners must not include broad cross-component checks unless the touched files are in scope.
If a guard checks an old implementation marker, allow the current stable alternative after inspecting the live file.
```

### G. Product/UI regressions

Errors seen:

```text
/chart was replaced with lab/workbench real-engine UI.
Site chrome over-minimalization hid important routes and produced HHalleus.
Report polish touched schema/types and created build/check failures.
Full-file AppShell rewrite introduced trailing whitespace.
```

Prevention:

```text
Never replace public /chart with engine lab UI.
Chrome/nav must preserve Halleus brand and public route discoverability.
Product copy polish must avoid schema/type files unless explicitly scoped.
For small JSX edits, avoid full-file rewrites; use minimal line edits and diff --check.
```

### H. Database/Render verification caveats

Errors seen:

```text
Beta API POST initially failed due FK missing beta user.
Local external preflight failed with ECONNRESET while deployed API passed.
Render URL and primary Halleus.ir behavior differed.
Render staging DB succeeded but production persistence/auth/private ownership remain unbuilt.
```

Prevention:

```text
Bootstrap beta persistence user only after beta route guard passes.
Do not hide failed preflight caveats.
Treat beta DB as guarded staging proof, not production launch.
Do not enable public/indexable report persistence without explicit consent UX.
```

## 12. Recent milestone log

Legacy v0.1.68-v0.1.84 milestones are compressed in this file. Use git tags for full history.

Key recent milestones:

```text
v0.1.93: report generation contract types.
v0.1.94: workflow recovery after README artifact overwrite; product scaffold not applied.
v0.1.103-v0.1.105: final report narrative/section copy work, with workflow failures consolidated into ledger rules.
v0.1.106: Database MVP contract locked.
v0.1.108: Postgres driver behind existing database contract.
v0.1.109: database report repository implementation.
v0.1.110: server report persistence service.
v0.1.111: guarded beta report persistence API.
v0.1.112: beta API verification runbook.
v0.1.113: safe beta API preflight script.
v0.1.114: local beta API verification passed with Docker Postgres.
v0.1.115: FK-safe beta persistence user bootstrap.
v0.1.116: manual beta DB save UI.
v0.1.117: guarded beta DB report read path.
v0.1.118: guarded beta DB report archive/list view.
v0.1.119: beta DB status messages.
v0.1.120: staging beta DB verification runbook.
v0.1.121: Render deploy state recorded.
v0.1.122: Render staging beta DB smoke passed on https://halleus.ir.
v0.1.123: manual order process readiness completed and pushed.
v0.1.124: navigation workflow recovery and decision; public footer/internal route alignment completed in v0.1.124b.
v0.1.125: public wording cleanup completed.
v0.1.126: report generation context bridge completed.
v0.1.127: ReportCard zodiac marker guard cleanup completed.
v0.1.128: first visible report-text quality improvement; saved real-engine reports now drive V3 Persian report sections instead of falling back to generic sectioned preview copy.
v0.1.129: Report V3 experience guard aligned with the current Persian badge marker.
v0.1.130: visible report-depth batch completed for longer Sun, Moon, Rising, and integration text in generated real-engine reports.
v0.1.131: chart data-confidence batch completed so approximate equal-house/ascendant scaffolding is not treated as final-ready report data.
v0.1.132: personal-planets report-depth batch completed for richer Mercury, Venus, and Mars planet-in-sign text without relying on approximate houses.
v0.1.133: aspect-depth batch completed so real-engine aspect relationships read as meaningful inner dynamics, not a short list of angular contacts.
v0.1.134: final report-structure batch completed to improve reading order, section framing, rising visibility, and final synthesis without changing calculations or UI.
v0.1.135: report-quality pass completed for Persian-facing brand consistency, report copy guardrails, and final readability checks before stronger MVP readiness claims.
v0.1.136: report sample QA guard added to exercise generated real-engine report samples before final readiness claims.
```

## 13. Open questions before stronger launch claims

```text
What exact commit is currently deployed after the latest push?
Is the latest pushed product state visible on Halleus.ir?
Are all key public routes still 200 after each deploy?
Does /chart -> report detail -> /order work on public domain?
Is beta DB route disabled publicly after staging proof?
What is the final hosting path, especially if moving to Iranian hosting?
What is the final noindex/internal-route policy for dashboard/admin/engine/quality/profile/wiki/roadmap?
How good is the current report from a real user perspective?
How will manual orders be received, priced, tracked, and fulfilled before payment/backend exists?
```

## 14. Safe next step after this consolidation

Do not count this consolidation as product progress.

Next product phase remains:

```text
v0.1.124 public footer/internal-route alignment
```

Minimal scoped approach:

```text
1. Inspect components/AppShell.tsx and scripts/check-site-chrome-minimal-ui.mjs live.
2. Remove only /dashboard and /admin footer entries from AppShell.
3. Remove only the matching requiredFooterRoutes entries from check-site-chrome-minimal-ui.
4. Add small docs/status notes if needed.
5. Run check:encoding, git --no-pager diff --check, check:site-chrome-minimal-ui, and pnpm build.
6. Commit/tag/push only after checks pass.
```
## v0.1.129 workflow note

- v0.1.129 first guard-cleanup runner failed before patch because it used a guessed stale-marker guard; diagnosis confirmed scripts/check-report-experience-v3.mjs still required Report Output V3 while components/ReportV3Experience.tsx shows the Persian badge marker. Prevention: inspect exact check-file marker lines before emitting guard cleanup runners.


## v0.1.130 report-depth scope note

- v0.1.130 is scoped to visible report depth in `lib/astrology/real-engine-report-writer.ts`, not UI polish or another infrastructure-only batch.
- First visible target: make fresh generated reports noticeably richer in the Sun, Moon, Rising, and integration sections while keeping the tone Persian, calm, self-discovery oriented, and non-deterministic.
- Keep astrology calculations, storage, routes, payment, SEO, and public/private report policy out of this batch unless separately inspected and scoped.

## v0.1.131 chart data-confidence scope note

- v0.1.131 is scoped to chart data confidence, not adding more interpretive text.
- The real chart route has useful astronomy-engine planetary longitudes and timezone conversion, but equal-house and ascendant remain scaffolded/approximate until house-system hardening.
- Fresh reports should not label equal-house/ascendant scaffold data as fully report-ready when confidence limitations are present.

## v0.1.132 personal-planets report-depth scope note

- v0.1.132 is scoped to visible Mercury, Venus, and Mars report depth in `lib/astrology/real-engine-report-writer.ts`.
- Keep this batch on planet-in-sign interpretation only; do not use approximate house placement or ascendant scaffold data for personal-planet claims.
- The product priority after v0.1.131 is to finish the core generated report before SEO, wiki, public/private model, pricing polish, or unrelated UI work.

## v0.1.132 workflow note

- v0.1.132 first personal-planets runner failed at pnpm build after scoped checks passed because the runner removed the existing `as AstrologyReport` return cast while `interpretationSections` is still carried as a V3 bridge field outside the current `AstrologyReport` type. Prevention: preserve existing bridge casts unless widening the shared report type is explicitly scoped and inspected.
- v0.1.132 follow-up build failure showed `outputQuality` was also outside the current `AstrologyReport` type. Prevention: keep report-depth batches focused on text generation and do not reintroduce bridge/type fields unless a shared type migration is separately scoped.

## v0.1.133 aspect-depth scope note

- v0.1.133 is scoped to visible aspect interpretation depth in `lib/astrology/real-engine-report-writer.ts` and its guard.
- Keep this batch on already-calculated real-engine aspect relationships: conjunction, sextile, square, trine, and opposition.
- Do not change aspect calculation math, orb rules, shared report types, UI components, routes, storage, payment, SEO, or house/ascendant logic in this batch.
- Product goal: make aspect text explain support, tension, integration, and reflection prompts so the generated report feels more complete without overclaiming precision.
- v0.1.133 first aspect-depth runner failed at `git --no-pager diff --check` because `docs/HALLEUS_PROJECT_CONTEXT.md` had a blank line at EOF. Prevention: runners that append context notes must trim trailing whitespace and end with exactly one newline.

## v0.1.134 final-report-structure scope note

- v0.1.134 is scoped to the structure of generated real-engine report sections, not adding new astrology calculations or changing UI.
- Keep the existing section IDs/kinds stable while improving reading order, intro/closing framing, rising visibility, and final synthesis.
- Do not change aspect math, orb rules, shared report types, routes, storage, payment, SEO, public/private policy, or house/ascendant confidence logic in this batch.
- Product goal: make the report feel less like separate paragraphs and more like a guided Persian reading with overview, identity, emotional pattern, relationships, action path, synthesis, and final reflection.

## v0.1.135 report-quality-pass scope note

- v0.1.135 is scoped to Persian-facing report quality guardrails, not adding new astrology calculations or changing report structure.
- Use the Persian brand spelling `هالیوس` in Persian user-facing/report text; keep lowercase `halleus` only for file names, event names, and internal identifiers.
- Keep this batch focused on report surfaces and guards: generated real-engine report writer, V3 report fallback copy, report card/detail copy, and report quality checks.
- Do not change aspect math, orb rules, shared report types, routes, storage, payment, SEO, public/private policy, or house/ascendant confidence logic in this batch.
- Product goal: reduce English-brand leakage in Persian text and make this rule enforceable before the final report QA pass.


## v0.1.136 report-sample-qa scope note

- v0.1.136 is scoped to executable QA for generated real-engine report samples, not new astrology calculations, UI redesign, SEO, storage, payment, or public/private policy.
- The sample QA check builds real-engine snapshots through the current report writer and verifies section count, section length, aspect language, Persian-facing brand copy, forbidden spacing tokens, and approximate rising disclosure.
- Do not use this batch to change report prose unless sample QA output identifies a concrete failure in generated text.
- Next report step remains final readiness guard after reviewing sample QA output.
## v0.1.137 workflow recovery note

- The first real ascendant/house foundation runner failed because it touched route, report-generation, shared types, engine code, and checks in one batch, and continued into checks after a missing-marker apply failure. Prevention: split the work into v0.1.137a real ascendant core, v0.1.137b house metadata, and v0.1.137c report-generation/report wording; apply runners must abort immediately when the apply script fails.
