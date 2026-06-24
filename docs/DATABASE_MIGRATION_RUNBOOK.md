# Halleus Database Migration Runbook

This is a future runbook. Do not run it against production yet.

## Before running migrations

1. Choose the database provider.
2. Choose the auth provider.
3. Confirm user id format.
4. Create a staging database.
5. Set `DATABASE_URL` in the staging environment.
6. Run project checks.
7. Back up existing data if any exists.

## Migration order

1. Create users table.
2. Create birth profiles table.
3. Create reports table.
4. Add indexes.
5. Seed preview user only in development/staging.
6. Implement database driver.
7. Run integration tests.
8. Enable account report migration.

## Rollback idea

Before real users exist, rollback is simple: drop staging tables and redeploy local-preview storage.

After real users exist, every migration must have a backup and rollback plan.
