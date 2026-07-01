# Halleus Project Context

Last updated: 2026-06-30

This file is the handoff source of truth for continuing the Halleus project in future ChatGPT sessions. It must track product vision, technical workflow, and release/deployment state. Do not treat local progress, GitHub progress, Render deployment, and the public site as the same thing.

## 1. Current authority rules

Current local repository identity:

```text
repo: C:\Projects\astro-clean
branch: main
package manager: pnpm
brand: Halleus
domain identity: Halleus.ir
```

Latest verified local/GitHub state from the latest user-provided terminal output before this v0.1.85 docs update:

```text
Local HEAD: 159986a / v0.1.84-technical-seo-baseline
GitHub origin/main: 159986a / v0.1.84-technical-seo-baseline
Latest pushed tag: v0.1.84-technical-seo-baseline
Previous pushed tag: v0.1.83-homepage-product-polish
Latest product-code milestone: 159986a / v0.1.84-technical-seo-baseline
Branch relation: main is synced with origin/main
Checks before v0.1.84 commit: check:encoding, git diff --check, and pnpm build passed
Working tree after v0.1.84 push: clean; git status --short returned no output
Public/live state: not re-verified after v0.1.84; Render/public domain verification remains open
Render state: exact Render dashboard commit is still not recorded
```

If this file is later updated by a docs-only commit, the exact new commit hash must be taken from live git output after commit/push. Live git output always beats this recorded paragraph.

Important rule:

```text
Local commit/tag state, GitHub push state, Render deploy state, and public/live production state must be tracked separately.
```

A local commit is not live. A GitHub push is not a Render deploy. `Halleus.ir` is the domain identity, not proof that the latest version is deployed.

Authority order for every future Halleus response:

```text
1. Current user-provided terminal output from the active conversation
2. Current uploaded live files from C:\Projects\astro-clean
3. docs/HALLEUS_PROJECT_CONTEXT.md
4. Saved project memory / previous chat summaries
5. General model memory
```

Never reverse this order. If the context file says one commit but current git output says another, current git output wins.

### Mandatory Safety Gate before every coding batch

Before generating any code, patch, runner, downloadable artifact, or terminal command that changes files, the assistant must provide a Safety Gate with:

```text
Current known HEAD:
Current known latest tag:
Files inspected live:
Files allowed to change:
Files explicitly forbidden:
Apply method:
Checks to run:
Commit/tag/push plan:
Rollback/restore plan:
Relevant failure-ledger risks for this batch:
```

If any field cannot be filled from current evidence, stop and ask for the missing live file, git output, or route/component context. Do not guess.

Always-on rule:

```text
Treat "Safety Gate first." as an implicit standing instruction for every Halleus coding/project batch, even when the user does not repeat it.
If the assistant is about to provide code, a runner, a downloadable artifact, or terminal commands that modify files, the response must start with the Safety Gate.
If the Safety Gate cannot be filled from current live evidence, the assistant must ask for the missing git output or files instead of proceeding.
If the assistant skips the Safety Gate, the correct user response is simply: Safety Gate first.
```

This rule exists because the user should not have to remember and re-state the safety protocol every time.

### Executable workflow rules

```text
No stale-context coding.
No code changes from remembered structure.
No large inline scripts in chat.
No root-level payload/source-like folders before build.
No generated JS template literals containing project text/backticks/${...}.
No regex replacement across multiline JSX attributes or JSX text.
No automatic commit/tag/push in apply scripts.
No plain git diff inside scripts; use git --no-pager diff or write a diff file.
After two sequential runner/apply failures, stop. Diagnose, reduce scope, and request exact live files before any new attempt.
```

## 2. Product origin

Halleus started as a Persian-first birth chart and birth-report product for non-technical Persian-speaking users.

The original need was to avoid generic horoscope, fortune-telling, copied astrology text, and raw technical chart tables. The product should let a user enter birth information and receive a personal, readable, calm, Persian report that feels written for them.

The ideal user is:

```text
Persian-speaking
non-technical
interested in astrology, self-discovery, personality, relationships, and life patterns
likely mobile-first
wants a soft, clear, human report instead of generic daily horoscope content
```

The intended user journey is:

```text
landing/product entry
→ /chart
→ Jalali birth date + time + birth city
→ report generation
→ saved report detail
→ report history
→ optional fuller report order
```

Halleus must not feel like:

```text
daily horoscope
fortune telling
deterministic prediction
debug/lab interface
generic astrology blog
medical/legal/financial advice
```

Halleus should feel like:

```text
Persian-first
minimal
private
calm
premium-light
reflective
trustworthy
self-discovery oriented
product-grade
```

## 3. Final product vision

Halleus is intended to become a Persian personalized astrology/self-discovery platform centered on birth reports.

The final product is a combination of:

```text
personalized Persian birth report generation
saved report detail and history
manual or paid fuller-report ordering
future account/dashboard/history
future admin/operations for orders
future backend/payment/database
future richer chart engine and interpretation layer
```

The primary output is a Persian birth report that is readable, human, non-deterministic, saved, and worth revisiting.

The paid value is not generic text. The user pays for:

```text
a fuller report
deeper interpretation
better writing
more coherent structure
personalization based on the saved report
possibly export/account/history features later
```

## 4. Product ideas added during development

These ideas became part of the product direction during the project:

```text
Jalali date picker for Persian users
Iran-first birth city flow / city data where available
internal Gregorian ISO birthDate storage
internal birthCountry: "ایران" while hiding country from UI
real engine snapshot / real chart direction
real-engine-native report writing direction
manual order path for a fuller report
report history/detail as part of the core flow
dashboard/admin/operations as future product areas
local/GitHub/Render/live state tracking as required release discipline
```

## 5. MVP definition

A launchable MVP should include:

```text
clear landing or product entry
/chart with Jalali birth-date UX
birth time and birth city flow
internal BirthInput.birthDate stored as Gregorian ISO YYYY-MM-DD
internal birthCountry: "ایران" preserved while country UI stays hidden
working chart/report generation
saved report detail
report history or access to saved reports
manual path to order a fuller report
pricing/product explanation
basic privacy/data explanation
clean Persian UI without mojibake
minimal but reliable header/footer navigation
GitHub pushed state
Render deployed state
public URL verified
domain status documented
```

Not required for first MVP launch:

```text
real online payment
full auth/account system
production database
complete admin order management
email notifications
PDF/export
advanced SEO/content library
complete professional astrology layers
```

## 6. Completed local milestones

### v0.1.68-manual-order-request-shell

Completed earlier.

Product meaning:

```text
Created /order and ManualOrderRequestForm.
Manual order text can be prepared/copied.
No real backend or payment.
```

### v0.1.69-order-entry-links

Completed earlier.

Product meaning:

```text
Made /order discoverable from sales/product/pricing surfaces.
```

### v0.1.70-jalali-birth-date-input

Completed earlier.

Product meaning:

```text
/chart accepted Jalali/Persian birth date input.
Internal BirthInput.birthDate stayed Gregorian ISO YYYY-MM-DD.
```

### v0.1.71-report-order-context

Completed earlier.

Product meaning:

```text
Report detail/order context started linking the report experience to the manual order path.
```

### v0.1.72-sales-copy-polish

Completed earlier.

Product meaning:

```text
Sales copy was polished.
```

### v0.1.73-chart-date-picker-country-cleanup

Completed locally and later pushed state must be checked separately.

Product meaning:

```text
Jalali birth date moved from text input to simple year/month/day picker.
Country field was removed from chart UI.
Internal birthCountry: "ایران" was preserved.
BirthInput.birthDate remains Gregorian ISO YYYY-MM-DD.
Targeted checks and build passed.
```

### v0.1.74-chart-page-minimal-product-polish

Completed locally and is the current GitHub origin/main according to latest git output.

Product meaning:

```text
/chart became more minimal and product-like.
ChartForm and surrounding copy/layout were polished.
Report creation, saving, and report detail flow were preserved.
Targeted checks and build passed.
```

### v0.1.75-site-chrome-minimal-ui-cleanup

Completed locally according to latest git output:

```text
0c8bfd7 / v0.1.75-site-chrome-minimal-ui-cleanup
```

Product meaning:

```text
Site chrome/header/footer was made more minimal.
```

Feedback/problem:

```text
Important previous routes became harder to access from the UI.
The brand appeared incorrectly as HHalleus instead of Halleus.
```

Therefore, v0.1.75 is a completed local milestone but not a final UI direction by itself. It required a navigation/brand fix.

### v0.1.76-site-chrome-navigation-fix

Completed locally according to latest git output:

```text
a0deb31 / v0.1.76-site-chrome-navigation-fix
```

Product meaning:

```text
Fixed the site chrome/navigation feedback from v0.1.75.
Restored access to important routes in footer/navigation.
Corrected the visible brand direction back to Halleus.
Updated context-related notes.
```

Release update:

```text
v0.1.75 and v0.1.76 are no longer local-only. Both tags were verified on origin after the later push.
```

### v0.1.77-project-context-product-deployment-state

Completed locally and pushed to GitHub according to latest verification:

```text
e8418ee / v0.1.77-project-context-product-deployment-state
```

Product meaning:

```text
Updated docs/HALLEUS_PROJECT_CONTEXT.md so product vision, MVP definition, local/GitHub/Render/public release state, progress model, deployment rules, and workflow rules are tracked as one source of truth.
```

Release meaning:

```text
Local main and origin/main were later verified at e8418ee.
Tag v0.1.77-project-context-product-deployment-state was verified on origin.
The public site was reported by the user as showing the latest changes.
```

### v0.1.78-release-state-public-verification

Completed by the context update that carries this section.

Product meaning:

```text
No product UI or app logic changed.
The context was updated to record that GitHub is verified through v0.1.77 and the public site visually showed the latest changes.
Exact Render dashboard commit is still not recorded unless separately verified.
```


### v0.1.79-report-detail-copy-cleanup

Completed and pushed:

```text
a848ef6 / v0.1.79-report-detail-copy-cleanup
```

Product meaning:

```text
Cleaned report detail user-facing copy.
Reduced technical/MVP wording on the saved report detail page.
Changed only components/ReportDetail.tsx.
check:encoding and pnpm build passed before commit.
Tag and main were pushed to origin.
```

Important incident note:

```text
Earlier v0.1.79 report-readability attempts failed and were rolled back.
Only a848ef6 / v0.1.79-report-detail-copy-cleanup is the successful v0.1.79 milestone.
```

### v0.1.80-report-detail-product-polish

Completed and pushed:

```text
974864e / v0.1.80-report-detail-product-polish
```

Product meaning:

```text
Made the report detail page feel more like a product page.
Improved hero/reading flow/CTA structure.
Added clearer next-step ordering path.
Moved note and backup/export into more natural product sections.
Changed only components/ReportDetail.tsx.
check:encoding and pnpm build passed before commit.
Tag and main were pushed to origin.
```

### v0.1.81-context-failure-ledger-merge

Completed and pushed:

```text
42ae1a4 / v0.1.81-context-failure-ledger-merge
```

Project/process meaning:

```text
Merged the Halleus failure ledger and batch safety rules into docs/HALLEUS_PROJECT_CONTEXT.md.
Recorded repeated runner, PowerShell, Git, Next/TypeScript, encoding, UI formatting, and workflow failures from the project chats.
Added the mandatory Safety Gate, authority order, stop-after-2-failures rule, and failure-ledger operating rules.
Docs-only change.
check:encoding and git diff --check passed before commit.
Tag and main were pushed to origin.
```

### v0.1.82-safety-gate-always-on-rule

Completed and pushed:

```text
1230637 / v0.1.82-safety-gate-always-on-rule
```

Project/process meaning:

```text
Made Safety Gate first an always-on and implicit Halleus rule.
Recorded that the user does not need to repeat Safety Gate first.
Established no Safety Gate, no code as a standing project rule.
Docs-only change in docs/HALLEUS_PROJECT_CONTEXT.md.
check:encoding and git diff --check passed before commit.
Tag and main were pushed to origin.
```

### v0.1.83-homepage-product-polish

Completed and pushed:

```text
4769fbf / v0.1.83-homepage-product-polish
```

Product meaning:

```text
Polished the homepage toward a more product-facing first impression.
Changed app/page.tsx and scripts/check-sales-copy-polish.mjs.
Removed or reduced visible MVP/test-sales/real-engine feel from the homepage copy.
Clarified the basic product path: create a report, read it, return to it, and request a fuller version.
check:sales-copy-polish, check:encoding, git diff --check, and pnpm build passed before commit.
Tag and main were pushed to origin.
```

Open product note:

```text
User still did not feel the homepage had a fully real product feel after v0.1.83.
The next homepage improvement should add proof/value/sample elements, not only prettier copy.
```

### v0.1.84-technical-seo-baseline

Completed and pushed:

```text
159986a / v0.1.84-technical-seo-baseline
```

SEO/product meaning:

```text
Added the first technical SEO baseline.
Updated public-page metadata/canonical coverage for homepage, chart, product, pricing, order, privacy, and reports pages.
Updated sitemap behavior so public product-focused routes are prioritized and internal/dev routes are not treated as sitemap targets.
Updated lib/config/seo.ts so the fallback site URL is production-oriented instead of localhost.
Changed app/chart/page.tsx, app/layout.tsx, app/order/page.tsx, app/page.tsx, app/pricing/page.tsx, app/privacy/page.tsx, app/product/page.tsx, app/reports/page.tsx, app/sitemap.ts, and lib/config/seo.ts.
check:encoding, git diff --check, and pnpm build passed before commit.
Tag and main were pushed to origin.
```

Still open after v0.1.84:

```text
Verify Render dashboard latest deploy commit.
Verify public domain and custom domain status.
Open /robots.txt and /sitemap.xml on the real public URL.
Verify that public canonical URLs point to the intended domain.
Set up/verify Google Search Console when the public URL/domain is settled.
Submit sitemap after public URL verification.
Decide final noindex/internal-route policy for admin/dashboard/engine/profile/quality/wiki/roadmap routes.
```



## 7. Current product state

Current verified local and GitHub HEAD before this v0.1.85 docs update:

```text
159986a / v0.1.84-technical-seo-baseline
```

Latest product-code milestone:

```text
159986a / v0.1.84-technical-seo-baseline
```

Current release-sync status:

```text
Local main: 159986a
GitHub origin/main: 159986a
Latest pushed tag: v0.1.84-technical-seo-baseline
Previous pushed tag: v0.1.83-homepage-product-polish
Latest product-code tag: v0.1.84-technical-seo-baseline
Public site: not re-verified after v0.1.84; public smoke and SEO URL checks are still needed
Render: likely auto-deploys if connected, but exact Render dashboard commit is not recorded
```

Known working or recently verified locally:

```text
/chart works from previous checks
Jalali date picker works
BirthInput.birthDate remains Gregorian ISO
birthCountry: "ایران" is preserved internally
country UI is removed
chart page has been polished
report generation works locally
report detail works locally
report detail copy cleanup passed build in v0.1.79
report detail product polish passed build in v0.1.80
site chrome was cleaned and navigation/brand feedback was fixed through v0.1.76
GitHub is synced through 159986a / v0.1.84 for technical SEO baseline state
latest product-code milestone is 159986a / v0.1.84
homepage was polished in v0.1.83 but still needs proof/sample/value work to feel like a real product
technical SEO baseline was added in v0.1.84 but public Render/domain/Search Console verification is still open
```

Known or likely from earlier product work, but verify before relying on it for launch claims:

```text
/order route
manual order shell
report-to-order context
pricing/product pages
local saved reports/history
admin route/foundation
```

Known uncertain:

```text
exact Render dashboard latest deploy commit
whether Halleus.ir custom domain is connected to the latest Render deploy
full public smoke-test results after v0.1.84
whether /robots.txt and /sitemap.xml work on the public URL
whether canonical URLs point to the final domain
whether Search Console has been verified and sitemap submitted
whether /order stores, sends, or only displays/copies manual order context
current production data/privacy posture
mobile UI quality
current paid-report value/readability quality
```

## 8. Local vs GitHub vs Render state

Every meaningful batch must record these separately.

### Local state

Latest verified local state:

```text
Local HEAD: 159986a
Local tag at HEAD: v0.1.84-technical-seo-baseline
Latest product-code tag: v0.1.84-technical-seo-baseline
Branch: main
Branch status: synced with origin/main in the latest provided git output
Tracked status: clean after v0.1.84 push; git status --short returned no output
```

### GitHub state

Latest verified GitHub state:

```text
origin/main: 159986a / v0.1.84-technical-seo-baseline
v0.1.79 pushed: yes
v0.1.80 pushed: yes
v0.1.81 pushed: yes
v0.1.82 pushed: yes
v0.1.83 pushed: yes
v0.1.84 pushed: yes
GitHub state: verified through v0.1.84
```

Latest provided push/log output showed:

```text
159986a (HEAD -> main, tag: v0.1.84-technical-seo-baseline, origin/main, origin/HEAD) Add technical SEO baseline
4769fbf (tag: v0.1.83-homepage-product-polish) Polish homepage product experience
1230637 (tag: v0.1.82-safety-gate-always-on-rule) Make Halleus Safety Gate always-on
```

### Render state

Latest known Render state:

```text
Render service name: not recorded in context yet
Connected GitHub repo: not recorded in context yet
Auto-deploy enabled: likely, but not recorded from dashboard
Latest Render deploy commit: not recorded from dashboard
Latest Render deploy status: public site showed latest changes earlier, but dashboard status not recorded
Render public URL: not recorded in context yet
```

Interpretation:

```text
The public site showing earlier changes suggests Render/public deployment can succeed.
However, do not mark exact Render commit as verified until Render dashboard or deployment logs show the commit, ideally 159986a after v0.1.84.
```

### Public/live state

Latest known public/live state:

```text
Public URL: not recorded in context yet
Custom domain: Halleus.ir is identity; connection status still needs exact confirmation if used as the public URL
Halleus.ir connected: unknown until checked explicitly
SSL/domain status: unknown until checked explicitly
Last production QA date: 2026-06-27 user visually confirmed earlier latest changes appeared
Observed deployed version/commit: exact commit not visible from public site
Public smoke after v0.1.84: still open
SEO public URL checks after v0.1.84: still open
```

Required public smoke routes before a launch claim:

```text
/
/chart
/reports
/product
/pricing
/order
/privacy
```

Recommended public smoke flow:

```text
/chart → create a test report → report detail opens → user can reach /order → /reports does not crash
```

Never call a feature live only because it works locally. Never call a GitHub push deployed until Render or public behavior is verified. Never treat Halleus.ir as connected to the latest app until domain and public route QA are verified.

## 9. Deployment rules

Before saying a version is live:

```text
1. Confirm local git status is clean.
2. Confirm intended local commit/tag.
3. Push main to GitHub.
4. Push every relevant release tag.
5. Confirm origin/main matches local HEAD.
6. Confirm release tags exist on origin.
7. Confirm Render is connected to the correct GitHub repo.
8. Confirm Render deployed the intended commit successfully.
9. Open the public Render URL.
10. Smoke test important public routes.
11. Confirm Halleus.ir only if domain/DNS/SSL are verified.
12. Record all results in this context file.
```

Useful commands:

```powershell
git status --short
git log --oneline --decorate -8
git branch -vv
git ls-remote --heads origin main
git ls-remote --tags origin v0.1.75-site-chrome-minimal-ui-cleanup
git ls-remote --tags origin v0.1.76-site-chrome-navigation-fix
```

After this context batch succeeds, expected push plan:

```powershell
git push origin main
git push origin v0.1.75-site-chrome-minimal-ui-cleanup
git push origin v0.1.76-site-chrome-navigation-fix
git push origin v0.1.77-project-context-product-deployment-state
```

If a later audit shows tags already exist remotely, do not force-push unless the user intentionally rewrote the tag.

## 10. Progress model

Progress must be tracked by axis, not one vague percentage. Local progress and public/live progress must stay separate.

Current rough estimates after pushed v0.1.84, before exact Render/public-v0.1.84 verification:

```text
Product vision clarity: 80-85%
Core chart/report flow: 75-85% local / live unknown
Report quality/value: 45-60%
UI/brand maturity: 55-65% local / live unknown
Homepage conversion/product feel: 40-50%; user still wants it to feel more like a real product
Technical SEO baseline: 55-65% local / public verification open
SEO ranking/content readiness: 20-35%
Sales/order flow: 35-50% local / live unknown
Admin/operations: 15-25%
Data/privacy readiness: 35-45%
Deployment/GitHub readiness: GitHub verified through v0.1.84 / Render exact deploy still unknown
Public launch readiness: local 40-55% / live after v0.1.84 still unverified
Business readiness: 25-35%
Engineering reliability: 60-70%
```

Use ranges when confidence is limited. Do not inflate progress because a feature exists locally.

Percentages should only be updated after real milestones:

```text
checks/build pass
commit/tag success
GitHub push verified
Render deploy verified
public smoke test verified
feature moves from demo/shell to product flow
context updated with new state
```

## 11. Roadmap priorities

Recommended near-term order after v0.1.84:

### 1. Create Halleus Idea Garden doc

Goal:

```text
Create docs/HALLEUS_IDEA_GARDEN.md as a seed bank for product ideas gathered from Halleus project chats.
Track which ideas are untouched, touched, shipped, deferred, or risky.
```

Initial seeds must include:

```text
Core birth report
Jalali-first Persian UX
Saved reports/history
Report Detail as Product Moment
Fuller report manual order
Pricing/product/privacy pages
Technical SEO baseline
Render/GitHub/public state tracking
Astrology engine layer
Account/dashboard/admin/payment later platform ideas
Sky Pulse / حال‌وهوای آسمان امروز
```

Sky Pulse definition:

```text
Homepage should eventually show today’s date, Jalali date, leap-year note when relevant, and a compact monthly/weekly/daily astrology weather preview.
It should summarize important transits, their short effects, how to use the energy, what not to do, and point users toward a fuller personal chart report.
Do not hardcode fake real-time transits as factual; start with a date/status card, then design a real transit model.
```

### 2. Render/public SEO verification

Goal:

```text
Confirm that the v0.1.84 technical SEO baseline is actually deployed and visible on the public URL.
Check /robots.txt, /sitemap.xml, canonical URLs, and important public routes on the real domain or Render URL.
```

### 3. Finish public smoke verification

Goal:

```text
Confirm the public site behaves correctly as a user-facing MVP shell.
```

Check these routes:

```text
/
/chart
/reports
/product
/pricing
/order
/privacy
```

Check this core flow:

```text
/chart → create a test report → report detail opens → user can reach /order → /reports does not crash
```

Also check:

```text
Brand is Halleus, not HHalleus.
Important routes are discoverable.
No dev/MVP/debug wording is visible to normal users.
Mobile layout is usable.
```

### 4. Record exact Render deployment details when available

Goal:

```text
Record Render service name, latest deploy status, latest deployed commit, public URL, and custom domain status.
```

Do not change product code in this batch unless the public smoke test reveals a specific product bug.

### 5. Report value/readability polish

Goal:

```text
Make report output feel more valuable, readable, and paid-product-worthy.
Reduce debug/demo feel.
Improve structure and copy.
Make the value of a fuller report clearer.
```

Avoid changing chart input, site chrome, or deployment docs in the same batch.

### 6. Manual order capture/admin readiness

Goal:

```text
Move manual order from copy-only or shell toward a process-ready request flow.
Keep payment/backend optional for now.
Clarify where a request goes and how it can be reviewed.
```

Avoid mixing this with report quality or chrome redesign.

### 7. Pricing/product trust polish

Goal:

```text
Clarify what the free/base report gives, what the fuller report adds, why it is worth ordering, and how the manual process works.
```

### 8. Privacy/data clarity

Goal:

```text
Make production-facing data behavior understandable: what is stored, where it is stored, what is local/browser-based, and what the user should expect.
```

## 12. UI and brand rules

Brand:

```text
Halleus
```

Domain identity:

```text
Halleus.ir
```

Domain identity does not mean domain is connected or live.

Preferred UI feel:

```text
minimal
Persian-first
calm
private
premium but simple
human
trustworthy
self-discovery oriented
not generic horoscope
not dev/demo
```

Avoid public UI wording like:

```text
Paid MVP Shell
Manual order MVP
Product Map
Payment Readiness
Stage
Provider
Payments blocked
Preview
mock
debug
pipeline
driver
engine internals
```

Avoid claims that are:

```text
deterministic
medical
legal
financial
scientific certainty
fortune-telling
```

Header/footer rules:

```text
Keep them minimal.
Keep important product routes discoverable.
Do not expose admin as primary public navigation.
Do not remove route discoverability in the name of minimalism.
Do not change route paths because of Halleus.ir.
```

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

## 13. Runner and workflow rules

The user prefers product-oriented batches, but runners must be reliable and single-purpose.

Execution format:

```powershell
powershell -ExecutionPolicy Bypass -File .\runner-name.ps1
```

Runner rules:

```text
Run from repo root only.
PowerShell should orchestrate only.
Complex patch logic should live in a small .cjs helper.
Avoid embedded Persian in PowerShell.
If Persian must be in .ps1, the file must be UTF-8 with BOM.
Avoid raw SHA guards as the main guard on Windows because CRLF/LF can create false failures.
Use branch/baseline/clean-tree/semantic guards instead.
Avoid marker-heavy patches.
Avoid large expected text blocks.
Avoid complex JS template literals with project text, backticks, or ${...}.
Before building a runner, extract/upload only needed files.
Allow the runner’s own known untracked files only.
Fail on unexpected dirty tracked files.
Use -LiteralPath for paths with brackets, such as app/reports/[reportId]/page.tsx.
Use JSON parsing for package.json.
Run targeted checks.
Run check:encoding when Persian text changes.
Run pnpm build when TypeScript/UI risk exists.
Do not run unrelated legacy checks for focused batches.
Do not run full check:project on every small batch unless it is a milestone/predeploy checkpoint.
```

Failure rules:

```text
Fail fast.
If failure happens before commit, restore touched tracked files.
Remove new files created by the runner.
Do not commit.
Do not tag.
Do not push.
After successful commit/tag, do not rollback automatically.
```

Known runner incident lessons:

```text
Direct .ps1 execution can fail because scripts are not signed.
Use powershell -ExecutionPolicy Bypass -File .\runner.ps1.
Do not call .Trim() on possibly null native command output such as git tag --list.
UTF-8 without BOM can corrupt Persian text in Windows PowerShell 5.1.
Avoid embedding Persian in PowerShell; if unavoidable, use UTF-8 with BOM.
Keep UI batches small and avoid mixing chart, sales copy, global CSS, and navigation in one batch.
```

## 14. Open uncertainties

Resolved since the previous context update:

```text
v0.1.79-report-detail-copy-cleanup is committed, tagged, and pushed.
v0.1.80-report-detail-product-polish is committed, tagged, and pushed.
origin/main is 974864e.
Latest pushed tag is v0.1.80-report-detail-product-polish.
The public site previously opened and showed earlier latest changes according to user verification.
```

Still open and should be verified explicitly before stronger launch claims:

```text
What exact commit is currently deployed in Render dashboard?
What is the Render service name?
Is Render auto-deploy enabled?
What is the current public Render URL?
Is Halleus.ir connected to the deployed app?
Does Halleus.ir have working SSL/domain status?
Which public routes have been smoke-tested after v0.1.80?
Are all key routes discoverable from header/footer/public UI?
Does /chart create a report successfully on the public site?
Does public report detail open successfully after v0.1.80?
Does /reports show saved reports or at least fail gracefully on public?
Does /order currently store, send, or only display/copy manual order context?
What is the current production data/privacy posture?
How good is report value/readability from a real generated sample?
How usable is the current UI on mobile?
```

## Halleus Failure Ledger and Batch Safety Rules

This section is operational, not background reading. The assistant must consult it before every future Halleus batch. If a proposed plan repeats a known failure pattern, stop and change the plan before writing code.

Every failed batch, broken runner, UI formatting issue, build/check failure, stale-context mistake, or local workflow mistake must be recorded with:

```text
Error:
Where/Version:
Cause:
Fixed / Rolled back / Still open:
Prevention rule:
Files or systems involved:
```

### Current hard stop rules

```text
1. Safety Gate first is always-on and implicit. The user does not need to repeat it. No Safety Gate, no code.
2. Two failures maximum. After two sequential failures in the same batch, stop, diagnose, reduce scope, and request live files.
3. No runner may commit, tag, or push.
4. Commit/tag/push only after apply + relevant checks + build have passed.
5. Live git output and live uploaded files beat this context file.
6. Large inline code in ChatGPT is banned for Halleus.
7. Plain git diff is banned inside scripts.
8. Root-level payload/source-like folders before build are banned.
```

### Merged known failure patterns

#### 1. Persian encoding and mojibake failures

Error:
Persian UI text became garbled/mojibake with characters like `Ø`, `Ù`, `Û`, `Ú`, `â€`, or `�`.

Where/Version:
Seen around product surface work (`lib/product/product-surface.ts`), ChartForm/context outputs, PowerShell runner output, and several Persian UI/file-writing batches.

Cause:
Unsafe PowerShell writes, clipboard/context encoding ambiguity, or console rendering. `Set-Content` and non-BOM PowerShell files are especially risky for Persian-heavy text.

Fixed / Rolled back / Still open:
Some file corruption was fixed with UTF-8/base64-safe runners and `pnpm run check:encoding`. Console-only mojibake did not require rollback. Semantic/context mojibake remains a risk.

Prevention rule:
Do not use unsafe `Set-Content` for Persian-heavy files. Prefer UTF-8 Node writes, full-file replacement, or artifact-based files. Run `pnpm run check:encoding` after Persian text changes. Probe suspect files with `Select-String -Pattern "Ø|Ù|Û|â€|�"` when context looks suspicious. Keep PowerShell runner messages mostly ASCII.

Files or systems involved:
PowerShell, Node helpers, `scripts/check-encoding.mjs`, `lib/product/product-surface.ts`, `components/ChartForm.tsx`, product/order pages.

#### 2. Product surface syntax/build failure

Error:
Build failed after product surface links were added because `PRODUCT_SURFACE_LINKS` had malformed syntax / duplicate comma.

Where/Version:
Chart engine foundation / product surface update around `v0.1.30-chart-engine-foundation`.

Cause:
Brittle text patching of an array without validating exact syntax.

Fixed / Rolled back / Still open:
Fixed in later UTF-8/product-surface repair.

Prevention rule:
When modifying arrays, prefer full-file replacement or syntax-aware minimal patch. Always run TypeScript/build before commit.

Files or systems involved:
`lib/product/product-surface.ts`, TypeScript, `pnpm build`.

#### 3. Report V2 null runtime crash

Error:
Runtime crash: `Cannot read properties of null (reading 'interpretationSections')`.

Where/Version:
Report Output V2 integration around `v0.1.33-report-output-v2-integration`.

Cause:
`ReportV2Sections` assumed `report` was always a valid object.

Fixed / Rolled back / Still open:
Fixed with null/object guard.

Prevention rule:
Report UI components must tolerate missing, legacy, or null reports. Guard before accessing fields.

Files or systems involved:
`components/ReportV2Sections.tsx`, `components/ReportDetail.tsx`.

#### 4. Report V3 generic return TypeScript error

Error:
TypeScript build failed because `TReport & ReportOutputV3` could not be guaranteed assignable to every possible subtype of `TReport`.

Where/Version:
Report Experience V3 around `v0.1.38` / before `v0.1.39`.

Cause:
Over-generic enhancer return type.

Fixed / Rolled back / Still open:
Fixed by adjusting return type.

Prevention rule:
Do not over-genericize report enhancers. Return `GenericReport & AddedMetadataType` unless the original subtype is preserved with certainty.

Files or systems involved:
`lib/report-output/report-v3.ts`, `types/report-output-v3.ts`.

#### 5. Real chart / public chart route replacement regression

Error:
`/chart` was replaced too aggressively with real chart workbench/lab UI.

Where/Version:
`v0.1.57-public-chart-real-engine`.

Cause:
Public `/chart` was connected directly to `RealChartWorkbenchClient`, overwriting the public chart shell and city/form experience.

Fixed / Rolled back / Still open:
Fixed in `v0.1.58-restore-public-chart-shell`, then properly merged through `v0.1.60-chart-form-real-engine-bridge`.

Prevention rule:
Never replace public `/chart` with `/engine/real-chart` or lab/workbench UI. Integrate real engine into the existing public `ChartForm` flow.

Files or systems involved:
`app/chart/page.tsx`, `components/RealChartWorkbenchClient.tsx`, `components/ChartForm.tsx`, `/engine/real-chart`.

#### 6. v0.1.59 chart upgrade marker failures

Error:
Runners could not inject an upgrade section because they searched for `</main>` or a parenthesized `return (...)` structure that did not exist.

Where/Version:
`v0.1.59-public-chart-real-engine-upgrade`, `v0.1.59b-public-chart-upgrade-injection`.

Cause:
Patch assumed generic React/Next layout markers instead of inspecting the actual file.

Fixed / Rolled back / Still open:
Rolled back/superseded. Untracked helper files were left in some attempts.

Prevention rule:
Do not patch React/Next pages by generic layout markers. Inspect route ownership first or use full-file replacement.

Files or systems involved:
`app/chart/page.tsx`, `components/PublicChartRealEngineUpgrade.tsx`, check scripts.

#### 7. Runner continued after patch failure into missing script/checks

Error:
Runner tried to run package scripts that did not exist after patch failure.

Where/Version:
`v0.1.59-public-chart-real-engine-upgrade`; also seen in later v0.1.73-style runners.

Cause:
Patch/package update failed but runner continued.

Fixed / Rolled back / Still open:
Superseded by fail-fast rule.

Prevention rule:
Every command wrapper must throw on non-zero exit. Do not run checks if patch/package insertion failed.

Files or systems involved:
PowerShell runners, `package.json`, check scripts.

#### 8. Temporary wrapper complexity before finding the real merge point

Error:
Temporary wrapper approach added route/component complexity before identifying the correct integration point.

Where/Version:
`v0.1.59c-public-chart-legacy-shell`.

Cause:
Created `app/chart/LegacyChartShell.tsx` and wrapped the old page before discovering `/chart` only rendered `ChartForm`.

Fixed / Rolled back / Still open:
Fixed in `v0.1.60-chart-form-real-engine-bridge`; temporary files deleted.

Prevention rule:
Before wrapping/duplicating a page, inspect route ownership. If a page only renders a component, integrate at that component.

Files or systems involved:
`app/chart/page.tsx`, `app/chart/LegacyChartShell.tsx`, `components/ChartForm.tsx`.

#### 9. Byte-for-byte checker failed after valid semantic change

Error:
`check:public-chart-shell-restored` failed despite valid semantic route behavior.

Where/Version:
Initial `v0.1.60-chart-form-real-engine-bridge`.

Cause:
Checker compared `app/chart/page.tsx` byte-for-byte against an old tag.

Fixed / Rolled back / Still open:
Fixed in `v0.1.60b` by using semantic markers.

Prevention rule:
Checks should validate durable contracts/behavior, not exact old snapshots unless exact restoration is the goal.

Files or systems involved:
`scripts/check-public-chart-shell-restored.mjs`, `app/chart/page.tsx`, `components/ChartForm.tsx`.

#### 10. Stale chart/report check markers

Error:
Checks failed because they expected old exact UI copy or old function/implementation markers.

Where/Version:
`check:chart-engine-integration` after astronomy prototype; `check:real-report-save-flow` in `v0.1.62`; `check:chart-final-submit-flow`, `check:jalali-birth-date-input`, `check:sales-copy-polish`; function mismatch risk around `calculateRealEngineAspects`.

Cause:
Check scripts validated implementation details or long Persian UI copy instead of stable contracts.

Fixed / Rolled back / Still open:
Fixed per case, but general risk remains.

Prevention rule:
Checks should prefer exported function names, type names, route behavior, stable component names, package script existence, and short durable markers. Avoid long Persian copy, import order, JSX shape, old byte snapshots, and stale helper names.

Files or systems involved:
`scripts/check-chart-engine-integration.mjs`, `scripts/check-real-report-save-flow.mjs`, `scripts/check-chart-final-submit-flow.mjs`, `scripts/check-sales-copy-polish.mjs`, `scripts/check-jalali-birth-date-input.mjs`, real engine/chart/report files.

#### 11. Dependency install before checker architecture update

Error:
`astronomy-engine@2.1.19` was installed and lock/package changed, but `check:project` failed due to stale checker.

Where/Version:
Astronomy Engine prototype / proposed `v0.1.41-astronomy-engine-prototype`.

Cause:
Dependency and code path changed before related checks were updated.

Fixed / Rolled back / Still open:
Final status in that chat was uncertain.

Prevention rule:
When replacing implementation paths, update related check scripts in the same batch. Do not commit dependency changes until full relevant check passes.

Files or systems involved:
`package.json`, `pnpm-lock.yaml`, chart-engine factory/check scripts.

#### 12. v0.1.68 oversized runner and nested JS/TSX quoting failures

Error:
Runner 068 failed with syntax errors such as `Unexpected identifier '$'`, `Invalid or unexpected token`, and PowerShell parser issue `$LASTEXITCODE:`.

Where/Version:
Initial `v0.1.68-manual-order-request-and-jalali-date-shell` attempts.

Cause:
Nested PowerShell → JS → TSX template literals, `${...}` interpolation, quoting, and PowerShell variable parsing.

Fixed / Rolled back / Still open:
Rolled back. Work split into `v0.1.68-manual-order-request-shell`, `v0.1.69-order-entry-links`, `v0.1.70-jalali-birth-date-input`.

Prevention rule:
No nested generated PowerShell/JS/TSX template patch runners. If JS helper is needed, make it external and syntax-check it before packaging. Keep batches single-purpose.

Files or systems involved:
`halleus-068*.ps1`, `patch-068*.cjs`, `/order`, `ChartForm`, sales nav, package scripts.

#### 13. Runner commit/tag after patch failure and wrong tag placement

Error:
Runner 068 continued after patch failure, attempted `git add` for missing files, and created tag `v0.1.68-manual-order-request-jalali-date` on previous commit `d473394 / v0.1.67`.

Where/Version:
Initial 068 runner.

Cause:
No fail-fast and no “new commit actually exists” guard.

Fixed / Rolled back / Still open:
Wrong tag removed/cleaned up later.

Prevention rule:
If patch/check/build fails, stop. If `git commit` says nothing to commit, do not tag. Before tag, verify HEAD changed to expected commit.

Files or systems involved:
Git, runners, `components/ManualOrderRequestForm.tsx`, `/order`.

#### 14. Null `.Trim()` / PowerShell scalar/null fragility

Error:
PowerShell runner failed with `You cannot call a method on a null-valued expression` on `.Trim()`.

Where/Version:
`halleus-068a-manual-order-request-shell.ps1`; general runner rule later.

Cause:
`git tag --list` returned null/empty output.

Fixed / Rolled back / Still open:
Avoided by abandoning runner and using safer creation.

Prevention rule:
Never call `.Trim()` directly on possibly null command output. Cast safely/default to empty first. Prefer Node runners for complex logic.

Files or systems involved:
PowerShell, Git tag checks.

#### 15. Manual editing friction and wrong file paste

Error:
User could not find insertion points or pasted product page content into pricing page.

Where/Version:
`v0.1.69-order-entry-links`.

Cause:
Manual marker-based instructions over long Persian JSX files were too fragile and tiring.

Fixed / Rolled back / Still open:
Fixed by providing full replacement content for the specific file.

Prevention rule:
For long Persian JSX, use full-file replacement or line-numbered exact patches with clear file names. Do not ask user to find ambiguous markers repeatedly.

Files or systems involved:
`app/product/page.tsx`, `app/pricing/page.tsx`, `app/reports/page.tsx`.

#### 16. VS Code Problems stale import warning

Error:
VS Code showed `Cannot find module '@/components/ManualOrderRequestForm'` though build passed.

Where/Version:
After manual `/order` creation in `v0.1.68`.

Cause:
Likely stale TypeScript server cache.

Fixed / Rolled back / Still open:
Resolved/ignored after build passed.

Prevention rule:
If VS Code Problems conflicts with `pnpm build`, treat build as source of truth and restart TS Server / Reload Window.

Files or systems involved:
VS Code TypeScript server, `/order`, `ManualOrderRequestForm`.

#### 17. Duplicate tag creation attempt

Error:
Git said tag already exists.

Where/Version:
After successful `v0.1.69-order-entry-links`.

Cause:
User reran tag command.

Fixed / Rolled back / Still open:
No action needed.

Prevention rule:
Check `git tag --list "<tag>"` before tagging. If tag exists at correct HEAD, do not recreate.

Files or systems involved:
Git tags.

#### 18. v0.1.70 ChartForm full rewrite broke old marker checks

Error:
Jalali check passed, but `check:chart-final-submit-flow` failed due to missing old markers such as `ساخت گزارش و مشاهده جزئیات`, `مسیر ساده ساخت گزارش`, and `محاسبه پشت صحنه`.

Where/Version:
Initial `v0.1.70-jalali-birth-date-input`.

Cause:
Runner rewrote whole `ChartForm` and removed marker-sensitive legacy copy.

Fixed / Rolled back / Still open:
Rolled back. `070b` used limited patch and preserved old markers.

Prevention rule:
Before UI rewrite, read related check scripts. Either preserve old markers or update checks semantically in the same batch.

Files or systems involved:
`components/ChartForm.tsx`, `scripts/check-chart-final-submit-flow.mjs`.

#### 19. v0.1.71 Report/order context marker failures and partial patches

Error:
Repeated failures:
- `ManualOrderRequestForm insert position after reportLink not found`
- `ManualOrderRequestForm state block marker not found`
- `ReportDetail actions block marker not found`
- partial patch risk before failure

Where/Version:
`v0.1.71-report-order-context` attempts.

Cause:
Runners guessed live file structure and used brittle JSX/string markers in `ManualOrderRequestForm.tsx` and `ReportDetail.tsx`.

Fixed / Rolled back / Still open:
Tracked files restored. Later project moved beyond this with other completed releases; old failed attempts are not milestones.

Prevention rule:
Do not patch `ManualOrderRequestForm.tsx` or `ReportDetail.tsx` from remembered markers. Inspect exact live files with line numbers. Validate all preconditions before writing any file. Prefer full-file replacement or a new independent component rendered from a route-level file after inspection. Avoid touching `ReportCard` unless necessary.

Files or systems involved:
`components/ManualOrderRequestForm.tsx`, `components/ReportDetail.tsx`, `app/order/page.tsx`, `app/reports/[reportId]/page.tsx`.

#### 20. v0.1.73 large UI runner failures

Error:
Repeated failures in `v0.1.73-minimal-product-ui-polish`:
- hash mismatch for `app/globals.css`
- hash mismatch for `components/ChartForm.tsx`
- hash mismatch for `app/page.tsx`
- missing script/check after failed patch
- marker-heavy Jalali and chart-flow checks failed
- unrelated sales-copy checks failed
- check script printed “passed” before throwing later

Where/Version:
v0.1.73 large UI polish repair sequence.

Cause:
Raw SHA guards on Windows, stale context, broad mixed-concern batch, unrelated checks, and marker-heavy check scripts.

Fixed / Rolled back / Still open:
Rolled back. Later completed as focused `v0.1.73-chart-date-picker-country-cleanup`.

Prevention rule:
Do not use raw SHA as primary guard on Windows. If multiple hash mismatches occur, stop and change strategy. Keep batches product-oriented but single-purpose. Run only relevant checks. Check scripts must print “passed” only after all assertions.

Files or systems involved:
`app/globals.css`, `app/page.tsx`, `components/ChartForm.tsx`, product/pricing/order pages, `package.json`, docs, check scripts.

#### 21. v0.1.73 JS template literal / expected block failures

Error:
Chart-only runner failed with `ReferenceError: chart is not defined` and later “missing expected block” for `ChartForm`.

Where/Version:
`v0.1.73-chart-date-picker-cleanup`, `v0.1.73-chart-date-picker-only`.

Cause:
Generated `.cjs` used template literal containing project text/backticks/`${...}`-like content; later used a large expected oldText block from stale context.

Fixed / Rolled back / Still open:
Rolled back in that chat. Later completed after exact live context.

Prevention rule:
Avoid complex JS template literals and large expected-block replacements. Use live extracted files and smaller replacements or full-file replacement.

Files or systems involved:
`halleus-073-chart-patch.cjs`, `components/ChartForm.tsx`, docs append text.

#### 22. v0.1.75 UI chrome/product regression

Error:
Site chrome cleanup hid important routes and brand appeared as `HHalleus`.

Where/Version:
`v0.1.75-site-chrome-minimal-ui-cleanup`.

Cause:
Over-minimalization removed route discoverability and introduced brand duplication/typo.

Fixed / Rolled back / Still open:
Fixed by `v0.1.76-site-chrome-navigation-fix`.

Prevention rule:
Chrome/nav batches must verify brand exactly `Halleus`, not `HHalleus`, and preserve discoverability of key routes: `/`, `/chart`, `/reports`, `/product`, `/pricing`, `/order`, `/privacy`. Do not expose admin/engine/quality as primary public navigation.

Files or systems involved:
Header/footer/site chrome/layout/navigation components.

#### 23. Local/GitHub/Render/Public state confusion

Error:
Project context mixed local commit/tag progress with GitHub pushed state, Render deployment, and public/live behavior.

Where/Version:
After v0.1.74 and multiple handoffs.

Cause:
Context focused on local technical progress and did not track deployment states separately.

Fixed / Rolled back / Still open:
Partially fixed in context updates; still must be actively maintained.

Prevention rule:
Always track separately:
- Local HEAD/tag/clean status
- GitHub origin/main and remote tags
- Render service/deploy commit/status
- Public URL/domain smoke QA

Files or systems involved:
`docs/HALLEUS_PROJECT_CONTEXT.md`, Git, GitHub, Render, Halleus.ir.

#### 24. Docs-only commit vs product tag ambiguity

Error:
Context/doc commit changed latest local commit while latest product tag remained older.

Where/Version:
After `511b6a5 Add Halleus project handoff context`.

Cause:
Docs-only commit had no product tag, so “latest commit” and “latest product release” diverged.

Fixed / Rolled back / Still open:
Tracking rule added.

Prevention rule:
Record latest local commit, latest product tag, whether commit is docs-only, and whether a product release tag exists.

Files or systems involved:
Git log/tags, `docs/HALLEUS_PROJECT_CONTEXT.md`.

#### 25. Root/untracked files and repo hygiene

Error:
Plan files, runner files, helper scripts, ZIPs, context files, and temp folders remained untracked.

Where/Version:
Across mega batches, v0.1.68, v0.1.70, v0.1.73, v0.1.79, v0.1.80.

Cause:
Runner cleanup incomplete, user copied artifacts into repo root, and some plan files were not under `docs/`.

Fixed / Rolled back / Still open:
Often cleaned manually.

Prevention rule:
Always run `git status --short` before commit. Commit only intended project files. Remove runner/zip/helper/temp files. Planning docs must be moved to `docs/` or deleted. Runners should self-clean known helper files where safe.

Files or systems involved:
Repo root, `.ps1`, `.cjs`, `.zip`, `_halleus_*`, `.halleus-runner-backups/`, `scripts/clean-temp-files.mjs`.

#### 26. Downloads path vs repo root confusion

Error:
Downloaded ZIPs and runners were not always in repo root.

Where/Version:
General Windows workflow.

Cause:
User downloads elsewhere and copies/extracts into `C:\Projects\astro-clean`.

Fixed / Rolled back / Still open:
Standard command pattern established.

Prevention rule:
Instructions must start with `cd C:\Projects\astro-clean`. If extraction is needed, make destination explicit. The user usually copies only the runner into repo root, so future artifacts must account for that or clearly say to extract the whole ZIP.

Files or systems involved:
PowerShell, Downloads folder, repo root.

#### 27. PowerShell continuation prompt confusion

Error:
PowerShell prompt became `>>`.

Where/Version:
General workflow.

Cause:
Unclosed quote/parenthesis/here-string or normal multiline continuation.

Fixed / Rolled back / Still open:
Operational rule documented.

Prevention rule:
If prompt stays at `>>` and no output appears, press `Ctrl+C`. If command output already appeared, it may have been normal continuation.

Files or systems involved:
PowerShell terminal.

#### 28. Git pager confusion

Error:
Git output opened pager and showed `(END)` or made terminal look stuck.

Where/Version:
General Git workflow; happened again in v0.1.80 apply script.

Cause:
Plain `git diff` or long git output entered pager.

Fixed / Rolled back / Still open:
User pressed `q`.

Prevention rule:
If Git shows `(END)`, press `q`. In scripts use `git --no-pager diff`, `git --no-pager diff --stat`, or write diff to file.

Files or systems involved:
Git CLI, terminal pager.

#### 29. LF/CRLF warnings

Error:
Git warns `LF will be replaced by CRLF`.

Where/Version:
Many Windows commits including v0.1.60, v0.1.70, v0.1.79, v0.1.80.

Cause:
Windows Git line-ending normalization.

Fixed / Rolled back / Still open:
Not a failure by itself.

Prevention rule:
Do not treat LF/CRLF warnings as errors unless `git diff --check`, encoding check, or build fails. Avoid raw byte hash guards that are CRLF-sensitive.

Files or systems involved:
Git on Windows, source files.

#### 30. PowerShell execution policy

Error:
Direct `.ps1` execution can be blocked by script signing/execution policy.

Where/Version:
General runner workflow.

Cause:
Windows PowerShell execution policy blocks unsigned scripts.

Fixed / Rolled back / Still open:
Documented standard execution pattern.

Prevention rule:
Run from repo root using `powershell -ExecutionPolicy Bypass -File .\runner-name.ps1`.

Files or systems involved:
PowerShell, Windows execution policy.

#### 31. Bracket path wildcard issue

Error:
PowerShell failed reading path with `[reportId]`.

Where/Version:
Report detail inspection.

Cause:
PowerShell treated brackets as wildcard syntax.

Fixed / Rolled back / Still open:
Use `-LiteralPath`.

Prevention rule:
For paths containing brackets, always use `-LiteralPath`, for example:
`Get-Content -LiteralPath ".\app\reports\[reportId]\page.tsx" -Raw`.

Files or systems involved:
PowerShell, `app/reports/[reportId]/page.tsx`.

#### 32. Raw SHA guards false-fail on Windows

Error:
Hash guards failed repeatedly for files that were not semantically wrong.

Where/Version:
v0.1.73 and general runner lessons.

Cause:
Stale hashes and CRLF/LF conversion.

Fixed / Rolled back / Still open:
Workflow changed.

Prevention rule:
Do not use raw SHA as the main guard on Windows unless generated from exact live files immediately before the runner. Prefer baseline commit, clean tracked tree, allowed untracked list, and semantic guards.

Files or systems involved:
Windows Git, runners, line endings.

#### 33. ChatGPT generated runners from memory/stale context

Error:
Generated patches/ZIPs assumed file structure that did not match the live repo.

Where/Version:
Visible in v0.1.59, v0.1.68, v0.1.71, v0.1.73, v0.1.79.

Cause:
Assistant tried to move fast from remembered structure instead of inspecting live files.

Fixed / Rolled back / Still open:
Standing workflow risk.

Prevention rule:
Before any batch touching active UI/form/detail files, collect exact live files, line numbers where needed, git status, and relevant check scripts. No code from memory.

Files or systems involved:
`ChartForm`, `ReportDetail`, `ManualOrderRequestForm`, route files, runners.

#### 34. Too many corrective micro-batches slowed progress

Error:
Project velocity collapsed due to repeated repair runners and small corrective batches.

Where/Version:
v0.1.57-v0.1.62, v0.1.68-v0.1.73, v0.1.79.

Cause:
Wrong integration paths, brittle runners/checks, and assistant over-repairing isolated errors instead of changing strategy.

Fixed / Rolled back / Still open:
Partially fixed by Safety Gate and stop-after-2-failures rule.

Prevention rule:
Prefer product-level but single-purpose batches. Use small safety fixes only when a runner actually fails. After repeated failure, stop and reduce scope.

Files or systems involved:
Workflow, generated runners, checks.

#### 35. v0.1.79 failed report-readability runner committed/tagged after failed checks/build

Error:
Initial v0.1.79 report-readability runner committed/tagged despite:
- `check:report-experience-v3` failed with missing marker
- `pnpm build` failed due to report output version/type mismatch

Where/Version:
Initial `v0.1.79-report-value-readability-polish`.

Cause:
Runner was not transaction-safe and touched report output types/schema while trying to polish report readability.

Fixed / Rolled back / Still open:
Rolled back. Bad tag/commit removed/reset. Stable base restored to `v0.1.78 / 89f485d`.

Prevention rule:
No runner may commit/tag/push automatically. Report copy/product polish must not touch report output schemas/types unless explicitly scoped.

Files or systems involved:
Git, `components/ReportV3Experience.tsx`, `lib/report-output/report-v2.ts`, report output types.

#### 36. v0.1.79 fix runners failed due to PowerShell/JS/type/check issues

Error:
Fix runners failed due to:
- bad PowerShell/git helper
- generated JS template-literal syntax error
- TypeScript label union mismatch
- marker check mismatch

Where/Version:
`v0.1.79` fix attempts v1-v4.

Cause:
Complex repair automation and touching schema/type-sensitive files.

Fixed / Rolled back / Still open:
Rolled back. Not milestones.

Prevention rule:
Do not keep patching schema/type files during UI/readability polish. Use small full-file or artifact apply only after inspecting live files.

Files or systems involved:
PowerShell, generated `.cjs`, `lib/report-output/report-v3.ts`, check scripts.

#### 37. Root-level payload compiled by Next/TypeScript

Error:
Build failed on `./payload/components/ReportDetail.tsx` with missing import.

Where/Version:
First `v0.1.79-report-detail-copy-cleanup` runner.

Cause:
Runner left `payload/` inside repo root. Next/TypeScript compiled it.

Fixed / Rolled back / Still open:
Removed `payload/`; build passed.

Prevention rule:
Never leave `payload/`, copied TS/TSX, or source-like temp folders inside repo root before build.

Files or systems involved:
`payload/components/ReportDetail.tsx`, Next.js build.

#### 38. v0.1.79 apply-only replacement failed on missing expected text

Error:
`Missing expected text for replacement: ReportDetail replacement 6`.

Where/Version:
`v0.1.79-report-detail-copy-cleanup-apply-only`.

Cause:
Exact replacement string did not match live file.

Fixed / Rolled back / Still open:
Restore worked. No commit/tag.

Prevention rule:
Do not use multi-string replacement for copy polish without exact live content. Prefer full-file replacement from inspected current file.

Files or systems involved:
`components/ReportDetail.tsx`, apply `.cjs`.

#### 39. Regex replacement broke JSX

Error:
Next build failed with TSX parse error: `Expected '</', got 'ident'`.

Where/Version:
Direct report-detail cleanup attempt in chat 5.

Cause:
Regex replacement crossed JSX attribute/string boundaries.

Fixed / Rolled back / Still open:
Backup restore worked. Later full-file approach succeeded.

Prevention rule:
No regex across JSX attributes or multiline JSX. Use validated full-file replacement.

Files or systems involved:
`components/ReportDetail.tsx`, Next parser.

#### 40. Long inline ChatGPT code block rendered unsafely

Error:
Large inline PowerShell/TSX code showed as mixed/raw text in ChatGPT UI and was unsafe to copy.

Where/Version:
During v0.1.80 product polish preparation.

Cause:
ChatGPT UI formatting failure with long code response.

Fixed / Rolled back / Still open:
Workflow switched to downloadable artifact.

Prevention rule:
No large inline code blocks for Halleus. Use artifacts for large changes and short terminal commands only.

Files or systems involved:
ChatGPT UI, PowerShell, TSX full-file replacement.

#### 41. Assistant suggested stopping after recovery while user needed progress

Error:
Assistant said project could be closed after restoring stable state, despite user needing real progress.

Where/Version:
After repeated v0.1.79 failures.

Cause:
Assistant over-prioritized stability and ignored time/progress frustration.

Fixed / Rolled back / Still open:
Corrected by continuing with safer v0.1.79 and v0.1.80 workflows.

Prevention rule:
After recovery, propose one safe, concrete progress step unless the user explicitly wants to stop.

Files or systems involved:
Workflow/product planning.

#### 42. Context state became stale after v0.1.79/v0.1.80

Error:
Context still described older state while repo had advanced.

Where/Version:
After pushed `v0.1.79` and `v0.1.80`.

Cause:
Context update lagged behind Git state.

Fixed / Rolled back / Still open:
This update is intended to fix it.

Prevention rule:
After successful pushed milestones, update context or mark it stale. Live git output wins over context.

Files or systems involved:
`docs/HALLEUS_PROJECT_CONTEXT.md`, Git log, GitHub origin/main.

### Successful recovery patterns to reuse

#### Pattern A: Apply-only, then build, then commit/tag/push separately

Used successfully for:

```text
v0.1.79-report-detail-copy-cleanup
commit: a848ef6
scope: components/ReportDetail.tsx only
```

Rule:

```text
Apply changes without commit/tag/push.
Run encoding/build checks.
Only after success, commit and tag manually.
Push main and tag separately.
```

#### Pattern B: Downloadable artifact instead of long inline code

Used successfully for:

```text
v0.1.80-report-detail-product-polish
commit: 974864e
scope: components/ReportDetail.tsx only
```

Rule:

```text
For larger edits, use a downloadable apply artifact.
Do not paste full-file TSX or long PowerShell into chat.
Artifact must not leave source-like payload inside root before build.
```

### Required batch protocol

For every future Halleus batch, even if the user does not explicitly say "Safety Gate first.":

```text
1. Safety Gate first.
2. Inspect current live files first.
3. State exact scope and excluded files.
4. Apply without commit/tag/push.
5. Run only relevant checks plus pnpm build when TypeScript/runtime risk exists.
6. Commit and tag only after checks/build pass.
7. Push only after local commit/tag is confirmed.
8. If any step fails, restore or rollback, stop, and update this ledger before retrying.
```

### Current hard rules

```text
No guessing from remembered structure.
No large inline scripts in chat.
No root-level payload before build.
No brittle marker-heavy patching.
No generated JS template literals containing project text.
No regex replacement across JSX attributes.
No automatic commit/tag/push in apply scripts.
No plain git diff in scripts.
No raw SHA primary guards on Windows unless generated from exact live files immediately before use.
Keep product polish batches away from engine/types/output schema unless explicitly planned.
After two sequential failures, stop and reduce scope.
```
## Halleus ChatGPT Workflow Guardrails — v0.1.94 Recovery Addendum

### Current state after recovery

Repo: `C:\Projects\astro-clean`
Branch: `main`
Current clean HEAD: `3ab098b`
Current tag at HEAD: `v0.1.93-report-generation-contract`
Remote state: `origin/main` and `origin/HEAD` point to `3ab098b`
Working tree after recovery: clean; `git status --short` returned no output.

Recent log:

```text
3ab098b (HEAD -> main, tag: v0.1.93-report-generation-contract, origin/main, origin/HEAD) Add report generation contract types
4a010b1 (tag: v0.1.92-report-engine-unification-plan) Add report engine unification plan
dcda684 (tag: v0.1.91-engine-reality-audit) Add engine reality audit
```

### Active authority files

The assistant must treat these files as active project authority before any Halleus batch:

```text
docs/HALLEUS_PROJECT_CONTEXT.md
docs/HALLEUS_IDEA_GARDEN.md
docs/HALLEUS_ENGINE_REALITY_AUDIT.md
docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md
types/report-generation.ts
```

Live terminal output beats docs for current git/file state. The docs define workflow rules, product direction, known failures, and intended roadmap. Do not replace these files with generic beginner coding rules.

### Intended next batch before failure

Next planned batch:

```text
v0.1.94-report-generation-service-scaffold
```

Intended files only:

```text
lib/report-generation/report-generation-service.ts
lib/report-generation/index.ts
```

Intended goal:

```text
- scaffold report generation service on top of types/report-generation.ts
- separate mock/fallback vs real-engine path clearly
- no UI change
- no public report route
- no wiki
- no SEO indexing route
- no payment/private logic
- no commit/tag/push inside runner
```

### v0.1.94 failed attempt: README overwrite incident

The assistant produced an artifact ZIP for `v0.1.94-report-generation-service-scaffold` that contained a root-level `README.md`.

The user extracted/copied the artifact inside:

```text
C:\Projects\astro-clean
```

That root-level artifact `README.md` overwrote/modified the real tracked project `README.md`.

Runner preflight then failed correctly:

```text
Tracked dirty files:
 M README.md

FAILED: Tracked working tree is dirty. Commit/stash/restore before running.
```

Diff inspection confirmed that the real project README was replaced by artifact instruction text:

```text
# Halleus v0.1.94 report generation service scaffold
Apply-only artifact. No commit/tag/push.
...
```

The real project README originally started with:

```text
# Astro Clean
Astro Clean یک MVP فارسی‌زبان برای تجربه آسترولوژی نمادین است.
...
```

Recovery was completed:

```text
- README diff inspected
- overwritten README backed up to %TEMP%
- README restored with git restore -- README.md
- temporary v0.1.94 context ZIP and scaffold runner removed from repo root
- final git status --short returned no output
```

Intended v0.1.94 files were not applied. No commit/tag/push was created.

### Failure Ledger entry

Error:
Artifact ZIP overwrote/modified tracked root README.md before runner preflight.

Where/Version:
v0.1.94-report-generation-service-scaffold retry attempt after v0.1.93-report-generation-contract at HEAD `3ab098b`.

Cause:
Artifact ZIP contained a root-level `README.md`. User extracted/copied ZIP contents into `C:\Projects\astro-clean`, which modified the repository's tracked `README.md`. Runner correctly failed because tracked working tree was dirty.

Fixed / Rolled back / Still open:
Fixed by inspecting the README diff, backing up overwritten README to `%TEMP%`, restoring `README.md` with `git restore -- README.md`, and removing temporary v0.1.94 context ZIP and scaffold runner from repo root. Intended v0.1.94 files were not applied, and no commit/tag/push was created.

Prevention rule:
Halleus artifacts must never include root-level `README.md`, `package.json`, `docs/*`, source folders, or source-like payload files unless they are explicit intended targets. Prefer a single uniquely named `.ps1` with embedded base64 content. If helper docs are required, use a uniquely named `.txt` under a namespaced artifact folder, never `README.md`. Runner preflight must fail on tracked dirty files and allow only known untracked runner/context ZIP files. Before commit, runner/ZIP/temp artifacts must be removed and `git status --short` must show only intended project files.

Files or systems involved:
`README.md`, artifact ZIP packaging, PowerShell runner preflight, Git working tree cleanliness, `C:\Projects\astro-clean`.

### Secondary workflow communication failure

A later instruction tried to run:

```powershell
powershell -ExecutionPolicy Bypass -File .\halleus-094-context-failure-ledger-apply.ps1
```

but the file did not exist in repo root. It was only available as a sandbox/download artifact and had not been copied into `C:\Projects\astro-clean`.

Prevention rule:
When providing a downloadable artifact, explicitly say:

```text
Download the artifact.
Copy the .ps1 into C:\Projects\astro-clean.
Then run the command.
```

Never assume sandbox links already exist in the repository root.

### Correct artifact pattern for Halleus

Preferred artifact shape:

```text
halleus-094-report-generation-service-scaffold-apply.ps1
```

The artifact should be a single uniquely named `.ps1` file.

If a ZIP is unavoidable, ZIP root must contain only:

```text
halleus-094-report-generation-service-scaffold-apply.ps1
```

or a namespaced non-source folder:

```text
_halleus_artifacts/v0.1.94/halleus-094-report-generation-service-scaffold-apply.ps1
_halleus_artifacts/v0.1.94/HALLEUS_ARTIFACT_NOTES_v0.1.94.txt
```

Forbidden artifact contents unless they are explicit intended targets:

```text
README.md
package.json
docs/*
payload/
components/
lib/
app/
src/
types/
*.ts
*.tsx
*.js
*.mjs
*.cjs
```

If helper instructions are needed, put them in the chat response. Do not include a root-level README.

### Correct runner preflight rules

Runner preflight must:

```text
- confirm current HEAD/tag if applicable
- fail on any tracked dirty file
- allow only known untracked runner/current ZIP files
- fail on unrelated untracked source-like files
- fail on root-level payload/source folders
- write only explicitly allowed target files
- never commit/tag/push
```

Known allowed untracked files for v0.1.94 retry may include:

```text
halleus-094-*.ps1
halleus-v0.1.94-*.zip
```

For v0.1.94 retry, intended new files are only:

```text
lib/report-generation/report-generation-service.ts
lib/report-generation/index.ts
```

Before commit, remove runner/ZIP/temp artifacts. Then `git status --short` must show only intended project files.

### Correct context ZIP request pattern

When requesting context for a batch, ask for exact live files only. Do not ask for whole repo unless absolutely necessary.

For v0.1.94 retry, inspect:

```text
docs/HALLEUS_PROJECT_CONTEXT.md
docs/HALLEUS_IDEA_GARDEN.md
docs/HALLEUS_ENGINE_REALITY_AUDIT.md
docs/HALLEUS_ENGINE_UNIFICATION_PLAN.md
types/report-generation.ts
components/ChartForm.tsx
app/api/engine/real-chart/route.ts
lib/astrology
lib/report-output
lib/reports
src/lib/chart
src/lib/report-output
types
package.json
```

The assistant must not infer current file structure from memory.

### Correct downloadable runner instructions

If providing a downloadable runner, the assistant must say:

```text
Download the .ps1.
Copy it into C:\Projects\astro-clean.
Run:

cd C:\Projects\astro-clean
powershell -ExecutionPolicy Bypass -File .\halleus-094-report-generation-service-scaffold-apply.ps1
```

If the artifact is a ZIP, the assistant must state exactly what should be extracted and where. For Halleus, avoid ZIPs for small runner batches and prefer a single `.ps1`.

### Keeping Idea Garden involved

Product ideas, roadmap decisions, SEO strategy, public/private report strategy, keyword cluster decisions, and wiki plans belong in:

```text
docs/HALLEUS_IDEA_GARDEN.md
```

Before implementing any product idea, the assistant must check whether it is already present in Idea Garden. If the idea is new or materially changed, update Idea Garden in a docs-only batch before implementation or include a clearly planned docs update.

Key active Idea Garden directions:

```text
- Public Free Reports as SEO Surface
- Paid Private Reports
- Public Cohort Report Pages
- Persian Keyword Cluster Research
- Wiki-to-Report SEO Funnel
- Public Report Privacy and Consent System
- Sky Pulse / Astro Weather
```

Search Console and active indexing are deferred until the engine and content base are stronger.

### Avoiding repeated bug loops

If a runner/check fails:

```text
1. Stop.
2. Do not rerun blindly.
3. Inspect git status.
4. Inspect targeted diff.
5. Restore only known accidental files.
6. Backup before restoring overwritten tracked files.
7. If the same batch fails twice, reduce scope.
8. If artifact/runner strategy caused the failure, fix the strategy before retrying the product batch.
9. Do not commit/tag/push after failed checks.
```

### Product progress vs workflow recovery

Do not count workflow cleanup as product progress.

Examples:

```text
README restore = workflow recovery, not product progress
Failure Ledger update = workflow hygiene, not product progress
v0.1.94 service scaffold = product/architecture progress only if files are applied, checks pass, and commit/tag/push happen
```

The assistant must not claim progress unless the relevant code/docs/check/commit/tag/push/public verification actually happened.

### Next recommended step

Before retrying v0.1.94, perform a docs-only context update that adds this guardrail/failure-ledger entry to `docs/HALLEUS_PROJECT_CONTEXT.md`.

Recommended next batch:

```text
v0.1.94a-context-runner-guardrails
```

Allowed file:

```text
docs/HALLEUS_PROJECT_CONTEXT.md
```

Forbidden files:

```text
README.md
package.json
app/*
components/*
lib/*
src/*
types/*
scripts/*
docs/HALLEUS_IDEA_GARDEN.md unless explicitly updating product ideas
```

After guardrails are committed, retry the original product batch:

```text
v0.1.94-report-generation-service-scaffold
```

Allowed files for retry:

```text
lib/report-generation/report-generation-service.ts
lib/report-generation/index.ts
```

Artifact shape for retry:

```text
single uniquely named .ps1
embedded base64 UTF-8 no BOM
no ZIP README
no payload in repo root
no commit/tag/push inside runner
```

Required checks for retry:

```text
pnpm run check:encoding
git --no-pager diff --check
pnpm build
```


#### 34. v0.1.103 final report narrative copy workflow failures

Error:
The first v0.1.103 product-facing copy patch partially applied and then failed because the download button regex did not match the live JSX shape.

Where/Version:
v0.1.103 final report narrative copy batch, while editing `components/ReportV3Experience.tsx`, `lib/report-output/report-v3.ts`, and `lib/report-output/report-v3-export.ts`.

Cause:
The patch used a regex for a multiline JSX button block that was more brittle than the live component structure. Earlier live grep showed the relevant lines, but the replacement still assumed exact formatting.

Fixed / Rolled back / Still open:
Fixed by stopping immediately, inspecting `git status --short`, `git --no-pager diff --name-status`, and targeted grep output, then applying a smaller repair patch. No commit/tag/push occurred until encoding, diff, build, visible-label grep, and targeted diff passed.

Prevention rule:
Do not use regex replacement across multiline JSX blocks for UI copy polish. For JSX copy changes, prefer exact current-line replacements from live grep, full-file replacement after inspection, or smaller single-string replacements. If a patch fails after partially writing files, stop and diagnose before retrying.

Files or systems involved:
`components/ReportV3Experience.tsx`, `lib/report-output/report-v3.ts`, `lib/report-output/report-v3-export.ts`, Node stdin patch, PowerShell.

#### 35. v0.1.103 visible-label guard false positive

Error:
The old-visible-V3-label guard failed after the repair patch even though user-facing old labels had been removed.

Where/Version:
v0.1.103 final report narrative copy repair/check step.

Cause:
The guard searched too broadly for `V3`, so it matched internal identifiers and function names such as `ReportV3Experience`, `createReportV3PlainText`, and `reportV3Summary` instead of only visible UI/export labels.

Fixed / Rolled back / Still open:
Fixed by replacing the broad guard with a targeted visible-label grep for exact old user-facing strings: the English debug label plus the old Persian V3 download/copy/action labels. Checks passed, visual diff was reviewed, then commit/tag/push completed.

Prevention rule:
Visible-label guards must target exact user-facing strings only. Do not treat internal identifiers, exported function names, type names, or schema keys as visible UI copy failures. When validating removal of debug labels, grep only the specific visible strings being removed.

Files or systems involved:
`components/ReportV3Experience.tsx`, `lib/report-output/report-v3-export.ts`, PowerShell grep guard, Node stdin patch.

#### 36. v0.1.105 report section body salvage failures

Error:
The v0.1.105 final report section body batch had multiple failed patch attempts before the final commit. The first product patch passed code checks/build but the visual diff revealed Persian copy artifacts. Follow-up substring/base64 fixes failed because markers did not match the live file exactly. One guard also failed because a line had already been corrected.

Where/Version:
v0.1.105 final report section body work on `lib/report-output/report-v3.ts`, after `v0.1.104a-workflow-ledger-copy-fix` and before commit `3f3225a / v0.1.105-final-report-section-bodies`.

Cause:
The patch tried to generate and repair Persian product copy through encoded string fragments and substring markers. Some artifacts were visible only in review and were not caught by `check:encoding`, `git diff --check`, or `pnpm build`. Raw terminal diff also made RTL Persian spacing look unreliable, so final verification required exact Node string probes.

Fixed / Rolled back / Still open:
Fixed without rollback. The final committed state was verified by `pnpm run check:encoding`, `git --no-pager diff --check`, `pnpm build`, clean status after commit, and a Node probe proving the bad joined Persian markers were absent while the corrected spaced forms were present. No v0.1.105 code was committed until these checks and probes passed.

Prevention rule:
For Persian-heavy report copy, avoid complex generated encoded fragments and repeated substring repair attempts. Prefer full current-line replacement from inspected live lines, or a small UTF-8/BOM artifact with visually reviewed text. Treat `check:encoding` and build as necessary but not sufficient; always run a targeted string probe for common Persian spacing artifacts before commit. If raw `git diff` appears to show RTL spacing issues, verify with JSON/string probes before deciding whether the file is actually wrong.

Files or systems involved:
`lib/report-output/report-v3.ts`, PowerShell, Node stdin patches, ZIP apply runner, `scripts/check-encoding.mjs`, `pnpm build`, Git diff rendering.


## v0.1.106 Database MVP Contract

This checkpoint locks the next product path toward public beta without starting a database implementation yet.

Known live state before this contract:

```text
HEAD: 58df621
Tag: v0.1.105a-workflow-ledger-report-section-salvage
Working tree from database context ZIP: clean before the ZIP itself was created
Database foundation already exists: migration draft, database driver contract, not-configured driver, row mapper, repository placeholder, and storage docs.
Active app still uses local preview storage through the repository layer.
```

Locked decision:

```text
Database MVP is not the final user profile model.
Database MVP is server-side persistence for versioned report snapshots.
The next implementation path must preserve the existing repository contract and avoid rewriting report UI.
The report output should be saved as snapshots with outputVersion / contractVersion metadata so later report engines do not break older reports.
User accounts, auth, payment, public/indexable report routes, and final birth profile normalization remain out of scope until server-saved reports work.
No user report may become public or indexable without explicit consent and a future public/private visibility UX.
```

Allowed next sequence:

```text
v0.1.107: inspect env/provider files and choose DB connection approach
v0.1.108: implement database driver/client behind existing contracts
v0.1.109: save generated reports to database in a controlled beta path
v0.1.110: read report detail from database while preserving local fallback
v0.1.111: persist manual fuller-report order requests
```

Scope guard:

```text
Do not implement auth/profile/payment/public report SEO in the same batch as database persistence.
Do not normalize report sections into many tables yet.
Do not run or alter production migrations before provider/auth strategy is chosen.
Do not replace local preview behavior until database read/write is verified.
```


## v0.1.108 Postgres Driver Contract Implementation

This checkpoint implements the first real database driver behind the existing database contract without switching product UI away from local preview storage.

Done:

```text
Added `postgres` as the server database client dependency.
Added `lib/database/postgres-report-database-driver.ts`.
Updated `getReportDatabaseDriver()` to return the Postgres driver only when `DATABASE_URL` exists.
Kept the not-configured driver as the safe fallback.
Extended database readiness checks to require the Postgres driver file and markers.
Updated database readiness docs.
```

Scope guard:

```text
No app UI was wired to database storage in this checkpoint.
No migration was changed or run.
No `.env` secret was read, printed, staged, or modified.
The active app remains on local preview storage until database persistence is tested in later batches.
```

#### v0.1.108 runner marker probe quoting failure

Error:
The v0.1.108 apply runner completed source patching, dependency install, readiness, encoding, diff check, and build successfully, but failed at the final marker probe.

Cause:
The inline Node probe in the PowerShell runner had broken quote escaping around the package marker. The source changes were verified separately with a here-string Node probe.

Fixed / Rolled back / Still open:
Fixed by stopping, diagnosing with git status and a corrected marker probe, then continuing only after all source markers passed. No commit/tag/push happened before diagnosis.

Prevention rule:
For inline Node probes in PowerShell, prefer here-string probes or JSON-safe scripts instead of dense one-line command strings with nested quotes.

Files or systems involved:
PowerShell runner, Node marker probe, package.json, Postgres driver batch.


## v0.1.109 Database Repository Implementation

This checkpoint replaces the database repository placeholder with a real repository factory while preserving the local preview product flow.

Done:

```text
Implemented `createDatabaseReportRepository({ userId })` in `lib/storage/database-report-repository.ts`.
The repository delegates list/get/save/delete/note/favorite/import/export operations to the database driver.
The active `getReportRepository()` path remains local-only.
No UI, route, migration, auth, payment, public report, or `.env` behavior changed.
Database readiness checks now require the database repository implementation.
```

Next safe step:

```text
v0.1.110 should add a controlled server persistence route or service that can save a generated report through the database repository when a beta user id and database config are available.
Do not switch the browser UI to database storage until that save/read path is verified.
```


## v0.1.110 Server Persistence Service

This checkpoint adds the first controlled server persistence service for reports without switching the active product UI away from local preview storage.

Done:

```text
Added `lib/storage/server-report-persistence.ts`.
Added `saveServerGeneratedReport({ userId, report })` for database-backed report saves.
Added `getServerStoredReport({ userId, reportId })` for database-backed report reads.
Added `listServerReportSummaries({ userId })` for database-backed report history summaries.
Extended database readiness checks to require the server persistence service.
No app route, UI, auth, profile, payment, migration, public report, or `.env` behavior changed.
```

Next safe step:

```text
Add a guarded beta API route or server action that calls the server persistence service only when database config and a beta user id are explicitly available.
Keep `/chart`, `/reports`, and `/reports/[reportId]` local-first until the route is verified.
```


## v0.1.111 Guarded Beta Report Persistence API

This checkpoint adds the first guarded beta API surface for database-backed report persistence without changing the public/local product flow.

Done:

```text
Added `app/api/reports/beta/route.ts`.
Added disabled-by-default beta persistence env flags to `.env.example` and `lib/config/env.ts`.
The beta route requires database config, explicit `HALLEUS_ENABLE_BETA_PERSISTENCE=true`, and a configured beta user id.
POST can save a generated report through the server persistence service.
GET can list report summaries or read one report record by report id.
Readiness checks now include the guarded beta API route and env markers.
```

Scope guard:

```text
No UI was connected to the route.
No auth/profile/payment/public report behavior was added.
No `.env` secret was read, printed, staged, or modified.
The active browser flow remains local-first until the API route is manually verified.
```

#### v0.1.111 runner untracked route guard failure

Error:
The v0.1.111 apply runner patched the guarded beta API files successfully but stopped before checks because its status guard expected the untracked route directory form instead of the exact untracked file path.

Cause:
Git reported `?? app/api/reports/beta/route.ts`, while the runner expected `?? app/api/reports/`.

Fixed / Rolled back / Still open:
Fixed by stopping, diagnosing with git status/diff and a corrected marker probe. No commit/tag/push happened before diagnosis.

Prevention rule:
For new nested files, runner status guards must allow the exact file path Git reports, not only the parent directory.

Files or systems involved:
PowerShell runner status guard, Git untracked path reporting, app/api/reports/beta/route.ts.


## v0.1.112 Beta API Verification Runbook

This checkpoint documents how to verify the guarded beta report persistence API before connecting any product UI to database storage.

Done:

```text
Added `docs/BETA_API_VERIFICATION_RUNBOOK.md`.
The runbook includes disabled-mode checks, enabled local/staging save/read/list checks, pass criteria, and failure handling.
The runbook explicitly blocks sharing `.env` secrets or real user birth data.
Database readiness checks now require the beta API verification runbook.
No app route, UI, storage behavior, database migration, package, or `.env` behavior changed.
```

Next safe step:

```text
Run the beta API verification runbook against a local or staging database.
If it passes, add a guarded/manual beta UI save path or a non-secret smoke test in a later batch.
Do not switch active report history/detail to database storage before verification.
```

#### v0.1.112 runbook Persian sample mojibake failure

Error:
The v0.1.112 runbook runner created the beta API verification runbook but stopped before checks because the synthetic Persian sample inside the PowerShell-to-Node patch became question-mark mojibake.

Cause:
Persian text was embedded through a PowerShell runner and Node stdin path that did not preserve those sample strings safely.

Fixed / Rolled back / Still open:
Fixed by stopping before commit/tag/push, diagnosing exact lines, and replacing the synthetic test sample with English-only non-sensitive test data. The rest of the docs/check patch had no mojibake.

Prevention rule:
Do not embed Persian sample data in generated PowerShell/Node runners. Use English synthetic data or UTF-8 file artifacts with targeted probes.

Files or systems involved:
docs/BETA_API_VERIFICATION_RUNBOOK.md, PowerShell runner, Node stdin patch, encoding probe.


## v0.1.113 Safe Beta API Preflight Script

This checkpoint adds a safe preflight script before manual beta API verification.

Done:

```text
Added `scripts/check-beta-api-preflight.mjs`.
Updated the beta API verification runbook to require structure/env/database preflight before HTTP checks.
Updated database readiness checks to include the preflight script.
The uploaded preflight context showed `.env` is not present locally, so real beta API verification is still blocked until local/staging env setup exists.
```

Safety lock:

```text
The preflight script never prints DATABASE_URL or HALLEUS_BETA_PERSISTENCE_USER_ID values.
Default mode can run without secrets and exits successfully when structure is valid.
`--require-env` is for env-shape gating.
`--check-db` is for local/staging DB table verification after migration setup.
No product UI is connected to database storage yet.
```


## v0.1.114 Local Beta API Verification

This checkpoint records the first successful end-to-end local database verification for the guarded beta report persistence API.

Verified:

```text
Local Docker Postgres was started as `halleus-postgres-local` using `postgres:16-alpine`.
The existing migration created the required user/report/birth-profile tables and indexes.
A local ignored `.env.local` existed for local-only verification; its values were not printed, committed, copied, or uploaded.
The beta preflight script passed `--require-env` and `--check-db` against the local database without printing secrets.
A synthetic user `beta-preview-user` was inserted because report rows require an existing `halleus_users.id`.
The beta API saved synthetic report `beta-test-report-001` via POST, read it back by report id via GET, and listed one summary.
The local database row count for `halleus_reports` was 1.
Tracked files remained clean during verification.
```

Scope lock:

```text
This is local verification only.
No UI was connected to database storage.
No production/staging database has been verified.
No auth/profile/payment/public report behavior was added.
Do not treat this as launch-ready persistence until the next guarded UI/server-action step is designed and checked.
```

Failure notes from v0.1.114:

```text
Docker CLI existed before the Docker Desktop daemon was running, so initial Docker commands failed with a daemon connection error.
The first Docker image pull for `postgres:16-alpine` returned a transient 403; after Docker was ready, a later pull succeeded.
The first beta API POST returned 500 because `halleus_reports.user_id` has a foreign key to `halleus_users.id`; inserting the synthetic beta user fixed the local verification path.
PowerShell/Docker table output can visually merge columns when pasted; use Docker `--format` for clean status output.
```


## v0.1.115 FK-safe Beta Persistence User Bootstrap

This checkpoint fixes the beta persistence FK setup path discovered during local DB verification.

Done:

```text
Added `lib/database/beta-persistence-user.ts`.
Updated `POST /api/reports/beta` to call `ensureBetaPersistenceUser` before saving a report.
Updated readiness checks and runbook docs for the FK-safe beta save path.
The helper only inserts/updates the configured `HALLEUS_BETA_PERSISTENCE_USER_ID` after the beta route guard passes.
```

Scope lock:

```text
This is not auth.
This is not a profile system.
This is not active UI database wiring.
This does not make reports public/indexable.
This does not change database migrations.
GET/list remain read-only; only POST performs beta user bootstrap before save.
```

## v0.1.116 Workflow Failure Ledger

Error:
Multiple v0.1.116 runner attempts failed before the final minimal exact-line apply.

Where/Version:
v0.1.116 manual beta DB save UI batch.

Cause:
The failed attempts used guessed or over-broad markers instead of exact verified live file lines. One failure targeted an exact ReportDetail handler block that did not match live content. Another targeted an ambiguous readiness-check marker. Another assumed an .env.example marker shape without proving it immediately before write.

Fixed / Rolled back / Still open:
Rolled back to clean v0.1.115 state after failed attempts. Final progress resumed only after exact live line inspection and a minimal two-file apply.

Prevention rule:
After any failed runner or marker failure, stop implementation, clean untracked artifacts, inspect exact live files/status, prove markers immediately before write, and reduce scope. Do not generate runners or patches from remembered structure or guessed markers.

Files or systems involved:
.env.example
components/ReportDetail.tsx
scripts/check-database-readiness.mjs
docs/HALLEUS_PROJECT_CONTEXT.md
PowerShell/Node patch runners

## v0.1.118 Workflow Failure Ledger

Error:
Guarded beta DB report archive apply failed before writing because the render-branch marker was too broad.

Where/Version:
v0.1.118 guarded beta DB report archive view.

Cause:
The first patch searched for a generic `if (reports.length === 0) {` marker using substring matching. It matched more than one location, so the script stopped with `Expected 1 match for beta database render branch, found 2`.

Fixed / Rolled back / Still open:
Fixed. The failed apply wrote no files. Status was checked, the duplicated marker location was diagnosed, and the apply was narrowed to exact-line guarded insertion before the local empty-state render branch.

Prevention rule:
After a marker failure, do not retry broadly. Check `git status --short`, inspect exact duplicate marker locations, then use exact-line markers or reduce scope.

Files or systems involved:
`components/ReportsList.tsx`, `app/reports/page.tsx`, PowerShell/Node apply patch workflow.


## v0.1.120 Staging/Render Beta DB Verification Runbook

This checkpoint documents the next staging verification gate for the guarded beta DB flow.

Current verified state before v0.1.120:

```text
Local/GitHub HEAD: 1e7adc2
Latest pushed tag: v0.1.119-beta-db-status-messages
Local beta DB flow verified:
- save report to DB
- read single DB report
- list beta DB archive summaries
- open DB report from archive
- show beta save/load status near the beta panel
Default local report flow remains active.
```

Added/updated docs:

```text
docs/BETA_API_VERIFICATION_RUNBOOK.md now includes a v0.1.120 Staging/Render beta DB verification checkpoint.
docs/HALLEUS_IDEA_GARDEN.md records the staging beta DB verification decision.
```

Still not verified:

```text
Render service name
Render auto-deploy setting
Render latest deployed commit
Render deploy status
Render public URL
Halleus.ir custom domain connection status
staging DATABASE_URL presence
staging beta env presence
staging migration/table state
staging /api/reports/beta behavior
staging /reports?source=beta-db behavior
```

Scope lock:

```text
This is docs/runbook only.
No source/runtime files changed.
No deploy action was performed.
No Render dashboard state was changed.
No production beta persistence was enabled.
Do not claim the beta DB flow is deployed until Render/public URL verification passes.
```


## v0.1.121 Render Deploy State Record

This checkpoint records the latest verified Render deployment facts without changing runtime code or enabling staging database persistence.

Verified Render facts:

```text
Render service/project observed: astro-clean / My project
Latest Render deploy status: live
Latest deployed commit: fb9c697
Deploy message: Add staging beta DB verification runbook
Auto-deploy: on commit
Public Render URL: https://astro-clean-98ug.onrender.com/
Custom domain observed/listed: halleus.ir
```

Database/staging facts:

```text
Postgres/database service: no visible Postgres service in the Render project overview.
Remote beta API check from local PowerShell to https://astro-clean-98ug.onrender.com/api/reports/beta returned no response / unable to connect to the remote server.
Staging beta DB persistence is not verified.
Production/public DB persistence is not enabled.
```

State boundary:

```text
GitHub push through fb9c697 is verified.
Render deploy through fb9c697 is now recorded as live from dashboard observation.
This does not verify staging database env, migrations, or beta API behavior.
This does not prove Halleus.ir fully routes to the latest app until public domain route checks are separately performed.
Do not claim beta DB is staging-ready until a visible database service/env/migration/API smoke test passes.
```

Next gated step:

```text
If continuing DB staging work, create or identify a Render Postgres service, configure staging env keys without printing values, apply migrations, then run the v0.1.120 staging beta DB verification checklist.
If continuing public deployment verification, smoke-test the Render URL and Halleus.ir routes separately without mixing that with DB enablement.
```
