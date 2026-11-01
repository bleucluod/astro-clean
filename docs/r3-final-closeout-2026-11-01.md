# Halleus R3 — final Wiki closeout (GitHub preparation)

Status: **ready for a separately authorized VPS release; NOT marked ROADMAP_COMPLETE**.

## Frozen source and audited scope

- Original batch07 manifest and all 74 SHA-locked approved native JSON sources remain unchanged.
- The last reported VPS verification confirmed exact DB parity for 74 rewritten URLs and public/local HTML parity.
- R3 canonical inventory: 287 published Wiki articles plus 8 C00 pages = 295 distinct canonical URLs.
- Historical paths `/wiki/pluto-in-twelve-houses` and `/wiki/bts-members-birth-chart` are 301 redirects, not two more canonical Wiki articles.
- Required editorial Wiki→Wiki edges: 1,158; Wiki→Big3 edges: 341; C00 editorial edges: 10. The admin export was inflated by the two legacy source rows and omitted three `page:/wiki` links in the BTS article.
- The moon-photography article's four NASA images, ALT descriptions and live image responses were previously checked; this closeout does not modify that article.

## Changes prepared

1. One shared two-redirect registry drives `next.config.ts`, the public Sitemap and the admin SEO inventory. The legacy DB rows are preserved for history and rollback.
2. The admin inline-link scanner and publication dependency parser both recognize `[[article:slug|text]]` and `[[page:/wiki/slug|text]]`, matching the live renderer.
3. Exactly three previously unplanned contextual links are converted to plain anchor text, preserving the full approved prose and all other links:
   - `W247 what-is-chinese-astrology` → `chinese-zodiac-compatibility-marriage`
   - `W252 chinese-zodiac-birth-month-inner-animal` → `what-is-moon-sign`
   - `W268 birth-month-flowers` → `birth-chart-basics`
4. The DB delta accepts only exact batch07 post-images at expected content versions. It atomically edits `body_markdown` and structured `sections`, increments three versions, removes exactly three matching inline-link registry entries, and records before/after article revisions. An admin edit, missing row, version conflict or link-registry mismatch aborts the transaction. `--check`, `--verify` and `--self-check` never write to the database; `--apply` requires a separate VPS approval token.
5. The guarded release wrapper first fetches and pins GitHub `main`, validates the current deployment and DB read-only, deploys via the existing official atomic release, then performs the DB delta and checks 74 live articles, 287 Sitemap URLs and both 301 redirects on localhost and the public domain.

## Exit criteria, not yet achieved

- [x] GitHub source changes and exact offline delta fixtures prepared.
- [x] TypeScript and changed-file ESLint passed.
- [ ] Production build on the actual VPS (local build has no production `DATABASE_URL`).
- [ ] Separately approved atomic release on VPS.
- [ ] DB exact post-image parity for all three delinked articles.
- [ ] Fresh local and public HTML parity for 74 rewritten articles, 287 canonical Sitemap URLs, and two 301 redirects.
- [ ] Fresh admin export with 287 canonical Wiki articles, 1,158 Wiki→Wiki edges, 341 Wiki→Big3 edges, zero phantom redirect sources and the 3 BTS inline links counted.

**Do not declare ROADMAP_COMPLETE until all unchecked live and admin-panel gates are independently verified.**

Offline: `pnpm run check:wiki-r3-final-closeout`.
VPS preflight and release: `ops/vps/halleus-r3-final-closeout-release.sh` (separate user approval needed).
