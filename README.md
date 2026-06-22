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
