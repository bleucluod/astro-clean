# Halleus Beta API Verification Runbook

This runbook verifies the disabled-by-default beta report persistence API before any product UI is connected to database storage.

## Scope

Route under verification:

```text
app/api/reports/beta/route.ts
```

This route is a beta persistence surface only. It is not the public report system, not the account system, and not a paid/private report system.

## Secret safety

Never paste, print, commit, screenshot, or upload `.env` values.

Allowed to share:

```text
.env.example
HTTP status codes
shape of JSON responses
redacted report ids
redacted database provider names
```

Forbidden to share:

```text
DATABASE_URL
AUTH_SECRET
payment secrets
raw user birth data from real users
production database rows
```

## Preconditions

Run this only against local development or a staging database.

Required local environment values:

```text
DATABASE_URL=<local-or-staging-postgres-url>
HALLEUS_ENABLE_BETA_PERSISTENCE=true
HALLEUS_BETA_PERSISTENCE_USER_ID=beta-preview-user
```

Do not enable this route for production users until auth/profile/privacy design exists.

## Safe preflight script

Before running the HTTP checks, use the safe preflight script. It does not print `.env` values.

Structure-only mode is safe to run without configured secrets:

```powershell
node scripts/check-beta-api-preflight.mjs
```

After local/staging env values are configured in your terminal, require the env shape:

```powershell
node scripts/check-beta-api-preflight.mjs --require-env
```

After the migration has been applied to a local/staging database, verify connection and required table names without printing the database URL:

```powershell
node scripts/check-beta-api-preflight.mjs --check-db
```

Expected safety behavior:

```text
DATABASE_URL value is never printed
HALLEUS_BETA_PERSISTENCE_USER_ID value is never printed
missing env makes --require-env fail before API verification
missing tables make --check-db fail before API verification
```

## Disabled-mode check

With `HALLEUS_ENABLE_BETA_PERSISTENCE=false` or without `DATABASE_URL`, the route must not become an active public persistence surface.

Expected behavior:

```text
missing DATABASE_URL -> 503
beta flag disabled -> 404
missing beta user id -> 503
```

PowerShell shape check:

```powershell
$response = Invoke-WebRequest -Method GET -Uri "http://localhost:3000/api/reports/beta" -SkipHttpErrorCheck
$response.StatusCode
$response.Content
```

## Enabled local/staging check

Start the app with local/staging environment values configured, then run:

```powershell
pnpm dev
```

In a second terminal, first verify the list endpoint:

```powershell
$list = Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/reports/beta"
$list.ok
$list.summaries.Count
```

The beta route bootstraps the configured beta user before saving a report. A fresh local database should not require manual user insertion for the API route.

The manual insert command below is kept only for direct database diagnostics or reproducing the pre-v0.1.115 foreign-key failure.

```powershell
docker exec halleus-postgres-local psql -U halleus_local -d halleus_local -v ON_ERROR_STOP=1 -c "insert into public.halleus_users (id, email, display_name, provider, status, plan, created_at, updated_at) values ('beta-preview-user', null, 'Beta Preview User', 'local', 'active', 'personal', now(), now()) on conflict (id) do update set updated_at = excluded.updated_at;"
```

Then save a synthetic report. Do not use real user birth data for this test.

```powershell
$report = @{
  id = "beta-test-report-001"
  createdAt = (Get-Date).ToUniversalTime().ToString("o")
  input = @{
    birthDate = "1990-01-01"
    birthTime = "12:00"
    birthCity = "Test City"
    birthCountry = "Test Country"
  }
  chart = @{
    sunSign = @{ key = "capricorn"; faName = "Capricorn"; enName = "Capricorn"; element = "Earth"; quality = "Cardinal" }
    moonSign = @{ key = "taurus"; faName = "Taurus"; enName = "Taurus"; element = "Earth"; quality = "Fixed" }
    risingSign = @{ key = "virgo"; faName = "Virgo"; enName = "Virgo"; element = "Earth"; quality = "Mutable" }
  }
  summary = "Synthetic beta persistence test report."
  interpretations = @("This text is only for persistence testing.")
  safetyNote = "This output is not medical, financial, or legal advice."
}

$body = @{ report = $report } | ConvertTo-Json -Depth 20
$saved = Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/reports/beta" -ContentType "application/json" -Body $body
$saved.ok
$saved.reportRecord.id
```

Read the saved report back:

```powershell
$reportId = $saved.reportRecord.id
$read = Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/reports/beta?reportId=$reportId"
$read.ok
$read.reportRecord.id
```

List again:

```powershell
$listAfter = Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/reports/beta"
$listAfter.ok
$listAfter.summaries | Select-Object -First 3
```

## Pass criteria

The route is considered manually verified only when:

```text
disabled mode does not expose persistence
enabled local/staging POST returns ok true
enabled local/staging GET by reportId returns the saved record
enabled local/staging list returns a summary for the saved record
no real user birth data or secrets were printed/shared
active UI still uses local storage
```

## Failure handling

If any step fails:

```text
stop
do not connect UI
do not enable production beta persistence
capture only status code and redacted error message
diagnose database config, migration state, and route guard separately
```

## Next allowed step after pass

Only after this runbook passes against local/staging DB:

```text
add a local-only/manual beta save button or server action behind a feature guard
or add a verified route smoke test that does not require secrets
```

Do not switch `/chart`, `/reports`, or `/reports/[reportId]` to database storage in the same step as the first manual verification.


## Local Docker verification checkpoint

v0.1.114 was verified against a local Docker Postgres database without exposing `.env.local` values.

Verified shape:

```text
Docker container: halleus-postgres-local
Image: postgres:16-alpine
Migration created halleus_users, halleus_reports, and halleus_birth_profiles.
Synthetic beta user count: 1
POST /api/reports/beta saved beta-test-report-001.
GET /api/reports/beta?reportId=beta-test-report-001 returned the same report id.
GET /api/reports/beta returned one summary.
Local halleus_reports row count: 1.
Tracked git files remained clean; `.env.local` remained ignored.
```

Observed local setup notes:

```text
Docker Desktop daemon must be running before Docker commands work.
Docker image pulls can fail transiently; retry only after checking Docker state.
Fresh local databases need the synthetic beta user before saving a report because halleus_reports.user_id has a foreign key to halleus_users.id.
```


## v0.1.115 FK-safe beta persistence checkpoint

The guarded beta API now ensures the configured beta persistence user exists before saving a report.

Current lock:

```text
Only POST /api/reports/beta bootstraps the beta user.
The bootstrap is disabled unless the beta route guard passes.
The helper writes only the configured beta user id into halleus_users.
This is not an auth/profile system.
GET/list behavior remains read-only.
Active UI still uses local storage.
```
