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
