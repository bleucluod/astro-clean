# Halleus R3 batch07 — 74 approved Wiki URLs

Scope: **74 unique canonical Wiki URLs**, editorially approved and hash-locked to private source `bleucluod/halleus-gsc-private-backup@c90a9b401592eab2b470d7e5920f5f6b40f73c6d`.

Production reference before this change: public source `557c1db3c7d84e90a029bc885b941a9352c464c6`, VPS active `v2026.10.29-r3-batch06-wiki56`. The read-only VPS status supplied by the owner showed 289 published rows and a healthy service. These facts do **not** prove the 74 row versions are still unchanged.

## Allowed changes

- `content/r3-batch07/manifest.json` and 74 `wiki/WNNN.json` files.
- `scripts/apply-r3-batch07.mjs`, `scripts/verify-r3-batch07-live.mjs`.
- `ops/vps/halleus-r3-batch07-release.sh`.
- Wiki article section type, renderer, article intro view and Wiki CSS.
- This release note.

No auth, analytics, account, billing, schema migration or general landing page modification.

## Data/render contracts

- SHA-256 of each candidate JSON pinned in the manifest; source editorial SHA-256 and blob SHA preserved per article.
- Full approved `body_markdown`, SEO title/description, H1, intro and ordered section blocks. Existing non-editorial CMS metadata and summary (unless explicitly approved) are preserved.
- Rendered types: paragraph, unordered/numbered list, H3, Markdown table, image with ALT, quote, divider. Thirty-four tables (including one in an intro), 54 image blocks, 62 H3 and 336 internal tokens were checked offline.
- `[[article:slug|label]]` and `[[page:/wiki/slug|label]]` are rendered safely and the corresponding targets are validated against published DB rows before mutation.
- Five NASA-hosted images have a strict HTTPS domain allowlist. The other Wiki images retain the dedicated public bucket signature pattern; no arbitrary HTML/JavaScript in content is executed.

## One VPS execution, only after explicit owner decision

The pinned batch07 release entrypoint takes a full 40-character commit and `--approved-74`. Never run an unpinned branch script. The owner's actual VPS command should use the final verified GitHub commit SHA, not this note's baseline SHA.

1. Safety Gate: exact origin/main, clean source, healthy service, current release availability, fast-forward target and target equals remote `main`.
2. Offline 74-file digest/structure/fixture check.
3. Read-only current DB check: all 74 published/indexable with matching canonical identity and `content_version` from the approved snapshot, or an exact already-applied after-image. All inline-link targets must be published/indexable.
4. Official atomic release deploy/build, with its existing storage budget checks and current/previous links.
5. Single transactional DB update: 74 rows or rollback on error, with revisions before and after; no other tables except the approved Wiki link-graph materialization.
6. Read-only DB exact parity and localhost/public HTML checks on all 74 pages, including H2/H3, tables, image ALT and internal anchors.

## Recovery and failure ledger

All failure markers are prefixed `HALLEUS_R3_BATCH07`, with `SAFETY_FATAL`, `CANDIDATE_FAILURE` or `EXTERNAL_BLOCK`.

- Failure before deploy: no DB writes; leave the live site unchanged. Do not override a baseline version conflict. Inspect the actual row and reconcile with editorial approval first.
- Atomic build/deploy failure: inspect current/previous symlinks and official release logs. The DB apply has not yet run.
- Transaction failure: DB transaction rolls back; new renderer may remain active with old content (backward-compatible). Do not claim publication.
- Failure after DB transaction: keep the new renderer active; do not blindly roll back to the old renderer because it cannot display new block types. Use the stored `wiki_article_revisions` snapshots and a reviewed, separately approved DB rollback procedure if needed.
- After any error, record the exact stage, commit, current/previous release metadata, affected article IDs and safe next action. Avoid secrets/`DATABASE_URL` in logs.

Offline checks for this candidate: locked 74 native files, source parity, TypeScript compiler, lint on touched code, bash/Node syntax, plus R3 DB review fixtures. Production DB and live HTTP validation require running on the VPS; do not mark them PASS beforehand.
