# Real Account Flow Test Runbook

Status: v0.1.188 readiness only. This runbook does not enable migration, local report deletion, public/indexable reports, SEO, payment, hosting, or engine work.

## Product decision

- Username is chosen by the user and is the user-facing identifier.
- Mobile phone is collected for customer/contact/auth data, but mobile is not the username.
- Email is optional/secondary and must not become the username.
- Account reports remain private/noindex.
- Local-preview fallback remains available.
- Local-to-account migration is deferred because there have not been real users yet.

## Local env checklist

Use `.env.local`; never commit real secrets.

```text
NEXT_PUBLIC_HALLEUS_ENABLE_SUPABASE_LOGIN=true
NEXT_PUBLIC_HALLEUS_ENABLE_ACCOUNT_REPORT_SAVE=true
HALLEUS_ENABLE_ACCOUNT_STORAGE=true
DATABASE_URL=...
AUTH_SECRET=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Manual test flow

1. Start the app locally.
2. Open `/profile`.
3. Create an account with a user-chosen username, mobile number, and password.
4. Confirm the Supabase phone flow if the Supabase project requires confirmation.
5. Sign in with mobile + password.
6. Open `/chart` and create a new birth report.
7. Save the report.
8. Confirm the UI reports local-preview fallback plus account copy when env/session/storage are valid.
9. Open `/reports?source=account`.
10. Open one saved account report at `/reports/[reportId]?source=account`.

## Expected outcomes

- The account user id comes from the verified Supabase bearer token.
- The account record is user-owned.
- `/reports?source=account` lists only the authenticated user's account reports.
- `/reports/[reportId]?source=account` reads the selected account report.
- Account report details stay read-only for notes in this phase.
- No migration executes.
- No local report deletion happens.
- No public/indexable reports are created.
