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

## v0.1.2 local reports QA addendum

Additional manual checks:

- create a chart from `/chart`
- confirm redirect to `/reports/[reportId]`
- save a personal note on report detail page
- export a single report JSON file
- confirm exported single report includes report, note, and isFavorite
- go to `/reports`
- search by text inside the note
- mark a report as favorite
- filter by favorites
- sort newest / oldest
- delete a report and confirm its note is removed
- go to `/dashboard`
- confirm report, favorite, and note counts
- confirm recent report links work
- confirm favorite report links work
- go to `/admin`
- confirm local data status includes reports, favorites, and notes
- export full local backup JSON
- confirm backup includes favoriteReportIds and reportNotes
- reset all demo data
- confirm reports, favorites, and notes are cleared

Expected result:

All checks pass without backend or database.

## Final visual QA addendum

Before deployment preparation, manually check:

- Home on desktop
- Home on mobile width
- Chart form on mobile width
- Reports archive with multiple reports
- Reports search and favorites filter
- Report detail page with a personal note
- Dashboard with reports, favorites, and notes
- Privacy page
- Admin page and backup controls

Expected result:

- no horizontal scrolling
- buttons are easy to tap on mobile
- cards have enough spacing
- Persian text is readable
- main CTAs are obvious
- localStorage limitation is clear
- no page claims public SEO pages are active yet

## Deploy readiness QA addendum

Before a public frontend demo, verify:

- Home clearly explains the current MVP
- Chart redirects to report detail
- Reports search, sort, favorites, and notes work
- Dashboard stats work
- Privacy page explains localStorage
- Admin backup/export works
- sitemap.xml loads
- robots.txt loads
- public SEO account/report pages are not active yet
