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
Persian mojibake such as Ã˜, Ã™, Ã›, Ãš, Ã¢â‚¬ or ï¿½.
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
- Use the Persian brand spelling `Ù‡Ø§Ù„ÛŒÙˆØ³` in Persian user-facing/report text; keep lowercase `halleus` only for file names, event names, and internal identifiers.
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

## v0.1.137b house-metadata-foundation scope note

- v0.1.137b is scoped to house metadata and confidence propagation, not report prose, UI redesign, route rewrites, storage, SEO, payment, or public/private policy.
- The real chart workbench now marks the Ascendant method as `astronomy-engine-local-sidereal-time` in normalized house input so equal-house output can distinguish calculated-Ascendant metadata from older scaffolded fixtures.
- Equal-house house placement remains partial until dedicated house-system hardening; do not treat this batch as final paid-report house readiness.
- Next engine step should choose whether to promote whole-sign houses from the calculated Ascendant or implement a stronger house-system layer before changing generated report wording.
## v0.1.138a active-whole-sign-workbench scope note

- v0.1.138 was split after two marker-heavy runner failures. Prevention: change only the active real chart workbench house system first, then update normalization/enrichment fixtures separately.
- v0.1.138a promotes the active real chart workbench to whole-sign houses anchored to the calculated Ascendant sign.
- This batch does not change generated report prose, route behavior, UI, storage, SEO, payment, public/private policy, normalized fixtures, or chart-enrichment fixtures.

## v0.1.138b whole-sign-readiness-guards scope note

- v0.1.138b is scoped to executable readiness guards for whole-sign houses anchored to the calculated Ascendant sign.
- The active workbench already emits whole-sign house input; this batch verifies normalized chart and chart enrichment treat calculated whole-sign context as report-enrichment-ready.
- Older equal-house scaffold/transitional fixtures remain partial and must not become report-ready in this batch.
- This batch does not change generated report prose, route behavior, report-generation service, UI, storage, SEO, payment, or public/private policy.

## v0.1.143 workflow note

- The first exact-age/birthday-countdown runner failed before editing because it used a brittle multiline JSX insertion marker for the birth-detail card in `components/ReportCard.tsx`. Diagnosis showed the live file had the intended birth-details area, but the exact expected block did not match current formatting. Prevention: for small JSX insertions, prefer inspected current-line or line-based anchors over large multiline `oldText` blocks; after a marker miss, inspect the live nearby lines before emitting a fix-forward runner.

## v0.1.145 workflow note

- The first two report-text ancient-framing runners failed before editing because they used Persian/string replacement logic through PowerShell and brittle summary markers. Diagnosis confirmed the live UTF-8 files were valid, while PowerShell terminal rendering showed mojibake and could not be trusted for exact Persian markers. The successful fix used a PowerShell wrapper only to launch Node; Node read and wrote UTF-8 files directly, decoded Persian replacement payloads safely, used structural anchors, validated match counts before writing, and then ran focused report checks plus build. Prevention: never use Persian text printed by PowerShell/terminal as an exact replacement marker; never put raw Persian replacement markers inside PowerShell patch logic; for Persian report-text patches, use Node UTF-8 with structural anchors and encoded payloads, and stop after the first marker miss instead of emitting another guessed runner.

## v0.1.148 rollback workflow note

- The first report data panels runner for v0.1.148 attempted too many ReportCard JSX changes at once: expanded placements, house rows, planet-in-house rows, and calculation copy/panel layout. The runner passed encoding and focused UI checks but failed build with a JSX parse error near the inserted house rows. Two quick fix-forward attempts did not resolve the JSX structure cleanly, so the batch was rolled back by restoring components/ReportCard.tsx and deleting the untracked runner; build then passed again at v0.1.147. Prevention: for report data panels, do not combine multiple new JSX sections in one runner. Add one panel at a time, inspect the exact containing JSX block before patching, prefer full replacement of the smallest safe enclosing block over inserting adjacent sibling sections after a closing section tag, and stop to rollback after repeated JSX parse failures instead of continuing fix-forward attempts.

## v0.1.155 workflow note

- The first complete natal chart data contract runner failed at `pnpm build` because it created `_halleus_backup_v0155_*/types/*.ts` inside the repo, and Next.js typechecked those backup TypeScript files. The runner restored the tracked target files and the cleanup removed the untracked backup and runner. Prevention: runners must not create source-like backup files or folders inside the repo; use temp-dir backups outside `C:\Projects\astro-clean` or non-source/ignored backup payloads, and clean them after restore or success.

## Workflow failure - v0.1.163 runner template literal syntax

Error: the first v0.1.163 runner failed before patching because the generated Node patch script contained an unescaped nested template literal around the astronomy-engine check text.
Where: v0.1.163 special points real source audit pack.
Fixed: fix1 rewrites the generated patch/check content without nested JavaScript template literals and keeps backup/restore outside the repo.
Prevention: for generated Node scripts embedded in PowerShell here-strings, avoid nested backtick template strings unless they are escaped or base64 encoded. Prefer plain string concatenation or line arrays.

## v0.1.167b moon-hands-copy scope note

- v0.1.167b is scoped to Persian-facing report copy for calculated Mean Lunar Nodes: generated writer prose, ReportCard labels, and focused checks.
- User-facing copy should say "دست‌های ماه" instead of "گره‌های ماه"; code identifiers can stay `lunarNodes`.
- Keep technical honesty: Mean Lunar Node only, no True/Osculating Node claim, South Node as Mean North Node + 180°, and Lilith deferred.
- Do not change engine math, shared node types, payment/public/private policy, SEO, Sky Pulse, or Lilith in this batch.

## v0.1.168 full-report-reading-polish scope note

- v0.1.168 is scoped to making the full report read more like a guided Persian product report and less like a technical dump.
- Allowed surface: report writer prose, report-reading order, focused report checks, and compact context/idea notes.
- Keep engine math/types unchanged. Do not add True Node, Lilith, payments, public/private consent, SEO, Sky Pulse, or admin/content studio work in this batch.
- User-facing copy should avoid unnecessary English technical leakage such as `snapshot`, `real engine`, or `motion` when a Persian phrase can be honest and calmer.

## Workflow failure - unsigned PowerShell runner and corrupted Next cache

Error: Direct `.ps1` execution can fail on Windows with "not digitally signed" when the local execution policy blocks scripts.
Fixed / prevention: Halleus runner commands should use a temporary process-level bypass, not a system policy change: `powershell -NoProfile -ExecutionPolicy Bypass -File ".\<runner>.ps1"`.

Error: v0.1.167b initially failed `pnpm build` because generated Next cache contained corrupted `.next/dev/types/routes.d.ts` text (`xtends AppRoutes`).
Fixed / prevention: confirm `.next` is ignored with `git check-ignore -v .next`, delete `.next`, then rerun build. Treat this as generated-cache recovery, not source rollback, only when the failure is clearly inside ignored `.next`.

## v0.1.169 report-synthesis-human-reading scope note

- v0.1.169 is scoped to generated report synthesis: make the final growth/integration layer read like a human chart picture, not a loose list of sections.
- Allowed surface: `lib/astrology/real-engine-report-writer.ts`, focused report QA/check scripts, and compact product-context notes.
- Keep engine math/types unchanged. Do not add True Node, Lilith, payments, public/private consent implementation, SEO launch, Search Console, hosting migration, Sky Pulse, or admin/content studio work in this batch.
- Product decision folded into report work: Halleus remains Render-hosted, free, noindex, and not ready for Google acquisition until report quality and core website pages are ready.
- The next useful product work after synthesis should stay on report depth, report page UX, homepage product story, preview/sample, and save/share lifecycle before indexing.

## v0.1.170 report-depth-humanization scope note

- v0.1.170 is scoped to generated report depth: make aspects and houses read as human life patterns rather than textbook fragments.
- Allowed surface: report writer prose, focused report QA/check scripts, and compact context/idea notes.
- Keep engine math/types unchanged. Do not add True Node, Lilith, payments, public/private consent implementation, SEO launch, Search Console, hosting migration, Sky Pulse, homepage work, or report-page UI in this batch.
- Product direction: combine similar report-copy improvements in one safe bundle, but keep UI/page/acquisition work in separate batches.

## v0.1.171 report-page-reading-ux scope note

- v0.1.171 is scoped to report-page reading UX now that generated reports are longer and more humanized.
- Allowed surface: report detail/list page copy, lightweight reading guide panels, focused UI check, and compact context/idea notes.
- Keep engine math/types and generated writer prose unchanged. Do not add homepage work, SEO/indexing, Search Console, payment, hosting migration, save/share lifecycle, public consent implementation, True Node, or Lilith in this batch.
- Product direction: long reports need a reading path, anchors, private/free/noindex reassurance, and a softer next step before acquisition work.

## v0.1.172 Homepage Architecture + Product Story Shell

Status: implemented in `v0.1.172-homepage-architecture-product-story-shell`.

What changed:
- Homepage shifted away from paid/order-first copy and toward a scalable free-first product story.
- Header and footer now promote public user-facing routes instead of internal/admin routes.
- Homepage has stable slots for hero, report value, how-it-works, report preview, Sky Pulse, Moon phase, trust/privacy, future modules, FAQ, and CTA.
- Sky Pulse remains honest: date/pulse card first, no fake transit engine.
- Moon phase is represented as a prepared future slot, not as a fake active calculation.

Boundaries:
- No SEO/indexing launch.
- No payment or paid/private implementation.
- No hosting migration.
- No engine math/type changes.
- No True Node or Lilith work.

## v0.1.173 — Real Tehran Moon Pulse + Homepage Polish

Status: planned/applied in this batch.

Product change:
- Homepage should no longer treat Sky Pulse / Moon phase as placeholder-only.
- The homepage daily card now starts with a real, lightweight Moon Pulse: current Moon sign, Moon phase, illumination, and Persian guidance.
- The daily card is dynamic through `/api/sky-pulse/today`, so the card can refresh without making the whole homepage dynamic.
- Current location scope is Tehran: the public copy should say this softly as “خوانش امروز با زمان و افق تهران تنظیم شده است.”
- User-location Moon Pulse, richer transit ranking, and personal daily pulse remain future Idea Garden work.

Safety / product honesty:
- This is not a full transit engine and must not claim precise daily prediction.
- Homepage copy should be inspiring but neutral: symbolic self-reflection, not deterministic advice.
- Medical, financial, legal, and serious life decisions must not be positioned as outputs of Halleus.

Workflow note:
- `.mjs` checks must use ESM imports, not CommonJS `require`.
- Runners must allow their own current `.ps1` as a temporary untracked artifact during patch-scope verification, then remove it before commit.

## v0.1.174 — Homepage Visual QA + App Feel Polish

Status: planned/applied in this batch.

Product change:
- Polish the homepage after the real Tehran Moon Pulse batch so it feels more like a real app and less like a demo surface.
- Improve header spacing, active nav styling, CTA hierarchy, hero rhythm, section headings, Moon Pulse dashboard layout, and FAQ interaction.
- Keep the dynamic `/api/sky-pulse/today` scope unchanged: Tehran Moon Pulse only, not a full transit engine.
- Keep the homepage free-first, private, noindex-aligned, and honest about symbolic/self-reflection use.

Boundaries:
- No report engine math changes.
- No report writer changes.
- No SEO/indexing launch.
- No payment or paid/private implementation.
- No hosting migration.
- No public report consent implementation.
- No user-location Moon Pulse yet.
- No full transit ranking or personal daily pulse.

Workflow note:
- This batch is UI/copy polish over inspected homepage/header/CSS files.
- Keep v0.1.173 Moon Pulse checks passing while adding the new homepage visual polish check.
## v0.1.175 — Real Report Preview / Sample Block

Status: completed locally by runner pending checks/commit.

Purpose:
- Turn the homepage report preview from generic product proof into a more concrete sample of the real Halleus report structure.
- Keep the preview public-facing and product-quality without starting SEO/indexing/public report consent/payment.
- Align the preview language with the current report writer layers: three core threads, houses, aspects, Moon Hands, retrogrades, synthesis and reflection prompts.

Scope:
- Updated `components/HomepageProductProof.tsx`.
- Added `lib/report-preview/homepage-report-preview.ts`.
- Updated homepage future-module copy so report preview is no longer described as future work.
- Added visual CSS for the real report preview block.
- Added `scripts/check-real-report-preview-homepage.mjs`.

Product notes:
- The homepage preview is a general sample of report structure and tone; a user's real report is still generated after birth data and chart calculation.
- The preview must not imply public/indexable reports, paid checkout, or deterministic prediction.
- Continue to avoid "گره‌های ماه" in user-facing copy; use "دست‌های ماه".

## v0.1.176 — Chart creation flow polish

Status:
- Partial runner failure was caused by a broken base64 docs append after product files were written.
- The chart creation flow is being polished as an app-like input surface, not a long explanatory/test page.

Product changes:
- Keep the form compact and app-like.
- Put optional-name guidance inside the name input.
- Default birth date entry to Jalali while allowing Gregorian entry.
- Remove extra explanatory copy under the birth date controls.
- Improve the birth time row and add an explicit unknown-time option.
- Keep birth city empty by default instead of pre-filling Tehran.
- Limit city suggestions to a small focused list after the user types.

Do not include in this batch:
- Report engine math changes.
- Report writer changes.
- Payment, SEO/indexing, public reports, hosting, or user account lifecycle.
## v0.1.177 — Trust, Return Flow & Global UI Polish

Status:
- Combined speed-focused batch for trust pages, reports return flow, and small global UI polish.

Product changes:
- Align `/product` with the current free, private-first birth report product instead of paid/order wording.
- Align `/privacy` with birth data use, local/private report storage, and future public/indexable consent rules.
- Polish `/reports` as the return point for saved reports, with calmer copy and better empty state.
- Remove the `شروع رایگان` subline from the header CTA so the action stays compact.
- Add a small fixed `پرش به بالا` utility at the bottom-left of the viewport on desktop and mobile.

Do not include in this batch:
- Payment, SEO/indexing, public report pages, hosting migration, report engine math, or report writer changes.

## v0.1.178 — Chart flow mobile QA + final input polish

Status:
- Runner failed during docs append after writing product files because of a broken base64 payload.
- The fix-forward scope is limited to completing docs, cleaning the runner artifact, and running checks.

Product changes:
- Keep the chart form compact and app-like on mobile.
- Make the time picker and `نمی‌دانم` control sit closer together.
- Replace browser datalist city suggestions with controlled suggestion chips.
- Keep city suggestions short and focused.
- Improve loading, error, and success feedback without bringing back long explanatory copy.
- Preserve the real report save flow and redirect behavior.

Do not include in this batch:
- Report engine math changes.
- Report writer changes.
- Homepage, product, privacy, reports-list, payment, SEO/indexing, public reports, or hosting work.

## v0.1.178 failure ledger — runner syntax/base64/regression-token

Error:
- First apply runner failed before execution because of a broken PowerShell string/block terminator.
- Fixed runner partially wrote product files, then failed during docs append because of a broken base64 payload.
- First fix-forward failed `check-chart-creation-flow-polish` because the older regression check still required the visible token `چارت واقعی`.

Fixed:
- Removed broken runner artifacts.
- Confirmed the first parser failure made no product changes.
- Completed missing docs append without runner/base64.
- Restored the `چارت واقعی` chip instead of weakening the regression check.
- Re-ran encoding, diff check, real report save flow, chart creation flow polish, chart mobile QA, and build.

Prevention:
- Avoid large base64 docs payloads in runners.
- Prefer tiny direct fix-forward commands after two runner failures.
- Preserve existing regression-check tokens unless intentionally updating the check and product copy together.

## v0.1.179 — Account-ready reports dashboard and lifecycle

Status:
- Merged report lifecycle, account-ready dashboard, and user return-flow copy into one product batch.
- This is not real auth/database work yet. It prepares the product surface before persistent accounts.

Product changes:
- `/dashboard` now acts as the user-facing panel for returning to private reports.
- `/reports` and `/dashboard` are aligned: reports are still local/private, but the product path now clearly points toward persistent accounts.
- Navigation and footer include the dashboard as a real app surface.
- Reports list copy explains that the local private library is the base for future account storage.
- No SEO/indexing, payment, public reports, auth provider, database migration, or report engine changes were started.

Next:
- Choose the persistent account/storage implementation and connect reports to a real user id.
- Plan local-preview report migration into a user account after auth/storage is selected.

Failure note:
- The apply runner wrote product files and CSS, then failed during docs append because of a broken base64 payload.
- Fix-forward completed the missing docs append directly without a new runner.


## v0.1.180 — Persistent reports/auth decision

Status:
- Selected Supabase-first as the next persistent reports/auth direction.
- This is selected-not-enabled: no real login, no production database writes, no public reports, no payment, and no hosting migration.

Product/technical decision:
- Auth direction: Supabase Auth.
- Storage direction: Supabase/Postgres-compatible report storage.
- Current active product mode: local-preview.
- Current default report visibility: private/noindex.
- Local-preview reports must migrate only after explicit user review and successful account import.

Implementation added:
- Persistent reports decision contract.
- Dashboard decision card.
- Supabase env placeholders in `.env.example`.
- Decision doc for persistent reports/auth.
- Auth readiness updated from undecided to selected-not-enabled.
- Guard check for the persistent reports/auth decision.


## v0.1.181 — Supabase auth stub and persistent repository prep

Status:
- Added Supabase auth driver stub and persistent report repository prep.
- Active product mode remains local-preview.
- Real login remains disabled.
- Account report writes remain disabled.

Implementation:
- Added guarded env switches for Supabase auth stub and account storage.
- Added Supabase auth driver stub without installing a Supabase client package.
- Updated auth readiness so `canEnableRealLogin` remains false.
- Added persistent repository readiness prep without changing the active local repository.
- Added guard check for auth/repository prep.

Not included:
- No real auth driver.
- No package install.
- No production database writes.
- No migration execution.
- No payment, SEO/indexing, public reports, hosting, report engine, or report writer work.

## v0.1.181 failure note — docs token mismatch

Error:
- `check-supabase-auth-repository-prep` failed because docs did not contain the exact required phrase `persistent report repository prep`.

Fixed:
- Added the exact phrase to the persistent reports/auth decision doc.
- Kept product code unchanged.

Prevention:
- When adding new guard checks, keep required docs tokens aligned with the actual docs wording or add an explicit note.


## v0.1.182 — Account report save contract and migration preflight

Status:
- Added account report save contract.
- Added account migration preflight logic.
- Dashboard now shows local-preview migration readiness.
- Active save mode remains local-preview.
- Account saves and migration execution remain disabled.

Implementation:
- `lib/account/account-report-save-contract.ts`
- `lib/account/account-migration-preflight.ts`
- `docs/ACCOUNT_REPORT_SAVE_CONTRACT.md`
- `scripts/check-account-save-contract-migration-preflight.mjs`

Not included:
- No real login.
- No account report writes.
- No database migration execution.
- No local-preview deletion.
- No public reports, payment, SEO/indexing, hosting, engine, or report writer work.


## v0.1.183 — Real Supabase login shell and migration review shell

Status:
- Added `@supabase/supabase-js`.
- Added real Supabase email/password login shell.
- Added browser Supabase client config guarded by `NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN=false`.
- Added profile/dashboard login UI.
- Added migration review shell and backup-before-migration UI.
- Account report writes remain disabled.
- Migration execution remains disabled.

Activation for local/manual test:
- Set `NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN=true`.
- Set `NEXT_PUBLIC_SUPABASE_URL`.
- Set `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Not included:
- No account report writes.
- No local-to-account import execution.
- No deletion of local-preview reports.
- No public reports, payment, SEO/indexing, hosting, engine, or report writer work.

## v0.1.183 failure note — stale auth readiness token

Error:
- `check-persistent-reports-auth-decision` failed because `lib/auth/auth-readiness.ts` changed wording around the required Supabase/Postgres database URL recommendation.

Fixed:
- Restored the exact required regression-check tokens while keeping the real Supabase login shell work.

Prevention:
- When changing readiness copy, preserve existing check tokens or update all dependent checks in the same batch.

## v0.1.183 failure note — auth panel flag token

Error:
- `check-real-supabase-login-migration-shell` failed because `components/SupabaseAuthPanel.tsx` did not contain the literal token `NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN`.

Fixed:
- Added an explicit UI note for the guarded login flag.

Prevention:
- New UI checks should either look for user-visible activation copy or require explicit literal tokens in the files they validate.

## v0.1.183 failure note — auth panel wrapped guard sentence

Error:
- `check-real-supabase-login-migration-shell` failed because the required Persian guard sentence was split across JSX lines in `components/SupabaseAuthPanel.tsx`.

Fixed:
- Added the exact sentence as a separate visible hint.

Prevention:
- Do not require long Persian UI sentences as exact single-line tokens unless the UI intentionally renders that exact sentence.

## v0.1.183 failure note — nullable Supabase client

Error:
- `pnpm build` failed because `components/SupabaseAuthPanel.tsx` used `client.auth` inside an async closure where TypeScript still treated `client` as possibly null.

Fixed:
- Added a non-null `authClient` constant after the null guard and used it inside the effect closure.

Prevention:
- For nullable browser clients used in nested async functions, assign a narrowed constant after the null guard before entering closures.

## v0.1.184 — User-owned account report save path

Scope:
- Add guarded user-owned account report save path for newly generated reports.
- Verify Supabase bearer token server-side and save account reports under the authenticated user id.
- Keep local-preview fallback and keep all saved reports private/noindex.
- Keep migration execution disabled and never delete browser-local reports in this batch.

Required env for local testing:
- `NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN=true`
- `NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=true`
- `HALLEUS_ENABLE_ACCOUNT_STORAGE=true`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `AUTH_SECRET`

Out of scope:
- old local-to-account migration
- deleting local reports
- public/indexable reports
- SEO launch
- payment
- hosting migration


## v0.1.185 restart note - account report read foundation

Scope:
- Add the account report read client foundation for listing and opening user-owned account reports.
- Reuse the guarded `/api/reports/account` GET path added in v0.1.184.
- Keep the actual UI integration small and separate after this foundation is checked.

Still out of scope:
- migration execution
- delete browser-local reports
- public/indexable reports
- SEO launch
- payment
- hosting migration
- engine/report-depth work

Failure/recovery note:
- The first v0.1.185 Account Reports E2E runner produced encoding/check failures after a large UI batch and should not be committed.
- The second v0.1.185 runner had a PowerShell parse failure.
- The first reduced account-read foundation runner generated an invalid JavaScript temp file.
- Recovery returned the repo to clean v0.1.184 at commit `3929576`.
- Prevention: keep v0.1.185 restarted scope small, avoid raw Persian in PowerShell, avoid generated nested JS regex/template tricks, and hard-fail on the first failed check.

## v0.1.186 auth direction note — username + mobile shell

- Account identity direction changed from email-first to username-first.
- The user-facing identifier should be a user-chosen username.
- mobile-required: Mobile phone should be collected from the beginning as required customer/contact data.
- Mobile is not the username.
- Email is optional/secondary and must not be treated as the username.
- For the near-term guarded Supabase shell, username + mobile + password is the product direction; SMS/OTP can stay deferred until provider/cost/deliverability are ready.
- Account report save/read foundations remain private/noindex.
- Local-to-account migration is deferred because the site has not had real users yet.
## v0.1.187 Account Reports UI Integration

- Added the guarded account reports UI path on top of the v0.1.185 read foundation.
- `/reports?source=account` is the account report list surface.
- `/reports/[reportId]?source=account` opens the saved account copy through the account read client.
- Account reports remain private/noindex.
- Local-preview reports remain available and are not deleted.
- Local-to-account migration remains deferred and is not executed.
- Public/indexable reports, SEO, payment, hosting, and engine work remain out of scope.


## v0.1.188 Real Supabase Account Flow Test Readiness

- Real account flow readiness was added as a guarded test surface, not as a launch or migration step.
- Manual test path: signup with username + mobile + password, login, create report, save account copy, then open `/reports?source=account` and `/reports/[reportId]?source=account`.
- Username is the user-chosen identifier; mobile is collected but is not the username; email is optional/secondary.
- Required local test env names are documented without secrets: `NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN`, `NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE`, `HALLEUS_ENABLE_ACCOUNT_STORAGE`, `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- `docs/REAL_ACCOUNT_FLOW_TEST_RUNBOOK.md` is the manual test checklist.
- Migration remains deferred and local reports are not deleted. Public/indexable reports, SEO, payment, hosting, and engine work remain untouched.

## v0.1.189 Account Dashboard/Profile Polish

- Added a small account-flow cockpit to dashboard/profile for manual real-account testing.
- The polish keeps username as the user-chosen identifier.
- Mobile is required customer/contact data but is not the username.
- The visible next steps stay focused on `/profile`, `/chart`, and `/reports?source=account`.
- Account reports remain private/noindex.
- Migration remains deferred; local reports are not deleted.
- Public/indexable reports, SEO, payment, hosting, and engine work remain untouched.
