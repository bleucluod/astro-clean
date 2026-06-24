# Halleus Storage Adapter Implementation

This phase introduces a local repository implementation for the storage contract.

## What changed

- ReportRepository now has a local implementation.
- Current browser storage behavior is still preserved.
- A database repository placeholder exists, but is not wired yet.
- Migration helpers exist for report-record export/import payloads.

## Why this matters

The report UI should eventually depend on the repository contract, not directly on localStorage.

That will allow this path:

1. localStorage preview
2. repository-backed UI
3. account-based database storage
4. import local preview reports into account storage

## Next recommended phase

Refactor one page at a time to use the repository layer.

Start with the reports list, then report detail, then chart creation.

## Repository-backed reports

The first UI surfaces now call the repository layer:

- reports list
- report detail

This keeps the current local-preview behavior while reducing direct localStorage coupling in product UI.

## Chart creation storage path

Chart creation now saves generated reports through `saveGeneratedReport`.

This keeps local-preview behavior while preparing the generated report flow for future database-backed storage.
