# Release Test Plan

## Purpose

This file defines the manual QA flow for Astro Clean MVP.

Use it before:

- showing the MVP to someone
- deploying the frontend
- creating a new release tag
- starting a bigger technical phase

## Required automated checks

Run:

pnpm lint
pnpm build
git status

Expected result:

- lint passes
- production build passes
- working tree is clean

## Manual route test

Open these routes:

- /
- /chart
- /dashboard
- /reports
- /profile
- /admin
- /roadmap
- /wiki
- /wrong-test

Expected result:

- all real routes load without errors
- /wrong-test shows the Persian 404 page
- navigation active state works
- mobile navigation does not break layout

## Demo data reset

Go to:

/admin

Click:

Reset all demo data

Expected result:

- saved reports are cleared
- profile returns to default state
- Admin shows local data status correctly

## Empty state test

After demo data reset:

Open:

/dashboard
/reports

Expected result:

- Dashboard shows empty state
- Reports shows empty state
- CTA buttons work

## Chart flow test

Go to:

/chart

Create a report with sample data:

- Name: آراز
- Birth date: any valid date
- Birth time: any valid time
- City: تهران
- Country: ایران

Expected result:

- report is created
- report is saved locally
- Sun, Moon, Rising are shown
- birth details are shown
- safety disclaimer is visible
- copy share text works

## Reports test

Go to:

/reports

Expected result:

- saved report appears
- copy share text works
- individual delete works
- clear all reports works

## Dashboard test

Go to:

/dashboard

Expected result:

- latest report appears
- dashboard stats appear
- link to all reports works

## Profile test

Go to:

/profile

Set:

- display name
- bio
- privacy mode

Refresh page.

Expected result:

- profile data remains saved in localStorage
- preview card updates correctly

## Admin test

Go to:

/admin

Expected result:

- MVP status card appears
- local data status appears
- demo data controls work
- feature flags appear
- future features are disabled

## SEO route test

Open:

/sitemap.xml
/robots.txt

Expected result:

- sitemap loads
- robots.txt loads
- URLs use NEXT_PUBLIC_SITE_URL or localhost fallback

## Production preview test

Run:

pnpm build
pnpm start -- -p 3001

Open:

http://localhost:3001

Expected result:

- production preview works
- main routes load
- Chart, Reports, Dashboard, Profile, Admin work

Stop server with:

Ctrl + C

## Release decision

If all tests pass, the MVP is safe to treat as a stable frontend release.
