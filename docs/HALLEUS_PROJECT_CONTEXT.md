# Halleus Project Context

Last updated: 2026-06-26

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

Verified local state from the latest provided git output:

```text
Local HEAD: a0deb31 / v0.1.76-site-chrome-navigation-fix
Previous local milestone: 0c8bfd7 / v0.1.75-site-chrome-minimal-ui-cleanup
GitHub origin/main: c0cf764 / v0.1.74-chart-page-minimal-product-polish
Branch relation: main is ahead of origin/main by 2 commits
Render state: unknown until verified
Public/live state: unknown until verified
```

Important rule:

```text
Local commit/tag state, GitHub push state, Render deploy state, and public/live production state must be tracked separately.
```

A local commit is not live. A GitHub push is not a Render deploy. `Halleus.ir` is the domain identity, not proof that the latest version is deployed.

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

Release warning:

```text
As of latest git output, v0.1.75 and v0.1.76 are local only.
origin/main is still c0cf764 / v0.1.74.
Do not call v0.1.75 or v0.1.76 live until pushed and deployed.
```

## 7. Current product state

Current local HEAD:

```text
a0deb31 / v0.1.76-site-chrome-navigation-fix
```

Current GitHub origin/main from latest git output:

```text
c0cf764 / v0.1.74-chart-page-minimal-product-polish
```

Known working locally from v0.1.73-v0.1.76 context:

```text
/chart works locally
Jalali date picker works
BirthInput.birthDate remains Gregorian ISO
birthCountry: "ایران" is preserved internally
country UI is removed
chart page has been polished
report generation works locally
report detail works locally
site chrome was cleaned and then navigation/brand feedback was fixed locally
```

Known or likely from earlier product work, but verify before relying on it:

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
whether a0deb31 is pushed to GitHub
whether v0.1.75 and v0.1.76 tags are pushed to GitHub
Render deploy state
public/live production state
Halleus.ir domain connection state
current public route behavior
whether /order stores, sends, or only displays/copies manual order context
current production data/privacy posture
```

## 8. Local vs GitHub vs Render state

Every meaningful batch must record these separately.

### Local state

Latest known local state:

```text
Local HEAD: a0deb31
Local tag at HEAD: v0.1.76-site-chrome-navigation-fix
Branch: main
Branch status: ahead of origin/main by 2 commits
Tracked status: clean according to latest git output; only untracked runner/helper files were present
```

### GitHub state

Latest known GitHub state:

```text
origin/main: c0cf764 / v0.1.74-chart-page-minimal-product-polish
v0.1.75 pushed: unknown / likely not pushed if origin/main is still v0.1.74
v0.1.76 pushed: unknown / likely not pushed if origin/main is still v0.1.74
```

Must verify with:

```powershell
git ls-remote --heads origin main
git ls-remote --tags origin v0.1.75-site-chrome-minimal-ui-cleanup
git ls-remote --tags origin v0.1.76-site-chrome-navigation-fix
```

### Render state

Latest known Render state:

```text
Render service name: unknown
Connected GitHub repo: unknown
Auto-deploy enabled: unknown
Latest Render deploy commit: unknown
Latest Render deploy status: unknown
Render public URL: unknown
```

### Public/live state

Latest known public/live state:

```text
Public URL: unknown
Custom domain: Halleus.ir is identity, connection unknown
Halleus.ir connected: unknown
SSL/domain status: unknown
Last production QA date: unknown
Observed deployed version/commit: unknown
```

Required public smoke routes after deployment:

```text
/
/chart
/reports
/product
/pricing
/order
/privacy
```

Never call a feature live only because it works locally. Never call a GitHub push deployed until Render is verified. Never treat Halleus.ir as connected to the latest app until domain and public route QA are verified.

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

Current rough estimates after local v0.1.76, before GitHub/Render verification:

```text
Product vision clarity: 80%
Core chart/report flow: 75-85% local / live unknown
Report quality/value: 35-55%
UI/brand maturity: 55-65% local / live unknown
Sales/order flow: 35-50% local / live unknown
Admin/operations: 15-25%
Data/privacy readiness: 35-45%
Deployment/GitHub/Render readiness: low/unknown until audit
Public launch readiness: local 25-45% / live unknown
Business readiness: 25-35%
Engineering reliability: 55-65%
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

Recommended near-term order after this context update:

### 1. Push local work to GitHub

Goal:

```text
Move local a0deb31 / v0.1.76 and all relevant tags to GitHub.
```

Do this only after the context update succeeds and the working tree is clean.

### 2. GitHub/Render/public state verification

Goal:

```text
Verify what is local, what is pushed to GitHub, what Render deployed, and what public users can see.
```

Type:

```text
deployment-related audit/docs
```

Possible files:

```text
docs/HALLEUS_PROJECT_CONTEXT.md
docs/DEPLOYMENT_STATE.md or docs/RELEASE_STATUS.md if needed
scripts/check-deployment-state-context.mjs
package.json if a check is added
```

Avoid product feature changes.

### 3. Report value/readability polish

Goal:

```text
Make report output feel more valuable, readable, and paid-product-worthy.
Reduce debug/demo feel.
Improve structure and copy.
```

Avoid changing chart input or site chrome in the same batch.

### 4. Manual order capture/admin readiness

Goal:

```text
Move manual order from copy-only or shell toward a process-ready request flow.
Keep payment/backend optional for now.
Clarify where a request goes and how it can be reviewed.
```

Avoid mixing this with report quality or chrome redesign.

### 5. Deployment/domain hardening

Goal:

```text
If Render deploy is healthy, verify or configure Halleus.ir, DNS, SSL, and public smoke QA.
```

Do not change product code in the same batch.

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

These must be verified explicitly before being treated as true:

```text
Is a0deb31 pushed to GitHub?
Are tags v0.1.75, v0.1.76, and v0.1.77 pushed to GitHub?
What is origin/main after push?
Is Render connected to the GitHub repo?
Is Render auto-deploy enabled?
What commit is currently deployed on Render?
What is the current public Render URL?
Is Halleus.ir connected and live?
Which routes are currently visible in header/footer on the public site?
Does /order currently store, send, or only display/copy manual order context?
What is the current production data/privacy posture?
```
