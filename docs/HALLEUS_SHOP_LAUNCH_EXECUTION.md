# Halleus physical-shop launch — active execution ledger

Last reconciled: 2026-11-05 (Asia/Tehran), S1 candidate C
Repository: `bleucluod/astro-clean`
Approved working branch: `shop/launch-completion-20261105`
Approved starting point: `4bd0a0aa645b15a03154b8121050303daa6f53fe`
Source of truth: the current source, this ledger, and `HALLEUS_SHOP_ORDER_RELEASE_GATE.md`.

## Authorization and release boundary

The owner authorized completing **only the physical shop**, recording intermediate work on a separate GitHub branch, and receiving **one final pull** of `main` after explicit final integration approval. Intermediate commits/pushes to the shop branch are allowed. Do not modify `main`, create a release tag, open production shop routes, apply a production migration, or deploy to the VPS without a new explicit approval. A shop feature-branch commit is neither a live acceptance nor an approved print run.

Every `next` resumes from the branch HEAD and this ledger, inspecting actual state before work. Avoid unbounded micro-batches. Continue safe independent work if an external dependency blocks another task; do not count blocked items as complete. Never re-create recorded work. Preserve unrelated working trees, credentials and customer data.

## Locked commercial and product scope

- Coordinated launch of P01 «ماه آن روز» (date-specific lunar phase), P02 «آسمان تولد» (actual time/location-dependent sky), and P03 «شبِ ما» (artistic Milky Way scene; **not** a claimed astronomical reconstruction).
- Four professional gallery views for each product exist in source; customer-specific print images are separate from gallery mockups. Each design and physical sample still requires final approval.
- Sizes: 10×15, 20×30, 30×45 cm, matte printing on unframed shasi; the print lab's RGB/sRGB, original resolution and 300 PPI acceptance remain final gates.
- Guest cart and checkout, manual bank transfer only after actual bank verification, separate secret access credential, guest tracking, cancellation by payment state, owner-only order management, Post/Tipax shipping. Promise: handoff and tracking within 72 **business** hours after payment verification; expedited 24h service is deferred.
- Keep mobile, delivery address, bank evidence and personalized files out of GitHub, public URLs, analytics and browser-authoritative storage. No SMS delivery claim without a working provider.
- Coupons and free-shipping campaigns are allowed product configuration, but must be tested and not invented as currently active offers.

## Executable queue: three substantial implementation passes + final handoff

| Pass | Acceptance evidence | State |
| --- | --- | --- |
| S1 — artwork and catalog | Native/original print masters for all three products; correct astronomical calculation for P01/P02; validated dimensions, output, private file retention, owner asset/catalog management, pricing/gallery/release flags; lab-print QA remains explicit. | **IN PROGRESS** |
| S2 — database and commerce | Inspect actual self-hosted schema read-only; validate migration `0032` on isolated real-shape Postgres; concurrency/retries and shared report/order number sequence; full owner/guest order API tests; canonical report E2E; abuse and notification choices. | PENDING |
| S3 — integrated acceptance | End-to-end regression, three-product visual/claim/print QA, security/privacy, production-build blockers that actually prevent shop release, release preflight and rollback plan; publish a consolidated candidate for final user review. | PENDING |
| S4 — final integration and approved release | On explicit approval only: merge the verified shop branch into `main`, verify merged HEAD, offer one Windows `git pull`; separately approve production DB migration and VPS activation with `ops/vps/halleus-release.sh` and live smoke. | WAITING FOR FINAL APPROVAL |

Pass numbers are planning buckets, not guarantees of an exact number of messages or of absent external blockers. Work can continue within a pass across `next` turns. Only verified acceptance evidence moves a pass to COMPLETE.

## Current facts at the starting commit

- `/shop`, all three PDPs with four mockup gallery photos each, cart, quote, checkout, bank-transfer declaration, guest receipt/tracking/cancel, and owner order workspace exist in source. Production shop pages and APIs are deliberately closed.
- Owner print handoff downloads a private JSON **brief**, not print-ready art. No actual product-specific printable asset is completed or approved.
- T02 chart client now requires a real engine response and a canonical server save; authenticated/guest DB E2E remains unverified.
- `0032_private_shop_orders_shared_numbers.sql` exists but has not been applied or verified against the actual self-hosted VPS schema.
- Existing baseline Webpack build issues include CSS Modules selectors in sky, app-shell and human-first-report styles. Reconcile only what demonstrably blocks the final shop release; no unrelated UI redesign.
- No production DB connection/topology is assumed. No local dev pass is equivalent to isolated DB E2E or physical print acceptance.

## Resume / failure ledger

| Checkpoint | Candidate SHA | Result | Next safe action |
| --- | --- | --- | --- |
| 2026-11-05, authorized start | `4bd0a0aa645b15a03154b8121050303daa6f53fe` | Fresh clean shop worktree created from `origin/main`; old dirty worktree left untouched. | Prepare S1 real print inputs and prepress checks; record evidence and branch SHA after independent verification. |
| 2026-11-05, S1 candidate A | `e5fa8d43589b5f62bbfdc52224113e12d889c501` | Generated a standalone P03 1024×1536 RGB *proof* from the existing gallery visual; added strict 300 PPI native-size/sRGB/approval prepress checks for all three sizes and a print-brief size contract. Proof has no customer data and is not approved for printing. | Validate real product date/phase contracts before personalized art. |
| 2026-11-05, S1 candidate B | `aa6843cfae091872940b0a75b0221dcecb292038` | Centralized Gregorian/Jalali leap-date, optional-date, time and required-city validation shared by PDP, cart and server order intake; print brief now contains normalized Gregorian civil date. Added geocentric lunar-phase calculation using the installed astronomy engine and an explicitly supplied UTC instant; **no unapproved date-only timezone policy is assumed**. | Prepare unambiguous P02 city/time resolution in an unreleased branch candidate. |
| 2026-11-05, S1 candidate C | Current branch commit containing this ledger entry | Prepared proposed **catalog-selected** P02 city input (stable city ID, not a guessed first name match), exact IANA historical timezone-to-UTC resolution, DST gap/fold rejection, matching server cart/order validation and owner-only private print-brief coordinates/time reference. All output still explicitly `printArtworkReady: false`; no sky raster or production DB change. **D-S1-02 is not resolved by preparing this branch candidate and must be owner-approved before merge/release.** | Continue independent original-resolution artwork/sky-catalog proof while awaiting decisions and lab assets. |

### S1 candidate A check record

- PASS: print prepress guard; print handoff owner/payment/audit/secret guard; shop order guard; TypeScript; affected-file ESLint; encoding; impact-plan generation; `git diff --check`.
- `UNRELATED_BASELINE_FAILURE`: Webpack build still fails on existing CSS Module selectors in `app/sky/sky.module.css`, `components/app-shell.module.css`, `components/report/human-first-report.module.css` (the same failures seen before this candidate).
- `EXTERNAL_BLOCK`: normal `pnpm` wrapper attempted a dependency-install check that could not complete in this linked isolated worktree; equivalent native `node` guards, `tsc`, ESLint and Next Webpack entrypoint were run directly. Default Turbopack build also rejects an out-of-project `node_modules` symlink; Webpack was used to reveal the independent existing CSS failures.
- `BLOCKED_BY_DEPENDENCY`: production DB schema/migrations and isolated real-shape Postgres E2E require verified DB topology and test environment. P03 proof's native pixels are insufficient for **even 10×15 cm at 300 PPI**; its approval and final high-resolution master are still pending.

### S1 candidate B check record

- PASS: new lunar/date guard (Gregorian leap and invalid day; Jalali leap and invalid Esfand; required date/time/city; cart rejection; new/full moon fixtures at exact UTC instants); checkout, order and print-brief guards; prepress guard; product surface; workflow optimization; TypeScript; affected ESLint; encoding; impact-plan generation; `git diff --check`.
- `UNRELATED_BASELINE_FAILURE`: Webpack production build still fails at the already-known CSS Modules selectors in sky, app-shell and human-first-report files. The unrelated workflow-acceleration guard still expects an absent `pull_request:` marker.
- `BLOCKED_BY_DEPENDENCY`: real customer-specific raster output, P02 starfield, isolated database tests, and physical/owner print acceptance are not demonstrated by these pure calculation tests. Production routes and database remain untouched.

### S1 candidate C check record

- PASS: city ID and name consistency; civil-time resolution using IANA timezone history; 2024 Berlin DST spring gap and autumn repeated hour rejection; historical and current Tehran offsets; private P02 UTC/coordinates in owner-only print brief; server invalid-city rejection; existing shop checkout/orders/handoff/prepress guards; product surface; TypeScript; affected lint; encoding and `git diff --check`.
- `UNRELATED_BASELINE_FAILURE`: unchanged CSS Modules selectors prevent the Webpack production build; workflow-acceleration's pre-existing PR marker expectation is unrelated to shop changes.
- `BLOCKED_BY_DEPENDENCY`: P02 customer-specific starfield renderer is not finished; production city-selection design is **proposed** and awaits the owner's D-S1-02 decision before merging. No live site, migration, payment or print activity.

## Deferred decisions — must not be silently completed

| ID | Decision / options | Recommended option | Dependent work |
| --- | --- | --- | --- |
| D-S1-01 | For date-only P01, choose **A:** local noon for a specified market timezone, **B:** UTC noon, or **C:** require an exact local hour and city. | A, with the reference timezone stated transparently in product copy and private art metadata. The exact timezone requires owner approval. | Render/label the **date-only** lunar artwork. The ephemeris function only accepts an explicit UTC instant until this is resolved. |
| D-S1-02 | P02 city entries: **A:** select a unique city/coordinates/timezone from the verified catalog, **B:** accept unverified free text and resolve manually. | A; a reversible implementation candidate now exists **only in the unreleased branch**, not as a final owner decision. | Owner approval of the P02 interaction before any merge/release, then accurate birth-sky coordinates and personalized print output. |
| D-S1-03 | Physical art acceptance: **A:** owner reviews per-product and lab-proofs the high-resolution RGB/sRGB print masters, **B:** publish from unapproved screenshots/proofs. | A; the present P03 1024×1536 proof fails native 300 PPI even at the smallest size. | Approval flags, final print masters and production opening. |

### Verification and recovery contract

Before a new code slice inspect HEAD/branch/origin, status, exact target files and active gates. Run targeted guards, TypeScript/affected lint when relevant, integration checks when dependencies allow, and `git diff --check`. R1 should collect all safe observable failures, not stop at the first ordinary check. Classify `SAFETY_FATAL`, `CANDIDATE_FAILURE`, `EXTERNAL_BLOCK`, `UNRELATED_BASELINE_FAILURE`, `BLOCKED_BY_DEPENDENCY`. A failure does not invalidate unrelated passed work. Never fabricate an approval or mark generated low-resolution artwork as press-ready. Use normal corrective commits on the shop branch as needed; never force-push over concurrent work.

ROADMAP STATUS: S1 IN PROGRESS — NOT RELEASED.
