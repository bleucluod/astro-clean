# Halleus Storage Architecture

This is the storage contract for the next product phase.

## Goal

Move from browser-only storage to account-based database storage without rewriting the report UI again.

## Current storage

The current preview uses local browser storage for fast product testing.

This is still useful because it has already proven the data model:
birth input, generated report, notes, favorites, export, and import.

## Target storage

The future storage path should be:

1. Local preview storage.
2. Storage adapter contract.
3. Account-based database storage.
4. Migration/import from local preview into account storage.

## Repository contract

The product should talk to a ReportRepository instead of directly talking to localStorage.

The repository handles:

- listReports
- getReport
- saveReport
- deleteReport
- clearReports
- setFavorite
- setNote
- exportReports
- importReports

## Database candidate tables

### users

- id
- email
- display_name
- created_at
- updated_at

### reports

- id
- user_id
- report_json
- note
- favorite
- visibility
- created_at
- updated_at

### birth_profiles

Optional later table when users can save multiple birth profiles.

- id
- user_id
- name
- birth_date
- birth_time
- birth_city
- birth_country
- birth_city_id
- birth_latitude
- birth_longitude
- birth_timezone
- created_at
- updated_at

## Rule

Do not build paid features until account storage and real chart calculation exist.
