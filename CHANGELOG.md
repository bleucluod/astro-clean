# Changelog

## v0.1.1-polish

Frontend MVP polish release.

### Added

- Loading state فارسی
- Error state فارسی
- Centralized navigation config
- Mobile navigation polish
- MVP status card in Admin
- Local data status card in Admin
- Dashboard stats
- Individual report deletion
- Birth details in report cards
- Shared safety disclaimer
- Internal links between Roadmap and Wiki
- Demo flow section on Home
- Deployment notes
- Environment example file

### Improved

- Home page demo readiness
- Chart form experience
- Profile experience
- Reports empty states
- Dashboard empty states
- Admin demo controls
- SEO config structure

### Still not included

- Real astrology calculations
- Backend
- Database
- Authentication
- Payments
- AI integration
- Programmatic SEO
- Real admin panel

## Unreleased

### Added

- User-facing privacy and local data transparency page
- Privacy route in navigation
- Privacy route in sitemap

## Unreleased

### Added

- Single saved report detail page at `/reports/[reportId]`
- Detail links from the Reports archive
- Missing-report empty state for localStorage-only reports

## Unreleased

### Added

- Single saved report detail page at `/reports/[reportId]`
- Detail links from the Reports archive
- Missing-report empty state for localStorage-only reports

## Unreleased

### Added

- Search saved reports
- Sort saved reports by newest or oldest
- Result count in Reports archive
- No-result state for report search

## Unreleased

### Added

- Favorite saved reports
- Favorites filter in Reports archive
- Favorite report IDs in local JSON backup
- Favorite count in Admin local data status

## Unreleased

### Added

- Personal notes for saved reports
- Report notes included in Reports search
- Report notes included in local backup export/import
- Report notes count in Admin local data status

## Unreleased

### Added

- Upgraded Dashboard with report, favorite, and note stats
- Recent reports quick links
- Favorite reports quick links
- Latest report detail link from Dashboard

## Unreleased

### Improved

- Chart creation now redirects directly to the saved report detail page
- Chart creation dispatches local data update events

## Unreleased

### Added

- Single saved report JSON export from report detail pages
- Single report export includes report data, note, and favorite state

## v0.1.2-local-reports

### Added

- Local report detail pages
- Search and sorting for saved reports
- Favorite reports
- Personal notes for reports
- Single report JSON export
- Upgraded Dashboard with local report stats
- Chart creation redirect to saved report detail page
- Full local backup support for favorites and notes

### Not added

- Public SEO report pages
- Public account pages
- Real astrology calculations
- Backend or database

## Unreleased

### Improved

- Home page messaging for first-time users
- Demo flow clarity
- Local data transparency on the landing page
- Future public SEO direction documented in product copy

## Unreleased

### Improved

- Reports archive visual hierarchy
- Reports toolbar and filter tab styling
- Dashboard section and quick link styling
- Mobile layout polish for report actions

## Unreleased

### Improved

- Chart form visual hierarchy
- Report detail note card styling
- Single report export card styling
- Mobile layout polish for chart and report detail actions

## Unreleased

### Improved

- Privacy page visual clarity
- Admin local data card styling
- Admin backup panel styling
- Demo control spacing and mobile layout

## Unreleased

### Improved

- Final mobile spacing
- Mobile button layout
- Card spacing and hover polish
- Final visual QA checklist

## Unreleased

### Added

- Deploy-ready checklist
- Public demo plan
- Provider-neutral production preview checklist

### Clarified

- Public SEO account/report pages are planned for the future but not active yet

## Unreleased

### Added

- Deployment status card in Admin
- Quick links to sitemap and robots from Admin
- Public SEO inactive status in Admin

## v0.1.4 — Public Domain

### Added

- Connected the project to the public domain `halleus.ir`.
- Verified Cloudflare DNS, Render hosting, HTTPS, sitemap, and robots routes.
- Added public-domain release notes.

## v0.1.6 - Iran form defaults

- Set chart form default city to Tehran.
- Set chart form default country to Iran.
- Kept the UI layout unchanged to avoid unnecessary risk.
- Verified production deployment on halleus.ir.

## v0.1.5 - Stable recovery

- Recovered production after unstable UI and encoding patches.
- Reapplied stable Persian UTF-8 engine text fixes.
- Removed temporary stash from failed repair attempt.
- Added recovery documentation and next-step planning.
- Confirmed the public site is stable again.

## Recovery lesson

Large automated patches against TSX and Persian text are high-risk. Future UI edits must be small, inspected, and tested locally before push.


## v0.1.11 - Report layout polish

- Improved report card visual structure.
- Added a dedicated summary section.
- Converted interpretation lines into numbered insight cards.
- Improved the visual treatment of the symbolic notice.
- Avoided adding new Persian UI strings through scripts.


## v0.1.12 - Report UI and text export

- Improved report card layout without injecting new Persian UI strings.
- Added a dedicated summary container.
- Converted interpretations into numbered insight cards.
- Added TXT export for single reports.
- Kept UTF-8 safety checks in the batch workflow.


## v0.1.13 - Reports UX v2

- Added visible-list TXT export for reports.
- Added visible-list JSON export for reports.
- Reused the existing share text generator for archive text output.
- Added archive payload metadata for backup and future import work.
- Kept this batch ASCII-only to protect Persian UTF-8 content.


## v0.1.14 - Dev safety checks

- Added an encoding guard script.
- Added a temporary batch-file cleanup script.
- Added a project health script.
- Added a combined project check command.
- Updated the pre-deploy checklist with the safer command.


## v0.1.15 - Reports backup import

- Added full reports JSON export.
- Added JSON import for report backups.
- Added import guards for single-report and archive payloads.
- Added duplicate protection during import.
- Kept this batch ASCII-only to protect Persian UTF-8 content.
