# Halleus physical shop — approval-gated roadmap

Last reconciled: 2026-11-04 (Asia/Tehran)
Repository: `bleucluod/astro-clean` / `main`
Observed baseline: `e179284dd0167b18d6c33990bbfbd2c4c9871910`
State: **HISTORICAL V01–V07 review plan — superseded for execution by the shop master roadmap §۰.۹–۰.۱۰**.

> **Scope decision — 2026-11-04:** The owner replaced the earlier P01-only launch with one coordinated launch of **P01 «ماه آن روز», P02 «آسمان تولد» and P03 «شبِ ما»**. The authoritative execution queue is S1–S6 in the separately maintained shop master roadmap, not the V01–V07 table below. All three products require their own approved details, legitimate astronomical claims, four product photos, prices, private fulfillment and passing purchase tests before any public checkout or VPS release. The current `/shop` design review must not show test/demo badges or explanatory preview copy. No production capability is authorized by this note.

## Intent and acceptance protocol

Build the Halleus physical-product shop incrementally from **the existing R29/R31 candidate**, without replacing working account, report, wiki, SEO, Telegram, or admin subsystems. Reuse suitable portions of React Admin's open-source e-commerce demo **only for shop orders UI**, not its standalone authentication, customers database, back-end, navigation, or checkout/payment model.

Each numbered **visual surface** below is an approval boundary:

1. Complete and test one surface and its directly required dependencies; inspect the previous valid candidate before changing it. Do not reimplement unchanged R29/R31 code.
2. Publish the **reviewable source commit to GitHub `main` only with the user's authorization for that specific boundary**. No production migration, tag, or deploy is implied by a GitHub review commit.
3. Give the user one safe Pull/preview command and direct preview routes; wait for explicit **APPROVED**, **CHANGES REQUESTED**, or **REJECTED** for that surface. The user does not have to repeatedly run technical E2E tests: do those in an isolated environment first.
4. Do not work on the next visual surface until the current one is approved. Corrections stay in the same surface and are not counted as new completed stages.
5. Preserve all passed checks and candidate fingerprints when retrying. Do not restart a valid R29/R31 candidate, silently discard local files, or push over a remote change.
6. Never treat a localhost preview, a GitHub commit, an applied production migration, and a live release as equivalent outcomes.

**Critical baseline:** at the reconciliation point, the shop is a dirty, uncommitted R29/R31 candidate of approximately 65 files, while `origin/main` is still `e179284d`. Its R31 isolated Docker/Postgres and preview smoke were reported passing, but the candidate is not a committed or production-ready store. The initial `/shop` review commit MUST reconcile the underlying candidate and any required database/schema code without pushing unrelated, partially reviewed surfaces. If a coherent independent review commit is impossible, stop and explain the dependency rather than publishing a broken partial tree.

## Approved information architecture

| Surface | Placement | Ownership |
| --- | --- | --- |
| Shop home/catalog | `/shop` | public storefront; **not** a product detail page |
| First product detail | a stable product-specific `/shop/...` route chosen from the actual router | public; first product `P01 — ماه آن روز` |
| Guest checkout | product checkout flow | Halleus server, bank-transfer rules, private order data |
| Guest tracking | `/shop/track` | short displayed order number plus a separate private access credential |
| All physical orders | `/admini` → **اصلی** → **سفارش‌ها** | owner-only, search/filter/detail and operational subviews |
| Products and gallery | `/admini` → **محتوا** → **محصولات و گالری** | owner-only catalog/media management |
| Existing users/reports | existing `/admini` items | unchanged; no duplicate React Admin Users/Customers |
| Premium requests, Wiki, SEO, Telegram, audit | existing `/admini` items | unchanged |

Do not add a second login, a second customer registry, a parallel order/payment database, or a second admin sidebar. Keep the existing `AdminDirectGate`, capability-enforced `/api/admin/*` APIs, append-only audit, self-hosted VPS Supabase/Postgres, and Halleus branding (Persian RTL, Vazirmatn, cool blue palette). React Admin must not send telemetry (`disableTelemetry`) and must be evaluated for routing/style/bundle impact before adopting it. The demo uses fake records; its data provider is not a production integration.

## Review queue (one surface at a time)

| ID | Surface and outcome | Status | Depends on |
| --- | --- | --- | --- |
| V01 | `/shop` is a recognizable **store homepage/catalog**, with a coherent first-product card and navigation to a distinct product detail; no forced checkout/product-detail layout at the shop root | **NEXT — not built/approved** | preserve/reconcile R29/R31 candidate; storefront-safe preview data |
| V02 | A distinct `P01 — ماه آن روز` product-detail page with approved copy, sizes, price display, personalization, and **3–4 genuinely professional original gallery images** with meaningful alt text; no illustrative mockups passed off as final photography | PENDING | V01 approved; user image/art approval |
| V03 | Guest order/checkout: server quote, discounted shipping/coupon policy, manual bank-transfer evidence, safe retries, no real payment without verified bank evidence | PENDING | V02 approved; technical numbering and privacy gates below |
| V04 | `/shop/track`: clear short order number, protected lookup, state timeline, customer cancellation policy and shipping/tracking details | PENDING | V03 approved; private guest access retained |
| V05 | `/admini` **main → orders**: comprehensive paginated list of *all* orders, search, status filters, detail; payment review, cancellation, print handoff, Post/Tipax tracking and audit; selectively reuse React Admin order-screen patterns if they pass a contained integration probe | PENDING | V04 approved; existing owner-only API/state-machine stays authoritative |
| V06 | `/admini` **content → products/gallery**: move and polish existing P01 editor, media ordering, prices, publication state, and discount/shipping settings where appropriate; no duplicate store workspace | PENDING | V05 approved |
| V07 | Full isolated end-to-end regression, consistency review of **every approved surface**, release readiness, production migration/rollback plan and explicit final release authorization | PENDING | V01–V06 approved; technical gates satisfied |

The queue is **strict**: only the first unapproved visual surface is active. If a technical prerequisite is blocked, report it and work only within the currently approved scope; never silently skip to the next page. There is no implicit authorization for live storefront publication or VPS deployment.

## Mandatory technical gates (attached to relevant surfaces; not optional polish)

### T01 — Shared report/order display sequence (before V03 can be approved)

- User-approved rule: existing astrological reports and physical orders consume **one shared, monotonic, concurrency-safe integer sequence**; e.g. if the latest issued number is 900, the next shop order may be 901 and the next report 902. The actual production maximum must be measured, not guessed.
- Existing technical report IDs and shop UUIDs remain intact. Backfill existing records conservatively; verify unique constraints and transactional creation across report/order paths on isolated Postgres, including retries and concurrency.
- The public order number is **not** a guest authorization token. Keep the private tracking credential distinct; order number alone must never disclose phone, address, payment proof, or print assets.

### T02 — Server-canonical report creation and storage (before V03 can be approved)

- All newly created natal and relationship reports must be **generated and persisted on Halleus server**, with success acknowledged before navigation. The user's device may hold non-authoritative cache/legacy recovery data only.
- Reconcile `docs/HALLEUS_SERVER_CANONICAL_REPORTS.md` with current `components/ChartForm.tsx`: comparison mode currently calls a local report writer, and the browser fallback report builder still exists. Do not claim this gate passed until server-only E2E proves it.
- Preserve existing private/public consent, guest ownership, claim-on-sign-in and report security policy. Never expose birth information through public shop orders or analytics.

### T03 — Physical order/privacy and fulfillment correctness (V03–V06)

- Respect existing locked shop state transitions; guest cannot approve payment or write owner fulfillment states. Owner confirms actual bank credit before progressing. Never treat a demo UI mutation as an authoritative payment decision.
- Keep shipping address, mobile, transfer/bank evidence and personalized print files in private server storage; none in GitHub or analytics. Assert server-side capability checks, RLS and append-only audit.
- Customer delivery promise: handoff with tracking information within **72 business hours**; expedited 24-hour service is a future option, not part of P01 launch. Preserve cancellation workflow by payment state and Post/Tipax carrier selection.
- Visual gallery data must use user-approved professional imagery before enabling the first live purchase; SVG local preview mocks remain preview-only.

### T04 — Reviewable GitHub boundary and safe local Pull (each V-stage)

- Before each GitHub write: verify `origin`, branch, exact remote HEAD, active tag, candidate files, no unrelated dirty/staged changes, affected-file allowlist, check plan, no production mutation, rollback via revert/new corrective commit.
- Do **not** tell the user to `git pull` over the existing uncommitted R29/R31 candidate unless an explicit read-only overlap check proves it safe. If candidate and remote differ, provide a recovery-preserving integration plan; never reset or delete their changes.
- At each approval handoff, state: commit SHA, exact files changed, focused test results, what is mocked/blocked, and the single preview URL. Never claim R31 was a live/production acceptance.

## Progress log

| Date | Evidence | Last complete action | Next action |
| --- | --- | --- | --- |
| 2026-11-04 | Local `main` HEAD and `origin/main` matched `e179284dd0167b18d6c33990bbfbd2c4c9871910`; R29/R31 files were still dirty/untracked; R31 log reported isolated Postgres/migration/preview passes | Read-only audit of existing admin surfaces, capabilities, shop queues, schema, routes, and report persistence; **no visual stage approved** | Reconcile the first independently reviewable `/shop` slice, test it, then offer it on GitHub for user Pull/approval |

ROADMAP STATUS: IN PROGRESS — V01 NEXT; no visual stage approved; no production release authorized.
