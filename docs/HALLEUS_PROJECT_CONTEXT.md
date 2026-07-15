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
Persian mojibake such as ÃƒËœ, Ãƒâ„¢, Ãƒâ€º, ÃƒÅ¡, ÃƒÂ¢Ã¢â€šÂ¬ or Ã¯Â¿Â½.
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
- Use the Persian brand spelling `Ã™â€¡Ã˜Â§Ã™â€žÃ›Å’Ã™Ë†Ã˜Â³` in Persian user-facing/report text; keep lowercase `halleus` only for file names, event names, and internal identifiers.
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
- User-facing copy should say "Ø¯Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ù…Ø§Ù‡" instead of "Ú¯Ø±Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø§Ù‡"; code identifiers can stay `lunarNodes`.
- Keep technical honesty: Mean Lunar Node only, no True/Osculating Node claim, South Node as Mean North Node + 180Â°, and Lilith deferred.
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
- Current location scope is Tehran: the public copy should say this softly as â€œØ®ÙˆØ§Ù†Ø´ Ø§Ù…Ø±ÙˆØ² Ø¨Ø§ Ø²Ù…Ø§Ù† Ùˆ Ø§ÙÙ‚ ØªÙ‡Ø±Ø§Ù† ØªÙ†Ø¸ÛŒÙ… Ø´Ø¯Ù‡ Ø§Ø³Øª.â€
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
- Continue to avoid "Ú¯Ø±Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø§Ù‡" in user-facing copy; use "Ø¯Ø³Øªâ€ŒÙ‡Ø§ÛŒ Ù…Ø§Ù‡".

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
- Remove the `Ø´Ø±ÙˆØ¹ Ø±Ø§ÛŒÚ¯Ø§Ù†` subline from the header CTA so the action stays compact.
- Add a small fixed `Ù¾Ø±Ø´ Ø¨Ù‡ Ø¨Ø§Ù„Ø§` utility at the bottom-left of the viewport on desktop and mobile.

Do not include in this batch:
- Payment, SEO/indexing, public report pages, hosting migration, report engine math, or report writer changes.

## v0.1.178 — Chart flow mobile QA + final input polish

Status:
- Runner failed during docs append after writing product files because of a broken base64 payload.
- The fix-forward scope is limited to completing docs, cleaning the runner artifact, and running checks.

Product changes:
- Keep the chart form compact and app-like on mobile.
- Make the time picker and `Ù†Ù…ÛŒâ€ŒØ¯Ø§Ù†Ù…` control sit closer together.
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
- First fix-forward failed `check-chart-creation-flow-polish` because the older regression check still required the visible token `Ú†Ø§Ø±Øª ÙˆØ§Ù‚Ø¹ÛŒ`.

Fixed:
- Removed broken runner artifacts.
- Confirmed the first parser failure made no product changes.
- Completed missing docs append without runner/base64.
- Restored the `Ú†Ø§Ø±Øª ÙˆØ§Ù‚Ø¹ÛŒ` chip instead of weakening the regression check.
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

## v0.1.190 Real Account Flow Lock

- Tightened the real account flow around username + mobile signup without making mobile the username.
- Added shared account identity normalization for username and E.164 mobile validation.
- Supabase signup metadata now records that username is user-chosen and phone is not the username.
- Server account bootstrap now preserves phone provider semantics instead of forcing email provider for phone accounts.
- Still no migration, local report deletion, public/indexable reports, SEO, payment, hosting, or engine work.

## v0.1.191 logo/favicon asset application

- Applied the current Halleus sun-gold logo/favicon package as the active site brand asset set.
- Header and footer brand marks should use the approved sun emblem from `public/halleus-logo/emblem-transparent.png`.
- Next metadata should explicitly point at the new favicon and apple-touch icon assets.
- This is a brand-asset batch only; it must not change account/auth/report engine/payment/SEO/public-report behavior.
- Follow-up account work remains the username/password account bridge after fresh live status/context because logo/favicon work may run concurrently with other chats.

Failure prevention:
- Do not rely on brittle AppShell marker patches without inspecting the current live file.
- Keep apply artifacts to a single `.ps1` runner and embed binary assets safely.
- Do not include source-like files at the artifact ZIP root.

## v0.1.192 Username Password Account Bridge

- Account login now targets username + password instead of mobile + password.
- Signup keeps username + mobile + password, with optional/secondary email.
- Supabase Auth is bridged behind the scenes with a deterministic private credential derived from username; this bridge credential is not the user's email and is not shown in UI.
- Mobile remains required at signup for customer/contact data, but it is not the username and not the login identifier.
- Browser and server session mapping hide the private bridge credential and preserve the user-facing username/secondary email semantics.
- Account save/read UI remains private/noindex with local-preview fallback.
- No local-to-account migration, no local deletion, no public/indexable reports, no SEO, no payment, no hosting, and no report engine work.

Failure prevention:
- Do not implement username login by making phone the username.
- Do not expose or persist the private Supabase bridge credential as the user's real email.
- Keep Supabase email confirmation disabled in the test project if using the private username bridge credential for manual smoke tests.Workflow failure ledger:
- Initial v0.1.192 assistant artifact was incorrectly provided as a loose .ps1 and failed PowerShell parsing around an inline doc here-string before touching tracked files.
- Fix: use v0.1.192a as a ZIP artifact whose root contains only the runner .ps1; keep the PowerShell wrapper parse-safe and move patch payload execution into a generated temp Node script outside the repo.
- Prevention: Halleus apply artifacts must be ZIP-only, syntax-safe before handoff, and must not rely on inline PowerShell here-strings for long docs/content.


## v0.1.194 Account UX Polish

Planned scoped account/profile/dashboard polish after the real account smoke test passed in `v0.1.193`.

Scope:
- Keep auth/save/read logic unchanged.
- Make account signup/login/profile/dashboard copy more user-facing.
- Clarify that login is `username + password`, signup collects `username + mobile + password`, mobile is not username, and email remains optional/secondary.
- Clarify that account reports remain private/noindex and local reports are not deleted.
- Keep public/indexable reports, SEO, payment, hosting, report engine, and local-to-account migration out of scope.
- Add a focused `check:account-ux-polish` guard.

Workflow note:
- This is account/profile/dashboard polish after real account smoke test, not new account infrastructure.

## v0.1.195 Report Depth + First Synthesis

Scope:
- Make the next report batch a product-value batch, not another account or infrastructure batch.
- Combine report depth and first synthesis in one milestone so the generated report feels more personal, Persian-first, and usable.
- Add a first synthesis layer that names the main personality threads, the central chart tension, the growth language, and a short reflection practice.
- Keep technical honesty: Mean Lunar Node only, South Node as Mean North Node + 180Â°, Lilith deferred, and no deterministic claims.
- Keep account stability reactive only; fix account/save only if this report work exposes a real bug.

Out of scope:
- auth/account/schema changes
- Supabase/env changes
- SEO/public/indexable reports
- payment
- hosting/deploy
- migrations

Implementation note:
- This batch should touch report writer/checks/docs/package only and should run with `pnpm run check:encoding`, `git --no-pager diff --check`, `pnpm run check:report-depth-first-synthesis`, report writer/sample QA guards, and `pnpm build`.
- The v0.1.195 context ZIP may remain untracked before apply and must be allowed or removed before commit.
- Target behavior: Report Depth + First Synthesis without auth/account/schema/SEO/payment/deploy changes.

## Halleus Official Cool Palette v0.1.200

The official Halleus visual direction is now locked to a bright, cool, sky-like, calm, trustworthy palette. The product should feel like a modern Persian-first astrology/self-discovery tool, not a fortune-telling, tarot, dark mystical, or warm/gold occult site.

Core palette:
- Main background: `#F8FAFC`
- Soft panel/surface: `#D9EAFD`
- Borders/dividers/detail lines: `#BCCCDC`
- Brand/action/active state: `#9AA6B2`
- Main readable text: `#243447`
- Secondary text: `#3A4A5C`
- Muted text: `#64748B`

Rules:
- Avoid warm cream, yellow, gold, beige, orange, yellow-tinted palettes, mystical purple, heavy navy, and pure black as a dominant UI color.
- Do not use `#9AA6B2` for long body text; use `#243447`, `#3A4A5C`, and `#64748B` for readability.
- Header, hero, dashboard, reports, forms, footer, and astrology visuals should stay bright, clean, cool, minimal, and trustworthy.
- Astrology visuals should be modern line-art: main lines `#9AA6B2`, minor lines `#BCCCDC`, and soft halo/surface accents `#D9EAFD`.

## v0.1.211 Report Detail Redesign Failure Ledger

Workflow failure ledger:
- Several report-detail redesign runners failed before commit/tag/push: one runner had a Windows path normalization bug, one produced mojibake in Persian-heavy `ReportDetail.tsx`, one reached a TypeScript narrowing failure, and the simplified runner still detected mojibake after write.
- Fix: abandon Persian-heavy PowerShell payload runners for this redesign and use a direct UTF-8 git patch workflow instead.
- Prevention: for Persian-heavy UI changes, prefer a reviewed `.patch` applied by `git apply` from clean repo state; avoid raw Persian payloads inside PowerShell runners and stop after the first encoding failure.
## v0.1.212 Report Detail QA Polish Note

Product QA note:
- Removed the duplicate report-detail order CTA render from `app/reports/[reportId]/page.tsx` because `ReportDetail` now owns the simple reader page's bottom next-actions card.
- Kept `ReportOrderCta` intact for future reuse.

## Failure Ledger — v0.1.213 aborted report QA guard-sync attempt

Date: 2026-07-07
Base: v0.1.212-report-detail-cta-polish / 257516628a70ee5fdea438711e6ca9894a9e898b

What failed:
- The v0.1.213 report sample QA / trust-pass batch became marker-chasing instead of a controlled product fix.
- An initial patch did not apply to scripts/check-report-sample-qa.mjs because the patch context did not match the live file.
- Subsequent fixes repeatedly chased missing markers in scripts/check-real-engine-report-writer.mjs rather than first inspecting and synchronizing the complete guard contract.
- A PowerShell batch using brittle replacement logic failed with "Cannot replace reflection prompts block".
- A later guard-marker batch added a marker block but still failed on another writer guard marker, proving the approach was incomplete.
- The batch consumed too much time, created frustration, and was rolled back.

Root cause:
- The assistant attempted to patch guard expectations without first extracting the full list of required markers from scripts/check-real-engine-report-writer.mjs and comparing it against lib/astrology/real-engine-report-writer.ts.
- The assistant continued after repeated failures instead of stopping and switching to diagnosis.
- The workflow drifted into marker-chasing instead of a single grounded guard-sync plan.

Rollback:
- Restored docs/HALLEUS_PROJECT_CONTEXT.md.
- Restored lib/astrology/real-engine-report-writer.ts.
- Restored scripts/check-real-engine-report-writer.mjs.
- Restored scripts/check-report-output-v2.mjs.
- Restored scripts/check-report-sample-qa.mjs.
- Removed v0.1.213 temporary runner/helper artifacts.
- Final clean state returned to v0.1.212-report-detail-cta-polish.

Prevention:
- Before any future report QA guard-sync, inspect the full guard file and list every required marker first.
- Do not issue partial marker fixes.
- Do not use brittle text replacement runners for Persian-heavy report writer changes.
- Do not continue after two failures in the same batch.
- If checks reveal stale guards, update the guard contract as a whole or stop with diagnosis.
- Prefer one small, fully grounded change over repeated patch/rerun cycles.

## Failure Ledger — v0.1.219 aborted chart-inline-account and narrative marker attempts

Date: 2026-07-07
Base: v0.1.218-public-report-direct-open / b99cfa45848fb578c54d176da012f35064945ee9

What failed:
- The chart-inline-account runner grew too large for an auth-sensitive batch and failed after a stale account UX guard, then a malformed JS string in scripts/check-chart-final-submit-flow.mjs. The batch was rolled back cleanly.
- The first report-narrative-depth runner used Persian-heavy replacement markers that became mojibake in the generated apply script. It failed before modifying source files and the artifacts were removed.

Rollback:
- Restored app/globals.css, components/ChartForm.tsx, scripts/check-account-ux-polish.mjs, and scripts/check-chart-final-submit-flow.mjs for the account attempt.
- Removed the failed narrative context/runner artifacts after confirming only untracked files remained.

Prevention:
- Keep auth/account work diagnosis-only or split into smaller inspected changes.
- Do not embed raw Persian markers in PowerShell/Node replacement runners. Use ASCII structural markers and escaped UTF-8 payload strings for Persian report text.
- Stop after two failures in the same batch and return to a clean repo before continuing product work.


## v0.1.222 — Save Report To Account Bridge

Product/code note:
- Hardened the existing save-generated-report bridge instead of rebuilding it.
- Local report save remains first and must keep report generation/opening safe if account/server persistence fails.
- Signed-in account saves continue through the bearer-token path and remain user-owned/private/noindex by default.
- If Supabase session retrieval errors before an access token exists, the client now keeps the local fallback and skips account persistence instead of silently downgrading that attempt to an unauthenticated public save.
- The unauthenticated public/noindex server-report fallback remains available for the existing public direct-open path.
- The account POST route now returns a controlled 400 response for malformed JSON or non-object request bodies.

Checks:
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `node scripts/check-save-report-to-account-bridge.mjs`
- `pnpm build`

Scope boundaries:
- No auth driver, database schema, chart inline signup, payment, pricing, checkout, SEO/indexing, or report engine rewrite changes.

## Failure Ledger — v0.1.222 context and SHA-guard attempts

Date: 2026-07-07
Base: v0.1.221-account-ux-report-ownership / abb2236263710e58a1f35607a01703cd77beb9b1

What failed:
- The first v0.1.222 context ZIP command used `[System.IO.Path]::GetRelativePath(...)`, which was unavailable in the user's Windows PowerShell/.NET environment. It produced only a 22-byte bad ZIP and touched no tracked files.
- The first v0.1.222 implementation runner failed before writing tracked files because its SHA guard compared the archive/blob hash for `lib/storage/account-report-save-client.ts` with the working-tree file hash. The runner expected `6A90ED6E0C9EFE6A2EB4B71FE52AD7BC83F8075B573B18D8F076AC0F5F9FF5B8`, while the live working-tree file hash was `D675897D1B609F27E8BC12F0CAB6E5294F31F188B09811564D04AB19B919832A`.

Rollback:
- Removed `halleus-apply-v0.1.222-save-report-to-account-bridge.ps1`.
- Removed `halleus-v0.1.222-save-bridge-context-20260707.zip`.
- Removed `halleus-v0.1.222-storage-context-20260707.zip`.
- Confirmed `git status --short --untracked-files=all` was clean before resuming.

Prevention:
- Do not rely on `[System.IO.Path]::GetRelativePath(...)` in context ZIP commands for this project. Prefer `git archive`, `tar.exe -a -cf`, or tested Windows-compatible relative path logic.
- Do not compare `git archive` LF blob hashes with `Get-FileHash` working-tree hashes on Windows; CRLF normalization can create false mismatches.
- After a SHA guard mismatch, stop, clean artifacts, and re-sync exact live context before regenerating a runner.
- Keep save/account bridge changes small and diagnosis-first; do not mix them with inline signup, payment, SEO, or report narrative work.
## v0.1.223a — Report QA Alignment

Product/code note:
- This batch intentionally did not rewrite report narrative copy.
- It added a small guard to keep the existing report writer and sample QA expectations aligned before the larger report-value/synthesis upgrade resumes.
- The current report writer must keep both weekly-practice markers used by sample QA: `ØªÙ…Ø±ÛŒÙ† Ú©ÙˆÚ†Ú© Ø§ÛŒÙ† Ù‡ÙØªÙ‡` and `Ø³Ù‡ ØªÙ…Ø±ÛŒÙ† Ú©ÙˆÚ†Ú© Ø§ÛŒÙ† Ú†Ø§Ø±Øª`.
- The next report-value upgrade must preserve these markers or deliberately update both writer output and QA in one inspected batch.

Checks:
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `node scripts/check-report-qa-alignment.mjs`

Scope boundaries:
- No report writer rewrite, no account/auth/database change, no chart inline signup, no payment, no SEO/indexing, no Sky Pulse, and no wiki/content implementation.

## Failure Ledger — v0.1.223 report-value rollback

Date: 2026-07-07
Base: v0.1.222-save-report-to-account-bridge / 4f287fdd3d1084533b3b7515e3f3474b4e22ce4a

What failed:
- The first v0.1.223 report-value runner changed report writer output and added a new report-value guard, but `scripts/check-report-sample-qa.mjs` failed because a required weekly-practice marker was missing from generated sample reports.
- A follow-up fix runner introduced mojibake into `lib/astrology/real-engine-report-writer.ts`, causing `pnpm run check:encoding` to fail.
- A recovery runner fixed encoding, but sample QA still failed because writer output and marker expectations were not aligned.
- No commit, tag, or push was created from the failed v0.1.223 attempts.

Rollback:
- Restored `docs/HALLEUS_IDEA_GARDEN.md`, `docs/HALLEUS_PROJECT_CONTEXT.md`, and `lib/astrology/real-engine-report-writer.ts` from HEAD.
- Removed the failed v0.1.223 apply/fix/recovery runners, context ZIP, and untracked guard script.
- Confirmed `git status --short --untracked-files=all` was clean at v0.1.222 before resuming.

Prevention:
- Split report work after failed checks: first align QA/guards, then attempt report narrative upgrades.
- Preserve existing sample QA markers unless both writer output and QA are intentionally updated together.
- Avoid quick Persian text patches in PowerShell after a failed report runner; use full-file UTF-8 replacement from inspected files or ASCII/code-anchored changes only.


## v0.1.223b — Report Value + Synthesis Lite

Product/code note:
- This batch resumed report value work after v0.1.223a by making a smaller, QA-safe synthesis upgrade.
- It adds `chapterSummary` support inside the real-engine report writer so generated report sections can include a short `Ø®Ù„Ø§ØµÙ‡ ÙØµÙ„` line before the existing reading cue.
- The batch preserves the existing weekly-practice QA markers: `ØªÙ…Ø±ÛŒÙ† Ú©ÙˆÚ†Ú© Ø§ÛŒÙ† Ù‡ÙØªÙ‡` and `Ø³Ù‡ ØªÙ…Ø±ÛŒÙ† Ú©ÙˆÚ†Ú© Ø§ÛŒÙ† Ú†Ø§Ø±Øª`.
- It does not rewrite the large narrative engine, change report section ids, or touch account/auth/payment/SEO/UI flows.

Checks:
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `node scripts/check-report-qa-alignment.mjs`
- `node scripts/check-report-value-synthesis-lite.mjs`
- `pnpm build`

Scope boundaries:
- No account/auth/database changes.
- No chart inline signup.
- No payment, pricing, checkout, paid/private implementation, or monetization mechanics.
- No public/indexable report SEO launch.
- No Sky Pulse or wiki/content implementation.


## v0.1.224 — Consent / Sharing Clarity + Post-Report Account Prompt

Product/code note:
- Clarified report lifecycle language after account save bridge: local/private browser copy, account private/noindex copy, and public/noindex direct-link copy are separate states.
- Report detail now labels sharing/privacy state directly and keeps the post-report prompt focused on account save for future reports, not inline signup inside `/chart`.
- Chart submit save messages now distinguish account private/noindex save, public/noindex direct link, and local/private fallback.
- Reports list empty/local/account copy now avoids implying local reports are automatically public.

Checks:
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `node scripts/check-save-report-to-account-bridge.mjs`
- `node scripts/check-consent-sharing-clarity.mjs`
- `pnpm build`

Guardrails:
- Payment/pricing/order remains paused.
- No public/indexable report model was introduced.
- No inline signup inside `/chart`.
- No auth driver, database schema, report engine, or migration changes.

## v0.1.225 — Inline Signup Prompt Inside Chart

Product/code note:
- Added an optional account panel inside the chart page so users can sign in or sign up before generating a report.
- The chart form remains non-blocking: report generation, local/private fallback, account/private/noindex save attempts, and public/noindex fallback keep their existing behavior.
- Supabase auth driver, database schema, storage contract, payment, pricing, checkout, SEO indexing, and public/indexable consent mechanics were not changed.
- The account panel copy now says inline chart signup is optional instead of saying it is not added yet.

Checks:
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `node scripts/check-save-report-to-account-bridge.mjs`
- `node scripts/check-consent-sharing-clarity.mjs`
- `node scripts/check-inline-signup-chart-prompt.mjs`
- `pnpm build`
### Workflow failure - v0.1.225 diff whitespace guard (2026-07-07)
- Failure: the first v0.1.225 runner stopped at git --no-pager diff --check because docs had new blank lines at EOF.
- Fix: trim trailing blank lines before rerunning guards and build.
- Prevention: runners that write docs must normalize EOF blank lines before checks.

## v0.1.225a - Handoff and Workflow Reset

Date: 2026-07-07
Base: v0.1.225-inline-signup-chart-prompt / 6eb5ac547caed7c30c7bb507320eccd0a104327e

Purpose:
- This is a docs-only handoff/reset after the long v0.1.221-v0.1.225 account/report/consent/signup sequence.
- The project reached a product checkpoint after optional inline chart signup. Do not keep creating automatic feature milestones without a product QA observation.
- The next chat should continue from this checkpoint in the same concise recovery style: exact live context first, compact Safety Gate, small scoped changes, no broad roadmap loops, and no repeated failure patterns.

Current real state:
- v0.1.221 completed account UX/report ownership clarification.
- v0.1.222 completed the save-generated-report-to-account bridge and protected local-first fallback behavior.
- v0.1.223a aligned report QA before value work resumed.
- v0.1.223b added the first safe report value/synthesis lite layer through chapter summaries.
- v0.1.224 clarified local/private, account private/noindex, and public/noindex sharing states.
- v0.1.225 added optional inline sign-in/sign-up inside the chart page without blocking report generation.
- Payment, pricing, checkout, paid/private implementation, SEO/indexable reports, Sky Pulse, wiki/content, and admin remain paused unless the user explicitly reactivates them.

Failures and fixes from this chat to carry forward:
- v0.1.222 context ZIP failure: `[System.IO.Path]::GetRelativePath(...)` was not available in the user's Windows PowerShell/.NET environment and produced a bad 22-byte ZIP. Use `tar.exe -a -cf`, `git archive`, or tested Windows-compatible relative path logic instead.
- v0.1.222 SHA guard failure: a runner compared LF archive/blob hashes with CRLF working-tree hashes and failed before writing files. Do not use raw SHA guards across archive/worktree boundaries on Windows.
- v0.1.223 report-value failure: the broad runner broke sample QA by missing a required weekly-practice marker; a quick fix introduced mojibake; recovery still failed marker alignment. After report failures, split work into QA alignment first, then narrative changes.
- v0.1.225 diff check failure: the first inline-signup runner stopped because docs had extra blank lines at EOF. Any runner that writes docs must trim trailing blank lines and write one final newline before `git --no-pager diff --check`.
- v0.1.225 guard marker failure: a docs marker changed from `v0.1.222 - Save Report To Account Bridge` semantics into mojibake around the dash (`Ã¢â‚¬â€`), causing `scripts/check-save-report-to-account-bridge.mjs` and dependent guards to fail. Avoid fragile non-ASCII punctuation markers in guards where possible; if existing guards require exact text, write files with explicit UTF-8 no BOM and inspect the exact marker after apply.
- Interactive terminal issue: long pasted PowerShell snippets with quotes/braces can leave PowerShell in continuation mode, and snippets containing `exit` can close the terminal. For future chat instructions, use short line-by-line diagnostics or a `.ps1` runner; never put `exit` in interactive snippets. Use `throw`/`return` instead.

Chat-weight and loop-prevention rules for the next chat:
- Do not restate the whole roadmap after every milestone. Answer from the latest tag and only what changed since the last checkpoint.
- Do not start a new implementation batch automatically after a successful tag. Ask for or use concrete product QA observations first.
- Keep Safety Gates compact but complete enough to show HEAD, tag, status, inspected files, allowed/forbidden files, checks, commit/tag/push plan, rollback, and relevant failure risks.
- Prefer small focused context ZIPs over broad repo dumps. Do not ask the user to paste long Persian-heavy files or long logs.
- If a command fails, stop. Diagnose with `git status --short --untracked-files=all` and targeted diffs. Do not retry blindly.
- If two failures happen in the same batch, reduce scope to diagnosis or workflow recovery only.
- Split checks: quick guards first, `pnpm build` separately. Do not paste huge combined terminal blocks.
- Use `git --no-pager diff`, never plain `git diff`.
- Before commit, remove runner/context ZIP/temp artifacts and confirm `git status --short` shows only intended tracked files.

Checkpoint-first next step:
- The next useful action is a product QA checkpoint, not another automatic code batch.
- QA should test anonymous chart generation, report opening, optional signup prompt behavior, login/signup, account report save, dashboard/reports visibility, local/private fallback, public/noindex language, and perceived report value.
- Choose the next real milestone only from that QA: report synthesis, report detail reading UX, account save repair, or public/private consent foundation.

## v0.1.228 true node vector validation harness

- Scope: engine-source validation only. No UI, report copy, account, SEO, payment, pricing, checkout, or product-surface changes.
- Baseline entering this batch: `v0.1.227-true-node-vector-probe` at `48c9a732a235e1b8c14d1141a38b7a6a7aebb315`.
- This batch keeps Mean Node as the product output and adds a validation guard for the vector candidate only.
- The candidate uses Astronomy Engine GeoMoonState position+velocity and ecliptic-frame rotation to derive a candidate osculating node.
- The candidate must remain out of `types/astro.ts`, `src/lib/chart/real-chart-engine.ts`, UI, report writer, and saved report output until independent reference fixtures pass.
- Workflow failure ledger: v0.1.226 first attempts failed because guards used brittle report-copy markers and broad UI scans; v0.1.227 initial ESM/CommonJS probe failure happened because `.mjs` import style was not inspected first.
- Prevention: inspect live import style before writing .mjs scripts, avoid Persian/copy markers in guards, keep guards structural, and keep source probes diagnostic until validated.

## v0.1.230 local True Node internal adapter

Implemented a local-only internal adapter milestone for the True/Osculating Node candidate without changing production chart output.
Workflow reminder: this batch was prepared from a scoped live context ZIP; avoid guessed package anchors, inline node -e mutations, and generated nested template scripts.
Mean Node remains the production output. True/Osculating Node remains disabled/internal until reference and approval gates pass.
## v0.1.234 complete local True Node hardening

Current Node state:
- Halleus production lunar-node output is local True/Osculating.
- The local True/Osculating model uses Astronomy Engine GeoMoonState position plus velocity and the ecliptic-of-date frame.
- South Node is derived as exact opposition of the selected North Node.
- Mean Lunar Node remains fallback/helper only.
- Lilith remains deferred and not-calculated.
- transit remains out of scope.
- No Swiss runtime dependency or external API is approved for Node output.

QA state:
- The Node probe keeps 12 date fixtures and 6 node-event sanity starts.
- The complete-local-true-node-hardening guard verifies engine output, report/UI sync, docs state, no external API, and no Swiss runtime dependency.

Next engine work:
- Lilith requires a separate model/source decision before any output.
- Transit requires a separate rules/source contract before Sky Pulse can claim real transit interpretation.

## v0.1.235 Lilith model decision contract

- Black Moon Lilith remains deferred and not-calculated in production output.
- Mean Black Moon Lilith and True/Osculating Black Moon Lilith are candidate models only until a separate source/validation batch selects and proves one model.
- Dark Moon/Waldemath Lilith is out of scope and must not be conflated with Black Moon Lilith.
- No Lilith transit or report/UI claim is approved by this decision contract.
- No external API, Swiss Ephemeris runtime dependency, or fake Lilith label is approved for this step.

## v0.1.236 Lilith source feasibility probe

- Current local runtime source is astronomy-engine@2.1.19.
- No approved production Black Moon Lilith longitude source exists yet.
- SearchLunarApsis and NextLunarApsis are event-time helpers, not natal Black Moon Lilith longitude sources.
- Do not approximate Black Moon Lilith from lunar apsis events or reuse lunar-node vector code under a Lilith label.
- Black Moon Lilith remains deferred and not-calculated until a separate source/fixture batch proves one model.

## v0.1.237 self-built osculating Lilith decision

- Preferred next model is True/Osculating Black Moon Lilith, not Mean Black Moon Lilith, because it can be probed locally from the same style of Moon state-vector source already used for local True/Osculating Lunar Nodes.
- No external API and no new Lilith runtime dependency are approved in this milestone; Swiss-style sources may remain research/reference material only, not a runtime path.
- The next buildable milestone is a probe-only local osculating Lilith calculator from Moon position and velocity state vectors; it must derive the apogee direction from the osculating orbit and keep the value internal until fixtures and sanity guards pass.
- Mean Black Moon Lilith remains later-only until a public/permissive formula is selected and validated; Dark Moon/Waldemath Lilith and asteroid 1181 Lilith remain out of scope.
- Black Moon Lilith remains deferred and not-calculated; no engine output, report/UI claim, chart-wheel placement, transit, or public SEO claim is approved yet.

## v0.1.238 self-built osculating Lilith probe

- A probe-only local calculator now derives a candidate True/Osculating Black Moon Lilith apogee longitude from Moon position and velocity state vectors.
- The probe uses the existing astronomy-engine GeoMoonState plus ecliptic-of-date rotation and a two-body osculating eccentricity-vector method.
- The value remains internal and not approved for realChart output, report generation, chart wheel display, transit, or public SEO claims.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.
- Offline reference fixtures are still required before any production output approval.

## v0.1.239 Lilith validation harness

- The self-built osculating Lilith probe now has a validation-only harness.
- The harness checks fixture diversity, normalized longitudes, apogee/perigee opposition, eccentricity sanity, angular momentum sanity, and daily continuity.
- The harness does not approve realChart output, report generation, chart-wheel display, transit, or public SEO claims.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.
- External/offline reference fixtures are still required before adapter or engine output approval.

## v0.1.240 Lilith internal adapter

- The self-built osculating Lilith probe now has an internal adapter named `calculateLocalOsculatingBlackMoonLilith`.
- The adapter wraps the validated probe result into a reusable internal shape with source, method, model, longitude, and safety metadata.
- The adapter is internal adapter only and is not approved for realChart output, report generation, chart-wheel display, transit, or public SEO claims.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.
- External/offline reference fixtures remain required before engine output approval.

## v0.1.241 Lilith guarded engine output

- `realChart.lilith` is now populated as `Local True/Osculating Black Moon Lilith` from the self-built local True/Osculating Black Moon Lilith adapter.
- The engine path uses `calculateRealChartLilith` and `calculateLocalOsculatingBlackMoonLilith`; no external API, Swiss runtime dependency, or new Lilith runtime dependency is used.
- The output is guarded engine data only: report/UI output remains disabled, and report generation must continue to treat Lilith as not-calculated until the report sync milestone.
- Mean Black Moon Lilith, Dark Moon/Waldemath Lilith, asteroid 1181 Lilith, transit Lilith, and public SEO Lilith claims remain out of scope.


## v0.1.242 Lilith report data bridge

- Report generation data now receives the guarded engine Lilith result through `RealEngineReportCalculatedLilith` and `lilith: buildCalculatedLilith(realChart)`.
- `lilithStatus is now calculated in report data` when `realChart.lilith` is calculated, while `approvedForReportOutput` remains false.
- ReportCard and report narrative remain deferred; this milestone is data bridge only and does not add user-facing Lilith UI or narrative copy.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.

## v0.1.243 Lilith report/UI sync

- ReportCard now shows a limited technical Lilith card when calculated report data includes Local True/Osculating Black Moon Lilith.
- The UI copy keeps Lilith scoped as a local self-built osculating lunar-apogee data point, not Mean Lilith, asteroid 1181 Lilith, Dark Moon, or Waldemath Lilith.
- The report writer narrative remains gated for a separate milestone; v0.1.243 does not add a Lilith interpretation paragraph or chart-wheel point.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.

## v0.1.244 Lilith narrative/trust QA

- Lilith report UI remains a limited technical data card and is not promoted into a full interpretation paragraph yet.
- The report writer narrative remains gated until a separate milestone defines safe Persian Lilith reading copy.
- Mean Lilith, asteroid 1181 Lilith, Dark Moon/Waldemath Lilith, API claims, Swiss runtime claims, and fatalistic Lilith copy remain forbidden.
- No external API, Swiss runtime dependency, or new Lilith runtime dependency is used.

## v0.1.245 Transit rules contract

- Sky Pulse's next real transit direction is a sky-only daily transit contract, not personalized natal-to-transit output yet.
- Phase-one bodies are Sun, Moon, Mercury, Venus, Mars, Jupiter, and Saturn; lunar nodes, Lilith transits, houses, angles, Uranus, Neptune, and Pluto remain deferred.
- Phase-one aspects are conjunction, opposition, trine, square, and sextile with bounded orbs; unbounded or ad-hoc transit aspects remain forbidden.
- Daily pulse boundaries use a target-timezone local calendar day with Asia/Tehran as the initial contract timezone; natal-to-transit remains deferred until birth-data consent, timezone, and privacy paths are guarded.
- No transit calculation, Sky Pulse runtime replacement, report narrative, dependency, API, or SEO claim is approved yet.

## v0.1.246 Transit product scope sync

- Sky Pulse product scope is now both public and personal: public homepage Sky Pulse and personal report transit are both planned, while runtime transit calculation remains gated.
- The launch scope is free and no-login supported for both public daily sky pulse and user-entered birth-data personal transit previews; paid/private transit segmentation remains later-only.
- Iran launch uses Asia/Tehran only for homepage and personal report transit boundaries; user-selectable or user-location timezones remain deferred until a later non-Iran expansion.
- Phase-one transit bodies are Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto; lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred special points.
- Transit copy should be technical plus inspirational Persian copy and remain compatible with SEO phrases such as آسمان امروز, ترنزیت امروز, ترنزیت روزانه, ترنزیت امروز برای چارت تولد, and تأثیر آسمان امروز روی چارت تولد.
- No transit calculation, Sky Pulse runtime replacement, report narrative, dependency, API, or paid/private split is approved yet.

## v0.1.247 Sky-only transit calculation probe

- A probe-only sky transit calculator now samples the Iran-launch daily Sky Pulse at Asia/Tehran local noon and converts that local day boundary through the existing timezone conversion helper.
- The probe calculates local astronomy-engine geocentric ecliptic longitudes for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto, then finds phase-one aspects: conjunction, opposition, trine, square, and sextile with bounded orbs.
- The probe is not wired to the homepage Sky Pulse route, report narrative, chart wheel, API, dependency, account, payment, paid/private model, or personalized natal-to-transit runtime.
- Lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred special points for transit.
- Public homepage Sky Pulse and personal report transit remain planned as free and no-login supported for the Iran/Tehran launch, with Persian SEO wording such as آسمان امروز, ترنزیت امروز, ترنزیت روزانه, ترنزیت امروز برای چارت تولد, and تأثیر آسمان امروز روی چارت تولد.

## v0.1.248 Sky Pulse homepage API bridge

- Public homepage Sky Pulse advanced from probe done to data bridge done: `/api/sky-pulse/today` now includes real sky-only transit calculation data from `src/lib/chart/sky-only-transit-probe.ts` while preserving the existing homepage response shape.
- The bridge remains Iran/Tehran-only, free/no-login, public sky-only, and does not start natal-to-transit, report narrative, account, payment, API dependency, user-location, or non-Iran timezone work.
- Persian interpretation copy is still the next layer; the API bridge exposes real calculation data without adding deterministic, scary, fake, or horoscope-like daily claims.
- Stage status: Foundation done, Probe done, Data bridge done; User-visible interpretation/UI polish/hardening still remain for v0.1.249-v0.1.251.

## v0.1.249 Sky Pulse Persian interpretation layer

- Public homepage Sky Pulse advanced from data bridge done to user-visible interpretation foundation: `/api/sky-pulse/today` now exposes `transit.interpretation` built from the real sky-only transit result.
- The Persian layer reads calculated bodies and aspects, then returns technical + inspirational copy with SEO wording such as آسمان امروز, ترنزیت امروز, ترنزیت روزانه, وضعیت آسمان امروز, and حال و هوای آسمان امروز.
- The interpretation stays public, free/no-login, Iran/Tehran-only, and sky-only; it does not start natal-to-transit, report narrative, account, payment, user-location, non-Iran timezone, houses, angles, lunar nodes, or Lilith transits.
- When no bounded aspect is available, the layer must not invent a daily claim; it returns a guarded no-aspect summary instead.
- Stage status: Foundation done, Probe done, Data bridge done, User-visible interpretation foundation done; Homepage UI polish and Public QA/hardening still remain for v0.1.250-v0.1.251.

## v0.1.249 workflow failure note

- Failure: `check-sky-pulse-persian-interpretation` failed because the version-marker guard was brittle around CRLF/LF line endings, even though the source marker existed.
- Workflow failure: the first fix-forward command used bash heredoc syntax (`python - <<'PY'`), which is invalid in Windows PowerShell and did not run.
- Fix: normalize CRLF to LF inside the guard before string assertions and fix the `&&pnpm` spacing typo in `package.json`.
- Prevention: do not use bash heredoc in Halleus PowerShell workflows; use a patch or PowerShell-compatible temp script.

## v0.1.250 Homepage Sky Pulse UI polish

- Public homepage Sky Pulse advanced from user-visible interpretation foundation to homepage UI polish: `SkyPulseDateCard` now surfaces `transit.interpretation` from the existing `/api/sky-pulse/today` payload.
- The card keeps the original moon/phase date data visible, then adds Persian interpretation summary, حال و هوای آسمان امروز, calculated primary aspects, technical trust note, and public scope note.
- The UI remains public, free/no-login, Iran/Tehran-only, and sky-only; it does not start natal-to-transit, report narrative, account, payment, user-location, non-Iran timezone, or new dependencies.
- When no valid aspect is available, the homepage keeps the no-fake-copy state instead of inventing a daily claim.
- Stage status: Foundation done, Probe done, Data bridge done, User-visible interpretation done, Homepage UI polish done; Public Sky Pulse QA/hardening remains for v0.1.251.

## v0.1.251 Public Sky Pulse QA hardening

- Public homepage Sky Pulse is now recorded as user-visible and hardened after contract, product scope, calculation probe, homepage API bridge, Persian interpretation, and homepage UI polish.
- Hardening guard verifies the public route stays request-time, no-store, Tehran/Iran-only, free/no-login, and wired to the real sky-only transit bridge plus Persian interpretation layer.
- Guard coverage keeps the homepage UI synced with `transit.interpretation`, visible technical trust copy, visible free/no-login and تهران / ایران scope, SEO wording, and the no-fake-copy fallback when no close aspect exists.
- The milestone does not start natal-to-transit, report narrative, account, payment, user-location, non-Iran timezone, Search Console/indexing, houses, angles, lunar nodes, or Lilith transits.
- Stage status: User-visible, hardened public Sky Pulse. Next roadmap step can move to personal transit only after this public Sky Pulse path remains clean.

## v0.1.252 Natal-to-transit contract

- Public/Homepage Sky Pulse is already user-visible and hardened; this milestone continues the locked roadmap into Personal Transit instead of resetting Sky Pulse.
- Personal Transit advanced from scope decision to foundation contract only: the product label is آسمان امروز نسبت به چارت تولد تو, with SEO wording including ترنزیت امروز برای چارت تولد and تأثیر آسمان امروز روی چارت تولد.
- The contract remains free/no-login and Iran/Tehran-only for launch. It requires user-entered birth input and a real natal chart before any personal transit reading, but this milestone adds no calculation probe, no report data bridge, and no visible report section.
- Phase-one personal transit scope compares calculated current sky transit bodies to calculated natal chart bodies for Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto using conjunction, opposition, trine, square, and sextile with bounded orbs.
- Lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred. The contract forbids fake static personal daily claims, scary/fatalistic copy, external transit APIs, new runtime dependencies, account/payment gating, user-location expansion, and public homepage route changes.
- Stage status: Personal Transit is contract-only / foundation done. Next smallest step is v0.1.253 natal-to-transit calculation probe; v0.1.254 remains report data bridge; v0.1.255 remains first visible report section.

## v0.1.253 Natal-to-transit calculation probe

- Personal Transit advanced from contract to calculation probe without changing Homepage/Public Sky Pulse, report UI, report data bridge, account, payment, or SEO routes.
- Product correction synced: homepage Sky Pulse can remain Tehran-only, but personal report transits must compare the user's natal chart from birth place/time with the current sky for the user's current residence. There is no silent Tehran default for personal reports.
- The probe uses explicit birth place, birth time, timezone, and coordinates for natal placements, and explicit Iran current residence place/timezone/coordinates for the current transit context.
- If current residence is missing, the probe returns a missing-current-residence state rather than inventing personal precision.
- Phase one remains free/no-login, Iran current residence only, and uses Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, and Pluto with conjunction, opposition, trine, square, and sextile. Lunar nodes, Black Moon Lilith transits, houses, and angles remain deferred.
- Stage status: Personal Transit is now calculation probe done; no report data bridge and no visible report section yet. Next: v0.1.254 Personal transit report data bridge.

## v0.1.254 Personal transit report data bridge

- Personal Transit advanced from calculation probe to report data bridge without resetting the roadmap.
- The bridge adds `personalTransitReportData` at `engineData.personalTransitReportData` as the report-data slot for personal transit output, while keeping the visible report section deferred to `v0.1.255`.
- The source remains the real natal-to-transit calculation probe: natal data comes from birth place, birth time, timezone, and coordinates; transit context comes from current residence / current living location.
- No silent Tehran default is allowed for personal reports. If current residence is missing, the bridge keeps a missing-current-residence state instead of inventing personal precision.
- This milestone does not change Homepage/Public Sky Pulse, does not add report UI, does not add account/payment/private logic, and does not add a new API or dependency.
- Stage status: Contract done, Calculation probe done, Data bridge done; First visible report section remains for `v0.1.255`.

## v0.1.254 reduced fix-forward note

- Failure: `check:natal-to-transit-calculation-probe` still required the historical `v0.1.253-natal-to-transit-calculation-probe` marker after v0.1.254 advanced `NATAL_TO_TRANSIT_NEXT_STEPS.completedMilestone`.
- Fix: preserve the v0.1.253 calculation-probe milestone in a separate completed milestone history while keeping v0.1.254 as the current completed milestone.
- Prevention: staged guards should check historical milestone history, not only the mutable current next-steps block.

## v0.1.255 Personal Transit First Visible Report Section

- Personal Transit advanced from report data bridge to the first visible report section without changing Homepage/Public Sky Pulse, calculation math, account, payment, privacy, API, or dependency scope.
- ReportCard now reads personal transit from engineData.personalTransitReportData and renders a guarded section titled آسمان امروز نسبت به چارت تولد تو when report data exists.
- The visible section preserves the corrected location policy: natal data comes from birth place and birth time, while transit context comes from current residence / current living location. There is no silent Tehran default for personal reports.
- If current residence is missing, the section shows a missing-current-residence state instead of inventing personal precision or fake daily claims.
- Stage status: Contract done, Calculation probe done, Data bridge done, First visible report section done; next locked step is post-v0.1.255-report-depth-and-synthesis.

## v0.1.255 workflow failure note

- Failure: two patch attempts failed before this reduced runner: the first patch was corrupt, and the second patch did not apply to components/ReportCard.tsx because the GitHub/raw context did not match the local formatted file.
- Fix: switched to an inspected micro-context and a PowerShell-compatible scoped runner that edits only the allowed report UI, contract, guards, package scripts, and authority docs.
- Prevention: when GitHub/raw output collapses TSX or omits local formatting, use a small local context ZIP before generating JSX patches.

## v0.1.256 Report depth/synthesis first pass

- Report depth/synthesis phase started after Public Sky Pulse and the Personal Transit first visible report section were completed.
- This milestone adds a first visible synthesis layer to the report reading experience: روایت ترکیبی گزارش.
- The section connects the three core cards, calculated aspect count, active technical report data, and the personal transit visible section without changing calculation math.
- It keeps the report honest: no fake daily claim, no silent Tehran default, no account/payment/private logic, and no homepage/Public Sky Pulse change.
- Scope: first pass only. Deeper narrative synthesis, richer chart-spine prose, and premium-feel report depth remain after this milestone.

## v0.1.257a Report detail inventory audit

- Scope reduced after the failed v0.1.257 UI runners: this milestone does not edit `components/ReportCard.tsx` or any UI/runtime file.
- Added a report-detail inventory guard that records what the current report page already exposes and what must still be brought into report details.
- Locked the next report-detail completion requirements: inline retrograde/motion in the placements-in-houses table, standalone Moon sign, visible house cusp degree/sign, standalone planet-placement sections before aspect sections, standalone aspect relationship sections, deeper natal-vs-today transit comparison, and deeper Lilith / Lunar Nodes narrative.
- User-facing placement explanations may include for-dummies details such as positive/challenging traits, interests, examples, and symbolic anatomy/health correlations only when astrologically appropriate. They must not become medical diagnosis, disease prediction, fear copy, or unsupported certainty.
- No Sky Pulse foundation, transit math, account/payment/privacy, SEO/indexing, dependency, API, or broad redesign change is included.

## v0.1.257 workflow failure note

- Failure: two v0.1.257 UI apply runners failed before changing tracked files. The first used a marker that did not match the local `ReportCard.tsx`; the second had a temporary CJS syntax error caused by nested template interpolation and Persian/mojibake risk.
- Fix: stop the UI batch, clean artifacts, keep the repository clean, and split the work into an audit-only `v0.1.257a` before any report UI changes.
- Prevention: avoid Persian literals and nested template literals in temp CJS runners; do not edit `ReportCard.tsx` with broad string replacements; prefer componentized UI batches with tiny import/render changes only after the inventory guard is committed.

## v0.1.258 Report detail visible facts panel

- Added a componentized visible facts panel for report detail pages without rewriting the fragile `components/ReportCard.tsx` body.
- The panel surfaces standalone Moon sign, retrograde/motion facts, and house cusp degree/sign rows from existing report/engine data.
- This milestone intentionally avoids new astrology calculations, transit math changes, health/medical claims, account/payment/privacy work, SEO/indexing work, or broad report redesign.
- `ReportCard.tsx` is only allowed a minimal import/render connection for this batch; future report-detail UI must continue to be componentized.

## v0.1.259 Standalone planet placement sections

Added a visible report-detail layer for standalone planet placement sections before aspect relationship prose. The scope is presentation/narrative only: no astrology calculation changes, no transit math changes, and no medical claims. Placement copy may include for-dummies examples, positive/challenge traits, interests, and symbolic anatomy/health language only when clearly framed as non-diagnostic.

Next report-detail batches should add standalone aspect relationship sections, then deepen natal-vs-transit comparison and Lilith / lunar-node narrative.

## v0.1.260 Standalone aspect relationship sections

- Added a componentized report-detail layer for standalone aspect relationship cards after the individual planet-placement sections and before the older compact aspect summary.
- The page now has a visible, user-friendly relationship reading for priority natal aspects with headings such as Sun sextile Moon / 60-degree style relationships, simple explanations, helpful side, growth side, and orb/trust copy.
- The batch does not change astrology calculation, transit calculation, Sky Pulse, account/payment, SEO/indexing, or medical/fatalistic claims.

## v0.1.261 Personal Transit Comparison Depth
- Added a deeper visible personal transit comparison section for natal chart vs today, using the existing `engineData.personalTransitReportData` bridge rather than changing transit math.
- The section keeps current residence as required for personal transit and preserves the no silent Tehran default rule.
- The UI now explains ready, missing-current-residence, and partial-no-aspects states with more useful interpretation, orb/trust copy, and non-fatalistic language.
- This remains report-detail work only: no Sky Pulse reset, no account/payment/private model work, and no SEO/indexing implementation.

<!-- personal transit comparison depth -->


## v0.1.262 Report Special Points Deep Narrative
- Added a componentized report-detail narrative section for Lilith and the lunar nodes / دست‌های ماه.
- This is the report special points deep narrative batch: Lilith and Nodes now get a deeper, human, non-fatalistic reading rather than remaining only technical rows.
- The section keeps Mean Node and True/Osculating Node labels separate and keeps the local True/Osculating Black Moon Lilith model explicit.
- Lilith trust copy states that this point is not Mean Lilith, asteroid 1181, or Waldemath/Dark Moon, and that the text is symbolic rather than medical, deterministic, or frightening.
- No astrology calculation, transit calculation, Sky Pulse, account/payment/private model, or SEO/indexing behavior changed.
<!-- report special points deep narrative -->
## Workflow note — v0.1.262 stale mean-lunar-nodes guard fix
- v0.1.262 exposed a stale check-mean-lunar-nodes guard that still required Lilith to remain deferred/not-calculated after Lilith engine and report integration had already become real.
- Fix: sync the guard to the current calculated Lilith status while preserving local True/Osculating lunar-node assertions.
- Prevention: when a formerly deferred special point becomes integrated, update older guards that used deferral as a safety expectation.

## v0.1.263 Report narrative quality pass
- Added a narrative-quality pass across the report reading components so the detail page feels less like disconnected cards and more like a guided reading path.
- The synthesis section now explains how to move from core cards to placements, aspect relationships, special points, and personal transit as one layered report.
- Placement, aspect, Lilith/Nodes, and Personal Transit sections now include bridge copy that connects each layer to the previous and next layer while keeping non-fatalistic, non-medical trust boundaries.
- This is report-detail narrative work only: no astrology calculation, transit math, Sky Pulse, account/payment/private, SEO/indexing, or broad redesign changes.
<!-- report narrative quality pass -->

## v0.1.264 Report Structure Order Polish
- Applied the selected app-like report order: synthesis, quick facts, personal transit, core cards, planet placements, aspect relationships, special points, and technical chart details at the end.
- Technical chart data remains available under `جزئیات فنی چارت` instead of interrupting the main reading path.
- No engine math, Lilith/Node calculation, transit calculation, account/payment, or SEO behavior changed.
- Marker: report structure order polish
## Workflow note — v0.1.264 stale special-points order guard fix
- v0.1.264 changed the report order by explicit user choice to an app-like flow: synthesis, quick facts, personal transit, placements, aspects, Lilith/Nodes, then technical details.
- The v0.1.262 special-points guard still required Lilith/Nodes to appear before standalone placement/aspect sections.
- Fix: sync the guard to the new approved order instead of reverting the user-approved page structure.
- Prevention: when a later structure/order milestone intentionally changes section order, update older order guards in the same batch.

## v0.1.264a RealChartWheel Hydration Stability
- Fix: rounded RealChartWheel SVG coordinates to a stable fixed precision before rendering, preventing server/client hydration mismatches caused by tiny floating-point serialization differences.
- Scope: targeted chart-wheel rendering only; no astrology engine math, report order, transit calculation, public/private model, or SEO behavior changed.
- Guard: added `check:real-chart-wheel-hydration-stability` and wired it into report/project checks.
- Failure ledger: report pages exposed a hydration mismatch in SVG line/circle/text coordinate attributes after the report structure polish made chart-wheel rendering more visible. Prevention is to stabilize SSR/client SVG numeric output at the component boundary.
<!-- RealChartWheel hydration stability fix -->
<!-- real chart wheel hydration stability -->

## v0.1.265 Report Trust Safety Language QA
- report trust safety language qa
- User choice: keep safety language very light and show it once for the whole report page, not repeated inside every narrative card.
- Product copy rule: the page-level note says the report is for inspiration/reflection, not prediction or a final ruling; interpretation and use stay with the reader.
- Scope: copy and guards only; no astrology engine math, transit calculation, report order rollback, public/private model, account/payment, or SEO behavior changed.

## v0.1.265b report detail live path reality

Recorded after v0.1.265a: recent report-depth milestones changed ReportCard and companion report components, but the live `/reports/[reportId]` route renders `ReportDetail -> ReportV3Experience -> report-v3`. This created a workflow/product visibility failure: some passed guards validated non-live report components instead of the page the user actually sees.

Fix/prevention: `v0.1.265b` adds a live-path guard for `ReportDetail`, moves the single soft trust/safety note into `report-v3`, removes repeated heavy safety language from displayed V3 sections, and syncs the technical lunar-node table with local True/Osculating nodes. Future report-detail work must inspect and guard the live route before claiming user-visible progress.

## v0.1.265d - live report feature reconciliation guard

- Added a live report feature reconciliation guard after the v0.1.265b path audit.
- ReportCard is not the live /reports/[reportId] surface; live report detail must be judged through app/reports/[reportId]/page.tsx -> ReportDetail -> ReportV3Experience/report-v3/writer.
- Lilith deep narrative is now live in ReportDetail on /reports/[reportId]; the existing special-points component is parked until a live bridge is added.
- Personal transit is now live in ReportDetail on /reports/[reportId] via engineData.personalTransitReportData only; missing stored transit data shows a no-hidden-Tehran missing-state.
- Fixed the live technical lunar-node heading so missing node data no longer falls back to a Mean label.
- Prevention: future report milestones must include a live-path guard proving the feature renders through ReportDetail or explicitly mark it as non-live/legacy.

## v0.1.266 live report structure + facts

- v0.1.266 brings the quick facts panel into the live /reports/[reportId] path through ReportDetail, not ReportCard.
- ReportDetailFactsPanel is now live for moon sign, retrograde status, and house cusp facts.
- This step is limited to live report structure + facts; Lilith deep narrative, personal transit, placements, and aspects remain separate reconciliation steps.
- v0.1.267: Live report placements/aspects bridge is now wired through ReportDetail for /reports/[reportId]; Lilith deep narrative is now live in ReportDetail; personal transit was still not live at that milestone; current status is live as of v0.1.269.
- v0.1.268: Lilith deep narrative is now live in ReportDetail for /reports/[reportId] through ReportSpecialPointsNarrativeSection; lunar-node narrative remains live through the writer and the live special-points bridge. Personal transit was still not live at that milestone; current status is live as of v0.1.269.
- v0.1.269: Personal transit is now live in ReportDetail via engineData.personalTransitReportData only; if stored report data is missing, the live report shows a missing-state and does not default to Tehran or infer current residence.
- Workflow failure note for v0.1.269: the first personal-transit live attempt failed because it used a stale replacement anchor, touched the transit component unnecessarily, and used an over-broad browser-location guard; prevention is to keep the live bridge limited to ReportDetail, leave PersonalTransitReportSection unchanged, and scope the guard to the transit data reader.
- v0.1.270: Final live report QA/cleanup confirms /reports/[reportId] uses ReportDetail rather than ReportCard and has live narrative, quick facts, placements, aspects, Lilith/nodes, and personal-transit bridge sections. No new engine/transit calculation was added.
- Workflow failure note for v0.1.270 closure: v0.1.269 exposed runner false-positive risk and over-broad guard checks; prevention is to make final QA guard-only/docs-only, require the new guard to pass before commit, and scope browser-location checks to the personal-transit bridge rather than the whole ReportDetail file.

## v0.1.271a report detail app UI polish and runner failure note
- Scope: live /reports/[reportId] readability polish only. The patch improves app-like card separation, section spacing, Persian reading line-height, chip navigation behavior, mobile-safe grids, and overflow wrapping.
- No engine math, transit calculation, account/payment, SEO/indexing, public/private consent, Sky Pulse, or ReportCard live-path changes are included.
- Personal Transit remains honest and stored-report-only: no browser geolocation, no localStorage location inference, and no synthetic currentResidence.
- Failure ledger: the first v0.1.271 runner failed before applying because it checked a Persian literal in a PowerShell-generated Node script and the marker mojibaked on Windows. Prevention: v0.1.271a runner uses ASCII/code-level guards only and leaves Persian JSX text untouched.

## v0.1.272a report detail simple app redesign
- Scope: reduced redesign of the live /reports/[reportId] reading surface after the first v0.1.272 runner failed on an exact layout anchor.
- The live report body is converted from a dense main-reader grid into a single readable app stack, with wrapped section chips and broad CSS guards against squeezed Persian text inside nested cards/grids.
- Files intentionally touched: components/ReportDetail.tsx, app/globals.css, package.json, docs, and a new guard script.
- No ReportV3Experience JSX rewrite in this reduced batch. No engine math, transit calculation, account/payment, SEO/indexing, or public/private consent changes.
- Personal Transit remains stored-report-only and honest: no browser geolocation, no localStorage residence inference, and no synthetic current residence.
- Failure ledger: the first v0.1.272 runner failed before applying because a too-exact block anchor did not match the local live file. Prevention: v0.1.272a uses local diagnostic class anchors and reduced class-based transforms.

## v0.1.272b stale UI guard sync
- Scope: guard-only sync after the v0.1.272a app-stack redesign applied but stale UI guards still required the pre-redesign dense reader grid and narrative-card markers.
- Fix: scripts/check-report-detail-product-ui.mjs and scripts/check-report-detail-app-ui-polish.mjs now accept the simple app-stack report detail layout while still guarding the live ReportDetail route, ReportV3Experience, section anchors, stored-report-only Personal Transit, and no browser/current-location inference.
- Prevention: future visual redesigns must update the UI guard contract in the same batch instead of preserving stale layout markers.

## v0.1.273 report detail CSS-only visual cleanup
- Scope: CSS-only cleanup after failed app-shell attempts were rolled back.
- This batch does not rewrite ReportDetail.tsx and does not inject Persian/Unicode JSX.
- Fixes: hides the noisy horizontal section chip toolbar, prevents the three-pillars card from sticky/frozen behavior, and hides the fourth birth-card row that corresponds to the hour-status noise in the current birth-data order.
- No engine, transit, SEO, auth, payment, public/private consent, ReportCard, or ReportV3Experience behavior is changed.

## v0.1.274 current residence personal transit bridge
- Scope: wires current residence into the live report generation path so ReportDetail can receive engineData.personalTransitReportData instead of showing the missing-state for new reports.
- ChartForm now collects a current residence city separately from birth city and passes its coordinates/timezone to the real-chart API.
- The real-chart route maps currentResidence fields into BirthInput.
- report-generation-service uses the existing natal-to-transit probe and personal-transit report-data bridge to store engineData.personalTransitReportData.
- Workflow note: earlier v0.1.274 attempts failed on guessed ChartForm anchors and were rolled back. This apply was based on a read-only preflight with exact live ChartForm, route, service, and type anchors.
- No browser geolocation, localStorage residence inference, window.location residence inference, silent Tehran default, birth-city fallback, engine math changes, SEO/indexing changes, auth/payment changes, ReportDetail redesign, or Sky Pulse behavior changes are included.

## v0.1.275a user-facing copy detox account shell
- Scope: copy-only cleanup for SupabaseAuthPanel and AppShell footer.
- Removed user-facing implementation/status language from the account panel: raw account query links, env flags, User ID, private/noindex wording, account-save/local-preview status, and public/indexable/payment disclaimers.
- Kept auth logic, storage config reads, account save/read behavior, report engine, payment, SEO, schema, and consent implementation unchanged.
- Added focused guard: check:user-facing-copy-detox.

## v0.1.276 user-facing copy detox dashboard profile
- Scope: copy/UI-surface cleanup for Dashboard and Profile.
- Removed user-facing project-status language from these pages: local-preview/private-noindex/account route/migration/readiness/Supabase/Postgres/provider/plan entitlement/debug status copy.
- Kept account/auth/storage/report logic and APIs unchanged; this batch only reshapes dashboard/profile user-facing copy and hides implementation status from the user surface.
- Extended check:user-facing-copy-detox to cover Dashboard and Profile alongside the account panel/footer.

## v0.1.277 user-facing copy detox reports detail
- Scope: copy/UI-surface cleanup for Reports and ReportDetail pages.
- Removed user-facing project-status/debug/database language from these pages: Account read guard, Beta database archive, local-preview/private-noindex/public-noindex, visible source/visibility labels, raw public-link status messages, and foreground JSON backup wording.
- Kept report storage/query logic, report detail rendering, chart/transit/report engine behavior, APIs, schema, SEO, payment, and consent implementation unchanged.
- Extended check:user-facing-copy-detox to cover Reports and ReportDetail alongside previous account shell/dashboard/profile cleanup.

## v0.1.278 user-facing copy detox pricing order
- Scope: copy/UI-surface cleanup for Pricing, Order, ManualOrderRequestForm, and visible billing-plan copy.
- Removed payment/backend/storage/status wording, dollar-style visible pricing, local-preview/mock/client-workflow plan copy, and order-form storage wording from user-facing surfaces.
- Kept payment implementation, billing data shape, auth/storage/report APIs, schema, SEO, and consent implementation unchanged.
- Extended check:user-facing-copy-detox with scoped Pricing/Order checks. The guard avoids global matching of terms such as Preview/Personal/Professional because those can appear in implementation identifiers.
- Workflow note: earlier v0.1.278 attempts were fully rolled back before this retry. This successful retry used a read-only preflight first and ASCII structural markers only.

## v0.1.279 user-facing copy detox homepage product privacy
- Scope: copy/UI-surface cleanup for Homepage, Product, and Privacy.
- Reframed homepage future/roadmap module copy into current product focus copy.
- Replaced visible indexable/private-first wording with user-facing privacy/search language.
- Kept engine, auth, storage, payment, SEO implementation, report logic, and consent implementation unchanged.
- Extended check:user-facing-copy-detox with scoped Homepage/Product/Privacy assertions only.

## v0.1.280 guard stabilization
- Scope: guard/workflow stabilization only for scripts/check-user-facing-copy-detox.mjs.
- Converted the accumulated copy-detox check into clearer scoped helpers while preserving prior account shell, dashboard/profile, reports/detail, pricing/order, and homepage/product/privacy expectations.
- Kept UI/source, report engine, Sky Pulse calculation, auth/storage/payment/API/schema/SEO, and consent implementation unchanged.
- Workflow failure recorded: the failed v0.1.280/v0.1.280b Sky Pulse copy attempts used unsafe Persian exact matching or large JSX replacement and caused rollback. Prevention: inspect exact target components before patching, avoid large JSX replacement runners, and keep copy guards scoped to visible-copy risks rather than implementation identifiers.

## v0.1.281 homepage Sky Pulse copy detox
- Scope: user-facing copy cleanup for the homepage Sky Pulse card only.
- Replaced raw technical Sky Pulse labels and rendered notes with calmer user-facing language.
- Kept Sky Pulse calculation, API response shape, transit source, report engine, auth/storage/payment/schema/SEO, and consent implementation unchanged.
- Guardrail: do not use large JSX replacement runners for SkyPulseDateCard; future fixes must inspect the full component and make small visible-copy changes only.

## v0.1.282 internal route exposure policy
- Scope: docs/guard policy only for internal/dev route exposure after the user-facing copy detox sequence.
- Route audit classified /admin, /engine/*, /quality/mvp-checkpoint, /roadmap, and the current /wiki implementation as internal/dev or not-yet-public-growth surfaces.
- /quality, /interpretation, and /language remain public-ish support routes that can be humanized later, but they are not the next product priority.
- No app route, component, engine, auth/storage/payment/API/schema/SEO, report logic, wiki implementation, or public consent behavior changed.
- Product sequence locked after this policy batch: report page first, then wiki.

## v0.1.283 report narrative cleanup Batch 1
- Scope: shorten and humanize the live `/reports/[reportId]` main narrative without changing chart calculation, aspect scoring, technical tables, chart wheel, Lilith/Nodes calculation, Personal Transit, privacy, auth, payment, SEO, or wiki.
- The live writer keeps one general reading guide, keeps chapter summaries/guides only for active houses and lunar nodes, limits the narrative to the top four active houses, and removes the full ASC/DSC/MC/IC and natal-accuracy explanation from the main reading while preserving those calculated data paths for the technical/report-detail surfaces.
- Three pillars and Mercury/Venus/Mars now use concise synthesis inside the main narrative; full placements and technical facts remain available lower on the report page.
- Arad and Arian QA targets keep their core chart spines through reusable synthesis paths; Batch 1 adds no person-specific chart branches and does not change aspect prioritization.
- Reading-length QA adds a maximum 2,700-word section budget, corresponding to no more than about 15 minutes at the existing 180 words/minute calculation.
- Workflow failure ledger: two earlier read-only `node -e` inspection commands failed because PowerShell stripped nested JavaScript quoting. Prevention: do not use multiline JavaScript through `node -e` in VS Code PowerShell; use a uniquely named runner with a temporary UTF-8 script file, avoid Persian matching in PowerShell, and read GitHub-accessible source directly instead of asking the user to paste it.

- Workflow failure ledger: the first v0.1.283 apply runner called pnpm run check:report-value-synthesis-lite, but that package script does not exist. The runner stopped correctly before commit, tag, or push. Fix/prevention: verify every pnpm run target against the live package.json before runner generation; when a check file exists without a package script, invoke it directly with Node.

## v0.1.284a Placidus contract scope

Baseline before apply:

- HEAD: 146083e
- Tag: v0.1.283-report-narrative-cleanup-batch1
- Branch: main
- Working tree: clean except known untracked failed runners

Scope:

- Add `placidus` as a hidden house-system contract with twelve supplied unequal cusps.
- Add cusp-aware planet/point house assignment and one numeric reference fixture for Haleh, Hamadan, 1999-12-12 19:05.
- Keep `src/lib/chart/real-chart-engine.ts` on Whole Sign in this batch.
- Add a focused guard that prevents accidental runtime activation or an unapproved Swiss Ephemeris dependency.
- Do not change report prose, report UI, chart wheel, aspect scoring, nodes, Lilith, transits, storage, auth, SEO, or payment.

Next step after checks and commit is a local Placidus cusp calculator candidate with independent validation fixtures, not the report migration itself.

Workflow failure ledger:

- The first v0.1.284a runner compared Windows repository paths as raw strings. PowerShell returned a backslash path while Git returned a forward-slash path, so the runner stopped before backup or apply. Prevention: normalize both paths and compare case-insensitively.
- The reconstructed r1 runner corrupted its embedded payload and left a standalone PowerShell finally token. It stopped before backup or apply. Prevention: do not rewrite an embedded Base64 payload in place; generate replacement runners from the intact source and validate the generated script structure before delivery.
- The r2 runner used an unverified single-line marker for a multi-line TypeScript type and stopped after the first edit in `houses.ts`. Prevention: build patches from the exact live commit, run them on a clean clone, and complete all required checks before delivery.
- Sandbox validation found `check-real-engine-houses.mjs` was already stale on untouched baseline `146083e`: it required an English sentence that had been replaced by current report house logic. Fix/prevention: guard stable code contracts (`whole-sign-from-ascendant` and `placidus-calculated`) instead of user-facing copy.
- The r3 runner embedded a textual patch without preserving the final newline, so `git apply --check` rejected it as corrupt before apply. Fix/prevention: verify exact patch bytes and terminal newline, not only patch content.
- The r4 runner was tested against a Windows `git archive` ZIP whose exported text had CRLF bytes, while the real checkout and HEAD blobs used LF. It therefore passed against the wrong byte baseline and failed preflight locally. Fix/prevention: derive baseline files from Git object blobs (`git cat-file` / exact HEAD hashes), verify those hashes against the live checkout, and prefer full-file writes guarded by old/new hashes over context patches for this recovery batch.
- The r5 full-file runner applied the intended Placidus contract and passed focused guards, but the production build exposed a stale report snapshot type: `NormalizedHouseConfidence` included `provided-cusps` while `RealEngineReportHouseContext.confidence` did not. Fix/prevention: synchronize `types/astro.ts` with the normalized house-confidence contract and guard that union in `check:placidus-house-contract` before running the full build.

## v0.1.284b local Placidus calculator scope

Baseline before apply:

- HEAD: `f727f8b169dc082557ebb1cfe987569e442bd644`
- Tag: `v0.1.284a-placidus-house-contract`
- Branch: `main`
- Working tree: clean

Scope:

- Add a pure TypeScript local Placidus calculator based on temporal semi-arc equations and numerical root solving.
- Add four external numeric reference fixtures: Hamadan, Quito, Sydney, and Reykjavik.
- Add explicit northern and southern polar-circle unavailable fixtures with no silent fallback.
- Add a focused executable guard that transpiles and runs the actual calculator implementation, checks every cusp, checks root residuals/oppositions, and proves the runtime remains Whole Sign.
- Add the focused guard to `check:project` and `check:engine`.
- Do not change `real-chart-engine.ts`, normalized runtime input, report writer/UI, chart wheel, storage/snapshot schema, aspect scoring, nodes, Lilith, transits, auth, SEO, payment, or public/private consent.
- Do not add a Swiss Ephemeris runtime dependency. External Swiss numeric outputs are fixture references only; the Halleus implementation is local and independent.

Apply/verification rule:

- Build the runner only from exact `f727f8b` Git blob content.
- Use full-file writes guarded by old Git blob hashes and new SHA-256 hashes; do not use text markers or `git apply`.
- Run the calculator guard, v0.1.284a guards, encoding, `git --no-pager diff --check`, focused TypeScript, and full `pnpm build` before commit/tag/push.

## v0.1.284c Placidus runtime migration scope

Baseline before apply:

- HEAD: `95385b7e4626f23f226e69aad0c76a92139acf28`
- Tag: `v0.1.284b-local-placidus-calculator`
- Branch: `main`
- Working tree: clean

Scope:

- Activate the local Placidus calculator for newly generated runtime charts.
- Pass twelve unequal calculated cusps through normalized chart, report enrichment, snapshot v2, report writer, chart wheel, and technical tables.
- Replace fixed 30-degree report assignment with cusp-aware assignment.
- Preserve `real-engine-preview-v1` and stored Whole Sign snapshots without silent recalculation.
- For polar-circle or solver non-convergence, retain signs, planets, aspects, and axes while returning no report houses and no house assignments; show explicit no-fallback copy in writer and UI.
- Add a dedicated executable migration guard and synchronize the earlier Placidus, workbench, house, and wheel guards.
- Keep aspect scoring, Nodes/Lilith calculation, transits, auth/storage/payment, SEO, and public/private consent unchanged.
- Do not add Swiss Ephemeris as a runtime dependency.

Apply/verification rule:

- Build from exact `95385b7` Git blobs and use full-file writes guarded by old blob hashes and new SHA-256 hashes.
- Run all focused Placidus/runtime/report/UI guards, encoding, `git --no-pager diff --check`, focused TypeScript, and full `pnpm build`.
- Runner must not commit, tag, or push.

## v0.1.285 report aspect selection scope

- Resume report-completion Batch 2 after the Placidus migration.
- Fix the data-model problem where the report writer overwrote the full aspect inventory with five narrative picks.
- Add a separate six-item narrative highlight layer while keeping all valid calculated major aspects saved and visible in the technical table.
- Protect tight relationships and add chart-ruler/core/active-house/diversity weighting without changing the five major aspect definitions or their orb ceilings.
- Validation includes the 1999-12-12 19:05 Hamadan fixture: full inventory contains 15 major aspects, and highlights include Mercury–Neptune sextile, Mars–Saturn square, Mars–Uranus conjunction, and Moon–Saturn square.
- Required checks: new selection guard, report sample QA, narrative cleanup/QA, live aspect UI guards, encoding, diff-check, focused TypeScript, and full production build.

## v0.1.286 report synthesis depth scope

Baseline before apply:

- HEAD: `6cdc2080e1c305f57b0f2e90561ae79ffd65e8c1`
- Tag: `v0.1.285-report-aspect-selection-synthesis`
- Branch: `main`
- Working tree: clean

Scope:

- Complete report-cleanup Batch 3 by adding a pure synthesis planner above the six narrative aspect highlights created in v0.1.285.
- Select three distinct evidence roles when the chart supports them: primary challenge, primary support/resource, and a daily-life bridge involving Mercury, Venus, or Mars.
- Render those roles through the actual participating planets, signs, and concise house fields instead of the old generic central-tension sentence.
- Derive the weekly practice and closing practice list from the same selected evidence so the opening and ending stay coherent.
- Remove person-specific Mercury/Aquarius/house-6 and chart-ruler practice branches; synthesis must be reusable across charts.
- Keep the main reading at eight sections and strengthen the sample ceiling to 1,550 words. Current sample QA is 1,544 words for the aspect-rich fixture and 1,440 for the minimal fixture.
- Keep the complete technical aspect inventory and the six narrative highlights from v0.1.285 unchanged.
- Do not change planetary calculation, aspect definitions/orb ceilings, Placidus, Nodes/Lilith, transits, report storage, auth, payment, SEO, or public/private consent.

Verification rule:

- Run the new deterministic synthesis-depth guard, report writer/sample/narrative guards, live aspect/report QA, user-facing copy detox, encoding, `git --no-pager diff --check`, focused TypeScript, and full `pnpm build` before commit/tag/push.
- Apply through exact full-file writes guarded by old Git blobs and new SHA-256 hashes. The runner must not commit, tag, or push.

## v0.1.287 report cross-section consistency scope

Baseline before apply:

- HEAD: `f167c3a4be0fb913c23d8ce57f543fd12b1fc974`
- Tag: `v0.1.286-report-synthesis-depth`
- Branch: `main`
- Working tree: clean

Scope:

- Complete report-cleanup Batch 4 by making the opening, daily-life chapter, and final summary reuse one ordered synthesis role list.
- Continue only the selected challenge, support, and daily bridge in the main daily-life narrative; keep exact angle/orb detail in the technical table.
- Use one shared practice builder for the opening weekly practice and final three-practice list, with the first practice reused verbatim.
- Anchor the closing house summary to selected synthesis evidence when possible.
- Preserve eight sections and reduce the sample ceiling from 1,550 to 1,450 words.
- Keep aspect math/orbs, Placidus, Nodes/Lilith, transits, storage, auth, payment, SEO, public/private consent, and broad UI redesign unchanged.

Verification rule:

- Run the new cross-section consistency guard, synthesis-depth guard, report writer/sample/narrative guards, live aspect/report QA, copy detox, encoding, `git --no-pager diff --check`, focused TypeScript, and full `pnpm build`.
- Apply through exact full-file writes guarded by old Git blobs and new SHA-256 hashes. Runner must not commit, tag, or push.

## v0.1.288 report special-points/transit final QA

Report Cleanup Batch 5 closes the five-batch report-quality roadmap with a trust pass over special points and saved personal transits.

- A stored transit snapshot keeps `transitLocalDate`, `sampleLocalTime`, and `currentResidenceUtcIso`; reopening an old report does not relabel or recalculate it as today.
- The visible transit section names the report-time sky, shows the stored date when available, keeps the no-silent-Tehran rule, and avoids deterministic prediction language.
- The Lilith technical position remains visible, but while `approvedForReportOutput` is false it cannot enter personality, relationship, growth, synthesis, or practice narrative.
- The model-aware lunar-node path preserves Mean versus local True/Osculating labels and uses generic sign/house evidence instead of fixture-specific branches.
- No astrology calculation, Placidus logic, aspect/orb policy, Node/Lilith/transit math, external API, Swiss runtime dependency, auth, payment, SEO, storage policy, or public/private consent behavior changes in this batch.
- This section supersedes earlier roadmap wording that described Lilith deep narrative as generally live; the live surface now exposes node narrative plus a technical Lilith boundary unless report approval is explicitly true.

## v0.1.288a workflow failure note

- Failure: the first v0.1.288 runner passed the complete 52-check report suite plus the Lilith model, probe, and validation checks, then stopped at `check:lilith-internal-adapter` because that guard required the stale exact sentence `interpretive narrative remains disabled` in all four authority docs.
- Diagnosis: the authority docs already carried the stronger current contract through `approvedForReportOutput` and the explicit rule that Lilith cannot enter personality, relationship, growth, synthesis, or practice narrative while report approval is false. Runtime calculation and validation were not implicated.
- Fix: align the adapter guard to those stable semantic markers, then rerun the failed guard, the remaining Lilith/source checks, the complete report suite, encoding, diff-check, focused TypeScript, and the full production build.
- Prevention: docs guards must validate stable model flags and prohibited/allowed surfaces instead of depending on one replaceable prose sentence.

## v0.1.288b comprehensive guard-repair note

- Failure: the first repair aligned `check:lilith-internal-adapter`, but the next check stopped at `check:lilith-engine-output`; a complete read-only search then found 10 remaining stale prose assertions across nine Lilith/source guards.
- Diagnosis: those guards mixed stable code contracts with the replaceable sentence `interpretive narrative remains disabled`. The runtime still kept `approvedForReportOutput: false`, technical Lilith data remained visible, and the report narrative exclusion contract was already covered by model-aware UI/writer guards.
- Fix: remove the replaceable runtime-prose assertion from source-oriented guards, require `approvedForReportOutput` plus the explicit prohibited narrative surfaces in authority-doc checks, preserve the repaired adapter guard, and rerun the complete report/Lilith/source/build chain from the beginning.
- Prevention: after any authority wording change, search the full guard directory for the retired marker before building a repair runner; after two failures in one batch, switch to one comprehensive guarded repair rather than sequential single-check fixes.

## v0.1.289 wiki content foundation

Scope:

- Replace the existing five-entry internal glossary at `/wiki` with a user-facing Persian astrology Wiki home.
- Add `lib/wiki/wiki-content.ts` as the first reusable taxonomy/article source with four foundational Persian articles.
- Add `app/wiki/[slug]/page.tsx` as a static dynamic-route article template with metadata, related links, summary points, report CTA, and safety framing.
- Add `app/wiki/wiki.module.css` for a responsive Wiki-specific reading system without changing global product styling.
- Add `/wiki` to `lib/config/navigation.ts` so the learning surface is reachable from public header navigation.
- Add `scripts/check-wiki-content-foundation.mjs` to guard the article inventory, template, internal links, noindex boundary, and absence of the old internal glossary.

Boundary:

- Wiki index and article pages remain `noindex/follow` and are not added to `lib/config/seo.ts` or the sitemap in this batch.
- No sitemap or public-report indexing change, keyword-cluster publication, cohort generation, report engine change, auth/payment/storage change, or broad site redesign is allowed.
- Live Persian keyword research and explicit indexing approval remain prerequisites for scaling beyond the four foundational articles.

Verification:

- Run `node scripts/check-wiki-content-foundation.mjs`.
- Run `pnpm run check:site-chrome-minimal-ui`, `pnpm run check:encoding`, `git --no-pager diff --check`, and full `pnpm build`.
- Apply through exact full-file writes guarded against the expected HEAD Git blobs. Runner must not commit, tag, or push.

## v0.1.289 Wiki runner failure ledger

- Failure 1: the first Wiki foundation runner converted the Git root result into a string and then indexed it with `[0]`, reducing `C:\Projects\astro-clean` to `C` and failing before any write.
- Failure 2: the first path repair used `git cat-file -e` for baseline-new files; PowerShell promoted the expected missing-path stderr to a terminating error before the exit code could be handled.
- Failure 3: after the Wiki files were written, the runner called the unrelated `check:site-chrome-minimal-ui` guard, which was already red on the baseline because it expected the retired `Halleus.ir` AppShell marker.
- Fix and prevention: use `Select-Object -First 1` for Git text output, use `git ls-tree` rather than expected-error probes for new files, and run only checks that cover the active batch. Before handing off a runner, replay the payload and inspect every check for baseline relevance; do not imply full Windows execution when PowerShell was not actually available.

## v0.1.290 wiki accuracy content batch

Baseline before apply:

- HEAD: `f4c620506a666b732477036073d1af3d20a3cb2b`
- Tag: `v0.1.289-wiki-content-foundation`
- Branch: `main`
- Working tree: clean in the latest live user output

Scope:

- Extend `lib/wiki/wiki-content.ts` from four to seven Persian Wiki articles and add the `accuracy` category.
- Publish `why-birth-time-matters`, `why-birth-city-matters`, and `birth-chart-without-birth-time` with article-specific metadata, internal links, sources, and restrained chart CTAs.
- Update `app/wiki/[slug]/page.tsx` to use optional SEO fields and render `Article` and `BreadcrumbList` structured data, contextual internal links, sources, and per-article CTA copy.
- Update the Wiki home copy to describe the foundational and accuracy clusters without changing its responsive layout.
- Update `scripts/check-wiki-content-foundation.mjs` to guard seven Persian Wiki articles, the three new slugs, structured data, no unsupported unknown-time product claim, and the continuing noindex boundary.
- No sitemap or indexing activation, report engine change, birth-form capability change, auth/payment/storage change, or broad site redesign is included.

Verification:

- Run `node scripts/check-wiki-content-foundation.mjs`.
- Run `pnpm run check:encoding`, `git --no-pager diff --check`, and full `pnpm build`.
- Do not run unrelated known-red site-chrome assertions as a release gate for this content-only batch.
- Apply through one exact full-file runner; it must not commit, tag, push, deploy, or activate indexing.

## v0.1.291 wiki birth-chart reading guide

Baseline before apply:

- HEAD: `10b923e1a63a7a8841e97f9b89d50082006fd1e5`
- Tag: `v0.1.290-wiki-birth-data-accuracy-guides`
- Branch: `main`
- Working tree: clean in the latest live user output

Scope:

- Extend `lib/wiki/wiki-content.ts` from seven to eight Persian Wiki articles.
- Publish `how-to-read-birth-chart` with article-specific SEO metadata, a practical ten-step reading order, internal links to the four existing foundation articles, and a restrained `/chart` CTA.
- Add the new guide to related-article paths from the birth-chart basics and Sun/Moon/Rising pages.
- Update `scripts/check-wiki-content-foundation.mjs` to guard the eighth slug, core reading-order markers, trust language, and the continuing noindex boundary.
- No route, CSS, sitemap, indexing, report-engine, birth-form, auth/payment/storage, or broad UI change is included.

Verification:

- Run `node scripts/check-wiki-content-foundation.mjs`.
- Run `pnpm run check:encoding`, `git --no-pager diff --check`, and full `pnpm build`.
- Apply through one exact full-file runner; it must not commit, tag, push, deploy, or activate indexing.

## v0.1.292 wiki birth-chart interpretation guide

Baseline before apply:

- HEAD: `5f70c375ef090275d101ad3d3507dc77f9596b1f`
- Tag: `v0.1.291-wiki-birth-chart-reading-guide`
- Branch: `main`
- Working tree: clean in the latest live user output

Scope:

- Extend `lib/wiki/wiki-content.ts` from eight to nine Persian Wiki articles.
- Publish `what-is-birth-chart-interpretation` with Persian SEO metadata, a clear calculation-versus-interpretation distinction, responsible editorial principles, warning signs for deterministic/fear-based copy, internal links to existing Wiki pages, and a restrained `/chart` CTA.
- Add the interpretation guide to related-article paths from the birth-chart basics and chart-reading guide pages.
- Update `scripts/check-wiki-content-foundation.mjs` to guard the ninth slug, interpretation/synthesis markers, trust language, and the continuing noindex boundary.
- Do not add a link to the not-yet-published planet/sign/house comparison article.
- No route, CSS, sitemap, indexing, report-engine, astrology-calculation, Sky Pulse, birth-form, auth/payment/storage, or broad UI change is included.

Verification:

- Run `node scripts/check-wiki-content-foundation.mjs`.
- Run `pnpm run check:encoding`, `git --no-pager diff --check`, and full `pnpm build`.
- Apply through one exact full-file runner; it must not commit, tag, push, deploy, or activate indexing.

## v0.1.293 wiki core gap content batch

Baseline before apply:

- HEAD: `313daec45b6ca0757efa75fa235e0d20009206fe`
- Tag: `v0.1.292-wiki-birth-chart-interpretation-guide`
- Branch: `main`
- Working tree: clean in the latest live user output

Duplicate reconciliation:

- The supplied files contained eight article drafts.
- `how-to-read-birth-chart` already existed from v0.1.291.
- `what-is-birth-chart-interpretation` already existed from v0.1.292.
- The remaining six slugs were absent from the live nine-article inventory and are the only articles included in this batch.

Scope:

- Extend `lib/wiki/wiki-content.ts` from nine to fifteen Persian Wiki articles.
- Publish `planet-sign-house-difference`, `why-sun-sign-is-not-enough`, `planets-in-birth-chart`, `what-is-moon-sign`, `what-is-rising-sign`, and `tehran-birth-chart-difference`.
- Add article-specific Persian SEO metadata, long-form sections, internal links among live pages, and restrained `/chart` calls to action.
- Add selected related-article paths from the existing birth-chart basics and Sun/Moon/Rising guides to the new live articles.
- Update `scripts/check-wiki-content-foundation.mjs` to guard the fifteen-article inventory, unique slugs, unique article titles, all six new slugs, trust markers, and the continuing noindex boundary.
- Update the Idea Garden with the duplicate-reconciliation decision and content/product boundaries.
- No route, CSS, report engine, astrology calculation, birth form, auth/payment/storage, sitemap, indexing, Sky Pulse, or public/private consent implementation change is included.

Verification:

- Run `node scripts/check-wiki-content-foundation.mjs`.
- Run `pnpm run check:encoding`, `git --no-pager diff --check`, and full `pnpm build`.
- Apply through one exact full-file runner; it must not commit, tag, push, deploy, or activate indexing.

## v0.1.294 homepage + app-shell redesign scope
Baseline before apply:
- HEAD: `6106ad5d57d36ffa299e1659bb5bb08cccaf76b7`
- Tag: `v0.1.293-wiki-core-gap-content-batch`
- Branch: `main`
- Working tree: clean in the latest live terminal output

Scope:
- Establish the approved soft-light Halleus visual language on the shared header, footer, and homepage.
- Rebuild the homepage around real product surfaces: chart/report entry, real HomepageProductProof, real SkyPulseDateCard, the fifteen-article Wiki, privacy, and truthful trust copy.
- Add shared app-shell design tokens through a scoped CSS module without rewriting `app/globals.css` or changing internal page behavior.
- Preserve the existing header scroll/hide behavior, NavLinks, public route discoverability, and site-chrome guard contracts.
- Do not change report calculation, report data contracts, chart form behavior, storage/auth/payment, sitemap/robots/indexing, Sky Pulse calculation, or public/private consent.

Checks:
- `node scripts/check-homepage-app-redesign.mjs`
- `pnpm run check:site-chrome-minimal-ui`
- `pnpm run check:product-surface`
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `pnpm build`

## v0.1.294 workflow failure ledger
- The initial v0.1.294 homepage and App Shell redesign runner applied its intended payload successfully and passed the homepage guard, site-chrome guard, product-surface guard, encoding check, diff check, and production build.
- Repair runner v0.1.294a stopped before writing because its expected SHA-256 baseline for components/SkyPulseDateCard.tsx did not match the live file. Prevention: derive repair baselines from exact uploaded live source and stop on any stale hash.
- Repair runner v0.1.294b failed during PowerShell parsing because interpolated variables were followed directly by a colon. Prevention: use format strings or delimited variable references and syntax-check PowerShell runners before delivery.
- Finalization runners v1 and v2 produced false failures by comparing full authority documents through PowerShell-sensitive line-ending and encoding paths. Prevention: do not perform whole-file Persian document comparisons through PowerShell text capture.
- Finalization runner v3 failed before cleanup because a multiline JavaScript program passed through node -e lost required quoting in native PowerShell argument handling. Prevention: pass JavaScript through stdin or a verified temporary script rather than nested node -e quoting.
- All failed runners stopped before product rewrites or cleanup. Temporary artifacts were manually backed up to the system Temp directory and removed from the repository working tree.
- Manual recovery then passed the homepage redesign guard, site-chrome guard, product-surface guard, encoding check, git diff check, and full production build.
- Workflow prevention: after two failures in one batch, stop generating repair runners, reduce scope to diagnosis, use short targeted diffs, and prefer visible manual cleanup over layered finalization runners.
- Downloadable Halleus execution artifacts must be supplied as a ZIP whose root contains only one uniquely named PowerShell runner.

## v0.1.295 homepage Sky Pulse compact-copy scope
Baseline before apply:
- HEAD: `7035ff066519199c4a0eb3c6f750cccffbd7936b`
- Tag: `v0.1.294-homepage-app-shell-redesign`
- Branch: `main`
- Working tree: clean in the latest live terminal output

Scope:
- Reduce the visible height and copy density of `components/SkyPulseDateCard.tsx` on the homepage.
- Keep real date, moon phase, current moon sign, existing guidance data, one concise mood line, and no more than two deduplicated aspect highlights.
- Remove technical/public-scope badges, duplicated interpretation summary, raw long-form sky mood, repeated inspiration/reflection paragraphs, technical footer copy, Tehran/time metadata row, and the secondary FAQ action from the visible card.
- Simplify only the user-facing aspect labels; do not change Sky Pulse calculation, API response shape, interpretation source, transit math, Tehran launch scope, report transit, SEO/indexing, auth/payment/storage, or public/private consent.

Files:
- `components/SkyPulseDateCard.tsx`
- `scripts/check-homepage-sky-pulse-compact-copy.mjs`
- `docs/HALLEUS_IDEA_GARDEN.md`
- `docs/HALLEUS_PROJECT_CONTEXT.md`

Checks:
- `node scripts/check-homepage-sky-pulse-compact-copy.mjs`
- `node scripts/check-homepage-app-redesign.mjs`
- `pnpm run check:site-chrome-minimal-ui`
- `pnpm run check:product-surface`
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `pnpm build`

## v0.1.296 homepage hero and lower-page polish scope
Baseline before apply:
- HEAD: `a0c786d038e30ce092c45df8eb478a644a7be6c0`
- Tag: `v0.1.295-homepage-sky-pulse-compact-copy`
- Branch: `main`
- Working tree: clean in the latest live terminal output

Scope:
- Replace and resize the homepage hero headline, keeping it to two explicit desktop lines.
- Force the dark primary CTA text and arrow to white across normal, visited, hover, and focus states.
- Reduce homepage-only spacing beneath the fixed header and compact the hero without changing the shared App Shell.
- Remove the homepage “دقت و اعتماد” section and its local data array.
- Remove only the duplicate dark primary CTA from the lower final section; retain the section and the reports link.
- Replace the shared report-style disclaimer usage on the homepage with a homepage-specific reflection note.
- Do not change report/chart engines, Sky Pulse, APIs, auth/payment/storage, sitemap/indexing, consent rules, or shared disclaimer behavior on other pages.

Files:
- `app/page.tsx`
- `app/home.module.css`
- `scripts/check-homepage-hero-lower-polish.mjs`
- `docs/HALLEUS_IDEA_GARDEN.md`
- `docs/HALLEUS_PROJECT_CONTEXT.md`

Checks:
- `node scripts/check-homepage-hero-lower-polish.mjs`
- `node scripts/check-homepage-app-redesign.mjs`
- `pnpm run check:site-chrome-minimal-ui`
- `pnpm run check:product-surface`
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `pnpm build`

## Failure ledger — v0.1.297 baseline chart guard repair

- Baseline audit on clean HEAD `269e2aa0dcd9ce6ae6d59d9a59f5e58f01e827be` proved that two chart guards were already failing before the `/chart` redesign batch wrote product files.
- `check-chart-final-submit-flow.mjs` required the retired fallback copy `ذخیره آنلاین موقتاً پاسخ نداد`, while the committed chart form already used the account/noindex fallback copy.
- `check-jalali-birth-date-input.mjs` required a direct `birthDate: parsedBirthDate.gregorianIso` assignment and incorrectly forbade the single `type="date"` input used by the explicit Gregorian mode.
- Fix: align the final-submit guard with the live fallback copy and make the birth-date guard verify the actual Jalali-to-ISO normalization, normalized-form assignment, and separate Gregorian branch.
- Prevention: run every check intended for a batch once on the clean baseline before the first write; treat a pre-existing red guard as a separate repair batch rather than attributing it to new product code.

## Failure ledger — v0.1.298 public chart shell guard alignment

- Pre-write inspection for the first small `/chart` visual-shell batch found that `check-public-chart-shell-restored.mjs` was red on clean HEAD `cfcce2a73bc0983dfbea02bd7adb6d91319c3429`.
- The committed route metadata already used `ساخت گزارش تولد | Halleus`, while the guard still required the retired marker `ساخت چارت تولد | Halleus`.
- Fix: align only the guard marker with the committed route metadata; no route, form, auth, storage, engine, API, or visual product file changes in this repair.
- Prevention: execute every chart check selected for a product batch on the clean baseline before the first product write.

## v0.1.299 chart page visual shell — phase one

Scope:
- Add `app/chart/layout.tsx` and `app/chart/chart-shell.module.css` for a chart-specific, homepage-aligned route shell.
- Add `scripts/check-chart-page-visual-shell.mjs` to guard the phase-one boundary.
- Keep `app/chart/page.tsx`, `components/ChartForm.tsx`, account/auth behavior, city logic, submit flow, toast behavior, storage, API, and report engine unchanged.

Checks:
- chart visual-shell guard
- existing public chart, product polish, real-engine bridge, final-submit, and Jalali guards
- encoding
- `git --no-pager diff --check`
- `pnpm build`

## v0.1.300 chart account compaction — phase two

Scope:
- Move the chart-only account surface from above the birth-data form to below the closed form.
- Add an optional `compact` presentation mode to `SupabaseAuthPanel`; the default presentation remains unchanged for other routes.
- Guest chart users see one save-permanence note and a closed login/signup disclosure.
- Signed-in chart users see only `سلام، نام کاربر`.
- Add isolated chart-shell CSS and a focused AST-aware guard.

Failure ledger:
- The first account-compaction runner stopped before writes because a historical username/password guard was already red on clean HEAD.
- The attempted guard-repair runner then exposed another historical account-copy guard that was already red.
- The second account-compaction runner stopped before writes because its probe guessed `client.auth.onAuthStateChange`; exact source inspection showed the live listener is `authClient.auth.onAuthStateChange`.
- A read-only audit confirmed multiple historical account/dashboard/homepage guards depend on retired presentation copy or unrelated older surfaces.
- Fix and prevention: inspect the exact committed source, patch the live TSX structure through the TypeScript AST, validate exact current auth behavior markers, and keep broad historical-guard repair outside this scoped product batch.

Boundaries:
- No auth/session method, identity normalization, Supabase credential, storage, account API, report-save, city, submit, redirect, toast, engine, payment, indexing, schema, or consent change.

Checks:
- exact live-source behavior probe
- focused chart account-compaction guard
- public chart shell, chart visual shell, chart product polish, real-engine bridge, final-submit, and Jalali guards
- encoding
- `git --no-pager diff --check`
- `pnpm build`

## v0.1.301 chart city pair UX

Scope:
- Move the existing current-residence field and suggestion list into the live `chart-form-fields` grid beside birth city.
- Keep both city cards equal-width on desktop and stacked on mobile.
- Update the current-residence hint to explicitly mention daily transit calculation.
- Add selected-state styling and `aria-pressed` to both city suggestion lists.

Boundaries:
- No city source, search algorithm, city validation, coordinates, timezone, normalized report input, API payload, account UI, submit, redirect, toast, report engine, storage, payment, indexing, schema, or consent change.

Checks:
- exact live-source city probe
- focused AST-aware chart city UX guard
- current-residence personal-transit bridge
- existing account-compaction, chart shell, product, final-submit, real-engine bridge, and Jalali guards
- encoding
- `git --no-pager diff --check`
- `pnpm build`


## v0.1.302 VPS release workflow foundation

Scope:
- Add a versioned VPS release/rollback workflow under `ops/vps`.
- Add a systemd template that runs only from `/srv/halleus/current`.
- Require exact commit/tag verification and a clean VPS source clone.
- Build each release in a detached worktree under `/srv/halleus/releases`.
- Run locked dependency install, encoding, diff, and production-build checks before activation.
- Use atomic `current` / `previous` symlinks and automatic rollback after failed restart or smoke tests.
- Update deployment/recovery documentation and add a focused regression guard.

Live infrastructure facts established before this batch:
- DNS, TLS, Nginx, systemd, Certbot renewal dry-run, controlled restarts, reboot recovery, auto-start, routes, ACME, resources, and post-reboot journal state passed on the VPS.
- Nginx evidence hardening rejects encoded backslash probes, dotfile probes, and the observed fake Next-Action IDs while preserving the real chart API validation path.
- The active runtime still uses `/srv/halleus/source`; no release/current/previous layout has been bootstrapped yet.
- The legacy source build must remain available as a recovery path during the later bootstrap.
- release builds must be created outside the active runtime directory.

Boundaries:
- This batch does not change the live VPS, systemd, Nginx, DNS, SSL, firewall, environment values, SSH keys, product code, report engine, auth, payment, consent, public-report indexing, or Search Console state.
- The versioned workflow must not be used until a separate controlled bootstrap batch has installed the release layout and service unit.

Checks:
- focused VPS release workflow guard
- encoding
- `git --no-pager diff --check`
- `pnpm build`

Failure ledger:
- The runner used BatchMode=yes with a passphrase-protected private key that was not preloaded into ssh-agent. SSH could not prompt for the key passphrase, so authentication failed before the remote script started.
- Prevention: interactive SSH for the current protected key, `IdentitiesOnly=yes`, `-tt` for interactive sudo, and no secret persistence.

- The first v0.1.302 apply runner treated the Windows/WSL bash.exe launcher as a usable Bash installation because `Get-Command bash.exe` succeeded. The launcher then failed with `execvpe(/bin/bash) failed: No such file or directory`; the batch restored all local project changes and did not reach the VPS.
- Fix and prevention: Only explicit Git Bash paths are accepted and probed before local bash -n. If Git Bash is unavailable, the optional local syntax check is skipped, while `/bin/bash -n` remains mandatory on Ubuntu before live bootstrap.


## v0.1.303 VPS Nginx final cleanup and operations closure

Verified live state entering this batch:

- local HEAD/tag: `75fcdefaaa9abcf85e0110077c8d6a7709bd4b52` / `v0.1.302-vps-release-workflow-foundation`;
- live `current` points to the exact v0.1.302 release and `previous` points to preserved `/srv/halleus/source`;
- deploy, real rollback, re-activation, reboot, auto-start, ACME, routes, resources, and journals passed;
- active Nginx pre-cleanup hash was `6c850bfb824237174acd5eb4f709c3b578fffb905f052ed2c9df77ebf033efff`;
- the Ubuntu package default site was still enabled, unknown HTTP hosts received the default page, unknown HTTPS hosts reached Halleus, and temporary diagnostic headers remained public.

v0.1.303 scope:

- add explicit HTTP/HTTPS default-server catch-all handling for unknown hosts;
- disable only the exact package default-site symlink;
- remove `X-Halleus-Proxy` and hide upstream `X-Powered-By`;
- preserve named Halleus hosts, HTTPS, ACME, scanner hardening, release layout, systemd, env values, SSH, DNS, SSL files, UFW, and product code;
- create a root-only operations backup and closure audit under `/var/backups/halleus/v0.1.303a`;
- update deployment and recovery documentation after public and local smoke tests pass.

Checks:

- Nginx candidate hash and `nginx -t`;
- unknown-host HTTP/HTTPS return 421;
- apex, `www`, redirects, Wiki, Chart, robots, sitemap, Sky Pulse, chart validation, ACME, SSL, services, ports, UFW, logrotate, journal, release links, and response-header cleanup;
- `pnpm run check:vps-release-workflow`;
- `pnpm run check:encoding`;
- `git --no-pager diff --check`;
- `pnpm build`.

Remaining human confirmations before declaring the entire VPS work fully closed:

- provider-level snapshot confirmed in the hosting panel;
- external uptime monitoring confirmed for `https://halleus.ir/` and a stable API endpoint.

Do not claim those two external controls are complete without direct evidence. Search Console/indexing and Cloudflare Proxy remain blocked until the VPS closure commit is pushed and these external confirmations are recorded.

- The first v0.1.303 Nginx cleanup attempt exposed a graceful-reload readiness race: `systemctl reload nginx.service` succeeded, but the immediate unknown-host request was still served by an old worker and returned HTTP 200. The EXIT trap restored the exact Nginx hash and default-site symlink; release health remained intact. v0.1.303a keeps the same candidate and adds bounded HTTP/HTTPS readiness polling with fresh connections after apply and rollback.

## v0.1.304f Wiki-first SEO core

Baseline:

- HEAD: `6ed336608eb8ef3cc19cb955315a5c3f3b1f3710`.
- Tag: `v0.1.303-vps-nginx-ops-closure`.
- Tracked working tree was clean; only failed v0.1.304 runner artifacts were untracked.
- The uploaded `git archive` snapshot was normalized to LF for patch construction, and `lib/config/seo.ts` then reproduced the exact live HEAD blob `4fc6889280dfb27b92a3a4d317778a6f010d604d`.

Scope:

- Remove the root-level `/` canonical so child routes do not inherit the homepage canonical; keep the homepage self-canonical.
- Change `/wiki` and valid `/wiki/*` articles to `index/follow`; preserve missing-article `noindex/nofollow`.
- Replace `/reports` with `/wiki` in the public route matrix.
- Generate all current Wiki article URLs from `wikiArticles` in `sitemap.xml`.
- Add report-family and reports-index `noindex/nofollow` metadata.
- Align the historical Wiki guard, add a focused SEO guard, and wire it into `check:project`.
- Keep all report indexing deferred.

Failure ledger and prevention:

- v0.1.304a failed during PowerShell parsing because a variable interpolation was followed directly by a colon.
- v0.1.304b used a regex mutation that did not match the exact live `/reports` entry.
- v0.1.304c read `$LASTEXITCODE` after a PowerShell pipeline changed the successful Git exit code.
- v0.1.304d used a full-file baseline comparison that failed despite equivalent live Git content.
- v0.1.304e generated trailing whitespace in the historical Wiki guard; `git --no-pager diff --check` caught it and rollback restored all targets.
- Patch-first workflow: v0.1.304f contains one prebuilt unified Git patch. The runner performs `git apply --check` before the first project write and then applies the exact patch without regex, runtime code generation, full-file comparison, or line-by-line mutation.
- Prevention: build the patch from the exact tracked snapshot; the guarded runner must run syntax and focused guards, encoding, `git --no-pager diff --check`, and a production build, and must reverse the patch if any check fails.

Still open after this batch:

- explicit noindex layouts for non-report internal/account route families;
- commit/tag/push;
- controlled VPS deploy;
- live canonical, robots, and sitemap verification;
- Search Console verification and sitemap submission.
## v0.1.305 Internal-route noindex boundary

Baseline:

- HEAD: `aaf081cb16a3d80b1a7793faf46377d96b23cd48`.
- Tag: `v0.1.304-wiki-first-seo-indexability`.
- Working tree was clean before this batch.

Scope:

- Add explicit `noindex/nofollow` layouts for `/admin`, `/dashboard`, `/profile`, `/roadmap`, `/engine/*`, `/quality/*`, `/interpretation`, and `/language`.
- Keep all internal route families outside `seoRoutes` and sitemap generation.
- Add a focused executable guard and wire it into `check:project`.
- Record the indexing decision in the Idea Garden.

Boundaries:

- No route deletion, navigation change, authentication change, report-engine change, Wiki content change, VPS change, deploy, or Search Console action.
- This metadata boundary does not make the routes private; it only tells compliant search engines not to index or follow them.

Checks:

- `pnpm run check:internal-route-noindex-boundary`
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `pnpm build`

Next after commit/tag/push:

- controlled VPS deploy;
- live verification of canonical, robots metadata, sitemap, Wiki pages, reports, and internal routes;
- Search Console verification and sitemap submission only after live checks pass.

## v0.1.306 Privacy-conscious analytics foundation

Baseline:

- HEAD: `d65b3c9a0835b60bf7965f6960cde7aaf5d5a8b9`.
- Tag: `v0.1.305-internal-route-noindex-boundary`.
- Working tree was clean before this batch.
- Search Console domain ownership and priority crawl requests were completed; GA4 Measurement ID `G-W3WBZCTL7G` was created by the user.

Scope:

- Add a consent-first GA4 client integration and shared consent UI.
- Keep the Google tag absent until the visitor explicitly grants analytics consent.
- Store only the consent choice and version in local storage.
- Have Halleus application code emit sanitized page views on public routes only, without query strings or hashes.
- Exclude reports, report details, account routes, and internal routes from analytics.
- Disable Google Signals and ad-personalization signals.
- Require GA4 Enhanced Measurement to be disabled in the external Web Data Stream before production verification; GA4 standard automatic session/engagement behavior remains platform-controlled and is not represented as a Halleus custom event.
- Support later refusal or withdrawal by disabling analytics and deleting accessible `_ga*` cookies.
- Add an analytics preference control to the shared footer and Privacy page.
- Update Privacy copy, add a focused executable guard, and wire it into `check:project`.

Boundaries:

- No birth data, report content, name, mobile, email, account ID, report ID, custom conversion event, advertising, remarketing, Google Ads, GTM, database, auth, report-engine, SEO-indexability, VPS, Nginx, or Search Console change.
- The UI must not overclaim that GA4 receives only page paths: standard browser/device and automatically collected analytics signals can still be processed after consent.
- The public GA4 Measurement ID is committed as product configuration and is not treated as a secret.

Checks:

- `pnpm run check:privacy-conscious-analytics`
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `pnpm build`

Next after commit/tag/push:

- disable Enhanced Measurement in the GA4 Web Data Stream;
- controlled VPS deploy;
- verify that no Google tag request occurs before consent;
- grant consent and verify one sanitized public page view in GA4 Realtime;
- verify report/internal routes do not emit page views;
- connect GA4 to the verified Search Console property after live verification.

## v0.1.306a Analytics transport hotfix

Live failure:

- v0.1.306 deployed successfully and the consent UI correctly kept the Google tag absent before consent.
- After consent, `gtag.js` loaded with HTTP 200, `ga-disable-G-W3WBZCTL7G` was false, and the expected consent/config/page_view commands appeared in `dataLayer`.
- No `g/collect` request appeared in DevTools Network and GA4 Realtime remained at zero.
- The initial verification incorrectly treated a queued `dataLayer` command as proof of network transmission.

Root cause and fix:

- The local wrapper pushed a rest-parameter array with `dataLayer.push(args)`.
- The official gtag.js bootstrap contract uses `dataLayer.push(arguments)`.
- Replace only the wrapper transport shape and strengthen the focused guard so the array form cannot return.
- Preserve consent-first loading, sanitized public-only page views, blocked report/internal routes, disabled advertising signals, and the existing Measurement ID.

Workflow failure:

- The first v0.1.306a runner contained incorrect unified-diff hunk counts and failed during `git apply --check` before any project write.
- Rollback verification confirmed that tracked files remained clean; only the failed runner artifact stayed untracked.
- Prevention: generate the corrected patch from before/after files and validate parse, apply, reverse, and clean restoration before packaging.

Required checks:

- `pnpm run check:privacy-conscious-analytics`
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `pnpm build`

## v0.1.307 Default public analytics

Baseline:

- HEAD: `5cd6454526b335b357f189523828dae17c2588d2`.
- Tag: `v0.1.306a-analytics-transport-fix`.
- Working tree was clean before this batch except for the explicitly created live-context ZIP.
- The v0.1.306a live release passed `g/collect`, GA4 Realtime, public-route page views, and the report/internal-route exclusion check.
- The user observed that Halleus now appears in Google and estimated that about five pages are visible; this is an early search observation, not a verified Search Console coverage count.

Decision:

- Supersede the v0.1.306 first-visit opt-in gate for the current Iran-focused audience.
- On approved public routes, no stored preference means analytics is enabled by default.
- Remove the first-visit consent banner while keeping the shared settings panel and explicit opt-out.
- Preserve an existing stored `denied` preference instead of silently resetting it.
- Keep reports, report details, accounts, and internal routes outside Analytics.
- Keep ad storage, ad user data, ad personalization, Google Signals, remarketing, Google Ads, GTM, and Enhanced Measurement disabled.
- Keep birth data, report content, names, mobile numbers, email addresses, account IDs, and report IDs outside analytics payloads.
- Reassess regional consent/CMP requirements before any active expansion beyond the current Iran-focused market.

Scope:

- Default the current analytics choice to `granted` only when no valid stored preference exists.
- Convert the former first-visit banner into a settings-only panel with enable/disable controls.
- Update Privacy copy, the focused analytics guard, Idea Garden, and this context record.
- Record the user-reported initial Google visibility without treating it as verified coverage.

Boundaries:

- No analytics path expansion, custom events, conversion events, query/hash tracking, report tracking, advertising integration, SEO metadata change, sitemap change, Search Console action, VPS change, Nginx change, auth change, database change, or report-engine change.
- This batch does not promise 100% visitor coverage because browser protections, blockers, and disabled JavaScript remain outside Halleus control.
- The explicit-consent rule for making a user report public/indexable remains unchanged.

Workflow failure and prevention:

- The first v0.1.307 runner stopped before repository writes because it guessed an outdated Idea Garden tail instead of using the exact live file.
- That artifact was also delivered as a loose `.ps1` rather than the required ZIP containing one uniquely named runner.
- The v0.1.307a patch was built from CRLF worktree context while preflight used `git apply --index`; live raw hashes matched, but LF-normalized Git index blobs rejected every hunk before repository writes.
- The v0.1.307b EOL-safe patch applied, but the focused guard incorrectly required the Persian marker `حدود پنج صفحه` while the new context note used the English wording `about five pages`; the runner restored all tracked files.
- Tracked files remained clean after every failure; only known runner and diagnostic artifacts were untracked.
- Prevention: normalize patch inputs to LF, validate against a simulated Windows checkout with CRLF worktree and LF index, run the actual focused guard against the complete intended after-state before packaging, and never guard incidental documentation wording that is unrelated to product behavior.

Required checks:

- `pnpm run check:privacy-conscious-analytics`
- `pnpm run check:encoding`
- `git --no-pager diff --check`
- `pnpm build`

## v0.1.308 public content crawlability loading boundary scope
- Scope is limited to removing root app/loading.tsx, adding a focused public-content crawlability guard, and recording the product boundary.
- The guard protects server-rendered H1/content contracts, real Wiki href contracts, static Wiki article generation, and the existing report-submit loading state.
- The apply batch must run the source guard, existing Wiki SEO guard, report-flow guard, encoding, diff check, production build, and built-HTML smoke for /, /wiki, and one real article.
- Do not change report engine, auth, schema, storage, analytics, sitemap, metadata, report visibility, or the public/private consent model in this batch.

## v0.1.323 report birth-chart wheel adapter scope

- The live report detail uses `@astrodraw/astrochart` 3.0.2 as a client-only SVG renderer through a typed adapter over the stored `realEngine` snapshot.
- The adapter copies the ten major planetary longitudes, twelve stored house cusp longitudes, and existing report aspects; it performs no astronomical or aspect calculation. AstroChart receives existing Halleus aspects only through its custom-aspect drawing input.
- The report wheel excludes technical special points by a fixed ten-planet allowlist and has Persian partial/unavailable states for old or incomplete reports.
- Report detail renders the wheel once in a featured card directly after the report summary, while the Persian reading remains the primary content sequence and technical tables remain available below.
- The exact MIT renderer dependency and lockfile entry are the only dependency changes. No engine, report writer, transit, Sky Pulse, SEO, privacy, storage, or deployment change belongs in this batch.
