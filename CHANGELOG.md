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


## v0.1.16 - Locations v1

- Added an Iran city location dataset with city ids, names, province names, coordinates, and timezone ids.
- Added optional birth location metadata to BirthInput.
- Added a city datalist to the chart form.
- Attached selected city metadata to newly generated reports.
- Added a manual UI text guide for future Persian label cleanup.

## v0.1.17 - Homepage visual polish

- Added scoped homepage visual polish without changing page structure.
- Improved hero presentation, trust strip, demo steps, feature cards, and next-step section.
- Kept this batch CSS-only for safer visual iteration.


## v0.1.18 - Halleus homepage brand polish

- Updated public-facing brand references from Astro Clean to Halleus.
- Normalized public URL references toward halleus.ir.
- Reduced the homepage hero headline scale.
- Kept the page structure unchanged.


## v0.1.19 - Product foundation

- Finished the first Halleus product foundation pass.
- Added/resumed Iran city location data.
- Added optional location metadata to birth input.
- Connected the chart form to the city datalist.
- Added a product status document with current progress estimates.


## v0.1.19 - Full Iran city dataset

- Replaced the small city preview with the full user-provided Iran city dataset.
- Added 897 city/location records with coordinates and Asia/Tehran timezone metadata.
- Added city display names that include province names to reduce duplicate city ambiguity.
- Connected the chart form datalist to the full city list.
- Added dataset and product status docs.


## v0.1.20 - Storage foundation

- Added provider-neutral storage types and report repository contract.
- Added report record helpers for future database-backed reports.
- Added storage architecture and database schema draft docs.
- Kept this batch UI-free so product behavior stays stable.


## v0.1.21 - Storage adapter implementation

- Added local ReportRepository implementation.
- Added repository facade for future database driver switching.
- Added database repository placeholder.
- Added report-record migration helpers.
- Added missing note storage helper exports when needed.
- Kept this batch UI-free so current behavior stays stable.


## v0.1.22 - Repository-backed reports

- Moved reports list reads, deletes, favorites, clear, import, and export toward the repository layer.
- Moved report detail loading and note saving toward the repository layer.
- Preserved the current UI and local-preview behavior.
- Kept backward-compatible import support for older report JSON payloads.


## v0.1.23 - Storage UI completion

- Added storage event helper.
- Added report write and query services.
- Connected chart creation to the repository-backed save path.
- Added a storage foundation checker.
- Added the storage checker to project health checks.
- Added storage UI completion documentation.

## v0.1.24 - Account and database foundation

- Added Halleus brand and domain config.
- Added account/session/profile/plan entitlement types.
- Added preview account repository and account repository contract.
- Added account and environment documentation.
- Added account foundation checker and wired it into project checks.

## v0.1.25 - Profile and dashboard account readiness

- Rebuilt dashboard as an account-ready preview surface.
- Rebuilt profile as a preview account and entitlement surface.
- Connected dashboard/profile to storage query and account repository foundations.
- Added account UI readiness documentation.

## v0.1.26 - Database readiness foundation

- Added runtime environment helper.
- Added database driver contract and not-configured driver.
- Added report database row mapper.
- Added initial Postgres-compatible schema draft and development seed placeholder.
- Added database readiness checker and wired it into project checks.
- Added database readiness and migration runbook documentation.

## v0.1.27 - Auth readiness and migration prep

- Added auth provider and auth driver types.
- Added preview auth driver and auth driver factory.
- Added auth readiness report and provider options.
- Added local-preview to account migration helpers.
- Added auth readiness, provider decision, and migration documentation.
- Added auth readiness checker and wired it into project checks.

## v0.1.28 - Billing and pricing readiness

- Added billing and subscription types.
- Added billing plan catalog and feature gate helpers.
- Added payment driver contract and preview payment driver.
- Added billing readiness report.
- Added public pricing page.
- Added billing readiness checker and documentation.

## v0.1.29 - Product surface cleanup

- Added central product surface link map.
- Added product map page.
- Reworked privacy, roadmap, and wiki pages around the Halleus preview stage.
- Added product surface documentation and checker.
- Wired product surface checks into project checks.

## v0.1.30 - Chart engine foundation

- Added chart engine input/result/readiness types.
- Added chart engine driver contract and mock preview engine.
- Added deterministic chart engine fixtures.
- Added engine readiness page.
- Added chart engine foundation and strategy documentation.
- Added chart engine foundation checker and wired it into project checks.

## v0.1.31 - Report quality foundation

- Added report quality types and section blueprint.
- Added Halleus report tone profile and safety rules.
- Added report quality checker and report blueprint.
- Added public report quality page.
- Added interpretation style guide and report quality documentation.
- Added report quality checker script and wired it into project checks.

## v0.1.32 - Interpretation modules foundation

- Added interpretation types and module blueprints.
- Added interpretation driver contract and mock interpretation driver.
- Added sample interpretation preview.
- Added public interpretation pipeline page.
- Added report composition pipeline documentation.
- Added interpretation foundation checker and wired it into project checks.

## v0.1.33 - Report output V2 integration

- Added sectioned report output types.
- Added report output V2 enhancer.
- Added report V2 section renderer.
- Connected new report generation to V2 sectioned preview output.
- Added report output V2 documentation and checker.

## v0.1.34 - Report output V2 UX polish

- Improved V2 report section renderer.
- Added fallback enhancement so existing reports can render V2 sections.
- Added V2 plain text export helper.
- Added report output V2 UX documentation and checker.

## v0.1.35 - Report output V2 actions

- Added TXT download action for sectioned report output.
- Added copy-to-clipboard action for sectioned report output.
- Improved visible report utility for new and existing reports.
- Added report output V2 actions documentation and checker.

## v0.1.36 - Report output V2 readability

- Added report output V2 metrics.
- Added section selector for sectioned report output.
- Added word count, reading time, section count, and quality score display.
- Added report output V2 readability documentation and checker.

## v0.1.37 - Persian language system

- Added language types and readiness report.
- Added controlled Finglish phrase map and converter foundation.
- Added Persian product copy registry.
- Added public language system page.
- Added product surface language link.
- Added Persian language system documentation and checker.

## v0.1.38 - Report experience V3

- Added Report Output V3 types and enhancer.
- Added Report V3 plain text export.
- Added visible ReportV3Experience component.
- Connected report detail to V3 display.
- Added report experience V3 documentation and checker.

## v0.1.39 - Chart engine integration path

- Added fixture chart engine.
- Switched chart engine factory to fixture engine.
- Added chart engine report metadata.
- Connected generated report saving to chart engine metadata attachment.
- Added visible chart engine report badge.
- Added chart engine integration documentation and checker.
