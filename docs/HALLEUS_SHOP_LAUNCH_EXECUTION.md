# Halleus physical-shop launch — active execution ledger

Last reconciled: 2026-11-05 (Asia/Tehran)
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
| 2026-11-05, S1 candidate A | First shop-branch commit after this entry | Generated a standalone P03 1024×1536 RGB master *proof* from the existing gallery visual; added strict 300 PPI native-size/sRGB/approval prepress checks for all three sizes and a print-brief size contract. Proof has no customer data and is not approved for printing. | Complete actual high-resolution print masters, verifiable P01 lunar and P02 sky calculations, private personalized rendering/storage and owner controls. |

### S1 candidate A check record

- PASS: print prepress guard; print handoff owner/payment/audit/secret guard; shop order guard; TypeScript; affected-file ESLint; encoding; impact-plan generation; `git diff --check`.
- `UNRELATED_BASELINE_FAILURE`: Webpack build still fails on existing CSS Module selectors in `app/sky/sky.module.css`, `components/app-shell.module.css`, `components/report/human-first-report.module.css` (the same failures seen before this candidate).
- `EXTERNAL_BLOCK`: normal `pnpm` wrapper attempted a dependency-install check that could not complete in this linked isolated worktree; equivalent native `node` guards, `tsc`, ESLint and Next Webpack entrypoint were run directly. Default Turbopack build also rejects an out-of-project `node_modules` symlink; Webpack was used to reveal the independent existing CSS failures.
- `BLOCKED_BY_DEPENDENCY`: production DB schema/migrations and isolated real-shape Postgres E2E require verified DB topology and test environment. P03 proof's native pixels are insufficient for **even 10×15 cm at 300 PPI**; its approval and final high-resolution master are still pending.

### Verification and recovery contract

Before a new code slice inspect HEAD/branch/origin, status, exact target files and active gates. Run targeted guards, TypeScript/affected lint when relevant, integration checks when dependencies allow, and `git diff --check`. R1 should collect all safe observable failures, not stop at the first ordinary check. Classify `SAFETY_FATAL`, `CANDIDATE_FAILURE`, `EXTERNAL_BLOCK`, `UNRELATED_BASELINE_FAILURE`, `BLOCKED_BY_DEPENDENCY`. A failure does not invalidate unrelated passed work. Never fabricate an approval or mark generated low-resolution artwork as press-ready. Use normal corrective commits on the shop branch as needed; never force-push over concurrent work.

ROADMAP STATUS: S1 IN PROGRESS — NOT RELEASED.
