# Development Rules

Project: Astro Clean

## Main rule

Move fast, but do not make blind UI changes.

## Safe development rules

1. Never use large regex replacements on TSX files.
2. Never use Set-Content -Encoding ascii for files containing Persian text.
3. Avoid scripts that rewrite JSX blocks containing Persian UI strings.
4. Inspect the target file before and after every UI change.
5. Keep UI batches small and visually test them.
6. Larger batches are allowed for docs, engine internals, tests, and isolated utilities.
7. Run pnpm lint before each commit.
8. Run pnpm build before each commit.
9. Push only after local checks are green.
10. Confirm Render deploy after push.
11. Test production in Incognito after deploy.
12. Keep astrology language symbolic, interpretive, and non-deterministic.
13. Do not add medical, legal, financial, or deterministic advice.
14. Do not add auth, payment, database, backend, or AI unless explicitly planned.
15. Prefer checkpoints and tags after stable milestones.

## UI editing policy

Allowed:

- Small field default changes
- Small copy edits after inspection
- Small component-level changes with before/after check

Not allowed without extra caution:

- Full component rewrites
- Regex-based JSX replacement
- Batch edits across many UI files
- Persian text generated through unsafe shell encoding

## Recovery baseline

Stable baseline tags:

- v0.1.5-stable-recovery
- v0.1.6-iran-form-defaults
