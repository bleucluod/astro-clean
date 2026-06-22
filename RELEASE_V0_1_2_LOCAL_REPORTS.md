# Astro Clean v0.1.2 Local Reports Release

## Release goal

This release turns Astro Clean from a simple local MVP into a stronger local report workspace.

The app still has no backend, database, authentication, payment, or AI integration.

## Main additions since v0.1.1-polish

### Reports

- saved report detail pages
- report search
- report sorting
- favorite reports
- personal notes per report
- single report JSON export
- missing-report empty state

### Dashboard

- report count
- favorite count
- note count
- latest report section
- recent report quick links
- favorite report quick links

### Admin and local data

- local data status includes reports, favorites, notes, profile, privacy mode
- local JSON backup includes reports, profile, favorites, and notes
- demo reset clears reports, favorites, and notes

### Chart flow

- after creating a chart, user is redirected to the saved report detail page

## Product boundaries

This release intentionally does not include:

- real astrology calculations
- backend
- database
- authentication
- payments
- AI integration
- public indexed profiles
- programmatic SEO pages
- public account pages

## SEO future note

Future public account and public report pages may support indexable SEO pages, but only after explicit privacy controls, user consent, canonical URL strategy, noindex/index rules, and quality controls for generated keyword content.

This release does not implement public SEO pages.

## Quality status

Before tagging this release, run:

pnpm lint
pnpm build
git status

Expected result:

- lint passes
- production build passes
- working tree is clean after commit
