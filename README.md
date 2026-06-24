# Astro Clean

Astro Clean یک MVP فارسی‌زبان برای تجربه آسترولوژی نمادین است.

هدف فعلی پروژه این است که سریع به یک محصول قابل دیدن، ساده، تمیز و دوست‌داشتنی برسیم؛ بدون backend، دیتابیس، Docker یا معماری سنگین.

## Tech Stack فعلی

* Next.js
* TypeScript
* App Router
* CSS ساده
* localStorage برای ذخیره موقت
* Git محلی برای checkpointها

## قابلیت‌های MVP

* Home فارسی و RTL
* فرم ساخت چارت تولد mock
* mock astrology engine برای Sun, Moon, Rising
* rule engine ساده برای متن تفسیری فارسی
* ذخیره گزارش‌ها در localStorage
* نمایش گزارش‌ها در Reports
* نمایش آخرین گزارش در Dashboard
* پروفایل ساده با localStorage
* Admin نمایشی برای feature flags و demo data
* Roadmap آینده محصول
* Astro Wiki ساده برای پایه SEO
* sitemap و robots ساده
* صفحه 404 فارسی

## اجرای پروژه

اول وارد پوشه پروژه شو:

cd C:\Projects\astro-clean

اگر dependencyها لازم بود نصب شوند:

pnpm install

اجرای dev server:

pnpm dev

بعد در مرورگر باز کن:

http://localhost:3000

وقتی pnpm dev اجراست، همان ترمینال مخصوص dev server است. برای دستورهای Git، lint یا build یک ترمینال دوم باز کن.

## چک سلامت

pnpm lint

pnpm build

git status

خروجی خوب یعنی:

* lint بدون error
* build موفق
* git status برابر nothing to commit, working tree clean

## مسیرهای MVP

* /
* /chart
* /dashboard
* /reports
* /profile
* /admin
* /roadmap
* /wiki

## قوانین محتوایی

تحلیل‌ها در Astro Clean به عنوان تفسیر نمادین، سرگرمی و خودشناسی ارائه می‌شوند.

این محصول نباید پیش‌بینی قطعی یا توصیه پزشکی، مالی، حقوقی یا تصمیم‌گیری جدی ارائه کند.

## چیزهایی که فعلاً عمداً نداریم

* backend جدا
* database
* auth
* Docker
* Prisma
* NestJS
* PostgreSQL
* Redis
* payment
* AI integration
* programmatic SEO سنگین

این موارد فقط بعد از پایدار شدن MVP فرانت‌اند بررسی می‌شوند.

## Git محلی

بعد از هر تغییر موفق:

git status

git add .

git commit -m "Your commit message"

برای دیدن آخرین commitها بدون گیر کردن در حالت Git pager:

git --no-pager log --oneline -8

## Deployment readiness

The project supports a public site URL through:

NEXT_PUBLIC_SITE_URL

For local development, the fallback is:

http://localhost:3000

Before any deployment, run:

pnpm lint
pnpm build
git status

Also review:

DEPLOYMENT_NOTES.md

## Project documents

Useful project documents:

- `MVP_CHECKLIST.md` — checklist of completed and remaining MVP work
- `MVP_RELEASE_SUMMARY.md` — summary of the current MVP release
- `CHANGELOG.md` — release history and notable changes
- `DEPLOYMENT_NOTES.md` — deployment preparation notes
- `RELEASE_TEST_PLAN.md` — manual QA flow before demo or deploy
- `FINAL_QA_NOTES.md` — known limitations and QA notes
- `NOTES_FOR_NEXT_STEPS.md` — suggested next product directions

## Current local release tags

- `v0.1.0-mvp`
- `v0.1.1-polish`

Use this command to see local tags:

git tag --list

Use this command to inspect recent history:

git --no-pager log --oneline -10

## Data and privacy

Astro Clean MVP stores data locally in the browser.

Current local data:

- saved reports
- local profile
- privacy mode setting

The project does not currently include:

- backend
- database
- authentication
- real user accounts
- server-side persistence
- payments
- AI integration

User-facing privacy and local data information is available at:

/privacy

## Report detail pages

Saved reports have local detail routes:

/reports/[reportId]

These pages currently read from localStorage, so they only work in the browser where the report exists. They are not permanent public links yet because the MVP has no backend or database.

## Report detail pages

Saved reports have local detail routes:

/reports/[reportId]

These pages currently read from localStorage, so they only work in the browser where the report exists. They are not permanent public links yet because the MVP has no backend or database.

## Reports archive

The Reports page supports:

- saved report list
- local detail links
- search across saved report data
- newest / oldest sorting
- result count
- individual report deletion
- clear all reports

Reports are still localStorage-only in this MVP.

## Favorite reports

Saved reports can be marked as favorites.

Favorite report IDs are stored in localStorage separately from reports and are included in local JSON backups.

## Report notes

Saved report detail pages support personal notes.

Notes are stored in localStorage and included in local JSON backups. Reports search also searches inside saved notes.

## Dashboard

The Dashboard now shows:

- total saved reports
- favorite report count
- personal note count
- latest saved report
- recent report links
- favorite report links
- quick links to Chart, Reports, and Admin

## Chart creation flow

After creating a chart, the user is redirected to the saved report detail page:

/reports/[reportId]

This keeps the flow focused on the generated report and its personal notes.

## Single report export

Saved report detail pages support exporting a single report as JSON.

The export includes:

- report data
- personal note
- favorite state

## Deploy preparation addendum

Before public deployment, review:

- DEPLOY_READY_CHECKLIST.md
- PUBLIC_DEMO_PLAN.md

Important:

Public indexed account/report pages are planned for the future, but they are not active in this release.

## Deployment status card

The Admin page includes a deployment status card showing:

- current site URL
- SEO route count
- sitemap link
- robots link
- public SEO status
- backend status

Public indexed account/report pages are still intentionally not active.

## Public domain

Astro Clean is now available at:

https://halleus.ir

## Product status

Astro Clean is a Persian-first astrology MVP focused on symbolic birth-chart interpretation.

Current production URL:

- https://halleus.ir

Current MVP scope:

- Public landing page
- Mock birth chart form
- Local report generation
- Local report list
- Symbolic interpretation engine v0
- Public roadmap and wiki pages
- SEO basics: metadata, sitemap, robots
- Custom domain through Cloudflare and Render

Important constraint:

Astro Clean does not present astrology as scientific certainty. All outputs should remain symbolic, interpretive, and reflective. The app must not provide medical, legal, financial, or deterministic advice.

## Current architecture

The app currently uses:

- Next.js App Router
- TypeScript
- LocalStorage for saved reports
- Simple symbolic astrology engine
- Render deployment from GitHub main branch
- Cloudflare DNS for halleus.ir

Future architecture should keep these layers separate:

1. Raw astrology data
2. Rule engine
3. Interpretation and presentation layer
4. Future AI naturalization layer

## Stable recovery tags

Known stable tags:

- v0.1.5-stable-recovery
- v0.1.6-iran-form-defaults

## Development rule

Use small, inspectable UI edits. Avoid large automated TSX rewrites, especially when Persian text is involved.
